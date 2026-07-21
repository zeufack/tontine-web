import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	activateTontine as activateTontineOnBackend,
	type BackendTontine,
	type ContributionFrequency,
	createTontine as createTontineOnBackend,
	type DurationType,
	fetchMyTontines,
	fetchTontineById,
	fetchTontineStatistics,
	fetchTontineTypes,
	type JoinTontineResult,
	joinTontine as joinTontineOnBackend,
	type TontineStatistics,
	type TontineStatus,
} from "#/lib/backend-client/tontines";
import type { PayoutStrategy } from "#/lib/mock-data/schemas";
import { readSessionCookie } from "#/lib/session-cookie";
import {
	resolveTontinePermissions,
	type TontinePermission,
	type TontineRoleLabel,
} from "./permissions";

export type { TontineStatus, TontineStatistics };
export type { TontinePermission, TontineRoleLabel } from "./permissions";

export interface TontineMembership {
	role: TontineRoleLabel;
	/** True only for `role === "creator"` — the only bundle this app can
	 * currently prove carries admin-tier permissions (see permissions.ts). */
	isAdmin: boolean;
	permissions: TontinePermission[];
}

export interface Tontine {
	id: string;
	name: string;
	status: TontineStatus;
	frequency: BackendTontine["contributionFrequency"];
	participantCount: number;
	/** Best-effort only — the real backend has more tontine types than this
	 * 3-value union covers (see `tontine_types` migration); an unrecognized
	 * type surfaces here uncast. Cycle/strategy UI (#27) isn't wired to real
	 * tontines yet regardless. */
	payoutStrategy: PayoutStrategy;
	/** Not a modeled field on the real Tontine entity — `configuration` is
	 * free-form JSON. Defaults to XAF (this app's primary market currency)
	 * when absent, matching the existing convention in contributions.tsx. */
	currency: string;
	role: TontineRoleLabel;
	permissions: TontinePermission[];
}

function toTontine(
	backendTontine: BackendTontine,
	currentUserId: string,
): Tontine {
	const rawCurrency = backendTontine.configuration?.currency;
	const isActiveParticipant = backendTontine.participants.some(
		(participant) =>
			participant.status === "active" && participant.user?.id === currentUserId,
	);
	const resolved = resolveTontinePermissions({
		currentUserId,
		creatorId: backendTontine.creator?.id ?? null,
		isActiveParticipant,
		isPublic: backendTontine.public,
	});
	return {
		id: backendTontine.id,
		name: backendTontine.name,
		status: backendTontine.status,
		frequency: backendTontine.contributionFrequency,
		participantCount: backendTontine.participants.length,
		payoutStrategy: backendTontine.tontineType.name as PayoutStrategy,
		currency: typeof rawCurrency === "string" ? rawCurrency : "XAF",
		role: resolved.role,
		permissions: resolved.permissions,
	};
}

const fetchMyTontinesFromBackend = createServerFn({ method: "GET" }).handler(
	async (): Promise<Tontine[]> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const tontines = await fetchMyTontines(session.accessToken);
		return tontines.map((tontine) => toTontine(tontine, session.user.id));
	},
);

export async function listTontinesForUser(): Promise<Tontine[]> {
	return fetchMyTontinesFromBackend();
}

const fetchTontineDetailFromBackend = createServerFn({ method: "GET" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<Tontine> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const tontine = await fetchTontineById(session.accessToken, tontineId);
		return toTontine(tontine, session.user.id);
	});

export async function getTontineDetail(tontineId: string): Promise<Tontine> {
	return fetchTontineDetailFromBackend({ data: tontineId });
}

const fetchTontineStatisticsFromBackend = createServerFn({ method: "GET" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<TontineStatistics> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		return fetchTontineStatistics(session.accessToken, tontineId);
	});

export async function getTontineStatistics(
	tontineId: string,
): Promise<TontineStatistics> {
	return fetchTontineStatisticsFromBackend({ data: tontineId });
}

const activateTontineOnServer = createServerFn({ method: "POST" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<Tontine> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const tontine = await activateTontineOnBackend(
			session.accessToken,
			tontineId,
		);
		return toTontine(tontine, session.user.id);
	});

export async function activateTontine(tontineId: string): Promise<Tontine> {
	return activateTontineOnServer({ data: tontineId });
}

export interface CreateTontineInput {
	name: string;
	currency: string;
	contributionAmount: number;
	frequency: ContributionFrequency;
	payoutStrategy: PayoutStrategy;
	durationType: DurationType;
	cycleCount?: number;
	endDate?: string;
	goalAmount?: number;
}

const createTontineOnServer = createServerFn({ method: "POST" })
	.validator((input: CreateTontineInput) => input)
	.handler(async ({ data: input }): Promise<Tontine> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");

		// The wizard's 3-option strategy picker (rotating/lottery/bidding)
		// doubles as the real `TontineType.name` — resolved to its
		// per-database id here since `POST /tontines` needs a real
		// `tontineTypeId`, not the strategy name itself.
		const tontineTypes = await fetchTontineTypes();
		const tontineType = tontineTypes.find(
			(type) => type.name === input.payoutStrategy,
		);
		if (!tontineType) {
			throw new Error(
				`No tontine type named "${input.payoutStrategy}" was found on the backend.`,
			);
		}

		// `endDate` (for `fixed_time`) has no equivalent field on the create
		// DTO — only a single `durationValue` ("cycles, months, or target
		// amount" per the entity's own comment). Fixed-time tontines are
		// created without a persisted end date until the backend adds one.
		const durationValue =
			input.durationType === "fixed_cycles"
				? input.cycleCount
				: input.durationType === "goal_based"
					? input.goalAmount
					: undefined;

		const tontine = await createTontineOnBackend(session.accessToken, {
			name: input.name,
			tontineTypeId: tontineType.id,
			contributionFrequency: input.frequency,
			durationType: input.durationType,
			durationValue,
			configuration: {
				currency: input.currency,
				contributionAmount: input.contributionAmount,
			},
		});
		return toTontine(tontine, session.user.id);
	});

export async function createTontine(
	input: CreateTontineInput,
): Promise<Tontine> {
	return createTontineOnServer({ data: input });
}

export type { JoinTontineResult };

const joinTontineOnServer = createServerFn({ method: "POST" })
	.validator((tontineId: string) => tontineId)
	.handler(async ({ data: tontineId }): Promise<JoinTontineResult> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		return joinTontineOnBackend(session.accessToken, tontineId);
	});

export async function joinTontine(
	tontineId: string,
): Promise<JoinTontineResult> {
	return joinTontineOnServer({ data: tontineId });
}

/**
 * Real per-tontine membership/permission resolution — replaces the old
 * `getTontineMembershipStub`. See permissions.ts for exactly which roles
 * this can and can't detect today.
 */
export async function getTontineMembership(
	tontineId: string,
): Promise<TontineMembership> {
	const tontine = await getTontineDetail(tontineId);
	return {
		role: tontine.role,
		isAdmin: tontine.role === "creator",
		permissions: tontine.permissions,
	};
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

	statistics: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "statistics"] as const,
			queryFn: () => getTontineStatistics(tontineId),
		}),

	/**
	 * Not yet consumed by a route — the per-tontine `beforeLoad` guard calls
	 * `getTontineMembership` directly rather than through the Query cache,
	 * since route guards run once per navigation rather than needing
	 * reactive re-fetching. Kept here for a future component (e.g. a live
	 * role indicator) that wants cache-backed access to the same data.
	 */
	membership: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "membership"] as const,
			queryFn: () => getTontineMembership(tontineId),
		}),
};
