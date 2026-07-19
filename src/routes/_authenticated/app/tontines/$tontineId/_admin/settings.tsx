import { createFileRoute } from "@tanstack/react-router";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/_admin/settings",
)({
	component: SettingsPage,
});

function SettingsPage() {
	return (
		<div>
			<h2 className="text-xl font-semibold">Settings</h2>
			<p className="mt-2 text-muted-foreground">
				Tontine config placeholder (admin-only): currency, contribution amount,
				strategy, RBAC.
			</p>
		</div>
	);
}
