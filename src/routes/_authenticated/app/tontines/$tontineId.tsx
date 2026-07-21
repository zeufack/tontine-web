import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { getTontineMembership } from "#/features/tontines/api";

export const Route = createFileRoute("/_authenticated/app/tontines/$tontineId")(
	{
		beforeLoad: async ({ params }) => ({
			membership: await getTontineMembership(params.tontineId),
		}),
		component: TontineShell,
	},
);

function TontineShell() {
	const { tontineId } = Route.useParams();
	const { membership } = Route.useRouteContext();

	return (
		<div className="p-8">
			<nav className="flex gap-4 border-b pb-4 text-sm font-medium">
				<Link
					to="/app/tontines/$tontineId/overview"
					params={{ tontineId }}
					search={{ unauthorized: false }}
				>
					Overview
				</Link>
				<Link to="/app/tontines/$tontineId/members" params={{ tontineId }}>
					Members
				</Link>
				<Link
					to="/app/tontines/$tontineId/contributions"
					params={{ tontineId }}
				>
					Contributions
				</Link>
				<Link to="/app/tontines/$tontineId/cycles" params={{ tontineId }}>
					Cycles
				</Link>
				{membership.isAdmin && (
					<>
						<Link
							to="/app/tontines/$tontineId/validation"
							params={{ tontineId }}
						>
							Validation
						</Link>
						<Link to="/app/tontines/$tontineId/settings" params={{ tontineId }}>
							Settings
						</Link>
					</>
				)}
			</nav>
			<div className="mt-4">
				<Outlet />
			</div>
		</div>
	);
}
