import { Badge } from "#/components/ui/badge.tsx";
import type { TontineStatus } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

const STATUS_VARIANT: Record<
	TontineStatus,
	"secondary" | "success" | "warning" | "outline" | "destructive"
> = {
	draft: "secondary",
	active: "success",
	paused: "warning",
	completed: "outline",
	cancelled: "destructive",
};

const STATUS_LABEL: Record<TontineStatus, () => string> = {
	draft: m.tontine_status_draft,
	active: m.tontine_status_active,
	paused: m.tontine_status_paused,
	completed: m.tontine_status_completed,
	cancelled: m.tontine_status_cancelled,
};

export function TontineStatusBadge({ status }: { status: TontineStatus }) {
	return (
		<Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]()}</Badge>
	);
}
