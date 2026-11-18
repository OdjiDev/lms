from app.recommender import recommend
from app.schemas import CandidateCourse, LearnerProfile


def _course(course_id: str, tags: list[str], level: str = "BEGINNER", enrollments: int = 0):
    return CandidateCourse(
        id=course_id,
        title=f"Cours {course_id}",
        tags=tags,
        level=level,  # type: ignore[arg-type]
        enrollment_count=enrollments,
        completion_rate=0.5,
        duration_min=90,
    )


def test_interests_drive_ranking():
    learner = LearnerProfile(interests=["data", "python"])
    candidates = [
        _course("a", ["management"]),
        _course("b", ["data", "python", "sql"]),
    ]
    results = recommend(learner, candidates, limit=2)

    assert results[0].course_id == "b"
    assert results[0].score > results[1].score
    assert any("intérêts" in reason for reason in results[0].reasons)


def test_completed_courses_are_excluded():
    learner = LearnerProfile(interests=["data"], completed_course_ids=["b"])
    candidates = [_course("a", ["data"]), _course("b", ["data"])]

    results = recommend(learner, candidates, limit=5)

    assert [item.course_id for item in results] == ["a"]


def test_level_distance_lowers_score():
    learner = LearnerProfile(interests=["data"], level="BEGINNER")
    close = _course("close", ["data"], level="BEGINNER")
    far = _course("far", ["data"], level="ADVANCED")

    results = recommend(learner, [far, close], limit=2)

    assert results[0].course_id == "close"
