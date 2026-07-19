import { zodResolver } from "@hookform/resolvers/zod";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";

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
import { loginAction } from "#/lib/session-actions";
import { m } from "#/paraglide/messages";

function sanitizeRedirect(value: unknown): string {
	if (
		typeof value !== "string" ||
		!value.startsWith("/") ||
		value.startsWith("//")
	) {
		return "/dashboard";
	}
	return value;
}

export const Route = createFileRoute("/login")({
	validateSearch: (search: Record<string, unknown>) => ({
		redirect: sanitizeRedirect(search.redirect),
	}),
	component: LoginPage,
});

function LoginPage() {
	const { redirect } = Route.useSearch();
	const navigate = useNavigate();
	const [submitError, setSubmitError] = useState<string | null>(null);

	const loginFormSchema = z.object({
		email: z
			.string()
			.min(1, m.validation_required())
			.email(m.validation_invalid_email()),
		password: z.string().min(1, m.validation_required()),
	});

	const form = useForm<z.infer<typeof loginFormSchema>>({
		resolver: zodResolver(loginFormSchema),
		defaultValues: { email: "", password: "" },
	});

	async function onSubmit(values: z.infer<typeof loginFormSchema>) {
		setSubmitError(null);
		try {
			await loginAction({ data: values });
			await navigate({ href: redirect });
		} catch {
			setSubmitError(m.login_error_invalid_credentials());
		}
	}

	return (
		<div className="mx-auto flex max-w-sm flex-col gap-6 p-8">
			<h1 className="text-2xl font-bold">{m.login_title()}</h1>
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onSubmit)}
					className="flex flex-col gap-4"
				>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{m.login_email_label()}</FormLabel>
								<FormControl>
									<Input type="email" autoComplete="email" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="password"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{m.login_password_label()}</FormLabel>
								<FormControl>
									<Input
										type="password"
										autoComplete="current-password"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					{submitError && (
						<p className="text-sm text-destructive">{submitError}</p>
					)}
					<Button type="submit" disabled={form.formState.isSubmitting}>
						{m.login_submit_cta()}
					</Button>
				</form>
			</Form>
		</div>
	);
}
