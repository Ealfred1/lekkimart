import { NextResponse } from "next/server";
import { getGlovoAccessToken, GLOVO_BASE_URL } from "@/lib/glovo";
import type { GlovoCatalogItem, GlovoCredentials, ItemResult } from "@/lib/types";

// Pushes a batch to Glovo via the vendor-scoped catalog upsert endpoint.
// Unlike Chowdeck, this is always an upsert (create-or-update by SKU) — Glovo's
// API has no "full sync that deactivates anything missing" mode here, so there's
// no first-send warning needed the way Chowdeck required.
//
// UNTESTED against Glovo's real API — no partner credentials were available
// while building this. Specifically unverified:
//  - price units (major vs minor currency — see buildGlovoItem)
//  - the token request format (see getGlovoAccessToken)
//  - whether the job-status response carries per-SKU results or only an
//    overall status (this route assumes the latter and reports all items with
//    the job's outcome — a real per-item breakdown may need following the
//    job's log/download link, which isn't implemented)

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 8; // ~16s before giving up and reporting "still processing"

interface UploadRequestBody extends GlovoCredentials {
  items: GlovoCatalogItem[];
}

export async function POST(req: Request) {
  let body: UploadRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const { clientId, clientSecret, chainId, vendorId, items } = body;
  if (!clientId || !clientSecret || !chainId || !vendorId) {
    return NextResponse.json(
      { success: false, message: "Missing Glovo credentials. Add them in Settings." },
      { status: 400 }
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ success: false, message: "No items to upload" }, { status: 400 });
  }

  try {
    const token = await getGlovoAccessToken(body);

    const putRes = await fetch(
      `${GLOVO_BASE_URL}/v2/chains/${encodeURIComponent(chainId)}/vendors/${encodeURIComponent(vendorId)}/catalog`,
      {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      }
    );
    const putData = await putRes.json().catch(() => null);

    if (!putRes.ok) {
      const message = putData?.message || `Glovo rejected the batch (HTTP ${putRes.status})`;
      return NextResponse.json({
        success: false,
        message,
        results: items.map((item): ItemResult => ({ reference: item.sku, success: false, message })),
      });
    }

    const jobId = putData?.job_id;
    if (!jobId) {
      // No async job to track — treat the 2xx as success.
      return NextResponse.json({
        success: true,
        results: items.map((item): ItemResult => ({ reference: item.sku, success: true })),
      });
    }

    const finalStatus = await pollJob(chainId, vendorId, jobId, token);

    if (finalStatus === "COMPLETED") {
      return NextResponse.json({
        success: true,
        results: items.map((item): ItemResult => ({ reference: item.sku, success: true })),
      });
    }

    const message =
      finalStatus === "FAILED"
        ? "Glovo reported this batch failed. Check the job in Glovo's dashboard for details."
        : "Still processing on Glovo's side — check back in a minute, or view the job in Glovo's dashboard.";
    return NextResponse.json({
      success: false,
      message,
      results: items.map((item): ItemResult => ({ reference: item.sku, success: false, message })),
    });
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        results: [],
        message: err instanceof Error ? err.message : "Unexpected error talking to Glovo",
      },
      { status: 502 }
    );
  }
}

async function pollJob(chainId: string, vendorId: string, jobId: string, token: string): Promise<string> {
  for (let attempt = 0; attempt < MAX_POLLS; attempt++) {
    const res = await fetch(
      `${GLOVO_BASE_URL}/v2/chains/${encodeURIComponent(chainId)}/vendors/${encodeURIComponent(vendorId)}/catalog/jobs/${encodeURIComponent(jobId)}`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const data = await res.json().catch(() => null);
    const status = data?.job_status ?? data?.status;
    if (status === "COMPLETED" || status === "FAILED") return status;
    await new Promise((resolve) => setTimeout(resolve, POLL_INTERVAL_MS));
  }
  return "PENDING";
}
