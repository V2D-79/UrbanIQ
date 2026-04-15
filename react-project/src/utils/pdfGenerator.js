/**
 * UrbanIQ PDF Generator
 * Generates PDF reports for citizen issues and admin summaries
 * Uses jsPDF + autoTable for structured, professional PDFs
 */

import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

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

const SEVERITY_COLORS = {
  low: [34, 197, 94],
  medium: [245, 158, 11],
  high: [239, 68, 68],
  critical: [185, 28, 28],
};

const STATUS_COLORS = {
  submitted: [59, 130, 246],
  under_review: [245, 158, 11],
  in_progress: [249, 115, 22],
  work_completed: [34, 197, 94],
  verified: [16, 185, 129],
  closed: [100, 116, 139],
};

function drawHeader(doc, pageWidth, title, subtitle) {
  // Gradient-like header
  doc.setFillColor(13, 25, 42);
  doc.rect(0, 0, pageWidth, 40, "F");

  // Accent bar
  doc.setFillColor(16, 185, 129);
  doc.rect(0, 38, pageWidth, 3, "F");

  // Logo text
  doc.setTextColor(16, 185, 129);
  doc.setFontSize(24);
  doc.setFont("helvetica", "bold");
  doc.text("UrbanIQ", 14, 18);

  // City icon indicator
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text("Smart City Citizen Management Platform", 14, 25);

  // Title
  doc.setFontSize(11);
  doc.setTextColor(226, 232, 240);
  doc.text(title, 14, 33);

  // Right side info
  doc.setFontSize(8);
  doc.setTextColor(148, 163, 184);
  doc.text(`Generated: ${new Date().toLocaleString()}`, pageWidth - 14, 18, { align: "right" });
  if (subtitle) {
    doc.text(subtitle, pageWidth - 14, 25, { align: "right" });
  }
}

function drawFooter(doc, pageWidth, pageHeight, pageNum, totalPages) {
  doc.setFillColor(13, 25, 42);
  doc.rect(0, pageHeight - 18, pageWidth, 18, "F");
  doc.setFillColor(16, 185, 129);
  doc.rect(0, pageHeight - 18, pageWidth, 1, "F");

  doc.setFontSize(7);
  doc.setTextColor(148, 163, 184);
  doc.text("UrbanIQ — Smart City Citizen Management Platform", 14, pageHeight - 8);
  doc.text(`Page ${pageNum} of ${totalPages}`, pageWidth - 14, pageHeight - 8, { align: "right" });
  doc.text("Confidential Report", pageWidth / 2, pageHeight - 8, { align: "center" });
}

function drawSectionTitle(doc, y, icon, title) {
  doc.setFillColor(16, 185, 129);
  doc.rect(14, y - 5, 3, 14, "F");
  doc.setFontSize(13);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(30, 41, 59);
  doc.text(`${icon} ${title}`, 22, y + 5);
  return y + 16;
}

export function generateReportPDF(report, progressUpdates = [], feedback = null, aiAnalysis = null) {
  try {
    const doc = new jsPDF();
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    drawHeader(doc, pageWidth, `Report: ${(report.title || "Untitled").substring(0, 50)}`, `ID: ${report.id || "N/A"}`);

    let y = 50;

    // Report Title
    doc.setFontSize(18);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);
    doc.text(report.title || "Untitled Report", 14, y);
    y += 10;

    // Status & Severity inline badges
    const statusColor = STATUS_COLORS[report.status] || [100, 116, 139];
    const sevColor = SEVERITY_COLORS[report.severity] || [245, 158, 11];

    doc.setFillColor(...statusColor);
    doc.roundedRect(14, y - 4, 45, 10, 3, 3, "F");
    doc.setFontSize(8);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(255, 255, 255);
    doc.text(STATUS_LABELS[report.status] || report.status || "N/A", 16, y + 3);

    doc.setFillColor(...sevColor);
    doc.roundedRect(64, y - 4, 35, 10, 3, 3, "F");
    doc.setTextColor(255, 255, 255);
    doc.text(SEVERITY_LABELS[report.severity] || report.severity || "N/A", 66, y + 3);

    doc.setFontSize(8);
    doc.setTextColor(100, 116, 139);
    doc.setFont("helvetica", "normal");
    doc.text(
      `Category: ${(report.category || "N/A").replace(/_/g, " ")} | Date: ${report.createdAt ? new Date(report.createdAt).toLocaleDateString() : "N/A"}`,
      106, y + 3
    );

    y += 18;

    // Report Details Table
    y = drawSectionTitle(doc, y, "📋", "Report Details");

    autoTable(doc, {
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
        ["Report ID", report.id || "N/A"],
      ],
      styles: { fontSize: 9, cellPadding: 4, lineColor: [226, 232, 240], lineWidth: 0.5 },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      columnStyles: { 0: { fontStyle: "bold", cellWidth: 40, textColor: [51, 65, 85] } },
      margin: { left: 14, right: 14 },
    });

    y = doc.lastAutoTable.finalY + 15;

    // Progress Updates
    if (progressUpdates && progressUpdates.length > 0) {
      if (y > 230) { doc.addPage(); y = 20; }

      y = drawSectionTitle(doc, y, "📊", "Progress Updates");

      const progressRows = progressUpdates.map((p, i) => [
        i + 1,
        STATUS_LABELS[p.status] || p.status || "N/A",
        (p.description || "No description").substring(0, 80),
        p.authorityName || "N/A",
        p.createdAt ? new Date(p.createdAt).toLocaleDateString() : "N/A",
      ]);

      autoTable(doc, {
        startY: y,
        head: [["#", "Status", "Description", "Updated By", "Date"]],
        body: progressRows,
        styles: { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.5 },
        headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255] },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 70 } },
        margin: { left: 14, right: 14 },
      });

      y = doc.lastAutoTable.finalY + 15;
    }

    // AI Analysis
    if (aiAnalysis) {
      if (y > 220) { doc.addPage(); y = 20; }

      y = drawSectionTitle(doc, y, "🤖", "AI Analysis");

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      const analysisText = typeof aiAnalysis === "string" ? aiAnalysis : (aiAnalysis.analysis || aiAnalysis.suggestion || "No analysis available");
      const lines = doc.splitTextToSize(analysisText, pageWidth - 28);

      for (const line of lines) {
        if (y > pageHeight - 30) { doc.addPage(); y = 20; }
        doc.text(line, 14, y);
        y += 5;
      }
      y += 10;
    }

    // Feedback
    if (feedback) {
      if (y > 240) { doc.addPage(); y = 20; }

      y = drawSectionTitle(doc, y, "⭐", "Citizen Feedback");

      doc.setFontSize(10);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      const stars = "★".repeat(feedback.rating || 0) + "☆".repeat(5 - (feedback.rating || 0));
      doc.text(`Rating: ${stars} (${feedback.rating || 0}/5)`, 14, y);
      y += 7;
      if (feedback.comment) {
        const commentLines = doc.splitTextToSize(`Comment: ${feedback.comment}`, pageWidth - 28);
        for (const line of commentLines) {
          if (y > pageHeight - 30) { doc.addPage(); y = 20; }
          doc.text(line, 14, y);
          y += 5;
        }
      }
    }

    // Add footers to all pages
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawFooter(doc, pageWidth, pageHeight, i, pageCount);
    }

    doc.save(`UrbanIQ_Report_${(report.title || "report").replace(/[^a-zA-Z0-9]/g, "_").substring(0, 30)}_${new Date().toISOString().split("T")[0]}.pdf`);
    return true;
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("PDF generation failed. Error: " + err.message);
    return false;
  }
}

export function generateAllReportsPDF(reports, stats = {}, aiAnalysis = null) {
  try {
    const doc = new jsPDF("landscape");
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    // Header
    drawHeader(doc, pageWidth, "All Reports Summary", `Total: ${reports.length} reports`);

    // Stats Summary
    let y = 50;
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30, 41, 59);

    const statsItems = [
      [`Total Reports: ${stats.totalReports || reports.length}`, [59, 130, 246]],
      [`Resolved: ${stats.resolvedReports || 0}`, [34, 197, 94]],
      [`In Progress: ${stats.inProgressReports || 0}`, [249, 115, 22]],
      [`Satisfaction: ${stats.satisfactionRate || 0}%`, [245, 158, 11]],
    ];

    let xPos = 14;
    statsItems.forEach(([text, color]) => {
      doc.setFillColor(...color);
      doc.roundedRect(xPos, y - 5, 60, 14, 3, 3, "F");
      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(255, 255, 255);
      doc.text(text, xPos + 4, y + 4);
      xPos += 66;
    });

    y += 22;

    // Reports Table
    const rows = reports.map((r, i) => [
      i + 1,
      (r.title || "Untitled").substring(0, 35),
      (r.category || "N/A").replace(/_/g, " "),
      SEVERITY_LABELS[r.severity] || "N/A",
      STATUS_LABELS[r.status] || "N/A",
      (r.address || "N/A").substring(0, 30),
      r.userName || "N/A",
      r.createdAt ? new Date(r.createdAt).toLocaleDateString() : "N/A",
    ]);

    autoTable(doc, {
      startY: y,
      head: [["#", "Title", "Category", "Severity", "Status", "Address", "Reporter", "Date"]],
      body: rows,
      styles: { fontSize: 8, cellPadding: 3, lineColor: [226, 232, 240], lineWidth: 0.5 },
      headStyles: { fillColor: [16, 185, 129], textColor: [255, 255, 255], fontStyle: "bold" },
      alternateRowStyles: { fillColor: [248, 250, 252] },
      margin: { left: 14, right: 14 },
    });

    // AI Analysis Section (if available)
    if (aiAnalysis?.analysis) {
      doc.addPage();
      let ay = 20;

      ay = drawSectionTitle(doc, ay, "🤖", "AI City-Wide Analysis");

      doc.setFontSize(9);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(51, 65, 85);

      const lines = doc.splitTextToSize(aiAnalysis.analysis, pageWidth - 28);
      for (const line of lines) {
        if (ay > pageHeight - 30) { doc.addPage(); ay = 20; }
        doc.text(line, 14, ay);
        ay += 5;
      }
    }

    // Footers
    const pageCount = doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      doc.setPage(i);
      drawFooter(doc, pageWidth, pageHeight, i, pageCount);
    }

    doc.save(`UrbanIQ_All_Reports_${new Date().toISOString().split("T")[0]}.pdf`);
    return true;
  } catch (err) {
    console.error("PDF generation failed:", err);
    alert("PDF generation failed. Error: " + err.message);
    return false;
  }
}
