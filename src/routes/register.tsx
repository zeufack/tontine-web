import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/register")({ component: RegisterPage });

function RegisterPage() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold">Create an account</h1>
			<p className="mt-2 text-muted-foreground">
				Registration form placeholder — wired up in a later pass.
			</p>
		</div>
	);
}
