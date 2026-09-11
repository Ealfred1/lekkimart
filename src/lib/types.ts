// Shared types for the Chowdeck bulk uploader.

export type RowErrors = Partial<{
  name: string;
  category: string;
  price: string;
  reference: string;
}>;

export interface ProductRow {
  /** Stable id, also used as the Chowdeck item reference. Used to key attached images
   * so re-uploading a corrected CSV doesn't lose photos for rows whose reference matches. */
  reference: string;
  /** Original row number in the source CSV (1-based, header excluded) — used in error copy. */
  sourceRow: number;
  name: string;
  description: string;
  category: string;
  /** Plain Naira value as typed/parsed — never kobo. Kept as a string while editing so the
   * user can clear the field, parsed to a number at submit time. */
  price: string;
  inStock: boolean;
  errors: RowErrors;
}

export type ImageStatus = "idle" | "uploading" | "done" | "error";

export interface ImageItem {
  id: string;
  file: File;
  previewUrl: string;
  status: ImageStatus;
  progress: number; // 0-100
  uploadedUrl?: string;
  error?: string;
}

export interface Credentials {
  merchantReference: string;
  secretKey: string;
}

/** From Glovo's Partner Portal — unlike Chowdeck's single dashboard key, Glovo
 * scopes a partner as a "chain" containing one or more "vendors" (stores), and
 * auth is OAuth2 client-credentials rather than a static bearer token. */
export interface GlovoCredentials {
  clientId: string;
  clientSecret: string;
  chainId: string;
  vendorId: string;
}

/** A category as it actually exists on Glovo — the catalog API requires an
 * existing category UUID per item; it won't create one from a free-text name
 * the way Chowdeck does. */
export interface GlovoCategory {
  id: string;
  name: string;
}

export type WizardStep = "csv" | "review" | "photos" | "send" | "results";

export interface ChowdeckCategory {
  reference: string;
  name: string;
}

export interface ChowdeckImage {
  path: string;
}

export interface ChowdeckItem {
  reference: string;
  name: string;
  description?: string;
  category: ChowdeckCategory;
  price: number; // kobo
  in_stock: boolean;
  images: ChowdeckImage[];
}

export interface GlovoCatalogItem {
  sku: string;
  title: Record<string, string>; // { [locale]: text } — e.g. { en: "Jollof Rice" }
  description?: Record<string, string>;
  images: string[];
  categories: string[]; // Glovo category UUIDs
  /** ASSUMPTION, unverified against a real Glovo sandbox: major currency units
   * (e.g. Naira), matching what the vendor typed — not confirmed anywhere in
   * Glovo's public docs. Check this against a real response before relying on it. */
  price: number;
  active: boolean;
}

export interface ItemResult {
  reference: string;
  success: boolean;
  message?: string;
}

export interface UploadApiResponse {
  success: boolean;
  results: ItemResult[];
  message?: string;
}
