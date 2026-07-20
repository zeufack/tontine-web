import { createLazyFileRoute, Link, Outlet } from "@tanstack/react-router";

export const Route = createLazyFileRoute("/_authenticated/_platformStaff")({
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
