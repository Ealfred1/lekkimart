"use client";

import { useRef } from "react";
import { useBatchStore } from "@/lib/store";
import type { ImageItem } from "@/lib/types";

export function PhotosStep() {
  const rows = useBatchStore((s) => s.rows);
  const images = useBatchStore((s) => s.images);
  const addImages = useBatchStore((s) => s.addImages);
  const removeImage = useBatchStore((s) => s.removeImage);
  const setStep = useBatchStore((s) => s.setStep);

  const totalPhotos = Object.values(images).reduce((sum, list) => sum + list.length, 0);

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Add photos</h1>
        <p className="mt-1 text-sm text-gray-500">
          Optional, but products with photos sell better. Tap a card to add one or more photos.
        </p>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => (
          <ProductPhotoCard
            key={row.reference}
            name={row.name}
            price={row.price}
            category={row.category}
            images={images[row.reference] ?? []}
            onAdd={(files) => {
              const items: ImageItem[] = files.map((file) => ({
                id: `${row.reference}-${crypto.randomUUID()}`,
                file,
                previewUrl: URL.createObjectURL(file),
                status: "idle",
                progress: 0,
              }));
              addImages(row.reference, items);
            }}
            onRemove={(imageId) => removeImage(row.reference, imageId)}
          />
        ))}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-2 flex gap-3 bg-gray-50/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => setStep("review")}
          className="flex-1 rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-700 active:bg-gray-100"
        >
          Back
        </button>
        <button
          onClick={() => setStep("send")}
          className="flex-[2] rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
        >
          {totalPhotos > 0 ? `Continue with ${totalPhotos} photo${totalPhotos === 1 ? "" : "s"} →` : "Skip photos →"}
        </button>
      </div>
    </div>
  );
}

function ProductPhotoCard({
  name,
  price,
  category,
  images,
  onAdd,
  onRemove,
}: {
  name: string;
  price: string;
  category: string;
  images: ImageItem[];
  onAdd: (files: File[]) => void;
  onRemove: (imageId: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  return (
    <div className="rounded-2xl border border-gray-200 bg-white p-4">
      <div className="flex items-baseline justify-between gap-2">
        <p className="truncate font-semibold text-gray-900">{name || "Untitled product"}</p>
        <p className="shrink-0 text-sm font-medium text-gray-500">₦{price || "0"}</p>
      </div>
      <p className="text-xs text-gray-400">{category}</p>

      <div className="mt-3 flex flex-wrap gap-2">
        {images.map((img) => (
          <div key={img.id} className="relative h-20 w-20 overflow-hidden rounded-lg bg-gray-100">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.previewUrl} alt="" className="h-full w-full object-cover" />
            <button
              onClick={() => onRemove(img.id)}
              aria-label="Remove photo"
              className="absolute right-1 top-1 flex h-5 w-5 items-center justify-center rounded-full bg-black/60 text-xs text-white"
            >
              ✕
            </button>
          </div>
        ))}

        <button
          onClick={() => inputRef.current?.click()}
          className="flex h-20 w-20 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-gray-400 active:bg-gray-50"
        >
          <span className="text-lg leading-none">+</span>
          <span className="text-[10px]">Add photo</span>
        </button>
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={(e) => {
            const files = Array.from(e.target.files ?? []);
            if (files.length) onAdd(files);
            e.target.value = "";
          }}
        />
      </div>
    </div>
  );
}
