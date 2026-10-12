"""
Point d'entrée du serveur FastAPI RCST.
Lance uvicorn depuis la racine du projet :
    python run.py
ou directement :
    uvicorn backend.main:app --reload --port 8000
"""
import uvicorn
from backend.config import settings

if __name__ == "__main__":
    print("=" * 60)
    print("  RCST Audit Engine - Revue Congolaise des Sciences & Tech.")
    print("  Conseil Scientifique National - RDC")
    print(f"  Environnement : {settings.ENVIRONMENT}")
    print(f"  Cle GenAI      : {'[OK] Configuree' if settings.GEMINI_API_KEY else '[ABSENTE] Mode heuristique'}")
    print(f"  Swagger UI     : http://localhost:{settings.PORT}/docs")
    print("=" * 60)
    uvicorn.run(
        "backend.main:app",
        host="0.0.0.0",
        port=settings.PORT,
        reload=(settings.ENVIRONMENT == "development"),
        log_level="info"
    )
