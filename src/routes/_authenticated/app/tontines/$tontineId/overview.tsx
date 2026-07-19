import { useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect } from "react";
import { toast } from "sonner";

import { Amount } from "#/components/ui/amount.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { cycleQueries } from "#/features/cycles/api";
import { memberQueries } from "#/features/members/api";
import { tontineQueries } from "#/features/tontines/api";
import { CURRENT_USER_ID } from "#/lib/mock-data/store";
import { m } from "#/paraglide/messages";

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

	const { data: tontine } = useQuery(tontineQueries.detail(tontineId));
	const { data: cycle } = useQuery(
		cycleQueries.current(tontineId, tontine?.payoutStrategy),
	);
	const { data: members } = useQuery(memberQueries.list(tontineId));

	function memberName(memberId: string): string {
		if (memberId === CURRENT_USER_ID) return m.overview_beneficiary_you();
		return members?.find((member) => member.id === memberId)?.name ?? memberId;
	}

	if (!tontine || !cycle) {
		return (
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Skeleton className="h-28" />
				<Skeleton className="h-28" />
				<Skeleton className="h-28" />
				<Skeleton className="h-28" />
			</div>
		);
	}

	const { strategyState } = cycle;

	let beneficiaryValue: string;
	if (strategyState.kind === "rotating") {
		beneficiaryValue = memberName(strategyState.currentBeneficiaryMemberId);
	} else if (strategyState.kind === "lottery") {
		beneficiaryValue = strategyState.drawDate
			? m.overview_next_draw_label({
					date: new Date(strategyState.drawDate).toLocaleDateString(),
				})
			: m.overview_beneficiary_unknown();
	} else {
		beneficiaryValue = strategyState.currentHighestBidderMemberId
			? m.overview_highest_bidder_label({
					name: memberName(strategyState.currentHighestBidderMemberId),
				})
			: m.overview_no_bids_yet();
	}

	let nextTurnValue: string | undefined;
	if (strategyState.kind === "rotating" && strategyState.order.length > 0) {
		const currentIndex = strategyState.order.findIndex(
			(entry) => entry.memberId === strategyState.currentBeneficiaryMemberId,
		);
		const nextEntry =
			strategyState.order[(currentIndex + 1) % strategyState.order.length];
		if (nextEntry) {
			nextTurnValue = m.overview_next_in_order_label({
				name: memberName(nextEntry.memberId),
			});
		}
	}

	return (
		<div className="flex flex-col gap-4">
			<h2 className="text-xl font-semibold">{m.overview_title()}</h2>
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.overview_pot_balance_label()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Amount
							value={cycle.potTotal}
							currency={tontine.currency}
							className="text-2xl"
						/>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.overview_current_cycle_label({ number: cycle.number })}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-semibold">
							{cycle.status === "active"
								? m.cycle_status_active()
								: m.cycle_status_closed()}
						</p>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.overview_current_beneficiary_label()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-lg font-semibold">{beneficiaryValue}</p>
					</CardContent>
				</Card>

				{nextTurnValue && (
					<Card>
						<CardHeader>
							<CardTitle className="text-sm text-muted-foreground">
								{m.rotating_order_title()}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-lg font-semibold">{nextTurnValue}</p>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
