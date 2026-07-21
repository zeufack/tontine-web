import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	type BackendCycle,
	type CycleStatus,
	fetchCurrentCycle,
	fetchCyclesForTontine,
} from "#/lib/backend-client/cycles";
import {
	type BackendTurn,
	type BeneficiaryStatus,
	fetchTurnsForCycle,
	type TurnStatus,
} from "#/lib/backend-client/turns";
import { readSessionCookie } from "#/lib/session-cookie";

export type { CycleStatus, TurnStatus, BeneficiaryStatus };

export interface Cycle {
	id: string;
	cycleNumber: number;
	status: CycleStatus;
	startDate: string;
	endDate: string | null;
	totalContributions: number;
	totalDistributed: number;
	participantCount: number;
	turnCount: number;
	averageContribution: number;
	completionPercentage: number;
}

export interface Turn {
	id: string;
	turnNumber: number;
	scheduledDate: string;
	status: TurnStatus;
	contributionAmount: number;
	payoutAmount: number | null;
	participantName: string | null;
	beneficiaryStatus: BeneficiaryStatus | null;
	amountReceived: number | null;
}

function toCycle(backendCycle: BackendCycle): Cycle {
	return {
		id: backendCycle.id,
		cycleNumber: backendCycle.cycleNumber,
		status: backendCycle.status,
		startDate: backendCycle.startDate,
		endDate: backendCycle.endDate,
		totalContributions: backendCycle.statistics.totalContributions,
		totalDistributed: backendCycle.statistics.totalDistributed,
		participantCount: backendCycle.statistics.participantCount,
		turnCount: backendCycle.statistics.turnCount,
		averageContribution: backendCycle.statistics.averageContribution,
		completionPercentage: backendCycle.statistics.completionPercentage,
	};
}

function toTurn(backendTurn: BackendTurn): Turn {
	const user = backendTurn.participant?.user;
	const participantName = user
		? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || null
		: null;
	return {
		id: backendTurn.id,
		turnNumber: backendTurn.turnNumber,
		scheduledDate: backendTurn.scheduledDate,
		status: backendTurn.status,
		contributionAmount: backendTurn.contributionAmount,
		payoutAmount: backendTurn.payoutAmount,
		participantName,
		beneficiaryStatus: backendTurn.beneficiary?.status ?? null,
		amountReceived: backendTurn.beneficiary?.amountReceived ?? null,
	};
}

export interface CurrentCycleView {
	cycle: Cycle | null;
	turns: Turn[];
}

const fetchCurrentCycleFromBackend = createServerFn({ method: "GET" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<CurrentCycleView> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");

		const backendCycle = await fetchCurrentCycle(
			session.accessToken,
			tontineId,
		);
		if (!backendCycle) {
			return { cycle: null, turns: [] };
		}

		const backendTurns = await fetchTurnsForCycle(
			session.accessToken,
			backendCycle.id,
		);
		return {
			cycle: toCycle(backendCycle),
			turns: backendTurns
				.map(toTurn)
				.sort((a, b) => a.turnNumber - b.turnNumber),
		};
	});

export async function getCurrentCycle(
	tontineId: string,
): Promise<CurrentCycleView> {
	return fetchCurrentCycleFromBackend({ data: tontineId });
}

const fetchCycleHistoryFromBackend = createServerFn({ method: "GET" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<Cycle[]> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const { cycles } = await fetchCyclesForTontine(
			session.accessToken,
			tontineId,
		);
		return cycles.map(toCycle);
	});

export async function listCycleHistory(tontineId: string): Promise<Cycle[]> {
	return fetchCycleHistoryFromBackend({ data: tontineId });
}

export const cycleQueries = {
	current: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "cycle"] as const,
			queryFn: () => getCurrentCycle(tontineId),
		}),

	history: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "cycles"] as const,
			queryFn: () => listCycleHistory(tontineId),
		}),
};
