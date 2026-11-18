"""Configuration du service ML (variables d'environnement préfixées ML_)."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_prefix="ML_", env_file=".env", extra="ignore")

    app_name: str = "LMS ML Service"
    version: str = "0.1.0"
    environment: str = "development"
    # Origines autorisées pour les appels navigateur (l'API NestJS appelle en server-to-server).
    cors_origins: str = "http://localhost:3000,http://localhost:4000"

    @property
    def cors_origin_list(self) -> list[str]:
        return [origin.strip() for origin in self.cors_origins.split(",") if origin.strip()]


settings = Settings()
