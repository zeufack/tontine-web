import { queryOptions } from "@tanstack/react-query";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type {
	PlatformStats,
	PlatformTontineSummary,
	PlatformUserSummary,
} from "#/lib/mock-data/schemas";
import { mockStore } from "#/lib/mock-data/store";

export interface PlatformStaffStatus {
	isStaff: boolean;
}

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

export async function listAllUsers(): Promise<PlatformUserSummary[]> {
	const byEmail = new Map<string, PlatformUserSummary>();
	for (const member of mockStore.members) {
		const existing = byEmail.get(member.email);
		if (existing) {
			existing.tontineCount += 1;
		} else {
			byEmail.set(member.email, {
				id: member.id,
				name: member.name,
				email: member.email,
				tontineCount: 1,
			});
		}
	}
	return simulateNetwork(Array.from(byEmail.values()));
}

export async function getPlatformStats(): Promise<PlatformStats> {
	const totalPotValue = mockStore.cycles.reduce(
		(sum, cycle) => sum + cycle.potTotal,
		0,
	);
	return simulateNetwork({
		totalTontines: mockStore.tontines.length,
		totalUsers: (await listAllUsers()).length,
		totalPotValue,
	});
}

/**
 * TODO(api): replace with a real staff/role check once the user model
 * exposes a platform-level role (the Better Auth session has no such field
 * yet).
 *
 * `overrideIsStaff` is a dev-only escape hatch (wired to a `?staff=` search
 * param) for manually exercising both branches of the `_platformStaff` guard
 * without real multi-user auth.
 */
export async function getPlatformStaffStatusStub(options?: {
	overrideIsStaff?: boolean;
}): Promise<PlatformStaffStatus> {
	return { isStaff: options?.overrideIsStaff ?? true };
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
