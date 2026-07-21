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

// A caller-owned/joined tontine, as returned by GET /tontines and
// GET /tontines/:id. `participants` is only validated shallowly here — it
// crosses into a plain summary type (participantCount) before leaving the
// server function boundary, since createServerFn requires its return value
// to be a concretely-typed serializable shape.
export const backendTontineSchema = z.object({
	id: z.string(),
	name: z.string(),
	status: tontineStatusSchema,
	contributionFrequency: contributionFrequencySchema,
	configuration: z.record(z.string(), z.unknown()).nullish(),
	tontineType: z.object({ id: z.string(), name: z.string() }),
	participants: z.array(z.unknown()),
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
