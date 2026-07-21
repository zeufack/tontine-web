import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import {
	CONTRIBUTION_METHOD_LABEL,
	ContributionMethodPicker,
} from "#/components/tontine/contribution-method-picker.tsx";
import { ContributionStatusBadge } from "#/components/tontine/contribution-status-badge.tsx";
import { Amount } from "#/components/ui/amount.tsx";
import { Button } from "#/components/ui/button.tsx";
import { Checkbox } from "#/components/ui/checkbox.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	approveContribution,
	contributionQueries,
	recordContribution,
	rejectContribution,
} from "#/features/contributions/api";
import { tontineQueries } from "#/features/tontines/api";
import { TONTINE_PERMISSIONS } from "#/features/tontines/permissions";
import { useTontineRole } from "#/features/tontines/use-tontine-role";
import { contributionMethodSchema } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/contributions",
)({
	component: ContributionsPage,
});

const recordFormSchema = z.object({
	method: contributionMethodSchema,
	amount: z.coerce.number().positive(m.validation_required()),
	notes: z.string().optional(),
});
type RecordFormValues = z.infer<typeof recordFormSchema>;

function ContributionsPage() {
	const { tontineId } = Route.useParams();
	const { has } = useTontineRole();
	const canValidate = has(TONTINE_PERMISSIONS.FUNDS_DISTRIBUTE);
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);

	const { data: tontine } = useQuery(tontineQueries.detail(tontineId));
	const { data: target } = useQuery(contributionQueries.target(tontineId));
	const { data: myContributions } = useQuery(
		contributionQueries.mine(tontineId),
	);

	const form = useForm<RecordFormValues>({
		resolver: zodResolver(recordFormSchema),
		values: target
			? { method: "mobile_money", amount: target.contributionAmount, notes: "" }
			: undefined,
	});

	async function invalidateContributionQueries() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["tontine", tontineId, "contributions"],
			}),
			queryClient.invalidateQueries({
				queryKey: ["tontine", tontineId, "cycle"],
			}),
		]);
	}

	const recordMutation = useMutation({
		mutationFn: recordContribution,
		onSuccess: async () => {
			await invalidateContributionQueries();
			form.reset();
			setDialogOpen(false);
			toast.success(m.contributions_record_success());
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.contributions_record_error(),
			);
		},
	});

	function onSubmit(values: RecordFormValues) {
		if (!target) return;
		recordMutation.mutate({
			turnId: target.turnId,
			participantId: target.participantId,
			amount: values.amount,
			method: values.method,
			notes: values.notes || undefined,
		});
	}

	const currency = tontine?.currency ?? "XAF";
	const canRecord = !!target && !target.alreadySubmitted;

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">{m.contributions_title()}</h2>
				{canRecord && (
					<Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
						<DialogTrigger asChild>
							<Button size="sm">{m.contributions_record_cta()}</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{m.contributions_dialog_title()}</DialogTitle>
							</DialogHeader>
							<Form {...form}>
								<form
									onSubmit={form.handleSubmit(onSubmit)}
									className="flex flex-col gap-4"
								>
									<FormField
										control={form.control}
										name="method"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{m.contributions_method_label()}</FormLabel>
												<FormControl>
													<ContributionMethodPicker
														value={field.value}
														onChange={field.onChange}
													/>
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="amount"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{m.contributions_amount_label()}</FormLabel>
												<FormControl>
													<Input type="number" min="0" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<FormField
										control={form.control}
										name="notes"
										render={({ field }) => (
											<FormItem>
												<FormLabel>{m.contributions_notes_label()}</FormLabel>
												<FormControl>
													<Input {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<DialogFooter>
										<Button type="submit" disabled={recordMutation.isPending}>
											{m.contributions_submit_cta()}
										</Button>
									</DialogFooter>
								</form>
							</Form>
						</DialogContent>
					</Dialog>
				)}
			</div>

			{target?.alreadySubmitted && (
				<p className="text-sm text-muted-foreground">
					{m.contributions_already_submitted()}
				</p>
			)}

			<div className="flex flex-col gap-3">
				<h3 className="text-sm font-semibold text-muted-foreground">
					{m.contributions_history_title()}
				</h3>
				{!myContributions || myContributions.length === 0 ? (
					<p className="text-sm text-muted-foreground">
						{m.contributions_history_empty()}
					</p>
				) : (
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>{m.contributions_table_method()}</TableHead>
								<TableHead>{m.contributions_table_amount()}</TableHead>
								<TableHead>{m.contributions_table_status()}</TableHead>
								<TableHead>{m.contributions_table_date()}</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{myContributions.map((contribution) => (
								<TableRow key={contribution.id}>
									<TableCell>
										{CONTRIBUTION_METHOD_LABEL[contribution.method]()}
									</TableCell>
									<TableCell>
										<Amount value={contribution.amount} currency={currency} />
									</TableCell>
									<TableCell>
										<ContributionStatusBadge status={contribution.status} />
										{contribution.status === "rejected" &&
											contribution.rejectionReason && (
												<p className="mt-1 text-xs text-muted-foreground">
													{m.contributions_rejection_reason_label({
														reason: contribution.rejectionReason,
													})}
												</p>
											)}
									</TableCell>
									<TableCell>
										{new Date(contribution.submittedAt).toLocaleDateString()}
									</TableCell>
								</TableRow>
							))}
						</TableBody>
					</Table>
				)}
			</div>

			{canValidate && (
				<ValidationQueue
					tontineId={tontineId}
					currency={currency}
					onMutate={invalidateContributionQueries}
				/>
			)}
		</div>
	);
}

function ValidationQueue({
	tontineId,
	currency,
	onMutate,
}: {
	tontineId: string;
	currency: string;
	onMutate: () => Promise<void>;
}) {
	const { data: pending } = useQuery(contributionQueries.pending(tontineId));
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [rejectTarget, setRejectTarget] = useState<string | null>(null);
	const [rejectReason, setRejectReason] = useState("");

	const approveMutation = useMutation({
		mutationFn: (contributionId: string) =>
			approveContribution(tontineId, contributionId),
		onSuccess: onMutate,
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.validation_approve_error(),
			);
		},
	});

	const rejectMutation = useMutation({
		mutationFn: ({ id, reason }: { id: string; reason: string }) =>
			rejectContribution(tontineId, id, reason),
		onSuccess: async () => {
			await onMutate();
			setRejectTarget(null);
			setRejectReason("");
		},
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.validation_reject_error(),
			);
		},
	});

	async function bulkApprove() {
		await Promise.all(
			Array.from(selected).map((id) => approveContribution(tontineId, id)),
		);
		setSelected(new Set());
		await onMutate();
	}

	if (!pending) return null;

	return (
		<div className="flex flex-col gap-3 border-t pt-6">
			<div className="flex items-center justify-between">
				<h3 className="text-sm font-semibold text-muted-foreground">
					{m.validation_queue_title()}
				</h3>
				{selected.size > 0 && (
					<Button
						size="sm"
						variant="outline"
						onClick={() => void bulkApprove()}
					>
						{m.validation_bulk_approve_cta()} ({selected.size})
					</Button>
				)}
			</div>
			{pending.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{m.validation_queue_empty()}
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead className="w-8" />
							<TableHead>{m.validation_table_member()}</TableHead>
							<TableHead>{m.contributions_table_method()}</TableHead>
							<TableHead>{m.contributions_table_amount()}</TableHead>
							<TableHead>{m.validation_table_timestamp()}</TableHead>
							<TableHead />
						</TableRow>
					</TableHeader>
					<TableBody>
						{pending.map((contribution) => (
							<TableRow key={contribution.id}>
								<TableCell>
									<Checkbox
										checked={selected.has(contribution.id)}
										onCheckedChange={(checked) => {
											setSelected((prev) => {
												const next = new Set(prev);
												if (checked) {
													next.add(contribution.id);
												} else {
													next.delete(contribution.id);
												}
												return next;
											});
										}}
									/>
								</TableCell>
								<TableCell>{contribution.participantName}</TableCell>
								<TableCell>
									{CONTRIBUTION_METHOD_LABEL[contribution.method]()}
								</TableCell>
								<TableCell>
									<Amount value={contribution.amount} currency={currency} />
								</TableCell>
								<TableCell>
									{new Date(contribution.submittedAt).toLocaleDateString()}
								</TableCell>
								<TableCell>
									<div className="flex gap-2">
										<Button
											size="sm"
											disabled={approveMutation.isPending}
											onClick={() => approveMutation.mutate(contribution.id)}
										>
											{m.validation_approve_cta()}
										</Button>
										<Button
											size="sm"
											variant="outline"
											onClick={() => setRejectTarget(contribution.id)}
										>
											{m.validation_reject_cta()}
										</Button>
									</div>
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}

			<Dialog
				open={rejectTarget !== null}
				onOpenChange={(open) => {
					if (!open) setRejectTarget(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{m.validation_reject_dialog_title()}</DialogTitle>
					</DialogHeader>
					<div className="flex flex-col gap-2">
						<label className="text-sm font-medium" htmlFor="reject-reason">
							{m.validation_reject_reason_label()}
						</label>
						<Input
							id="reject-reason"
							value={rejectReason}
							onChange={(event) => setRejectReason(event.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={() =>
								rejectTarget &&
								rejectMutation.mutate({
									id: rejectTarget,
									reason: rejectReason,
								})
							}
							disabled={!rejectReason.trim() || rejectMutation.isPending}
						>
							{m.validation_reject_cta()}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
