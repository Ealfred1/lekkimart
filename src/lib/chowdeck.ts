import { slugify } from "./slugify";
import type { ChowdeckItem, ImageItem, ProductRow } from "./types";

export const CHOWDECK_BASE_URL = process.env.CHOWDECK_BASE_URL || "https://api.chowdeck.com/merchant";

/** Convert a plain Naira amount (as typed by the vendor) into kobo for the Chowdeck API.
 * The UI must never show kobo back to the user. */
export function nairaToKobo(naira: number): number {
  return Math.round(naira * 100);
}

export function categoryReference(categoryName: string): string {
  return `cat-${slugify(categoryName) || "uncategorized"}`;
}

export function buildChowdeckItem(row: ProductRow, images: ImageItem[]): ChowdeckItem {
  const price = Number(row.price);
  return {
    reference: row.reference,
    name: row.name.trim(),
    description: row.description.trim() || undefined,
    category: {
      reference: categoryReference(row.category),
      name: row.category.trim(),
    },
    price: nairaToKobo(price),
    in_stock: row.inStock,
    images: images
      .filter((img) => img.status === "done" && img.uploadedUrl)
      .map((img) => ({ path: img.uploadedUrl as string })),
  };
}
