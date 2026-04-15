"""
UrbanIQ Email Notification Service
Sends HTML email notifications via Gmail SMTP for:
  - New report submissions
  - Report status changes
"""

import smtplib
import threading
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime

# ─── SMTP Configuration ───────────────────────────────────────────────────────
SMTP_HOST = "smtp.gmail.com"
SMTP_PORT = 587
SENDER_EMAIL = "uomkar19@gmail.com"
SENDER_PASSWORD = "fcds smht jign mdoo"
SENDER_NAME = "UrbanIQ Platform"

STATUS_LABELS = {
    "submitted": "Submitted",
    "under_review": "Under Review",
    "in_progress": "In Progress",
    "work_completed": "Work Completed",
    "verified": "Verified",
    "closed": "Closed",
}

SEVERITY_LABELS = {
    "low": "Low",
    "medium": "Medium",
    "high": "High",
    "critical": "Critical",
}

SEVERITY_COLORS = {
    "low": "#22c55e",
    "medium": "#f59e0b",
    "high": "#ef4444",
    "critical": "#b91c1c",
}

STATUS_COLORS = {
    "submitted": "#3b82f6",
    "under_review": "#f59e0b",
    "in_progress": "#f97316",
    "work_completed": "#22c55e",
    "verified": "#10b981",
    "closed": "#64748b",
}


def _base_template(title: str, body_content: str) -> str:
    """Wrap body content with the UrbanIQ branded email shell."""
    return f"""
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>{title}</title>
</head>
<body style="margin:0;padding:0;background-color:#0a0f1a;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;color:#e5e9f0;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0a0f1a;padding:20px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;background-color:#1a2332;border-radius:16px;overflow:hidden;border:1px solid rgba(16,185,129,0.15);box-shadow:0 20px 40px rgba(0,0,0,0.4);">
          <!-- Header -->
          <tr>
            <td style="background:linear-gradient(135deg,#0d192a 0%,#1a2332 100%);padding:30px 40px;border-bottom:3px solid #10b981;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:28px;font-weight:800;color:#10b981;letter-spacing:-0.5px;">Urban</span><span style="font-size:28px;font-weight:800;color:#ffffff;letter-spacing:-0.5px;">IQ</span>
                    <br/>
                    <span style="font-size:12px;color:#94a3b8;text-transform:uppercase;letter-spacing:1.5px;">Smart City Citizen Management</span>
                  </td>
                  <td align="right" style="vertical-align:top;">
                    <span style="font-size:11px;color:#64748b;">{datetime.now().strftime('%B %d, %Y')}</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Body Content -->
          <tr>
            <td style="padding:32px 40px;">
              {body_content}
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="background-color:#0d192a;padding:24px 40px;border-top:1px solid rgba(16,185,129,0.1);">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <span style="font-size:14px;font-weight:700;color:#10b981;">Urban</span><span style="font-size:14px;font-weight:700;color:#fff;">IQ</span>
                    <span style="font-size:11px;color:#64748b;margin-left:8px;">— Transparent City Care</span>
                  </td>
                  <td align="right">
                    <span style="font-size:11px;color:#4b5563;">&copy; 2026 UrbanIQ</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>

        <table width="600" cellpadding="0" cellspacing="0" style="max-width:600px;width:100%;margin-top:16px;">
          <tr>
            <td align="center" style="font-size:11px;color:#4b5563;padding:8px;">
              This is an automated notification from UrbanIQ. Please do not reply to this email.
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
"""


def _info_row(label: str, value: str, icon: str = "•") -> str:
    """Generate a single info row for the email detail table."""
    return f"""
    <tr>
      <td style="padding:8px 12px;color:#94a3b8;font-size:13px;font-weight:600;width:130px;vertical-align:top;border-bottom:1px solid rgba(255,255,255,0.04);">
        {icon} {label}
      </td>
      <td style="padding:8px 12px;color:#e5e9f0;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04);">
        {value}
      </td>
    </tr>
    """


def build_report_created_email(report: dict, user_name: str) -> str:
    """Build HTML email for new report submission."""
    title = report.get("title", "Untitled Report")
    category = (report.get("category", "other") or "other").replace("_", " ").title()
    severity = report.get("severity", "medium")
    severity_label = SEVERITY_LABELS.get(severity, severity)
    severity_color = SEVERITY_COLORS.get(severity, "#f59e0b")
    description = (report.get("description", "No description") or "No description")[:400]
    address = report.get("address", "Not specified") or "Not specified"
    ward_zone = report.get("wardZone", "N/A") or "N/A"
    landmark = report.get("landmark", "N/A") or "N/A"
    lat = report.get("lat", 0)
    lng = report.get("lng", 0)
    location = f"{float(lat):.5f}, {float(lng):.5f}" if lat and lng else "Not geotagged"
    report_id = report.get("id", "N/A") or "N/A"
    created_at = report.get("createdAt", datetime.now().isoformat())

    body = f"""
    <!-- Greeting -->
    <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">
      Hello {user_name}! 👋
    </h1>
    <p style="font-size:15px;color:#94a3b8;margin:0 0 24px 0;line-height:1.6;">
      Your report has been <strong style="color:#10b981;">successfully submitted</strong> and is now being tracked by the UrbanIQ platform.
    </p>

    <!-- Status Badge -->
    <table cellpadding="0" cellspacing="0" style="margin-bottom:24px;">
      <tr>
        <td style="background-color:rgba(59,130,246,0.15);border:1px solid rgba(59,130,246,0.3);border-radius:20px;padding:6px 16px;">
          <span style="color:#3b82f6;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">📋 Submitted</span>
        </td>
        <td style="padding-left:8px;">
          <span style="background-color:rgba({','.join(str(int(severity_color.lstrip('#')[i:i+2], 16)) for i in (0, 2, 4))},0.15);border:1px solid {severity_color}33;border-radius:20px;padding:6px 16px;color:{severity_color};font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px;">
            ⚠️ {severity_label}
          </span>
        </td>
      </tr>
    </table>

    <!-- Report Title Card -->
    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(99,102,241,0.05) 100%);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:20px;margin-bottom:24px;">
      <h2 style="font-size:18px;font-weight:700;color:#10b981;margin:0 0 6px 0;">
        📌 {title}
      </h2>
      <p style="font-size:13px;color:#94a3b8;margin:0;">
        Category: <strong style="color:#e5e9f0;">{category}</strong>
      </p>
    </div>

    <!-- Report Details Table -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1623;border-radius:10px;overflow:hidden;border:1px solid rgba(16,185,129,0.08);margin-bottom:24px;">
      <tr>
        <td colspan="2" style="padding:12px 12px 8px;background:rgba(16,185,129,0.05);border-bottom:1px solid rgba(16,185,129,0.1);">
          <span style="font-size:13px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">📋 Report Details</span>
        </td>
      </tr>
      {_info_row("Report ID", report_id, "🆔")}
      {_info_row("Title", title, "📌")}
      {_info_row("Category", category, "📂")}
      {_info_row("Severity", severity_label, "⚠️")}
      {_info_row("Description", description, "📝")}
      {_info_row("Address", address, "📍")}
      {_info_row("Ward / Zone", ward_zone, "🏘️")}
      {_info_row("Landmark", landmark, "🗺️")}
      {_info_row("Location", location, "🌐")}
      {_info_row("Submitted On", datetime.fromisoformat(created_at.replace('Z', '+00:00')).strftime('%B %d, %Y at %I:%M %p') if created_at else 'N/A', "📅")}
    </table>

    <!-- What's Next -->
    <div style="background-color:#0f1623;border-radius:10px;padding:20px;border:1px solid rgba(99,102,241,0.1);margin-bottom:24px;">
      <h3 style="font-size:15px;font-weight:700;color:#6366f1;margin:0 0 12px 0;">🔮 What Happens Next?</h3>
      <table cellpadding="0" cellspacing="0" width="100%">
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#94a3b8;">
            <span style="color:#10b981;font-weight:700;">1.</span> City authorities will review your report
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#94a3b8;">
            <span style="color:#10b981;font-weight:700;">2.</span> You'll receive email updates on status changes
          </td>
        </tr>
        <tr>
          <td style="padding:6px 0;font-size:13px;color:#94a3b8;">
            <span style="color:#10b981;font-weight:700;">3.</span> When work is complete, you can provide feedback
          </td>
        </tr>
      </table>
    </div>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="http://localhost:5173/dashboard" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;letter-spacing:0.5px;">
            📊 Track Your Report →
          </a>
        </td>
      </tr>
    </table>
    """

    return _base_template("New Report Submitted — UrbanIQ", body)


def build_status_change_email(report: dict, old_status: str, new_status: str, user_name: str) -> str:
    """Build HTML email for report status change."""
    title = report.get("title", "Untitled Report")
    category = (report.get("category", "other") or "other").replace("_", " ").title()
    old_label = STATUS_LABELS.get(old_status, old_status or "Unknown")
    new_label = STATUS_LABELS.get(new_status, new_status or "Unknown")
    new_color = STATUS_COLORS.get(new_status, "#64748b")
    old_color = STATUS_COLORS.get(old_status, "#64748b")
    description = (report.get("description", "") or "")[:200]
    address = report.get("address", "Not specified") or "Not specified"
    report_id = report.get("id", "N/A") or "N/A"

    # Status-specific messages
    status_messages = {
        "under_review": ("🔍 Your report is now being reviewed",
                         "City authorities have acknowledged your report and are currently evaluating it. An appropriate team will be assigned shortly."),
        "in_progress": ("🔧 Work has started on your report!",
                        "Great news! A maintenance crew has been dispatched and work is now underway to resolve your reported issue."),
        "work_completed": ("✅ Work has been completed!",
                           "The repair work for your reported issue has been finished. Please check the progress photos on your dashboard and provide your valuable feedback."),
        "verified": ("🏆 Your report has been verified!",
                     "The resolution of your report has been verified and confirmed. Thank you for helping improve our city!"),
        "closed": ("📁 Report has been closed",
                   "This report has been closed. If the issue persists or reoccurs, please feel free to create a new report."),
    }
    status_headline, status_detail = status_messages.get(
        new_status,
        ("📋 Report status updated", "Your report status has been updated. Please check your dashboard for the latest details.")
    )

    # Build the progress steps visualization
    all_statuses = ["submitted", "under_review", "in_progress", "work_completed", "verified", "closed"]
    current_idx = all_statuses.index(new_status) if new_status in all_statuses else 0
    progress_steps = ""
    for i, s in enumerate(all_statuses):
        s_label = STATUS_LABELS.get(s, s)
        if i <= current_idx:
            dot_color = "#10b981"
            text_color = "#10b981"
            line_color = "#10b981" if i < current_idx else "rgba(16,185,129,0.2)"
        else:
            dot_color = "#334155"
            text_color = "#4b5563"
            line_color = "#1e293b"
        is_current = i == current_idx
        dot_size = "14px" if is_current else "10px"
        progress_steps += f"""
        <td align="center" style="position:relative;">
          <div style="width:{dot_size};height:{dot_size};border-radius:50%;background-color:{dot_color};margin:0 auto 4px;{'box-shadow:0 0 8px rgba(16,185,129,0.5);' if is_current else ''}"></div>
          <span style="font-size:9px;color:{text_color};font-weight:{'700' if is_current else '400'};">{s_label}</span>
        </td>
        """

    body = f"""
    <!-- Greeting -->
    <h1 style="font-size:22px;font-weight:700;color:#ffffff;margin:0 0 8px 0;">
      Hello {user_name}! 📬
    </h1>
    <p style="font-size:15px;color:#94a3b8;margin:0 0 24px 0;line-height:1.6;">
      There's an update on your report. Here are the details:
    </p>

    <!-- Status Change Highlight -->
    <div style="background:linear-gradient(135deg,rgba(16,185,129,0.08) 0%,rgba(99,102,241,0.05) 100%);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:24px;margin-bottom:24px;text-align:center;">
      <h2 style="font-size:20px;font-weight:700;color:#ffffff;margin:0 0 16px 0;">
        {status_headline}
      </h2>

      <!-- Old → New Status -->
      <table cellpadding="0" cellspacing="0" style="margin:0 auto 16px;">
        <tr>
          <td style="background-color:{old_color}22;border:1px solid {old_color}44;border-radius:8px;padding:8px 18px;">
            <span style="color:{old_color};font-size:13px;font-weight:700;">{old_label}</span>
          </td>
          <td style="padding:0 12px;color:#94a3b8;font-size:18px;">→</td>
          <td style="background-color:{new_color}22;border:1px solid {new_color}44;border-radius:8px;padding:8px 18px;box-shadow:0 0 12px {new_color}33;">
            <span style="color:{new_color};font-size:13px;font-weight:700;">{new_label}</span>
          </td>
        </tr>
      </table>

      <p style="font-size:13px;color:#94a3b8;margin:0;line-height:1.6;">
        {status_detail}
      </p>
    </div>

    <!-- Progress Timeline -->
    <div style="background-color:#0f1623;border-radius:10px;padding:16px 12px;border:1px solid rgba(16,185,129,0.08);margin-bottom:24px;">
      <p style="font-size:12px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin:0 0 12px 0;text-align:center;">
        📊 Progress Timeline
      </p>
      <table width="100%" cellpadding="0" cellspacing="0">
        <tr>
          {progress_steps}
        </tr>
      </table>
    </div>

    <!-- Report Summary -->
    <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#0f1623;border-radius:10px;overflow:hidden;border:1px solid rgba(16,185,129,0.08);margin-bottom:24px;">
      <tr>
        <td colspan="2" style="padding:12px 12px 8px;background:rgba(16,185,129,0.05);border-bottom:1px solid rgba(16,185,129,0.1);">
          <span style="font-size:13px;font-weight:700;color:#10b981;text-transform:uppercase;letter-spacing:1px;">📋 Report Summary</span>
        </td>
      </tr>
      {_info_row("Report ID", report_id, "🆔")}
      {_info_row("Title", title, "📌")}
      {_info_row("Category", category, "📂")}
      {_info_row("Address", address, "📍")}
      {_info_row("Updated On", datetime.now().strftime('%B %d, %Y at %I:%M %p'), "📅")}
    </table>

    <!-- CTA -->
    <table width="100%" cellpadding="0" cellspacing="0">
      <tr>
        <td align="center">
          <a href="http://localhost:5173/dashboard" style="display:inline-block;background:linear-gradient(135deg,#10b981 0%,#059669 100%);color:#000;text-decoration:none;font-weight:700;font-size:14px;padding:14px 32px;border-radius:8px;letter-spacing:0.5px;">
            📊 View Progress →
          </a>
        </td>
      </tr>
    </table>
    """

    return _base_template("Report Status Update — UrbanIQ", body)


def _send_email(to_email: str, subject: str, html_body: str):
    """Send an email via Gmail SMTP. Internal helper."""
    try:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subject
        msg["From"] = f"{SENDER_NAME} <{SENDER_EMAIL}>"
        msg["To"] = to_email

        # Plain text fallback
        plain_text = f"UrbanIQ Notification — {subject}. Please view this email in an HTML-capable email client."
        msg.attach(MIMEText(plain_text, "plain"))
        msg.attach(MIMEText(html_body, "html"))

        server = smtplib.SMTP(SMTP_HOST, SMTP_PORT)
        server.starttls()
        server.login(SENDER_EMAIL, SENDER_PASSWORD)
        server.send_message(msg)
        server.quit()
        print(f"[UrbanIQ Email] ✅ Email sent to {to_email}: {subject}")
        return True
    except Exception as e:
        print(f"[UrbanIQ Email] ❌ Failed to send email to {to_email}: {e}")
        return False


def send_report_created_email(report: dict, user_email: str, user_name: str):
    """Send report creation notification (runs in background thread)."""
    if not user_email:
        print("[UrbanIQ Email] No user email provided. Skipping.")
        return False

    subject = f"✅ Report Submitted: {report.get('title', 'New Report')} — UrbanIQ"
    html = build_report_created_email(report, user_name or "Citizen")

    # Send in background thread to not block the API
    thread = threading.Thread(target=_send_email, args=(user_email, subject, html), daemon=True)
    thread.start()
    return True


def send_status_change_email(report: dict, old_status: str, new_status: str, user_email: str, user_name: str):
    """Send status change notification (runs in background thread)."""
    if not user_email:
        print("[UrbanIQ Email] No user email provided. Skipping.")
        return False

    new_label = STATUS_LABELS.get(new_status, new_status)
    subject = f"📬 Status Update: {report.get('title', 'Report')} → {new_label} — UrbanIQ"
    html = build_status_change_email(report, old_status, new_status, user_name or "Citizen")

    # Send in background thread
    thread = threading.Thread(target=_send_email, args=(user_email, subject, html), daemon=True)
    thread.start()
    return True
