import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import {
	fetchAdminStats,
	fetchAdminTontines,
	fetchAdminUsers,
} from "#/lib/backend-client";
import type {
	PlatformStats,
	PlatformTontineSummary,
	PlatformUserSummary,
} from "#/lib/mock-data/schemas";
import { readSessionCookie } from "#/lib/session-cookie";

const fetchAllTontinesFromBackend = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = readSessionCookie();
		if (!session) {
			throw new Error("Not authenticated");
		}
		// No pager UI exists yet — a generous limit approximates "list all"
		// for the platform's current size.
		return fetchAdminTontines(session.accessToken, { limit: 100 });
	},
);

export async function listAllTontines(): Promise<PlatformTontineSummary[]> {
	const { data } = await fetchAllTontinesFromBackend();
	return data.map((tontine) => ({
		id: tontine.id,
		name: tontine.name,
		memberCount: tontine.memberCount,
		potTotal: tontine.potTotal,
		payoutStrategy: tontine.tontineType
			.name as PlatformTontineSummary["payoutStrategy"],
	}));
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

const fetchAdminStatsFromBackend = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = readSessionCookie();
		if (!session) {
			throw new Error("Not authenticated");
		}
		return fetchAdminStats(session.accessToken);
	},
);

export async function getPlatformStats(): Promise<PlatformStats> {
	return fetchAdminStatsFromBackend();
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
