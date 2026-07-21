import { z } from "zod";
import { apiFetch } from "./api-fetch";

export const cycleStatusSchema = z.enum([
	"pending",
	"active",
	"completed",
	"cancelled",
]);
export type CycleStatus = z.infer<typeof cycleStatusSchema>;

// jsonb-nested — always plain JS numbers from JSON.parse, unlike the
// numeric-column decimal fields on Turn/Beneficiary (see turns.ts).
const cycleStatisticsSchema = z.object({
	totalContributions: z.number(),
	totalDistributed: z.number(),
	participantCount: z.number(),
	turnCount: z.number(),
	averageContribution: z.number(),
	completionPercentage: z.number(),
});

export const backendCycleSchema = z.object({
	id: z.string(),
	cycleNumber: z.number(),
	status: cycleStatusSchema,
	startDate: z.string(),
	endDate: z.string().nullable(),
	statistics: cycleStatisticsSchema,
});
export type BackendCycle = z.infer<typeof backendCycleSchema>;

/** `null` when the tontine has no active cycle yet. */
export async function fetchCurrentCycle(
	accessToken: string,
	tontineId: string,
): Promise<BackendCycle | null> {
	const raw = await apiFetch(
		`/cycles/tontine/${tontineId}/current`,
		accessToken,
	);
	return raw === null ? null : backendCycleSchema.parse(raw);
}

export async function fetchCyclesForTontine(
	accessToken: string,
	tontineId: string,
): Promise<{ cycles: BackendCycle[]; total: number }> {
	const raw = await apiFetch(`/cycles/tontine/${tontineId}`, accessToken);
	return z
		.object({ cycles: z.array(backendCycleSchema), total: z.number() })
		.parse(raw);
}

export interface CreateCycleInput {
	tontineId: string;
	/** ISO date string (yyyy-mm-dd). */
	startDate: string;
}

/**
 * Creates a `pending` cycle — no turns exist yet, and it won't show up from
 * `fetchCurrentCycle` (which only ever looks for `active`). Requires the
 * tontine to have no existing active/pending cycle and at least one active
 * participant; throws (via apiFetch) otherwise.
 */
export async function createCycle(
	accessToken: string,
	input: CreateCycleInput,
): Promise<BackendCycle> {
	const raw = await apiFetch("/cycles", accessToken, {
		method: "POST",
		body: JSON.stringify(input),
	});
	return backendCycleSchema.parse(raw);
}

/**
 * pending -> active, generating the turn schedule (turn 1 starts
 * `in_progress` immediately). Throws (via apiFetch) if the cycle isn't
 * currently pending.
 */
export async function startCycle(
	accessToken: string,
	cycleId: string,
): Promise<BackendCycle> {
	const raw = await apiFetch(`/cycles/${cycleId}/start`, accessToken, {
		method: "POST",
	});
	return backendCycleSchema.parse(raw);
}
