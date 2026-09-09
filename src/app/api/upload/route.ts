import { NextResponse } from "next/server";
import { CHOWDECK_BASE_URL } from "@/lib/chowdeck";
import type { ChowdeckItem, ItemResult, UploadApiResponse } from "@/lib/types";

// Proxies the browser's upload request to Chowdeck server-side, so the vendor's
// secret key never appears in a network request against a third-party domain —
// it only ever travels from the browser to this route, over HTTPS.

interface UploadRequestBody {
  merchantReference: string;
  secretKey: string;
  mode: "bulk" | "upsert";
  items: ChowdeckItem[];
}

function isNonEmptyString(v: unknown): v is string {
  return typeof v === "string" && v.trim().length > 0;
}

export async function POST(req: Request) {
  let body: UploadRequestBody;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, message: "Invalid request body" }, { status: 400 });
  }

  const { merchantReference, secretKey, mode, items } = body;

  if (!isNonEmptyString(merchantReference) || !isNonEmptyString(secretKey)) {
    return NextResponse.json(
      { success: false, message: "Missing Chowdeck credentials. Add them in Settings." },
      { status: 400 }
    );
  }
  if (!Array.isArray(items) || items.length === 0) {
    return NextResponse.json({ success: false, message: "No items to upload" }, { status: 400 });
  }
  if (mode !== "bulk" && mode !== "upsert") {
    return NextResponse.json({ success: false, message: "Invalid upload mode" }, { status: 400 });
  }

  try {
    const result =
      mode === "bulk"
        ? await sendBulk(merchantReference, secretKey, items)
        : await sendUpserts(merchantReference, secretKey, items);
    return NextResponse.json(result satisfies UploadApiResponse);
  } catch (err) {
    return NextResponse.json(
      {
        success: false,
        results: [],
        message: err instanceof Error ? err.message : "Unexpected error talking to Chowdeck",
      } satisfies UploadApiResponse,
      { status: 502 }
    );
  }
}

async function sendBulk(
  merchantReference: string,
  secretKey: string,
  items: ChowdeckItem[]
): Promise<UploadApiResponse> {
  const res = await fetch(`${CHOWDECK_BASE_URL}/${encodeURIComponent(merchantReference)}/menu/bulk-upload`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${secretKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ items }),
  });

  const data = await safeJson(res);

  if (res.ok && data?.status !== "failed") {
    return {
      success: true,
      results: items.map((item) => ({ reference: item.reference, success: true })),
    };
  }

  const message = data?.message || `Chowdeck rejected the bulk upload (HTTP ${res.status})`;
  return {
    success: false,
    message,
    results: items.map((item) => ({ reference: item.reference, success: false, message })),
  };
}

async function sendUpserts(
  merchantReference: string,
  secretKey: string,
  items: ChowdeckItem[]
): Promise<UploadApiResponse> {
  const settled = await Promise.allSettled(
    items.map(async (item): Promise<ItemResult> => {
      const res = await fetch(`${CHOWDECK_BASE_URL}/${encodeURIComponent(merchantReference)}/menu`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${secretKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(item),
      });
      const data = await safeJson(res);
      if (res.ok && data?.status !== "failed") {
        return { reference: item.reference, success: true };
      }
      return {
        reference: item.reference,
        success: false,
        message: data?.message || `HTTP ${res.status}`,
      };
    })
  );

  const results: ItemResult[] = settled.map((outcome, i) =>
    outcome.status === "fulfilled"
      ? outcome.value
      : { reference: items[i].reference, success: false, message: String(outcome.reason) }
  );

  return { success: results.every((r) => r.success), results };
}

async function safeJson(res: Response): Promise<{ status?: string; message?: string } | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}
