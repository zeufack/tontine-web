import { queryOptions } from "@tanstack/react-query";
import { simulateNetwork } from "#/lib/mock-data/delay";
import type { UserProfile } from "#/lib/mock-data/schemas";
import {
	CURRENT_USER_ID,
	mockStore,
	updateProfile as updateProfileInStore,
} from "#/lib/mock-data/store";

export async function getUserProfile(): Promise<UserProfile> {
	const profile = mockStore.profiles[CURRENT_USER_ID];
	if (!profile) throw new Error("Current user profile not found in mock store");
	return simulateNetwork(profile);
}

export async function updateProfile(
	patch: Partial<UserProfile>,
): Promise<UserProfile> {
	return simulateNetwork(updateProfileInStore(CURRENT_USER_ID, patch));
}

export const profileQueries = {
	mine: () =>
		queryOptions({
			queryKey: ["user", "profile"] as const,
			queryFn: getUserProfile,
		}),
};
