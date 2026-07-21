import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	activateParticipant as activateParticipantOnBackend,
	type BackendParticipant,
	fetchParticipantsForTontine,
	suspendParticipant as suspendParticipantOnBackend,
} from "#/lib/backend-client/participants";
import type { ParticipantStatus } from "#/lib/mock-data/schemas";
import { readSessionCookie } from "#/lib/session-cookie";

export type { ParticipantStatus };

export interface Member {
	id: string;
	name: string;
	email: string;
	status: ParticipantStatus;
	joinedAt: string | null;
}

function toMember(participant: BackendParticipant): Member {
	const user = participant.user;
	const name = user
		? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
		: "—";
	return {
		id: participant.id,
		name,
		email: user?.email ?? "",
		status: participant.status,
		joinedAt: participant.joinedAt,
	};
}

const fetchMembersFromBackend = createServerFn({ method: "GET" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<Member[]> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const participants = await fetchParticipantsForTontine(
			session.accessToken,
			tontineId,
		);
		return participants.map(toMember);
	});

export async function listMembers(tontineId: string): Promise<Member[]> {
	return fetchMembersFromBackend({ data: tontineId });
}

const activateMemberOnServer = createServerFn({ method: "POST" })
	.validator((participantId: string) => participantId)
	.handler(async ({ data: participantId }): Promise<Member> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const participant = await activateParticipantOnBackend(
			session.accessToken,
			participantId,
		);
		return toMember(participant);
	});

/** Approves a pending participant (private-tontine join approval). */
export async function activateMember(participantId: string): Promise<Member> {
	return activateMemberOnServer({ data: participantId });
}

const suspendMemberOnServer = createServerFn({ method: "POST" })
	.validator((participantId: string) => participantId)
	.handler(async ({ data: participantId }): Promise<Member> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const participant = await suspendParticipantOnBackend(
			session.accessToken,
			participantId,
		);
		return toMember(participant);
	});

export async function suspendMember(participantId: string): Promise<Member> {
	return suspendMemberOnServer({ data: participantId });
}

export const memberQueries = {
	list: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "members"] as const,
			queryFn: () => listMembers(tontineId),
		}),
};
