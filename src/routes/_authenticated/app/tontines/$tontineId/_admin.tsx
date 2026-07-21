import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/_admin",
)({
	beforeLoad: ({ context, params }) => {
		if (!context.membership.isAdmin) {
			throw redirect({
				to: "/app/tontines/$tontineId/overview",
				params: { tontineId: params.tontineId },
				search: { unauthorized: true },
			});
		}
	},
	component: () => <Outlet />,
});
