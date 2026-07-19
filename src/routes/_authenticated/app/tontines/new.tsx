import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute("/_authenticated/app/tontines/new")({
	component: NewTontinePage,
});

function NewTontinePage() {
	return (
		<div className="p-8">
			<h1 className="text-2xl font-bold">Create a tontine</h1>
			<p className="mt-2 text-muted-foreground">
				Basics → payout strategy → invite members → review wizard placeholder.
			</p>
		</div>
	);
}
