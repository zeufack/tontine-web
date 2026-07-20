export interface BackendUser {
	id: string;
	email: string;
	firstName: string;
	lastName: string;
}

export interface BackendLoginResult {
	accessToken: string;
	refreshToken: string;
	user: BackendUser;
}

function getBackendUrl(): string {
	const url = process.env.BACKEND_URL;
	if (!url) {
		throw new Error(
			"BACKEND_URL is not configured — set it in .env.local to the tontine_backend API's base URL.",
		);
	}
	return url;
}

async function parseErrorMessage(response: Response): Promise<string> {
	try {
		const body = (await response.json()) as { message?: string | string[] };
		if (Array.isArray(body.message)) return body.message.join(", ");
		if (body.message) return body.message;
	} catch {
		// response body wasn't JSON — fall through to the generic message below
	}
	return `Request failed with status ${response.status}`;
}

export async function backendLogin(input: {
	email: string;
	password: string;
}): Promise<BackendLoginResult> {
	const response = await fetch(`${getBackendUrl()}/auth/login`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}
	return response.json();
}

export interface PlatformStaffStatus {
	isStaff: boolean;
}

/**
 * Self-check: does the authenticated caller (identified by their own
 * session access token) hold platform-staff access? Not gated by any
 * special permission — any authenticated user may ask this about
 * themselves; it's how the Back Office's frontend guard decides whether to
 * grant or redirect.
 */
export async function checkPlatformStaffStatus(
	accessToken: string,
): Promise<PlatformStaffStatus> {
	const response = await fetch(`${getBackendUrl()}/auth/me/platform-staff`, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}
	return response.json();
}

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
	const url = new URL(`${getBackendUrl()}/admin/users`);
	if (params?.search) url.searchParams.set("search", params.search);
	if (params?.page) url.searchParams.set("page", String(params.page));
	if (params?.limit) url.searchParams.set("limit", String(params.limit));

	const response = await fetch(url, {
		headers: { Authorization: `Bearer ${accessToken}` },
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}
	return response.json();
}

/**
 * The backend's `POST /auth/register` returns the created `User` entity, not
 * a session — there is no accessToken/refreshToken in this response. Callers
 * that want a working session must follow up with `backendLogin` using the
 * same credentials (see `registerAction` in `session-actions.ts`).
 */
export async function backendRegister(input: {
	email: string;
	password: string;
	firstName: string;
	lastName: string;
	phoneNumber?: string;
}): Promise<BackendUser> {
	const response = await fetch(`${getBackendUrl()}/auth/register`, {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify(input),
	});
	if (!response.ok) {
		throw new Error(await parseErrorMessage(response));
	}
	return response.json();
}
