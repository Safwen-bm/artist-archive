import { NextResponse } from "next/server";

export const runtime = "nodejs";

const MAX_BYTES = 5 * 1024 * 1024; // 5 MB, generous for a CV
const SUPPORTED = new Set(["txt", "pdf", "docx", "csv", "xlsx"]);

function extOf(name: string) {
  return name.split(".").pop()?.toLowerCase() ?? "";
}

function toLines(text: string): string[] {
  return text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
}

async function extractTxt(buf: Buffer) {
  return toLines(buf.toString("utf8"));
}

async function extractPdf(buf: Buffer) {
  // pdf-parse v2 uses a class-based API, not the old callable-function shape.
  const { PDFParse } = await import("pdf-parse");
  const parser = new PDFParse({ data: buf });
  try {
    const result = await parser.getText();
    // pdf-parse inserts "-- N of M --" markers between pages, not CV content.
    return toLines(result.text).filter((l) => !/^--\s*\d+\s*of\s*\d+\s*--$/.test(l));
  } finally {
    await parser.destroy();
  }
}

async function extractDocx(buf: Buffer) {
  const mammoth = await import("mammoth");
  const { value } = await mammoth.extractRawText({ buffer: buf });
  return toLines(value);
}

async function extractSpreadsheet(buf: Buffer) {
  const XLSX = await import("xlsx");
  const wb = XLSX.read(buf, { type: "buffer" });
  const sheet = wb.Sheets[wb.SheetNames[0]];
  const rows: string[][] = XLSX.utils.sheet_to_json(sheet, { header: 1, blankrows: false });
  // Join each row's cells into one CV-style line, e.g. "2019 | Residency | Villa Medici | Rome".
  return rows
    .map((row) => row.map((cell) => String(cell ?? "").trim()).filter(Boolean).join(" | "))
    .filter(Boolean);
}

export async function POST(req: Request) {
  const form = await req.formData();
  const file = form.get("file");

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "No file received." }, { status: 400 });
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File is larger than 5 MB." }, { status: 413 });
  }

  const ext = extOf(file.name);
  if (!SUPPORTED.has(ext)) {
    return NextResponse.json(
      {
        error:
          `".${ext}" isn't parsed automatically. This works for plain text, PDF, Word (.docx) and ` +
          `spreadsheets (.csv/.xlsx). For a Figma file, an InDesign export, or a visual portfolio, export ` +
          `or type a plain-text list of experiences first, then paste or upload that instead.`,
      },
      { status: 415 },
    );
  }

  const buf = Buffer.from(await file.arrayBuffer());

  try {
    let lines: string[];
    switch (ext) {
      case "txt":
        lines = await extractTxt(buf);
        break;
      case "pdf":
        lines = await extractPdf(buf);
        break;
      case "docx":
        lines = await extractDocx(buf);
        break;
      case "csv":
      case "xlsx":
        lines = await extractSpreadsheet(buf);
        break;
      default:
        lines = [];
    }

    if (lines.length === 0) {
      return NextResponse.json(
        { error: "No text could be read from that file. It may be a scanned image with no text layer." },
        { status: 422 },
      );
    }

    return NextResponse.json({ lines, sourceType: ext });
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Could not read that file." }, { status: 422 });
  }
}