import { CheckIcon } from "lucide-react";
import type * as React from "react";

import { cn } from "#/lib/utils.ts";

interface StepperProps extends React.ComponentProps<"div"> {
	/** Labels for each step, in order. */
	steps: string[];
	/** 0-indexed index of the currently active step. */
	currentStep: number;
	/**
	 * Text shown in the collapsed mobile variant, e.g. "Step 2 of 4" /
	 * "Étape 2 sur 4". Callers should pass localized copy — this only
	 * provides a plain English fallback for contexts (like the style guide)
	 * that don't need real i18n.
	 */
	mobileLabel?: string;
}

function Stepper({
	steps,
	currentStep,
	mobileLabel,
	className,
	...props
}: StepperProps) {
	return (
		<div data-slot="stepper" className={cn("w-full", className)} {...props}>
			<div className="sm:hidden">
				<p className="text-sm font-medium text-muted-foreground">
					{mobileLabel ?? `Step ${currentStep + 1} of ${steps.length}`}
				</p>
				<p className="mt-1 text-base font-semibold">{steps[currentStep]}</p>
			</div>

			<ol className="hidden items-start sm:flex">
				{steps.map((step, index) => {
					const isCompleted = index < currentStep;
					const isActive = index === currentStep;
					return (
						<li
							key={step}
							className={cn(
								"flex flex-1 flex-col items-center",
								index !== 0 &&
									"before:-ml-[calc(50%-1rem)] before:mr-[calc(50%-1rem)] before:mt-4 before:h-0.5 before:flex-1 before:self-start before:bg-border",
								index !== 0 && (isCompleted || isActive) && "before:bg-primary",
							)}
						>
							<span
								data-slot="stepper-circle"
								data-state={
									isCompleted ? "completed" : isActive ? "active" : "upcoming"
								}
								className={cn(
									"flex size-8 shrink-0 items-center justify-center rounded-full border-2 text-sm font-medium",
									isCompleted &&
										"border-primary bg-primary text-primary-foreground",
									isActive && "border-primary text-primary",
									!isCompleted &&
										!isActive &&
										"border-border text-muted-foreground",
								)}
							>
								{isCompleted ? <CheckIcon className="size-4" /> : index + 1}
							</span>
							<span
								className={cn(
									"mt-2 text-center text-xs font-medium",
									isActive ? "text-foreground" : "text-muted-foreground",
								)}
							>
								{step}
							</span>
						</li>
					);
				})}
			</ol>
		</div>
	);
}

export { Stepper };
