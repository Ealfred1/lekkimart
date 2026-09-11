import { NextResponse } from "next/server";
import { getGlovoAccessToken, GLOVO_BASE_URL } from "@/lib/glovo";
import type { GlovoCategory, GlovoCredentials } from "@/lib/types";

// Fetches the vendor's existing categories from Glovo, so the UI can let the
// user map each CSV category name onto a real Glovo category UUID — Glovo's
// catalog API requires an existing category, it won't create one from a name.
//
// UNTESTED against Glovo's real API (see src/lib/glovo.ts) — in particular the
// exact shape of the categories response (field names, pagination) is assumed
// from third-party summaries of Glovo's docs, not confirmed directly.

export async function POST(req: Request) {
  let body: GlovoCredentials;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const { clientId, clientSecret, chainId, vendorId } = body;
  if (!clientId || !clientSecret || !chainId || !vendorId) {
    return NextResponse.json({ error: "Missing Glovo credentials" }, { status: 400 });
  }

  try {
    const token = await getGlovoAccessToken(body);
    const res = await fetch(`${GLOVO_BASE_URL}/v2/chains/${encodeURIComponent(chainId)}/vendors/${encodeURIComponent(vendorId)}/categories`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const data = await res.json().catch(() => null);
    if (!res.ok) {
      return NextResponse.json(
        { error: data?.message || `Glovo rejected the categories request (HTTP ${res.status})` },
        { status: 502 }
      );
    }

    // ASSUMPTION: response is either a bare array or { categories: [...] } —
    // both are handled defensively since the exact shape isn't confirmed.
    const rawList: unknown[] = Array.isArray(data) ? data : Array.isArray(data?.categories) ? data.categories : [];
    const categories: GlovoCategory[] = rawList
      .map((c) => {
        const obj = c as Record<string, unknown>;
        const id = obj.id ?? obj.global_id ?? obj.category_id;
        const name = obj.name ?? obj.title;
        return typeof id === "string" && typeof name === "string" ? { id, name } : null;
      })
      .filter((c): c is GlovoCategory => c !== null);

    return NextResponse.json({ categories });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Couldn't reach Glovo" },
      { status: 502 }
    );
  }
}
