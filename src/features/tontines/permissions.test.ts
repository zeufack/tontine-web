import { describe, expect, it } from "vitest";
import { resolveTontinePermissions, TONTINE_PERMISSIONS } from "./permissions";

const ALL_PERMISSIONS = Object.values(TONTINE_PERMISSIONS);

describe("resolveTontinePermissions", () => {
	it("grants the full permission set to the creator", () => {
		const result = resolveTontinePermissions({
			currentUserId: "user-1",
			creatorId: "user-1",
			isActiveParticipant: false,
			isPublic: false,
		});
		expect(result.role).toBe("creator");
		expect(result.permissions.sort()).toEqual([...ALL_PERMISSIONS].sort());
	});

	it("grants the participant bundle (view + auction) to an active participant", () => {
		const result = resolveTontinePermissions({
			currentUserId: "user-2",
			creatorId: "user-1",
			isActiveParticipant: true,
			isPublic: false,
		});
		expect(result.role).toBe("participant");
		expect(result.permissions.sort()).toEqual(
			[
				TONTINE_PERMISSIONS.TONTINE_VIEW,
				TONTINE_PERMISSIONS.AUCTION_PARTICIPATE,
			].sort(),
		);
	});

	it("grants read-only view to a non-member of a public tontine", () => {
		const result = resolveTontinePermissions({
			currentUserId: "user-3",
			creatorId: "user-1",
			isActiveParticipant: false,
			isPublic: true,
		});
		expect(result.role).toBe("public-viewer");
		expect(result.permissions).toEqual([TONTINE_PERMISSIONS.TONTINE_VIEW]);
	});

	it("grants nothing to a non-member of a private tontine (no membership)", () => {
		const result = resolveTontinePermissions({
			currentUserId: "user-3",
			creatorId: "user-1",
			isActiveParticipant: false,
			isPublic: false,
		});
		expect(result.role).toBe("none");
		expect(result.permissions).toEqual([]);
	});

	it("grants nothing when not authenticated, even for a public tontine", () => {
		const result = resolveTontinePermissions({
			currentUserId: null,
			creatorId: "user-1",
			isActiveParticipant: false,
			isPublic: true,
		});
		expect(result.role).toBe("none");
		expect(result.permissions).toEqual([]);
	});

	// admin/super_admin/treasurer/moderator/observer: the backend has no
	// endpoint exposing TontineAdministrator role assignments (zeufack/
	// totine#17), so a real holder of one of those roles is indistinguishable
	// from a plain participant (or non-member) here — proving the fail-closed
	// behavior explicitly, not a stand-in for those bundles being correct.
	it("cannot distinguish an admin-tier TontineAdministrator from a plain participant (documented gap)", () => {
		const result = resolveTontinePermissions({
			currentUserId: "user-4",
			creatorId: "user-1",
			isActiveParticipant: true,
			isPublic: false,
		});
		expect(result.role).toBe("participant");
		expect(result.permissions).not.toContain(TONTINE_PERMISSIONS.MEMBER_MANAGE);
	});

	it("cannot distinguish an admin-tier TontineAdministrator with no participant row from a non-member (documented gap)", () => {
		const result = resolveTontinePermissions({
			currentUserId: "user-4",
			creatorId: "user-1",
			isActiveParticipant: false,
			isPublic: false,
		});
		expect(result.role).toBe("none");
		expect(result.permissions).toEqual([]);
	});
});
