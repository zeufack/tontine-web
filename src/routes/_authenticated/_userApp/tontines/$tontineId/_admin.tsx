import { createFileRoute, Outlet, redirect } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/_userApp/tontines/$tontineId/_admin",
)({
	beforeLoad: ({ context, params }) => {
		if (context.membership.role !== "admin") {
			throw redirect({
				to: "/tontines/$tontineId/overview",
				params: { tontineId: params.tontineId },
				search: { unauthorized: true },
			});
		}
	},
	component: () => <Outlet />,
});
