import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
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
	contributionQueries,
	recordContribution,
	rejectContribution,
	validateContribution,
} from "#/features/contributions/api";
import { memberQueries } from "#/features/members/api";
import { tontineQueries } from "#/features/tontines/api";
import { useTontineRole } from "#/features/tontines/use-tontine-role";
import { contributionMethodSchema } from "#/lib/mock-data/schemas";
import { CURRENT_USER_ID } from "#/lib/mock-data/store";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/contributions",
)({
	component: ContributionsPage,
});

const recordFormSchema = z.object({
	method: contributionMethodSchema,
	amount: z.coerce.number().positive(m.validation_required()),
	reference: z.string().optional(),
	receiptFileName: z.string().optional(),
});
type RecordFormValues = z.infer<typeof recordFormSchema>;

function ContributionsPage() {
	const { tontineId } = Route.useParams();
	const { isAdmin } = useTontineRole();
	const queryClient = useQueryClient();
	const [dialogOpen, setDialogOpen] = useState(false);

	const { data: tontine } = useQuery(tontineQueries.detail(tontineId));
	const { data: myContributions } = useQuery(
		contributionQueries.list(tontineId, CURRENT_USER_ID),
	);

	const form = useForm<RecordFormValues>({
		resolver: zodResolver(recordFormSchema),
		defaultValues: {
			method: "mobile_money",
			amount: 0,
			reference: "",
			receiptFileName: "",
		},
	});

	async function invalidateContributionQueries() {
		await Promise.all([
			queryClient.invalidateQueries({
				queryKey: ["tontine", tontineId, "contributions"],
			}),
			queryClient.invalidateQueries({
				queryKey: ["tontine", tontineId, "cycle"],
			}),
			queryClient.invalidateQueries({ queryKey: ["tontines", "mine"] }),
		]);
	}

	const recordMutation = useMutation({
		mutationFn: recordContribution,
		onSuccess: async () => {
			await invalidateContributionQueries();
			form.reset();
			setDialogOpen(false);
		},
	});

	function onSubmit(values: RecordFormValues) {
		recordMutation.mutate({
			tontineId,
			memberId: CURRENT_USER_ID,
			amount: values.amount,
			method: values.method,
			reference: values.reference || undefined,
			receiptFileName: values.receiptFileName || undefined,
		});
	}

	const currency = tontine?.currency ?? "XAF";

	return (
		<div className="flex flex-col gap-8">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">{m.contributions_title()}</h2>
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
									name="reference"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{m.contributions_reference_label()}</FormLabel>
											<FormControl>
												<Input {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="receiptFileName"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{m.contributions_receipt_label()}</FormLabel>
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
			</div>

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
											contribution.resolutionNote && (
												<p className="mt-1 text-xs text-muted-foreground">
													{m.contributions_rejection_reason_label({
														reason: contribution.resolutionNote,
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

			{isAdmin && (
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
	const { data: members } = useQuery(memberQueries.list(tontineId));
	const [selected, setSelected] = useState<Set<string>>(new Set());
	const [rejectTarget, setRejectTarget] = useState<string | null>(null);
	const [rejectNote, setRejectNote] = useState("");

	function memberName(memberId: string): string {
		return members?.find((member) => member.id === memberId)?.name ?? memberId;
	}

	const validateMutation = useMutation({
		mutationFn: (id: string) => validateContribution(id),
		onSuccess: onMutate,
	});

	const rejectMutation = useMutation({
		mutationFn: ({ id, note }: { id: string; note?: string }) =>
			rejectContribution(id, note),
		onSuccess: async () => {
			await onMutate();
			setRejectTarget(null);
			setRejectNote("");
		},
	});

	async function bulkApprove() {
		await Promise.all(
			Array.from(selected).map((id) => validateContribution(id)),
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
							<TableHead>{m.validation_table_reference()}</TableHead>
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
								<TableCell>{memberName(contribution.memberId)}</TableCell>
								<TableCell>
									{CONTRIBUTION_METHOD_LABEL[contribution.method]()}
								</TableCell>
								<TableCell>
									<Amount value={contribution.amount} currency={currency} />
								</TableCell>
								<TableCell>{contribution.reference ?? "—"}</TableCell>
								<TableCell>
									{new Date(contribution.submittedAt).toLocaleDateString()}
								</TableCell>
								<TableCell>
									<div className="flex gap-2">
										<Button
											size="sm"
											onClick={() => validateMutation.mutate(contribution.id)}
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
						<label className="text-sm font-medium" htmlFor="reject-note">
							{m.validation_reject_reason_label()}
						</label>
						<Input
							id="reject-note"
							value={rejectNote}
							onChange={(event) => setRejectNote(event.target.value)}
						/>
					</div>
					<DialogFooter>
						<Button
							onClick={() =>
								rejectTarget &&
								rejectMutation.mutate({
									id: rejectTarget,
									note: rejectNote || undefined,
								})
							}
							disabled={rejectMutation.isPending}
						>
							{m.validation_reject_cta()}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
