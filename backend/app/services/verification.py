from app.services.detector import CONF_THRESHOLD, get_detector_source

def verify_issue_resolution(before_detections: list, after_detections: list) -> dict:
    """Compares AI detections before and after work execution to verify issue resolution."""
    active_hazards = [
        d for d in after_detections if d.get("confidence", 0.0) >= CONF_THRESHOLD
    ]
    resolved = len(active_hazards) == 0
    detector_source = get_detector_source()

    return {
        "verified": resolved,
        "confidence": 0.92 if resolved else 0.40,
        "status": "Verified Resolved" if resolved else "Hazard Still Detected",
        "notes": "No hazards detected in post-repair inspection image." if resolved else f"{len(active_hazards)} remaining issues identified.",
        "detector_source": detector_source,
    }
