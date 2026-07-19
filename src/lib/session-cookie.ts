import {
	deleteCookie,
	getCookie,
	setCookie,
} from "@tanstack/react-start/server";
import type { BackendUser } from "#/lib/backend-client";

const SESSION_COOKIE_NAME = "tontine_session";

export interface StoredSession {
	accessToken: string;
	refreshToken: string;
	user: BackendUser;
}

export function readSessionCookie(): StoredSession | null {
	const raw = getCookie(SESSION_COOKIE_NAME);
	if (!raw) return null;
	try {
		return JSON.parse(raw) as StoredSession;
	} catch {
		return null;
	}
}

export function writeSessionCookie(session: StoredSession): void {
	setCookie(SESSION_COOKIE_NAME, JSON.stringify(session), {
		httpOnly: true,
		secure: process.env.NODE_ENV === "production",
		sameSite: "lax",
		path: "/",
		// No refresh endpoint exists on the backend yet (see DESIGN.md §11), so
		// this is a soft cap unrelated to the access token's real expiry — the
		// backend will reject an expired token on its own regardless.
		maxAge: 60 * 60 * 24 * 7,
	});
}

export function clearSessionCookie(): void {
	deleteCookie(SESSION_COOKIE_NAME, { path: "/" });
}
