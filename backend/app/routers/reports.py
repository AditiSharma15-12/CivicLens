from fastapi import APIRouter, Depends, UploadFile, File, Form, HTTPException
from sqlalchemy.orm import Session
from PIL import Image, ImageOps
import os
import uuid
from typing import Optional

from app.database import get_db
from app.models import Issue
from app import schemas
from app.services.detector import detect, CONF_THRESHOLD, get_detector_source
from app.services.scoring import calculate_priority_score, get_due_date, get_default_department
from app.services.duplicates import find_duplicate_issue, find_repeat_repair_issue

router = APIRouter(prefix="/api", tags=["report"])

UPLOAD_DIR = "uploads"
MAX_IMAGE_SIZE = 1280

def process_and_resize_image(file_path: str) -> tuple[int, int]:
    with Image.open(file_path) as img:
        img = ImageOps.exif_transpose(img)
        width, height = img.size
        if width > MAX_IMAGE_SIZE or height > MAX_IMAGE_SIZE:
            img.thumbnail((MAX_IMAGE_SIZE, MAX_IMAGE_SIZE), Image.Resampling.LANCZOS)
            width, height = img.size
        img.save(file_path)
        return width, height

import urllib.request
import urllib.parse
import json

GEOCODE_CACHE = {}

@router.get("/geocode")
def geocode_location(q: str):
    q_clean = q.strip().lower()
    if not q_clean:
        return []
    if q_clean in GEOCODE_CACHE:
        return GEOCODE_CACHE[q_clean]

    encoded_q = urllib.parse.quote(q.strip())
    url = f"https://nominatim.openstreetmap.org/search?format=json&limit=5&countrycodes=in&viewbox=75.70,22.85,76.00,22.60&bounded=1&q={encoded_q}"
    headers = {"User-Agent": "CivicLens/1.0 (infrastructure-monitor)"}
    req = urllib.request.Request(url, headers=headers)

    try:
        with urllib.request.urlopen(req, timeout=3.0) as resp:
            data = json.loads(resp.read().decode("utf-8"))
            results = []
            for item in data:
                results.append({
                    "display_name": item.get("display_name"),
                    "lat": float(item.get("lat")),
                    "lng": float(item.get("lon"))
                })
            GEOCODE_CACHE[q_clean] = results
            return results
    except Exception:
        return []

@router.post("/report", response_model=schemas.ReportResponse)
async def submit_report(
    lat: float = Form(...),
    lng: float = Form(...),
    description: Optional[str] = Form(None),
    image: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    os.makedirs(UPLOAD_DIR, exist_ok=True)
    ext = os.path.splitext(image.filename)[1] or ".jpg"
    filename = f"{uuid.uuid4().hex}{ext}"
    file_path = os.path.join(UPLOAD_DIR, filename)

    with open(file_path, "wb") as buffer:
        content = await image.read()
        buffer.write(content)

    img_w, img_h = process_and_resize_image(file_path)
    web_image_path = f"/uploads/{filename}"

    # 1. Run detection
    detections = detect(file_path)

    if not detections:
        return {
            "detected": False,
            "issue": None,
            "detections": [],
            "image_width": img_w,
            "image_height": img_h,
            "merged_duplicate": False
        }

    # Primary detection
    primary = max(detections, key=lambda d: d.get("confidence", 0.0))
    issue_type = primary["type"]
    confidence = primary["confidence"]
    bbox = primary["bbox"]

    existing_issues = db.query(Issue).all()

    # 2. Check for duplicate merging (same type, unresolved, <= 20m)
    duplicate_match = find_duplicate_issue(existing_issues, lat, lng, issue_type, max_meters=20.0)

    if duplicate_match:
        prev_score = duplicate_match.score
        prev_priority = duplicate_match.priority

        duplicate_match.duplicate_count += 1
        extra_imgs = list(duplicate_match.extra_images or [])
        extra_imgs.append(web_image_path)
        duplicate_match.extra_images = extra_imgs

        # Recompute score and priority with updated duplicate_count
        scoring = calculate_priority_score(
            issue_type=duplicate_match.type,
            confidence=duplicate_match.confidence,
            bbox=duplicate_match.bbox,
            img_width=img_w,
            img_height=img_h,
            duplicate_count=duplicate_match.duplicate_count,
            lat=duplicate_match.lat,
            lng=duplicate_match.lng
        )
        duplicate_match.score = scoring["score"]
        duplicate_match.priority = scoring["priority"]
        duplicate_match.score_breakdown = scoring["breakdown"]
        if not duplicate_match.image_width:
            duplicate_match.image_width = img_w
            duplicate_match.image_height = img_h

        db.commit()
        db.refresh(duplicate_match)

        return {
            "detected": True,
            "issue": duplicate_match,
            "detections": detections,
            "image_width": img_w,
            "image_height": img_h,
            "merged_duplicate": True,
            "previous_score": prev_score,
            "new_score": duplicate_match.score,
            "previous_priority": prev_priority,
            "new_priority": duplicate_match.priority,
            "duplicate_count": duplicate_match.duplicate_count
        }

    # 3. Check for repeat repair flag
    repeat_match = find_repeat_repair_issue(existing_issues, lat, lng, issue_type, max_meters=20.0)
    is_repeat = repeat_match is not None
    linked_parent = repeat_match.id if repeat_match else None

    # 4. Calculate score & priority
    scoring = calculate_priority_score(
        issue_type=issue_type,
        confidence=confidence,
        bbox=bbox,
        img_width=img_w,
        img_height=img_h,
        duplicate_count=1,
        lat=lat,
        lng=lng
    )
    due_date = get_due_date(scoring["priority"])
    dept = get_default_department(issue_type)

    new_issue = Issue(
        type=issue_type,
        confidence=confidence,
        bbox=bbox,
        lat=lat,
        lng=lng,
        image_path=web_image_path,
        image_width=img_w,
        image_height=img_h,
        annotated_path=None,
        score=scoring["score"],
        priority=scoring["priority"],
        score_breakdown=scoring["breakdown"],
        status="Reported",
        duplicate_count=1,
        extra_images=[],
        department=dept,
        description=description,
        due_at=due_date,
        repeat_issue=is_repeat,
        linked_parent_id=linked_parent
    )

    db.add(new_issue)
    db.commit()
    db.refresh(new_issue)

    return {
        "detected": True,
        "issue": new_issue,
        "detections": detections,
        "image_width": img_w,
        "image_height": img_h,
        "merged_duplicate": False
    }
