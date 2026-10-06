import os
import requests
from datetime import datetime
from typing import Dict, Any

DEPARTMENT_MAPPING = {
    "pothole": "Roads and Infrastructure Department",
    "crack": "Roads and Infrastructure Department",
    "drain": "Drainage and Sewerage Department",
    "garbage": "Solid Waste Management Department",
    "streetlight": "Electricity and Street Lighting Department"
}

NOMINATIM_CACHE: Dict[str, str] = {}

def get_department_for_type(issue_type: str) -> str:
    return DEPARTMENT_MAPPING.get(issue_type.lower(), "Roads and Infrastructure Department")

def get_address_from_coords(lat: float, lng: float) -> str:
    """Reverse geocodes (lat, lng) to a human-readable address with 3s timeout and in-memory cache."""
    cache_key = f"{round(lat, 4)},{round(lng, 4)}"
    if cache_key in NOMINATIM_CACHE:
        return NOMINATIM_CACHE[cache_key]

    fallback = f"Latitude: {lat:.6f}, Longitude: {lng:.6f}"
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=json&lat={lat}&lon={lng}"
        headers = {"User-Agent": "CivicLens/1.0 (infrastructure-monitoring-system)"}
        resp = requests.get(url, headers=headers, timeout=3.0)
        if resp.status_code == 200:
            data = resp.json()
            display_name = data.get("display_name")
            if display_name:
                NOMINATIM_CACHE[cache_key] = display_name
                return display_name
    except Exception:
        pass

    NOMINATIM_CACHE[cache_key] = fallback
    return fallback

FACTOR_NAMES = {
    "type_weight": "high defect severity category",
    "size_ratio": "large physical size ratio on roadway",
    "confidence": "high automated detection confidence",
    "location_risk": "proximity to sensitive public area",
    "duplicates": "multiple duplicate citizen reports"
}

def get_top_reasons(breakdown: dict) -> str:
    if not breakdown or not isinstance(breakdown, dict):
        return "standard defect priority parameters"

    sorted_factors = sorted(
        breakdown.items(),
        key=lambda item: item[1].get("contribution", 0) if isinstance(item[1], dict) else 0,
        reverse=True
    )

    top_two = sorted_factors[:2]
    reasons = [
        FACTOR_NAMES.get(k, k.replace("_", " "))
        for k, v in top_two
    ]
    return " and ".join(reasons)

def maybe_polish_with_llm(letter_text: str) -> str:
    """Optionally polishes letter using GEMINI_API_KEY or OPENAI_API_KEY if present in environment."""
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return letter_text

    # If key exists, attempt request (falling back to letter_text if error)
    try:
        # Simple REST API request if key present
        url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key={api_key}"
        prompt = (
            "Polish the tone of the following formal municipal complaint letter. "
            "Keep all facts, dates, coordinates, ticket IDs, and technical numbers exactly unchanged:\n\n" + letter_text
        )
        payload = {"contents": [{"parts": [{"text": prompt}]}]}
        resp = requests.post(url, json=payload, timeout=4.0)
        if resp.status_code == 200:
            res_data = resp.json()
            candidates = res_data.get("candidates", [])
            if candidates:
                parts = candidates[0].get("content", {}).get("parts", [])
                if parts and parts[0].get("text"):
                    return parts[0]["text"].strip()
    except Exception:
        pass

    return letter_text

def generate_complaint_letter(issue) -> dict:
    """Builds formal complaint letter for an issue per PROJECT_SPEC.md Feature 4."""
    dept = issue.department or get_department_for_type(issue.type)

    date_str = datetime.utcnow().strftime("%d %B %Y")
    due_date_str = issue.due_at.strftime("%d %B %Y") if issue.due_at else "N/A"

    address = get_address_from_coords(issue.lat, issue.lng)
    maps_link = f"https://www.google.com/maps?q={issue.lat},{issue.lng}"
    top_reasons = get_top_reasons(issue.score_breakdown)

    repeat_note = ""
    if issue.repeat_issue:
        repeat_note = "\nNote: This issue has been flagged as a repeat defect occurring at a location previously repaired within 90 days.\n"

    description_text = issue.description or "Public infrastructure defect requiring municipal maintenance and repair."

    letter = f"""Date: {date_str}

To:
{dept}
Municipal Civic Authority

SUBJECT: Official Infrastructure Defect Complaint - Ticket #{issue.id} ({issue.type.upper()})

Respected Authority,

This formal complaint brings to your immediate attention a public infrastructure defect identified within municipal jurisdiction.

Incident Details:
- Ticket ID: #{issue.id}
- Defect Type: {issue.type.capitalize()}
- Priority Rating: {issue.priority} (Score: {issue.score}/100)
- Primary Priority Factors: {top_reasons}
- Citizen Reports Logged: {issue.duplicate_count}
- Target Resolution Due Date: {due_date_str}

Location & Coordinates:
- Location Address: {address}
- Coordinates: {issue.lat:.6f}, {issue.lng:.6f}
- Map Link: {maps_link}

Description:
{description_text}
{repeat_note}
We request that the {dept} inspect the site and complete necessary repairs prior to the target due date of {due_date_str}.

Sincerely,
Civic Lens Infrastructure Monitoring System"""

    polished = maybe_polish_with_llm(letter)

    return {
        "complaint_text": polished,
        "department": dept
    }
