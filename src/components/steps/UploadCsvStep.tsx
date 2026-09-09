"use client";

import { useCallback, useRef, useState } from "react";
import { downloadCsvTemplate, parseCsv } from "@/lib/csv";
import { useBatchStore } from "@/lib/store";

export function UploadCsvStep() {
  const setRows = useBatchStore((s) => s.setRows);
  const setStep = useBatchStore((s) => s.setStep);
  const existingRowCount = useBatchStore((s) => s.rows.length);
  const [isDragging, setIsDragging] = useState(false);
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(
    (file: File) => {
      setFileName(file.name);
      const reader = new FileReader();
      reader.onload = () => {
        const text = String(reader.result ?? "");
        const { rows, fileErrors } = parseCsv(text);
        setFileErrors(fileErrors);
        if (rows.length > 0) {
          setRows(rows);
        }
      };
      reader.onerror = () => setFileErrors(["Couldn't read that file. Please try again."]);
      reader.readAsText(file);
    },
    [setRows]
  );

  return (
    <div className="mx-auto flex max-w-lg flex-col gap-6 px-4 py-6">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Upload your products</h1>
        <p className="mt-1 text-sm text-gray-500">
          Drop in a CSV with your product names, categories and prices. You&apos;ll review and fix
          anything before it goes anywhere.
        </p>
      </div>

      <button
        onClick={downloadCsvTemplate}
        className="flex items-center justify-center gap-2 rounded-xl border border-orange-200 bg-orange-50 py-3.5 text-sm font-semibold text-orange-700 active:bg-orange-100"
      >
        ⬇ Download CSV template
      </button>

      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragging(false);
          const file = e.dataTransfer.files?.[0];
          if (file) handleFile(file);
        }}
        onClick={() => inputRef.current?.click()}
        className={`flex flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed px-6 py-12 text-center transition ${
          isDragging ? "border-orange-500 bg-orange-50" : "border-gray-300 bg-white"
        }`}
      >
        <div className="text-3xl">📄</div>
        <p className="text-sm font-medium text-gray-700">
          <span className="hidden sm:inline">Drag &amp; drop your CSV here, or </span>
          <span className="text-orange-600 underline">choose a file</span>
        </p>
        <p className="text-xs text-gray-400">.csv files only</p>
        <input
          ref={inputRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) handleFile(file);
            e.target.value = "";
          }}
        />
      </div>

      {fileName && (
        <div className="rounded-xl bg-gray-50 px-4 py-3 text-sm text-gray-600">
          Loaded <span className="font-medium text-gray-900">{fileName}</span>
        </div>
      )}

      {fileErrors.length > 0 && (
        <div className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700">
          <p className="font-medium">We had trouble reading part of this file:</p>
          <ul className="mt-1 list-inside list-disc">
            {fileErrors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {existingRowCount > 0 && (
        <button
          onClick={() => setStep("review")}
          className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
        >
          Continue with {existingRowCount} product{existingRowCount === 1 ? "" : "s"} →
        </button>
      )}
    </div>
  );
}
