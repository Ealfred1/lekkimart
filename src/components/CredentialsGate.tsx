"use client";

import { useState } from "react";
import { useCredentialsStore } from "@/lib/store";

export function CredentialsGate() {
  const setCredentials = useCredentialsStore((s) => s.setCredentials);
  const [merchantReference, setMerchantReference] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [showKey, setShowKey] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!merchantReference.trim() || !secretKey.trim()) {
      setError("Both fields are required.");
      return;
    }
    setCredentials({ merchantReference: merchantReference.trim(), secretKey: secretKey.trim() });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center bg-gray-50 px-4 py-10">
      <div className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-sm ring-1 ring-gray-100">
        <h1 className="text-xl font-bold text-gray-900">Connect your Chowdeck store</h1>
        <p className="mt-1 text-sm text-gray-500">
          Find these in Chowdeck Dashboard → Settings → Developers. They&apos;re stored only on this
          device.
        </p>

        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="merchantReference">
              Merchant reference
            </label>
            <input
              id="merchantReference"
              className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
              placeholder="e.g. merchant_ab12cd"
              value={merchantReference}
              onChange={(e) => setMerchantReference(e.target.value)}
              autoComplete="off"
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700" htmlFor="secretKey">
              API secret key
            </label>
            <div className="relative">
              <input
                id="secretKey"
                type={showKey ? "text" : "password"}
                className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-16 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
                placeholder="sk_live_..."
                value={secretKey}
                onChange={(e) => setSecretKey(e.target.value)}
                autoComplete="off"
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

          {error && <p className="text-sm text-red-600">{error}</p>}

          <button
            type="submit"
            className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
          >
            Continue
          </button>
        </form>
      </div>
    </div>
  );
}
