import { queryOptions } from "@tanstack/react-query";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type {
	Membership,
	MembershipRole,
	Tontine,
} from "#/lib/mock-data/schemas";
import {
	CURRENT_USER_ID,
	createTontine as createTontineInStore,
	findTontine,
	mockStore,
} from "#/lib/mock-data/store";

export type TontineMembership = Membership;

export type MyContributionStatus = "paid" | "pending" | "overdue";

export interface TontineSummary {
	tontine: Tontine;
	membership: Membership;
	potTotal: number;
	/** Who receives the pot next, when derivable (rotating strategy only). */
	nextBeneficiaryName?: string;
	myContributionStatus: MyContributionStatus;
}

export async function listTontinesForUser(): Promise<TontineSummary[]> {
	const myMemberships = mockStore.members.filter(
		(member) => member.id === CURRENT_USER_ID,
	);
	const results = myMemberships.flatMap((member) => {
		const tontine = findTontine(member.tontineId);
		if (!tontine) return [];
		const cycle = mockStore.cycles.find((c) => c.tontineId === tontine.id);

		let nextBeneficiaryName: string | undefined;
		if (cycle?.strategyState.kind === "rotating") {
			nextBeneficiaryName = cycle.strategyState.order.find(
				(entry) =>
					entry.memberId === cycle.strategyState.currentBeneficiaryMemberId,
			)?.name;
		}

		const myContribution = cycle
			? mockStore.contributions.find(
					(contribution) =>
						contribution.cycleId === cycle.id &&
						contribution.memberId === CURRENT_USER_ID,
				)
			: undefined;
		const myContributionStatus: MyContributionStatus =
			myContribution?.status === "validated"
				? "paid"
				: myContribution?.status === "pending"
					? "pending"
					: "overdue";

		return [
			{
				tontine,
				membership: { role: member.role },
				potTotal: cycle?.potTotal ?? 0,
				nextBeneficiaryName,
				myContributionStatus,
			},
		];
	});
	return simulateNetwork(results);
}

export async function getTontineDetail(
	tontineId: string,
): Promise<Tontine | undefined> {
	return simulateNetwork(findTontine(tontineId));
}

export async function createTontine(input: {
	name: string;
	currency: string;
	contributionAmount: number;
	frequency: Tontine["frequency"];
	payoutStrategy: Tontine["payoutStrategy"];
}): Promise<Tontine> {
	return simulateNetwork(createTontineInStore(input));
}

/**
 * TODO(api): replace with a real membership fetch once the tontine API
 * client exists. Shape mirrors what DESIGN.md §4 expects the real membership
 * object to look like.
 *
 * `overrideRole` is a dev-only escape hatch (wired to a `?role=` search
 * param) for manually exercising both RBAC branches without real multi-user
 * auth — see the per-tontine `_admin` guard.
 */
export async function getTontineMembershipStub(
	_tontineId: string,
	options?: { overrideRole?: MembershipRole },
): Promise<TontineMembership> {
	return { role: options?.overrideRole ?? "admin" };
}

export const tontineQueries = {
	mine: () =>
		queryOptions({
			queryKey: ["tontines", "mine"] as const,
			queryFn: listTontinesForUser,
		}),

	detail: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId] as const,
			queryFn: () => getTontineDetail(tontineId),
		}),

	/**
	 * Not yet consumed by a route — the per-tontine `beforeLoad` guard calls
	 * `getTontineMembershipStub` directly rather than through the Query cache,
	 * since route guards run once per navigation rather than needing
	 * reactive re-fetching. Kept here for a future component (e.g. a live
	 * role indicator) that wants cache-backed access to the same data.
	 */
	membership: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "membership"] as const,
			queryFn: () => getTontineMembershipStub(tontineId),
		}),
};
