"""Schémas d'entrée/sortie du service ML."""

from typing import Literal

from pydantic import BaseModel, Field

Level = Literal["BEGINNER", "INTERMEDIATE", "ADVANCED"]


class LearnerProfile(BaseModel):
    user_id: str | None = None
    completed_course_ids: list[str] = Field(default_factory=list)
    interests: list[str] = Field(
        default_factory=list,
        description="Tags libres : 'management', 'data', 'soft-skills'…",
    )
    level: Level = "BEGINNER"


class CandidateCourse(BaseModel):
    id: str
    title: str
    summary: str | None = None
    tags: list[str] = Field(default_factory=list)
    level: Level = "BEGINNER"
    duration_min: int = 0
    enrollment_count: int = 0
    completion_rate: float = Field(default=0.0, ge=0.0, le=1.0)
    published_at: str | None = None


class RecommendationRequest(BaseModel):
    learner: LearnerProfile
    candidates: list[CandidateCourse] = Field(default_factory=list)
    limit: int = Field(default=5, ge=1, le=50)


class Recommendation(BaseModel):
    course_id: str
    title: str
    score: float = Field(ge=0.0, le=1.0)
    reasons: list[str]


class RecommendationResponse(BaseModel):
    items: list[Recommendation]
    model: str = "heuristic-v1"
