/**
 * UrbanIQ PDF Generator
 * Generates PDF reports for citizen issues and admin summaries
 */

import jsPDF from "jspdf";
import "jspdf-autotable";

const STATUS_LABELS = {
  submitted: "Submitted",
  under_review: "Under Review",
  in_progress: "In Progress",
  work_completed: "Work Completed",
  verified: "Verified",
  closed: "Closed",
};

const SEVERITY_LABELS = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
};

export function generateReportPDF(report, progressUpdates = [], feedback = null) {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  let y = 20;

  // Header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 35, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("UrbanIQ", 14, 15);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Smart City Citizen Management Platform", 14, 22);
  doc.text(`Report ID: ${report.id || "N/A"}`, 14, 29);
  doc.text(`Generated: ${new Date().toLocaleDateString()}`, pageWidth - 60, 29);

  y = 45;
  doc.setTextColor(0, 0, 0);

  // Report Title
  doc.setFontSize(16);
  doc.setFont("helvetica", "bold");
  doc.text(report.title || "Untitled Report", 14, y);
  y += 10;

  // Status & Severity badges
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text(`Status: ${STATUS_LABELS[report.status] || report.status || "N/A"}`, 14, y);
  doc.text(`Severity: ${SEVERITY_LABELS[report.severity] || report.severity || "N/A"}`, 100, y);
  y += 8;
  doc.text(`Category: ${(report.category || "N/A").replace(/_/g, " ")}`, 14, y);
  doc.text(`Date: ${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "N/A"}`, 100, y);
  y += 12;

  // Report Details Table
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.text("Report Details", 14, y);
  y += 6;

  doc.autoTable({
    startY: y,
    head: [["Field", "Value"]],
    body: [
      ["Title", report.title || "N/A"],
      ["Category", (report.category || "N/A").replace(/_/g, " ")],
      ["Description", report.description || "N/A"],
      ["Address", report.address || "N/A"],
      ["Ward/Zone", report.wardZone || "N/A"],
      ["Landmark", report.landmark || "N/A"],
      ["Location", report.lat && report.lng ? `${Number(report.lat).toFixed(5)}, ${Number(report.lng).toFixed(5)}` : "N/A"],
      ["Severity", SEVERITY_LABELS[report.severity] || "N/A"],
      ["Status", STATUS_LABELS[report.status] || "N/A"],
      ["Reported By", report.userName || "N/A"],
      ["Contact", report.contactPhone || "N/A"],
      ["Recurring", report.isRecurring ? `Yes (${report.recurringFrequency || "N/A"})` : "No"],
      ["Preferred Date", report.preferredDate || "N/A"],
    ],
    styles: { fontSize: 9, cellPadding: 3 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 245, 250] },
    columnStyles: { 0: { fontStyle: "bold", cellWidth: 40 } },
  });

  y = doc.lastAutoTable.finalY + 15;

  // Progress Updates
  if (progressUpdates.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Progress Updates", 14, y);
    y += 6;

    const progressRows = progressUpdates.map((p, i) => [
      i + 1,
      STATUS_LABELS[p.status] || p.status || "N/A",
      p.description || "No description",
      p.authorityName || "N/A",
      p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A",
    ]);

    doc.autoTable({
      startY: y,
      head: [["#", "Status", "Description", "Updated By", "Date"]],
      body: progressRows,
      styles: { fontSize: 8, cellPadding: 3 },
      headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [240, 245, 250] },
      columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 70 } },
    });

    y = doc.lastAutoTable.finalY + 15;
  }

  // Feedback
  if (feedback) {
    if (y > 250) { doc.addPage(); y = 20; }
    doc.setFontSize(12);
    doc.setFont("helvetica", "bold");
    doc.text("Citizen Feedback", 14, y);
    y += 8;
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.text(`Rating: ${"★".repeat(feedback.rating || 0)}${"☆".repeat(5 - (feedback.rating || 0))} (${feedback.rating || 0}/5)`, 14, y);
    y += 6;
    if (feedback.comment) {
      doc.text(`Comment: ${feedback.comment}`, 14, y, { maxWidth: pageWidth - 28 });
    }
  }

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `UrbanIQ Report — Page ${i} of ${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`UrbanIQ_Report_${(report.title || "report").replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}.pdf`);
}

export function generateAllReportsPDF(reports, stats = {}) {
  const doc = new jsPDF("landscape");
  const pageWidth = doc.internal.pageSize.getWidth();

  // Header
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 0, pageWidth, 30, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("UrbanIQ — All Reports Summary", 14, 18);
  doc.setFontSize(9);
  doc.text(`Generated: ${new Date().toLocaleString()} | Total: ${reports.length} reports`, pageWidth - 100, 18);

  // Stats Summary
  let y = 40;
  doc.setTextColor(0, 0, 0);
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.text(`Total: ${stats.totalReports || reports.length}`, 14, y);
  doc.text(`Resolved: ${stats.resolvedReports || 0}`, 80, y);
  doc.text(`In Progress: ${stats.inProgressReports || 0}`, 150, y);
  doc.text(`Satisfaction: ${stats.satisfactionRate || 0}%`, 230, y);
  y += 12;

  // Reports Table
  const rows = reports.map((r, i) => [
    i + 1,
    (r.title || "Untitled").substring(0, 30),
    (r.category || "N/A").replace(/_/g, " "),
    SEVERITY_LABELS[r.severity] || "N/A",
    STATUS_LABELS[r.status] || "N/A",
    (r.address || "N/A").substring(0, 25),
    r.userName || "N/A",
    r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
  ]);

  doc.autoTable({
    startY: y,
    head: [["#", "Title", "Category", "Severity", "Status", "Address", "Reporter", "Date"]],
    body: rows,
    styles: { fontSize: 8, cellPadding: 2 },
    headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [240, 245, 250] },
  });

  // Footer
  const pageCount = doc.internal.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setTextColor(128, 128, 128);
    doc.text(
      `UrbanIQ Summary Report — Page ${i}/${pageCount}`,
      pageWidth / 2,
      doc.internal.pageSize.getHeight() - 10,
      { align: "center" }
    );
  }

  doc.save(`UrbanIQ_All_Reports_${new Date().toISOString().split("T")[0]}.pdf`);
}
