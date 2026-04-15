"""
UrbanIQ AI Analyzer
Uses the local Qwen2.5-0.5B model to provide urban issue analysis,
resolution suggestions, and chatbot responses.
"""

from .model_manager import ModelManager
from datetime import datetime
import json

# ═══════════════════════════════════════════════════════════════════════════════
# SYSTEM PROMPTS
# ═══════════════════════════════════════════════════════════════════════════════

REPORT_ANALYSIS_PROMPT = """You are UrbanIQ AI, a smart city maintenance analysis system.
You analyze citizen-reported urban infrastructure issues.

YOUR ANALYSIS MUST INCLUDE:

1. SEVERITY ASSESSMENT: Rate the issue (LOW / MEDIUM / HIGH / CRITICAL)
2. IMPACT ANALYSIS: Who and what is affected by this issue
3. ROOT CAUSE: Likely reasons this issue occurred
4. SAFETY CONCERNS: Any immediate safety risks to citizens
5. REQUIRED RESOURCES: Equipment, materials, and workforce needed
6. ESTIMATED TIMELINE: How long the repair should take
7. PRIORITY SCORE: 1-100 rating for scheduling
8. RECOMMENDED ACTIONS: Step-by-step resolution plan
9. PREVENTION: How to prevent recurrence

ANALYSIS RULES:
- Road damage near schools/hospitals = CRITICAL priority
- Water supply issues = HIGH priority (public health)
- Street lighting failures at night = HIGH priority (safety)
- Waste management in residential areas = HIGH priority (health hazard)
- Drainage issues during monsoon season = CRITICAL
- Electricity issues = HIGH priority (essential service)

Be specific. Use exact details from the report. Provide actionable recommendations.
Format your response clearly with section headers."""

BATCH_ANALYSIS_PROMPT = """You are UrbanIQ AI, analyzing multiple citizen reports for a city maintenance authority.
Evaluate all reports together to provide:

1. PRIORITY RANKING: Order reports by urgency and impact
2. AREA-WISE GROUPING: Group nearby reports for efficient crew deployment  
3. RESOURCE PLANNING: Total resources needed across all reports
4. TIMELINE SUGGESTION: Proposed schedule for addressing all issues
5. PATTERN DETECTION: Common issues that may share root causes
6. BUDGET ESTIMATION: Approximate cost breakdown by category
7. CREW ALLOCATION: How to distribute maintenance teams
8. QUICK WINS: Issues that can be resolved quickly for citizen satisfaction

Provide a comprehensive city-wide maintenance plan. Be specific and data-driven."""

SUGGESTION_PROMPT = """You are UrbanIQ AI, providing expert resolution advice for urban infrastructure issues.
For the given citizen report, provide:

1. WHAT TO DO: Clear step-by-step resolution plan
2. HOW TO DO IT: Technical approach and methodology
3. MATERIALS NEEDED: Specific materials and quantities
4. EQUIPMENT REQUIRED: Tools and machinery needed  
5. WORKFORCE: Number and type of workers needed
6. ESTIMATED COST: Approximate budget
7. TIMELINE: Expected duration of repair work
8. SAFETY PRECAUTIONS: Safety measures during repair
9. QUALITY CHECK: How to verify the repair was successful
10. SIMILAR CASES: Reference to how such issues are typically resolved

Be practical and specific. Give advice that a maintenance crew can directly follow."""

CITIZEN_CHAT_PROMPT = """You are UrbanIQ Assistant, a friendly and helpful chatbot for citizens using the UrbanIQ smart city platform.

Your role:
- Help citizens understand how to report issues
- Guide them through the reporting process
- Explain what categories to choose
- Help them describe their issues effectively
- Explain the status tracking system
- Answer questions about the platform

When a citizen describes a problem/scenario:
- Suggest the appropriate category (Road Damage, Waste Management, Water Supply, Street Lighting, Drainage/Sewage, Public Safety, Noise Pollution, Air Quality, Park/Green Space, Public Transport, Building/Structure, Electricity, Other)
- Suggest the appropriate severity level
- Help them write a clear description
- Advise on what photos to take

Be friendly, concise, and helpful. Use simple language."""

ADMIN_CHAT_PROMPT = """You are UrbanIQ Admin Assistant, a knowledgeable chatbot for city maintenance authorities.

Your role:
- Explain platform features and capabilities
- Guide admins on using AI analysis tools
- Explain hotspot detection and map features
- Help with report management workflow
- Provide tips for efficient maintenance scheduling
- Explain dashboard metrics and reports

Be professional, informative, and concise."""


def _format_report_data(report):
    """Format a report into a structured prompt for the AI model."""
    lines = []
    lines.append(f"REPORT: {report.get('title', 'Untitled')}")
    lines.append(f"  ID: {report.get('id', 'N/A')}")
    lines.append(f"  Category: {report.get('category', 'Unknown')}")
    lines.append(f"  Severity: {report.get('severity', 'medium')}")
    lines.append(f"  Status: {report.get('status', 'submitted')}")
    lines.append(f"  Description: {report.get('description', 'No description')}")
    lines.append(f"  Address: {report.get('address', 'N/A')}")
    lines.append(f"  Ward/Zone: {report.get('wardZone', 'N/A')}")
    lines.append(f"  Landmark: {report.get('landmark', 'N/A')}")
    lines.append(f"  Location: {report.get('lat', 0):.5f}, {report.get('lng', 0):.5f}")
    lines.append(f"  Reported By: {report.get('userName', 'Anonymous')}")
    lines.append(f"  Date: {report.get('createdAt', 'N/A')}")
    if report.get('isRecurring'):
        lines.append(f"  Recurring Issue: Yes ({report.get('recurringFrequency', 'unknown frequency')})")
    return "\n".join(lines)


def analyze_report(report):
    """Analyze a single citizen report using the AI model."""
    mgr = ModelManager.get_instance()

    data_text = _format_report_data(report)
    now = datetime.now()

    user_prompt = f"""Analyze this citizen report. Current time: {now.strftime('%Y-%m-%d %H:%M')}.

{data_text}

Provide complete analysis including severity assessment, impact analysis, root cause, safety concerns, required resources, timeline, priority score, recommended actions, and prevention measures."""

    messages = [
        {"role": "system", "content": REPORT_ANALYSIS_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    analysis_text = mgr.generate(messages, max_new_tokens=768, temperature=0.6)

    return {
        "report_id": report.get("id", ""),
        "report_title": report.get("title", "Untitled"),
        "category": report.get("category", "unknown"),
        "analysis": analysis_text,
        "timestamp": now.isoformat(),
        "model": "Qwen2.5-0.5B-Instruct",
    }


def analyze_all_reports(reports):
    """Analyze all reports together for city-wide planning."""
    mgr = ModelManager.get_instance()

    if not reports:
        return {
            "analysis": "No reports found. The system has no pending issues to analyze.",
            "timestamp": datetime.now().isoformat(),
        }

    # Build summary of all reports
    parts = [f"CITY MAINTENANCE REPORTS — {len(reports)} total reports\n"]

    # Category summary
    categories = {}
    severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    status_counts = {}
    
    for report in reports[:30]:  # Limit for context window
        cat = report.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1
        sev = report.get("severity", "medium").lower()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        status = report.get("status", "submitted")
        status_counts[status] = status_counts.get(status, 0) + 1
        parts.append(_format_report_data(report))
        parts.append("")

    parts.insert(1, f"CATEGORY BREAKDOWN: {json.dumps(categories)}")
    parts.insert(2, f"SEVERITY BREAKDOWN: {json.dumps(severity_counts)}")
    parts.insert(3, f"STATUS BREAKDOWN: {json.dumps(status_counts)}")
    parts.insert(4, "")

    system_text = "\n".join(parts)
    now = datetime.now()

    user_prompt = f"""Analyze all these citizen reports for city-wide maintenance planning. Time: {now.strftime('%Y-%m-%d %H:%M')}.

{system_text}

Provide comprehensive analysis: priority ranking, area-wise grouping, resource planning, timeline, pattern detection, budget estimation, crew allocation, and quick wins."""

    messages = [
        {"role": "system", "content": BATCH_ANALYSIS_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    analysis_text = mgr.generate(messages, max_new_tokens=1024, temperature=0.6)

    return {
        "analysis": analysis_text,
        "total_reports": len(reports),
        "category_breakdown": categories,
        "severity_breakdown": severity_counts,
        "status_breakdown": status_counts,
        "timestamp": now.isoformat(),
        "model": "Qwen2.5-0.5B-Instruct",
    }


def suggest_resolution(report):
    """Provide AI suggestion for resolving a specific report."""
    mgr = ModelManager.get_instance()

    data_text = _format_report_data(report)
    now = datetime.now()

    user_prompt = f"""Provide detailed resolution guidance for this citizen report:

{data_text}

Give a practical, actionable resolution plan that a maintenance crew can directly follow. Include what to do, how to do it, materials needed, estimated cost, timeline, and safety precautions."""

    messages = [
        {"role": "system", "content": SUGGESTION_PROMPT},
        {"role": "user", "content": user_prompt},
    ]

    suggestion_text = mgr.generate(messages, max_new_tokens=768, temperature=0.6)

    return {
        "report_id": report.get("id", ""),
        "report_title": report.get("title", "Untitled"),
        "suggestion": suggestion_text,
        "timestamp": now.isoformat(),
        "model": "Qwen2.5-0.5B-Instruct",
    }


def chat_response(messages, mode="citizen", context=None):
    """Generate chatbot response for citizen or admin mode."""
    mgr = ModelManager.get_instance()

    system_prompt = CITIZEN_CHAT_PROMPT if mode == "citizen" else ADMIN_CHAT_PROMPT

    # Add context if provided
    if context:
        system_prompt += f"\n\nCurrent context: {json.dumps(context)}"

    chat_messages = [{"role": "system", "content": system_prompt}]

    # Add conversation history (limit to last 6 messages for context window)
    for msg in messages[-6:]:
        chat_messages.append({
            "role": msg.get("role", "user"),
            "content": msg.get("content", ""),
        })

    response_text = mgr.generate(chat_messages, max_new_tokens=512, temperature=0.7)

    return {
        "response": response_text,
        "timestamp": datetime.now().isoformat(),
        "model": "Qwen2.5-0.5B-Instruct",
    }
