import { createFileRoute, redirect } from "@tanstack/react-router";
import { getCurrentSession } from "#/lib/get-session";

export const Route = createFileRoute("/")({
	beforeLoad: async () => {
		const session = await getCurrentSession();
		throw redirect({ to: session ? "/dashboard" : "/login" });
	},
});
