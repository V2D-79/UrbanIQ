"""
UrbanIQ AI Analyzer
Uses the local Qwen2.5-0.5B model to provide urban issue analysis,
resolution suggestions, and chatbot responses.
Includes robust rule-based fallback when the model is not available.
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


# ═══════════════════════════════════════════════════════════════════════════════
# RULE-BASED FALLBACK ANALYSIS
# ═══════════════════════════════════════════════════════════════════════════════

CATEGORY_ANALYSIS = {
    "road_damage": {
        "impact": "Road damage affects vehicular traffic, pedestrian safety, and can cause vehicle damage. Nearby residents and commuters are directly impacted.",
        "root_cause": "Common causes include heavy traffic load, water seepage, poor construction quality, aging infrastructure, and extreme weather conditions.",
        "safety": "MODERATE TO HIGH — Potholes and road cracks can cause accidents, vehicle damage, and injury to two-wheeler riders and pedestrians.",
        "resources": "Road repair crew (4-6 workers), asphalt/concrete mix, compactor, road roller, traffic cones, warning signs.",
        "timeline": "Minor pothole: 1-2 days | Major road damage: 3-7 days | Full resurfacing: 1-3 weeks",
        "actions": ["1. Assess damage extent and depth", "2. Set up traffic diversions and warning signs", "3. Clean debris and prepare surface", "4. Fill with appropriate material (asphalt/concrete)", "5. Compact and level the surface", "6. Allow curing time", "7. Remove barriers and restore traffic flow"],
        "prevention": "Regular road inspections, proper drainage maintenance, load limit enforcement, quality construction materials.",
        "cost": "₹5,000 - ₹50,000 per patch | ₹2-5 lakhs for major repair",
        "base_priority": 65,
    },
    "waste_management": {
        "impact": "Waste accumulation affects public health, air quality, and aesthetics. Residents within 200m radius are affected. Risk of disease spread and pest infestation.",
        "root_cause": "Irregular waste collection, insufficient garbage bins, lack of public awareness, overflow during festivals/events, or collection vehicle breakdowns.",
        "safety": "HIGH — Accumulated waste attracts rodents and insects, releases harmful gases, and can contaminate water sources.",
        "resources": "Waste collection truck, cleaning crew (3-5 workers), brooms, sanitization chemicals, new bins if needed.",
        "timeline": "Emergency cleanup: Same day | Regular schedule fix: 1-2 days | New bin installation: 3-5 days",
        "actions": ["1. Deploy emergency cleanup crew", "2. Clear all accumulated waste", "3. Sanitize the area", "4. Install/repair garbage bins", "5. Establish regular collection schedule", "6. Put up awareness signage"],
        "prevention": "Regular collection schedules, adequate bin placement, public awareness campaigns, penalty for illegal dumping.",
        "cost": "₹2,000 - ₹15,000 for cleanup | ₹5,000 - ₹20,000 for new bins",
        "base_priority": 70,
    },
    "water_supply": {
        "impact": "Water supply disruption affects drinking water access, cooking, hygiene, and sanitation for all residents in the area. Critical for hospitals and schools.",
        "root_cause": "Pipe leakage, pump failure, contamination, water main break, supply scheduling issues, or aging pipeline infrastructure.",
        "safety": "CRITICAL — Clean water is essential. Contaminated water can cause waterborne diseases. Leaks can cause road damage and sinkholes.",
        "resources": "Plumbing crew (3-4 workers), pipe materials, welding equipment, water testing kit, temporary tanker supply.",
        "timeline": "Emergency repair: 4-12 hours | Pipe replacement: 1-3 days | Main line repair: 3-7 days",
        "actions": ["1. Identify leak/failure location", "2. Arrange emergency water tanker supply", "3. Isolate the affected pipeline section", "4. Repair or replace damaged pipes", "5. Flush and test water quality", "6. Restore supply and monitor"],
        "prevention": "Regular pipeline inspections, pressure monitoring, corrosion-resistant pipes, scheduled maintenance.",
        "cost": "₹5,000 - ₹30,000 for repair | ₹50,000 - ₹5 lakhs for replacement",
        "base_priority": 80,
    },
    "street_lighting": {
        "impact": "Dark streets increase crime risk, road accidents, and reduce pedestrian safety. Affects all commuters and residents in the area after dark.",
        "root_cause": "Bulb burnout, electrical fault, damaged pole, timer malfunction, vandalism, or storm damage.",
        "safety": "HIGH — Dark areas are hotspots for accidents and criminal activity, especially for women and elderly citizens.",
        "resources": "Electrician (1-2 workers), replacement bulbs/LED fixtures, boom lift truck, electrical testing equipment.",
        "timeline": "Bulb replacement: Same day | Electrical repair: 1-2 days | Pole replacement: 3-5 days",
        "actions": ["1. Inspect the light fixture and wiring", "2. Identify fault type (bulb, wiring, or pole)", "3. Replace bulb or repair wiring", "4. Test the fixture after repair", "5. Check timer/sensor settings", "6. Verify operation after dark"],
        "prevention": "LED upgrades for longer life, regular inspections, vandal-resistant fixtures, solar backup options.",
        "cost": "₹500 - ₹5,000 per bulb | ₹15,000 - ₹50,000 for pole replacement",
        "base_priority": 72,
    },
    "drainage_sewage": {
        "impact": "Blocked drainage causes waterlogging, flooding, sewage overflow, and breeding grounds for mosquitoes. Major health hazard for nearby residents.",
        "root_cause": "Accumulation of debris, construction waste blocking drains, inadequate drain size, tree root intrusion, or structural collapse.",
        "safety": "HIGH TO CRITICAL — Sewage overflow poses severe health risks. Waterlogging during monsoon can cause electrocution near exposed wiring.",
        "resources": "Drainage crew (4-6 workers), jetting machine, suction pump, excavation equipment, new drain covers.",
        "timeline": "Drain clearing: 1-2 days | Drain repair: 3-7 days | New drainage: 2-4 weeks",
        "actions": ["1. Locate blockage point", "2. Deploy jetting machine to clear blockage", "3. Remove debris and accumulated waste", "4. Inspect drain structure for damage", "5. Repair or replace damaged sections", "6. Install proper drain covers"],
        "prevention": "Regular drain cleaning schedule, preventing construction debris dumping, grate installation, monsoon preparedness.",
        "cost": "₹5,000 - ₹20,000 for clearing | ₹50,000 - ₹3 lakhs for repair",
        "base_priority": 75,
    },
    "public_safety": {
        "impact": "Safety hazards directly endanger citizen lives. Affects all pedestrians, commuters, and residents in the vicinity.",
        "root_cause": "Infrastructure deterioration, lack of safety barriers, missing signage, broken railings, open manholes, or exposed wiring.",
        "safety": "CRITICAL — Immediate danger to public safety. Can result in serious injury or death.",
        "resources": "Emergency response team, safety barriers, warning signs, repair crew appropriate to hazard type.",
        "timeline": "Emergency measures: Immediate (same day) | Permanent fix: 2-7 days depending on type",
        "actions": ["1. Immediately cordon off the hazard area", "2. Deploy warning signs and barriers", "3. Assess the root cause", "4. Deploy emergency repair crew", "5. Implement permanent safety measures", "6. Conduct safety audit of surrounding area"],
        "prevention": "Regular safety audits, infrastructure maintenance schedules, public safety awareness, emergency response protocols.",
        "cost": "₹2,000 - ₹50,000 depending on hazard type",
        "base_priority": 90,
    },
    "noise_pollution": {
        "impact": "Excessive noise affects mental health, sleep quality, and work productivity. Particularly harmful to elderly, children, and patients in nearby hospitals.",
        "root_cause": "Construction activity, industrial operations, traffic, loudspeakers, or commercial activities violating noise regulations.",
        "safety": "MODERATE — Long-term exposure causes hearing damage, stress, hypertension, and sleep disorders.",
        "resources": "Noise monitoring equipment, enforcement officers, noise barriers if applicable.",
        "timeline": "Enforcement action: 1-2 days | Noise barrier installation: 1-2 weeks",
        "actions": ["1. Measure noise levels with calibrated equipment", "2. Identify the noise source", "3. Issue warning/notice to violator", "4. Enforce noise regulations", "5. Install noise barriers if structural", "6. Schedule regular monitoring"],
        "prevention": "Strict enforcement of noise regulations, designated quiet zones, construction time restrictions, sound barriers near highways.",
        "cost": "₹1,000 - ₹10,000 for monitoring | ₹50,000+ for barriers",
        "base_priority": 45,
    },
    "air_quality": {
        "impact": "Poor air quality affects respiratory health of all residents, especially children, elderly, and those with asthma or COPD.",
        "root_cause": "Industrial emissions, vehicle exhaust, construction dust, waste burning, or seasonal factors.",
        "safety": "HIGH — Poor air quality contributes to respiratory diseases, cardiovascular issues, and reduced life expectancy.",
        "resources": "Air quality monitoring station, anti-pollution measures, dust suppression equipment, enforcement officers.",
        "timeline": "Monitoring: Immediate | Source control: 1-7 days | Long-term measures: Ongoing",
        "actions": ["1. Deploy air quality monitoring", "2. Identify pollution sources", "3. Issue compliance notices", "4. Implement dust suppression (water sprinklers)", "5. Enforce emission standards", "6. Plant trees as long-term solution"],
        "prevention": "Regular air quality monitoring, strict emission standards, green belt development, electric vehicle promotion.",
        "cost": "₹5,000 - ₹50,000 for immediate measures | ₹1-10 lakhs for long-term",
        "base_priority": 60,
    },
    "park_green_space": {
        "impact": "Deteriorated parks reduce recreational options, community spaces, and green cover. Affects families, children, and elderly who use the space.",
        "root_cause": "Lack of maintenance, vandalism, overuse, irrigation failure, pest infestation, or budget constraints.",
        "safety": "LOW TO MODERATE — Broken equipment can injure children. Overgrown areas may harbor snakes or pests.",
        "resources": "Gardening crew (2-4 workers), new plants, playground equipment, irrigation supplies, cleaning tools.",
        "timeline": "Cleanup: 1-2 days | Equipment repair: 3-5 days | Major renovation: 2-4 weeks",
        "actions": ["1. Clean the park area", "2. Repair/replace damaged equipment", "3. Trim overgrown vegetation", "4. Fix irrigation system", "5. Add new plants and landscaping", "6. Install proper lighting and signage"],
        "prevention": "Regular maintenance schedule, community involvement, vandal-resistant equipment, automated irrigation.",
        "cost": "₹5,000 - ₹25,000 for cleanup | ₹50,000 - ₹5 lakhs for renovation",
        "base_priority": 40,
    },
    "public_transport": {
        "impact": "Transport issues affect daily commuters, students, and workers who depend on public transit for mobility.",
        "root_cause": "Vehicle breakdown, route changes, shelter damage, overcrowding, or schedule irregularities.",
        "safety": "MODERATE — Overcrowded or poorly maintained vehicles pose safety risks. Damaged bus shelters leave commuters exposed.",
        "resources": "Local transport authority coordination, shelter repair crew, replacement vehicles if needed.",
        "timeline": "Schedule fix: 1-2 days | Shelter repair: 3-5 days | Route changes: 1-2 weeks",
        "actions": ["1. Report to transport authority", "2. Arrange temporary alternatives", "3. Repair/replace damaged shelters", "4. Update route information displays", "5. Improve signal/schedule coordination", "6. Monitor service quality"],
        "prevention": "Regular vehicle maintenance, real-time tracking systems, adequate fleet size, passenger feedback systems.",
        "cost": "₹5,000 - ₹30,000 for shelter repair | Varies for service changes",
        "base_priority": 55,
    },
    "building_structure": {
        "impact": "Structural issues in public buildings endanger occupants and passersby. Can lead to partial or complete collapse.",
        "root_cause": "Aging infrastructure, poor construction, earthquake damage, water seepage, foundation issues, or overloading.",
        "safety": "CRITICAL — Structural failures can cause injury or death. Requires immediate assessment and evacuation if severe.",
        "resources": "Structural engineer assessment, construction crew, scaffolding, support materials, evacuation coordination.",
        "timeline": "Assessment: Immediate | Emergency shoring: 1-3 days | Major repair: 2-8 weeks",
        "actions": ["1. Evacuate if immediate danger exists", "2. Cordon off the area", "3. Engage structural engineer for assessment", "4. Install temporary supports/shoring", "5. Plan permanent repair strategy", "6. Execute repairs with certified contractors"],
        "prevention": "Regular structural audits, maintenance of waterproofing, load compliance checks, earthquake-resistant upgrades.",
        "cost": "₹10,000 - ₹1 lakh for assessment | ₹1 - ₹50 lakhs for repair",
        "base_priority": 85,
    },
    "electricity": {
        "impact": "Power outages affect all activities — lighting, cooling, medical equipment, businesses, and essential services.",
        "root_cause": "Transformer failure, cable damage, overloading, storm damage, scheduled maintenance, or equipment malfunction.",
        "safety": "HIGH — Exposed wires can cause electrocution. Outages can disable medical equipment and traffic signals.",
        "resources": "Electricians (2-4 workers), replacement components, safety gear, insulation materials, mobile generator.",
        "timeline": "Emergency repair: 2-8 hours | Equipment replacement: 1-3 days | Infrastructure upgrade: 1-4 weeks",
        "actions": ["1. Isolate the fault and ensure safety", "2. Identify the root cause", "3. Deploy repair crew with safety equipment", "4. Repair or replace damaged components", "5. Test and restore power", "6. Monitor for recurring issues"],
        "prevention": "Regular equipment inspection, load balancing, upgrading aging infrastructure, storm preparation, tree trimming near power lines.",
        "cost": "₹2,000 - ₹20,000 for repair | ₹50,000 - ₹5 lakhs for transformer",
        "base_priority": 78,
    },
}

DEFAULT_ANALYSIS = {
    "impact": "This issue affects local residents and infrastructure in the reported area. The extent depends on the issue severity and location.",
    "root_cause": "Could be due to aging infrastructure, insufficient maintenance, weather conditions, or increased usage beyond design capacity.",
    "safety": "MODERATE — Assessment needed. Potential safety concerns should be evaluated through on-site inspection.",
    "resources": "General maintenance crew (2-4 workers), tools and materials specific to the issue type.",
    "timeline": "Initial assessment: 1-2 days | Repair: 3-7 days depending on complexity",
    "actions": ["1. Conduct on-site assessment", "2. Determine scope of work", "3. Arrange required resources", "4. Execute repair/resolution", "5. Verify completion quality", "6. Document the resolution"],
    "prevention": "Regular inspections, preventive maintenance, prompt response to citizen reports.",
    "cost": "To be determined after on-site assessment",
    "base_priority": 50,
}

SEVERITY_MULTIPLIERS = {"low": 0.6, "medium": 1.0, "high": 1.3, "critical": 1.6}

def _get_priority_keywords(text):
    """Check for urgency keywords in description to boost priority."""
    if not text:
        return 0
    text = text.lower()
    high_urgency = ["urgent", "emergency", "danger", "flood", "collapse", "fire", "accident", "electrocution", "death", "hospital", "school"]
    medium_urgency = ["children", "elderly", "broken", "overflow", "blocked", "hazard", "risk", "leaking"]
    boost = 0
    for word in high_urgency:
        if word in text:
            boost += 10
    for word in medium_urgency:
        if word in text:
            boost += 5
    return min(boost, 25)


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


def _fallback_analyze_report(report):
    """Generate structured analysis using rule-based system (no AI model needed)."""
    category = report.get("category", "other")
    severity = report.get("severity", "medium").lower()
    title = report.get("title", "Untitled")
    description = report.get("description", "")
    address = report.get("address", "N/A")
    ward = report.get("wardZone", "N/A")

    cat_data = CATEGORY_ANALYSIS.get(category, DEFAULT_ANALYSIS)
    sev_mult = SEVERITY_MULTIPLIERS.get(severity, 1.0)
    keyword_boost = _get_priority_keywords(description)

    priority = min(100, int(cat_data["base_priority"] * sev_mult + keyword_boost))

    severity_assessment = severity.upper()
    if priority >= 85:
        severity_assessment = "CRITICAL"
    elif priority >= 70:
        severity_assessment = "HIGH"
    elif priority >= 50:
        severity_assessment = "MEDIUM"
    else:
        severity_assessment = "LOW"

    analysis = f"""═══ URBANIQ AI ANALYSIS REPORT ═══

📋 REPORT: {title}
📍 Location: {address} (Ward: {ward})
📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. SEVERITY ASSESSMENT: {severity_assessment}
   Priority Score: {priority}/100
   Reported Severity: {severity.capitalize()}
   Category: {category.replace('_', ' ').title()}

2. IMPACT ANALYSIS:
   {cat_data['impact']}

3. ROOT CAUSE ANALYSIS:
   {cat_data['root_cause']}
   Description Context: {description[:200] if description else 'No additional context provided.'}

4. SAFETY CONCERNS:
   Risk Level: {cat_data['safety']}
   {"⚠️ IMMEDIATE ATTENTION REQUIRED — This issue poses significant safety risks." if priority >= 75 else "Regular monitoring recommended."}

5. REQUIRED RESOURCES:
   {cat_data['resources']}

6. ESTIMATED TIMELINE:
   {cat_data['timeline']}

7. PRIORITY SCORE: {priority}/100
   {"🔴 URGENT — Should be addressed within 24 hours" if priority >= 85 else "🟠 HIGH PRIORITY — Address within 2-3 days" if priority >= 70 else "🟡 MEDIUM PRIORITY — Schedule within 1 week" if priority >= 50 else "🟢 LOW PRIORITY — Can be scheduled for regular maintenance"}

8. RECOMMENDED ACTIONS:
   {chr(10).join('   ' + a for a in cat_data['actions'])}

9. PREVENTION MEASURES:
   {cat_data['prevention']}

10. ESTIMATED COST:
    {cat_data['cost']}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: This analysis was generated using UrbanIQ's rule-based system.
For AI-powered deep analysis, load the Qwen2.5 AI model from the admin panel.
"""
    return analysis, priority


def _fallback_suggest_resolution(report):
    """Generate resolution suggestion using rules (no AI model needed)."""
    category = report.get("category", "other")
    title = report.get("title", "Untitled")
    description = report.get("description", "")

    cat_data = CATEGORY_ANALYSIS.get(category, DEFAULT_ANALYSIS)

    suggestion = f"""═══ URBANIQ RESOLUTION GUIDANCE ═══

📋 Report: {title}
🏷️ Category: {category.replace('_', ' ').title()}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. WHAT TO DO:
   {chr(10).join('   ' + a for a in cat_data['actions'])}

2. MATERIALS & EQUIPMENT NEEDED:
   {cat_data['resources']}

3. WORKFORCE:
   Standard crew size as per category requirements.
   Ensure all workers have proper safety gear and training.

4. ESTIMATED COST:
   {cat_data['cost']}

5. TIMELINE:
   {cat_data['timeline']}

6. SAFETY PRECAUTIONS:
   - Cordon off the work area with warning signs
   - All workers must wear PPE (helmets, vests, gloves)
   - Follow standard operating procedures for {category.replace('_', ' ')} work
   - Ensure public safety during repair operations
   - Have first-aid kit available on-site

7. QUALITY CHECK:
   - Verify the repair meets quality standards
   - Take before/after photographs for documentation
   - Get sign-off from supervising engineer
   - Schedule follow-up inspection in 7 days
   - Update report status in UrbanIQ system

8. DOCUMENTATION:
   - Upload work-in-progress photos to the report
   - Update report status as work progresses
   - Record all materials used and costs incurred
   - Citizen will be automatically notified of updates

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Generated using UrbanIQ's rule-based system.
"""
    return suggestion


def _fallback_batch_analysis(reports):
    """Generate batch analysis using rules (no AI model needed)."""
    if not reports:
        return "No reports to analyze."

    # Category breakdown
    categories = {}
    severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    status_counts = {}
    priorities = []

    for report in reports:
        cat = report.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1
        sev = report.get("severity", "medium").lower()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        status = report.get("status", "submitted")
        status_counts[status] = status_counts.get(status, 0) + 1

        cat_data = CATEGORY_ANALYSIS.get(cat, DEFAULT_ANALYSIS)
        sev_mult = SEVERITY_MULTIPLIERS.get(sev, 1.0)
        priority = min(100, int(cat_data["base_priority"] * sev_mult))
        priorities.append((report, priority))

    # Sort by priority
    priorities.sort(key=lambda x: x[1], reverse=True)

    # Format category breakdown
    cat_lines = []
    for cat, count in sorted(categories.items(), key=lambda x: x[1], reverse=True):
        cat_label = cat.replace("_", " ").title()
        cat_lines.append(f"   • {cat_label}: {count} report(s)")

    # Priority ranking
    priority_lines = []
    for i, (r, p) in enumerate(priorities[:15], 1):
        emoji = "🔴" if p >= 85 else "🟠" if p >= 70 else "🟡" if p >= 50 else "🟢"
        priority_lines.append(f"   {emoji} #{i}. [{p}/100] {r.get('title', 'Untitled')} ({r.get('category', 'N/A').replace('_', ' ').title()})")

    # Quick wins
    quick_wins = [r for r, p in priorities if p < 50 and r.get("severity", "") in ["low", "medium"]]
    qw_lines = []
    for r in quick_wins[:5]:
        qw_lines.append(f"   ✅ {r.get('title', 'Untitled')} — {r.get('category', 'N/A').replace('_', ' ').title()}")

    critical_count = severity_counts.get("critical", 0) + severity_counts.get("high", 0)
    pending_count = status_counts.get("submitted", 0) + status_counts.get("under_review", 0)

    analysis = f"""═══ URBANIQ CITY-WIDE ANALYSIS ═══

📊 OVERVIEW: {len(reports)} Total Reports
📅 Analysis Date: {datetime.now().strftime('%Y-%m-%d %H:%M')}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

1. PRIORITY RANKING:
{chr(10).join(priority_lines)}

2. CATEGORY BREAKDOWN:
{chr(10).join(cat_lines)}

3. SEVERITY DISTRIBUTION:
   🔴 Critical: {severity_counts.get('critical', 0)}
   🟠 High: {severity_counts.get('high', 0)}
   🟡 Medium: {severity_counts.get('medium', 0)}
   🟢 Low: {severity_counts.get('low', 0)}

4. STATUS OVERVIEW:
   📤 Submitted: {status_counts.get('submitted', 0)}
   🔍 Under Review: {status_counts.get('under_review', 0)}
   🔧 In Progress: {status_counts.get('in_progress', 0)}
   ✅ Completed: {status_counts.get('work_completed', 0)}
   ✔️ Verified: {status_counts.get('verified', 0)}
   📁 Closed: {status_counts.get('closed', 0)}

5. KEY INSIGHTS:
   {"⚠️ ALERT: " + str(critical_count) + " critical/high severity reports need immediate attention!" if critical_count > 0 else "✅ No critical issues pending."}
   {"📋 " + str(pending_count) + " reports are pending review — consider assigning crews." if pending_count > 0 else "All reports have been reviewed."}

6. RESOURCE PLANNING:
   - Total crews needed: {max(1, len(reports) // 3)} maintenance teams
   - Focus areas: {', '.join(list(categories.keys())[:3]).replace('_', ' ').title() if categories else 'N/A'}
   - Estimated total budget: ₹{len(reports) * 15000:,} - ₹{len(reports) * 50000:,} (approximate)

7. QUICK WINS (Easy to resolve):
{chr(10).join(qw_lines) if qw_lines else '   No quick wins identified — all reports require significant effort.'}

8. RECOMMENDATIONS:
   - Address critical safety issues within 24 hours
   - Group nearby reports for efficient crew deployment
   - Schedule regular follow-ups for in-progress reports
   - Prioritize recurring issues to prevent future reports

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Note: Analysis generated using UrbanIQ's rule-based system.
For AI-powered deep analysis, load the Qwen2.5 AI model.
"""
    return analysis


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN ANALYSIS FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def analyze_report(report):
    """Analyze a single citizen report using AI model or rule-based fallback."""
    mgr = ModelManager.get_instance()
    now = datetime.now()

    # Try AI model first
    if mgr.is_ready:
        try:
            data_text = _format_report_data(report)
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
        except Exception as e:
            print(f"[UrbanIQ AI] Model inference failed, using fallback: {e}")

    # Rule-based fallback
    analysis_text, priority = _fallback_analyze_report(report)

    return {
        "report_id": report.get("id", ""),
        "report_title": report.get("title", "Untitled"),
        "category": report.get("category", "unknown"),
        "analysis": analysis_text,
        "priority_score": priority,
        "timestamp": now.isoformat(),
        "model": "UrbanIQ Rule-Based Engine",
    }


def analyze_all_reports(reports):
    """Analyze all reports together for city-wide planning."""
    mgr = ModelManager.get_instance()
    now = datetime.now()

    if not reports:
        return {
            "analysis": "No reports found. The system has no pending issues to analyze.",
            "timestamp": now.isoformat(),
            "model": "system",
        }

    # Category/severity/status summary
    categories = {}
    severity_counts = {"low": 0, "medium": 0, "high": 0, "critical": 0}
    status_counts = {}

    for report in reports:
        cat = report.get("category", "other")
        categories[cat] = categories.get(cat, 0) + 1
        sev = report.get("severity", "medium").lower()
        severity_counts[sev] = severity_counts.get(sev, 0) + 1
        status = report.get("status", "submitted")
        status_counts[status] = status_counts.get(status, 0) + 1

    # Try AI model first
    if mgr.is_ready:
        try:
            parts = [f"CITY MAINTENANCE REPORTS — {len(reports)} total reports\n"]
            parts.append(f"CATEGORY BREAKDOWN: {json.dumps(categories)}")
            parts.append(f"SEVERITY BREAKDOWN: {json.dumps(severity_counts)}")
            parts.append(f"STATUS BREAKDOWN: {json.dumps(status_counts)}")
            parts.append("")

            for report in reports[:30]:
                parts.append(_format_report_data(report))
                parts.append("")

            system_text = "\n".join(parts)

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
        except Exception as e:
            print(f"[UrbanIQ AI] Batch analysis failed, using fallback: {e}")

    # Rule-based fallback
    analysis_text = _fallback_batch_analysis(reports)

    return {
        "analysis": analysis_text,
        "total_reports": len(reports),
        "category_breakdown": categories,
        "severity_breakdown": severity_counts,
        "status_breakdown": status_counts,
        "timestamp": now.isoformat(),
        "model": "UrbanIQ Rule-Based Engine",
    }


def suggest_resolution(report):
    """Provide AI suggestion for resolving a specific report."""
    mgr = ModelManager.get_instance()
    now = datetime.now()

    # Try AI model first
    if mgr.is_ready:
        try:
            data_text = _format_report_data(report)
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
        except Exception as e:
            print(f"[UrbanIQ AI] Suggestion failed, using fallback: {e}")

    # Rule-based fallback
    suggestion_text = _fallback_suggest_resolution(report)

    return {
        "report_id": report.get("id", ""),
        "report_title": report.get("title", "Untitled"),
        "suggestion": suggestion_text,
        "timestamp": now.isoformat(),
        "model": "UrbanIQ Rule-Based Engine",
    }


def chat_response(messages, mode="citizen", context=None):
    """Generate chatbot response for citizen or admin mode."""
    mgr = ModelManager.get_instance()

    # Try AI model first
    if mgr.is_ready:
        try:
            system_prompt = CITIZEN_CHAT_PROMPT if mode == "citizen" else ADMIN_CHAT_PROMPT
            if context:
                system_prompt += f"\n\nCurrent context: {json.dumps(context)}"

            chat_messages = [{"role": "system", "content": system_prompt}]
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
        except Exception as e:
            print(f"[UrbanIQ AI] Chat failed, using fallback: {e}")

    # Fallback handled by main.py
    raise RuntimeError("AI model not available for chat")
