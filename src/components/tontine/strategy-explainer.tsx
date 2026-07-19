import { TriangleAlertIcon } from "lucide-react";
import type { PayoutStrategy } from "#/lib/mock-data/schemas";
import { m } from "#/paraglide/messages";

const STRATEGY_COPY: Record<
	PayoutStrategy,
	{ title: () => string; description: () => string }
> = {
	rotating: {
		title: m.strategy_rotating_title,
		description: m.strategy_rotating_description,
	},
	lottery: {
		title: m.strategy_lottery_title,
		description: m.strategy_lottery_description,
	},
	bidding: {
		title: m.strategy_bidding_title,
		description: m.strategy_bidding_description,
	},
};

// Only "rotating" is actually wired to live cycle logic on the backend today
// (see DESIGN.md §11) — lottery/bidding are shown so the flow can be
// previewed, but need a visible caveat so it isn't misleading.
const LIVE_STRATEGIES: PayoutStrategy[] = ["rotating"];

export function StrategyExplainer({ strategy }: { strategy: PayoutStrategy }) {
	const copy = STRATEGY_COPY[strategy];
	const isFullyLive = LIVE_STRATEGIES.includes(strategy);

	return (
		<div className="flex flex-col gap-1">
			<span className="font-medium">{copy.title()}</span>
			<span className="text-sm text-muted-foreground">
				{copy.description()}
			</span>
			{!isFullyLive && (
				<span className="mt-1 flex items-center gap-1 text-xs text-warning">
					<TriangleAlertIcon className="size-3.5" />
					{m.strategy_not_fully_live_note()}
				</span>
			)}
		</div>
	);
}
