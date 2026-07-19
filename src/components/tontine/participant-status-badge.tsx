import { Badge } from "#/components/ui/badge.tsx";
import type { ParticipantStatus } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

const STATUS_VARIANT: Record<
	ParticipantStatus,
	"warning" | "success" | "destructive" | "outline" | "secondary"
> = {
	pending: "warning",
	active: "success",
	suspended: "destructive",
	withdrawn: "outline",
	completed: "secondary",
};

const STATUS_LABEL: Record<ParticipantStatus, () => string> = {
	pending: m.member_status_pending,
	active: m.member_status_active,
	suspended: m.member_status_suspended,
	withdrawn: m.member_status_withdrawn,
	completed: m.member_status_completed,
};

export function ParticipantStatusBadge({
	status,
}: {
	status: ParticipantStatus;
}) {
	return (
		<Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]()}</Badge>
	);
}
