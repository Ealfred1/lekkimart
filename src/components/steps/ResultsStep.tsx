"use client";

import { useState } from "react";
import { buildChowdeckItem } from "@/lib/chowdeck";
import { useBatchStore, useCredentialsStore } from "@/lib/store";
import type { ChowdeckItem, UploadApiResponse } from "@/lib/types";

export function ResultsStep() {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const results = useBatchStore((s) => s.results);
  const setResults = useBatchStore((s) => s.setResults);
  const setStep = useBatchStore((s) => s.setStep);
  const reset = useBatchStore((s) => s.reset);
  const credentials = useCredentialsStore((s) => s.credentials);
  const markUploaded = useCredentialsStore((s) => s.markUploaded);

  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  if (!results) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-sm text-gray-500">
        Nothing to show yet.{" "}
        <button className="text-orange-600 underline" onClick={() => setStep("csv")}>
          Start a new batch
        </button>
        .
      </div>
    );
  }

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);
  const failedRows = rows.filter((r) => failed.some((f) => f.reference === r.reference));

  async function retryFailed() {
    if (!credentials || !results || failedRows.length === 0) return;
    setRetrying(true);
    setRetryError(null);
    try {
      // Retrying a subset must never use the full-sync bulk endpoint — that would
      // deactivate every other live item. Always upsert individually here.
      const items: ChowdeckItem[] = failedRows.map((row) => buildChowdeckItem(row, images[row.reference] ?? []));
      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantReference: credentials.merchantReference,
          secretKey: credentials.secretKey,
          mode: "upsert",
          items,
        }),
      });
      const data: UploadApiResponse = await res.json();
      if (!res.ok && !data.results?.length) {
        throw new Error(data.message || "Retry failed");
      }
      markUploaded();

      // Merge retry results back into the full result set.
      const merged = results.map((r) => data.results.find((nr) => nr.reference === r.reference) ?? r);
      setResults(merged, false);
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed. Please try again.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
      <div className="rounded-2xl bg-white p-5 text-center ring-1 ring-gray-100">
        <p className="text-2xl">{failed.length === 0 ? "🎉" : "⚠️"}</p>
        <h1 className="mt-1 text-xl font-bold text-gray-900">
          {succeeded.length} uploaded, {failed.length} failed
        </h1>
        <p className="mt-1 text-sm text-gray-500">
          {failed.length === 0
            ? "Everything made it to Chowdeck."
            : "Fix and retry the failed items below — nothing else will be touched."}
        </p>
      </div>

      {retryError && <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{retryError}</div>}

      {failedRows.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="text-sm font-semibold text-gray-700">Failed items</h2>
          {failedRows.map((row) => {
            const message = failed.find((f) => f.reference === row.reference)?.message;
            return (
              <div key={row.reference} className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-gray-900">{row.name}</p>
                  <p className="text-sm text-gray-500">₦{row.price}</p>
                </div>
                {message && <p className="mt-1 text-sm text-red-700">{message}</p>}
                <button
                  onClick={() => setStep("review")}
                  className="mt-2 text-xs font-semibold text-orange-600 underline"
                >
                  Edit this product
                </button>
              </div>
            );
          })}

          <button
            onClick={retryFailed}
            disabled={retrying}
            className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white disabled:opacity-60 active:bg-orange-700"
          >
            {retrying ? "Retrying…" : `Retry failed only (${failedRows.length})`}
          </button>
        </div>
      )}

      <button
        onClick={() => {
          reset();
        }}
        className="w-full rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-700 active:bg-gray-100"
      >
        Start a new batch
      </button>
    </div>
  );
}
