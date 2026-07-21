import { z } from "zod";
import { apiFetch } from "./api-fetch";

export const contributionMethodSchema = z.enum([
	"cash",
	"bank_transfer",
	"mobile_money",
	"credit_card",
	"digital_wallet",
	"other",
]);
export type ContributionMethod = z.infer<typeof contributionMethodSchema>;

export const contributionStatusSchema = z.enum([
	"pending",
	"validated",
	"rejected",
	"failed",
	"refunded",
]);
export type ContributionStatus = z.infer<typeof contributionStatusSchema>;

const backendContributionTurnSchema = z.object({
	id: z.string(),
	tontine: z.object({ id: z.string() }).nullish(),
});

const backendContributionParticipantSchema = z.object({
	id: z.string(),
	user: z.object({ id: z.string() }).nullish(),
});

export const backendContributionSchema = z.object({
	id: z.string(),
	amount: z.coerce.number(),
	status: contributionStatusSchema,
	method: contributionMethodSchema,
	notes: z.string().nullable(),
	validationDetails: z
		.object({ rejectionReason: z.string().optional() })
		.nullish(),
	createdAt: z.string(),
	turn: backendContributionTurnSchema.nullish(),
	participant: backendContributionParticipantSchema.nullish(),
});
export type BackendContribution = z.infer<typeof backendContributionSchema>;

/**
 * `GET /contributions` has no query-param passthrough for tontineId/
 * participantId filters on the controller (only page/limit) even though the
 * service supports them — returns every contribution across every tontine
 * the caller can access. Callers must filter client-side by
 * `turn.tontine.id` / `participant.user.id`.
 */
export async function fetchContributions(
	accessToken: string,
	params?: { page?: number; limit?: number },
): Promise<{ data: BackendContribution[]; total: number }> {
	const url = new URLSearchParams();
	if (params?.page) url.set("page", String(params.page));
	if (params?.limit) url.set("limit", String(params.limit));
	const query = url.toString();
	const raw = await apiFetch(
		`/contributions${query ? `?${query}` : ""}`,
		accessToken,
	);
	return z
		.object({ data: z.array(backendContributionSchema), total: z.number() })
		.parse(raw);
}

export interface CreateContributionInput {
	participantId: string;
	turnId: string;
	amount: number;
	method: ContributionMethod;
	notes?: string;
}

/**
 * Throws (via apiFetch) on the backend's own validation: participant not
 * active, or a contribution already exists for this participant/turn pair
 * (one contribution per turn, enforced server-side).
 */
export async function createContribution(
	accessToken: string,
	input: CreateContributionInput,
): Promise<BackendContribution> {
	const raw = await apiFetch("/contributions", accessToken, {
		method: "POST",
		body: JSON.stringify(input),
	});
	return backendContributionSchema.parse(raw);
}

export interface ValidateContributionResult {
	isValid: boolean;
	message: string;
	errors?: string[];
	warnings?: string[];
}

const validateContributionResultSchema = z.object({
	isValid: z.boolean(),
	message: z.string(),
	errors: z.array(z.string()).optional(),
	warnings: z.array(z.string()).optional(),
});

export interface ValidateContributionInput {
	tontineId: string;
	contributionId: string;
	approve: boolean;
	rejectionReason?: string;
}

/**
 * A single endpoint for both approve and reject. `isValid: false` in the
 * response does NOT always mean the call failed — for a reject
 * (`approve: false`), the backend always returns `isValid: false` as
 * confirmation the rejection went through, not an error. Only treat
 * `isValid: false` as a real failure when `approve: true`.
 */
export async function validateContribution(
	accessToken: string,
	input: ValidateContributionInput,
): Promise<ValidateContributionResult> {
	const raw = await apiFetch("/contributions/validate", accessToken, {
		method: "POST",
		body: JSON.stringify(input),
	});
	return validateContributionResultSchema.parse(raw);
}
