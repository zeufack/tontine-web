import { queryOptions } from "@tanstack/react-query";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type { Cycle, PayoutStrategy } from "#/lib/mock-data/schemas";
import {
	mockStore,
	submitBid as submitBidInStore,
} from "#/lib/mock-data/store";

export async function getCurrentCycle(
	tontineId: string,
): Promise<Cycle | undefined> {
	const cycle = mockStore.cycles.find((c) => c.tontineId === tontineId);
	return simulateNetwork(cycle);
}

export async function listCycleHistory(tontineId: string): Promise<Cycle[]> {
	const history = mockStore.cycleHistory.filter(
		(cycle) => cycle.tontineId === tontineId,
	);
	return simulateNetwork(history);
}

export async function submitBid(
	cycleId: string,
	memberId: string,
	amount: number,
): Promise<Cycle> {
	return simulateNetwork(submitBidInStore(cycleId, memberId, amount));
}

export const cycleQueries = {
	/**
	 * The bidding strategy's live-auction countdown is a time-sensitive view
	 * per DESIGN.md §8 — poll it, but only when the tontine actually uses the
	 * bidding strategy, since polling a rotating/lottery cycle every few
	 * seconds would be wasted work.
	 */
	current: (tontineId: string, payoutStrategy?: PayoutStrategy) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "cycle"] as const,
			queryFn: () => getCurrentCycle(tontineId),
			...(payoutStrategy === "bidding"
				? {
						staleTime: 5_000,
						refetchOnWindowFocus: true,
						refetchInterval: 15_000,
					}
				: {}),
		}),

	history: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "cycles"] as const,
			queryFn: () => listCycleHistory(tontineId),
		}),
};
