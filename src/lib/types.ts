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
