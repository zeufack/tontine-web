import { createServerFn } from "@tanstack/react-start";
import { readSessionCookie } from "#/lib/session-cookie";

export const getCurrentSession = createServerFn({ method: "GET" }).handler(
	async () => {
		return readSessionCookie();
	},
);
