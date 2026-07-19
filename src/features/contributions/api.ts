import { queryOptions } from "@tanstack/react-query";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type { Contribution, ContributionMethod } from "#/lib/mock-data/schemas";
import {
	mockStore,
	recordContribution as recordContributionInStore,
	rejectContribution as rejectContributionInStore,
	validateContribution as validateContributionInStore,
} from "#/lib/mock-data/store";

export async function listContributions(
	tontineId: string,
	options?: { memberId?: string },
): Promise<Contribution[]> {
	const results = mockStore.contributions.filter(
		(contribution) =>
			contribution.tontineId === tontineId &&
			(options?.memberId ? contribution.memberId === options.memberId : true),
	);
	return simulateNetwork(results);
}

export async function listPendingContributions(
	tontineId: string,
): Promise<Contribution[]> {
	const results = mockStore.contributions.filter(
		(contribution) =>
			contribution.tontineId === tontineId && contribution.status === "pending",
	);
	return simulateNetwork(results);
}

export async function recordContribution(input: {
	tontineId: string;
	memberId: string;
	amount: number;
	method: ContributionMethod;
	reference?: string;
	receiptFileName?: string;
}): Promise<Contribution> {
	return simulateNetwork(recordContributionInStore(input));
}

export async function validateContribution(
	contributionId: string,
	note?: string,
): Promise<Contribution> {
	return simulateNetwork(validateContributionInStore(contributionId, note));
}

export async function rejectContribution(
	contributionId: string,
	note?: string,
): Promise<Contribution> {
	return simulateNetwork(rejectContributionInStore(contributionId, note));
}

export const contributionQueries = {
	list: (tontineId: string, memberId?: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "contributions", { memberId }] as const,
			queryFn: () => listContributions(tontineId, { memberId }),
		}),

	/**
	 * Backs the Admin Validation Queue — a time-sensitive view per DESIGN.md
	 * §8, so it polls and refetches on focus rather than relying on the
	 * app-wide defaults.
	 */
	pending: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "contributions", "pending"] as const,
			queryFn: () => listPendingContributions(tontineId),
			staleTime: 5_000,
			refetchOnWindowFocus: true,
			refetchInterval: 15_000,
		}),
};
