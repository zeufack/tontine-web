import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import SessionHeader from "#/integrations/session/header-user";

export const Route = createFileRoute("/_authenticated/_userApp")({
	component: UserAppShell,
});

function UserAppShell() {
	return (
		<div className="min-h-screen">
			<header className="flex items-center justify-between border-b px-6 py-4">
				<nav className="flex gap-4 text-sm font-medium">
					<Link to="/dashboard">Dashboard</Link>
					<Link to="/profile">Profile</Link>
				</nav>
				<SessionHeader />
			</header>
			<main>
				<Outlet />
			</main>
		</div>
	);
}
