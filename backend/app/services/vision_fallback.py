"""
vision_fallback.py
Vision-LLM fallback for the infrastructure issue detector.

YOLO handles potholes / cracks / garbage. The vision LLM is used when:
  * YOLO finds nothing, or only low-confidence boxes
  * you need classes YOLO was not trained on (broken_streetlight)
  * you force it (force_vlm=True)

Both sources return the SAME detection dict so the priority scorer does not care:
  {"class": str, "confidence": float, "bbox": [x1,y1,x2,y2] | None,   # normalised 0-1
   "area_frac": float, "source": "yolo" | "vlm", "note": str}

Setup:  pip install anthropic pillow ultralytics
        export ANTHROPIC_API_KEY=sk-ant-...
"""
import base64
import io
import logging
import os

import anthropic
from PIL import Image

log = logging.getLogger("vision_fallback")

MODEL = os.getenv("VLM_MODEL", "claude-sonnet-5-5")
CLASSES = ["pothole", "road_crack", "broken_streetlight", "garbage_overflow", "drain_overflow"]

# A VLM cannot give reliable pixel boxes, so it reports a coarse "extent".
# We convert it to a stand-in for the bbox-area fraction used in severity scoring.
EXTENT_TO_AREA = {"small": 0.02, "medium": 0.08, "large": 0.20}

REPORT_TOOL = {
    "name": "report_issues",
    "description": "Report every public-infrastructure issue visible in the photo.",
    "input_schema": {
        "type": "object",
        "properties": {
            "issues": {
                "type": "array",
                "description": "Empty list if the photo shows no issue.",
                "items": {
                    "type": "object",
                    "properties": {
                        "type": {"type": "string", "enum": CLASSES},
                        "confidence": {"type": "number", "description": "0.0 to 1.0"},
                        "extent": {
                            "type": "string",
                            "enum": ["small", "medium", "large"],
                            "description": "Size of the issue relative to the frame.",
                        },
                        "description": {"type": "string", "description": "One factual sentence."},
                    },
                    "required": ["type", "confidence", "extent", "description"],
                },
            },
            "is_valid_infrastructure_photo": {
                "type": "boolean",
                "description": "False for selfies, indoor shots, screenshots, etc.",
            },
        },
        "required": ["issues", "is_valid_infrastructure_photo"],
    },
}

SYSTEM = (
    "You inspect photos of Indian city streets for a municipal complaint system. "
    "Report only issues you can clearly see: potholes, road cracks/damage, broken or "
    "non-working streetlights (broken pole, hanging/missing lamp, damaged fixture; a lamp "
    "that is simply off in daylight is NOT broken), garbage heaps or overflowing bins "
    "(garbage_overflow), and overflowing drains, open drains or open manholes "
    "(drain_overflow). Be conservative: if unsure, lower the confidence or omit the issue."
)


def _client():
    return anthropic.Anthropic(timeout=30.0, max_retries=2)  # reads ANTHROPIC_API_KEY


def _prepare(image_bytes: bytes, max_side: int = 1568) -> str:
    """Resize + re-encode as JPEG to keep latency and cost low; return base64."""
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    img.thumbnail((max_side, max_side))
    buf = io.BytesIO()
    img.save(buf, format="JPEG", quality=85)
    return base64.standard_b64encode(buf.getvalue()).decode()


def vlm_detect(image_bytes: bytes) -> list[dict]:
    """Ask the vision LLM what is wrong in the photo. Never raises; returns [] on failure."""
    try:
        resp = _client().messages.create(
            model=MODEL,
            max_tokens=800,
            system=SYSTEM,
            tools=[REPORT_TOOL],
            tool_choice={"type": "tool", "name": "report_issues"},  # forces structured output
            messages=[{
                "role": "user",
                "content": [
                    {"type": "image",
                     "source": {"type": "base64", "media_type": "image/jpeg",
                                "data": _prepare(image_bytes)}},
                    {"type": "text", "text": "List the infrastructure issues in this photo."},
                ],
            }],
        )
        data = next(b.input for b in resp.content if b.type == "tool_use")
    except Exception as e:  # network, auth, bad image, rate limit...
        log.warning("VLM fallback failed: %s", e)
        return []

    if not data.get("is_valid_infrastructure_photo", True):
        return []

    dets = []
    for it in data.get("issues", []):
        if it["type"] not in CLASSES:
            continue
        dets.append({
            "class": it["type"],
            "confidence": round(float(it["confidence"]), 3),
            "bbox": None,
            "area_frac": EXTENT_TO_AREA.get(it["extent"], 0.05),
            "source": "vlm",
            "note": it["description"],
        })
    return dets


def yolo_detect(image_bytes: bytes, yolo_model, conf: float = 0.25) -> list[dict]:
    img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
    r = yolo_model.predict(img, conf=conf, verbose=False)[0]
    dets = []
    for b in r.boxes:
        x1, y1, x2, y2 = b.xyxyn[0].tolist()
        dets.append({
            "class": r.names[int(b.cls)],
            "confidence": round(float(b.conf), 3),
            "bbox": [x1, y1, x2, y2],
            "area_frac": round((x2 - x1) * (y2 - y1), 4),
            "source": "yolo",
            "note": "",
        })
    return dets


def detect_with_fallback(
    image_bytes: bytes,
    yolo_model,
    conf: float = 0.25,
    min_conf: float = 0.50,
    force_vlm: bool = False,
) -> tuple[list[dict], dict]:
    """
    Run YOLO first. Call the VLM if YOLO is empty / weak, or if force_vlm is set.
    VLM results are only added for classes YOLO did not already find, so the same
    issue is not reported twice.
    Returns (detections, meta).
    """
    dets = yolo_detect(image_bytes, yolo_model, conf)
    weak = not dets or max(d["confidence"] for d in dets) < min_conf
    use_vlm = force_vlm or weak

    if use_vlm:
        have = {d["class"] for d in dets}
        dets += [d for d in vlm_detect(image_bytes) if d["class"] not in have]

    return dets, {"used_vlm": use_vlm, "yolo_weak": weak}


def generate_complaint(dets: list[dict], address: str, priority: str, reported_at: str) -> str:
    """Draft a formal complaint to the municipal authority (text only, cheap)."""
    if not dets:
        return ""
    issues = "\n".join(
        f"- {d['class'].replace('_', ' ')} (confidence {d['confidence']:.0%}, "
        f"detected by {d['source']}) {d['note']}" for d in dets
    )
    prompt = (
        "Write a short, polite, formal complaint (max 130 words) to the Municipal "
        "Corporation's Public Works / Civic Maintenance department. Include a subject line, "
        "the location, the issues, the priority level, and a request for inspection and "
        "repair. Do not invent facts beyond those given.\n\n"
        f"Location: {address}\nReported at: {reported_at}\nPriority: {priority}\nIssues:\n{issues}"
    )
    try:
        resp = _client().messages.create(
            model=MODEL, max_tokens=400,
            messages=[{"role": "user", "content": prompt}],
        )
        return resp.content[0].text.strip()
    except Exception as e:
        log.warning("Complaint generation failed: %s", e)
        return ""


if __name__ == "__main__":
    import sys
    from ultralytics import YOLO

    path = sys.argv[1]
    model = YOLO(sys.argv[2] if len(sys.argv) > 2 else "best.pt")
    with open(path, "rb") as f:
        raw = f.read()
    found, meta = detect_with_fallback(raw, model)
    print(meta)
    for d in found:
        print(d)
    print(generate_complaint(found, "MG Road, Mumbai", "High", "2026-10-06 10:30"))
