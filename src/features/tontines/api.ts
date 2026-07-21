import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	activateTontine as activateTontineOnBackend,
	type BackendTontine,
	fetchMyTontines,
	fetchTontineById,
	fetchTontineStatistics,
	type TontineStatistics,
	type TontineStatus,
} from "#/lib/backend-client/tontines";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type {
	DurationType,
	MembershipRole,
	Tontine as MockTontine,
	PayoutStrategy,
	TontineFrequency,
} from "#/lib/mock-data/schemas";
import { createTontine as createTontineInStore } from "#/lib/mock-data/store";
import { readSessionCookie } from "#/lib/session-cookie";

export type { TontineStatus, TontineStatistics };

export interface TontineMembership {
	role: MembershipRole;
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
}

function toTontine(backendTontine: BackendTontine): Tontine {
	const rawCurrency = backendTontine.configuration?.currency;
	return {
		id: backendTontine.id,
		name: backendTontine.name,
		status: backendTontine.status,
		frequency: backendTontine.contributionFrequency,
		participantCount: backendTontine.participants.length,
		payoutStrategy: backendTontine.tontineType.name as PayoutStrategy,
		currency: typeof rawCurrency === "string" ? rawCurrency : "XAF",
	};
}

const fetchMyTontinesFromBackend = createServerFn({ method: "GET" }).handler(
	async (): Promise<Tontine[]> => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		const tontines = await fetchMyTontines(session.accessToken);
		return tontines.map(toTontine);
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
		return toTontine(tontine);
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
		return toTontine(tontine);
	});

export async function activateTontine(tontineId: string): Promise<Tontine> {
	return activateTontineOnServer({ data: tontineId });
}

/**
 * TODO(api): not yet wired to the real `POST /tontines` (#24) — still reads
 * and writes the mock store. Return type is intentionally the mock
 * `Tontine` shape (not this module's real-backend `Tontine`), since only
 * `.id` is consumed by the creation wizard's `onSuccess` navigation today.
 */
export async function createTontine(input: {
	name: string;
	currency: string;
	contributionAmount: number;
	frequency: TontineFrequency;
	payoutStrategy: PayoutStrategy;
	durationType: DurationType;
	cycleCount?: number;
	endDate?: string;
	goalAmount?: number;
}): Promise<MockTontine> {
	return simulateNetwork(createTontineInStore(input));
}

/**
 * TODO(api): replace with a real membership/permission fetch (#26) —
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

	statistics: (tontineId: string) =>
		queryOptions({
			queryKey: ["tontine", tontineId, "statistics"] as const,
			queryFn: () => getTontineStatistics(tontineId),
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
