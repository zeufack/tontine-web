import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { createFileRoute } from "@tanstack/react-router";
import {
	type ColumnDef,
	flexRender,
	getCoreRowModel,
	getSortedRowModel,
	type SortingState,
	useReactTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

import { ParticipantStatusBadge } from "#/components/tontine/participant-status-badge.tsx";
import { Avatar, AvatarFallback } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "#/components/ui/card.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	activateMember,
	type Member,
	memberQueries,
	suspendMember,
} from "#/features/members/api";
import { useTontineRole } from "#/features/tontines/use-tontine-role";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/members",
)({
	component: MembersPage,
});

function initials(name: string): string {
	return name
		.split(" ")
		.filter(Boolean)
		.slice(0, 2)
		.map((part) => part[0]?.toUpperCase())
		.join("");
}

function SortableHeader({
	label,
	sorted,
	onClick,
}: {
	label: string;
	sorted: false | "asc" | "desc";
	onClick: () => void;
}) {
	const Icon =
		sorted === "asc" ? ArrowUp : sorted === "desc" ? ArrowDown : ArrowUpDown;
	return (
		<button
			type="button"
			onClick={onClick}
			className="flex items-center gap-1 font-medium"
		>
			{label}
			<Icon className="size-3.5 text-muted-foreground" />
		</button>
	);
}

function MembersPage() {
	const { tontineId } = Route.useParams();
	// `member:manage` is only provable today for the tontine creator — see
	// permissions.ts's documented gap (no endpoint exposes TontineAdministrator
	// role assignments, zeufack/totine#17).
	const { isAdmin } = useTontineRole();
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);

	const { data: members } = useQuery(memberQueries.list(tontineId));

	async function invalidateMembers() {
		await queryClient.invalidateQueries({
			queryKey: ["tontine", tontineId, "members"],
		});
	}

	const activateMutation = useMutation({
		mutationFn: activateMember,
		onSuccess: invalidateMembers,
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.members_action_error(),
			);
		},
	});

	const suspendMutation = useMutation({
		mutationFn: suspendMember,
		onSuccess: invalidateMembers,
		onError: (error) => {
			toast.error(
				error instanceof Error ? error.message : m.members_action_error(),
			);
		},
	});

	const pendingMembers = useMemo(
		() => (members ?? []).filter((member) => member.status === "pending"),
		[members],
	);

	const columns = useMemo<ColumnDef<Member>[]>(() => {
		const base: ColumnDef<Member>[] = [
			{
				id: "name",
				accessorKey: "name",
				header: ({ column }) => (
					<SortableHeader
						label={m.members_table_member()}
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) => (
					<div className="flex items-center gap-2">
						<Avatar>
							<AvatarFallback>{initials(row.original.name)}</AvatarFallback>
						</Avatar>
						<div className="flex flex-col">
							<span className="font-medium">{row.original.name}</span>
							<span className="text-xs text-muted-foreground">
								{row.original.email}
							</span>
						</div>
					</div>
				),
			},
			{
				id: "status",
				accessorKey: "status",
				header: ({ column }) => (
					<SortableHeader
						label={m.members_table_status()}
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) => (
					<ParticipantStatusBadge status={row.original.status} />
				),
			},
			{
				id: "joinedAt",
				accessorKey: "joinedAt",
				header: ({ column }) => (
					<SortableHeader
						label={m.members_table_joined()}
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) =>
					row.original.joinedAt
						? new Date(row.original.joinedAt).toLocaleDateString()
						: "—",
			},
		];

		if (isAdmin) {
			base.push({
				id: "actions",
				header: () => m.members_table_actions(),
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex justify-end gap-2">
						{row.original.status === "active" && (
							<Button
								size="sm"
								variant="outline"
								disabled={suspendMutation.isPending}
								onClick={() => suspendMutation.mutate(row.original.id)}
							>
								{m.members_suspend_cta()}
							</Button>
						)}
					</div>
				),
			});
		}

		return base;
	}, [isAdmin, suspendMutation]);

	const table = useReactTable({
		data: members ?? [],
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	return (
		<div className="flex flex-col gap-6">
			<h2 className="text-xl font-semibold">{m.members_title()}</h2>

			{isAdmin && pendingMembers.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>{m.members_pending_section_title()}</CardTitle>
						<CardDescription>
							{m.members_pending_section_description()}
						</CardDescription>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{pendingMembers.map((member) => (
							<div
								key={member.id}
								className="flex items-center justify-between rounded-lg border px-3 py-2"
							>
								<div className="flex items-center gap-2">
									<Avatar>
										<AvatarFallback>{initials(member.name)}</AvatarFallback>
									</Avatar>
									<div className="flex flex-col">
										<span className="font-medium">{member.name}</span>
										<span className="text-xs text-muted-foreground">
											{member.email}
										</span>
									</div>
								</div>
								<Button
									size="sm"
									disabled={activateMutation.isPending}
									onClick={() => activateMutation.mutate(member.id)}
								>
									{m.members_approve_cta()}
								</Button>
							</div>
						))}
					</CardContent>
				</Card>
			)}

			<Table>
				<TableHeader>
					{table.getHeaderGroups().map((headerGroup) => (
						<TableRow key={headerGroup.id}>
							{headerGroup.headers.map((header) => (
								<TableHead key={header.id}>
									{header.isPlaceholder
										? null
										: flexRender(
												header.column.columnDef.header,
												header.getContext(),
											)}
								</TableHead>
							))}
						</TableRow>
					))}
				</TableHeader>
				<TableBody>
					{table.getRowModel().rows.map((row) => (
						<TableRow key={row.id}>
							{row.getVisibleCells().map((cell) => (
								<TableCell key={cell.id}>
									{flexRender(cell.column.columnDef.cell, cell.getContext())}
								</TableCell>
							))}
						</TableRow>
					))}
				</TableBody>
			</Table>
		</div>
	);
}
