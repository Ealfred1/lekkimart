import { v2 as cloudinary } from "cloudinary";
import { NextResponse } from "next/server";

// Signed, server-side image upload. The browser sends the raw file to this
// route; Cloudinary credentials (CLOUDINARY_URL, read automatically by the
// SDK) never leave the server. This is the safer counterpart to an unsigned
// upload preset, and mirrors the same proxy pattern used for /api/upload.

export const runtime = "nodejs";

export async function POST(req: Request) {
  if (!process.env.CLOUDINARY_URL) {
    return NextResponse.json(
      { error: "Image hosting isn't configured on the server (missing CLOUDINARY_URL)." },
      { status: 503 }
    );
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return NextResponse.json({ error: "Invalid upload request" }, { status: 400 });
  }

  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file provided" }, { status: 400 });
  }
  if (!file.type.startsWith("image/")) {
    return NextResponse.json({ error: "Only image files are allowed" }, { status: 400 });
  }

  try {
    const buffer = Buffer.from(await file.arrayBuffer());
    const dataUri = `data:${file.type};base64,${buffer.toString("base64")}`;

    const result = await cloudinary.uploader.upload(dataUri, {
      folder: "chowdeck-bulk-uploader",
    });

    return NextResponse.json({ url: result.secure_url });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Image upload failed" },
      { status: 502 }
    );
  }
}
