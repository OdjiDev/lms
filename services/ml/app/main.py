"""Point d'entrée FastAPI du service ML.

Lancement local :
    cd services/ml
    python -m venv .venv && . .venv/Scripts/activate   # Windows
    pip install -e ".[dev]"
    uvicorn app.main:app --reload --port 8000
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .config import settings
from .routes import router

app = FastAPI(
    title=settings.app_name,
    version=settings.version,
    description=(
        "Service de calcul du LMS : recommandations de parcours, scoring, "
        "et à terme auto-correction et analytique avancée."
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origin_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router)


@app.get("/", include_in_schema=False)
def root() -> dict[str, str]:
    return {"service": settings.app_name, "docs": "/docs", "health": "/health"}
