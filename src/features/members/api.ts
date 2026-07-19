import { queryOptions } from "@tanstack/react-query";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type { Member } from "#/lib/mock-data/schemas";
import {
	inviteMember as inviteMemberInStore,
	mockStore,
	promoteMember as promoteMemberInStore,
	removeMember as removeMemberInStore,
} from "#/lib/mock-data/store";

export async function listMembers(tontineId: string): Promise<Member[]> {
	const results = mockStore.members.filter(
		(member) => member.tontineId === tontineId,
	);
	return simulateNetwork(results);
}

export async function inviteMember(
	tontineId: string,
	email: string,
): Promise<Member> {
	return simulateNetwork(inviteMemberInStore(tontineId, email));
}

export async function removeMember(
	tontineId: string,
	memberId: string,
): Promise<void> {
	removeMemberInStore(tontineId, memberId);
	return simulateNetwork(undefined);
}

export async function promoteMember(
	tontineId: string,
	memberId: string,
): Promise<Member> {
	return simulateNetwork(promoteMemberInStore(tontineId, memberId));
}

export const memberQueries = {
	list: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "members"] as const,
			queryFn: () => listMembers(tontineId),
		}),
};
