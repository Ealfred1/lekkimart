"use client";

import { useState } from "react";
import { useCredentialsStore, useBatchStore } from "@/lib/store";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const credentials = useCredentialsStore((s) => s.credentials);
  const setCredentials = useCredentialsStore((s) => s.setCredentials);
  const clearCredentials = useCredentialsStore((s) => s.clearCredentials);
  const resetBatch = useBatchStore((s) => s.reset);

  const [merchantReference, setMerchantReference] = useState(credentials?.merchantReference ?? "");
  const [secretKey, setSecretKey] = useState(credentials?.secretKey ?? "");
  const [showKey, setShowKey] = useState(false);

  function save() {
    if (!merchantReference.trim() || !secretKey.trim()) return;
    setCredentials({ merchantReference: merchantReference.trim(), secretKey: secretKey.trim() });
    setOpen(false);
  }

  function disconnect() {
    clearCredentials();
    resetBatch();
    setOpen(false);
  }

  return (
    <>
      <button
        aria-label="Settings"
        onClick={() => setOpen(true)}
        className="flex h-10 w-10 items-center justify-center rounded-full text-gray-500 hover:bg-gray-100 active:bg-gray-200"
      >
        <svg viewBox="0 0 24 24" fill="none" strokeWidth={1.8} stroke="currentColor" className="h-5 w-5">
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
          />
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      </button>

      {open && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center">
          <div className="w-full max-w-sm rounded-t-2xl bg-white p-6 shadow-lg sm:rounded-2xl">
            <h2 className="text-lg font-bold text-gray-900">Chowdeck credentials</h2>

            <div className="mt-4 space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">Merchant reference</label>
                <input
                  className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                  value={merchantReference}
                  onChange={(e) => setMerchantReference(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700">API secret key</label>
                <div className="relative">
                  <input
                    type={showKey ? "text" : "password"}
                    className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-16 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                  />
                  <button
                    type="button"
                    onClick={() => setShowKey((v) => !v)}
                    className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-gray-500"
                  >
                    {showKey ? "Hide" : "Show"}
                  </button>
                </div>
              </div>
            </div>

            <div className="mt-6 flex flex-col gap-2">
              <button
                onClick={save}
                className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
              >
                Save
              </button>
              <button
                onClick={disconnect}
                className="w-full rounded-xl border border-red-200 py-3.5 text-base font-semibold text-red-600 active:bg-red-50"
              >
                Disconnect &amp; clear batch
              </button>
              <button
                onClick={() => setOpen(false)}
                className="w-full rounded-xl py-3 text-sm font-medium text-gray-500"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
