import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { CalendarClock } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { StrategyExplainer } from "#/components/tontine/strategy-explainer.tsx";
import { Amount } from "#/components/ui/amount.tsx";
import { Badge } from "#/components/ui/badge.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
import { EmptyState } from "#/components/ui/empty-state.tsx";
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
import {
	type BeneficiaryStatus,
	type Cycle,
	type CycleStatus,
	createCycle,
	cycleQueries,
	startCycle,
	type Turn,
	type TurnStatus,
} from "#/features/cycles/api";
import { tontineQueries } from "#/features/tontines/api";
import { useTontineRole } from "#/features/tontines/use-tontine-role";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/cycles",
)({
	component: CyclesPage,
});

const CYCLE_STATUS_VARIANT: Record<
	CycleStatus,
	"secondary" | "success" | "outline" | "destructive"
> = {
	pending: "secondary",
	active: "success",
	completed: "outline",
	cancelled: "destructive",
};

const CYCLE_STATUS_LABEL: Record<CycleStatus, () => string> = {
	pending: m.cycle_status_pending,
	active: m.cycle_status_active,
	completed: m.cycle_status_completed,
	cancelled: m.cycle_status_cancelled,
};

const TURN_STATUS_VARIANT: Record<
	TurnStatus,
	"secondary" | "success" | "warning" | "outline" | "destructive"
> = {
	scheduled: "secondary",
	in_progress: "warning",
	completed: "success",
	skipped: "outline",
	cancelled: "destructive",
	pending_auction: "secondary",
	auction_open: "warning",
};

const TURN_STATUS_LABEL: Record<TurnStatus, () => string> = {
	scheduled: m.turn_status_scheduled,
	in_progress: m.turn_status_in_progress,
	completed: m.turn_status_completed,
	skipped: m.turn_status_skipped,
	cancelled: m.turn_status_cancelled,
	pending_auction: m.turn_status_pending_auction,
	auction_open: m.turn_status_auction_open,
};

const BENEFICIARY_STATUS_VARIANT: Record<
	BeneficiaryStatus,
	"secondary" | "success" | "warning" | "destructive"
> = {
	designated: "secondary",
	confirmed: "warning",
	paid: "success",
	cancelled: "destructive",
};

const BENEFICIARY_STATUS_LABEL: Record<BeneficiaryStatus, () => string> = {
	designated: m.beneficiary_status_designated,
	confirmed: m.beneficiary_status_confirmed,
	paid: m.beneficiary_status_paid,
	cancelled: m.beneficiary_status_cancelled,
};

function CyclesPage() {
	const { tontineId } = Route.useParams();
	// `cycle:manage` is only provable today for the tontine creator — see
	// permissions.ts's documented gap (zeufack/totine#17).
	const { isAdmin } = useTontineRole();
	const queryClient = useQueryClient();

	const { data: tontine } = useQuery(tontineQueries.detail(tontineId));
	const { data: currentCycle, isPending: isCurrentPending } = useQuery(
		cycleQueries.current(tontineId),
	);
	const { data: cycleHistory } = useQuery(cycleQueries.history(tontineId));

	async function invalidateCycles() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["tontine", tontineId, "cycle"],
			}),
			queryClient.invalidateQueries({
				queryKey: ["tontine", tontineId, "cycles"],
			}),
		]);
	}

	const startMutation = useMutation({
		mutationFn: startCycle,
		onSuccess: async () => {
			await invalidateCycles();
			toast.success(m.cycles_start_success());
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.cycles_start_error(),
			);
		},
	});

	if (!tontine || isCurrentPending) {
		return (
			<div className="flex flex-col gap-4">
				<Skeleton className="h-24" />
				<Skeleton className="h-48" />
			</div>
		);
	}

	const pendingCycle = cycleHistory?.find(
		(cycle) => cycle.status === "pending",
	);

	return (
		<div className="flex flex-col gap-8">
			<div className="flex flex-col gap-3">
				<h2 className="text-xl font-semibold">{m.cycles_title()}</h2>
				<StrategyExplainer strategy={tontine.payoutStrategy} />
			</div>

			{currentCycle?.cycle ? (
				<CurrentCycleSection
					cycle={currentCycle.cycle}
					turns={currentCycle.turns}
					currency={tontine.currency}
				/>
			) : pendingCycle ? (
				<Card>
					<CardHeader>
						<CardTitle>
							{m.cycles_pending_title({ number: pendingCycle.cycleNumber })}
						</CardTitle>
						<CardDescription>{m.cycles_pending_description()}</CardDescription>
					</CardHeader>
					{isAdmin && (
						<CardContent>
							<Button
								disabled={startMutation.isPending}
								onClick={() => startMutation.mutate(pendingCycle.id)}
							>
								{m.cycles_start_cta()}
							</Button>
						</CardContent>
					)}
				</Card>
			) : (
				<EmptyState
					icon={CalendarClock}
					title={m.cycles_no_active_cycle_title()}
					description={m.cycles_no_active_cycle_description()}
					action={
						isAdmin ? (
							<CreateCycleDialog
								tontineId={tontineId}
								onCreated={invalidateCycles}
							/>
						) : undefined
					}
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
								<TableHead>{m.cycles_table_status()}</TableHead>
								<TableHead>{m.cycles_table_total_contributed()}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{cycleHistory.map((historyCycle) => (
								<TableRow key={historyCycle.id}>
									<TableCell>{historyCycle.cycleNumber}</TableCell>
									<TableCell>
										<Badge variant={CYCLE_STATUS_VARIANT[historyCycle.status]}>
											{CYCLE_STATUS_LABEL[historyCycle.status]()}
										</Badge>
									</TableCell>
									<TableCell>
										<Amount
											value={historyCycle.totalContributions}
											currency={tontine.currency}
										/>
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

function CreateCycleDialog({
	tontineId,
	onCreated,
}: {
	tontineId: string;
	onCreated: () => Promise<void>;
}) {
	const [open, setOpen] = useState(false);
	const [startDate, setStartDate] = useState(() =>
		new Date().toISOString().slice(0, 10),
	);

	const createMutation = useMutation({
		mutationFn: () => createCycle({ tontineId, startDate }),
		onSuccess: async () => {
			await onCreated();
			setOpen(false);
			toast.success(m.cycles_create_success());
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.cycles_create_error(),
			);
		},
	});

	return (
		<Dialog open={open} onOpenChange={setOpen}>
			<DialogTrigger asChild>
				<Button size="sm">{m.cycles_create_cta()}</Button>
			</DialogTrigger>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>{m.cycles_create_dialog_title()}</DialogTitle>
					<DialogDescription>
						{m.cycles_create_dialog_description()}
					</DialogDescription>
				</DialogHeader>
				<Input
					type="date"
					value={startDate}
					onChange={(event) => setStartDate(event.target.value)}
				/>
				<DialogFooter>
					<Button
						disabled={createMutation.isPending}
						onClick={() => createMutation.mutate()}
					>
						{m.cycles_create_submit_cta()}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}

function CurrentCycleSection({
	cycle,
	turns,
	currency,
}: {
	cycle: Cycle;
	turns: Turn[];
	currency: string;
}) {
	return (
		<div className="flex flex-col gap-6">
			<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.cycles_current_cycle_label({ number: cycle.cycleNumber })}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<Badge variant={CYCLE_STATUS_VARIANT[cycle.status]}>
							{CYCLE_STATUS_LABEL[cycle.status]()}
						</Badge>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle className="text-sm text-muted-foreground">
							{m.cycles_stats_completion_label()}
						</CardTitle>
					</CardHeader>
					<CardContent>
						<p className="text-2xl font-semibold">
							{Math.round(cycle.completionPercentage)}%
						</p>
					</CardContent>
				</Card>
			</div>

			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-muted-foreground">
					{m.cycles_schedule_title()}
				</h3>
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{m.cycles_table_turn()}</TableHead>
							<TableHead>{m.cycles_table_participant()}</TableHead>
							<TableHead>{m.cycles_table_scheduled_date()}</TableHead>
							<TableHead>{m.cycles_table_status()}</TableHead>
							<TableHead>{m.cycles_table_contribution()}</TableHead>
							<TableHead>{m.cycles_table_beneficiary_status()}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{turns.map((turn) => (
							<TableRow key={turn.id}>
								<TableCell>{turn.turnNumber}</TableCell>
								<TableCell>{turn.participantName ?? "—"}</TableCell>
								<TableCell>
									{new Date(turn.scheduledDate).toLocaleDateString()}
								</TableCell>
								<TableCell>
									<Badge variant={TURN_STATUS_VARIANT[turn.status]}>
										{TURN_STATUS_LABEL[turn.status]()}
									</Badge>
								</TableCell>
								<TableCell>
									<Amount value={turn.contributionAmount} currency={currency} />
								</TableCell>
								<TableCell>
									{turn.beneficiaryStatus ? (
										<Badge
											variant={
												BENEFICIARY_STATUS_VARIANT[turn.beneficiaryStatus]
											}
										>
											{BENEFICIARY_STATUS_LABEL[turn.beneficiaryStatus]()}
										</Badge>
									) : (
										"—"
									)}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			</div>
		</div>
	);
}
