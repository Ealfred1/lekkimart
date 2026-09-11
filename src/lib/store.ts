import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  Credentials,
  GlovoCategory,
  GlovoCredentials,
  ImageItem,
  ItemResult,
  ProductRow,
  WizardStep,
} from "./types";

interface CredentialsState {
  credentials: Credentials | null;
  /** Whether we've ever successfully pushed a batch to Chowdeck for this merchant.
   * The very first send uses the full-sync bulk-upload endpoint (with an explicit
   * warning); every send after that uses per-item upserts so nothing already live
   * gets silently deactivated. */
  hasUploadedBefore: boolean;
  /** Glovo credentials are separate and optional — the app works with either
   * platform connected, or both. Glovo's catalog endpoint is always an upsert,
   * so there's no equivalent "first send" danger/flag needed here. */
  glovoCredentials: GlovoCredentials | null;
  /** True once localStorage has been read, so the UI doesn't flash the credentials
   * form before rehydration completes. */
  hasHydrated: boolean;
  setCredentials: (c: Credentials) => void;
  clearCredentials: () => void;
  markUploaded: () => void;
  setGlovoCredentials: (c: GlovoCredentials) => void;
  clearGlovoCredentials: () => void;
  setHasHydrated: () => void;
}

export const useCredentialsStore = create<CredentialsState>()(
  persist(
    (set) => ({
      credentials: null,
      hasUploadedBefore: false,
      glovoCredentials: null,
      hasHydrated: false,
      setCredentials: (c) => set({ credentials: c }),
      clearCredentials: () => set({ credentials: null, hasUploadedBefore: false }),
      markUploaded: () => set({ hasUploadedBefore: true }),
      setGlovoCredentials: (c) => set({ glovoCredentials: c }),
      clearGlovoCredentials: () => set({ glovoCredentials: null }),
      setHasHydrated: () => set({ hasHydrated: true }),
    }),
    {
      name: "chowdeck-bulk-uploader:credentials",
      onRehydrateStorage: () => (state) => {
        state?.setHasHydrated();
      },
    }
  )
);

interface BatchState {
  step: WizardStep;
  rows: ProductRow[];
  images: Record<string, ImageItem[]>; // keyed by row.reference
  results: ItemResult[] | null;
  lastSendWasFullBatch: boolean;

  /** Glovo results are tracked separately since a batch can go to either or
   * both platforms independently. */
  glovoResults: ItemResult[] | null;
  /** Categories fetched live from Glovo for the current credentials. */
  glovoCategories: GlovoCategory[] | null;
  /** Maps a CSV category name (as typed by the vendor) to a Glovo category UUID. */
  categoryMap: Record<string, string>;

  setStep: (s: WizardStep) => void;
  setRows: (rows: ProductRow[]) => void;
  updateRow: (reference: string, patch: Partial<ProductRow>) => void;
  addImages: (reference: string, images: ImageItem[]) => void;
  removeImage: (reference: string, imageId: string) => void;
  updateImage: (reference: string, imageId: string, patch: Partial<ImageItem>) => void;
  setResults: (results: ItemResult[], wasFullBatch: boolean) => void;
  setGlovoResults: (results: ItemResult[]) => void;
  setGlovoCategories: (categories: GlovoCategory[]) => void;
  setCategoryMapping: (categoryName: string, glovoCategoryId: string) => void;
  reset: () => void;
}

export const useBatchStore = create<BatchState>((set) => ({
  step: "csv",
  rows: [],
  images: {},
  results: null,
  lastSendWasFullBatch: false,
  glovoResults: null,
  glovoCategories: null,
  categoryMap: {},

  setStep: (step) => set({ step }),

  setRows: (rows) => set({ rows }),

  updateRow: (reference, patch) =>
    set((state) => ({
      rows: state.rows.map((r) => (r.reference === reference ? { ...r, ...patch } : r)),
    })),

  addImages: (reference, images) =>
    set((state) => ({
      images: {
        ...state.images,
        [reference]: [...(state.images[reference] ?? []), ...images],
      },
    })),

  removeImage: (reference, imageId) =>
    set((state) => ({
      images: {
        ...state.images,
        [reference]: (state.images[reference] ?? []).filter((img) => img.id !== imageId),
      },
    })),

  updateImage: (reference, imageId, patch) =>
    set((state) => ({
      images: {
        ...state.images,
        [reference]: (state.images[reference] ?? []).map((img) =>
          img.id === imageId ? { ...img, ...patch } : img
        ),
      },
    })),

  setResults: (results, wasFullBatch) => set({ results, lastSendWasFullBatch: wasFullBatch }),

  setGlovoResults: (glovoResults) => set({ glovoResults }),

  setGlovoCategories: (glovoCategories) => set({ glovoCategories }),

  setCategoryMapping: (categoryName, glovoCategoryId) =>
    set((state) => ({ categoryMap: { ...state.categoryMap, [categoryName]: glovoCategoryId } })),

  reset: () =>
    set({ step: "csv", rows: [], images: {}, results: null, glovoResults: null, categoryMap: {} }),
}));
