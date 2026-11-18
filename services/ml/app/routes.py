from fastapi import APIRouter, HTTPException

from .config import settings
from .recommender import recommend
from .schemas import RecommendationRequest, RecommendationResponse

router = APIRouter()


@router.get("/health", tags=["health"])
def health() -> dict[str, str]:
    return {
        "status": "ok",
        "service": settings.app_name,
        "version": settings.version,
        "environment": settings.environment,
    }


@router.post("/v1/recommend", response_model=RecommendationResponse, tags=["recommendations"])
def recommend_courses(payload: RecommendationRequest) -> RecommendationResponse:
    if not payload.candidates:
        raise HTTPException(status_code=422, detail="Aucun cours candidat fourni")

    items = recommend(payload.learner, payload.candidates, payload.limit)
    return RecommendationResponse(items=items)
