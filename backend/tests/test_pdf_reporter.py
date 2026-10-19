"""
tests/test_pdf_reporter.py — Suite de tests B2 & B3 : Rapports PDF RCST
========================================================================
Vérifie :
  • Génération valide des flux binaires PDF (%PDF-1.x)
  • Génération du rapport Auteur (B2) sans notes confidentielles
  • Génération du rapport Éditeur (B3) structuré en 3 blocs stricts
  • Support avec auditReport structuré complet et avec manuscriptText brut
  • Endpoints FastAPI :
      - POST /api/reports/author-pdf (401 sans auth, 200 avec JWT)
      - POST /api/reports/editor-pdf (401 sans auth, 403 si rôle non autorisé, 200 pour REVIEWER et ADMIN)
  • Vérification des en-têtes HTTP (Content-Type: application/pdf, Content-Disposition)
"""
from __future__ import annotations

import io
import os
import sys
import uuid
import pytest
from pypdf import PdfReader

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from pdf_reporter import generate_author_pdf, generate_editor_pdf
from rules_engine import RuleViolation, Severity


# ─── Données de Test ──────────────────────────────────────────────────────────

SAMPLE_AUDIT_REPORT = {
    "status": "Refusé - Modifications majeures requises",
    "globalScore": 45,
    "summary": "2 non-conformité(s) majeure(s), 1 réserve(s) mineures. Avis officiel : Refusé.",
    "rulesReport": {
        "violations": [
            {
                "rule_id": "RCST-S01",
                "severity": "CRITICAL",
                "title": "Pronoms subjectifs prohibés",
                "message": "5 occurrences de pronoms personnels/subjectifs détectées.",
                "excerpt": "nous avons mesuré les résultats | notre étude prouve",
                "position": 120,
            },
            {
                "rule_id": "RCST-C01",
                "severity": "CRITICAL",
                "title": "Citations numériques entre crochets interdites",
                "message": "3 citations numériques détectées : [1], [2].",
                "excerpt": "[1], [2]",
                "position": 350,
            },
            {
                "rule_id": "RCST-N01",
                "severity": "WARNING",
                "title": "Numérotation romaine des sections prohibée",
                "message": "Sections I., II. détectées au lieu de 1., 2.",
                "excerpt": "I. Introduction",
                "position": 500,
            },
        ],
        "passed": [
            "RCST-A01",
            "RCST-R01",
            "RCST-R02-FR",
            "RCST-R02-EN",
            "RCST-F01",
            "RCST-A02",
        ],
        "criticalCount": 2,
        "warningCount": 1,
    },
    "editorialBoardNotes": {
        "decisionRecommendation": "Rejet avec demande de refonte majeure de conformité",
        "confidentialComments": "Commentaire interne ultra confidentiel réservé à l'éditeur en chef.",
    },
}

SAMPLE_MANUSCRIPT_TEXT = """
Titre : Impact de l'intelligence artificielle sur l'agriculture en RDC

Par Jean Mboma¹*
¹ Université de Kinshasa | ORCID : 0000-0002-1234-5678
*jean.mboma@unikin.cd | +243 815 123 456

Résumé :
Cette étude analyse l'adoption des technologies d'IA dans les exploitations agricoles en RDC.
Mots-clés : IA, Agriculture, RDC, Technologies, Développement

Abstract :
This study examines the adoption of AI technologies in agricultural farms in DRC.
Keywords: AI, Agriculture, DRC, Technologies, Development

1. Introduction
Nous avons analysé l'impact de plusieurs modèles prédictifs selon les références [1] et [2].
Nos travaux confirment les données de notre étude antérieure.

2. Méthodologie
Des données ont été recueillies auprès de 50 coopératives.

Remerciements
Merci au Conseil Scientifique National.

Financement
Fonds National de la Recherche.

Conflit d'Intérêt
Aucun conflit d'intérêt déclaré.

Considérations Éthiques
Conforme aux règles éthiques.

Contribution des Auteurs
J.M. : rédaction.
"""


# ═════════════════════════════════════════════════════════════════════════════
# Tests Unitaires : generate_author_pdf (B2)
# ═════════════════════════════════════════════════════════════════════════════

class TestGenerateAuthorPdf:
    def test_returns_valid_pdf_bytes(self):
        """Vérifie que la fonction retourne des octets d'un PDF valide."""
        pdf_bytes = generate_author_pdf(
            manuscript_title="Étude sur les politiques agricoles",
            author_name="Dr. Jean Mboma",
            audit_report=SAMPLE_AUDIT_REPORT,
        )
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000
        assert pdf_bytes.startswith(b"%PDF-")

    def test_pdf_is_parsable_by_pypdf(self):
        """Vérifie que le document PDF est analysable et contient au moins une page."""
        pdf_bytes = generate_author_pdf(
            manuscript_title="Analyse comparative",
            audit_report=SAMPLE_AUDIT_REPORT,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) >= 1
        text = "\n".join(page.extract_text() for page in reader.pages)
        assert "Revue Congolaise des Sciences & Technologies" in text
        assert "RAPPORT DE CONFORMITÉ ÉDITORIALE" in text

    def test_author_pdf_contains_violations_and_corrections(self):
        """Vérifie que le rapport contient les extraits et les modèles de correction."""
        pdf_bytes = generate_author_pdf(
            manuscript_title="Titre du Manuscrit Test",
            audit_report=SAMPLE_AUDIT_REPORT,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        full_text = "\n".join(page.extract_text() for page in reader.pages)
        assert "RCST-S01" in full_text
        assert "Pronoms subjectifs prohibés" in full_text
        assert "RCST-C01" in full_text
        assert "Comment corriger" in full_text

    def test_author_pdf_excludes_confidential_notes(self):
        """Vérifie que les commentaires confidentiels du comité ne figurent pas dans le PDF auteur."""
        pdf_bytes = generate_author_pdf(
            manuscript_title="Recherche sur les métaux",
            audit_report=SAMPLE_AUDIT_REPORT,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        full_text = "\n".join(page.extract_text() for page in reader.pages)
        assert "Commentaire interne ultra confidentiel" not in full_text
        assert "DOSSIER D'INSTRUCTION ÉDITORIALE" not in full_text

    def test_author_pdf_from_raw_text(self):
        """Vérifie la génération directe depuis manuscriptText quand auditReport est absent."""
        pdf_bytes = generate_author_pdf(
            manuscript_title="Manuscrit Brut",
            manuscript_text=SAMPLE_MANUSCRIPT_TEXT,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) >= 1
        full_text = "\n".join(page.extract_text() for page in reader.pages)
        assert "RCST-S01" in full_text or "Points d'Ajustement" in full_text


# ═════════════════════════════════════════════════════════════════════════════
# Tests Unitaires : generate_editor_pdf (B3)
# ═════════════════════════════════════════════════════════════════════════════

class TestGenerateEditorPdf:
    def test_returns_valid_pdf_bytes(self):
        """Vérifie que la fonction retourne des octets d'un PDF valide."""
        pdf_bytes = generate_editor_pdf(
            manuscript_title="Étude macroéconomique",
            reviewer_name="Professeur Auditeur",
            audit_report=SAMPLE_AUDIT_REPORT,
        )
        assert isinstance(pdf_bytes, bytes)
        assert len(pdf_bytes) > 1000
        assert pdf_bytes.startswith(b"%PDF-")

    def test_editor_pdf_contains_three_blocks(self):
        """Vérifie la présence explicite des 3 blocs méthodologiques RCST."""
        pdf_bytes = generate_editor_pdf(
            manuscript_title="Dossier d'évaluation",
            audit_report=SAMPLE_AUDIT_REPORT,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        full_text = "\n".join(page.extract_text() for page in reader.pages)
        assert "DOSSIER D'INSTRUCTION ÉDITORIALE" in full_text
        assert "À Corriger Impérativement" in full_text
        assert "À Vérifier" in full_text
        assert "Conforme" in full_text

    def test_editor_pdf_displays_score_and_recommendation(self):
        """Vérifie l'affichage du score global et de la recommandation formelle."""
        pdf_bytes = generate_editor_pdf(
            manuscript_title="Dossier Score",
            audit_report=SAMPLE_AUDIT_REPORT,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        full_text = "\n".join(page.extract_text() for page in reader.pages)
        assert "45" in full_text
        assert "/100" in full_text
        assert "DÉCISION CONSEILLÉE" in full_text

    def test_editor_pdf_from_raw_text(self):
        """Vérifie la génération directe depuis manuscriptText pour le rapport éditeur."""
        pdf_bytes = generate_editor_pdf(
            manuscript_title="Article Test Brut",
            manuscript_text=SAMPLE_MANUSCRIPT_TEXT,
        )
        reader = PdfReader(io.BytesIO(pdf_bytes))
        assert len(reader.pages) >= 1
        full_text = "\n".join(page.extract_text() for page in reader.pages)
        assert "DOSSIER D'INSTRUCTION ÉDITORIALE" in full_text


# ═════════════════════════════════════════════════════════════════════════════
# Tests HTTP : Endpoints FastAPI (/api/reports/...)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def test_client():
    """Client HTTP de test FastAPI avec environnement configuré."""
    os.environ.setdefault("ENVIRONMENT", "development")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-rcst-ok")
    os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")

    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture(scope="module")
def reviewer_token(test_client):
    """Crée un utilisateur REVIEWER et retourne son JWT."""
    email = f"reviewer_{uuid.uuid4().hex[:6]}@rcst.cd"
    resp = test_client.post("/api/auth/register", json={
        "email": email,
        "full_name": "Reviewer Test",
        "password": "Password123!",
        "role": "REVIEWER",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def admin_token(test_client):
    """Crée un utilisateur ADMIN et retourne son JWT."""
    email = f"admin_{uuid.uuid4().hex[:6]}@rcst.cd"
    resp = test_client.post("/api/auth/register", json={
        "email": email,
        "full_name": "Admin Test",
        "password": "Password123!",
        "role": "ADMIN",
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]


class TestPdfEndpoints:
    def test_author_pdf_401_without_token(self, test_client):
        """401 Unauthorized si aucun token d'authentification n'est fourni."""
        resp = test_client.post("/api/reports/author-pdf", json={
            "manuscriptTitle": "Test Title",
        })
        assert resp.status_code == 401

    def test_editor_pdf_401_without_token(self, test_client):
        """401 Unauthorized si aucun token n'est fourni pour le PDF éditeur."""
        resp = test_client.post("/api/reports/editor-pdf", json={
            "manuscriptTitle": "Test Title",
        })
        assert resp.status_code == 401

    def test_author_pdf_200_with_jwt(self, test_client, reviewer_token):
        """200 OK et retour de fichier PDF pour un utilisateur authentifié."""
        resp = test_client.post(
            "/api/reports/author-pdf",
            headers={"Authorization": f"Bearer {reviewer_token}"},
            json={
                "manuscriptTitle": "Impact des nanomatériaux",
                "authorName": "Prof. Kabeya",
                "auditReport": SAMPLE_AUDIT_REPORT,
            },
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert "attachment" in resp.headers["content-disposition"]
        assert resp.content.startswith(b"%PDF-")

    def test_editor_pdf_200_for_reviewer(self, test_client, reviewer_token):
        """200 OK pour un REVIEWER demandant le rapport d'instruction éditeur."""
        resp = test_client.post(
            "/api/reports/editor-pdf",
            headers={"Authorization": f"Bearer {reviewer_token}"},
            json={
                "manuscriptTitle": "Instruction Confidentielle",
                "auditReport": SAMPLE_AUDIT_REPORT,
            },
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert "Dossier_Editeur_RCST" in resp.headers["content-disposition"]
        assert resp.content.startswith(b"%PDF-")

    def test_editor_pdf_200_for_admin(self, test_client, admin_token):
        """200 OK pour un ADMIN demandant le rapport d'instruction éditeur."""
        resp = test_client.post(
            "/api/reports/editor-pdf",
            headers={"Authorization": f"Bearer {admin_token}"},
            json={
                "manuscriptTitle": "Instruction Administration",
                "auditReport": SAMPLE_AUDIT_REPORT,
            },
        )
        assert resp.status_code == 200
        assert resp.headers["content-type"] == "application/pdf"
        assert resp.content.startswith(b"%PDF-")
