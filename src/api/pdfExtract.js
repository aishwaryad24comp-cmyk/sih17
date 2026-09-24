// Client-side PDF text extraction for the Add-Project intake form.
//
// Rationale: letting an official type every number by hand is exactly
// what makes the numbers easy to quietly fabricate. If the real source
// document (a 3A notification, award order, disbursal certificate) is
// already a PDF, we read the numbers straight out of it instead, and
// only ask the human to confirm rather than compose them from scratch.
// A field the human later overrides gets flagged (see AddProjectPage),
// which is a much stronger signal than an untouched free-typed field.
//
// This runs entirely in the browser via pdf.js — no upload to a server
// is needed to get text out of the file. When a real backend exists,
// swap this for a server-side OCR/extraction endpoint and keep the
// same return shape so AddProjectPage doesn't need to change.

import * as pdfjsLib from "pdfjs-dist";
import pdfjsWorkerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfjsWorkerUrl;

// Field patterns are intentionally loose (varied labels/punctuation seen
// across real gazette notifications and award orders) and case-insensitive.
const FIELD_PATTERNS = [
  { key: "familiesAffected", regex: /families?\s+affected[^\d]{0,15}(\d[\d,]*)/i, parse: toInt },
  { key: "landAreaHectares", regex: /land\s+area[^\d]{0,20}(\d[\d,.]*)\s*(?:hectares?|ha\b)/i, parse: toFloat },
  { key: "projectBudget", regex: /(?:project\s+budget|estimated\s+cost)[^\d₹]{0,15}(?:₹|rs\.?|inr)?\s*([\d,]+(?:\.\d+)?)/i, parse: toInt },
  { key: "compensationDisbursedPct", regex: /compensation\s+disburs(?:ed|al)[^\d]{0,20}(\d{1,3})\s*%/i, parse: toInt },
  { key: "rrProgressPct", regex: /(?:r\s*&\s*r|rehabilitation\s*(?:&|and)\s*resettlement)\s+progress[^\d]{0,15}(\d{1,3})\s*%/i, parse: toInt },
  { key: "legalDisputes", regex: /(?:active\s+)?legal\s+disputes?[^\d]{0,15}(\d+)/i, parse: toInt },
  { key: "approvalStage", regex: /approval\s+stage[^\d]{0,15}([1-5])\b/i, parse: toInt },
  { key: "district", regex: /district\s*[:\-]\s*([A-Za-z]+)/i, parse: (s) => s.trim() },
];

function toInt(s) {
  const n = parseInt(String(s).replace(/,/g, ""), 10);
  return Number.isFinite(n) ? n : undefined;
}
function toFloat(s) {
  const n = parseFloat(String(s).replace(/,/g, ""));
  return Number.isFinite(n) ? n : undefined;
}

async function extractText(file) {
  const buf = await file.arrayBuffer();
  const doc = await pdfjsLib.getDocument({ data: buf }).promise;
  let text = "";
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i);
    const content = await page.getTextContent();
    text += content.items.map((it) => it.str).join(" ") + "\n";
  }
  return text;
}

// Returns { fields, matchedKeys, rawTextPreview, pageCount }.
// `fields` only contains keys the parser was confident it found — the
// form leaves everything else for the human to fill in as normal.
export async function extractProjectFromPdf(file) {
  const text = await extractText(file);
  const fields = {};
  const matchedKeys = [];
  for (const { key, regex, parse } of FIELD_PATTERNS) {
    const m = text.match(regex);
    if (m) {
      const value = parse(m[1]);
      if (value !== undefined && value !== "") {
        fields[key] = value;
        matchedKeys.push(key);
      }
    }
  }
  return {
    fields,
    matchedKeys,
    rawTextPreview: text.slice(0, 400),
  };
}
