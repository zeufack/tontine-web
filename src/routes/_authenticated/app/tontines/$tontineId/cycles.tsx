import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { StrategyExplainer } from "#/components/tontine/strategy-explainer.tsx";
import { Amount } from "#/components/ui/amount.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { cycleQueries, submitBid } from "#/features/cycles/api";
import { memberQueries } from "#/features/members/api";
import { tontineQueries } from "#/features/tontines/api";
import type { Cycle } from "#/lib/mock-data/schemas";
import { CURRENT_USER_ID } from "#/lib/mock-data/store";
import { cn } from "#/lib/utils.ts";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/cycles",
)({
	component: CyclesPage,
});

const bidFormSchema = z.object({
	amount: z.coerce.number().positive(m.validation_required()),
});
type BidFormValues = z.infer<typeof bidFormSchema>;

function formatTimeRemaining(deadlineIso: string): string {
	const diffMs = new Date(deadlineIso).getTime() - Date.now();
	if (diffMs <= 0) return m.bidding_time_expired();
	const totalMinutes = Math.floor(diffMs / 60_000);
	const hours = Math.floor(totalMinutes / 60);
	const minutes = totalMinutes % 60;
	return `${hours}h ${minutes}min`;
}

type RotatingState = Extract<Cycle["strategyState"], { kind: "rotating" }>;
type LotteryState = Extract<Cycle["strategyState"], { kind: "lottery" }>;
type BiddingState = Extract<Cycle["strategyState"], { kind: "bidding" }>;

function RotatingCycleView({ state }: { state: RotatingState }) {
	return (
		<Card>
			<CardHeader>
				<CardTitle>{m.rotating_order_title()}</CardTitle>
			</CardHeader>
			<CardContent>
				<ol className="flex flex-col gap-2">
					{state.order.map((entry) => {
						const isCurrent =
							entry.memberId === state.currentBeneficiaryMemberId;
						return (
							<li
								key={entry.memberId}
								className={cn(
									"flex items-center justify-between rounded-lg border px-3 py-2",
									isCurrent && "border-primary bg-primary/5",
								)}
							>
								<span>{entry.name}</span>
								{isCurrent && <Badge>{m.rotating_current_badge()}</Badge>}
							</li>
						);
					})}
				</ol>
			</CardContent>
		</Card>
	);
}

function LotteryCycleView({
	state,
	memberName,
}: {
	state: LotteryState;
	memberName: (memberId: string) => string;
}) {
	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>{m.lottery_eligibility_title()}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					<p className="text-sm text-muted-foreground">
						{state.drawDate
							? m.lottery_draw_date_label({
									date: new Date(state.drawDate).toLocaleDateString(),
								})
							: m.lottery_draw_date_unknown()}
					</p>
					<div className="flex flex-wrap gap-2">
						{state.eligibleMemberIds.map((memberId) => (
							<Badge key={memberId} variant="outline">
								{memberName(memberId)}
							</Badge>
						))}
					</div>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-muted-foreground">
					{m.lottery_past_draws_title()}
				</h3>
				{state.pastDraws.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{m.lottery_past_draws_empty()}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{m.lottery_table_cycle()}</TableHead>
								<TableHead>{m.lottery_table_winner()}</TableHead>
								<TableHead>{m.lottery_table_date()}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{state.pastDraws.map((draw) => (
								<TableRow key={`${draw.cycleNumber}-${draw.winnerMemberId}`}>
									<TableCell>{draw.cycleNumber}</TableCell>
									<TableCell>{memberName(draw.winnerMemberId)}</TableCell>
									<TableCell>
										{new Date(draw.drawnAt).toLocaleDateString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}

function BiddingCycleView({
	cycle,
	state,
	currency,
	memberName,
	onSubmitBid,
	isSubmitting,
}: {
	cycle: Cycle;
	state: BiddingState;
	currency: string;
	memberName: (memberId: string) => string;
	onSubmitBid: (amount: number) => void;
	isSubmitting: boolean;
}) {
	const form = useForm<BidFormValues>({
		resolver: zodResolver(bidFormSchema),
		defaultValues: { amount: 0 },
	});

	const discountPercent =
		cycle.potTotal > 0 && state.currentHighestBid !== null
			? Math.round((state.currentHighestBid / cycle.potTotal) * 100)
			: null;

	function onSubmit(values: BidFormValues) {
		onSubmitBid(values.amount);
		form.reset();
	}

	return (
		<div className="flex flex-col gap-6">
			<Card>
				<CardHeader>
					<CardTitle>{m.bidding_current_bid_title()}</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-col gap-1">
					{state.currentHighestBid !== null ? (
						<>
							<Amount
								value={state.currentHighestBid}
								currency={currency}
								className="text-2xl"
							/>
							<p className="text-sm text-muted-foreground">
								{m.overview_highest_bidder_label({
									name: memberName(state.currentHighestBidderMemberId ?? ""),
								})}
							</p>
							{discountPercent !== null && (
								<p className="text-sm text-muted-foreground">
									{m.bidding_discount_label({ percent: discountPercent })}
								</p>
							)}
						</>
					) : (
						<p className="text-sm text-muted-foreground">
							{m.bidding_no_bids_label()}
						</p>
					)}
					<p className="text-sm font-medium">
						{m.bidding_time_remaining_label({
							time: formatTimeRemaining(state.deadline),
						})}
					</p>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{m.bidding_bid_form_title()}</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex items-end gap-3"
						>
							<FormField
								control={form.control}
								name="amount"
								render={({ field }) => (
									<FormItem className="flex-1">
										<FormLabel>{m.bidding_bid_amount_label()}</FormLabel>
										<FormControl>
											<Input type="number" min="0" {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<Button type="submit" disabled={isSubmitting}>
								{m.bidding_submit_cta()}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>

			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-muted-foreground">
					{m.bidding_history_title()}
				</h3>
				{state.history.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{m.bidding_history_empty()}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{m.bidding_table_member()}</TableHead>
								<TableHead>{m.bidding_table_amount()}</TableHead>
								<TableHead>{m.bidding_table_date()}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{[...state.history].reverse().map((bid) => (
								<TableRow key={`${bid.memberId}-${bid.submittedAt}`}>
									<TableCell>{memberName(bid.memberId)}</TableCell>
									<TableCell>
										<Amount value={bid.amount} currency={currency} />
									</TableCell>
									<TableCell>
										{new Date(bid.submittedAt).toLocaleString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}

function CyclesPage() {
	const { tontineId } = Route.useParams();
	const queryClient = useQueryClient();

	const { data: tontine } = useQuery(tontineQueries.detail(tontineId));
	const { data: cycle } = useQuery(
		cycleQueries.current(tontineId, tontine?.payoutStrategy),
	);
	const { data: cycleHistory } = useQuery(cycleQueries.history(tontineId));
	const { data: members } = useQuery(memberQueries.list(tontineId));

	function memberName(memberId: string): string {
		return members?.find((member) => member.id === memberId)?.name ?? memberId;
	}

	const bidMutation = useMutation({
		mutationFn: (amount: number) => {
			if (!cycle) throw new Error("No active cycle to bid on");
			return submitBid(cycle.id, CURRENT_USER_ID, amount);
		},
		onSuccess: async () => {
			await Promise.all([
				queryClient.invalidateQueries({
					queryKey: ["tontine", tontineId, "cycle"],
				}),
				queryClient.invalidateQueries({ queryKey: ["tontines", "mine"] }),
			]);
		},
	});

	if (!tontine || !cycle) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-24" />
				<Skeleton className="h-48" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">{m.cycles_title()}</h2>
				<StrategyExplainer strategy={tontine.payoutStrategy} />
			</div>

			{cycle.strategyState.kind === "rotating" && (
				<RotatingCycleView state={cycle.strategyState} />
			)}
			{cycle.strategyState.kind === "lottery" && (
				<LotteryCycleView state={cycle.strategyState} memberName={memberName} />
			)}
			{cycle.strategyState.kind === "bidding" && (
				<BiddingCycleView
					cycle={cycle}
					state={cycle.strategyState}
					currency={tontine.currency}
					memberName={memberName}
					onSubmitBid={(amount) => bidMutation.mutate(amount)}
					isSubmitting={bidMutation.isPending}
				/>
			)}

			<div className="flex flex-col gap-3 border-t pt-6">
				<h3 className="text-sm font-semibold text-muted-foreground">
					{m.cycles_history_title()}
				</h3>
				{!cycleHistory || cycleHistory.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{m.cycles_history_empty()}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{m.cycles_table_number()}</TableHead>
								<TableHead>{m.cycles_table_pot()}</TableHead>
								<TableHead>{m.cycles_table_status()}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cycleHistory.map((historyCycle) => (
								<TableRow key={historyCycle.id}>
									<TableCell>{historyCycle.number}</TableCell>
									<TableCell>
										<Amount
											value={historyCycle.potTotal}
											currency={tontine.currency}
										/>
									</TableCell>
									<TableCell>
										<Badge
											variant={
												historyCycle.status === "active" ? "success" : "outline"
											}
										>
											{historyCycle.status === "active"
												? m.cycle_status_active()
												: m.cycle_status_closed()}
										</Badge>
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>
		</div>
	);
}
