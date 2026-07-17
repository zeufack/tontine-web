# Tontine — Frontend Design Document (Web)

**Status:** Draft v0.1
**Scope:** `tontine/` (web app). `tontine_mobile/` is out of scope for this version but the design system and API/state layer described here are written to be portable to React Native later — see §12.
**Companion doc:** This design.md implements the product PRD (referenced sections §7.4, §10, etc.). Where this doc makes an assumption not yet confirmed in the PRD, it's flagged with **[ASSUME]**.

---

## 1. Goals & Constraints

- **Clean slate.** No existing screens, components, or API client. Everything below is greenfield.
- **Backend is ready.** Contribution/validation, cycle/turn scheduling, per-tontine RBAC, and all three payout strategies (rotating, lottery, bidding) already exist server-side. The frontend's job is to expose and orchestrate these, not reimplement business logic.
- **Market:** Francophone Africa. UI copy is **French-first**, with English as a full secondary locale (not just a translation afterthought — i18n must be built in from day one, not retrofitted).
- **Currency:** configurable per tontine, arbitrary numeric amounts. All formatting (symbol, decimal separator, grouping) is a frontend concern — **[ASSUME]** we use `Intl.NumberFormat` per-tontine currency code rather than a fixed locale format.
- **Contributions are manual, not auto-charged.** No payment gateway today. A member records "I paid via MTN Mobile Money" and an admin validates it. The UI must make this manual-proof workflow feel trustworthy and low-friction, not like a broken payment form. Real gateway integration is a Phase 3 decision (§7.4/§10 of PRD) — the UI should be built so that plugging in real MoMo/Orange Money APIs later doesn't require a rearchitecture (see §9).
- **Connectivity assumptions [ASSUME]:** target users are often on mobile networks with variable connectivity (2G/3G in parts of the region). Web app should be lightweight, tolerant of slow requests, and give clear pending/offline states — not necessarily full offline-first, but never silently fail.

---

## 2. Tech Stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **TanStack Start** | Full-stack React framework on top of TanStack Router — file-based + type-safe routing, SSR, and server functions in one place. Typed search params/loaders are a good fit for tontine-scoped routes (`/tontines/$id/...`) and i18n-aware URLs (`/fr/...`, `/en/...`). |
| Language | TypeScript, strict mode | Backend has structured domain concepts (payout strategy enum, contribution method enum, role enum) that map cleanly to TS discriminated unions. |
| Styling | Tailwind CSS | Fast to build, easy to theme via CSS variables, easy for a small team to stay consistent. |
| Component library | **shadcn/ui** (Radix primitives + Tailwind, code lives in-repo) | Accessible primitives (dialog, tabs, dropdown) without a black-box dependency — components are copied into `components/ui` and fully themeable, which matters since we're building a distinct visual identity (§6) rather than shadcn's default look. |
| Data fetching / cache | TanStack Query | Pairs naturally with TanStack Start/Router; can also hydrate via Router loaders for initial data. Backend is a normal REST/JSON API being polled/refetched (cycle status, pot balance, pending validations) — Query's cache + refetch-on-focus + optimistic updates fit this well. |
| Client state | Zustand (or React context) for UI-only state (active tontine, locale) | Keep global state minimal; server state lives in Query, not duplicated in a store. |
| Forms | React Hook Form + Zod | Zod schemas can mirror backend validation rules (contribution amount, bid amount, etc.) so the client rejects bad input before hitting the API. |
| i18n | `react-i18next` (or `paraglide`/`lingui` — evaluate against TanStack Start SSR) | Mature, supports French + English, pluralization, and per-tontine number/date formatting. |
| Auth | **Better Auth** | Handles sessions, email+password and social/phone providers, and plugs into TanStack Start's server functions. Backend RBAC is per-tontine, so on top of Better Auth's session we still need our own "what's my role in *this* tontine" lookup (§4) — Better Auth handles *who*, our API handles *what role where*. |

---

## 3. Information Architecture

```
/                          → redirect to /dashboard or /login
/login, /register          → auth
/dashboard                 → list of tontines the user belongs to (member/admin), grouped by status
/tontines/new               → create tontine wizard (admin-only action, becomes admin of new tontine)
/tontines/:id               → tontine detail (tabs below)
  ├── /overview              → pot balance, current cycle, current beneficiary, next turn
  ├── /members                → member list, roles, invite/manage (admin)
  ├── /contributions          → my contribution history + "record a contribution" action
  ├── /cycles                 → cycle history, past payouts, current cycle mechanics (rotating order / lottery draw / bidding auction)
  ├── /validation              → admin-only: pending contributions to validate/reject
  └── /settings                → admin-only: tontine config (currency, contribution amount, strategy, RBAC)
/profile                    → user profile, locale preference, linked mobile money numbers (display-only, not payment integration)
```

**Navigation model:** left sidebar (desktop) / bottom tab + drawer (mobile web) with: Dashboard, [active tontine context], Profile. Once inside a tontine, a secondary tab bar handles the sub-sections above. A **tontine switcher** (dropdown in the header) lets users move between tontines they belong to, since a user can be a member of several simultaneously with different roles in each.

---

## 4. Roles & RBAC in the UI

The backend already enforces RBAC per-tontine; the frontend's job is to **never show controls a role can't use**, and to **degrade gracefully** if a permission check fails server-side (403 → friendly message, not a crash).

**[ASSUME roles, pending PRD confirmation]:**
- **Admin** (tontine creator or delegate): manage members, validate contributions, configure cycle/payout strategy, resolve disputes, close cycles.
- **Member**: contribute, view own history, view cycle status, participate in lottery draw / bidding auction if applicable.
- Possibly a **Treasurer/co-admin** sub-role for larger tontines **[ASSUME — confirm if backend models this or if it's just Admin]**.

Implementation approach:
- A `useTontineRole(tontineId)` hook (backed by the membership object returned with tontine detail) drives conditional rendering everywhere — one source of truth, not scattered role checks.
- Route guards at the section level (`/validation`, `/settings` redirect non-admins with a toast, not a blank page).
- Role badge shown next to the tontine name in the switcher, so users always know which hat they're wearing.

---

## 5. Core Screens & Flows

### 5.1 Dashboard
Card grid of the user's tontines: name, role badge, pot amount so far, next payout date/recipient, contribution status (paid this cycle? overdue?). Overdue contributions surfaced prominently — this is the #1 thing a member logs in to check.

### 5.2 Create Tontine (Admin wizard)
Multi-step: basics (name, currency, contribution amount, frequency) → payout strategy (rotating / lottery / bidding, with a plain-language explainer for each — this is a new concept for some users, don't assume familiarity with the terms) → invite members → review. **[ASSUME]** strategy is fixed at creation; if the backend allows changing it mid-tontine, add that to Settings.

### 5.3 Contribution Recording
Member taps "I've paid" → selects method (MTN Mobile Money / Orange Money / Bank Transfer / Cash — order reflects primary/secondary from the PRD) → enters amount + optional reference/transaction ID + optional photo of receipt **[ASSUME photo upload supported by backend; if not, defer]** → submits. Status shown as **Pending validation** (yellow) until an admin approves it (green) or rejects it (red, with reason). This pending state is the single most important UI pattern in the app — it must be unambiguous, since money is involved and users need to trust the system even without an automated payment rail.

### 5.4 Admin Validation Queue
List of pending contributions across the tontine (or per-cycle), with member, method, amount, reference, timestamp. One-tap approve/reject with optional note. This is effectively the admin's most frequent task — keep it to as few taps as possible, and support bulk-approve where the backend allows it.

### 5.5 Cycle / Payout View
Shows current cycle number, pot total, and — depending on strategy:
- **Rotating:** fixed order list, current beneficiary highlighted, upcoming order visible.
- **Lottery:** draw mechanism (who's eligible, when the draw happens, past draw results as an auditable log — trust matters here).
- **Bidding:** active auction UI — current highest bid, discount implied, time remaining, bid entry form for eligible members, auction history.

Each strategy gets its own read-only "how this works" explainer, since the group may not have chosen the strategy themselves.

### 5.6 Members
List with role, join date, contribution streak/status. Admin can invite (by phone number, given the target market — **[ASSUME]** phone-based invite/identification is more relevant than email in this context, confirm against backend user model), remove, or promote members.

---

## 6. Design System

### 6.1 Principles
- **Trust and clarity over decoration.** This app touches people's money without an automated payment rail behind it — visual design should reduce anxiety (clear states, no ambiguous icons-only actions, always show amounts with currency).
- **Legible on low-end Android screens/browsers** given the market — avoid tiny type, avoid relying on hover states (many users on touch).
- **French typographic conventions** (e.g. space before `:` `;` `!` `?`, currency placement) respected in copy, not just translated word-for-word.

### 6.2 Visual direction: PayFit-inspired

PayFit's product/marketing visual language (as of research at time of writing) reads as: whites and cool blues as the base, indigo and soft teal as accent/emphasis colors, warm rounded-shape accents used sparingly for a "friendly but professional" feel, bold sans-serif headings against lighter-weight body text, generous whitespace, and restrained use of gradients for depth rather than flat corporate blue-on-white. That's the mood to borrow — not their exact palette or wordmark, since those are PayFit's brand assets. We're building our *own* palette in the same register: **trustworthy fintech-adjacent, softened by warmth and roundness rather than cold/corporate.**

Why this fits a tontine product specifically: it's money, but it's *community* money — friends/family/coworkers pooling savings. PayFit's blend of "serious enough to trust with payroll" + "warm enough to not feel like a bank" is close to the emotional register a tontine app needs: users should feel the app is trustworthy with their contributions, but not intimidating or bureaucratic.

**Color system** (expressed as shadcn/Tailwind CSS variables, HSL, light mode — dark mode is a v2 nice-to-have, not required for launch):

| Token | Role | Value (HSL) | Notes |
|---|---|---|---|
| `--background` | App background | `0 0% 100%` (white) / `210 40% 98%` (subtle cool-grey alt) | Keep mostly white — let color come from accents, not backgrounds. |
| `--foreground` | Primary text | `222 30% 14%` (near-black indigo-tinted) | Not pure black — a slightly blue-black feels less harsh, matches the cool palette. |
| `--primary` | Brand / primary actions | `230 65% 52%` (indigo-blue) | Main CTA color — "Contribute", "Create tontine", primary buttons. |
| `--primary-foreground` | Text on primary | `0 0% 100%` | |
| `--secondary` / accent | Secondary emphasis | `174 55% 45%` (soft teal) | Used for informational highlights, secondary buttons, active-state accents — the "teal pop" PayFit uses against its blues. |
| `--warm-accent` | Warmth / celebratory | `20 85% 60%` (coral/warm orange) | Reserved for positive, human moments: "It's your turn to receive the pot 🎉", payout celebration states, onboarding illustration accents. Used sparingly — not a UI-chrome color. |
| `--success` | Validated / paid | `152 55% 40%` (green, muted not neon) | Pair with a checkmark icon, never color alone. |
| `--warning` | Pending validation | `38 92% 50%` (amber) | Pending-contribution badges, overdue-soon states. |
| `--destructive` | Rejected / overdue / errors | `0 70% 50%` (red) | Keep saturation moderate — avoid alarm-red for routine "overdue" states, reserve the most intense red for destructive actions (remove member, reject). |
| `--muted` / `--border` | Structure | `220 20% 92%` / `220 15% 88%` | Cool light greys, consistent with the blue-toned neutral rather than a warm grey. |

Practical rule: **primary indigo carries the app's chrome and main actions; teal is the secondary/informational accent; the warm coral is a deliberate, rare "human moment" color** (payout received, milestone reached) so it retains impact instead of becoming just another button color. Semantic success/warning/destructive stay conventional so users don't have to relearn color meaning.

**Typography:**
- **Font:** a geometric-ish, rounded-friendly sans with full Latin Extended coverage for French accents (é, è, ê, ç, à, œ). Good candidates: **Inter** (safe, excellent French support, free, wide adoption — pairs with shadcn's defaults) or **General Sans / Satoshi**-style geometric sans for something closer to PayFit's slightly warmer, rounder headline feel. **[ASSUME Inter as the pragmatic default; swap the display weight only for a more distinctive headline font if brand wants more personality.]**
- **Hierarchy:** bold (600–700) weights for headings to assert hierarchy the way PayFit's marketing pages do; body text at regular/400–500 weight for readability. Avoid thin (300) weights — they render poorly on the lower-end Android displays common in the target market.
- **Scale:** base 16px, modest 1.25 type scale (12 / 14 / 16 / 20 / 25 / 31 / 39px) — enough hierarchy without huge font-loading cost.
- **Numerals:** use tabular figures for all money amounts (`font-variant-numeric: tabular-nums`) so amounts in lists/tables align — small detail, but it's what makes a money app *feel* precise rather than templated.

**Shape & elevation:** rounded corners (shadcn default `--radius` around `0.75rem`–`1rem`, slightly more rounded than shadcn's default `0.5rem`) to lean into the "friendly, not corporate" side of the reference; soft, low-opacity shadows rather than hard drop shadows; occasional soft gradient (subtle indigo→teal) reserved for hero/empty-state illustration backgrounds, not for buttons or cards, so it reads as an accent rather than decoration-for-its-own-sake.

**Components to build first (in rough priority order):** Button, Badge (for status/role, using the semantic colors above), Card, Tabs, Modal/Dialog, Toast, Table (member/contribution lists), Stepper (wizard), Amount display (currency-aware, tabular-nums), Empty state, Skeleton loader. Start from shadcn's primitives and re-skin with these tokens rather than shadcn's default zinc/slate theme.

---

## 7. Internationalization

- All copy in translation files from day one — no hardcoded strings, even during prototyping, to avoid a costly retrofit.
- French is default locale; English selectable and persisted per-user.
- Number/currency formatting is **per-tontine currency**, independent of UI language — a French-UI user in a tontine denominated in Nigerian Naira should see Naira formatting, not Euro-style formatting guessed from the UI language.
- Dates: locale-aware relative + absolute formats ("dans 3 jours" / "in 3 days"); avoid ambiguous numeric date formats (DD/MM vs MM/DD) by using month names in critical contexts (payout dates).

---

## 8. State & API Integration

- One typed API client (generated from an OpenAPI spec if the backend exposes one **[ASSUME — confirm]**, otherwise hand-written with Zod validation at the boundary) — no ad hoc `fetch` calls scattered in components.
- TanStack Query keys namespaced by tontine: `['tontine', id, 'contributions']`, `['tontine', id, 'cycle']`, etc., so invalidation after a mutation (e.g. admin validates a contribution) is precise.
- Polling/refetch-on-focus for time-sensitive views (bidding auction, validation queue) rather than a websocket layer in v1 — **[ASSUME]** revisit real-time (websockets/SSE) if the bidding auction needs live countdown/competing bids to feel real-time; note this as an open question for the PRD.
- Optimistic UI limited to non-money-moving actions (marking a notification read, etc.) — anything touching contribution/payout state waits for server confirmation given the manual-validation trust model.

---

## 9. Payment-Method UI Without a Gateway (Phase 3 seam)

Since contributions are recorded, not charged, today:
- The "pay via Mobile Money" flow is really "record that I paid via Mobile Money outside the app" — UI copy must not imply the app is initiating a real MoMo transaction (avoid language like "Pay now" that suggests an in-app charge; use "J'ai payé / I've paid" framing).
- Build the contribution-method selector as a pluggable component (`ContributionMethodPicker`) so that if Phase 3 adds real MTN/Orange gateway integration, only this component and its submit handler change — the rest of the contribution flow (pending → validation → confirmed) stays identical.

---

## 10. Folder Structure (indicative)

```
tontine/
├── src/
│   ├── app/                # routes (Next.js app router) or pages/
│   ├── components/
│   │   ├── ui/              # design-system primitives (Button, Card, Badge…)
│   │   └── tontine/         # domain components (CycleView, BidPanel, ValidationQueueRow…)
│   ├── features/            # feature-sliced: auth, tontines, contributions, cycles, members
│   ├── lib/
│   │   ├── api/              # typed client + Zod schemas
│   │   └── i18n/
│   ├── stores/               # Zustand stores (session, locale, active tontine)
│   └── styles/                # Tailwind config, tokens
```

---

## 11. Open Questions for the PRD / Backend Team

1. Exact role model — is it just Admin/Member, or is there a Treasurer/co-admin tier?
2. Is phone number or email the primary identifier for invites/auth?
3. Can payout strategy be changed after a tontine is created, or only at creation?
4. Does the backend support receipt/proof-of-payment file uploads for contributions, or just a text reference?
5. Is there an existing OpenAPI/Swagger spec to generate the typed client from?
6. For the bidding strategy — is there a real-time requirement (live auction) or is it a fixed bidding window resolved at close, which would let us avoid websockets in v1?

---

## 12. Notes for Future Mobile (`tontine_mobile/`)

Not building this now, but to keep the door open:
- Design tokens (§6.2) should live in a format shareable between web (Tailwind config) and mobile (React Native / Expo theme) — e.g. a plain JSON/TS tokens file both consume.
- The API client and Zod schemas (§8) are framework-agnostic and can be extracted to a shared package later.
- Screens/flows in §5 are written platform-agnostically on purpose — mobile will restructure navigation (tabs vs. sidebar) but the underlying flows shouldn't need to change.
