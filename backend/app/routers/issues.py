from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from datetime import datetime, timedelta
import os
import uuid
from typing import List, Optional

from app.database import get_db
from app.models import Issue
from app import schemas
from app.services.detector import detect, CONF_THRESHOLD, get_detector_source
from app.services.complaint import generate_complaint_letter, get_department_for_type

router = APIRouter(prefix="/api/issues", tags=["issues"])
UPLOAD_DIR = "uploads"

@router.get("", response_model=List[schemas.IssueOut])
def list_issues(
    type: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    db: Session = Depends(get_db)
):
    query = db.query(Issue)
    if type:
        query = query.filter(Issue.type == type)
    if priority:
        query = query.filter(Issue.priority == priority)
    if status:
        query = query.filter(Issue.status == status)
    return query.order_by(Issue.score.desc()).all()

@router.get("/{issue_id}", response_model=schemas.IssueOut)
def get_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")
    return issue

@router.patch("/{issue_id}", response_model=schemas.IssueOut)
def update_issue(
    issue_id: int,
    update_data: schemas.IssueStatusUpdate,
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if update_data.status:
        issue.status = update_data.status
        if update_data.status == "Resolved" and not issue.resolved_at:
            issue.resolved_at = datetime.utcnow()
    if update_data.department:
        issue.department = update_data.department
    if update_data.description is not None:
        issue.description = update_data.description

    db.commit()
    db.refresh(issue)
    return issue

@router.post("/{issue_id}/complaint")
def generate_complaint(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    if not issue.department:
        issue.department = get_department_for_type(issue.type)
        db.commit()

    return generate_complaint_letter(issue)

@router.post("/{issue_id}/resolve", response_model=schemas.IssueOut)
async def resolve_issue(
    issue_id: int,
    after_image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(after_image.filename)[1] or ".jpg"
    filename = f"resolved_{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        content = await after_image.read()
        buffer.write(content)

    web_path = f"/uploads/{filename}"

    # Run AI verification check on after_image
    detections = detect(file_path)
    matching_hazard = any(
        d.get("type") == issue.type and d.get("confidence", 0.0) > 0.4
        for d in detections
    )

    if matching_hazard:
        issue.status = "In progress"
        db.commit()
        db.refresh(issue)
        raise HTTPException(
            status_code=400,
            detail=f"Verification failed: Hazard '{issue.type}' still appears present in the resolution photo. Status set to In progress."
        )

    issue.status = "Resolved"
    issue.resolved_at = datetime.utcnow()
    issue.resolved_image_path = web_path

    db.commit()
    db.refresh(issue)
    return issue

@router.post("/{issue_id}/reopen", response_model=schemas.IssueOut)
def reopen_issue(issue_id: int, db: Session = Depends(get_db)):
    issue = db.query(Issue).filter(Issue.id == issue_id).first()
    if not issue:
        raise HTTPException(status_code=404, detail="Issue not found")

    issue.status = "Reported"
    issue.reopened_count += 1
    issue.resolved_at = None

    db.commit()
    db.refresh(issue)
    return issue
