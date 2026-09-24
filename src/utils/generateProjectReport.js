// Feature: per-project PDF report (Add Project → My Projects → Dashboard
// all link here). Runs entirely client-side with jsPDF, so it works the
// same whether the data came from dummyData.js or the live gateway —
// nothing here talks to the network. Output is a real .pdf file the
// browser downloads, which can be opened, archived, or printed later.

import { jsPDF } from "jspdf";
import autoTable from "jspdf-autotable";
import { shortFingerprint, formatBytes } from "./fileHash";

const INR = (n) => `Rs. ${Number(n || 0).toLocaleString("en-IN")}`;
const PCT = (n) => `${n ?? 0}%`;

function section(doc, title, y) {
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(15, 27, 46);
  doc.text(title, 40, y);
  doc.setDrawColor(217, 119, 6);
  doc.setLineWidth(0.6);
  doc.line(40, y + 3, 555, y + 3);
  return y + 16;
}

function keyValueTable(doc, rows, y) {
  autoTable(doc, {
    startY: y,
    margin: { left: 40, right: 40 },
    body: rows,
    theme: "plain",
    styles: { fontSize: 9.5, cellPadding: { top: 2, bottom: 2, left: 0, right: 6 }, textColor: [30, 41, 59] },
    columnStyles: {
      0: { fontStyle: "bold", textColor: [100, 116, 139], cellWidth: 170 },
      1: { textColor: [15, 27, 46] },
    },
  });
  return doc.lastAutoTable.finalY + 14;
}

function footer(doc) {
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(148, 163, 184);
    doc.text(
      "PREDIXA — generated report, not a substitute for the source documents listed above.",
      40,
      812
    );
    doc.text(`Page ${i} of ${pageCount}`, 515, 812);
  }
}

export function downloadProjectReport(project) {
  if (!project) return;
  const doc = new jsPDF({ unit: "pt", format: "a4" });

  // Masthead
  doc.setFillColor(15, 27, 46);
  doc.rect(0, 0, 595, 60, "F");
  doc.setTextColor(247, 248, 250);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.text("PREDIXA — PROJECT REPORT", 40, 32);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(240, 167, 51);
  doc.text(`${project.id}  ·  generated ${new Date().toLocaleString("en-IN")}`, 40, 47);

  let y = 90;
  doc.setTextColor(15, 27, 46);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(13);
  doc.text(`${project.projectType} — ${project.district}, ${project.state}`, 40, y);
  y += 22;

  // Overview
  y = section(doc, "PROJECT OVERVIEW", y);
  y = keyValueTable(
    doc,
    [
      ["Project ID", project.id],
      ["Department", project.department || "—"],
      ["State / District", `${project.state} / ${project.district}`],
      ["Status", project.status],
      ["Created by", project.createdBy || "—"],
      ["Created on", project.createdAt || "—"],
      ["Last activity", project.lastActivityDate || "—"],
    ],
    y
  );

  // Risk assessment
  y = section(doc, "RISK ASSESSMENT", y);
  y = keyValueTable(
    doc,
    [
      ["Risk score", `${project.riskScore ?? "—"} / 100`],
      ["Risk level", project.riskLevel || "—"],
      ["Top delay driver", project.topDriver || "None flagged"],
      ["Overall delay", `${project.overallDelayDays ?? 0} days`],
      ["Recommended action", project.recommendedAction || "—"],
      ["Estimated cost overrun", INR(project.estimatedCostOverrun)],
    ],
    y
  );

  if (y > 680) {
    doc.addPage();
    y = 50;
  }

  // Financial & progress
  y = section(doc, "FINANCIAL & PROGRESS", y);
  y = keyValueTable(
    doc,
    [
      ["Families affected", project.familiesAffected ?? "—"],
      ["Land area (hectares)", project.landAreaHectares ?? "—"],
      ["Project budget", INR(project.projectBudget)],
      ["Compensation disbursed", PCT(project.compensationDisbursedPct)],
      ["R&R progress", PCT(project.rrProgressPct)],
      ["Active legal disputes", project.legalDisputes ?? 0],
      ["Approval stage", `${project.approvalStage ?? "—"} / 5`],
    ],
    y
  );

  if (y > 650) {
    doc.addPage();
    y = 50;
  }

  // Verification & data integrity
  y = section(doc, "VERIFICATION & DATA INTEGRITY", y);
  const verificationRows = [["Verification status", project.verificationStatus || "Self-reported — no source document"]];
  if (project.overriddenFields?.length) {
    verificationRows.push(["Fields edited after extraction", project.overriddenFields.join(", ")]);
  }
  y = keyValueTable(doc, verificationRows, y);

  // Attached documents
  const documents = project.documents?.length
    ? project.documents
    : project.sourceDocument
    ? [{ name: project.sourceDocument.name, addedAt: project.createdAt, fingerprint: project.sourceDocument.fingerprint }]
    : [];

  if (y > 700) {
    doc.addPage();
    y = 50;
  }
  y = section(doc, `ATTACHED DOCUMENTS (${documents.length})`, y);
  if (documents.length > 0) {
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      head: [["Document", "Added", "Size", "Integrity fingerprint (SHA-256)"]],
      body: documents.map((d) => [
        d.name || "Untitled document",
        d.addedAt ? new Date(d.addedAt).toLocaleDateString("en-IN") : "—",
        d.size ? formatBytes(d.size) : "—",
        shortFingerprint(d.fingerprint),
      ]),
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [15, 27, 46], textColor: [247, 248, 250] },
      alternateRowStyles: { fillColor: [247, 248, 250] },
    });
    y = doc.lastAutoTable.finalY + 14;
  } else {
    doc.setFontSize(9.5);
    doc.setTextColor(148, 163, 184);
    doc.text("No documents are on file for this project.", 40, y);
    y += 20;
  }

  // Audit trail
  if (project.auditLog?.length) {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }
    y = section(doc, "AUDIT TRAIL", y);
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      head: [["Timestamp", "By", "Action", "Note"]],
      body: project.auditLog.map((e) => [
        new Date(e.at).toLocaleString("en-IN"),
        e.by,
        e.action,
        e.note || "",
      ]),
      styles: { fontSize: 8, cellPadding: 5 },
      headStyles: { fillColor: [15, 27, 46], textColor: [247, 248, 250] },
      alternateRowStyles: { fillColor: [247, 248, 250] },
      columnStyles: { 3: { cellWidth: 220 } },
    });
    y = doc.lastAutoTable.finalY + 14;
  }

  // Delay drivers
  if (project.delayDrivers?.length) {
    if (y > 680) {
      doc.addPage();
      y = 50;
    }
    y = section(doc, "DELAY DRIVERS", y);
    autoTable(doc, {
      startY: y,
      margin: { left: 40, right: 40 },
      head: [["Driver", "Contribution"]],
      body: project.delayDrivers.map((d) => [d.label || d.key, d.impact != null ? d.impact : "—"]),
      styles: { fontSize: 8.5, cellPadding: 5 },
      headStyles: { fillColor: [15, 27, 46], textColor: [247, 248, 250] },
    });
  }

  footer(doc);
  doc.save(`${project.id}_report.pdf`);
}
