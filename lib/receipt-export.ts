import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import * as XLSX from "xlsx";
import { Receipt } from "./types";
import { formatCurrency, formatDate } from "./utils";
import { useStore } from "./store";

function getCurrency() {
  return useStore.getState().currency;
}

/** PDF-safe money string — standard Helvetica lacks €/£ glyphs, so we use ASCII codes. */
function pdfMoney(value: number, currency: string) {
  const code = currency || "PKR";
  const formatted = new Intl.NumberFormat("en-US", {
    maximumFractionDigits: value % 1 === 0 ? 0 : 2,
    minimumFractionDigits: 0,
  }).format(value);
  const prefix: Record<string, string> = {
    PKR: "Rs ",
    USD: "USD ",
    EUR: "EUR ",
    GBP: "GBP ",
  };
  return `${prefix[code] ?? code + " "}${formatted}`;
}

function heading(r: Receipt) {
  return r.type === "sale" ? "SALES RECEIPT" : "PURCHASE RECEIPT";
}

function partyLabel(r: Receipt) {
  return r.type === "sale" ? "Billed to" : "Received from";
}

// Palette (matches the app's ink/muted/line tokens)
const INK: [number, number, number] = [18, 20, 31];
const MUTED: [number, number, number] = [110, 114, 130];
const LINE: [number, number, number] = [225, 227, 232];
const SUCCESS: [number, number, number] = [22, 163, 74];

export function receiptToPdf(r: Receipt) {
  if (!r) {
    throw new Error("No receipt to export");
  }
  const currency = getCurrency();
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const marginX = 40;
  const contentRight = pageWidth - marginX;
  const HEADER_H = 96;
  const FOOTER_RESERVE = 46;

  // Redrawn on every page (first page + any continuation pages the
  // items table spills onto), so nothing is ever missing its context.
  function drawHeader(continued: boolean) {
    doc.setFillColor(...INK);
    doc.rect(0, 0, pageWidth, HEADER_H, "F");

    doc.setTextColor(255, 255, 255);
    doc.setFont("helvetica", "bold");
    doc.setFontSize(19);
    doc.text("Stockbase", marginX, 40);

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(190, 195, 212);
    doc.text("Inventory & receipts", marginX, 55);

    doc.setFont("helvetica", "bold");
    doc.setFontSize(12);
    doc.setTextColor(255, 255, 255);
    doc.text(heading(r), contentRight, 34, { align: "right" });

    doc.setFont("helvetica", "normal");
    doc.setFontSize(8.5);
    doc.setTextColor(190, 195, 212);
    doc.text(`Receipt #: ${r.receiptNumber}`, contentRight, 50, { align: "right" });
    doc.text(`Date: ${formatDate(r.date)}`, contentRight, 63, { align: "right" });

    if (continued) {
      doc.setFont("helvetica", "italic");
      doc.setFontSize(8);
      doc.setTextColor(190, 195, 212);
      doc.text("(continued)", contentRight, 78, { align: "right" });
    }
  }

  function drawFooterOnCurrentPage(pageNum: number, pageCount: number) {
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.75);
    doc.line(marginX, pageHeight - 34, contentRight, pageHeight - 34);
    doc.setFont("helvetica", "normal");
    doc.setFontSize(8);
    doc.setTextColor(...MUTED);
    doc.text("Thank you for your business.", marginX, pageHeight - 20);
    doc.text(`Page ${pageNum} of ${pageCount}`, contentRight, pageHeight - 20, { align: "right" });
  }

  drawHeader(false);

  const y = HEADER_H + 30;

  doc.setFont("helvetica", "bold");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text(partyLabel(r).toUpperCase(), marginX, y);

  const partyLines: string[] = [];
  if (r.partyName) partyLines.push(r.partyName);
  if (r.partyContact) partyLines.push(r.partyContact);
  if (r.partyAddress) partyLines.push(...doc.splitTextToSize(r.partyAddress, 252));

  const boxTop = y + 8;
  const boxH = Math.max(30, partyLines.length * 14 + 16);
  doc.setFillColor(250, 250, 252);
  doc.setDrawColor(...LINE);
  doc.roundedRect(marginX, boxTop, 280, boxH, 6, 6, "FD");

  let py = boxTop + 20;
  partyLines.forEach((line, i) => {
    if (i === 0) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(10.5);
      doc.setTextColor(...INK);
    } else {
      doc.setFont("helvetica", "normal");
      doc.setFontSize(9);
      doc.setTextColor(...MUTED);
    }
    doc.text(line, marginX + 14, py, { maxWidth: 252 });
    py += 14;
  });
  if (partyLines.length === 0) {
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text("Walk-in / not specified", marginX + 14, py);
  }

  // "Total due" chip, top right — gives an at-a-glance figure even
  // before the reader scans the line items.
  const chipW = 200;
  const chipX = contentRight - chipW;
  doc.setFillColor(...INK);
  doc.roundedRect(chipX, boxTop, chipW, 56, 6, 6, "F");
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8.5);
  doc.setTextColor(190, 195, 212);
  doc.text(r.type === "sale" ? "TOTAL DUE" : "TOTAL PAYABLE", chipX + 14, boxTop + 20);
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(255, 255, 255);
  doc.text(pdfMoney(r.total, currency), chipX + 14, boxTop + 42);

  const tableStartY = boxTop + boxH + 24;

  autoTable(doc, {
    startY: tableStartY,
    head: [["Item", "SKU", "Qty", "Unit price", "Line total"]],
    body: r.items.map((i) => [
      i.name,
      i.sku,
      `${i.quantity} ${i.unit}`,
      pdfMoney(i.unitPrice, currency),
      pdfMoney(i.quantity * i.unitPrice, currency),
    ]),
    styles: { fontSize: 9, cellPadding: 8, textColor: [40, 42, 54], lineColor: LINE, lineWidth: 0.5 },
    headStyles: { fillColor: INK, textColor: 255, fontStyle: "bold", fontSize: 9 },
    alternateRowStyles: { fillColor: [247, 247, 250] },
    // Critical for multi-page receipts: without this, autoTable will
    // slice a row's text in half right at the page boundary instead of
    // pushing the whole row onto the next page.
    rowPageBreak: "avoid",
    columnStyles: {
      0: { cellWidth: 175 },
      2: { halign: "right" },
      3: { halign: "right" },
      4: { halign: "right" },
    },
    margin: { left: marginX, right: marginX, top: HEADER_H + 22, bottom: FOOTER_RESERVE + 10 },
    didDrawPage: (data) => {
      if (data.pageNumber > 1) drawHeader(true);
    },
  });

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY as number;

  const discountLines = r.discountAmount > 0 ? 1 : 0;
  const taxLines = r.taxAmount > 0 ? 1 : 0;
  const noteLines = r.note ? doc.splitTextToSize(r.note, 515).length : 0;
  const totalsBlockH = 16 + discountLines * 16 + taxLines * 16 + 18 + 22 + 20;

  let ty = finalY + 26;
  // The whole totals block is measured up front and, if it wouldn't
  // fit above the footer on the current page, pushed onto a fresh page
  // (with the header redrawn) instead of being cut off mid-block.
  if (ty + totalsBlockH > pageHeight - FOOTER_RESERVE) {
    doc.addPage();
    drawHeader(true);
    ty = HEADER_H + 40;
  }

  const totalsX = contentRight;
  const totalsLabelX = totalsX - 160;

  doc.setDrawColor(...LINE);
  doc.setFillColor(250, 250, 252);
  const totalsBoxTop = ty - 16;
  doc.roundedRect(totalsLabelX - 14, totalsBoxTop, 174 + 14, totalsBlockH - 4, 6, 6, "FD");

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  doc.setTextColor(...MUTED);
  doc.text("Subtotal", totalsLabelX, ty);
  doc.setTextColor(...INK);
  doc.text(pdfMoney(r.subtotal, currency), totalsX, ty, { align: "right" });
  ty += 16;

  if (r.discountAmount > 0) {
    doc.setTextColor(...MUTED);
    doc.text(`Discount (${r.discountPercent}%)`, totalsLabelX, ty);
    doc.setTextColor(...INK);
    doc.text(`-${pdfMoney(r.discountAmount, currency)}`, totalsX, ty, { align: "right" });
    ty += 16;
  }
  if (r.taxAmount > 0) {
    doc.setTextColor(...MUTED);
    doc.text(`Tax (${r.taxPercent}%)`, totalsLabelX, ty);
    doc.setTextColor(...INK);
    doc.text(pdfMoney(r.taxAmount, currency), totalsX, ty, { align: "right" });
    ty += 16;
  }

  doc.setDrawColor(...LINE);
  doc.line(totalsLabelX, ty, totalsX, ty);
  ty += 20;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(12);
  doc.setTextColor(...INK);
  doc.text("Total", totalsLabelX, ty);
  doc.setTextColor(...SUCCESS);
  doc.text(pdfMoney(r.total, currency), totalsX, ty, { align: "right" });

  if (r.note) {
    ty += 30;
    if (ty + noteLines * 12 > pageHeight - FOOTER_RESERVE) {
      doc.addPage();
      drawHeader(true);
      ty = HEADER_H + 40;
    }
    doc.setFont("helvetica", "italic");
    doc.setFontSize(9);
    doc.setTextColor(...MUTED);
    doc.text(`Note: ${r.note}`, marginX, ty, { maxWidth: 515 });
  }

  // Page numbers need the final page count, so they're stamped last
  // in one pass across every page that ended up being created.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pageCount = (doc.internal as any).getNumberOfPages() as number;
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    drawFooterOnCurrentPage(i, pageCount);
  }

  try {
    doc.save(`${r.receiptNumber || "receipt"}.pdf`);
  } catch (err) {
    console.error("PDF export failed", err);
    throw err;
  }
}

export function receiptToExcel(r: Receipt) {
  const currency = getCurrency();
  const rows: (string | number)[][] = [
    [heading(r)],
    [],
    ["Receipt #", r.receiptNumber],
    ["Date", formatDate(r.date)],
    ["Currency", currency],
    [partyLabel(r), r.partyName],
    ["Contact", r.partyContact],
    ["Address", r.partyAddress],
    [],
    ["Item", "SKU", "Qty", "Unit", "Unit price", "Line total"],
    ...r.items.map((i) => [i.name, i.sku, i.quantity, i.unit, i.unitPrice, i.quantity * i.unitPrice]),
    [],
    ["", "", "", "", "Subtotal", r.subtotal],
    ["", "", "", "", `Discount (${r.discountPercent}%)`, -r.discountAmount],
    ["", "", "", "", `Tax (${r.taxPercent}%)`, r.taxAmount],
    ["", "", "", "", "Total", r.total],
  ];
  if (r.note) rows.push([], ["Note", r.note]);

  const ws = XLSX.utils.aoa_to_sheet(rows);
  ws["!cols"] = [{ wch: 28 }, { wch: 14 }, { wch: 8 }, { wch: 8 }, { wch: 14 }, { wch: 14 }];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, r.receiptNumber.slice(0, 31));
  XLSX.writeFile(wb, `${r.receiptNumber}.xlsx`);
}

export function receiptsToExcel(receipts: Receipt[]) {
  const currency = getCurrency();
  const rows = receipts.map((r) => ({
    "Receipt #": r.receiptNumber,
    Type: r.type === "sale" ? "Sale" : "Purchase",
    Date: formatDate(r.date),
    Party: r.partyName,
    Items: r.items.length,
    Currency: currency,
    Subtotal: r.subtotal,
    Discount: r.discountAmount,
    Tax: r.taxAmount,
    Total: r.total,
  }));
  const ws = XLSX.utils.json_to_sheet(rows);
  ws["!cols"] = [
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
    { wch: 22 },
    { wch: 8 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Receipts");
  XLSX.writeFile(wb, `stockbase-receipts-${new Date().toISOString().slice(0, 10)}.xlsx`);
}
