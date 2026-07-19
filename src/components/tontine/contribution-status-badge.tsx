import { Badge } from "#/components/ui/badge.tsx";
import type { ContributionStatus } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

const STATUS_VARIANT: Record<
	ContributionStatus,
	"warning" | "success" | "destructive" | "outline"
> = {
	pending: "warning",
	validated: "success",
	rejected: "destructive",
	failed: "destructive",
	refunded: "outline",
};

const STATUS_LABEL: Record<ContributionStatus, () => string> = {
	pending: m.contribution_status_pending,
	validated: m.contribution_status_validated,
	rejected: m.contribution_status_rejected,
	failed: m.contribution_status_failed,
	refunded: m.contribution_status_refunded,
};

export function ContributionStatusBadge({
	status,
}: {
	status: ContributionStatus;
}) {
	return (
		<Badge variant={STATUS_VARIANT[status]}>{STATUS_LABEL[status]()}</Badge>
	);
}
