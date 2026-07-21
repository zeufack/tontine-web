import { z } from "zod";
import { apiFetch } from "./api-fetch";

export const turnStatusSchema = z.enum([
	"scheduled",
	"in_progress",
	"completed",
	"skipped",
	"cancelled",
	"pending_auction",
	"auction_open",
]);
export type TurnStatus = z.infer<typeof turnStatusSchema>;

export const beneficiaryStatusSchema = z.enum([
	"designated",
	"confirmed",
	"paid",
	"cancelled",
]);
export type BeneficiaryStatus = z.infer<typeof beneficiaryStatusSchema>;

const backendTurnParticipantSchema = z.object({
	user: z
		.object({
			id: z.string(),
			firstName: z.string().nullable(),
			lastName: z.string().nullable(),
		})
		.nullish(),
});

const backendTurnBeneficiarySchema = z.object({
	status: beneficiaryStatusSchema,
	// `numeric` Postgres columns come back as strings through node-postgres —
	// z.coerce.number() accepts either that or a real number uniformly.
	amountReceived: z.coerce.number(),
});

export const backendTurnSchema = z.object({
	id: z.string(),
	turnNumber: z.number(),
	scheduledDate: z.string(),
	actualDate: z.string().nullable(),
	status: turnStatusSchema,
	contributionAmount: z.coerce.number(),
	payoutAmount: z.coerce.number().nullable(),
	participant: backendTurnParticipantSchema.nullish(),
	beneficiary: backendTurnBeneficiarySchema.nullish(),
});
export type BackendTurn = z.infer<typeof backendTurnSchema>;

/**
 * Turn schedule for a cycle, ordered by turn number — already carries the
 * participant's name and beneficiary/payout status per turn (no separate
 * `GET /beneficiaries/turn/:id` calls needed).
 */
export async function fetchTurnsForCycle(
	accessToken: string,
	cycleId: string,
): Promise<BackendTurn[]> {
	const raw = await apiFetch(`/turns/cycle/${cycleId}`, accessToken);
	return z.array(backendTurnSchema).parse(raw);
}
