from sqlalchemy import Column, Integer, String, Float, DateTime, Text, JSON, Boolean, ForeignKey
from datetime import datetime
from app.database import Base

class Issue(Base):
    __tablename__ = "issues"

    id = Column(Integer, primary_key=True, index=True)
    type = Column(String, index=True)  # pothole, crack, drain, garbage, streetlight
    confidence = Column(Float, nullable=False)
    bbox = Column(JSON, nullable=False)  # [x1, y1, x2, y2]
    lat = Column(Float, nullable=False)
    lng = Column(Float, nullable=False)
    image_path = Column(String, nullable=False)
    image_width = Column(Integer, nullable=True)
    image_height = Column(Integer, nullable=True)
    annotated_path = Column(String, nullable=True)
    score = Column(Float, nullable=False)  # 0-100
    priority = Column(String, index=True)  # High, Medium, Low
    score_breakdown = Column(JSON, nullable=False)
    status = Column(String, default="Reported", index=True)  # Reported, In progress, Resolved, Rejected
    duplicate_count = Column(Integer, default=1)
    extra_images = Column(JSON, default=list)
    department = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    resolved_at = Column(DateTime, nullable=True)
    resolved_image_path = Column(String, nullable=True)
    reopened_count = Column(Integer, default=0)
    due_at = Column(DateTime, nullable=False)
    repeat_issue = Column(Boolean, default=False)
    linked_parent_id = Column(Integer, ForeignKey("issues.id"), nullable=True)
