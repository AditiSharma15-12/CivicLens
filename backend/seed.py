import os
import sys
import argparse
import random
from datetime import datetime, timedelta
from PIL import Image, ImageDraw, ImageFont

from app.database import SessionLocal, engine, Base
from app.models import Issue
from app.services.scoring import calculate_priority_score, get_due_date, get_default_department

# Hotspot clusters in Indore
CLUSTERS = [
    {"name": "Vijay Nagar", "lat": 22.7533, "lng": 75.8937},
    {"name": "Palasia", "lat": 22.7244, "lng": 75.8839},
    {"name": "Rajwada", "lat": 22.7196, "lng": 75.8577},
    {"name": "Bhawarkua", "lat": 22.6908, "lng": 75.8670},
    {"name": "Sarafa Bazaar", "lat": 22.7180, "lng": 75.8550},
    {"name": "Rau", "lat": 22.6280, "lng": 75.8050},
]

DEFECT_TYPES = ["pothole", "crack", "drain", "garbage", "streetlight"]

DESCRIPTIONS = {
    "pothole": [
        "Deep asphalt depression causing severe traffic slowdown.",
        "Pothole on main lane near bus stop, risk for two-wheelers.",
        "Severe crater in road surface following heavy rain.",
        "Multiple edge-break potholes across intersection."
    ],
    "crack": [
        "Longitudinal pavement cracking expanding along road shoulder.",
        "Severe alligator cracking spanning entire lane width.",
        "Transverse crack across main arterial carriageway.",
        "Block cracking near junction line."
    ],
    "drain": [
        "Storm drain inlet clogged with silt and plastic debris.",
        "Broken concrete cover over roadside drainage channel.",
        "Overflowing storm drain causing water stagnation.",
        "Missing iron grate on storm sewer outlet."
    ],
    "garbage": [
        "Unattended solid waste dump accumulated along sidewalk.",
        "Overflowing community bin spreading refuse onto roadway.",
        "Commercial packaging waste dumped near market square.",
        "Construction debris left blocking public footway."
    ],
    "streetlight": [
        "Non-functional luminaire fixture on central avenue.",
        "Flickering sodium vapor streetlight on residential stretch.",
        "Damaged light pole base with exposed wiring hazard.",
        "Darkened junction due to unlit street lamp mast."
    ]
}

SEED_DIR = os.path.join("uploads", "seed")

def create_placeholder_image(filename: str, label_text: str, width: int = 640, height: int = 480) -> str:
    """Generates a neutral gray placeholder image labeled with the defect type."""
    os.makedirs(SEED_DIR, exist_ok=True)
    filepath = os.path.join(SEED_DIR, filename)

    # Neutral gray background (#D1D5DB)
    img = Image.new('RGB', (width, height), color=(209, 213, 219))
    draw = ImageDraw.Draw(img)

    # Draw border rectangle
    draw.rectangle([10, 10, width - 10, height - 10], outline=(156, 163, 175), width=2)

    # Draw centered text label
    text = f"CIVICLENS SEED: {label_text.upper()}"
    try:
        # Simple default font rendering
        draw.text((width // 2, height // 2), text, fill=(31, 41, 55), anchor="mm")
    except Exception:
        draw.text((width // 2 - 80, height // 2 - 10), text, fill=(31, 41, 55))

    img.save(filepath, format="JPEG", quality=85)
    return f"/uploads/seed/{filename}"

def generate_seed_data(reset: bool = True):
    if reset:
        Base.metadata.drop_all(bind=engine)
        Base.metadata.create_all(bind=engine)

    db = SessionLocal()

    # Pre-generate placeholder images for each type
    image_paths = {}
    for dtype in DEFECT_TYPES:
        img_file = f"seed_{dtype}.jpg"
        image_paths[dtype] = create_placeholder_image(img_file, dtype, 640, 480)

    # Pre-generate a resolved proof image
    resolved_img_path = create_placeholder_image("seed_resolved_proof.jpg", "RESOLVED PROOF", 640, 480)

    now = datetime.utcnow()
    created_issues = []

    # Target: 40 issues spread over last 30 days
    # We will curate specific indices for resolved (5), overdue (~6), and repeat issues (2)
    # To guarantee exact constraints:
    # - 5 Resolved issues
    # - 2 Repeat issues (linked to resolved issues)
    # - ~6 Overdue issues (created 15 to 25 days ago, status Reported/In progress, High/Medium priority)

    for i in range(40):
        # Cycle through defect types
        defect_type = DEFECT_TYPES[i % len(DEFECT_TYPES)]

        # Select cluster and add small realistic geographic offset (+/- ~500m)
        cluster = CLUSTERS[i % len(CLUSTERS)]
        lat_offset = (random.random() - 0.5) * 0.015
        lng_offset = (random.random() - 0.5) * 0.015
        lat = round(cluster["lat"] + lat_offset, 6)
        lng = round(cluster["lng"] + lng_offset, 6)

        # Enforce Indore boundary limits: lat 22.60 to 22.85, lng 75.70 to 76.00
        lat = max(22.60, min(22.85, lat))
        lng = max(75.70, min(76.00, lng))

        # Duplicate count (1 to 6)
        duplicate_count = (i % 6) + 1

        # Varied bounding box sizes for scoring variation
        if i % 3 == 0:
            # Large box -> High score
            bbox = [80, 60, 440, 360]
            confidence = 0.92 + (i % 5) * 0.01
        elif i % 3 == 1:
            # Medium box
            bbox = [140, 120, 360, 300]
            confidence = 0.85 + (i % 5) * 0.01
        else:
            # Small box -> Low score
            bbox = [200, 180, 300, 260]
            confidence = 0.75 + (i % 5) * 0.01

        # Scoring
        scoring = calculate_priority_score(
            issue_type=defect_type,
            confidence=confidence,
            bbox=bbox,
            img_width=640,
            img_height=480,
            duplicate_count=duplicate_count,
            lat=lat,
            lng=lng
        )

        priority = scoring["priority"]
        score = scoring["score"]
        breakdown = scoring["breakdown"]
        dept = get_default_department(defect_type)

        # Base created_at spread back up to 28 days ago
        days_ago = 28 - (i * 0.7)
        created_at = now - timedelta(days=days_ago, hours=(i * 3) % 24)

        # Due date calculation per priority: High (+3d), Medium (+7d), Low (+14d)
        due_at = get_due_date(priority, created_at)

        # Assign status and properties
        status = "Reported"
        resolved_at = None
        res_image_path = None
        repeat_issue = False
        linked_parent_id = None

        # 1. First 5 issues (i = 0..4) are RESOLVED
        if i < 5:
            status = "Resolved"
            resolved_at = created_at + timedelta(days=random.randint(1, 4))
            res_image_path = resolved_img_path

        # 2. Issues i = 5 and 6 are REPEAT ISSUES linked to resolved issues 0 and 1
        elif i == 5 or i == 6:
            parent_issue = created_issues[i - 5] # issue 0 or 1
            defect_type = parent_issue.type
            # Place within ~10 meters of parent (0.00008 degrees ~ 9 meters)
            lat = round(parent_issue.lat + 0.00008, 6)
            lng = round(parent_issue.lng + 0.00008, 6)
            repeat_issue = True
            linked_parent_id = parent_issue.id
            status = "Reported"
            # Recompute scoring for repeat defect type
            scoring = calculate_priority_score(
                issue_type=defect_type,
                confidence=confidence,
                bbox=bbox,
                img_width=640,
                img_height=480,
                duplicate_count=duplicate_count,
                lat=lat,
                lng=lng
            )
            priority = scoring["priority"]
            score = scoring["score"]
            breakdown = scoring["breakdown"]
            due_at = get_due_date(priority, created_at)

        # 3. Next 6 unresolved issues (i = 7..12) are set to be OVERDUE
        elif 7 <= i <= 12:
            status = "Reported" if i % 2 == 0 else "In progress"
            # Force created_at far enough in the past so due_at < now
            created_at = now - timedelta(days=18 + (i - 7) * 2)
            due_at = get_due_date(priority, created_at)

        # 4. Remaining issues (i = 13..39) mixed statuses
        else:
            if i % 4 == 0:
                status = "In progress"
            elif i % 7 == 0:
                status = "Rejected"
            else:
                status = "Reported"

        desc_list = DESCRIPTIONS.get(defect_type, DESCRIPTIONS["pothole"])
        desc = desc_list[i % len(desc_list)]

        issue = Issue(
            type=defect_type,
            confidence=confidence,
            bbox=bbox,
            lat=lat,
            lng=lng,
            image_path=image_paths[defect_type],
            image_width=640,
            image_height=480,
            score=score,
            priority=priority,
            score_breakdown=breakdown,
            status=status,
            duplicate_count=duplicate_count,
            extra_images=[],
            department=dept,
            description=desc,
            created_at=created_at,
            due_at=due_at,
            resolved_at=resolved_at,
            resolved_image_path=res_image_path,
            repeat_issue=repeat_issue,
            linked_parent_id=linked_parent_id,
            reopened_count=0
        )

        db.add(issue)
        db.commit()
        db.refresh(issue)
        created_issues.append(issue)

    db.close()
    print(f"Successfully inserted {len(created_issues)} issues in Indore into the database!")

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed CivicLens database with Indore infrastructure issues.")
    parser.add_argument("--reset", action="store_true", default=True, help="Clear and reset the database before seeding.")
    args = parser.parse_args()

    generate_seed_data(reset=args.reset)
