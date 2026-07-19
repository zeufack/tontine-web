export interface TontineMembership {
	role: "admin" | "member";
}

// TODO(api): replace with a real membership fetch once the tontine API
// client exists. Shape mirrors what DESIGN.md §4 expects the real membership
// object to look like.
export async function getTontineMembershipStub(
	_tontineId: string,
): Promise<TontineMembership> {
	return { role: "admin" };
}
