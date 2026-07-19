import {
	createFileRoute,
	Link,
	Outlet,
	redirect,
} from "@tanstack/react-router";
import { getPlatformStaffStatusStub } from "#/features/platform-admin/api";

export const Route = createFileRoute("/_authenticated/_platformStaff")({
	beforeLoad: async () => {
		const status = await getPlatformStaffStatusStub();
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
