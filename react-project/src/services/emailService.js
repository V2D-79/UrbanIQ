/**
 * UrbanIQ Email Notification Service
 * Sends notifications via the Python backend email API (Gmail SMTP)
 * No external EmailJS dependency needed — the backend handles all email delivery.
 */

const API_BASE = "http://localhost:8000";

/**
 * Send email notification when a new report is created
 * @param {object} report - The report data
 * @param {string} userEmail - The user's email address
 * @param {string} userName - The user's display name
 */
export async function sendReportCreatedEmail(report, userEmail, userName) {
  if (!userEmail) {
    console.log("[UrbanIQ Email] No user email provided. Skipping notification.");
    return false;
  }

  try {
    const resp = await fetch(`${API_BASE}/email/send-report-created`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report,
        userEmail,
        userName: userName || "Citizen",
      }),
    });

    const data = await resp.json();
    if (data.success) {
      console.log("[UrbanIQ Email] ✅ Report creation email sent to:", userEmail);
    } else {
      console.warn("[UrbanIQ Email] Email skipped:", data.message);
    }
    return data.success;
  } catch (error) {
    console.warn("[UrbanIQ Email] Failed to send report creation email:", error);
    return false;
  }
}

/**
 * Send email notification when report status changes
 * @param {object} report - The report data
 * @param {string} oldStatus - Previous status
 * @param {string} newStatus - New status
 * @param {string} userEmail - The user's email address
 * @param {string} userName - The user's display name
 */
export async function sendStatusChangeEmail(report, oldStatus, newStatus, userEmail, userName) {
  if (!userEmail) {
    console.log("[UrbanIQ Email] No user email provided. Skipping notification.");
    return false;
  }

  try {
    const resp = await fetch(`${API_BASE}/email/send-status-changed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        report,
        oldStatus,
        newStatus,
        userEmail,
        userName: userName || "Citizen",
      }),
    });

    const data = await resp.json();
    if (data.success) {
      console.log("[UrbanIQ Email] ✅ Status change email sent to:", userEmail);
    } else {
      console.warn("[UrbanIQ Email] Email skipped:", data.message);
    }
    return data.success;
  } catch (error) {
    console.warn("[UrbanIQ Email] Failed to send status change email:", error);
    return false;
  }
}
