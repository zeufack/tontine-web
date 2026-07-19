export interface PlatformStaffStatus {
	isStaff: boolean;
}

// TODO(api): replace with a real staff/role check once the user model
// exposes a platform-level role (the Better Auth session has no such field
// yet).
export async function getPlatformStaffStatusStub(): Promise<PlatformStaffStatus> {
	return { isStaff: true };
}
