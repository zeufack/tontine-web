import { createServerFn } from "@tanstack/react-start";
import {
	checkPlatformStaffStatus,
	type PlatformStaffStatus,
} from "#/lib/backend-client";
import { readSessionCookie } from "#/lib/session-cookie";

/**
 * Real, backend-verified staff check — replaces the old
 * getPlatformStaffStatusStub. Fails closed: no session, or any error
 * talking to the backend, both resolve to `isStaff: false` rather than
 * risking an open gate.
 */
export const getPlatformStaffStatus = createServerFn({ method: "GET" }).handler(
	async (): Promise<PlatformStaffStatus> => {
		const session = readSessionCookie();
		if (!session) return { isStaff: false };

		try {
			return await checkPlatformStaffStatus(session.accessToken);
		} catch {
			return { isStaff: false };
		}
	},
);
