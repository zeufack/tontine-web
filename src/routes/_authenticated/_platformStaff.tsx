import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { getPlatformStaffStatusStub } from "#/features/platform-admin/api";

export const Route = createFileRoute("/_authenticated/_platformStaff")({
	// TanStack Router auto-coerces query values that look like booleans (e.g.
	// `?staff=false`), so both the raw string and the coerced boolean must be
	// checked here.
	validateSearch: (search: Record<string, unknown>) => ({
		staff:
			search.staff === "true" || search.staff === true
				? true
				: search.staff === "false" || search.staff === false
					? false
					: undefined,
	}),
	beforeLoad: async ({ search }) => {
		const status = await getPlatformStaffStatusStub({
			overrideIsStaff: search.staff,
		});
		if (!status.isStaff) {
			throw redirect({ to: "/dashboard", search: { unauthorized: true } });
		}
	},
	component: AdminShell,
});

function AdminShell() {
	return (
		<div className="min-h-screen">
			<header className="border-b px-6 py-4">
				<nav className="flex gap-4 text-sm font-medium">
					<Link to="/admin">Overview</Link>
					<Link to="/admin/tontines">Tontines</Link>
					<Link to="/admin/users">Users</Link>
				</nav>
			</header>
			<main>
				<Outlet />
			</main>
		</div>
	);
}
