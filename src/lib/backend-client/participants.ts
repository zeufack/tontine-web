import { z } from "zod";
import { apiFetch } from "./api-fetch";
import { participantStatusSchema } from "./tontines";

const backendParticipantUserSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
});

export const backendParticipantSchema = z.object({
	id: z.string(),
	status: participantStatusSchema,
	joinedAt: z.string().nullable(),
	user: backendParticipantUserSchema.nullish(),
});
export type BackendParticipant = z.infer<typeof backendParticipantSchema>;

export async function fetchParticipantsForTontine(
	accessToken: string,
	tontineId: string,
): Promise<BackendParticipant[]> {
	const raw = await apiFetch(`/participants/tontine/${tontineId}`, accessToken);
	return z.array(backendParticipantSchema).parse(raw);
}

/** Only valid from `pending` status — throws (via apiFetch) otherwise. */
export async function activateParticipant(
	accessToken: string,
	participantId: string,
): Promise<BackendParticipant> {
	const raw = await apiFetch(
		`/participants/${participantId}/activate`,
		accessToken,
		{ method: "PATCH" },
	);
	return backendParticipantSchema.parse(raw);
}

/** Only valid from `active` status — throws (via apiFetch) otherwise. */
export async function suspendParticipant(
	accessToken: string,
	participantId: string,
	reason?: string,
): Promise<BackendParticipant> {
	const raw = await apiFetch(
		`/participants/${participantId}/suspend`,
		accessToken,
		{
			method: "PATCH",
			body: JSON.stringify(reason ? { reason } : {}),
		},
	);
	return backendParticipantSchema.parse(raw);
}
