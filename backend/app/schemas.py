from pydantic import BaseModel, computed_field
from typing import List, Optional, Any, Dict
from datetime import datetime

class Detection(BaseModel):
    type: str
    confidence: float
    bbox: List[int]

class ScoreFactor(BaseModel):
    raw_value: float
    weight: float
    contribution: float

class ScoreBreakdown(BaseModel):
    type_weight: ScoreFactor
    size_ratio: ScoreFactor
    confidence: ScoreFactor
    location_risk: ScoreFactor
    duplicates: ScoreFactor

class IssueBase(BaseModel):
    type: str
    lat: float
    lng: float
    description: Optional[str] = None
    department: Optional[str] = "Public Works Department"

class IssueStatusUpdate(BaseModel):
    status: Optional[str] = None
    department: Optional[str] = None
    description: Optional[str] = None

class IssueOut(BaseModel):
    id: int
    type: str
    confidence: float
    bbox: List[int]
    lat: float
    lng: float
    image_path: str
    image_width: Optional[int] = None
    image_height: Optional[int] = None
    annotated_path: Optional[str] = None
    score: float
    priority: str
    score_breakdown: Dict[str, Any]
    status: str
    duplicate_count: int
    extra_images: List[str] = []
    department: str
    description: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None
    resolved_image_path: Optional[str] = None
    reopened_count: int = 0
    due_at: datetime
    repeat_issue: bool = False
    linked_parent_id: Optional[int] = None

    @computed_field
    def is_overdue(self) -> bool:
        if self.status == "Resolved" or not self.due_at:
            return False
        due = self.due_at.replace(tzinfo=None) if hasattr(self.due_at, 'replace') else self.due_at
        now = datetime.utcnow()
        return due < now

    @computed_field
    def days_overdue(self) -> int:
        if not self.is_overdue:
            return 0
        due = self.due_at.replace(tzinfo=None) if hasattr(self.due_at, 'replace') else self.due_at
        now = datetime.utcnow()
        diff = now - due
        return max(1, diff.days if diff.days > 0 else 1)

    class Config:
        from_attributes = True

class ReportResponse(BaseModel):
    detected: bool
    issue: Optional[IssueOut] = None
    detections: List[Detection] = []
    image_width: int
    image_height: int
    merged_duplicate: bool = False
    previous_score: Optional[float] = None
    new_score: Optional[float] = None
    previous_priority: Optional[str] = None
    new_priority: Optional[str] = None
    duplicate_count: Optional[int] = None

class StatsOut(BaseModel):
    total_issues: int
    open_issues: int
    resolved_issues: int
    overdue_issues: int
    by_type: Dict[str, int]
    by_priority: Dict[str, int]
    by_status: Dict[str, int]
    resolved_this_week: int
    average_score: float
