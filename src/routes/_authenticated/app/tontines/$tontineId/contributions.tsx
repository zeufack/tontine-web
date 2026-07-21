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
} from "#/features/contributions/api";
import { tontineQueries } from "#/features/tontines/api";
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
		</div>
	);
}
