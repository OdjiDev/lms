"""
Moteur de recommandation — v1 heuristique, explicable.

Pourquoi pas un modèle entraîné tout de suite ? Parce qu'un LMS neuf n'a pas
de données. On commence par un scoring transparent (tags, niveau, popularité),
on journalise les impressions/clics, et on remplace le scorer par un modèle
appris quand on a assez de signaux. L'interface (/v1/recommend) ne bouge pas.
"""

from __future__ import annotations

from .schemas import CandidateCourse, LearnerProfile, Recommendation

LEVEL_ORDER = {"BEGINNER": 0, "INTERMEDIATE": 1, "ADVANCED": 2}

WEIGHTS = {
    "interests": 0.55,
    "level": 0.15,
    "popularity": 0.15,
    "completion": 0.10,
    "duration": 0.05,
}


def _normalise(tags: list[str]) -> set[str]:
    return {tag.strip().lower() for tag in tags if tag and tag.strip()}


def _interest_score(learner: LearnerProfile, course: CandidateCourse) -> tuple[float, list[str]]:
    interests = _normalise(learner.interests)
    tags = _normalise(course.tags)
    if not interests or not tags:
        return 0.3, []

    matched = sorted(interests & tags)
    if not matched:
        return 0.0, []

    # Jaccard : évite qu'un cours bourré de tags gagne artificiellement.
    union = interests | tags
    return len(matched) / len(union), [f"correspond à vos intérêts : {', '.join(matched)}"]


def _level_score(learner: LearnerProfile, course: CandidateCourse) -> tuple[float, list[str]]:
    delta = abs(LEVEL_ORDER[learner.level] - LEVEL_ORDER[course.level])

    if delta == 0:
        return 1.0, ["niveau adapté"]
    if delta == 1:
        return 0.6, []
    return 0.1, ["niveau éloigné du vôtre"]


def _popularity_score(course: CandidateCourse) -> float:
    # Compression logarithmique : 1000 inscrits ne valent pas 100× plus que 100.
    import math

    return min(1.0, math.log1p(course.enrollment_count) / math.log1p(500))


def score_course(learner: LearnerProfile, course: CandidateCourse) -> Recommendation:
    interest, interest_reasons = _interest_score(learner, course)
    level, level_reasons = _level_score(learner, course)

    score = (
        WEIGHTS["interests"] * interest
        + WEIGHTS["level"] * level
        + WEIGHTS["popularity"] * _popularity_score(course)
        + WEIGHTS["completion"] * course.completion_rate
        + WEIGHTS["duration"] * _duration_fit(course.duration_min)
    )

    return Recommendation(
        course_id=course.id,
        title=course.title,
        score=round(min(1.0, max(0.0, score)), 4),
        reasons=interest_reasons + level_reasons,
    )


def _duration_fit(duration_min: int) -> float:
    """On privilégie les formats courts (30–180 min) pour un premier parcours."""
    if duration_min <= 0:
        return 0.5
    if duration_min <= 180:
        return 1.0
    if duration_min <= 360:
        return 0.7
    return 0.4


def recommend(
    learner: LearnerProfile,
    candidates: list[CandidateCourse],
    limit: int,
) -> list[Recommendation]:
    completed = set(learner.completed_course_ids)

    scored = [
        score_course(learner, course)
        for course in candidates
        if course.id not in completed
    ]

    scored.sort(key=lambda item: item.score, reverse=True)
    return scored[:limit]
