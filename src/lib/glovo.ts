import type { GlovoCatalogItem, GlovoCredentials, ImageItem, ProductRow } from "./types";

// Glovo's Partner/Catalog API — genuinely different from Chowdeck's:
//  - OAuth2 client-credentials auth (short-lived bearer token), not a static key.
//  - A partner is a "chain" containing one or more "vendors" (stores) — both IDs
//    are required, from Glovo's Partner Portal.
//  - Categories must already exist on Glovo (real UUIDs) — this app can't create
//    them, unlike Chowdeck's free-text category.
//  - PUT /catalog is a per-vendor *upsert* (create-or-update by SKU), so — unlike
//    Chowdeck — there's no "first send replaces everything" footgun here.
//
// No real partner credentials were available while building this, so most of
// it is still unverified against Glovo's actual API — treat every
// "ASSUMPTION" note below accordingly. The exceptions, confirmed live against
// the real endpoint with throwaway fake credentials (just enough to see how it
// responds, not to authenticate): the base URL and /v2/oauth/token path are
// real and reachable, and the token request must be form-urlencoded (see
// getGlovoAccessToken). Everything past that point — the catalog/categories
// endpoints, payload shape, price units, locale codes — is still unverified.

export const GLOVO_BASE_URL = process.env.GLOVO_BASE_URL || "https://glovo.partner.deliveryhero.io";

// ASSUMPTION: default locale for title/description. Glovo's docs didn't specify
// which locale codes a given market uses (e.g. "en" vs "en_GB" vs a country-
// specific code) — confirm against GET .../categories or Glovo support before
// relying on this for a non-English market.
export const GLOVO_DEFAULT_LOCALE = process.env.GLOVO_LOCALE || "en";

interface GlovoTokenResponse {
  access_token: string;
  expires_in?: number;
  token_type?: string;
}

async function safeJson(res: Response): Promise<Record<string, unknown> | null> {
  try {
    return await res.json();
  } catch {
    return null;
  }
}

/** Exchanges client credentials for a short-lived bearer token. Not cached —
 * each server-side call gets a fresh token, which is simplest and safest for
 * this tool's low request volume (a few sends a day), at the cost of one extra
 * round trip per action.
 *
 * CONFIRMED live against the real endpoint (2026-09-11, with fake credentials):
 * it expects standard OAuth2 application/x-www-form-urlencoded, not JSON — a
 * JSON body gets "client_id is required" even when client_id is present; the
 * form-encoded body below gets a real "Invalid client credentials" instead,
 * proving the fields are actually being parsed. */
export async function getGlovoAccessToken(creds: GlovoCredentials): Promise<string> {
  const res = await fetch(`${GLOVO_BASE_URL}/v2/oauth/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: creds.clientId,
      client_secret: creds.clientSecret,
    }),
  });
  const data = (await safeJson(res)) as GlovoTokenResponse | null;
  if (!res.ok || !data?.access_token) {
    const message =
      (data as unknown as { error_description?: string; message?: string })?.error_description ||
      (data as unknown as { message?: string })?.message ||
      `Glovo authentication failed (HTTP ${res.status})`;
    throw new Error(message);
  }
  return data.access_token;
}

export function buildGlovoItem(
  row: ProductRow,
  images: ImageItem[],
  categoryId: string | undefined,
  locale: string = GLOVO_DEFAULT_LOCALE
): GlovoCatalogItem {
  const description = row.description.trim();
  return {
    sku: row.reference,
    title: { [locale]: row.name.trim() },
    ...(description ? { description: { [locale]: description } } : {}),
    images: images.filter((img) => img.status === "done" && img.uploadedUrl).map((img) => img.uploadedUrl as string),
    categories: categoryId ? [categoryId] : [],
    price: Number(row.price),
    active: row.inStock,
  };
}
