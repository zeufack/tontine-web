import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { backendLogin, backendRegister } from "#/lib/backend-client";
import { clearSessionCookie, writeSessionCookie } from "#/lib/session-cookie";

const loginSchema = z.object({
	email: z.string().email(),
	password: z.string().min(1),
});

export const loginAction = createServerFn({ method: "POST" })
	.validator(loginSchema)
	.handler(async ({ data }) => {
		const result = await backendLogin(data);
		writeSessionCookie(result);
		return result.user;
	});

const registerSchema = z.object({
	email: z.string().email(),
	password: z.string().min(12),
	firstName: z.string().min(1),
	lastName: z.string().min(1),
	phoneNumber: z.string().optional(),
});

export const registerAction = createServerFn({ method: "POST" })
	.validator(registerSchema)
	.handler(async ({ data }) => {
		await backendRegister(data);
		// POST /auth/register returns the created User, not a session — log in
		// immediately after with the same credentials to establish one.
		const result = await backendLogin({
			email: data.email,
			password: data.password,
		});
		writeSessionCookie(result);
		return result.user;
	});

export const logoutAction = createServerFn({ method: "POST" }).handler(
	async () => {
		clearSessionCookie();
		// TODO(api): call a real POST /auth/logout once the backend exposes one
		// (see DESIGN.md §11) — today this only clears the local cookie.
	},
);
