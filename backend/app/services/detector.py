import logging
import math
import os
from pathlib import Path
from typing import Dict, List, Optional

logger = logging.getLogger(__name__)

# best.pt lives in backend/ (same location as before)
MODEL_PATH = Path(__file__).resolve().parents[2] / "best (5).pt"
CONF_THRESHOLD = 0.25

# Vision-LLM fallback: used when YOLO finds nothing, or its best box is below this confidence.
VLM_MIN_CONF = float(os.getenv("VLM_MIN_CONF", "0.5"))


def normalize(name: str) -> str:
    if not name:
        return ""
    return str(name).strip().lower().replace("(", "-").replace(")", "-")


# ---- YOLO class name -> app issue type (unchanged from your previous file) ----
RAW_CLASS_MAP = {
    "pothole": "pothole",
    "road_cracks": "crack",
    "corrugation": "crack",
    "garbage": "garbage",
    "drainage overflow(repair)": "drain",
    "open drainage(overflowing)": "drain",
    "open drainage(not overflowing)": "drain",
    "open manhole(not overflowing)": "drain",
    "off_bulb": "streetlight",
}

RAW_IGNORED_CLASSES = {
    "closed manhole(not overflowing)",
    "non-garbage",
    "on_bulb",
    "street_light",
}

CLASS_MAP = {normalize(k): v for k, v in RAW_CLASS_MAP.items()}
IGNORED_CLASSES = {normalize(k) for k in RAW_IGNORED_CLASSES}

# ---- Vision-LLM class name -> app issue type ----
VLM_TO_TYPE = {
    "pothole": "pothole",
    "road_crack": "crack",
    "garbage_overflow": "garbage",
    "drain_overflow": "drain",
    "broken_streetlight": "streetlight",
}

_model = None


def _load_model():
    """Load the YOLO model once. Raises a clear error if best.pt is missing."""
    global _model
    if _model is not None:
        return _model

    if not MODEL_PATH.exists():
        raise FileNotFoundError(f"Model file not found at {MODEL_PATH}. Put best.pt in the backend/ folder.")

    from ultralytics import YOLO

    _model = YOLO(str(MODEL_PATH))

    names = _model.names
    class_names = [names[i] for i in sorted(names)] if isinstance(names, dict) else list(names)
    mapped, ignored, unknown = [], [], []
    for n in class_names:
        norm = normalize(n)
        if norm in IGNORED_CLASSES:
            ignored.append(n)
        elif norm in CLASS_MAP:
            mapped.append(f"{n} -> {CLASS_MAP[norm]}")
        else:
            unknown.append(n)
    logger.info("Detector loaded: %s", MODEL_PATH)
    logger.info("Mapped classes: %s", mapped)
    logger.info("Ignored classes: %s", ignored)
    logger.info("Unknown classes (dropped): %s", unknown)
    return _model


def get_detector_source() -> str:
    """Kept for compatibility with callers. The stub is gone, so this is always 'real'."""
    _load_model()
    return "real"


def _vlm_enabled() -> bool:
    if os.getenv("VLM_FALLBACK", "on").lower().strip() == "off":
        return False
    return bool(os.getenv("ANTHROPIC_API_KEY"))


def _image_size(image_path: str):
    try:
        from PIL import Image

        with Image.open(image_path) as img:
            return img.size
    except Exception:
        return 640, 480


def _yolo_detect(model, image_path: str) -> List[Dict]:
    detections = []
    names = model.names
    for result in model(image_path, conf=CONF_THRESHOLD, verbose=False):
        if result.boxes is None:
            continue
        for box in result.boxes:
            norm_name = normalize(names[int(box.cls[0])])
            if norm_name in IGNORED_CLASSES or norm_name not in CLASS_MAP:
                continue
            detections.append({
                "type": CLASS_MAP[norm_name],
                "confidence": round(float(box.conf[0]), 2),
                "bbox": [int(round(c)) for c in box.xyxy[0].tolist()],
                "source": "yolo",
            })
    return detections


def _estimated_bbox(w: int, h: int, area_frac: float) -> List[int]:
    """The LLM gives no pixel box. Build a centred box covering ~area_frac of the image so
    scoring (which uses bbox area) keeps working. Mark it as estimated for the UI."""
    s = math.sqrt(max(min(area_frac, 1.0), 0.001))
    bw, bh = w * s, h * s
    x1, y1 = (w - bw) / 2, (h - bh) / 2
    return [int(x1), int(y1), int(x1 + bw), int(y1 + bh)]


def _vlm_detect(image_path: str, have_types: set) -> List[Dict]:
    from app.services.vision_fallback import vlm_detect

    with open(image_path, "rb") as f:
        raw = f.read()
    w, h = _image_size(image_path)

    out = []
    for d in vlm_detect(raw):
        t = VLM_TO_TYPE.get(d["class"])
        if not t or t in have_types:  # don't duplicate something YOLO already found
            continue
        out.append({
            "type": t,
            "confidence": d["confidence"],
            "bbox": _estimated_bbox(w, h, d["area_frac"]),
            "source": "vlm",
            "bbox_estimated": True,
            "note": d.get("note", ""),
        })
    return out


def detect(image_path: str) -> List[Dict]:
    """
    Detector contract:
    detect(image_path) -> list[{"type": str, "confidence": float, "bbox": [x1, y1, x2, y2], ...}]
    Extra keys: "source" ('yolo' | 'vlm'); VLM items also have "bbox_estimated" and "note".
    """
    model = _load_model()
    detections = _yolo_detect(model, image_path)

    weak = not detections or max(d["confidence"] for d in detections) < VLM_MIN_CONF
    if weak and _vlm_enabled():
        try:
            detections += _vlm_detect(image_path, {d["type"] for d in detections})
        except Exception:
            logger.exception("VLM fallback failed for %s; returning YOLO results only", image_path)

    detections.sort(key=lambda x: x["confidence"], reverse=True)
    return detections
