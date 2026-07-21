import { apiFetch } from "./api-fetch";

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

export async function backendLogin(input: {
	email: string;
	password: string;
}): Promise<BackendLoginResult> {
	return apiFetch("/auth/login", undefined, {
		method: "POST",
		body: JSON.stringify(input),
	});
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
	return apiFetch("/auth/register", undefined, {
		method: "POST",
		body: JSON.stringify(input),
	});
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
	return apiFetch("/auth/me/platform-staff", accessToken);
}
