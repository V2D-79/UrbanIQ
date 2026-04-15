/**
 * UrbanIQ AI Service Client
 * Communicates with the FastAPI backend + local AI model
 */

const API_BASE = "https://urbaniq-0hse.onrender.com";

async function apiCall(endpoint, method = "GET", body = null) {
  const opts = {
    method,
    headers: { "Content-Type": "application/json" },
  };
  if (body) opts.body = JSON.stringify(body);
  const resp = await fetch(`${API_BASE}${endpoint}`, opts);
  if (!resp.ok) throw new Error(`API Error: ${resp.status}`);
  return resp.json();
}

// ─── Health Check ─────────────────────────────────────────────────────────────

export async function checkAIHealth() {
  try {
    return await apiCall("/health");
  } catch {
    return { status: "offline" };
  }
}

// ─── AI Model Management ─────────────────────────────────────────────────────

export async function getAIModelStatus() {
  try {
    return await apiCall("/ai/status");
  } catch {
    return { model_status: "offline" };
  }
}

export async function loadAIModel() {
  try {
    return await apiCall("/ai/load", "POST");
  } catch {
    return { message: "AI service unreachable", status: "offline" };
  }
}

// ─── Report Analysis ──────────────────────────────────────────────────────────

export async function analyzeReport(report) {
  try {
    return await apiCall("/ai/analyze-report", "POST", { report });
  } catch {
    return {
      report_id: report?.id || "",
      analysis: "AI service offline. Please ensure the Python API is running on port 8000.",
      timestamp: new Date().toISOString(),
      model: "fallback",
    };
  }
}

export async function analyzeAllReports(reports) {
  try {
    return await apiCall("/ai/analyze-all-reports", "POST", { reports });
  } catch {
    return {
      analysis: "AI service offline. Please ensure the Python API is running on port 8000.",
      timestamp: new Date().toISOString(),
      model: "fallback",
    };
  }
}

// ─── AI Suggestions ───────────────────────────────────────────────────────────

export async function getAISuggestion(report) {
  try {
    return await apiCall("/ai/suggest", "POST", { report });
  } catch {
    return {
      report_id: report?.id || "",
      suggestion: "AI suggestions unavailable. Ensure the Python API is running.",
      timestamp: new Date().toISOString(),
      model: "fallback",
    };
  }
}

// ─── Chatbot ──────────────────────────────────────────────────────────────────

export async function chatWithAI(messages, mode = "citizen", context = null) {
  try {
    return await apiCall("/ai/chat", "POST", { messages, mode, context });
  } catch {
    // Return fallback responses
    const lastMsg = messages[messages.length - 1]?.content || "";
    let response = "";
    
    if (mode === "citizen") {
      response = getCitizenFallback(lastMsg);
    } else {
      response = getAdminFallback(lastMsg);
    }
    
    return {
      response,
      timestamp: new Date().toISOString(),
      model: "fallback",
    };
  }
}

function getCitizenFallback(question) {
  const q = question.toLowerCase();
  if (q.includes("report") || q.includes("how") || q.includes("submit")) {
    return "To report an issue:\n1. Go to 'GeoTag' page\n2. Click 'Report Issue'\n3. Fill in details and upload photos\n4. Click on the map to mark the location\n5. Your report will be tracked!";
  }
  if (q.includes("status") || q.includes("track")) {
    return "Check your report status in 'My Dashboard'. You'll see progress updates from the maintenance team there.";
  }
  if (q.includes("feedback") || q.includes("rate")) {
    return "You can provide feedback once your report is marked as 'Work Completed'. Look for the feedback button in your dashboard.";
  }
  return "Welcome to UrbanIQ! I can help you with:\n• How to report issues\n• Tracking report status\n• Understanding categories\n• Giving feedback\n\nJust ask me anything!";
}

function getAdminFallback(question) {
  const q = question.toLowerCase();
  if (q.includes("hotspot") || q.includes("area")) {
    return "Use 'Find Hotspots' on the Admin GeoTag page to identify areas with the most concentrated reports.";
  }
  if (q.includes("ai") || q.includes("analysis")) {
    return "AI Analysis features:\n• Single report: Click report → 'AI Suggestion'\n• Batch: Reports page → 'AI Analysis' button\n• The AI provides priority rankings and resource recommendations.";
  }
  return "Welcome to UrbanIQ Admin! I can help with:\n• Hotspot detection\n• AI analysis features\n• Progress updates\n• Report management\n\nAsk me anything!";
}
