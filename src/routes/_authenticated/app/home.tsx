import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { TontineStatusBadge } from "#/components/tontine/tontine-status-badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardFooter,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { EmptyState } from "#/components/ui/empty-state.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { tontineQueries } from "#/features/tontines/api";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app/home")({
	validateSearch: (search: Record<string, unknown>) => ({
		unauthorized: search.unauthorized === true,
	}),
	component: DashboardPage,
});

function DashboardPage() {
	const { unauthorized } = Route.useSearch();
	const navigate = useNavigate();
	const { data: tontines, isPending } = useQuery(tontineQueries.mine());

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
			<h1 className="text-2xl font-bold">{m.dashboard_title()}</h1>

			{isPending && (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
					<Skeleton className="h-40" />
				</div>
			)}

			{!isPending && tontines && tontines.length === 0 && (
				<EmptyState
					className="mt-6"
					icon={Wallet}
					title={m.dashboard_empty_title()}
					description={m.dashboard_empty_description()}
					action={
						<Button asChild size="sm">
							<Link to="/app/tontines/new">{m.dashboard_empty_cta()}</Link>
						</Button>
					}
				/>
			)}

			{!isPending && tontines && tontines.length > 0 && (
				<div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
					{tontines.map((tontine) => (
						<Card key={tontine.id}>
							<CardHeader>
								<div className="flex items-center justify-between gap-2">
									<CardTitle>{tontine.name}</CardTitle>
									<TontineStatusBadge status={tontine.status} />
								</div>
							</CardHeader>
							<CardContent>
								<p className="text-sm text-muted-foreground">
									{m.dashboard_participant_count({
										count: tontine.participantCount,
									})}
								</p>
							</CardContent>
							<CardFooter>
								<Button asChild size="sm">
									<Link
										to="/app/tontines/$tontineId/overview"
										params={{ tontineId: tontine.id }}
									>
										{m.dashboard_view_details_cta()}
									</Link>
								</Button>
							</CardFooter>
						</Card>
					))}
				</div>
			)}
		</div>
	);
}
