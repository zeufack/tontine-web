import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/_authenticated/app/home")({
	validateSearch: (search: Record<string, unknown>) => ({
		unauthorized: search.unauthorized === true,
	}),
	component: DashboardPage,
});

function DashboardPage() {
	const { unauthorized } = Route.useSearch();
	const navigate = useNavigate();

	useEffect(() => {
		if (unauthorized) {
			toast.error("You don't have access to that section.");
			void navigate({
				to: "/app/home",
				search: { unauthorized: undefined },
				replace: true,
			});
		}
	}, [unauthorized, navigate]);

	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold">Dashboard</h1>
			<p className="mt-2 text-muted-foreground">
				List of your tontines placeholder — real data comes with the tontine API
				client.
			</p>
		</div>
	);
}
