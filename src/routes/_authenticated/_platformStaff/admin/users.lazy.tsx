import { useQuery } from "@tanstack/react-query";
import { createLazyFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";

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
import { m } from "#/paraglide/messages";

export const Route = createLazyFileRoute(
	"/_authenticated/_platformStaff/admin/users",
)({
	component: AdminUsersPage,
});

function AdminUsersPage() {
	const { data: users } = useQuery(platformQueries.users());
	const [search, setSearch] = useState("");

	const filtered = useMemo(() => {
		const query = search.trim().toLowerCase();
		if (!query) return users ?? [];
		return (users ?? []).filter(
			(user) =>
				user.name.toLowerCase().includes(query) ||
				user.email.toLowerCase().includes(query),
		);
	}, [users, search]);

	return (
		<div className="flex flex-col gap-4 p-8">
			<h1 className="text-2xl font-bold">{m.admin_users_title()}</h1>

			<Input
				value={search}
				onChange={(event) => setSearch(event.target.value)}
				placeholder={m.admin_users_search_placeholder()}
				className="max-w-sm"
			/>

			{filtered.length === 0 ? (
				<p className="text-sm text-muted-foreground">{m.admin_users_empty()}</p>
			) : (
				<Table>
					<TableHeader>
						<TableRow>
							<TableHead>{m.admin_users_table_name()}</TableHead>
							<TableHead>{m.admin_users_table_email()}</TableHead>
							<TableHead>{m.admin_users_table_tontine_count()}</TableHead>
						</TableRow>
					</TableHeader>
					<TableBody>
						{filtered.map((user) => (
							<TableRow key={user.id}>
								<TableCell className="font-medium">{user.name}</TableCell>
								<TableCell>{user.email}</TableCell>
								<TableCell>{user.tontineCount}</TableCell>
							</TableRow>
						))}
					</TableBody>
				</Table>
			)}
		</div>
	);
}
