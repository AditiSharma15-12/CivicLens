import math
from datetime import datetime, timedelta

def haversine_distance(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """Returns distance in meters between two lat/lon coordinates."""
    R = 6371000.0  # Earth radius in meters
    phi1, phi2 = math.radians(lat1), math.radians(lat2)
    dphi = math.radians(lat2 - lat1)
    dlambda = math.radians(lon2 - lon1)

    a = math.sin(dphi / 2.0)**2 + math.cos(phi1) * math.cos(phi2) * math.sin(dlambda / 2.0)**2
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return R * c

def find_duplicate_issue(existing_issues: list, lat: float, lng: float, issue_type: str, max_meters: float = 20.0):
    """
    Finds existing unresolved issue of the same type within 20 meters.
    Unresolved status includes 'Reported' and 'In progress'.
    """
    for issue in existing_issues:
        if issue.type == issue_type and issue.status in ["Reported", "In progress"]:
            dist = haversine_distance(lat, lng, issue.lat, issue.lng)
            if dist <= max_meters:
                return issue
    return None

def find_repeat_repair_issue(existing_issues: list, lat: float, lng: float, issue_type: str, max_meters: float = 20.0, days: int = 90):
    """Finds if a resolved issue of the same type was closed within 90 days within 20 meters."""
    cutoff = datetime.utcnow() - timedelta(days=days)
    for issue in existing_issues:
        if issue.type == issue_type and issue.status == "Resolved" and issue.resolved_at and issue.resolved_at >= cutoff:
            dist = haversine_distance(lat, lng, issue.lat, issue.lng)
            if dist <= max_meters:
                return issue
    return None
