"use client";

import { useState } from "react";
import { buildChowdeckItem } from "@/lib/chowdeck";
import { buildGlovoItem } from "@/lib/glovo";
import { useBatchStore, useCredentialsStore } from "@/lib/store";
import type { ChowdeckItem, GlovoCatalogItem, ItemResult, ProductRow, UploadApiResponse } from "@/lib/types";

export function ResultsStep() {
  const results = useBatchStore((s) => s.results);
  const glovoResults = useBatchStore((s) => s.glovoResults);
  const setStep = useBatchStore((s) => s.setStep);
  const reset = useBatchStore((s) => s.reset);

  if (!results && !glovoResults) {
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

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
      {results && <ChowdeckResults results={results} />}
      {glovoResults && <GlovoResults results={glovoResults} />}

      <button
        onClick={() => setStep("send")}
        className="w-full rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-700 active:bg-gray-100"
      >
        Back to send
      </button>
      <button
        onClick={reset}
        className="w-full rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-700 active:bg-gray-100"
      >
        Start a new batch
      </button>
    </div>
  );
}

function ChowdeckResults({ results }: { results: ItemResult[] }) {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const setResults = useBatchStore((s) => s.setResults);
  const setStep = useBatchStore((s) => s.setStep);
  const credentials = useCredentialsStore((s) => s.credentials);
  const markUploaded = useCredentialsStore((s) => s.markUploaded);

  const failedRows = getFailedRows(rows, results);

  return (
    <PlatformSummary
      platform="Chowdeck"
      results={results}
      failedRows={failedRows}
      onEdit={() => setStep("review")}
      // Retrying a subset must never use the full-sync bulk endpoint — that
      // would deactivate every other live item. Always upsert individually.
      onRetry={async () => {
        if (!credentials) throw new Error("Chowdeck isn't connected anymore.");
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
        if (!res.ok && !data.results?.length) throw new Error(data.message || "Retry failed");
        markUploaded();
        setResults(
          results.map((r) => data.results.find((nr) => nr.reference === r.reference) ?? r),
          false
        );
      }}
    />
  );
}

function GlovoResults({ results }: { results: ItemResult[] }) {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const setGlovoResults = useBatchStore((s) => s.setGlovoResults);
  const setStep = useBatchStore((s) => s.setStep);
  const categoryMap = useBatchStore((s) => s.categoryMap);
  const credentials = useCredentialsStore((s) => s.glovoCredentials);

  const failedRows = getFailedRows(rows, results);

  return (
    <PlatformSummary
      platform="Glovo"
      results={results}
      failedRows={failedRows}
      onEdit={() => setStep("review")}
      onRetry={async () => {
        if (!credentials) throw new Error("Glovo isn't connected anymore.");
        const items: GlovoCatalogItem[] = failedRows.map((row) =>
          buildGlovoItem(row, images[row.reference] ?? [], categoryMap[row.category.trim()])
        );
        const res = await fetch("/api/glovo/upload", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...credentials, items }),
        });
        const data: UploadApiResponse = await res.json();
        if (!res.ok && !data.results?.length) throw new Error(data.message || "Retry failed");
        setGlovoResults(results.map((r) => data.results.find((nr) => nr.reference === r.reference) ?? r));
      }}
    />
  );
}

function getFailedRows(rows: ProductRow[], results: ItemResult[]): ProductRow[] {
  const failedRefs = new Set(results.filter((r) => !r.success).map((r) => r.reference));
  return rows.filter((r) => failedRefs.has(r.reference));
}

function PlatformSummary({
  platform,
  results,
  failedRows,
  onEdit,
  onRetry,
}: {
  platform: string;
  results: ItemResult[];
  failedRows: ProductRow[];
  onEdit: () => void;
  onRetry: () => Promise<void>;
}) {
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);

  const succeeded = results.filter((r) => r.success);
  const failed = results.filter((r) => !r.success);

  async function handleRetry() {
    setRetrying(true);
    setRetryError(null);
    try {
      await onRetry();
    } catch (err) {
      setRetryError(err instanceof Error ? err.message : "Retry failed. Please try again.");
    } finally {
      setRetrying(false);
    }
  }

  return (
    <div className="rounded-2xl bg-white p-5 ring-1 ring-gray-100">
      <div className="text-center">
        <p className="text-2xl">{failed.length === 0 ? "🎉" : "⚠️"}</p>
        <h2 className="mt-1 text-lg font-bold text-gray-900">
          {platform}: {succeeded.length} uploaded, {failed.length} failed
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          {failed.length === 0
            ? `Everything made it to ${platform}.`
            : "Fix and retry the failed items below — nothing else will be touched."}
        </p>
      </div>

      {retryError && <div className="mt-3 rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{retryError}</div>}

      {failedRows.length > 0 && (
        <div className="mt-4 flex flex-col gap-3">
          {failedRows.map((row) => {
            const message = failed.find((f) => f.reference === row.reference)?.message;
            return (
              <div key={row.reference} className="rounded-xl border border-red-200 bg-red-50/40 p-4">
                <div className="flex items-baseline justify-between gap-2">
                  <p className="font-medium text-gray-900">{row.name}</p>
                  <p className="text-sm text-gray-500">₦{row.price}</p>
                </div>
                {message && <p className="mt-1 text-sm text-red-700">{message}</p>}
                <button onClick={onEdit} className="mt-2 text-xs font-semibold text-orange-600 underline">
                  Edit this product
                </button>
              </div>
            );
          })}

          <button
            onClick={handleRetry}
            disabled={retrying}
            className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white disabled:opacity-60 active:bg-orange-700"
          >
            {retrying ? "Retrying…" : `Retry failed only (${failedRows.length})`}
          </button>
        </div>
      )}
    </div>
  );
}
