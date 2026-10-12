from pydantic_settings import BaseSettings
from typing import List
from pathlib import Path
import os

# Résolution absolue du chemin vers backend/.env et .env racine
BASE_DIR = Path(__file__).resolve().parent

class Settings(BaseSettings):
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    PORT: int = 8000
    ENVIRONMENT: str = "development"
    CORS_ORIGINS: str = "http://localhost:3000,http://localhost:5173,http://localhost:8000"

    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.CORS_ORIGINS.split(",") if origin.strip()]

    class Config:
        # Recherche en premier dans backend/.env, puis à la racine
        env_file = (BASE_DIR / ".env", BASE_DIR.parent / ".env")
        env_file_encoding = "utf-8"
        extra = "ignore"

settings = Settings()
