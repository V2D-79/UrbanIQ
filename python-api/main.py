"""
UrbanIQ AI Service - FastAPI Backend
Smart City Citizen Management - AI-powered report analysis, suggestions, and chatbot.
"""

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any
from datetime import datetime
import threading

app = FastAPI(
    title="UrbanIQ AI Service",
    description="AI-powered analysis and chatbot for smart city citizen management",
    version="1.0.0",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ─── Request/Response Models ───────────────────────────────────────────────────

class ReportData(BaseModel):
    id: str = ""
    title: str = ""
    category: str = ""
    description: str = ""
    address: str = ""
    severity: str = "medium"
    status: str = "submitted"
    lat: float = 0.0
    lng: float = 0.0
    wardZone: str = ""
    landmark: str = ""
    userName: str = ""
    createdAt: str = ""


class AnalyzeReportRequest(BaseModel):
    report: Dict[str, Any]


class AnalyzeAllReportsRequest(BaseModel):
    reports: List[Dict[str, Any]]


class AISuggestRequest(BaseModel):
    report: Dict[str, Any]


class ChatRequest(BaseModel):
    messages: List[Dict[str, str]]
    mode: str = "citizen"  # "citizen" or "admin"
    context: Optional[Dict[str, Any]] = None


# ─── Core Endpoints ───────────────────────────────────────────────────────────

@app.get("/")
async def root():
    return {
        "service": "UrbanIQ AI Service",
        "version": "1.0.0",
        "status": "running",
        "timestamp": datetime.now().isoformat(),
    }


@app.get("/health")
async def health_check():
    return {
        "status": "healthy",
        "service": "UrbanIQ AI Service",
        "timestamp": datetime.now().isoformat(),
    }


# ─── AI Model Management ──────────────────────────────────────────────────────

@app.get("/ai/status")
async def ai_model_status():
    """Check if the AI model is loaded and ready."""
    try:
        from ai_model.model_manager import ModelManager
        mgr = ModelManager.get_instance()
        return {
            "model_status": mgr.status,
            "model_name": "Qwen2.5-0.5B-Instruct",
            "is_downloaded": mgr.is_downloaded(),
            "is_ready": mgr.is_ready,
            "is_loading": mgr.is_loading,
            "load_progress": getattr(mgr, '_load_progress', ''),
            "timestamp": datetime.now().isoformat(),
        }
    except Exception as e:
        return {
            "model_status": "not_installed",
            "is_ready": False,
            "is_loading": False,
            "error": str(e),
            "timestamp": datetime.now().isoformat(),
        }


@app.post("/ai/load")
def ai_load_model():
    """Trigger model loading (download if needed)."""
    try:
        from ai_model.model_manager import ModelManager
        mgr = ModelManager.get_instance()

        def _load():
            try:
                mgr.load_model()
            except Exception as e:
                print(f"[UrbanIQ AI] Background load failed: {e}")

        if not mgr.is_ready and not mgr.is_loading:
            thread = threading.Thread(target=_load, daemon=True)
            thread.start()

        return {
            "message": "Model loading started" if not mgr.is_ready else "Model already loaded",
            "status": mgr.status,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ─── Report Analysis Endpoints ────────────────────────────────────────────────

@app.post("/ai/analyze-report")
def ai_analyze_report(request: AnalyzeReportRequest):
    """Deep AI analysis of a single citizen report."""
    try:
        from ai_model.analyzer import analyze_report
        result = analyze_report(report=request.report)
        return result
    except Exception as e:
        import traceback
        return {
            "report_id": request.report.get("id", ""),
            "analysis": f"AI analysis available after model loads. Error: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "model": "fallback",
        }


@app.post("/ai/analyze-all-reports")
def ai_analyze_all_reports(request: AnalyzeAllReportsRequest):
    """Batch AI analysis of all reports with planning and priority."""
    try:
        from ai_model.analyzer import analyze_all_reports
        result = analyze_all_reports(reports=request.reports)
        return result
    except Exception as e:
        import traceback
        return {
            "analysis": f"AI batch analysis unavailable. Error: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "model": "fallback",
        }


@app.post("/ai/suggest")
def ai_suggest(request: AISuggestRequest):
    """AI suggestion for how to resolve a specific report."""
    try:
        from ai_model.analyzer import suggest_resolution
        result = suggest_resolution(report=request.report)
        return result
    except Exception as e:
        return {
            "report_id": request.report.get("id", ""),
            "suggestion": f"AI suggestions unavailable. Error: {str(e)}",
            "timestamp": datetime.now().isoformat(),
            "model": "fallback",
        }


# ─── Chatbot Endpoint ─────────────────────────────────────────────────────────

@app.post("/ai/chat")
def ai_chat(request: ChatRequest):
    """Chatbot endpoint for citizen guidance or admin platform info."""
    try:
        from ai_model.analyzer import chat_response
        result = chat_response(
            messages=request.messages,
            mode=request.mode,
            context=request.context,
        )
        return result
    except Exception as e:
        # Fallback responses when AI is not loaded
        if request.mode == "citizen":
            fallback = get_citizen_fallback(request.messages[-1]["content"] if request.messages else "")
        else:
            fallback = get_admin_fallback(request.messages[-1]["content"] if request.messages else "")
        return {
            "response": fallback,
            "timestamp": datetime.now().isoformat(),
            "model": "fallback",
        }


def get_citizen_fallback(question: str) -> str:
    """Provide helpful fallback responses for citizens."""
    q = question.lower()
    if any(w in q for w in ["report", "how", "submit", "file"]):
        return ("To report an issue:\n"
                "1. Go to the 'GeoTag' page from the navigation menu\n"
                "2. Click the 'Report Issue' button\n"
                "3. Fill in the title, category, description, and upload photos\n"
                "4. Click submit, then click on the map to mark the exact location\n"
                "5. Your report will be submitted and tracked!")
    elif any(w in q for w in ["status", "track", "progress", "update"]):
        return ("To track your report status:\n"
                "1. Go to 'My Dashboard' from the navigation\n"
                "2. You'll see all your submitted reports with current status\n"
                "3. Click on any report to see detailed progress updates from the maintenance team\n"
                "4. Status stages: Submitted → Under Review → In Progress → Work Completed → Verified → Closed")
    elif any(w in q for w in ["feedback", "rate", "review"]):
        return ("You can provide feedback once your report is marked as 'Work Completed':\n"
                "1. Go to your Dashboard\n"
                "2. Find the completed report\n"
                "3. Click the 'Give Feedback' button\n"
                "4. Rate the resolution (1-5 stars) and add comments")
    elif any(w in q for w in ["category", "type", "what kind"]):
        return ("Available report categories:\n"
                "• Road Damage\n• Waste Management\n• Water Supply\n• Street Lighting\n"
                "• Drainage/Sewage\n• Public Safety\n• Noise Pollution\n• Air Quality\n"
                "• Park/Green Space\n• Public Transport\n• Building/Structure\n• Electricity\n• Other")
    else:
        return ("Welcome to UrbanIQ! I can help you with:\n"
                "• How to report an issue\n"
                "• How to track your report status\n"
                "• Understanding report categories\n"
                "• Providing feedback on completed work\n\n"
                "Just ask me anything about using the platform!")


def get_admin_fallback(question: str) -> str:
    """Provide helpful fallback responses for admins."""
    q = question.lower()
    if any(w in q for w in ["hotspot", "area", "cluster"]):
        return ("Hotspot Detection:\n"
                "1. Go to the Admin GeoTag page\n"
                "2. Click the 'Find Hotspots' button\n"
                "3. Areas with the most reports will be highlighted on the map\n"
                "4. Use this to prioritize maintenance crews in high-issue areas")
    elif any(w in q for w in ["ai", "analysis", "analyze"]):
        return ("AI Analysis features:\n"
                "1. Single Report Analysis: Click on any report → 'AI Suggestion' for resolution guidance\n"
                "2. Batch Analysis: On the Reports page, click 'AI Analysis' to analyze all reports\n"
                "3. The AI provides priority rankings, resource allocation, and timeline suggestions")
    elif any(w in q for w in ["progress", "update", "status"]):
        return ("To update report progress:\n"
                "1. Go to Admin GeoTag or Admin Reports\n"
                "2. Click on a report\n"
                "3. Click 'Add Progress Update'\n"
                "4. Add description, upload work photos, and change status\n"
                "5. The citizen will see your updates in their dashboard")
    else:
        return ("Welcome to UrbanIQ Admin Panel! I can help you with:\n"
                "• Using hotspot detection\n"
                "• AI analysis and suggestions\n"
                "• Updating report progress\n"
                "• Managing citizen reports\n\n"
                "Ask me anything about the platform features!")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=True)
