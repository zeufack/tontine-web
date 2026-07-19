import { createFileRoute } from "@tanstack/react-router";

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
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold">Log in</h1>
			<p className="mt-2 text-muted-foreground">
				Login form placeholder — Better Auth email/password + Google wiring
				comes in a later pass.
			</p>
		</div>
	);
}
