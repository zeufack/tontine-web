import { z } from "zod";
import { apiFetch } from "./api-fetch";

// The backend's User entity has `password` on it, but the column is
// declared `select: false` — TypeORM's default find/findOne queries (which
// back GET/PATCH /users/:id) never return it. Parsing through this schema
// (rather than trusting the response type) means an accidental future leak
// gets silently stripped here instead of reaching the frontend.
export const backendUserProfileSchema = z.object({
	id: z.string(),
	email: z.string().email(),
	firstName: z.string().nullable(),
	lastName: z.string().nullable(),
	phoneNumber: z.string().nullable(),
});
export type BackendUserProfile = z.infer<typeof backendUserProfileSchema>;

export async function fetchUser(
	accessToken: string,
	id: string,
): Promise<BackendUserProfile> {
	const raw = await apiFetch(`/users/${id}`, accessToken);
	return backendUserProfileSchema.parse(raw);
}

export async function updateUser(
	accessToken: string,
	id: string,
	patch: Partial<
		Pick<BackendUserProfile, "firstName" | "lastName" | "phoneNumber">
	>,
): Promise<BackendUserProfile> {
	const raw = await apiFetch(`/users/${id}`, accessToken, {
		method: "PATCH",
		body: JSON.stringify(patch),
	});
	return backendUserProfileSchema.parse(raw);
}

export async function deleteUser(
	accessToken: string,
	id: string,
): Promise<void> {
	await apiFetch(`/users/${id}`, accessToken, { method: "DELETE" });
}
