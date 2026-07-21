import { queryOptions } from "@tanstack/react-query";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { deleteUser, fetchUser, updateUser } from "#/lib/backend-client/users";
import { readSessionCookie } from "#/lib/session-cookie";

export interface UserProfile {
	id: string;
	firstName: string;
	lastName: string;
	email: string;
	phoneNumber: string;
}

const fetchProfileFromBackend = createServerFn({ method: "GET" }).handler(
	async () => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		return fetchUser(session.accessToken, session.user.id);
	},
);

export async function getUserProfile(): Promise<UserProfile> {
	const user = await fetchProfileFromBackend();
	return {
		id: user.id,
		firstName: user.firstName ?? "",
		lastName: user.lastName ?? "",
		email: user.email,
		phoneNumber: user.phoneNumber ?? "",
	};
}

const updateProfileSchema = z.object({
	firstName: z.string().min(1).optional(),
	lastName: z.string().min(1).optional(),
	phoneNumber: z.string().optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

const updateProfileOnBackend = createServerFn({ method: "POST" })
	.validator(updateProfileSchema)
	.handler(async ({ data }) => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		return updateUser(session.accessToken, session.user.id, data);
	});

export async function updateProfile(
	patch: UpdateProfileInput,
): Promise<UserProfile> {
	const user = await updateProfileOnBackend({ data: patch });
	return {
		id: user.id,
		firstName: user.firstName ?? "",
		lastName: user.lastName ?? "",
		email: user.email,
		phoneNumber: user.phoneNumber ?? "",
	};
}

const deleteAccountOnBackend = createServerFn({ method: "POST" }).handler(
	async () => {
		const session = readSessionCookie();
		if (!session) throw new Error("Not authenticated");
		await deleteUser(session.accessToken, session.user.id);
	},
);

export async function deleteAccount(): Promise<void> {
	await deleteAccountOnBackend();
}

export const profileQueries = {
	mine: () =>
		queryOptions({
			queryKey: ["user", "profile"] as const,
			queryFn: getUserProfile,
		}),
};
