/**
 * Mirrors the backend's `Permission` enum (`src/modules/auth/rbac/
 * permission.enum.ts`) and `role-permissions.map.ts` bundle table exactly —
 * both already committed and authoritative, even though the guard/service
 * that resolves them at request time is not (see zeufack/totine#17).
 */
export const TONTINE_PERMISSIONS = {
	TONTINE_VIEW: "tontine:view",
	TONTINE_EDIT: "tontine:edit",
	TONTINE_DELETE: "tontine:delete",
	MEMBER_MANAGE: "member:manage",
	POSITION_REQUEST_APPROVE: "position_request:approve",
	CYCLE_MANAGE: "cycle:manage",
	FUNDS_DISTRIBUTE: "funds:distribute",
	REPORT_VIEW: "report:view",
	AUCTION_PARTICIPATE: "auction:participate",
} as const;
export type TontinePermission =
	(typeof TONTINE_PERMISSIONS)[keyof typeof TONTINE_PERMISSIONS];

const ALL_PERMISSIONS = Object.values(TONTINE_PERMISSIONS);

// role-permissions.map.ts's `participant` bundle, copied verbatim.
const PARTICIPANT_PERMISSIONS: TontinePermission[] = [
	TONTINE_PERMISSIONS.TONTINE_VIEW,
	TONTINE_PERMISSIONS.AUCTION_PARTICIPATE,
];

// Not a named backend role — the guard's own fallback for a public tontine
// viewed by a non-member ("read-only access for non-members").
const PUBLIC_VIEWER_PERMISSIONS: TontinePermission[] = [
	TONTINE_PERMISSIONS.TONTINE_VIEW,
];

/**
 * Only the outcomes this app can actually prove today. Deliberately excludes
 * admin/super_admin/treasurer/moderator/observer — the backend has no
 * endpoint exposing `TontineAdministrator` role assignments (zeufack/
 * totine#17), so a real holder of one of those roles resolves to
 * "participant" or "none" here, not their true bundle. Fails closed, not
 * open: never guess admin-tier access from proxy data.
 */
export type TontineRoleLabel =
	| "creator"
	| "participant"
	| "public-viewer"
	| "none";

export interface ResolvedTontinePermissions {
	role: TontineRoleLabel;
	permissions: TontinePermission[];
}

export interface ResolveTontinePermissionsInput {
	currentUserId: string | null;
	creatorId: string | null;
	isActiveParticipant: boolean;
	isPublic: boolean;
}

export function resolveTontinePermissions(
	input: ResolveTontinePermissionsInput,
): ResolvedTontinePermissions {
	if (!input.currentUserId) {
		return { role: "none", permissions: [] };
	}
	if (input.creatorId !== null && input.currentUserId === input.creatorId) {
		return { role: "creator", permissions: [...ALL_PERMISSIONS] };
	}
	if (input.isActiveParticipant) {
		return { role: "participant", permissions: [...PARTICIPANT_PERMISSIONS] };
	}
	if (input.isPublic) {
		return {
			role: "public-viewer",
			permissions: [...PUBLIC_VIEWER_PERMISSIONS],
		};
	}
	return { role: "none", permissions: [] };
}
