from datetime import datetime, timedelta
from typing import Dict, Any

TYPE_WEIGHTS = {
    "drain": 1.0,
    "pothole": 0.9,
    "streetlight": 0.7,
    "garbage": 0.6,
    "crack": 0.5
}

DEPARTMENT_ROUTING = {
    "drain": "Drainage and Sewerage Department",
    "pothole": "Roads and Infrastructure Department",
    "crack": "Roads and Infrastructure Department",
    "streetlight": "Electricity and Street Lighting Department",
    "garbage": "Solid Waste Management Department"
}

# In-memory cache for location risk queries (lat, lng rounded to 3 decimals -> risk score)
_LOCATION_RISK_CACHE: Dict[str, float] = {}

def get_location_risk(lat: float, lng: float) -> float:
    """
    Computes location risk based on proximity to sensitive infrastructure (schools, hospitals).
    TODO: Integrate OpenStreetMap Overpass API query to check nearby schools and hospitals.
    Currently stubbed returning 0.0 with an in-memory cache.
    """
    cache_key = f"{round(lat, 3)},{round(lng, 3)}"
    if cache_key in _LOCATION_RISK_CACHE:
        return _LOCATION_RISK_CACHE[cache_key]
    
    # Stubbed risk calculation (default 0.0)
    risk_score = 0.0
    _LOCATION_RISK_CACHE[cache_key] = risk_score
    return risk_score

def calculate_priority_score(
    issue_type: str,
    confidence: float,
    bbox: list[int],
    img_width: int,
    img_height: int,
    duplicate_count: int = 1,
    lat: float = 0.0,
    lng: float = 0.0
) -> dict:
    """
    Computes explainable priority score per PROJECT_SPEC.md:
    score = type_weight*0.35 + size_ratio*0.25 + confidence*0.10 + location_risk*0.15 + duplicates*0.15
    """
    # 1. Type weight
    t_weight = TYPE_WEIGHTS.get(issue_type.lower(), 0.5)

    # 2. Size ratio: min((bbox area / image area) * 3, 1)
    if bbox and len(bbox) == 4 and img_width > 0 and img_height > 0:
        box_w = abs(bbox[2] - bbox[0])
        box_h = abs(bbox[3] - bbox[1])
        box_area = box_w * box_h
        img_area = img_width * img_height
        raw_size = (box_area / img_area) * 3.0
        size_ratio = min(max(raw_size, 0.0), 1.0)
    else:
        size_ratio = 0.2

    # 3. Confidence (0.0 - 1.0)
    conf_val = min(max(confidence, 0.0), 1.0)

    # 4. Location risk (0.0 - 1.0)
    loc_risk = get_location_risk(lat, lng)

    # 5. Duplicates: min(duplicate_count / 5, 1)
    dup_val = min(duplicate_count / 5.0, 1.0)

    # Weighted contribution components (each 0.0 - 1.0 scale)
    c_type = t_weight * 0.35
    c_size = size_ratio * 0.25
    c_conf = conf_val * 0.10
    c_loc = loc_risk * 0.15
    c_dup = dup_val * 0.15

    total_score_0_1 = c_type + c_size + c_conf + c_loc + c_dup
    
    # Scale score to 0 - 100 for display
    display_score = round(total_score_0_1 * 100, 1)

    # Priority classification
    if total_score_0_1 > 0.65:
        priority = "High"
    elif total_score_0_1 > 0.40:
        priority = "Medium"
    else:
        priority = "Low"

    breakdown = {
        "type_weight": {
            "raw_value": round(t_weight, 2),
            "weight": 0.35,
            "contribution": round(c_type * 100, 1)
        },
        "size_ratio": {
            "raw_value": round(size_ratio, 2),
            "weight": 0.25,
            "contribution": round(c_size * 100, 1)
        },
        "confidence": {
            "raw_value": round(conf_val, 2),
            "weight": 0.10,
            "contribution": round(c_conf * 100, 1)
        },
        "location_risk": {
            "raw_value": round(loc_risk, 2),
            "weight": 0.15,
            "contribution": round(c_loc * 100, 1)
        },
        "duplicates": {
            "raw_value": round(dup_val, 2),
            "weight": 0.15,
            "contribution": round(c_dup * 100, 1)
        }
    }

    return {
        "score": display_score,
        "priority": priority,
        "breakdown": breakdown
    }

def get_due_date(priority: str, start_time: datetime = None) -> datetime:
    base = start_time or datetime.utcnow()
    if priority == "High":
        return base + timedelta(days=3)
    elif priority == "Medium":
        return base + timedelta(days=7)
    else:
        return base + timedelta(days=14)

def get_default_department(issue_type: str) -> str:
    return DEPARTMENT_ROUTING.get(issue_type.lower(), "Roads and Infrastructure Department")
