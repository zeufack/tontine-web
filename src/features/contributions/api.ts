import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import type { BackendContribution } from "#/lib/backend-client/contributions";
import {
	type ContributionMethod,
	type ContributionStatus,
	createContribution as createContributionOnBackend,
	fetchContributions,
	validateContribution as validateContributionOnBackend,
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

export interface PendingContribution {
	id: string;
	participantName: string;
	amount: number;
	method: ContributionMethod;
	submittedAt: string;
}

function toPendingContribution(
	backendContribution: BackendContribution,
): PendingContribution {
	const user = backendContribution.participant?.user;
	const participantName = user
		? `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email
		: "—";
	return {
		id: backendContribution.id,
		participantName,
		amount: backendContribution.amount,
		method: backendContribution.method,
		submittedAt: backendContribution.createdAt,
	};
}

const fetchPendingContributionsFromBackend = createServerFn({
	method: "GET",
})
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<PendingContribution[]> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const { data } = await fetchContributions(session.accessToken, {
			limit: CONTRIBUTIONS_FETCH_LIMIT,
		});
		return data
			.filter(
				(contribution) =>
					contribution.turn?.tontine?.id === tontineId &&
					contribution.status === "pending",
			)
			.map(toPendingContribution);
	});

export async function listPendingContributions(
	tontineId: string,
): Promise<PendingContribution[]> {
	return fetchPendingContributionsFromBackend({ data: tontineId });
}

const validateContributionOnServer = createServerFn({ method: "POST" })
	.validator(
		(input: {
			tontineId: string;
			contributionId: string;
			approve: boolean;
			rejectionReason?: string;
		}) => input,
	)
	.handler(async ({ data: input }): Promise<void> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const result = await validateContributionOnBackend(
			session.accessToken,
			input,
		);
		// A reject (`approve: false`) always reports `isValid: false` — that's
		// confirmation the rejection went through, not a failure. Only an
		// approve attempt that comes back invalid (amount mismatch, turn not
		// accepting contributions, ...) is a real error.
		if (input.approve && !result.isValid) {
			throw new Error(result.errors?.join(", ") || result.message);
		}
	});

/** Approve a pending contribution. */
export async function approveContribution(
	tontineId: string,
	contributionId: string,
): Promise<void> {
	return validateContributionOnServer({
		data: { tontineId, contributionId, approve: true },
	});
}

/** Reject a pending contribution — `reason` is shown to the participant. */
export async function rejectContribution(
	tontineId: string,
	contributionId: string,
	reason: string,
): Promise<void> {
	return validateContributionOnServer({
		data: {
			tontineId,
			contributionId,
			approve: false,
			rejectionReason: reason,
		},
	});
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

	/**
	 * The validation queue is a time-sensitive admin view per DESIGN.md §8 —
	 * poll it rather than relying on the app-wide defaults.
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
