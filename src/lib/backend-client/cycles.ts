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
