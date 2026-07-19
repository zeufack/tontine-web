import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { Wallet } from "lucide-react";
import { useEffect } from "react";
import { toast } from "sonner";

import { RoleBadge } from "#/components/tontine/role-badge.tsx";
import { TontineStatusBadge } from "#/components/tontine/tontine-status-badge.tsx";
import { Amount } from "#/components/ui/amount.tsx";
import { Badge } from "#/components/ui/badge.tsx";
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
import {
	type MyContributionStatus,
	tontineQueries,
} from "#/features/tontines/api";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app/home")({
	validateSearch: (search: Record<string, unknown>) => ({
		unauthorized: search.unauthorized === true,
	}),
	component: DashboardPage,
});

const CONTRIBUTION_BADGE: Record<
	MyContributionStatus,
	{ variant: "success" | "warning" | "destructive"; label: () => string }
> = {
	paid: { variant: "success", label: m.dashboard_contribution_paid },
	pending: { variant: "warning", label: m.dashboard_contribution_pending },
	overdue: { variant: "destructive", label: m.dashboard_contribution_overdue },
};

// Overdue first, since that's the #1 thing a member checks on login.
const CONTRIBUTION_SORT_WEIGHT: Record<MyContributionStatus, number> = {
	overdue: 0,
	pending: 1,
	paid: 2,
};

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
					{[...tontines]
						.sort(
							(a, b) =>
								CONTRIBUTION_SORT_WEIGHT[a.myContributionStatus] -
								CONTRIBUTION_SORT_WEIGHT[b.myContributionStatus],
						)
						.map(
							({
								tontine,
								membership,
								potTotal,
								nextBeneficiaryName,
								myContributionStatus,
							}) => {
								const contributionBadge =
									CONTRIBUTION_BADGE[myContributionStatus];
								return (
									<Card key={tontine.id}>
										<CardHeader>
											<div className="flex items-center justify-between gap-2">
												<CardTitle>{tontine.name}</CardTitle>
												<RoleBadge role={membership.role} />
											</div>
											<div className="flex items-center gap-2">
												<TontineStatusBadge status={tontine.status} />
												<Badge variant={contributionBadge.variant}>
													{contributionBadge.label()}
												</Badge>
											</div>
										</CardHeader>
										<CardContent className="flex flex-col gap-1">
											<Amount value={potTotal} currency={tontine.currency} />
											<p className="text-sm text-muted-foreground">
												{nextBeneficiaryName
													? m.dashboard_next_payout_label({
															name: nextBeneficiaryName,
														})
													: m.dashboard_next_payout_unknown()}
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
								);
							},
						)}
				</div>
			)}
		</div>
	);
}
