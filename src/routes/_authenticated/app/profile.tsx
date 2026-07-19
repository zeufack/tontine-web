import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
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
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form.tsx";
import { Input } from "#/components/ui/input.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { profileQueries, updateProfile } from "#/features/profile/api";
import type { UserProfile } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/_authenticated/app/profile")({
	component: ProfilePage,
});

const profileFormSchema = z.object({
	name: z.string().min(1, m.validation_required()),
});
type ProfileFormValues = z.infer<typeof profileFormSchema>;

const MOBILE_MONEY_PROVIDER_LABEL: Record<
	UserProfile["mobileMoneyNumbers"][number]["provider"],
	() => string
> = {
	mtn_money: m.mobile_money_provider_mtn_money,
	orange_money: m.mobile_money_provider_orange_money,
};

function ProfilePage() {
	const queryClient = useQueryClient();
	const { data: profile } = useQuery(profileQueries.mine());

	const form = useForm<ProfileFormValues>({
		resolver: zodResolver(profileFormSchema),
		values: profile ? { name: profile.name } : undefined,
	});

	const updateMutation = useMutation({
		mutationFn: updateProfile,
		onSuccess: async () => {
			await queryClient.invalidateQueries({ queryKey: ["user", "profile"] });
			toast.success(m.profile_save_success());
		},
	});

	function onSubmit(values: ProfileFormValues) {
		updateMutation.mutate({ name: values.name });
	}

	function handleLocaleChange(locale: UserProfile["locale"]) {
		updateMutation.mutate({ locale });
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
								name="name"
								render={({ field }) => (
									<FormItem>
										<FormLabel>{m.profile_name_label()}</FormLabel>
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
					<LocaleSwitcher onLocaleChange={handleLocaleChange} />
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>{m.profile_mobile_money_title()}</CardTitle>
					<CardDescription>
						{m.profile_mobile_money_display_only_note()}
					</CardDescription>
				</CardHeader>
				<CardContent>
					{profile.mobileMoneyNumbers.length === 0 ? (
						<p className="text-sm text-muted-foreground">
							{m.profile_mobile_money_empty()}
						</p>
					) : (
						<ul className="flex flex-col gap-2">
							{profile.mobileMoneyNumbers.map((entry) => (
								<li
									key={entry.number}
									className="flex items-center justify-between rounded-lg border px-3 py-2"
								>
									<span>{MOBILE_MONEY_PROVIDER_LABEL[entry.provider]()}</span>
									<span className="font-medium tabular-nums">
										{entry.number}
									</span>
								</li>
							))}
						</ul>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
