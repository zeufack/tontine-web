import { z } from "zod";
import { apiFetch } from "./api-fetch";

export const contributionFrequencySchema = z.enum([
	"daily",
	"weekly",
	"biweekly",
	"monthly",
	"quarterly",
	"yearly",
	"custom",
]);
export type ContributionFrequency = z.infer<typeof contributionFrequencySchema>;

// `configuration` is a free-form JSON blob on the backend (no fixed schema),
// so a contribution amount isn't a guaranteed field — read it defensively
// wherever the tontine-creation flow happens to have put it.
export const publicTontineSchema = z.object({
	id: z.string(),
	name: z.string(),
	contributionFrequency: contributionFrequencySchema,
	configuration: z.record(z.string(), z.unknown()).nullish(),
	tontineType: z.object({ name: z.string() }),
	participants: z.array(z.unknown()),
});
export type PublicTontine = z.infer<typeof publicTontineSchema>;

/**
 * `GET /tontines/public` is `@Public()` on the backend — no accessToken
 * required, callable from an unauthenticated visitor.
 */
export async function fetchPublicTontines(): Promise<PublicTontine[]> {
	const raw = await apiFetch("/tontines/public");
	return z.array(publicTontineSchema).parse(raw);
}

export const tontineStatusSchema = z.enum([
	"draft",
	"active",
	"paused",
	"completed",
	"cancelled",
]);
export type TontineStatus = z.infer<typeof tontineStatusSchema>;

export const participantStatusSchema = z.enum([
	"pending",
	"active",
	"suspended",
	"withdrawn",
	"completed",
]);
export type ParticipantStatus = z.infer<typeof participantStatusSchema>;

// Only what's needed to resolve "is the caller an active participant" —
// the real Participant is much larger (positionConfiguration, preferences,
// statistics, ...).
const backendParticipantSummarySchema = z.object({
	status: participantStatusSchema,
	user: z.object({ id: z.string() }).nullish(),
});

// A caller-owned/joined tontine, as returned by GET /tontines and
// GET /tontines/:id. `creator`/`public`/`participants` exist specifically so
// the frontend can resolve the caller's own role — see
// features/tontines/permissions.ts.
export const backendTontineSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: tontineStatusSchema,
	contributionFrequency: contributionFrequencySchema,
	configuration: z.record(z.string(), z.unknown()).nullish(),
	tontineType: z.object({ id: z.string(), name: z.string() }),
	creator: z.object({ id: z.string() }).nullish(),
	public: z.boolean(),
	participants: z.array(backendParticipantSummarySchema),
});
export type BackendTontine = z.infer<typeof backendTontineSchema>;

export async function fetchMyTontines(
	accessToken: string,
): Promise<BackendTontine[]> {
	const raw = await apiFetch("/tontines", accessToken);
	return z.array(backendTontineSchema).parse(raw);
}

export async function fetchTontineById(
	accessToken: string,
	id: string,
): Promise<BackendTontine> {
	const raw = await apiFetch(`/tontines/${id}`, accessToken);
	return backendTontineSchema.parse(raw);
}

// Ad hoc, computed on every call by the backend — not the (nullable, cached)
// `statistics` jsonb column on the entity itself.
export interface TontineStatistics {
	totalParticipants: number;
	totalContributions: number;
	totalContributed: number;
	activeContributions: number;
	pendingContributions: number;
	tontineStatus: TontineStatus;
	createdAt: string;
	lastActivity: string;
}

export async function fetchTontineStatistics(
	accessToken: string,
	id: string,
): Promise<TontineStatistics> {
	return apiFetch(`/tontines/${id}/statistics`, accessToken);
}

/**
 * Throws (via apiFetch, a normalized message) on the backend's own 400s —
 * "not in draft status" or "fewer than 2 participants" — so callers should
 * still gate the CTA on participant count for good UX, but must also handle
 * this rejecting.
 */
export async function activateTontine(
	accessToken: string,
	id: string,
): Promise<BackendTontine> {
	const raw = await apiFetch(`/tontines/${id}/activate`, accessToken, {
		method: "POST",
	});
	return backendTontineSchema.parse(raw);
}

export const tontineTypeSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	description: z.string(),
});
export type TontineTypeSummary = z.infer<typeof tontineTypeSummarySchema>;

/** `GET /tontine-types` is `@Public()` — no accessToken required. */
export async function fetchTontineTypes(): Promise<TontineTypeSummary[]> {
	const raw = await apiFetch("/tontine-types");
	return z.array(tontineTypeSummarySchema).parse(raw);
}

export const durationTypeSchema = z.enum([
	"fixed_cycles",
	"fixed_time",
	"open_ended",
	"goal_based",
]);
export type DurationType = z.infer<typeof durationTypeSchema>;

export interface CreateTontineInput {
	name: string;
	tontineTypeId: string;
	configuration: Record<string, unknown>;
	contributionFrequency: ContributionFrequency;
	durationType: DurationType;
	/** "Number of cycles, months, or target amount" per the entity's own
	 * comment — meaning has no dedicated field for `fixed_time`'s end date;
	 * the create DTO has no way to accept one (see zeufack/totine, flagged
	 * but not filed as a blocker — narrower gap than the tontineTypeId one). */
	durationValue?: number;
}

export async function createTontine(
	accessToken: string,
	input: CreateTontineInput,
): Promise<BackendTontine> {
	const raw = await apiFetch("/tontines", accessToken, {
		method: "POST",
		body: JSON.stringify(input),
	});
	return backendTontineSchema.parse(raw);
}

// Only the fields this app needs are validated — the real response is a full
// Participant (positionConfiguration, preferences, statistics, nested
// tontine/user, ...) that zod silently strips down to this shape.
const joinTontineResultSchema = z.object({
	id: z.string(),
	status: participantStatusSchema,
});
export type JoinTontineResult = z.infer<typeof joinTontineResultSchema>;

/**
 * `active` for a public tontine, `pending` for a private one — decided
 * server-side off `tontine.public`, not something the caller specifies.
 * Throws (via apiFetch) on the backend's own 400/404/409s: tontine not
 * accepting new participants, tontine not found, or already a participant.
 */
export async function joinTontine(
	accessToken: string,
	tontineId: string,
): Promise<JoinTontineResult> {
	const raw = await apiFetch("/tontines/join", accessToken, {
		method: "POST",
		body: JSON.stringify({ tontineId }),
	});
	return joinTontineResultSchema.parse(raw);
}
