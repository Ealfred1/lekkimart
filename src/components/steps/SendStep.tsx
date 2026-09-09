"use client";

import { useMemo, useState } from "react";
import { isCloudinaryConfigured, uploadImageToCloudinary } from "@/lib/cloudinary";
import { buildChowdeckItem } from "@/lib/chowdeck";
import { useBatchStore, useCredentialsStore } from "@/lib/store";
import type { ChowdeckItem, ImageItem, UploadApiResponse } from "@/lib/types";

type Phase = "idle" | "confirm-first-sync" | "uploading-images" | "sending" | "error";

export function SendStep() {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const updateImage = useBatchStore((s) => s.updateImage);
  const setStep = useBatchStore((s) => s.setStep);
  const setResults = useBatchStore((s) => s.setResults);

  const credentials = useCredentialsStore((s) => s.credentials);
  const hasUploadedBefore = useCredentialsStore((s) => s.hasUploadedBefore);
  const markUploaded = useCredentialsStore((s) => s.markUploaded);

  const [phase, setPhase] = useState<Phase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [imageProgress, setImageProgress] = useState(0);

  const totalImages = useMemo(
    () => Object.values(images).reduce((sum, list) => sum + list.length, 0),
    [images]
  );
  const cloudinaryReady = isCloudinaryConfigured();

  async function runUpload() {
    if (!credentials) return;
    setErrorMessage(null);
    setPhase("uploading-images");
    setImageProgress(0);

    try {
      const uploadedImagesByRef = await uploadAllImages(images, updateImage, setImageProgress, cloudinaryReady);

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
      setStep("results");
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

  const isBusy = phase === "uploading-images" || phase === "sending";

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-5 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Ready to send</h1>
        <p className="mt-1 text-sm text-gray-500">
          {rows.length} product{rows.length === 1 ? "" : "s"} · {totalImages} photo
          {totalImages === 1 ? "" : "s"}
        </p>
      </div>

      {!cloudinaryReady && totalImages > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Image hosting isn&apos;t configured yet, so photos will be skipped for this upload. See{" "}
          <code>.env.local.example</code>.
        </div>
      )}

      {phase === "error" && errorMessage && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">{errorMessage}</div>
      )}

      {isBusy && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4">
          <p className="text-sm font-medium text-gray-700">
            {phase === "uploading-images" ? "Uploading photos…" : "Sending to Chowdeck…"}
          </p>
          <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-gray-100">
            <div
              className="h-full rounded-full bg-orange-600 transition-all"
              style={{ width: `${phase === "uploading-images" ? imageProgress : 100}%` }}
            />
          </div>
          <p className="mt-2 text-xs text-gray-400">Keep this tab open — this can take a moment on slower connections.</p>
        </div>
      )}

      {!isBusy && (
        <button
          onClick={handleUploadClick}
          className="w-full rounded-xl bg-orange-600 py-4 text-base font-semibold text-white active:bg-orange-700"
        >
          Upload {rows.length} product{rows.length === 1 ? "" : "s"}
        </button>
      )}

      <button
        disabled={isBusy}
        onClick={() => setStep("photos")}
        className="w-full rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-700 disabled:opacity-50 active:bg-gray-100"
      >
        Back
      </button>

      {phase === "confirm-first-sync" && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4">
          <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-lg">
            <h2 className="text-lg font-bold text-gray-900">This is your first upload</h2>
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

async function uploadAllImages(
  images: Record<string, ImageItem[]>,
  updateImage: (reference: string, imageId: string, patch: Partial<ImageItem>) => void,
  onOverallProgress: (percent: number) => void,
  cloudinaryReady: boolean
): Promise<Record<string, ImageItem[]>> {
  const entries = Object.entries(images);
  const allImages = entries.flatMap(([reference, list]) => list.map((img) => ({ reference, img })));

  if (!cloudinaryReady || allImages.length === 0) {
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
      updateImage(reference, img.id, { status: "uploading" });
      try {
        const url = await uploadImageToCloudinary(img.file, (pct) => {
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
