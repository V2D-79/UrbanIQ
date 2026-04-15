/**
 * UrbanIQ Email Notification Service
 * Uses EmailJS for frontend-only email integration
 * No backend email server needed
 */

import emailjs from "@emailjs/browser";

// ═══════════════════════════════════════════════════════════════════════════════
// EmailJS Configuration — Replace with your own credentials
// Sign up at https://www.emailjs.com (free: 200 emails/month)
// ═══════════════════════════════════════════════════════════════════════════════
const EMAILJS_SERVICE_ID = "service_urbaniq";
const EMAILJS_PUBLIC_KEY = "YOUR_PUBLIC_KEY";    // Replace with your EmailJS public key
const TEMPLATE_REPORT_CREATED = "template_report_created";
const TEMPLATE_STATUS_CHANGED = "template_status_changed";

// Initialize EmailJS
let initialized = false;
function initEmailJS() {
  if (!initialized) {
    try {
      emailjs.init(EMAILJS_PUBLIC_KEY);
      initialized = true;
    } catch (e) {
      console.warn("[UrbanIQ Email] EmailJS initialization failed:", e);
    }
  }
}

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

/**
 * Send email notification when a new report is created
 */
export async function sendReportCreatedEmail(report, userEmail, userName) {
  initEmailJS();

  if (!userEmail || EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
    console.log("[UrbanIQ Email] Email not configured or no user email. Skipping notification.");
    console.log("[UrbanIQ Email] Report created:", report.title);
    return false;
  }

  try {
    const templateParams = {
      to_email: userEmail,
      to_name: userName || "Citizen",
      report_title: report.title || "Untitled Report",
      report_id: report.id || "N/A",
      report_category: (report.category || "other").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      report_severity: SEVERITY_LABELS[report.severity] || report.severity || "Medium",
      report_description: (report.description || "No description").substring(0, 500),
      report_address: report.address || "Not specified",
      report_ward: report.wardZone || "N/A",
      report_landmark: report.landmark || "N/A",
      report_date: new Date().toLocaleString(),
      report_status: "Submitted",
      report_location: report.lat && report.lng
        ? `${Number(report.lat).toFixed(5)}, ${Number(report.lng).toFixed(5)}`
        : "Not geotagged yet",
      platform_name: "UrbanIQ",
      dashboard_link: `${window.location.origin}/dashboard`,
    };

    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_REPORT_CREATED, templateParams, EMAILJS_PUBLIC_KEY);
    console.log("[UrbanIQ Email] Report creation email sent to:", userEmail);
    return true;
  } catch (error) {
    console.warn("[UrbanIQ Email] Failed to send report creation email:", error);
    return false;
  }
}

/**
 * Send email notification when report status changes
 */
export async function sendStatusChangeEmail(report, oldStatus, newStatus, userEmail, userName) {
  initEmailJS();

  if (!userEmail || EMAILJS_PUBLIC_KEY === "YOUR_PUBLIC_KEY") {
    console.log("[UrbanIQ Email] Email not configured or no user email. Skipping notification.");
    console.log("[UrbanIQ Email] Status changed:", oldStatus, "→", newStatus);
    return false;
  }

  try {
    const templateParams = {
      to_email: userEmail,
      to_name: userName || "Citizen",
      report_title: report.title || "Untitled Report",
      report_id: report.id || "N/A",
      report_category: (report.category || "other").replace(/_/g, " ").replace(/\b\w/g, (l) => l.toUpperCase()),
      old_status: STATUS_LABELS[oldStatus] || oldStatus || "Unknown",
      new_status: STATUS_LABELS[newStatus] || newStatus || "Unknown",
      report_description: (report.description || "No description").substring(0, 300),
      report_address: report.address || "Not specified",
      status_date: new Date().toLocaleString(),
      platform_name: "UrbanIQ",
      dashboard_link: `${window.location.origin}/dashboard`,
      status_message: getStatusMessage(newStatus),
    };

    await emailjs.send(EMAILJS_SERVICE_ID, TEMPLATE_STATUS_CHANGED, templateParams, EMAILJS_PUBLIC_KEY);
    console.log("[UrbanIQ Email] Status change email sent to:", userEmail);
    return true;
  } catch (error) {
    console.warn("[UrbanIQ Email] Failed to send status change email:", error);
    return false;
  }
}

/**
 * Get a human-readable status change message
 */
function getStatusMessage(newStatus) {
  switch (newStatus) {
    case "under_review":
      return "Your report is now being reviewed by city authorities. You will be notified of further progress.";
    case "in_progress":
      return "Great news! Work has begun on resolving your reported issue. Our crew is on it!";
    case "work_completed":
      return "The repair work has been completed! Please check the progress photos and provide your feedback.";
    case "verified":
      return "Your report has been verified as resolved. Thank you for helping improve our city!";
    case "closed":
      return "This report has been closed. If the issue persists, please create a new report.";
    default:
      return "Your report status has been updated. Please check your dashboard for details.";
  }
}
