import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { fetchAdminUsers } from "#/lib/backend-client";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type {
	PlatformStats,
	PlatformTontineSummary,
	PlatformUserSummary,
} from "#/lib/mock-data/schemas";
import { mockStore } from "#/lib/mock-data/store";
import { readSessionCookie } from "#/lib/session-cookie";

export async function listAllTontines(): Promise<PlatformTontineSummary[]> {
	const results = mockStore.tontines.map((tontine) => {
		const memberCount = mockStore.members.filter(
			(member) => member.tontineId === tontine.id,
		).length;
		const cycle = mockStore.cycles.find((c) => c.tontineId === tontine.id);
		return {
			id: tontine.id,
			name: tontine.name,
			memberCount,
			potTotal: cycle?.potTotal ?? 0,
			payoutStrategy: tontine.payoutStrategy,
		};
	});
	return simulateNetwork(results);
}

const fetchAllUsersFromBackend = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = readSessionCookie();
		if (!session) {
			throw new Error("Not authenticated");
		}
		// No pager UI exists yet — a generous limit approximates "list all"
		// for the platform's current size.
		return fetchAdminUsers(session.accessToken, { limit: 100 });
	},
);

export async function listAllUsers(): Promise<PlatformUserSummary[]> {
	const { data } = await fetchAllUsersFromBackend();
	return data.map((user) => ({
		id: user.id,
		name: `${user.firstName ?? ""} ${user.lastName ?? ""}`.trim() || user.email,
		email: user.email,
		tontineCount: user.tontineCount,
	}));
}

/**
 * totalTontines/totalPotValue below still come from mock data (tontine
 * listing/stats are #17/#18, not yet real) — counting unique mock members
 * here directly, rather than deriving from the now-real listAllUsers(),
 * keeps this mock-only aggregate from silently mixing in real data.
 */
function countMockUsers(): number {
	return new Set(mockStore.members.map((member) => member.email)).size;
}

export async function getPlatformStats(): Promise<PlatformStats> {
	const totalPotValue = mockStore.cycles.reduce(
		(sum, cycle) => sum + cycle.potTotal,
		0,
	);
	return simulateNetwork({
		totalTontines: mockStore.tontines.length,
		totalUsers: countMockUsers(),
		totalPotValue,
	});
}

export const platformQueries = {
	tontines: () =>
		queryOptions({
			queryKey: ["platform", "tontines"] as const,
			queryFn: listAllTontines,
		}),

	users: () =>
		queryOptions({
			queryKey: ["platform", "users"] as const,
			queryFn: listAllUsers,
		}),

	stats: () =>
		queryOptions({
			queryKey: ["platform", "stats"] as const,
			queryFn: getPlatformStats,
		}),
};
