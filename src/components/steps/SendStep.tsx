"use client";

import { useEffect, useMemo, useState } from "react";
import { uploadImage } from "@/lib/cloudinary";
import { buildChowdeckItem } from "@/lib/chowdeck";
import { buildGlovoItem } from "@/lib/glovo";
import { useBatchStore, useCredentialsStore } from "@/lib/store";
import type { ChowdeckItem, GlovoCatalogItem, ImageItem, ItemResult, UploadApiResponse } from "@/lib/types";

type ChowdeckPhase = "idle" | "confirm-first-sync" | "uploading-images" | "sending" | "error";
type GlovoPhase = "idle" | "uploading-images" | "sending" | "error";

export function SendStep() {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const setStep = useBatchStore((s) => s.setStep);
  const results = useBatchStore((s) => s.results);
  const glovoResults = useBatchStore((s) => s.glovoResults);

  const chowdeckCredentials = useCredentialsStore((s) => s.credentials);
  const glovoCredentials = useCredentialsStore((s) => s.glovoCredentials);

  const totalImages = useMemo(
    () => Object.values(images).reduce((sum, list) => sum + list.length, 0),
    [images]
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ready to send</h1>
        <p className="mt-1 text-sm text-gray-500">
          {rows.length} product{rows.length === 1 ? "" : "s"} · {totalImages} photo
          {totalImages === 1 ? "" : "s"}
        </p>
      </div>

      {chowdeckCredentials ? (
        <ChowdeckSendCard />
      ) : (
        <DisconnectedCard platform="Chowdeck" />
      )}

      {glovoCredentials ? (
        <GlovoSendCard />
      ) : (
        <DisconnectedCard platform="Glovo" />
      )}

      <button
        onClick={() => setStep("photos")}
        className="w-full rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-700 active:bg-gray-100"
      >
        Back
      </button>

      {(results || glovoResults) && (
        <button
          onClick={() => setStep("results")}
          className="w-full rounded-xl bg-gray-900 py-3.5 text-base font-semibold text-white active:bg-gray-800"
        >
          View results →
        </button>
      )}
    </div>
  );
}

function DisconnectedCard({ platform }: { platform: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-gray-300 bg-gray-50 p-4 text-sm text-gray-500">
      {platform} isn&apos;t connected. Add credentials in Settings to send there too.
    </div>
  );
}

function ChowdeckSendCard() {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const updateImage = useBatchStore((s) => s.updateImage);
  const setResults = useBatchStore((s) => s.setResults);

  const credentials = useCredentialsStore((s) => s.credentials);
  const hasUploadedBefore = useCredentialsStore((s) => s.hasUploadedBefore);
  const markUploaded = useCredentialsStore((s) => s.markUploaded);

  const [phase, setPhase] = useState<ChowdeckPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState(0);
  const [lastSummary, setLastSummary] = useState<{ ok: number; failed: number } | null>(null);

  const isBusy = phase === "uploading-images" || phase === "sending";

  async function runUpload() {
    if (!credentials) return;
    setErrorMessage(null);
    setLastSummary(null);
    setPhase("uploading-images");
    setImageProgress(0);

    try {
      const uploadedImagesByRef = await uploadAllImages(images, updateImage, setImageProgress);

      setPhase("sending");
      const items: ChowdeckItem[] = rows.map((row) => buildChowdeckItem(row, uploadedImagesByRef[row.reference] ?? []));

      const mode: "bulk" | "upsert" = hasUploadedBefore ? "upsert" : "bulk";

      const res = await fetch("/api/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          merchantReference: credentials.merchantReference,
          secretKey: credentials.secretKey,
          mode,
          items,
        }),
      });
      const data: UploadApiResponse = await res.json();

      if (!res.ok && !data.results?.length) {
        throw new Error(data.message || "Upload failed");
      }

      markUploaded();
      setResults(data.results, true);
      setLastSummary(summarize(data.results));
      setPhase("idle");
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong sending to Chowdeck.");
    }
  }

  function handleUploadClick() {
    if (!hasUploadedBefore) {
      setPhase("confirm-first-sync");
      return;
    }
    runUpload();
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900">Chowdeck</p>

      {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
      {lastSummary && (
        <p className="mt-2 text-sm text-gray-600">
          Last send: {lastSummary.ok} uploaded, {lastSummary.failed} failed.
        </p>
      )}

      {isBusy ? (
        <ProgressBar label={phase === "uploading-images" ? "Uploading photos…" : "Sending to Chowdeck…"} percent={phase === "uploading-images" ? imageProgress : 100} />
      ) : (
        <button
          onClick={handleUploadClick}
          className="mt-3 w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
        >
          Upload to Chowdeck
        </button>
      )}

      {phase === "confirm-first-sync" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900">This is your first Chowdeck upload</h2>
            <p className="mt-2 text-sm text-gray-600">
              This will <span className="font-semibold">replace your entire Chowdeck menu</span> with
              what&apos;s in this batch. Anything currently live that isn&apos;t in this list will be
              deactivated. Every upload after this one will only add or update items, never remove them.
            </p>
            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={runUpload}
                className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
              >
                Yes, replace my menu
              </button>
              <button
                onClick={() => setPhase("idle")}
                className="w-full rounded-xl py-3 text-sm font-medium text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function GlovoSendCard() {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const updateImage = useBatchStore((s) => s.updateImage);
  const setGlovoResults = useBatchStore((s) => s.setGlovoResults);
  const glovoCategories = useBatchStore((s) => s.glovoCategories);
  const setGlovoCategories = useBatchStore((s) => s.setGlovoCategories);
  const categoryMap = useBatchStore((s) => s.categoryMap);
  const setCategoryMapping = useBatchStore((s) => s.setCategoryMapping);

  const credentials = useCredentialsStore((s) => s.glovoCredentials);

  const [phase, setPhase] = useState<GlovoPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState(0);
  const [lastSummary, setLastSummary] = useState<{ ok: number; failed: number } | null>(null);

  const uniqueCategoryNames = useMemo(
    () => Array.from(new Set(rows.map((r) => r.category.trim()).filter(Boolean))),
    [rows]
  );

  useEffect(() => {
    if (!credentials || glovoCategories !== null) return;
    let cancelled = false;
    fetch("/api/glovo/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(credentials),
    })
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        if (data.error) throw new Error(data.error);
        setGlovoCategories(data.categories ?? []);
        setPhase("idle");
      })
      .catch((err) => {
        if (cancelled) return;
        setErrorMessage(err instanceof Error ? err.message : "Couldn't load Glovo categories.");
        setPhase("error");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [credentials]);

  const loadingCategories = Boolean(credentials) && glovoCategories === null && phase !== "error";
  const isBusy = loadingCategories || phase === "uploading-images" || phase === "sending";
  const allCategoriesMapped = uniqueCategoryNames.every((name) => categoryMap[name]);

  async function runUpload() {
    if (!credentials) return;
    setErrorMessage(null);
    setLastSummary(null);
    setPhase("uploading-images");
    setImageProgress(0);

    try {
      const uploadedImagesByRef = await uploadAllImages(images, updateImage, setImageProgress);

      setPhase("sending");
      const items: GlovoCatalogItem[] = rows.map((row) =>
        buildGlovoItem(row, uploadedImagesByRef[row.reference] ?? [], categoryMap[row.category.trim()])
      );

      const res = await fetch("/api/glovo/upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...credentials, items }),
      });
      const data: UploadApiResponse = await res.json();

      if (!res.ok && !data.results?.length) {
        throw new Error(data.message || "Upload failed");
      }

      setGlovoResults(data.results);
      setLastSummary(summarize(data.results));
      setPhase("idle");
    } catch (err) {
      setPhase("error");
      setErrorMessage(err instanceof Error ? err.message : "Something went wrong sending to Glovo.");
    }
  }

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <p className="font-semibold text-gray-900">Glovo</p>
      <p className="mt-0.5 text-xs text-gray-400">
        Unverified integration — Glovo credentials weren&apos;t available to test this against a real
        account. If something looks wrong, check <code>src/lib/glovo.ts</code>.
      </p>

      {errorMessage && <p className="mt-2 text-sm text-red-600">{errorMessage}</p>}
      {lastSummary && (
        <p className="mt-2 text-sm text-gray-600">
          Last send: {lastSummary.ok} uploaded, {lastSummary.failed} failed.
        </p>
      )}

      {glovoCategories && uniqueCategoryNames.length > 0 && (
        <div className="mt-3 flex flex-col gap-2">
          <p className="text-xs font-medium text-gray-500">Match each category to Glovo:</p>
          {uniqueCategoryNames.map((name) => (
            <div key={name} className="flex items-center justify-between gap-2 text-sm">
              <span className="truncate text-gray-700">{name}</span>
              <select
                className="rounded-lg border border-gray-200 bg-white px-2 py-1.5 text-sm"
                value={categoryMap[name] ?? ""}
                onChange={(e) => setCategoryMapping(name, e.target.value)}
              >
                <option value="">Choose…</option>
                {glovoCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
          ))}
          {glovoCategories.length === 0 && (
            <p className="text-xs text-amber-700">
              No categories came back from Glovo — double check the chain/vendor IDs in Settings.
            </p>
          )}
        </div>
      )}

      {isBusy ? (
        <ProgressBar
          label={
            loadingCategories
              ? "Loading Glovo categories…"
              : phase === "uploading-images"
                ? "Uploading photos…"
                : "Sending to Glovo…"
          }
          percent={phase === "uploading-images" ? imageProgress : loadingCategories ? 50 : 100}
        />
      ) : (
        <button
          onClick={runUpload}
          disabled={!glovoCategories || !allCategoriesMapped}
          className="mt-3 w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 active:bg-orange-700"
        >
          Upload to Glovo
        </button>
      )}
    </div>
  );
}

function ProgressBar({ label, percent }: { label: string; percent: number }) {
  return (
    <div className="mt-3">
      <p className="text-sm font-medium text-gray-700">{label}</p>
      <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div className="h-full rounded-full bg-orange-600 transition-all" style={{ width: `${percent}%` }} />
      </div>
    </div>
  );
}

function summarize(results: ItemResult[]): { ok: number; failed: number } {
  return { ok: results.filter((r) => r.success).length, failed: results.filter((r) => !r.success).length };
}

async function uploadAllImages(
  images: Record<string, ImageItem[]>,
  updateImage: (reference: string, imageId: string, patch: Partial<ImageItem>) => void,
  onOverallProgress: (percent: number) => void
): Promise<Record<string, ImageItem[]>> {
  const entries = Object.entries(images);
  const allImages = entries.flatMap(([reference, list]) => list.map((img) => ({ reference, img })));

  if (allImages.length === 0) {
    onOverallProgress(100);
    return images;
  }

  const progressByImageId = new Map<string, number>();
  const reportOverall = () => {
    const total = allImages.reduce((sum, { img }) => sum + (progressByImageId.get(img.id) ?? 0), 0);
    onOverallProgress(Math.round(total / allImages.length));
  };

  // Final state per image, built locally so the caller can construct payloads right
  // away without waiting on the (async) store re-render.
  const finalById = new Map<string, ImageItem>();

  await Promise.all(
    allImages.map(async ({ reference, img }) => {
      // Already uploaded (e.g. sent to one platform already) — reuse the URL
      // instead of uploading the same file to Cloudinary twice.
      if (img.status === "done" && img.uploadedUrl) {
        finalById.set(img.id, img);
        progressByImageId.set(img.id, 100);
        reportOverall();
        return;
      }

      updateImage(reference, img.id, { status: "uploading" });
      try {
        const url = await uploadImage(img.file, (pct) => {
          progressByImageId.set(img.id, pct);
          reportOverall();
        });
        finalById.set(img.id, { ...img, status: "done", uploadedUrl: url, progress: 100 });
        updateImage(reference, img.id, { status: "done", uploadedUrl: url, progress: 100 });
        progressByImageId.set(img.id, 100);
      } catch (err) {
        const message = err instanceof Error ? err.message : "Upload failed";
        finalById.set(img.id, { ...img, status: "error", error: message });
        updateImage(reference, img.id, { status: "error", error: message });
        progressByImageId.set(img.id, 100); // don't stall overall progress on one failed image
      }
      reportOverall();
    })
  );

  const result: Record<string, ImageItem[]> = {};
  for (const [reference, list] of entries) {
    result[reference] = list.map((img) => finalById.get(img.id) ?? img);
  }
  return result;
}
