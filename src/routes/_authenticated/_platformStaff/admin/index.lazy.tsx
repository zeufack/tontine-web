import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute } from "@tanstack/react-router";

import { Amount } from "#/components/ui/amount.tsx";
import {
	Card,
	CardContent,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import { Skeleton } from "#/components/ui/skeleton.tsx";
import { platformQueries } from "#/features/platform-admin/api";
import { m } from "#/paraglide/messages";

export const Route = createLazyFileRoute(
	"/_authenticated/_platformStaff/admin/",
)({
	component: AdminOverviewPage,
});

function AdminOverviewPage() {
	const { data: stats } = useQuery(platformQueries.stats());

	return (
		<div className="flex flex-col gap-6 p-8">
			<h1 className="text-2xl font-bold">{m.admin_overview_title()}</h1>

			{!stats ? (
				<div className="grid gap-4 sm:grid-cols-3">
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
					<Skeleton className="h-28" />
				</div>
			) : (
				<div className="grid gap-4 sm:grid-cols-3">
					<Card>
						<CardHeader>
							<CardTitle className="text-sm text-muted-foreground">
								{m.admin_stat_total_tontines()}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-semibold">{stats.totalTontines}</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm text-muted-foreground">
								{m.admin_stat_total_users()}
							</CardTitle>
						</CardHeader>
						<CardContent>
							<p className="text-2xl font-semibold">{stats.totalUsers}</p>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-sm text-muted-foreground">
								{m.admin_stat_total_pot_value()}
							</CardTitle>
						</CardHeader>
						<CardContent>
							{/* Mock tontines are single-currency (XAF) today; PlatformStats
							has no currency breakdown, so a real multi-currency backend
							would need this aggregate reworked per-currency. */}
							<Amount
								value={stats.totalPotValue}
								currency="XAF"
								className="text-2xl"
							/>
						</CardContent>
					</Card>
				</div>
			)}
		</div>
	);
}
