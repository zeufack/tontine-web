# Tontine — Frontend Design Document (Web Client)

**Status:** Draft v0.2 — reconciled against the real backend (`tontine_backend/tontine`, verified via source + `openapi.json`) and the product PRD (`../PRD-web-client-and-back-office.md`).
**Scope:** `tontine_web/` — the **Web Client** product only, per the PRD's two-product split (Web Client vs. Back Office). `tontine_mobile/` is out of scope for this version. Where this doc references domain rules, RBAC, or the API surface, **the PRD is the authoritative source** — this document only restates what's needed to justify a frontend decision, and links back to the PRD section for everything else. Don't let this doc and the PRD drift; if they disagree, the PRD wins and this doc needs updating.
**Superseded content:** v0.1 of this doc was written before the backend/PRD were discovered and made several incorrect assumptions (a simplified `admin|member` RBAC, a payout-strategy enum directly on `Tontine`, a from-scratch "platform admin" concept). Those are corrected below — see §11 for what's now confirmed vs. still genuinely open.

---

## 1. Goals & Constraints

- **Backend is real and already built.** NestJS + Supabase (Postgres + Supabase Auth), with a documented OpenAPI spec at `tontine_backend/tontine/openapi.json`. The frontend's job is to expose and orchestrate what exists, not reimplement business logic — see PRD §1, Appendix B for the verified API surface.
- **Market:** Francophone Africa. UI copy is **French-first**, English as a full secondary locale. *(Already correctly implemented — see §7.)*
- **Currency:** configurable per tontine, arbitrary numeric amounts — a frontend `Intl.NumberFormat` concern, unchanged from v0.1.
- **Contributions are manual, not auto-charged.** No payment gateway today (PRD §7.3 — Phase 3 decision). Mobile money (MTN/Orange, per PRD §1) is the *primary* contribution method by product intent, but the backend's `ContributionMethod` enum only has a generic `mobile_money` value (plus `cash`, `bank_transfer`, `credit_card`, `digital_wallet`, `other`) — provider-specific detail (which network) has no dedicated field and would need to go in the free-form `paymentDetails` JSON (`paymentGateway`, `transactionId`, etc.) if the backend doesn't add one. Flagged in §11.
- **Connectivity assumptions:** target users are often on 2G/3G. Web app should be lightweight, tolerant of slow requests, degrade real-time features to polling (PRD §6) — never silently fail.
- **Blocking infra gap (flagged to backend team, not fixed here):** the backend has **no CORS configuration at all** (`main.ts` never calls `app.enableCors(...)`) — every fetch from this frontend to the API will be blocked by the browser until that's added on the backend side.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **TanStack Start** | File-based + type-safe routing, SSR, and server functions in one place. |
| Language | TypeScript, strict mode | The backend's domain enums (see PRD Appendix A) map cleanly to TS discriminated unions/enums — prefer generating types from `openapi.json` over hand-guessing them (see §8). |
| Styling | Tailwind CSS | Unchanged. |
| Component library | **shadcn/ui** (Radix primitives + Tailwind, code lives in-repo) | Unchanged — see §6. |
| Data fetching / cache | TanStack Query | Unchanged in principle; the query-key/mock-layer strategy in §8 needs to be re-pointed at the real API (see below). |
| Client state | Zustand — **not yet needed** | No cross-page UI state exists yet beyond what a form instance or a query provides. |
| Forms | React Hook Form + Zod | **Implemented.** |
| i18n | **Paraglide JS** | **Implemented** — fr base locale + en, URL-prefixed via the router's `rewrite` option (see §13). No changes needed here; this part of v0.1 held up. |
| Auth | **Better Auth, as a thin wrapper over the real backend's Supabase-issued JWT** — decision confirmed with the user | The backend's actual auth is `POST /auth/login` / `POST /auth/register` (Supabase Auth under the hood), returning `{ accessToken, refreshToken, user }` — **not** anything Better Auth manages natively. Rather than have Better Auth own credential verification against its own (nonexistent) database, Better Auth's client-side session surface (`authClient.useSession()`, the `getCurrentSession`/`createServerFn` guard pattern already built) is kept as the shape the rest of the app codes against, but the actual login/register handlers call the backend directly and the resulting JWT pair becomes the thing that gets persisted as the "session." This requires real plumbing to bridge two different session models — tracked as its own implementation slice, not a simple DB-adapter config change (v0.1's framing of this as just "add a Kysely/SQLite adapter" was wrong). **No `/auth/refresh` or `/auth/logout` endpoint exists on the backend yet** — token refresh/logout handling is blocked on that being added, or must be done by calling Supabase directly, TBD. |

---

## 3. Information Architecture

Per PRD §9.1 (Web Client sitemap) — this is authoritative; the app currently deviates from it (see "Reconciliation needed" below).

```
/                                     — landing, unauthenticated
  /login, /register, /forgot-password
  /public-tontines                    — GET /tontines/public, browsable without an account; join requires login

/app                                  — authenticated shell (bottom nav mobile / sidebar desktop)
  /app/home                           — "My tontines" dashboard (GET /tontines)
  /app/tontines/new                   — creation wizard
  /app/tontines/:id                   — tontine detail (tabs below)
    /overview                         — status, my role, key stats (GET /tontines/:id, /statistics)
    /members                          — participant list + pending-approval queue if permitted (GET /participants/tontine/:id)
    /cycles                           — cycle list + current cycle, turn schedule (GET /cycles/tontine/:id, /turns/*)
    /contributions                    — my contributions + validation queue **inline**, permission-gated (GET /contributions, POST /validate)
    /requests                         — position requests [Phase 2]
    /auction                          — live bidding screen, active bidding-turn only [Phase 2]
    /settings                         — tontine settings, permission-gated fields (PATCH /tontines/:id)
  /app/profile                        — account settings (GET/PATCH /users/:id)
  /app/notifications                  — preferences + notification center [center is Phase 2]
```

**Permission-driven navigation, not URL-based admin routes** (PRD §9.1, verbatim principle): *"a participant without `member:manage` never sees the pending-approval queue or admin-only settings fields; the same route renders differently per viewer based on effective permissions... this avoids URL-based security theater — the backend already enforces permissions server-side; the frontend just hides controls the user can't use."* This is a deliberate correction from v0.1.

### Reconciliation needed against what's currently built

The route skeleton built so far (`src/routes/`) doesn't match this IA in several ways that need fixing in a follow-up slice:

| Built today | PRD-correct | Fix needed |
|---|---|---|
| `/dashboard` | `/app/home` | Rename + add `/app` prefix to the whole authenticated subtree |
| `/tontines/new`, `/tontines/:id/*` | `/app/tontines/new`, `/app/tontines/:id/*` | Same `/app` prefix |
| Separate `/tontines/:id/validation` route, gated by a redirect-on-403 layout guard | No separate route — validation queue is **inline content within `/contributions`**, shown/hidden by permission check | Merge validation UI into the contributions tab; drop the separate route and its `_admin` guard for this specific case |
| `/tontines/:id/settings` gated the same way | Same permission-inline principle applies — settings *fields* are gated, not the whole route | Keep the route, but gate individual fields/sections by permission rather than redirecting the whole page |
| A whole `/admin/*` "platform admin backoffice" route root, built as part of the Web Client | This is **Back Office (BO)**, a **separate product** per PRD §2/§8, not a section of the Web Client | See §4 and the note below — most of it isn't buildable against the current backend at all |

**On the built `/admin/*` backoffice specifically:** PRD §8.0 states plainly that the backend has **no platform-wide staff concept** — every role is scoped to one tontine via `TontineAdministrator`, confirmed by direct backend inspection (no `roles` field on `User`, no `/admin`/`/bo` endpoints in `openapi.json`, the one place that gestures at cross-tontine admin — `OwnershipGuard`'s `allowAdmin` option — is dead code, never invoked with `allowAdmin: true` anywhere). Per PRD §8.1, only a handful of BO features are "buildable today" against existing endpoints: user lookup (`GET /users/:id`), tontine lookup (`GET /tontines/:id`), platform-wide dashboard stats (`GET /dashboard/stats`, already a non-PII aggregate), and contribution-validation escalation (`POST /contributions/validate`, though this itself implies a platform-staff-with-elevated-per-tontine-access model that doesn't exist yet). Recommendation: keep the already-built `/admin/*` route/guard scaffold as a placeholder for **BO's "buildable today" subset only**, clearly labeled as a separate internal product, and treat the rest (user suspension, disputes, audit log, cross-tontine reporting, `TontineType` catalog CRUD) as blocked on new backend work per PRD §8.0/§8.2 — don't build UI for those yet.

---

## 4. Roles & RBAC in the UI

**Corrected from v0.1** — the real model (PRD §5, Appendix A) is a **9-permission / 7-role** system, entirely **per-tontine**:

- **Permissions (gate UI by these, not role names):** `tontine:view`, `tontine:edit`, `tontine:delete`, `member:manage`, `position_request:approve`, `cycle:manage`, `funds:distribute`, `report:view`, `auction:participate`.
- **Roles (bundles of the above, scoped to one tontine via a `TontineAdministrator` row, except `creator`/`participant` which are derived rather than assigned):** `creator` (all permissions, derived from tontine ownership) · `super_admin` · `admin` · `treasurer` · `moderator` · `observer` · `participant` (derived from active membership). Full bundle table in PRD Appendix A — don't duplicate it here, reference it.

**Platform-wide staff is a distinct, mostly-not-yet-buildable concept** (Back Office, PRD §8.0) — not a superset of per-tontine roles, and not something to conflate with them. See §3's reconciliation note.

**Implementation approach (updated):**
- A `useTontineRole(tontineId)`-style hook needs to become a **permission set**, not a single `role` string — e.g. `usePermissions(tontineId)` returning something like `{ has: (permission: Permission) => boolean }`, computed from whatever the tontine-detail/participants response exposes about the caller's effective permissions. **Open question for backend** (not in the current `openapi.json` response shapes reviewed): does `GET /tontines/:id` or `/participants/:id` return the caller's own effective permission set directly, or does the frontend need to fetch role/permission data separately and compute it client-side using PRD Appendix A's static bundle table? Confirm before building this for real.
- Route guards at the section level are **replaced** by inline permission checks per §3 — no more redirect-to-overview-with-toast pattern for `/validation`/`/settings` specifically (that pattern remains valid and correct for cross-cutting concerns like "not logged in at all," just not for per-tontine permission gating within a single tontine's tabs).
- The already-built per-tontine `_admin` pathless-guard pattern (`src/routes/.../tontines/$tontineId/_admin.tsx`) should be **removed** once the contributions-tab merge (§3) happens, since its only consumer (`/validation`) goes away as a separate route.

---

## 5. Core Screens & Flows

Per PRD §7.1 (MVP feature table) and §9.2 (journeys J1–J5) — these are authoritative; summarizing the frontend-relevant shape here rather than duplicating the full PRD text.

### 5.1 Home ("My tontines") — PRD §9.3
Card grid: tontine name, status badge (`draft|active|paused|completed|cancelled`), my role/permission summary, next-action prompt (e.g. "Contribution due"). Empty state → CTA into the creation wizard.

### 5.2 Create Tontine wizard — PRD J1
Name/description → type (rotating/lottery/bidding, each with a plain-language explainer — **only rotating is actually live end-to-end today**, see §11) → contribution amount/frequency/duration type (`fixed_cycles|fixed_time|open_ended|goal_based`) → public/private → review → create. Creator is auto-added as an active participant; a draft tontine needs ≥2 participants before "Activate" is enabled.

### 5.3 Contribution Recording + inline validation — PRD J2/J3
Member records a contribution (method picker: mobile money first, per market priority, though see the enum caveat in §1) → `pending` state ("awaiting confirmation from [admin name]") → notified on `validated`/`rejected`. On the **same tab**, if the viewer holds `funds:distribute`, a validation queue renders inline (not a separate route) — approve/reject with a required reason on reject.

### 5.4 Cycles/Turns view — PRD §9.1, §9.3
Cycle selector, turn timeline (visual rotation order for `rotating`), current-turn highlight, contribution status per turn. Beneficiary status (`designated → confirmed → paid`) surfaced here or on Overview.

### 5.5 Auction/bidding (Phase 2) — PRD J4
Live highest-bid, countdown, bid entry (respecting `minBidAmount`/`bidIncrement`), optional auto-bid ceiling. WebSocket live updates via the backend's `RealtimeModule`, polling fallback per §1's connectivity constraint. This is a **live, working backend feature today** (unlike the dormant lottery/bidding-as-payout-strategy subsystem — see §11) — don't confuse the two.

### 5.6 Members — PRD §9.3
Participant list with status badges (`pending|active|suspended|withdrawn|completed`), pending-approval queue and approve/suspend actions **shown only to viewers with `member:manage`**, per §4's inline-gating principle.

---

## 6. Design System

*(Unchanged from v0.1 — this section held up against the real backend discovery; no domain assumptions here were wrong.)*

### 6.1 Principles
- **Trust and clarity over decoration.**
- **Legible on low-end Android screens/browsers** — avoid tiny type, avoid relying on hover states.
- **French typographic conventions** respected in copy.

### 6.2 Visual direction: PayFit-inspired

Color system, typography, shape/elevation tokens — all **implemented** in `src/styles.css`, matching the values below exactly:

| Token | Value (HSL) |
|---|---|
| `--primary` | `230 65% 52%` (indigo-blue) |
| `--secondary` | `174 55% 45%` (soft teal) |
| `--warm-accent` | `20 85% 60%` (coral) |
| `--success` | `152 55% 40%` |
| `--warning` | `38 92% 50%` |
| `--destructive` | `0 70% 50%` |
| `--radius` | `0.75rem` |

Font: Inter. Tabular figures for money amounts. Full rationale unchanged from v0.1 — see git history if needed.

**Component status:** Button, Badge, Card, Tabs, Dialog, Toast (`sonner`), Table, Amount, Empty state, Skeleton, Input, Textarea, Checkbox, Label, Select, RadioGroup (+ card variant), Form (React Hook Form wrapper), Stepper — **all built** in `src/components/ui/`. No domain-specific components (`ContributionMethodPicker`, `ContributionStatusBadge`, `StrategyExplainer`, a permission-aware `RoleBadge`) exist yet — build these against the real enums/permission model in §4/§11, not the v0.1 guesses.

---

## 7. Internationalization

**Implemented, unchanged from v0.1 — this held up correctly.** French (`fr`) base locale, English (`en`) secondary, both URL-prefixed (`/fr/...`, `/en/...`) via Paraglide + the router's `rewrite` option (no `$locale` route — see §13). Number/currency formatting is per-tontine currency, independent of UI language.

---

## 8. State & API Integration

**This section changes substantially from v0.1.** A real, documented API exists — `tontine_backend/tontine/openapi.json` — this should become the frontend's contract, not a hand-maintained guess.

- **Generate or hand-write a typed client from `openapi.json`**, rather than continuing to hand-guess domain shapes. The mock data layer built in `src/lib/mock-data/` (Zod schemas + in-memory store + `queryOptions` factories) was built *before* this backend was known about and its guessed shapes diverge from the real ones in several places — payout strategy isn't a field on `Tontine` (it's a `TontineType` relation carrying opaque JSON config, and only `rotating` is actually wired end-to-end in the live backend today — see §11), contribution methods differ (`mobile_money` generic, not MTN/Orange-specific), membership is split across `Participant` + `TontineAdministrator` rather than one flat `role` field, and `Cycle` doesn't carry `potTotal`/`strategyState` the way the mock assumed. **The mock layer's `queryOptions`-factory pattern and query-key namespacing convention were a good decision and should be kept** — only the underlying fetch-function bodies and Zod schemas need to be swapped to match the real API, per the "swap the body, not the call sites" design already in place.
- **Auth header:** every authenticated request needs `Authorization: Bearer <accessToken>` (the Supabase-issued token from `/auth/login`/`/auth/register` — see §2). No global API-client wiring for this exists yet.
- **CORS blocker (§1):** none of this is callable from the browser until the backend adds CORS config. Flagged to the backend team, not something to work around on the frontend side.
- **Query key namespacing:** keep close to the real resource hierarchy — e.g. `['tontines', 'mine']` (`GET /tontines`), `['tontines', 'public']` (`GET /tontines/public`), `['tontine', id]`, `['tontine', id, 'participants']`, `['tontine', id, 'statistics']`, `['tontine', id, 'cycles']`, `['cycle', id]`, `['cycle', id, 'turns']`, `['contributions', { tontineId }]`, `['contributions', 'pending', { tontineId }]`, `['auction', turnId]`, `['dashboard', 'stats']`, `['dashboard', 'tontine', id]`, `['user', id]`. Full endpoint list: PRD Appendix B.
- **Realtime:** the backend's `RealtimeModule` WebSocket gateway is real (Socket.IO) — use it for live auction/dashboard updates per PRD §6, with polling fallback for the connectivity constraint in §1. Confirm the gateway's event contract with backend engineering before building (PRD's own caveat, Appendix B footer).
- **Mutations:** no optimistic updates for money-moving actions (contribution recording/validation, bids) — unchanged principle from v0.1, still correct per PRD's trust framing.

---

## 9. Payment-Method UI Without a Gateway (Phase 3 seam)

Unchanged principle from v0.1: "J'ai payé" / "I've paid" framing, never "Pay now" (PRD §1 confirms no gateway exists). Build the method picker as a pluggable `ContributionMethodPicker` component. **Update the method list to match the real `ContributionMethod` enum**: `mobile_money, bank_transfer, cash, credit_card, digital_wallet, other` — mobile money first per market priority (PRD §1), with any MTN-vs-Orange distinction handled as a UI-level sub-choice feeding into the free-form `paymentDetails` field, not a backend enum value (see §1's flagged gap).

---

## 10. Folder Structure

*(Structure itself is unchanged from what's built — see `src/routes/`, `src/features/`, `src/lib/`, `src/components/` as already organized. The near-term addition this section calls out is a real typed API client, replacing/wrapping the mock layer per §8 — no other structural change needed.)*

---

## 11. Open Questions

**Answered by the backend/PRD discovery (no longer open):**
- ~~Exact role model~~ → 7 roles / 9 permissions, per-tontine (PRD Appendix A).
- ~~Phone vs. email identifier~~ → email, via Supabase Auth.
- ~~Is there an OpenAPI spec?~~ → Yes: `tontine_backend/tontine/openapi.json`.
- ~~Real-time bidding requirement~~ → Auctions are live and already implemented on the backend (WebSocket `RealtimeModule` + `/turns/:id/auction`), Phase 2 priority per PRD, not an open design question anymore.

**Still genuinely open (new, from backend/PRD investigation):**
1. **Payout-strategy execution gap:** the backend's lottery/bidding *strategy* subsystem (`src/strategies/`) is implemented and unit-tested but **has zero call sites from the live cycle/tontine services** — "the real, currently-executing tontine logic is entirely rotating" per the backend's own architecture doc. Auctions (turn-level bidding) work live, but that's a separate feature from "bidding as the tontine's payout strategy." Confirm with backend: when (if) will lottery/bidding-as-payout-strategy actually be wired up? Until then, the frontend should treat non-rotating tontine types as effectively unsupported end-to-end, whatever the wizard/UI lets a user pick.
2. **Caller's effective permission set:** does any existing endpoint return it directly, or must the frontend compute it client-side from role/permission static tables? Blocks a real `usePermissions` implementation (§4).
3. **Token refresh/logout:** `AuthService` has the methods, but **no controller route exists** for either. Blocks real session longevity — confirm with backend when these will be exposed.
4. **`User` schema appears to leak `password`** in the OpenAPI-documented response shape for `POST /auth/register` and `GET /users/:id` — worth confirming this isn't also true at runtime (likely a `class-transformer`/`@Exclude()` gap), and flagging to backend regardless.
5. **BO staff auth model** (PRD §10.1) — separate system, or same Supabase project with a staff claim?
6. **Receipt/proof-of-payment upload** — a `paymentDetails.receiptUrl` field exists on `Contribution` but no upload endpoint was observed. Still open.
7. **CORS** — see §1, needs a backend fix before any real integration testing is possible.
8. **`ContributionFrequency` enum casing inconsistency** inside the backend itself: the create-DTO's enum (`DAILY|WEEKLY|MONTHLY`, uppercase, 3 values) differs from the entity/response enum (`daily|weekly|biweekly|monthly|quarterly|yearly|custom`, lowercase, 7 values) used everywhere else including `openapi.json`. A real trap for the frontend — sending `"DAILY"` on create but receiving `"daily"` back. Flag to backend, defensively normalize on the frontend in the meantime.

---

## 12. Notes for Future Mobile (`tontine_mobile/`)

Unchanged from v0.1 — design tokens shareable via a plain tokens file, API client/Zod schemas framework-agnostic, screens written platform-agnostically. No new information from this investigation changes this section.

---

## 13. Routing, Auth & i18n Architecture (as implemented)

*(§13.1 route-tree-shape mechanics, §13.4 locale-routing mechanics are unchanged and still accurate — not reproduced again here in full; see git history for the complete original text if needed. Summarizing what changes below.)*

### 13.1 Route tree — pending the §3 reconciliation
The pathless-layout-guard pattern (`_authenticated` → `_userApp`/`_platformStaff` siblings, nested `_admin` guards) is sound as a *mechanism* and doesn't need to change structurally — what needs to change is: (a) adding the `/app` prefix throughout the user-facing subtree per §3's reconciliation table, (b) removing the separate `/validation` route + its `_admin` guard in favor of inline permission-gated content within `/contributions`, and (c) re-scoping `_platformStaff`/`/admin/*` down to only the PRD-§8.1 "buildable today" BO subset.

### 13.2 Session guard — now bridges to the real backend
`getCurrentSession` (`src/lib/get-session.ts`) currently wraps Better Auth's own `auth.api.getSession`. Per §2's auth decision, this needs to become a bridge: the session Better Auth persists needs to actually contain (or be backed by) the Supabase-issued `accessToken`/`refreshToken` obtained from the real backend's `/auth/login`, not credentials verified against a Better Auth-owned database. Exact mechanism (custom Better Auth session strategy vs. a thin custom cookie layer alongside Better Auth's client-side hooks) is implementation detail to work out as its own slice — not decided in this document beyond the directional call in §2.

### 13.3 RBAC guards + the redirect-with-toast pattern
Still the right pattern for **binary access questions** (logged in or not; platform staff or not, for the BO subset that remains). **Not** the right pattern for per-tontine permission gating within a single tontine's tabs anymore — see §4's inline-gating correction.

### 13.4 Locale-prefixed routing
Unchanged — fully implemented and correct, no rework needed.
