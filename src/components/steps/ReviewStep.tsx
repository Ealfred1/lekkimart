"use client";

import { validateRow } from "@/lib/csv";
import { useBatchStore } from "@/lib/store";
import type { ProductRow } from "@/lib/types";

export function ReviewStep() {
  const rows = useBatchStore((s) => s.rows);
  const updateRow = useBatchStore((s) => s.updateRow);
  const setStep = useBatchStore((s) => s.setStep);

  const errorCount = rows.filter((r) => Object.keys(r.errors).length > 0).length;

  function patch(row: ProductRow, changes: Partial<ProductRow>) {
    const next = { ...row, ...changes };
    const errors = validateRow({ name: next.name, category: next.category, price: next.price });
    updateRow(row.reference, { ...changes, errors });
  }

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-lg px-4 py-10 text-center text-sm text-gray-500">
        No products loaded yet.{" "}
        <button className="text-orange-600 underline" onClick={() => setStep("csv")}>
          Go back and upload a CSV
        </button>
        .
      </div>
    );
  }

  return (
    <div className="mx-auto flex max-w-3xl flex-col gap-4 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Review your products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Fix anything that looks off. {rows.length} product{rows.length === 1 ? "" : "s"} loaded.
        </p>
      </div>

      {errorCount > 0 && (
        <div className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          {errorCount} row{errorCount === 1 ? "" : "s"} need{errorCount === 1 ? "s" : ""} a fix before you
          can continue.
        </div>
      )}

      {/* Column header — desktop only */}
      <div className="hidden grid-cols-[2fr_2fr_1.2fr_1fr_0.8fr] gap-3 px-4 text-xs font-semibold uppercase tracking-wide text-gray-400 sm:grid">
        <div>Name</div>
        <div>Description</div>
        <div>Category</div>
        <div>Price (₦)</div>
        <div>In stock</div>
      </div>

      <div className="flex flex-col gap-3">
        {rows.map((row) => {
          const hasError = Object.keys(row.errors).length > 0;
          return (
            <div
              key={row.reference}
              className={`grid grid-cols-1 gap-3 rounded-2xl border bg-white p-4 sm:grid-cols-[2fr_2fr_1.2fr_1fr_0.8fr] sm:items-start sm:gap-3 sm:p-3 ${
                hasError ? "border-red-300" : "border-gray-200"
              }`}
            >
              <Field label="Name" error={row.errors.name}>
                <input
                  className={inputClass(!!row.errors.name)}
                  value={row.name}
                  onChange={(e) => patch(row, { name: e.target.value })}
                  placeholder="Product name"
                />
              </Field>

              <Field label="Description">
                <input
                  className={inputClass(false)}
                  value={row.description}
                  onChange={(e) => patch(row, { description: e.target.value })}
                  placeholder="Optional"
                />
              </Field>

              <Field label="Category" error={row.errors.category}>
                <input
                  className={inputClass(!!row.errors.category)}
                  value={row.category}
                  onChange={(e) => patch(row, { category: e.target.value })}
                  placeholder="e.g. Drinks"
                />
              </Field>

              <Field label="Price (₦)" error={row.errors.price}>
                <input
                  className={inputClass(!!row.errors.price)}
                  value={row.price}
                  inputMode="decimal"
                  onChange={(e) => patch(row, { price: e.target.value })}
                  placeholder="0"
                />
              </Field>

              <Field label="In stock">
                <label className="flex items-center gap-2 py-2 text-sm text-gray-700 sm:justify-center">
                  <input
                    type="checkbox"
                    className="h-5 w-5 rounded border-gray-300 text-orange-600 focus:ring-orange-400"
                    checked={row.inStock}
                    onChange={(e) => patch(row, { inStock: e.target.checked })}
                  />
                  <span className="sm:hidden">In stock</span>
                </label>
              </Field>
            </div>
          );
        })}
      </div>

      <div className="sticky bottom-0 -mx-4 mt-2 flex gap-3 bg-gray-50/95 px-4 py-3 backdrop-blur">
        <button
          onClick={() => setStep("csv")}
          className="flex-1 rounded-xl border border-gray-300 py-3.5 text-base font-semibold text-gray-700 active:bg-gray-100"
        >
          Back
        </button>
        <button
          disabled={errorCount > 0}
          onClick={() => setStep("photos")}
          className="flex-[2] rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white disabled:cursor-not-allowed disabled:bg-gray-300 active:bg-orange-700"
        >
          Continue to photos →
        </button>
      </div>
    </div>
  );
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) {
  return (
    <div>
      <span className="mb-1 block text-xs font-medium text-gray-500 sm:hidden">{label}</span>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function inputClass(hasError: boolean) {
  return `w-full rounded-lg border px-3 py-2.5 text-sm focus:outline-none focus:ring-2 ${
    hasError
      ? "border-red-300 focus:ring-red-200"
      : "border-gray-200 focus:border-orange-500 focus:ring-orange-100"
  }`;
}
