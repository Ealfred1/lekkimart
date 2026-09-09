"use client";

import clsx from "clsx";
import type { WizardStep } from "@/lib/types";

const STEPS: { key: WizardStep; label: string }[] = [
  { key: "csv", label: "Upload CSV" },
  { key: "review", label: "Review" },
  { key: "photos", label: "Photos" },
  { key: "send", label: "Send" },
];

export function StepperNav({ current }: { current: WizardStep }) {
  const activeIndex = current === "results" ? STEPS.length : STEPS.findIndex((s) => s.key === current);

  return (
    <ol className="flex w-full items-center gap-1 px-4 py-3 sm:gap-2 sm:px-6">
      {STEPS.map((step, i) => {
        const state = i < activeIndex ? "done" : i === activeIndex ? "active" : "upcoming";
        return (
          <li key={step.key} className="flex flex-1 items-center gap-1 sm:gap-2">
            <div className="flex flex-1 flex-col items-center gap-1">
              <div
                className={clsx(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold sm:h-8 sm:w-8",
                  state === "done" && "bg-orange-600 text-white",
                  state === "active" && "bg-orange-600 text-white ring-4 ring-orange-100",
                  state === "upcoming" && "bg-gray-200 text-gray-500"
                )}
              >
                {state === "done" ? "✓" : i + 1}
              </div>
              <span
                className={clsx(
                  "hidden text-[11px] font-medium sm:block",
                  state === "upcoming" ? "text-gray-400" : "text-gray-700"
                )}
              >
                {step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={clsx("h-0.5 flex-1 rounded", i < activeIndex ? "bg-orange-600" : "bg-gray-200")} />
            )}
          </li>
        );
      })}
    </ol>
  );
}
