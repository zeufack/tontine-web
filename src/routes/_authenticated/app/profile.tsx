import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute, useRouter } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from "zod";

import LocaleSwitcher from "#/components/LocaleSwitcher";
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
	deleteAccount,
	profileQueries,
	updateProfile,
} from "#/features/profile/api";
import { sessionQueryKey } from "#/lib/session-client";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app/profile")({
	component: ProfilePage,
});

const profileFormSchema = z.object({
	firstName: z.string().min(1, m.validation_required()),
	lastName: z.string().min(1, m.validation_required()),
	phoneNumber: z.string(),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

function ProfilePage() {
	const queryClient = useQueryClient();
	const router = useRouter();
	const { data: profile } = useQuery(profileQueries.mine());
	const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		values: profile
			? {
					firstName: profile.firstName,
					lastName: profile.lastName,
					phoneNumber: profile.phoneNumber,
				}
			: undefined,
	});

	const updateMutation = useMutation({
		mutationFn: updateProfile,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
			toast.success(m.profile_save_success());
		},
		onError: () => {
			toast.error(m.profile_save_error());
		},
	});

	const deleteMutation = useMutation({
		mutationFn: deleteAccount,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: sessionQueryKey });
			// Re-runs beforeLoad so `_authenticated`'s guard sees the now-invalid
			// session and redirects to /login.
			await router.invalidate();
		},
		onError: () => {
			toast.error(m.profile_delete_account_error());
		},
	});

	function onSubmit(values: ProfileFormValues) {
		updateMutation.mutate(values);
	}

	if (!profile) {
		return (
			<div className="flex flex-col gap-4 p-8">
				<Skeleton className="h-40" />
				<Skeleton className="h-24" />
				<Skeleton className="h-32" />
			</div>
		);
	}

	return (
		<div className="flex flex-col gap-6 p-8">
			<h1 className="text-2xl font-bold">{m.profile_title()}</h1>

			<Card>
				<CardHeader>
					<CardTitle>{m.profile_personal_info_title()}</CardTitle>
				</CardHeader>
				<CardContent>
					<Form {...form}>
						<form
							onSubmit={form.handleSubmit(onSubmit)}
							className="flex flex-col gap-4"
						>
							<FormField
								control={form.control}
								name="firstName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.register_first_name_label()}</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="lastName"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.register_last_name_label()}</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<FormField
								control={form.control}
								name="phoneNumber"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.register_phone_label()}</FormLabel>
										<FormControl>
											<Input {...field} />
										</FormControl>
										<FormMessage />
									</FormItem>
								)}
							/>
							<div className="flex flex-col gap-1">
								<span className="text-sm font-medium">
									{m.profile_email_label()}
								</span>
								<span className="text-sm text-muted-foreground">
									{profile.email}
								</span>
							</div>
							<Button
								type="submit"
								className="self-start"
								disabled={updateMutation.isPending}
							>
								{m.profile_save_cta()}
							</Button>
						</form>
					</Form>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{m.profile_locale_title()}</CardTitle>
					<CardDescription>{m.profile_locale_description()}</CardDescription>
				</CardHeader>
				<CardContent>
					<LocaleSwitcher />
				</CardContent>
			</Card>

			<Card className="border-destructive/50">
				<CardHeader>
					<CardTitle>{m.profile_delete_account_title()}</CardTitle>
					<CardDescription>
						{m.profile_delete_account_description()}
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
						<DialogTrigger asChild>
							<Button variant="destructive">
								{m.profile_delete_account_trigger_cta()}
							</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>
									{m.profile_delete_account_confirm_title()}
								</DialogTitle>
								<DialogDescription>
									{m.profile_delete_account_confirm_description()}
								</DialogDescription>
							</DialogHeader>
							<DialogFooter>
								<Button
									variant="outline"
									onClick={() => setDeleteDialogOpen(false)}
								>
									{m.profile_delete_account_cancel_cta()}
								</Button>
								<Button
									variant="destructive"
									disabled={deleteMutation.isPending}
									onClick={() => deleteMutation.mutate()}
								>
									{m.profile_delete_account_confirm_cta()}
								</Button>
							</DialogFooter>
						</DialogContent>
					</Dialog>
				</CardContent>
			</Card>
		</div>
	);
}
