import { apiFetch } from "./api-fetch";

export interface AdminUserSummary {
	id: string;
	email: string;
	firstName: string | null;
	lastName: string | null;
	tontineCount: number;
}

export interface AdminUsersPage {
	data: AdminUserSummary[];
	total: number;
}

/**
 * Platform-staff-only: paginated, name/email-searchable listing of every
 * user on the platform. Requires the caller's session to hold the
 * `platform:users:view` permission — enforced server-side by
 * PlatformPermissionsGuard, not by this client.
 */
export async function fetchAdminUsers(
	accessToken: string,
	params?: { search?: string; page?: number; limit?: number },
): Promise<AdminUsersPage> {
	const url = new URLSearchParams();
	if (params?.search) url.set("search", params.search);
	if (params?.page) url.set("page", String(params.page));
	if (params?.limit) url.set("limit", String(params.limit));
	const query = url.toString();

	return apiFetch(`/admin/users${query ? `?${query}` : ""}`, accessToken);
}

export interface AdminTontineTypeSummary {
	name: string;
}

export interface AdminTontineSummary {
	id: string;
	name: string;
	memberCount: number;
	potTotal: number;
	tontineType: AdminTontineTypeSummary;
}

export interface AdminTontinesPage {
	data: AdminTontineSummary[];
	total: number;
}

/**
 * Platform-staff-only: paginated, name-searchable listing of every tontine
 * on the platform, each annotated with memberCount and potTotal. Requires
 * the caller's session to hold the `platform:tontines:view` permission —
 * enforced server-side by PlatformPermissionsGuard, not by this client.
 */
export async function fetchAdminTontines(
	accessToken: string,
	params?: { search?: string; page?: number; limit?: number },
): Promise<AdminTontinesPage> {
	const url = new URLSearchParams();
	if (params?.search) url.set("search", params.search);
	if (params?.page) url.set("page", String(params.page));
	if (params?.limit) url.set("limit", String(params.limit));
	const query = url.toString();

	return apiFetch(`/admin/tontines${query ? `?${query}` : ""}`, accessToken);
}

export interface AdminStats {
	totalTontines: number;
	totalUsers: number;
	totalPotValue: number;
}

/**
 * Platform-staff-only: platform-wide aggregate stats (total tontines, total
 * users, total pot value) for the Back Office Overview screen. Requires the
 * caller's session to hold the `platform:stats:view` permission — enforced
 * server-side by PlatformPermissionsGuard, not by this client.
 */
export async function fetchAdminStats(
	accessToken: string,
): Promise<AdminStats> {
	return apiFetch("/admin/stats", accessToken);
}
