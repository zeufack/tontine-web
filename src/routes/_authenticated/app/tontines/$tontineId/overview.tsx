import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/overview",
)({
	validateSearch: (search: Record<string, unknown>) => ({
		unauthorized: search.unauthorized === true,
	}),
	component: OverviewPage,
});

function OverviewPage() {
	const { unauthorized } = Route.useSearch();
	const { tontineId } = Route.useParams();
	const navigate = useNavigate();

	useEffect(() => {
		if (unauthorized) {
			toast.error("You don't have access to that section.");
			void navigate({
				to: "/app/tontines/$tontineId/overview",
				params: { tontineId },
				search: { unauthorized: undefined },
				replace: true,
			});
		}
	}, [unauthorized, navigate, tontineId]);

	return (
		<div>
			<h2 className="text-xl font-semibold">Overview</h2>
			<p className="mt-2 text-muted-foreground">
				Pot balance, current cycle, next turn placeholder.
			</p>
		</div>
	);
}
