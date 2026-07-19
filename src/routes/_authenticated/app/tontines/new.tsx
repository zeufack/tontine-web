import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useFieldArray, useForm } from "react-hook-form";
import { z } from "zod";

import { StrategyExplainer } from "#/components/tontine/strategy-explainer.tsx";
import { Amount } from "#/components/ui/amount.tsx";
import { Button } from "#/components/ui/button.tsx";
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
	RadioGroup,
	RadioGroupCardItem,
} from "#/components/ui/radio-group.tsx";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "#/components/ui/select.tsx";
import { Stepper } from "#/components/ui/stepper.tsx";
import { createTontine } from "#/features/tontines/api";
import {
	durationTypeSchema,
	payoutStrategySchema,
	tontineFrequencySchema,
} from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app/tontines/new")({
	component: NewTontinePage,
});

const wizardSchema = z.object({
	name: z.string().min(1, m.validation_required()),
	currency: z.string().length(3),
	contributionAmount: z.coerce.number().positive(m.validation_required()),
	frequency: tontineFrequencySchema,
	durationType: durationTypeSchema,
	cycleCount: z.coerce.number().int().positive().optional(),
	endDate: z.string().optional(),
	goalAmount: z.coerce.number().positive().optional(),
	payoutStrategy: payoutStrategySchema,
	invites: z.array(
		z.object({ email: z.string().email(m.validation_invalid_email()) }),
	),
});

type WizardValues = z.infer<typeof wizardSchema>;

const STEP_FIELDS: Array<Array<keyof WizardValues>> = [
	[
		"name",
		"currency",
		"contributionAmount",
		"frequency",
		"durationType",
		"cycleCount",
		"endDate",
		"goalAmount",
	],
	["payoutStrategy"],
	["invites"],
	[],
];

function NewTontinePage() {
	const [step, setStep] = useState(0);
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const form = useForm<WizardValues>({
		resolver: zodResolver(wizardSchema),
		defaultValues: {
			name: "",
			currency: "XAF",
			contributionAmount: 0,
			frequency: "monthly",
			durationType: "fixed_cycles",
			cycleCount: 12,
			payoutStrategy: "rotating",
			invites: [{ email: "" }],
		},
	});

	const { fields, append, remove } = useFieldArray({
		control: form.control,
		name: "invites",
	});

	const createMutation = useMutation({
		mutationFn: createTontine,
		onSuccess: async (tontine) => {
			await queryClient.invalidateQueries({ queryKey: ["tontines", "mine"] });
			await navigate({
				to: "/app/tontines/$tontineId/overview",
				params: { tontineId: tontine.id },
			});
		},
	});

	const steps = [
		m.wizard_step_basics(),
		m.wizard_step_strategy(),
		m.wizard_step_invite(),
		m.wizard_step_review(),
	];

	const durationType = form.watch("durationType");
	const invites = form.watch("invites");

	async function goNext() {
		const valid = await form.trigger(STEP_FIELDS[step]);
		if (valid) setStep((s) => Math.min(s + 1, steps.length - 1));
	}

	function goBack() {
		setStep((s) => Math.max(s - 1, 0));
	}

	function onSubmit(values: WizardValues) {
		createMutation.mutate({
			name: values.name,
			currency: values.currency,
			contributionAmount: values.contributionAmount,
			frequency: values.frequency,
			payoutStrategy: values.payoutStrategy,
			durationType: values.durationType,
			cycleCount: values.cycleCount,
			endDate: values.endDate,
			goalAmount: values.goalAmount,
		});
	}

	return (
		<div className="mx-auto flex max-w-2xl flex-col gap-6 p-8">
			<Stepper steps={steps} currentStep={step} />
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-6"
				>
					{step === 0 && (
						<div className="flex flex-col gap-4">
							<FormField
								control={form.control}
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.wizard_name_label()}</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="grid grid-cols-2 gap-4">
								<FormField
									control={form.control}
									name="currency"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{m.wizard_currency_label()}</FormLabel>
											<Select
												value={field.value}
												onValueChange={field.onChange}
											>
												<FormControl>
													<SelectTrigger className="w-full">
														<SelectValue />
													</SelectTrigger>
												</FormControl>
												<SelectContent>
													<SelectItem value="XAF">XAF</SelectItem>
													<SelectItem value="EUR">EUR</SelectItem>
													<SelectItem value="NGN">NGN</SelectItem>
												</SelectContent>
											</Select>
											<FormMessage />
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="contributionAmount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>
												{m.wizard_contribution_amount_label()}
											</FormLabel>
											<FormControl>
												<Input type="number" min="0" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							</div>
							<FormField
								control={form.control}
								name="frequency"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.wizard_frequency_label()}</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="daily">
													{m.frequency_daily()}
												</SelectItem>
												<SelectItem value="weekly">
													{m.frequency_weekly()}
												</SelectItem>
												<SelectItem value="biweekly">
													{m.frequency_biweekly()}
												</SelectItem>
												<SelectItem value="monthly">
													{m.frequency_monthly()}
												</SelectItem>
												<SelectItem value="quarterly">
													{m.frequency_quarterly()}
												</SelectItem>
												<SelectItem value="yearly">
													{m.frequency_yearly()}
												</SelectItem>
												<SelectItem value="custom">
													{m.frequency_custom()}
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="durationType"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.wizard_duration_type_label()}</FormLabel>
										<Select value={field.value} onValueChange={field.onChange}>
											<FormControl>
												<SelectTrigger className="w-full">
													<SelectValue />
												</SelectTrigger>
											</FormControl>
											<SelectContent>
												<SelectItem value="fixed_cycles">
													{m.duration_type_fixed_cycles()}
												</SelectItem>
												<SelectItem value="fixed_time">
													{m.duration_type_fixed_time()}
												</SelectItem>
												<SelectItem value="open_ended">
													{m.duration_type_open_ended()}
												</SelectItem>
												<SelectItem value="goal_based">
													{m.duration_type_goal_based()}
												</SelectItem>
											</SelectContent>
										</Select>
										<FormMessage />
									</FormItem>
								)}
							/>
							{durationType === "fixed_cycles" && (
								<FormField
									control={form.control}
									name="cycleCount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{m.wizard_cycle_count_label()}</FormLabel>
											<FormControl>
												<Input type="number" min="1" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
							{durationType === "fixed_time" && (
								<FormField
									control={form.control}
									name="endDate"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{m.wizard_end_date_label()}</FormLabel>
											<FormControl>
												<Input type="date" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
							{durationType === "goal_based" && (
								<FormField
									control={form.control}
									name="goalAmount"
									render={({ field }) => (
										<FormItem>
											<FormLabel>{m.wizard_goal_amount_label()}</FormLabel>
											<FormControl>
												<Input type="number" min="0" {...field} />
											</FormControl>
											<FormMessage />
										</FormItem>
									)}
								/>
							)}
						</div>
					)}

					{step === 1 && (
						<div className="flex flex-col gap-4">
							<h2 className="text-lg font-semibold">
								{m.wizard_strategy_step_title()}
							</h2>
							<FormField
								control={form.control}
								name="payoutStrategy"
								render={({ field }) => (
									<FormItem>
										<FormControl>
											<RadioGroup
												value={field.value}
												onValueChange={field.onChange}
												className="grid-cols-1 gap-3 sm:grid-cols-3"
											>
												<RadioGroupCardItem value="rotating">
													<StrategyExplainer strategy="rotating" />
												</RadioGroupCardItem>
												<RadioGroupCardItem value="lottery">
													<StrategyExplainer strategy="lottery" />
												</RadioGroupCardItem>
												<RadioGroupCardItem value="bidding">
													<StrategyExplainer strategy="bidding" />
												</RadioGroupCardItem>
											</RadioGroup>
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
						</div>
					)}

					{step === 2 && (
						<div className="flex flex-col gap-4">
							<div>
								<h2 className="text-lg font-semibold">
									{m.wizard_invite_step_title()}
								</h2>
								<p className="text-sm text-muted-foreground">
									{m.wizard_invite_step_description()}
								</p>
							</div>
							{fields.map((fieldItem, index) => (
								<div key={fieldItem.id} className="flex items-end gap-2">
									<FormField
										control={form.control}
										name={`invites.${index}.email`}
										render={({ field }) => (
											<FormItem className="flex-1">
												<FormLabel>{m.wizard_invite_email_label()}</FormLabel>
												<FormControl>
													<Input type="email" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<Button
										type="button"
										variant="outline"
										size="sm"
										onClick={() => remove(index)}
									>
										{m.wizard_invite_remove_cta()}
									</Button>
								</div>
							))}
							<Button
								type="button"
								variant="outline"
								size="sm"
								className="self-start"
								onClick={() => append({ email: "" })}
							>
								{m.wizard_invite_add_cta()}
							</Button>
						</div>
					)}

					{step === 3 && (
						<div className="flex flex-col gap-4">
							<h2 className="text-lg font-semibold">
								{m.wizard_review_step_title()}
							</h2>
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground">
									{m.wizard_review_basics_heading()}
								</h3>
								<p className="flex items-center gap-2">
									<span>{form.getValues("name")}</span>
									<Amount
										value={form.getValues("contributionAmount")}
										currency={form.getValues("currency")}
									/>
								</p>
							</div>
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground">
									{m.wizard_review_strategy_heading()}
								</h3>
								<StrategyExplainer
									strategy={form.getValues("payoutStrategy")}
								/>
							</div>
							<div>
								<h3 className="text-sm font-semibold text-muted-foreground">
									{m.wizard_review_invites_heading()}
								</h3>
								{invites.filter((invite) => invite.email).length === 0 ? (
									<p className="text-sm text-muted-foreground">
										{m.wizard_review_no_invites()}
									</p>
								) : (
									<ul className="list-disc pl-5 text-sm">
										{invites
											.filter((invite) => invite.email)
											.map((invite) => (
												<li key={invite.email}>{invite.email}</li>
											))}
									</ul>
								)}
							</div>
						</div>
					)}

					<div className="flex gap-2">
						{step > 0 && (
							<Button type="button" variant="outline" onClick={goBack}>
								{m.wizard_back_cta()}
							</Button>
						)}
						{step < steps.length - 1 && (
							<Button type="button" onClick={goNext}>
								{m.wizard_next_cta()}
							</Button>
						)}
						{step === steps.length - 1 && (
							<Button type="submit" disabled={createMutation.isPending}>
								{m.wizard_submit_cta()}
							</Button>
						)}
					</div>
				</form>
			</Form>
		</div>
	);
}
