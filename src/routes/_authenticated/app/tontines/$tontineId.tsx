import { createFileRoute, Link, Outlet } from "@tanstack/react-router";
import { getTontineMembershipStub } from "#/features/tontines/api";
import type { MembershipRole } from "#/lib/mock-data/schemas";

export const Route = createFileRoute("/_authenticated/app/tontines/$tontineId")(
	{
		validateSearch: (search: Record<string, unknown>) => ({
			role:
				search.role === "admin" || search.role === "member"
					? (search.role as MembershipRole)
					: undefined,
		}),
		beforeLoad: async ({ params, search }) => ({
			membership: await getTontineMembershipStub(params.tontineId, {
				overrideRole: search.role,
			}),
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
				<Link to="/app/tontines/$tontineId/overview" params={{ tontineId }}>
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
				{membership.role === "admin" && (
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
