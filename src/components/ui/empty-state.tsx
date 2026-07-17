import type { LucideIcon } from "lucide-react";

import { cn } from "#/lib/utils.ts";

type EmptyStateProps = {
	icon?: LucideIcon;
	title: string;
	description?: string;
	action?: React.ReactNode;
	className?: string;
};

function EmptyState({
	icon: Icon,
	title,
	description,
	action,
	className,
}: EmptyStateProps) {
	return (
		<div
			className={cn(
				"flex flex-col items-center gap-2 rounded-xl border border-dashed border-border px-6 py-12 text-center",
				className,
			)}
		>
			{Icon ? <Icon className="mb-2 size-8 text-muted-foreground" /> : null}
			<p className="text-lg font-semibold text-foreground">{title}</p>
			{description ? (
				<p className="max-w-sm text-sm text-muted-foreground">{description}</p>
			) : null}
			{action ? <div className="mt-4">{action}</div> : null}
		</div>
	);
}

export { EmptyState };
