import { useRouteContext } from "@tanstack/react-router";
import type { TontinePermission } from "./permissions";

export function useTontineRole() {
	const { membership } = useRouteContext({
		from: "/_authenticated/app/tontines/$tontineId",
	});
	return {
		role: membership.role,
		isAdmin: membership.isAdmin,
		has: (permission: TontinePermission) =>
			membership.permissions.includes(permission),
	};
}
