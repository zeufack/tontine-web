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
import { registerAction } from "#/lib/session-actions";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute("/register")({ component: RegisterPage });

const MIN_PASSWORD_LENGTH = 12;

function RegisterPage() {
	const navigate = useNavigate();
	const [submitError, setSubmitError] = useState<string | null>(null);

	const registerFormSchema = z
		.object({
			firstName: z.string().min(1, m.validation_required()),
			lastName: z.string().min(1, m.validation_required()),
			email: z
				.string()
				.min(1, m.validation_required())
				.email(m.validation_invalid_email()),
			phoneNumber: z.string().optional(),
			password: z
				.string()
				.min(
					MIN_PASSWORD_LENGTH,
					m.validation_password_too_short({ minLength: MIN_PASSWORD_LENGTH }),
				),
			confirmPassword: z.string().min(1, m.validation_required()),
		})
		.refine((data) => data.password === data.confirmPassword, {
			message: m.validation_passwords_dont_match(),
			path: ["confirmPassword"],
		});

	const form = useForm<z.infer<typeof registerFormSchema>>({
		resolver: zodResolver(registerFormSchema),
		defaultValues: {
			firstName: "",
			lastName: "",
			email: "",
			phoneNumber: "",
			password: "",
			confirmPassword: "",
		},
	});

	async function onSubmit(values: z.infer<typeof registerFormSchema>) {
		setSubmitError(null);
		try {
			await registerAction({
				data: {
					email: values.email,
					password: values.password,
					firstName: values.firstName,
					lastName: values.lastName,
					phoneNumber: values.phoneNumber || undefined,
				},
			});
			await navigate({ href: "/dashboard" });
		} catch {
			setSubmitError(m.register_error_generic());
		}
	}

	return (
		<div className="mx-auto flex max-w-sm flex-col gap-6 p-8">
			<h1 className="text-2xl font-bold">{m.register_title()}</h1>
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
									<Input autoComplete="given-name" {...field} />
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
									<Input autoComplete="family-name" {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{m.register_email_label()}</FormLabel>
								<FormControl>
									<Input type="email" autoComplete="email" {...field} />
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
									<Input type="tel" autoComplete="tel" {...field} />
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
								<FormLabel>{m.register_password_label()}</FormLabel>
								<FormControl>
									<Input
										type="password"
										autoComplete="new-password"
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>
					<FormField
						control={form.control}
						name="confirmPassword"
						render={({ field }) => (
							<FormItem>
								<FormLabel>{m.register_confirm_password_label()}</FormLabel>
								<FormControl>
									<Input
										type="password"
										autoComplete="new-password"
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
						{m.register_submit_cta()}
					</Button>
				</form>
			</Form>
		</div>
	);
}
