"use client";

import { StepperNav } from "@/components/StepperNav";
import { SettingsButton } from "@/components/SettingsButton";
import { UploadCsvStep } from "@/components/steps/UploadCsvStep";
import { ReviewStep } from "@/components/steps/ReviewStep";
import { PhotosStep } from "@/components/steps/PhotosStep";
import { SendStep } from "@/components/steps/SendStep";
import { ResultsStep } from "@/components/steps/ResultsStep";
import { useBatchStore } from "@/lib/store";

export function Wizard() {
  const step = useBatchStore((s) => s.step);

  return (
    <div className="min-h-dvh bg-gray-50">
      <header className="flex items-center justify-between border-b border-gray-100 bg-white">
        <div className="px-4 py-3">
          <p className="text-sm font-bold text-orange-600">Chowdeck Bulk Uploader</p>
        </div>
        <div className="px-2">
          <SettingsButton />
        </div>
      </header>

      <div className="border-b border-gray-100 bg-white">
        <StepperNav current={step} />
      </div>

      <main className="pb-12">
        {step === "csv" && <UploadCsvStep />}
        {step === "review" && <ReviewStep />}
        {step === "photos" && <PhotosStep />}
        {step === "send" && <SendStep />}
        {step === "results" && <ResultsStep />}
      </main>
    </div>
  );
}
