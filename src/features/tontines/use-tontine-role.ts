import { useRouteContext } from "@tanstack/react-router";

export function useTontineRole() {
	const { membership } = useRouteContext({
		from: "/_authenticated/app/tontines/$tontineId",
	});
	return { role: membership.role, isAdmin: membership.role === "admin" };
}
