import { useQuery } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

import { Amount } from "#/components/ui/amount.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import { platformQueries } from "#/features/platform-admin/api";
import type { PayoutStrategy } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute(
	"/_authenticated/_platformStaff/admin/tontines",
)({
	component: AdminTontinesPage,
});

const STRATEGY_LABEL: Record<PayoutStrategy, () => string> = {
	rotating: m.strategy_rotating_title,
	lottery: m.strategy_lottery_title,
	bidding: m.strategy_bidding_title,
};

function AdminTontinesPage() {
	const { data: tontines } = useQuery(platformQueries.tontines());
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return tontines ?? [];
		return (tontines ?? []).filter((tontine) =>
			tontine.name.toLowerCase().includes(query),
		);
	}, [tontines, search]);

	return (
		<div className="flex flex-col gap-4 p-8">
			<h1 className="text-2xl font-bold">{m.admin_tontines_title()}</h1>

			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder={m.admin_tontines_search_placeholder()}
				className="max-w-sm"
			/>

			{filtered.length === 0 ? (
				<p className="text-sm text-muted-foreground">
					{m.admin_tontines_empty()}
				</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{m.admin_tontines_table_name()}</TableHead>
							<TableHead>{m.admin_tontines_table_members()}</TableHead>
							<TableHead>{m.admin_tontines_table_pot()}</TableHead>
							<TableHead>{m.admin_tontines_table_strategy()}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.map((tontine) => (
							<TableRow key={tontine.id}>
								<TableCell className="font-medium">{tontine.name}</TableCell>
								<TableCell>{tontine.memberCount}</TableCell>
								<TableCell>
									<Amount value={tontine.potTotal} currency="XAF" />
								</TableCell>
								<TableCell>
									{STRATEGY_LABEL[tontine.payoutStrategy]()}
								</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
