# ai-model/explainability-service/document_extract.py
import re
import pdfplumber
from docx import Document
from typing import Optional, Dict, Any

# Maps the labels likely to appear in a document to your actual Project schema field names.
# Add more synonyms here as you see real sample documents.
FIELD_PATTERNS: Dict[str, list] = {
    "state": ["state"],
    "district": ["district"],
    "project_type": ["project type", "type of project"],
    "implementing_department": ["implementing department", "department"],
    "land_area_hectares": ["land area", "area in hectares", "land area (hectares)"],
    "families_affected": ["families affected", "no. of families affected", "affected families"],
    "compensation_assessed_inr": ["compensation assessed", "assessed compensation"],
    "compensation_disbursed_pct": ["compensation disbursed", "compensation disbursed (%)"],
    "legal_disputes_count": ["legal disputes", "number of legal disputes"],
    "notification_date": ["notification date"],
    "approval_stage": ["approval stage"],
    "rr_progress_pct": ["r&r progress", "rehabilitation progress", "r&r progress (%)"],
    "stakeholder_responsiveness": ["stakeholder responsiveness"],
    "last_activity_date": ["last activity date"],
    "project_budget": ["project budget", "budget"],
}

NUMERIC_FIELDS = {
    "land_area_hectares", "families_affected", "compensation_assessed_inr",
    "compensation_disbursed_pct", "legal_disputes_count", "rr_progress_pct",
    "project_budget",
}


def _clean_value(raw: str) -> str:
    return raw.strip().strip(":").strip()


def _try_numeric(value: str) -> Optional[float]:
    cleaned = re.sub(r"[^\d.]", "", value)
    try:
        return float(cleaned) if cleaned else None
    except ValueError:
        return None


def extract_fields_from_text(text: str) -> Dict[str, Any]:
    """
    Scans raw extracted text line by line, matching known field labels
    (case-insensitive) followed by a colon or dash, then captures the value
    after it. Returns only fields it found - anything missing is simply
    absent from the result, and the frontend form leaves those blank for
    manual entry.
    """
    result: Dict[str, Any] = {}
    lines = text.split("\n")

    for line in lines:
        for field_name, labels in FIELD_PATTERNS.items():
            if field_name in result:
                continue
            for label in labels:
                # Matches "Label: value" or "Label - value" or "Label  value"
                pattern = rf"{re.escape(label)}\s*[:\-]\s*(.+)"
                match = re.search(pattern, line, re.IGNORECASE)
                if match:
                    value = _clean_value(match.group(1))
                    if field_name in NUMERIC_FIELDS:
                        numeric = _try_numeric(value)
                        if numeric is not None:
                            result[field_name] = numeric
                    else:
                        result[field_name] = value
                    break

    return result


def extract_from_pdf(file_bytes: bytes) -> Dict[str, Any]:
    import io
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    full_text = "\n".join(text_parts)
    return extract_fields_from_text(full_text)


def extract_from_docx(file_bytes: bytes) -> Dict[str, Any]:
    import io
    doc = Document(io.BytesIO(file_bytes))
    full_text = "\n".join(p.text for p in doc.paragraphs)
    # Also check tables, since many official documents put fields in a table layout
    for table in doc.tables:
        for row in table.rows:
            row_text = " ".join(cell.text for cell in row.cells)
            full_text += "\n" + row_text
    return extract_fields_from_text(full_text)