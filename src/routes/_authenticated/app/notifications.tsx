import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
} from "#/components/ui/form.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { Switch } from "#/components/ui/switch.tsx";
import {
	type NotificationPreferences,
	notificationPreferencesQueries,
	updateNotificationPreferencesForCurrentUser,
} from "#/features/notification-preferences/api";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app/notifications")({
	component: NotificationsPage,
});

const CHANNEL_TOGGLES = [
	{ key: "email", label: m.notifications_email_label },
	{ key: "push", label: m.notifications_push_label },
	{ key: "inApp", label: m.notifications_in_app_label },
	{ key: "sms", label: m.notifications_sms_label },
] as const;

const EVENT_TOGGLES = [
	{ key: "tontineUpdates", label: m.notifications_tontine_updates_label },
	{
		key: "contributionReminders",
		label: m.notifications_contribution_reminders_label,
	},
	{
		key: "beneficiaryNotifications",
		label: m.notifications_beneficiary_notifications_label,
	},
	{ key: "participantJoined", label: m.notifications_participant_joined_label },
	{ key: "paymentReceived", label: m.notifications_payment_received_label },
] as const;

const quietHoursFormSchema = z.object({
	quietHoursStart: z.string(),
	quietHoursEnd: z.string(),
	timezone: z.string(),
});
type QuietHoursFormValues = z.infer<typeof quietHoursFormSchema>;

function NotificationsPage() {
	const queryClient = useQueryClient();
	const { data: preferences } = useQuery(notificationPreferencesQueries.mine());

	const toggleMutation = useMutation({
		mutationFn: updateNotificationPreferencesForCurrentUser,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["user", "notification-preferences"],
			});
		},
		onError: () => {
			toast.error(m.notifications_toggle_error());
		},
	});

	const quietHoursForm = useForm<QuietHoursFormValues>({
		resolver: zodResolver(quietHoursFormSchema),
		values: preferences
			? {
					quietHoursStart: preferences.quietHoursStart ?? "",
					quietHoursEnd: preferences.quietHoursEnd ?? "",
					timezone: preferences.timezone ?? "",
				}
			: undefined,
	});

	const quietHoursMutation = useMutation({
		mutationFn: updateNotificationPreferencesForCurrentUser,
		onSuccess: async () => {
			await queryClient.invalidateQueries({
				queryKey: ["user", "notification-preferences"],
			});
			toast.success(m.notifications_save_success());
		},
		onError: () => {
			toast.error(m.notifications_save_error());
		},
	});

	if (!preferences) {
		return (
			<div className="flex flex-col gap-4 p-8">
				<Skeleton className="h-40" />
				<Skeleton className="h-40" />
			</div>
		);
	}

	function handleToggle(key: keyof NotificationPreferences, value: boolean) {
		toggleMutation.mutate({ [key]: value });
	}

	function onSubmitQuietHours(values: QuietHoursFormValues) {
		quietHoursMutation.mutate(values);
	}

	return (
		<div className="flex flex-col gap-6 p-8">
			<h1 className="text-2xl font-bold">{m.notifications_title()}</h1>

			<Card>
				<CardHeader>
					<CardTitle>{m.notifications_channels_title()}</CardTitle>
					<CardDescription>
						{m.notifications_channels_description()}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{CHANNEL_TOGGLES.map(({ key, label }) => (
						<div key={key} className="flex items-center justify-between">
							<span className="text-sm font-medium">{label()}</span>
							<Switch
								checked={preferences[key]}
								onCheckedChange={(checked) => handleToggle(key, checked)}
							/>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{m.notifications_events_title()}</CardTitle>
					<CardDescription>
						{m.notifications_events_description()}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{EVENT_TOGGLES.map(({ key, label }) => (
						<div key={key} className="flex items-center justify-between">
							<span className="text-sm font-medium">{label()}</span>
							<Switch
								checked={preferences[key]}
								onCheckedChange={(checked) => handleToggle(key, checked)}
							/>
						</div>
					))}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{m.notifications_quiet_hours_title()}</CardTitle>
					<CardDescription>
						{m.notifications_quiet_hours_description()}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Form {...quietHoursForm}>
						<form
							onSubmit={quietHoursForm.handleSubmit(onSubmitQuietHours)}
							className="flex flex-col gap-4"
						>
							<FormField
								control={quietHoursForm.control}
								name="quietHoursStart"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{m.notifications_quiet_hours_start_label()}
										</FormLabel>
										<FormControl>
											<Input type="time" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={quietHoursForm.control}
								name="quietHoursEnd"
								render={({ field }) => (
									<FormItem>
										<FormLabel>
											{m.notifications_quiet_hours_end_label()}
										</FormLabel>
										<FormControl>
											<Input type="time" {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
							<FormField
								control={quietHoursForm.control}
								name="timezone"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.notifications_timezone_label()}</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
									</FormItem>
								)}
							/>
							<Button
								type="submit"
								className="self-start"
								disabled={quietHoursMutation.isPending}
							>
								{m.notifications_save_cta()}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
