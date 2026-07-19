import { zodResolver } from "@hookform/resolvers/zod";
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
import { useForm } from "react-hook-form";
import { z } from "zod";

import { ParticipantStatusBadge } from "#/components/tontine/participant-status-badge.tsx";
import { RoleBadge } from "#/components/tontine/role-badge.tsx";
import { Avatar, AvatarFallback } from "#/components/ui/avatar.tsx";
import { Button } from "#/components/ui/button.tsx";
import {
	Dialog,
	DialogContent,
	DialogFooter,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "#/components/ui/dialog.tsx";
import {
	Form,
	FormControl,
	FormField,
	FormItem,
	FormLabel,
	FormMessage,
} from "#/components/ui/form.tsx";
import { Input } from "#/components/ui/input.tsx";
import {
	Table,
	TableBody,
	TableCell,
	TableHead,
	TableHeader,
	TableRow,
} from "#/components/ui/table.tsx";
import {
	inviteMember,
	memberQueries,
	promoteMember,
	removeMember,
} from "#/features/members/api";
import { useTontineRole } from "#/features/tontines/use-tontine-role";
import type { Member } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

export const Route = createFileRoute(
	"/_authenticated/app/tontines/$tontineId/members",
)({
	component: MembersPage,
});

// Identifier is email-only today; structured the same pluggable way as the
// Create Tontine wizard's invite step so it can swap to phone later.
const inviteFormSchema = z.object({
	identifier: z.string().email(m.validation_invalid_email()),
});
type InviteFormValues = z.infer<typeof inviteFormSchema>;

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
	// isAdmin stands in for the real `member:manage` per-tontine permission
	// (DESIGN.md §4's 9-permission/7-role model) until that RBAC model exists
	// in the mock/API layer — same simplification as the Contributions tab's
	// validation queue.
	const { isAdmin } = useTontineRole();
	const queryClient = useQueryClient();
	const [sorting, setSorting] = useState<SortingState>([]);
	const [inviteOpen, setInviteOpen] = useState(false);
	const [removeTarget, setRemoveTarget] = useState<Member | null>(null);

	const { data: members } = useQuery(memberQueries.list(tontineId));

	async function invalidateMembers() {
		await queryClient.invalidateQueries({
			queryKey: ["tontine", tontineId, "members"],
		});
	}

	const inviteForm = useForm<InviteFormValues>({
		resolver: zodResolver(inviteFormSchema),
		defaultValues: { identifier: "" },
	});

	const inviteMutation = useMutation({
		mutationFn: (identifier: string) => inviteMember(tontineId, identifier),
		onSuccess: async () => {
			await invalidateMembers();
			inviteForm.reset();
			setInviteOpen(false);
		},
	});

	const promoteMutation = useMutation({
		mutationFn: (memberId: string) => promoteMember(tontineId, memberId),
		onSuccess: invalidateMembers,
	});

	const removeMutation = useMutation({
		mutationFn: (memberId: string) => removeMember(tontineId, memberId),
		onSuccess: async () => {
			await invalidateMembers();
			setRemoveTarget(null);
		},
	});

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
				id: "role",
				accessorKey: "role",
				header: ({ column }) => (
					<SortableHeader
						label={m.members_table_role()}
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) => <RoleBadge role={row.original.role} />,
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
				cell: ({ row }) => new Date(row.original.joinedAt).toLocaleDateString(),
			},
			{
				id: "contributionStreak",
				accessorKey: "contributionStreak",
				header: ({ column }) => (
					<SortableHeader
						label={m.members_table_streak()}
						sorted={column.getIsSorted()}
						onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
					/>
				),
				cell: ({ row }) =>
					m.members_streak_value({ count: row.original.contributionStreak }),
			},
		];

		if (isAdmin) {
			base.push({
				id: "actions",
				header: () => m.members_table_actions(),
				enableSorting: false,
				cell: ({ row }) => (
					<div className="flex justify-end gap-2">
						{row.original.role !== "admin" && (
							<Button
								size="sm"
								variant="outline"
								onClick={() => promoteMutation.mutate(row.original.id)}
							>
								{m.members_promote_cta()}
							</Button>
						)}
						<Button
							size="sm"
							variant="destructive"
							onClick={() => setRemoveTarget(row.original)}
						>
							{m.members_remove_cta()}
						</Button>
					</div>
				),
			});
		}

		return base;
	}, [isAdmin, promoteMutation]);

	const table = useReactTable({
		data: members ?? [],
		columns,
		state: { sorting },
		onSortingChange: setSorting,
		getCoreRowModel: getCoreRowModel(),
		getSortedRowModel: getSortedRowModel(),
	});

	function onInviteSubmit(values: InviteFormValues) {
		inviteMutation.mutate(values.identifier);
	}

	return (
		<div className="flex flex-col gap-4">
			<div className="flex items-center justify-between">
				<h2 className="text-xl font-semibold">{m.members_title()}</h2>
				{isAdmin && (
					<Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
						<DialogTrigger asChild>
							<Button size="sm">{m.members_invite_cta()}</Button>
						</DialogTrigger>
						<DialogContent>
							<DialogHeader>
								<DialogTitle>{m.members_invite_dialog_title()}</DialogTitle>
							</DialogHeader>
							<Form {...inviteForm}>
								<form
									onSubmit={inviteForm.handleSubmit(onInviteSubmit)}
									className="flex flex-col gap-4"
								>
									<FormField
										control={inviteForm.control}
										name="identifier"
										render={({ field }) => (
											<FormItem>
												<FormLabel>
													{m.members_invite_identifier_label()}
												</FormLabel>
												<FormControl>
													<Input type="email" {...field} />
												</FormControl>
												<FormMessage />
											</FormItem>
										)}
									/>
									<DialogFooter>
										<Button type="submit" disabled={inviteMutation.isPending}>
											{m.members_invite_submit_cta()}
										</Button>
									</DialogFooter>
								</form>
							</Form>
						</DialogContent>
					</Dialog>
				)}
			</div>

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

			<Dialog
				open={removeTarget !== null}
				onOpenChange={(open) => {
					if (!open) setRemoveTarget(null);
				}}
			>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>{m.members_remove_confirm_title()}</DialogTitle>
					</DialogHeader>
					<p className="text-sm text-muted-foreground">
						{removeTarget &&
							m.members_remove_confirm_description({
								name: removeTarget.name,
							})}
					</p>
					<DialogFooter>
						<Button
							variant="destructive"
							disabled={removeMutation.isPending}
							onClick={() =>
								removeTarget && removeMutation.mutate(removeTarget.id)
							}
						>
							{m.members_remove_confirm_cta()}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
