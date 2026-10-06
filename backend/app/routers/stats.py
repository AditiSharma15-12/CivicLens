from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from sqlalchemy import func
from datetime import datetime, timedelta, date
import math

from app.database import get_db
from app.models import Issue
from app import schemas

router = APIRouter(prefix="/api/stats", tags=["stats"])


CLUSTERS = [
    {"name": "Vijay Nagar", "lat": 22.7533, "lng": 75.8937},
    {"name": "Palasia", "lat": 22.7244, "lng": 75.8839},
    {"name": "Rajwada", "lat": 22.7196, "lng": 75.8577},
    {"name": "Bhawarkua", "lat": 22.6908, "lng": 75.8670},
    {"name": "Sarafa Bazaar", "lat": 22.7180, "lng": 75.8550},
    {"name": "Rau", "lat": 22.6280, "lng": 75.8050},
]

def get_area_name(lat: float, lng: float) -> str:
    best_name = None
    min_dist = float('inf')
    for c in CLUSTERS:
        dist = math.sqrt((lat - c["lat"]) ** 2 + (lng - c["lng"]) ** 2)
        if dist < min_dist:
            min_dist = dist
            best_name = c["name"]
    # If within ~2km (0.02 deg), use named cluster, else grid cell
    if min_dist <= 0.02:
        return best_name
    return f"Grid ({round(lat, 2)}, {round(lng, 2)})"

@router.get("", response_model=schemas.StatsOut)
def get_stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    total_issues = db.query(Issue).count()

    open_issues = db.query(Issue).filter(Issue.status.in_(["Reported", "In progress"])).count()
    resolved_issues = db.query(Issue).filter(Issue.status == "Resolved").count()
    overdue_issues = db.query(Issue).filter(
        Issue.status != "Resolved",
        Issue.due_at < now
    ).count()

    # Count by type
    types = db.query(Issue.type, func.count(Issue.id)).group_by(Issue.type).all()
    by_type = {t: count for t, count in types}

    # Count by priority
    priorities = db.query(Issue.priority, func.count(Issue.id)).group_by(Issue.priority).all()
    by_priority = {p: count for p, count in priorities}

    # Count by status
    statuses = db.query(Issue.status, func.count(Issue.id)).group_by(Issue.status).all()
    by_status = {s: count for s, count in statuses}

    # Resolved this week
    one_week_ago = now - timedelta(days=7)
    resolved_this_week = db.query(Issue).filter(
        Issue.status == "Resolved",
        Issue.resolved_at >= one_week_ago
    ).count()

    # Average priority score
    avg_score = db.query(func.avg(Issue.score)).scalar() or 0.0

    return {
        "total_issues": total_issues,
        "open_issues": open_issues,
        "resolved_issues": resolved_issues,
        "overdue_issues": overdue_issues,
        "by_type": by_type,
        "by_priority": by_priority,
        "by_status": by_status,
        "resolved_this_week": resolved_this_week,
        "average_score": round(avg_score, 1)
    }

@router.get("/areas")
def get_area_stats(db: Session = Depends(get_db)):
    """Computes hotspot area performance metrics including issue count, average fix time and overdue count."""
    now = datetime.utcnow()
    issues = db.query(Issue).all()

    areas = {}
    for issue in issues:
        area_name = get_area_name(issue.lat, issue.lng)
        if area_name not in areas:
            areas[area_name] = {
                "area": area_name,
                "department": issue.department or "Municipal Works",
                "total_issues": 0,
                "resolved_issues": 0,
                "overdue_issues": 0,
                "total_fix_hours": 0.0
            }

        areas[area_name]["total_issues"] += 1

        if issue.status != "Resolved" and issue.due_at and now > issue.due_at:
            areas[area_name]["overdue_issues"] += 1

        if issue.status == "Resolved" and issue.resolved_at and issue.created_at:
            areas[area_name]["resolved_issues"] += 1
            fix_time = (issue.resolved_at - issue.created_at).total_seconds() / 3600.0
            areas[area_name]["total_fix_hours"] += fix_time

    result = []
    for area_name, data in areas.items():
        avg_fix_days = (
            round((data["total_fix_hours"] / data["resolved_issues"]) / 24.0, 1)
            if data["resolved_issues"] > 0
            else 0.0
        )
        result.append({
            "area": area_name,
            "department": data["department"],
            "total_issues": data["total_issues"],
            "resolved_issues": data["resolved_issues"],
            "overdue_issues": data["overdue_issues"],
            "average_fix_days": avg_fix_days
        })

    # Sort areas by total_issues descending
    result.sort(key=lambda x: x["total_issues"], reverse=True)
    return result

