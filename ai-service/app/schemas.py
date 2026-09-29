from typing import Literal, Optional

from pydantic import BaseModel, Field


class CategoryCandidate(BaseModel):
    id: str
    name: str
    description: Optional[str] = None
    department_id: Optional[str] = None
    department_name: Optional[str] = None


class ImageEvidence(BaseModel):
    mime_type: Literal[
        "image/jpeg",
        "image/png",
        "image/webp",
    ]
    data_base64: str = Field(
        min_length=20,
        max_length=8_000_000,
    )


class ClassificationRequest(BaseModel):
    description: str = Field(
        min_length=10,
        max_length=2000,
    )
    categories: list[CategoryCandidate] = Field(
        min_length=1,
    )
    images: list[ImageEvidence] = Field(
        default_factory=list,
        max_length=3,
    )


class ClassificationResponse(BaseModel):
    intent: str

    domain: str
    problem_type: str
    problem_label: str

    suggested_category_id: str
    suggested_category_name: str
    suggested_department_id: Optional[str] = None
    suggested_department_name: Optional[str] = None

    priority: str

    detection_confidence: float
    category_match_confidence: float
    confidence: float

    model: str
    classification_mode: str = "online_text"
