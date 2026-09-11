"use client";

import { useState } from "react";
import { useCredentialsStore, useBatchStore } from "@/lib/store";

type Tab = "chowdeck" | "glovo";

export function SettingsButton() {
  const [open, setOpen] = useState(false);
  const [tab, setTab] = useState<Tab>("chowdeck");

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
            <h2 className="text-lg font-bold text-gray-900">Store credentials</h2>

            <div className="mt-4 flex rounded-xl bg-gray-100 p-1">
              <button
                onClick={() => setTab("chowdeck")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                  tab === "chowdeck" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                Chowdeck
              </button>
              <button
                onClick={() => setTab("glovo")}
                className={`flex-1 rounded-lg py-2 text-sm font-semibold ${
                  tab === "glovo" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500"
                }`}
              >
                Glovo
              </button>
            </div>

            <div className="mt-4 max-h-[55vh] overflow-y-auto">
              {tab === "chowdeck" ? <ChowdeckFields onDone={() => setOpen(false)} /> : <GlovoFields onDone={() => setOpen(false)} />}
            </div>

            <button
              onClick={() => setOpen(false)}
              className="mt-2 w-full rounded-xl py-3 text-sm font-medium text-gray-500"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

function ChowdeckFields({ onDone }: { onDone: () => void }) {
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
    onDone();
  }

  function disconnect() {
    clearCredentials();
    resetBatch();
    onDone();
  }

  return (
    <div className="space-y-4">
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

      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={save}
          className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
        >
          Save
        </button>
        {credentials && (
          <button
            onClick={disconnect}
            className="w-full rounded-xl border border-red-200 py-3.5 text-base font-semibold text-red-600 active:bg-red-50"
          >
            Disconnect &amp; clear batch
          </button>
        )}
      </div>
    </div>
  );
}

function GlovoFields({ onDone }: { onDone: () => void }) {
  const glovoCredentials = useCredentialsStore((s) => s.glovoCredentials);
  const setGlovoCredentials = useCredentialsStore((s) => s.setGlovoCredentials);
  const clearGlovoCredentials = useCredentialsStore((s) => s.clearGlovoCredentials);

  const [clientId, setClientId] = useState(glovoCredentials?.clientId ?? "");
  const [clientSecret, setClientSecret] = useState(glovoCredentials?.clientSecret ?? "");
  const [chainId, setChainId] = useState(glovoCredentials?.chainId ?? "");
  const [vendorId, setVendorId] = useState(glovoCredentials?.vendorId ?? "");
  const [showSecret, setShowSecret] = useState(false);

  function save() {
    if (!clientId.trim() || !clientSecret.trim() || !chainId.trim() || !vendorId.trim()) return;
    setGlovoCredentials({
      clientId: clientId.trim(),
      clientSecret: clientSecret.trim(),
      chainId: chainId.trim(),
      vendorId: vendorId.trim(),
    });
    onDone();
  }

  return (
    <div className="space-y-4">
      <p className="text-xs text-gray-500">
        From Glovo&apos;s Partner Portal. Optional — only needed if you also sell on Glovo.
      </p>
      <Field label="Client ID" value={clientId} onChange={setClientId} />
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Client secret</label>
        <div className="relative">
          <input
            type={showSecret ? "text" : "password"}
            className="w-full rounded-xl border border-gray-300 px-4 py-3 pr-16 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
            value={clientSecret}
            onChange={(e) => setClientSecret(e.target.value)}
          />
          <button
            type="button"
            onClick={() => setShowSecret((v) => !v)}
            className="absolute inset-y-0 right-0 px-4 text-xs font-medium text-gray-500"
          >
            {showSecret ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      <Field label="Chain ID" value={chainId} onChange={setChainId} />
      <Field label="Vendor ID" value={vendorId} onChange={setVendorId} />

      <div className="flex flex-col gap-2 pt-2">
        <button
          onClick={save}
          className="w-full rounded-xl bg-orange-600 py-3.5 text-base font-semibold text-white active:bg-orange-700"
        >
          Save
        </button>
        {glovoCredentials && (
          <button
            onClick={() => {
              clearGlovoCredentials();
              onDone();
            }}
            className="w-full rounded-xl border border-red-200 py-3.5 text-base font-semibold text-red-600 active:bg-red-50"
          >
            Disconnect Glovo
          </button>
        )}
      </div>
    </div>
  );
}

function Field({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div>
      <label className="mb-1 block text-sm font-medium text-gray-700">{label}</label>
      <input
        className="w-full rounded-xl border border-gray-300 px-4 py-3 text-base focus:border-orange-500 focus:outline-none focus:ring-2 focus:ring-orange-200"
        value={value}
        onChange={(e) => onChange(e.target.value)}
      />
    </div>
  );
}
