# Architecture Découplée - Assistant RCST
## Revue Congolaise des Sciences & Technologies (RCST)
### Conseil Scientifique National - RDC

Ce projet est structuré selon une **architecture découplée** propre et souveraine :

---

### 1. BACKEND (FastAPI - Python)
Dossier : `backend/`

- **Framework** : FastAPI + Pydantic v2 + Uvicorn
- **IA** : SDK officiel Google GenAI (`google-genai`), modèle `gemini-2.5-flash`, température 0.2
- **Système de prompt immuable** : `backend/prompts.py` appliquant strictement la Constitution RCST (IMRAD, APA 7, style impersonnel, 250 mots max, etc.)
- **Extraction textuelle** : `backend/extractor.py` (.docx, .pdf, .txt, .md)
- **Moteur heuristique de secours** : Déterministe en cas de déconnexion ou quota

#### Lancement du Backend :
```bash
cd backend
python -m venv venv
# Sur Windows :
.\venv\Scripts\activate
# Installation des dépendances :
pip install -r requirements.txt
# Créer .env à partir de .env.example et renseigner GEMINI_API_KEY
uvicorn main:app --reload --port 8000
```
Documentation Swagger automatique disponible sur : `http://localhost:8000/docs`

---

### 2. FRONTEND (React / Vite / Tailwind CSS)
Dossier racine

- **Interface** : Épurée, sobre et minimaliste (style Gemini / ChatGPT)
- **Composant clé** : `GeminiPromptInput.tsx` avec champ auto-extensible et bouton `+` pour fichiers Word / PDF
- **Tableau de bord** : `AuditReportView.tsx` avec badges de conformité, score global, recommandations prioritaires et export Markdown / impression officielle.

#### Lancement du Frontend :
```bash
npm install
npm run dev
```
Accessible sur `http://localhost:3000` ou `http://localhost:5173`.
Le frontend proxie automatiquement les requêtes `/api/*` vers le serveur FastAPI ou le serveur local unifié.
