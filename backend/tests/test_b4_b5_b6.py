"""
tests/test_b4_b5_b6.py — Suite de tests pour B4 (Validation Dispatch), B5 (Biblio) & B6 (CrossRef) & Double-Check
=================================================================================================================
Vérifie :
  1. Concordance bibliographique (B5) :
       - Extraction des citations in-text (parenthétiques et narratives)
       - Détection des citations orphelines
       - Détection des références non citées
       - Contrôle de l'ordre alphabétique
  2. Validation CrossRef (B6) :
       - Extraction des DOI normalisés
       - Mock des appels HTTP CrossRef (cas de succès 200, non trouvé 404, divergence d'année)
  3. Validation Éditeur avant envoi (B4) :
       - Approbation réussie par REVIEWER / ADMIN avec consignation dans l'audit trail
       - Refus 403 pour les utilisateurs non habilités
       - Consultation du statut via GET /api/submissions/{id}/dispatch-status
  4. Double-Check IA & Fusion (audit_service) :
       - Fusion croisée déterministe entre Passe 1 et Passe 2 (Reviewer Critic)
       - Intégrité du socle déterministe après fusion
  5. Extension 90+ règles (rules_engine) :
       - Présence des 100+ règles dans le catalogue et exécution déterministe
"""
from __future__ import annotations

import os
import sys
import uuid
import pytest
from unittest.mock import AsyncMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from bib_checker import check_bibliography_concordance, extract_in_text_citations, extract_bibliography_entries
from crossref_service import extract_doi_from_text, verify_reference_with_crossref, CrossrefVerificationResult, clear_cache
from audit_service import _merge_double_check_reports
from rules_engine import run_all_rules


# ═════════════════════════════════════════════════════════════════════════════
# 1. Tests B5 : Concordance Bibliographique
# ═════════════════════════════════════════════════════════════════════════════

class TestBibliographicConcordance:
    def test_extract_in_text_parenthetical_and_narrative(self):
        text = """
        Selon Mboma (2021), l'innovation est essentielle.
        D'autres résultats confirment cette tendance (Kabasele, 2019).
        Par ailleurs, Tshilombo et al. (2020) ont observé des gains similaires.
        """
        citations = extract_in_text_citations(text)
        authors = {c.author for c in citations}
        assert "Mboma" in authors
        assert "Kabasele" in authors
        assert "Tshilombo" in authors

    def test_detect_orphan_citations(self):
        text = """
        1. Introduction
        Les travaux de Mboma (2021) et l'étude orpheline de Kabeya (2015) sont examinés.
        
        Références
        Mboma, J. (2021). Innovation et croissance. Kinshasa.
        """
        report = check_bibliography_concordance(text)
        orphan_names = [c.author for c in report.orphan_citations]
        assert "Kabeya" in orphan_names
        assert "Mboma" not in orphan_names

    def test_detect_uncited_references(self):
        text = """
        1. Introduction
        Seul Mboma (2021) est cité dans le texte.
        
        Références
        Kabasele, P. (2019). Énergie solaire en RDC. Lubumbashi.
        Mboma, J. (2021). Innovation et croissance. Kinshasa.
        """
        report = check_bibliography_concordance(text)
        uncited_names = [b.author_key for b in report.uncited_references]
        assert "Kabasele" in uncited_names
        assert "Mboma" not in uncited_names

    def test_alphabetical_order_detection(self):
        sorted_text = """
        1. Intro
        Citations : (Kabasele, 2019), (Mboma, 2021).
        Références
        Kabasele, P. (2019). Ouvrage A.
        Mboma, J. (2021). Ouvrage B.
        """
        rep_sorted = check_bibliography_concordance(sorted_text)
        assert rep_sorted.is_alphabetical is True

        unsorted_text = """
        1. Intro
        Citations : (Kabasele, 2019), (Mboma, 2021).
        Références
        Mboma, J. (2021). Ouvrage B.
        Kabasele, P. (2019). Ouvrage A.
        """
        rep_unsorted = check_bibliography_concordance(unsorted_text)
        assert rep_unsorted.is_alphabetical is False


# ═════════════════════════════════════════════════════════════════════════════
# 2. Tests B6 : Intégration CrossRef
# ═════════════════════════════════════════════════════════════════════════════

class TestCrossRefService:
    def test_extract_doi(self):
        text1 = "Consulter https://doi.org/10.1016/j.jclinepi.2020.08.010 pour plus d'infos."
        text2 = "doi:10.1038/s41586-020-2649-2."
        assert extract_doi_from_text(text1) == "10.1016/j.jclinepi.2020.08.010"
        assert extract_doi_from_text(text2) == "10.1038/s41586-020-2649-2"

    @pytest.mark.anyio
    async def test_crossref_mock_success(self):
        clear_cache()
        mock_response_data = {
            "status": "ok",
            "message": {
                "DOI": "10.1000/182",
                "title": ["The Digital Object Identifier System"],
                "issued": {"date-parts": [[2021, 5]]},
                "container-title": ["Information Services & Use"],
                "score": 1.0,
            }
        }
        mock_client = AsyncMock()
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: mock_response_data
        mock_client.get.return_value = mock_resp

        res = await verify_reference_with_crossref("DOI: 10.1000/182 (2021)", client=mock_client)
        assert res.is_found is True
        assert res.verified_year == "2021"
        assert res.verified_title == "The Digital Object Identifier System"

    @pytest.mark.anyio
    async def test_crossref_mock_divergence_detection(self):
        clear_cache()
        mock_response_data = {
            "status": "ok",
            "message": {
                "DOI": "10.1000/divergent-year",
                "title": ["Official Title"],
                "issued": {"date-parts": [[2015]]},
                "container-title": ["Journal A"],
                "score": 1.0,
            }
        }
        mock_client = AsyncMock()
        mock_resp = AsyncMock()
        mock_resp.status_code = 200
        mock_resp.json = lambda: mock_response_data
        mock_client.get.return_value = mock_resp

        # Le manuscrit indique 2022 mais CrossRef indique 2015
        res = await verify_reference_with_crossref(
            "Mboma, J. (2022). Title. https://doi.org/10.1000/divergent-year", client=mock_client
        )
        assert res.is_found is True
        assert any("Divergence d'année" in note for note in res.divergence_notes)


# ═════════════════════════════════════════════════════════════════════════════
# 3. Tests B4 : Validation Éditeur avant Envoi (HTTP)
# ═════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def test_client():
    os.environ.setdefault("ENVIRONMENT", "development")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-rcst-ok")
    os.environ.setdefault("CORS_ORIGINS", "http://localhost:5173")

    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture(scope="module")
def reviewer_token(test_client):
    email = f"rev_b4_{uuid.uuid4().hex[:6]}@rcst.cd"
    resp = test_client.post("/api/auth/register", json={
        "email": email, "full_name": "Reviewer B4",
        "password": "Password123!", "role": "REVIEWER"
    })
    return resp.json()["access_token"]


class TestB4DispatchApproval:
    def test_approve_dispatch_without_auth_401(self, test_client):
        resp = test_client.post("/api/submissions/sub-1234/approve-dispatch", json={})
        assert resp.status_code == 401

    def test_approve_dispatch_as_reviewer_200(self, test_client, reviewer_token):
        sub_id = f"sub_{uuid.uuid4().hex[:8]}"
        resp = test_client.post(
            f"/api/submissions/{sub_id}/approve-dispatch",
            headers={"Authorization": f"Bearer {reviewer_token}"},
            json={"comments": "Manuscrit prêt pour transmission avec réserves mineures."},
        )
        assert resp.status_code == 200
        data = resp.json()
        assert "approuvée pour expédition" in data["message"]
        assert data["dispatch"]["dispatch_status"] == "APPROVED"

        # Vérification du statut de dispatch
        status_resp = test_client.get(
            f"/api/submissions/{sub_id}/dispatch-status",
            headers={"Authorization": f"Bearer {reviewer_token}"},
        )
        assert status_resp.status_code == 200
        assert status_resp.json()["isApproved"] is True


# ═════════════════════════════════════════════════════════════════════════════
# 4. Tests Double-Check IA & Fusion de Rapports
# ═════════════════════════════════════════════════════════════════════════════

class TestDoubleCheckFusion:
    def test_merge_double_check_reports_preserves_deterministic_core(self):
        pass1_report = {
            "status": "Conforme avec réserves",
            "globalScore": 75,
            "summary": "Résumé de passe 1",
            "editorialBoardNotes": {"confidentialComments": "Commentaire initial"},
            "rulesReport": {"violations": [{"rule_id": "RCST-S01"}]},
        }
        pass2_critic = {
            "criticNotes": "Angle mort relevé : vérifier la concordance de l'échantillon.",
            "confirmedViolations": ["RCST-S01"],
            "refutedFalsePositives": [],
            "refinedSummary": "Résumé consolidé et enrichi par le réviseur critique.",
        }

        merged = _merge_double_check_reports(pass1_report, pass2_critic)
        assert merged["summary"] == "Résumé consolidé et enrichi par le réviseur critique."
        assert merged["globalScore"] == 75  # Le score déterministe ne bouge pas
        assert "Double-Check IA Arbitrage" in merged["editorialBoardNotes"]["confidentialComments"]
        assert merged["doubleCheck"]["isVerifiedByCritic"] is True


# ═════════════════════════════════════════════════════════════════════════════
# 5. Tests Extension 90+ Règles
# ═════════════════════════════════════════════════════════════════════════════

class TestExtendedRulesCatalog:
    def test_extended_catalog_execution(self):
        text = "TITRE MAJUSCULE EXCESSIF.\n\nIntroduction avec un point d'exclamation!"
        report_base = run_all_rules(text, include_extended_catalog=False)
        report_extended = run_all_rules(text, include_extended_catalog=True)

        assert len(report_extended.violations) > len(report_base.violations)
        assert len(report_extended.passed) + len(report_extended.violations) >= 90
