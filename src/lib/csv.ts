import Papa from "papaparse";
import { slugify } from "./slugify";
import type { ProductRow, RowErrors } from "./types";

const TRUTHY = new Set(["yes", "y", "true", "1"]);
const FALSY = new Set(["no", "n", "false", "0"]);

// Accepted header names -> canonical field. Case-insensitive, trimmed.
const HEADER_ALIASES: Record<string, keyof RawRow> = {
  name: "name",
  "product name": "name",
  description: "description",
  desc: "description",
  category: "category",
  price: "price",
  "price (naira)": "price",
  in_stock: "in_stock",
  "in stock": "in_stock",
  instock: "in_stock",
  stock: "in_stock",
  reference: "reference",
  ref: "reference",
  sku: "reference",
};

interface RawRow {
  name?: string;
  description?: string;
  category?: string;
  price?: string;
  in_stock?: string;
  reference?: string;
}

export interface ParsedCsvResult {
  rows: ProductRow[];
  /** File-level errors (e.g. couldn't read the file at all). */
  fileErrors: string[];
}

function normalizeHeader(header: string): keyof RawRow | null {
  const key = header.trim().toLowerCase();
  return HEADER_ALIASES[key] ?? null;
}

function parseInStock(value: string | undefined): boolean {
  if (value === undefined) return true;
  const v = value.trim().toLowerCase();
  if (v === "") return true;
  if (TRUTHY.has(v)) return true;
  if (FALSY.has(v)) return false;
  return true; // lenient default
}

function parsePrice(value: string | undefined): { num: number | null; raw: string } {
  const raw = (value ?? "").trim();
  if (raw === "") return { num: null, raw };
  const cleaned = raw.replace(/[₦,\s]/g, "");
  const num = Number(cleaned);
  return { num: Number.isFinite(num) ? num : null, raw };
}

export function validateRow(row: {
  name: string;
  category: string;
  price: string;
}): RowErrors {
  const errors: RowErrors = {};
  if (!row.name.trim()) errors.name = "Name is required";
  if (!row.category.trim()) errors.category = "Category is required";
  const { num } = parsePrice(row.price);
  if (row.price.trim() === "") {
    errors.price = "Price is required";
  } else if (num === null) {
    errors.price = "Price must be a number";
  } else if (num <= 0) {
    errors.price = "Price must be greater than 0";
  }
  return errors;
}

export function parseCsv(text: string): ParsedCsvResult {
  const parsed = Papa.parse<Record<string, string>>(text, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h,
  });

  const fileErrors: string[] = [];
  if (parsed.errors?.length) {
    for (const e of parsed.errors) {
      if (e.code !== "TooFewFields" && e.code !== "TooManyFields") {
        fileErrors.push(e.message);
      }
    }
  }

  // Map raw headers -> canonical fields, ignoring anything unrecognized.
  const fieldMap = new Map<string, keyof RawRow>();
  for (const rawHeader of parsed.meta.fields ?? []) {
    const canonical = normalizeHeader(rawHeader);
    if (canonical) fieldMap.set(rawHeader, canonical);
  }

  const usedReferences = new Set<string>();
  const rows: ProductRow[] = [];

  parsed.data.forEach((rawRowData, index) => {
    const raw: RawRow = {};
    for (const [header, value] of Object.entries(rawRowData)) {
      const canonical = fieldMap.get(header);
      if (canonical) raw[canonical] = value;
    }

    const isBlankRow = Object.values(raw).every((v) => !v || !v.trim());
    if (isBlankRow) return; // tolerate stray blank rows

    const name = (raw.name ?? "").trim();
    const description = (raw.description ?? "").trim();
    const category = (raw.category ?? "").trim();
    const { raw: priceRaw } = parsePrice(raw.price);
    const inStock = parseInStock(raw.in_stock);

    let reference = (raw.reference ?? "").trim();
    if (!reference) {
      const base = slugify(name) || `product-${index + 1}`;
      reference = `${base}-${index + 1}`;
    }
    // Ensure uniqueness even if the CSV repeats a reference or slug collision occurs.
    let uniqueReference = reference;
    let suffix = 2;
    while (usedReferences.has(uniqueReference)) {
      uniqueReference = `${reference}-${suffix++}`;
    }
    usedReferences.add(uniqueReference);

    const errors = validateRow({ name, category, price: priceRaw });

    rows.push({
      reference: uniqueReference,
      sourceRow: index + 1,
      name,
      description,
      category,
      price: priceRaw,
      inStock,
      errors,
    });
  });

  return { rows, fileErrors };
}

export const CSV_TEMPLATE = `name,description,category,price,in_stock,reference
Jollof Rice,Well spiced party jollof rice with fried plantain,Rice Dishes,1500,yes,
Chilled Coke,Ice cold Coca-Cola 50cl,Drinks,500,yes,
`;

export function downloadCsvTemplate() {
  const blob = new Blob([CSV_TEMPLATE], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "chowdeck-products-template.csv";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
