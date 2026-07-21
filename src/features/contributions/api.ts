import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { BackendContribution } from "#/lib/backend-client/contributions";
import {
	type ContributionMethod,
	type ContributionStatus,
	createContribution as createContributionOnBackend,
	fetchContributions,
} from "#/lib/backend-client/contributions";
import { fetchCurrentCycle } from "#/lib/backend-client/cycles";
import { fetchParticipantsForTontine } from "#/lib/backend-client/participants";
import { fetchTurnsForCycle } from "#/lib/backend-client/turns";
import { readSessionCookie } from "#/lib/session-cookie";

export type { ContributionMethod, ContributionStatus };

export interface Contribution {
	id: string;
	amount: number;
	method: ContributionMethod;
	status: ContributionStatus;
	rejectionReason: string | null;
	submittedAt: string;
}

function toContribution(
	backendContribution: BackendContribution,
): Contribution {
	return {
		id: backendContribution.id,
		amount: backendContribution.amount,
		method: backendContribution.method,
		status: backendContribution.status,
		rejectionReason:
			backendContribution.validationDetails?.rejectionReason ?? null,
		submittedAt: backendContribution.createdAt,
	};
}

// `GET /contributions` has no tontineId/participantId query-param
// passthrough (see backend-client/contributions.ts) — every contribution
// the caller can access across every tontine they belong to comes back in
// one page, filtered here instead.
const CONTRIBUTIONS_FETCH_LIMIT = 200;

const fetchMyContributionsFromBackend = createServerFn({ method: "GET" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<Contribution[]> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const { data } = await fetchContributions(session.accessToken, {
			limit: CONTRIBUTIONS_FETCH_LIMIT,
		});
		return data
			.filter(
				(contribution) =>
					contribution.turn?.tontine?.id === tontineId &&
					contribution.participant?.user?.id === session.user.id,
			)
			.map(toContribution);
	});

export async function listMyContributions(
	tontineId: string,
): Promise<Contribution[]> {
	return fetchMyContributionsFromBackend({ data: tontineId });
}

export interface ContributionTarget {
	turnId: string;
	participantId: string;
	contributionAmount: number;
	alreadySubmitted: boolean;
}

/**
 * What the caller can currently submit a contribution for, if anything: the
 * cycle's `in_progress` turn (every active participant contributes toward
 * the same turn each period — a Turn's own `participant` is its
 * *beneficiary*, not who's expected to pay into it) plus the caller's own
 * participant id. `null` when there's no active cycle, the caller isn't a
 * participant, or no turn is currently accepting contributions.
 */
const fetchContributionTargetFromBackend = createServerFn({ method: "GET" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<ContributionTarget | null> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");

		const [participants, currentCycle] = await Promise.all([
			fetchParticipantsForTontine(session.accessToken, tontineId),
			fetchCurrentCycle(session.accessToken, tontineId),
		]);

		const myParticipant = participants.find(
			(participant) => participant.user?.id === session.user.id,
		);
		if (!myParticipant || !currentCycle) return null;

		const turns = await fetchTurnsForCycle(
			session.accessToken,
			currentCycle.id,
		);
		const currentTurn = turns.find((turn) => turn.status === "in_progress");
		if (!currentTurn) return null;

		const { data: contributions } = await fetchContributions(
			session.accessToken,
			{ limit: CONTRIBUTIONS_FETCH_LIMIT },
		);
		const alreadySubmitted = contributions.some(
			(contribution) =>
				contribution.turn?.id === currentTurn.id &&
				contribution.participant?.id === myParticipant.id,
		);

		return {
			turnId: currentTurn.id,
			participantId: myParticipant.id,
			contributionAmount: currentTurn.contributionAmount,
			alreadySubmitted,
		};
	});

export async function getContributionTarget(
	tontineId: string,
): Promise<ContributionTarget | null> {
	return fetchContributionTargetFromBackend({ data: tontineId });
}

export interface RecordContributionInput {
	turnId: string;
	participantId: string;
	amount: number;
	method: ContributionMethod;
	notes?: string;
}

const recordContributionOnServer = createServerFn({ method: "POST" })
	.validator((input: RecordContributionInput) => input)
	.handler(async ({ data: input }): Promise<Contribution> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const contribution = await createContributionOnBackend(
			session.accessToken,
			input,
		);
		return toContribution(contribution);
	});

export async function recordContribution(
	input: RecordContributionInput,
): Promise<Contribution> {
	return recordContributionOnServer({ data: input });
}

export const contributionQueries = {
	mine: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "contributions", "mine"] as const,
			queryFn: () => listMyContributions(tontineId),
		}),

	target: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "contributions", "target"] as const,
			queryFn: () => getContributionTarget(tontineId),
		}),
};
