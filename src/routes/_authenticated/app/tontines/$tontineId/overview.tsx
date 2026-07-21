import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { TontineStatusBadge } from "#/components/tontine/tontine-status-badge.tsx";
import { Amount } from "#/components/ui/amount.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { activateTontine, tontineQueries } from "#/features/tontines/api";
import { m } from "#/paraglide/messages";

const MINIMUM_PARTICIPANTS_TO_ACTIVATE = 2;

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
	const queryClient = useQueryClient();

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

	const { data: tontine } = useQuery(tontineQueries.detail(tontineId));
	const { data: statistics } = useQuery(tontineQueries.statistics(tontineId));

	const activateMutation = useMutation({
		mutationFn: () => activateTontine(tontineId),
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({ queryKey: ["tontine", tontineId] }),
				queryClient.invalidateQueries({ queryKey: ["tontines", "mine"] }),
			]);
			toast.success(m.overview_activate_success());
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.overview_activate_error(),
			);
		},
	});

	if (!tontine || !statistics) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Skeleton className="h-28" />
				<Skeleton className="h-28" />
				<Skeleton className="h-28" />
				<Skeleton className="h-28" />
			</div>
		);
	}

	const canActivate =
		tontine.status === "draft" &&
		tontine.participantCount >= MINIMUM_PARTICIPANTS_TO_ACTIVATE;

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between gap-4">
				<div className="flex items-center gap-3">
					<h2 className="text-xl font-semibold">{m.overview_title()}</h2>
					<TontineStatusBadge status={tontine.status} />
				</div>
				{tontine.status === "draft" && (
					<div className="flex flex-col items-end gap-1">
						<Button
							size="sm"
							disabled={!canActivate || activateMutation.isPending}
							onClick={() => activateMutation.mutate()}
						>
							{m.overview_activate_cta()}
						</Button>
						{!canActivate && (
							<span className="text-xs text-muted-foreground">
								{m.overview_activate_requires_participants({
									count: MINIMUM_PARTICIPANTS_TO_ACTIVATE,
								})}
							</span>
						)}
					</div>
				)}
			</div>

			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.overview_stats_participants_label()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-semibold">
							{statistics.totalParticipants}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.overview_stats_total_contributed_label()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Amount
							value={statistics.totalContributed}
							currency={tontine.currency}
							className="text-2xl"
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.overview_stats_active_contributions_label()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-semibold">
							{statistics.activeContributions}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.overview_stats_pending_contributions_label()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-semibold">
							{statistics.pendingContributions}
						</p>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
