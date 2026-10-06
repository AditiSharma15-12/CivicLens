import os
import logging
import traceback
from pathlib import Path
from typing import List, Dict, Tuple, Optional

logger = logging.getLogger(__name__)

# Absolute path to model in backend folder
MODEL_PATH = Path(__file__).resolve().parents[2] / "best.pt"
CONF_THRESHOLD = 0.25

def normalize(name: str) -> str:
    if not name:
        return ""
    return str(name).strip().lower().replace("(", "-").replace(")", "-")

RAW_CLASS_MAP = {
    "pothole": "pothole",
    "road_cracks": "crack",
    "corrugation": "crack",
    "garbage": "garbage",
    "drainage overflow(repair)": "drain",
    "open drainage(overflowing)": "drain",
    "open drainage(not overflowing)": "drain",
    "open manhole(not overflowing)": "drain",
    "off_bulb": "streetlight"
}

RAW_IGNORED_CLASSES = {
    "closed manhole(not overflowing)",
    "non-garbage",
    "on_bulb",
    "street_light"
}

CLASS_MAP = {normalize(k): v for k, v in RAW_CLASS_MAP.items()}
IGNORED_CLASSES = {normalize(k) for k in RAW_IGNORED_CLASSES}

_cached_model = None
_active_mode: Optional[str] = None
_mode_reason: Optional[str] = None


def _init_detector() -> Tuple[Optional[object], str]:
    global _cached_model, _active_mode, _mode_reason

    if _active_mode is not None:
        return _cached_model, _active_mode

    mode_env = os.getenv("DETECTOR_MODE", "auto").lower().strip()

    if mode_env == "stub":
        _active_mode = "stub"
        _mode_reason = "DETECTOR_MODE set to stub"
        logger.info("Detector mode: stub, reason: %s", _mode_reason)
        print(f"Detector mode: stub, reason: {_mode_reason}")
        return None, "stub"

    if mode_env == "real" or (mode_env == "auto" and MODEL_PATH.exists()):
        if not MODEL_PATH.exists():
            err_msg = f"DETECTOR_MODE is 'real' but model file does not exist at {MODEL_PATH}"
            logger.error(err_msg)
            raise FileNotFoundError(err_msg)

        try:
            from ultralytics import YOLO
            model = YOLO(str(MODEL_PATH))
            _cached_model = model
            _active_mode = "real"

            names = model.names
            if isinstance(names, dict):
                class_names = [names[i] for i in sorted(names.keys())]
            else:
                class_names = list(names)

            logger.info("Detector mode: real, model: %s, classes: %s", MODEL_PATH, class_names)
            print(f"Detector mode: real, model: {MODEL_PATH}, classes: {class_names}")

            mapped_list = []
            ignored_list = []
            unknown_list = []

            for cls_name in class_names:
                norm = normalize(cls_name)
                if norm in IGNORED_CLASSES:
                    ignored_list.append(cls_name)
                elif norm in CLASS_MAP:
                    mapped_list.append(f"{cls_name} -> {CLASS_MAP[norm]}")
                else:
                    unknown_list.append(cls_name)

            logger.info("Mapped classes: %s", mapped_list)
            logger.info("Ignored classes: %s", ignored_list)
            logger.info("Unknown classes: %s", unknown_list)
            print(f"Mapped classes: {mapped_list}")
            print(f"Ignored classes: {ignored_list}")
            print(f"Unknown classes: {unknown_list}")

            return _cached_model, "real"
        except Exception as e:
            logger.error("Failed to load ultralytics YOLO model from %s:\n%s", MODEL_PATH, traceback.format_exc(), exc_info=True)
            raise e

    # auto mode when MODEL_PATH does not exist
    _active_mode = "stub"
    _mode_reason = f"model file best.pt not found at {MODEL_PATH}"
    logger.info("Detector mode: stub, reason: %s", _mode_reason)
    print(f"Detector mode: stub, reason: {_mode_reason}")
    return None, "stub"


def get_detector_source() -> str:
    """Returns 'real' or 'stub' for the mode that is actually active."""
    _, mode = _init_detector()
    return mode


def detect(image_path: str) -> List[Dict]:
    """
    Detector contract:
    detect(image_path) -> list[{"type": str, "confidence": float, "bbox": [x1, y1, x2, y2]}]
    """
    model, mode = _init_detector()

    if mode == "real" and model is not None:
        results = model(image_path, conf=CONF_THRESHOLD)
        detections = []
        names = model.names

        for result in results:
            boxes = result.boxes
            if boxes is None:
                continue
            for box in boxes:
                conf_val = float(box.conf[0])
                cls_id = int(box.cls[0])
                raw_cls_name = names[cls_id] if isinstance(names, dict) else names[cls_id]
                norm_name = normalize(raw_cls_name)

                if norm_name in IGNORED_CLASSES or norm_name not in CLASS_MAP:
                    continue

                mapped_type = CLASS_MAP[norm_name]
                xyxy = box.xyxy[0].tolist()
                bbox = [int(round(c)) for c in xyxy]

                detections.append({
                    "type": mapped_type,
                    "confidence": round(conf_val, 2),
                    "bbox": bbox
                })

        detections.sort(key=lambda x: x["confidence"], reverse=True)
        return detections

    # Stub mode implementation
    fn_lower = Path(image_path).name.lower()
    if any(keyword in fn_lower for keyword in ("clean", "fixed", "after")):
        return []

    # Determine defect type from filename or default to pothole
    defect_type = "pothole"
    for candidate in ("pothole", "crack", "drain", "garbage", "streetlight"):
        if candidate in fn_lower:
            defect_type = candidate
            break

    # Deterministic confidence between 0.55 and 0.92 based on filename hash
    hash_val = sum(ord(c) for c in fn_lower)
    confidence = round(0.55 + (hash_val % 38) * 0.01, 2)

    # Calculate bbox covering 8 to 30% of original image dimensions using PIL
    try:
        from PIL import Image
        with Image.open(image_path) as img:
            w, h = img.size
    except Exception:
        w, h = 640, 480

    x1 = int(w * 0.20)
    y1 = int(h * 0.20)
    x2 = int(w * 0.65)
    y2 = int(h * 0.65)
    bbox = [x1, y1, x2, y2]

    return [
        {
            "type": defect_type,
            "confidence": confidence,
            "bbox": bbox
        }
    ]
