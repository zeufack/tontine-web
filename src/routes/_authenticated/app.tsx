import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { ChevronDownIcon } from "lucide-react";
import { RoleBadge } from "#/components/tontine/role-badge.tsx";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "#/components/ui/dropdown-menu.tsx";
import { tontineQueries } from "#/features/tontines/api";
import SessionHeader from "#/integrations/session/header-user";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app")({
	component: UserAppShell,
});

function UserAppShell() {
	return (
		<div className="min-h-screen">
			<header className="flex items-center justify-between border-b px-6 py-4">
				<div className="flex items-center gap-6">
					<nav className="flex gap-4 text-sm font-medium">
						<Link to="/app/home">{m.nav_dashboard_link()}</Link>
						<Link to="/app/profile">{m.nav_profile_link()}</Link>
					</nav>
					<TontineSwitcher />
				</div>
				<SessionHeader />
			</header>
			<main>
				<Outlet />
			</main>
		</div>
	);
}

function TontineSwitcher() {
	const { data: tontines } = useQuery(tontineQueries.mine());

	if (!tontines || tontines.length === 0) return null;

	return (
		<DropdownMenu>
			<DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-muted-foreground hover:text-foreground">
				{m.tontine_switcher_label()}
				<ChevronDownIcon className="size-4" />
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start">
				<DropdownMenuLabel>{m.tontine_switcher_label()}</DropdownMenuLabel>
				<DropdownMenuSeparator />
				{tontines.map(({ tontine, membership }) => (
					<DropdownMenuItem key={tontine.id} asChild>
						<Link
							to="/app/tontines/$tontineId/overview"
							params={{ tontineId: tontine.id }}
							className="flex items-center justify-between gap-3"
						>
							<span>{tontine.name}</span>
							<RoleBadge role={membership.role} />
						</Link>
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
