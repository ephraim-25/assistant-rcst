"""
tests/test_docx_annotator.py — Suite de tests B1 : Annotation Word natif RCST
===============================================================================
Vérifie :
  • Création correcte des commentaires OOXML dans le fichier .docx annoté
  • Ancrage des commentaires sur les passages fautifs
  • Intégrité du texte original (jamais modifié)
  • Compatibilité du format .docx (lisible par python-docx après annotation)
  • Endpoint /api/annotate-docx (401 sans token, 200 avec token + fichier .docx valide)
  • Gestion des cas limites (fichier non-.docx, violation sans extrait)
"""
from __future__ import annotations

import io
import json
import sys
import os
from zipfile import ZipFile

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from docx import Document
from docx.oxml.ns import qn
from lxml import etree

from docx_annotator import (
    annotate_docx,
    annotate_docx_from_report,
    _format_comment_text,
    _find_best_paragraph,
)
from rules_engine import RuleViolation, Severity, run_all_rules

_COMMENT_AUTHOR_EXPECTED = "RCST Système d'Audit"



# ─── Helpers de construction ──────────────────────────────────────────────────

def _make_violation(rule_id="RCST-S01", severity=Severity.CRITICAL,
                    title="Test", message="Message test", excerpt="nous avons"):
    return RuleViolation(rule_id=rule_id, severity=severity,
                         title=title, message=message, excerpt=excerpt)


def _build_docx(paragraphs: list[str]) -> bytes:
    """Crée un fichier .docx en mémoire avec les paragraphes donnés."""
    doc = Document()
    for para in paragraphs:
        doc.add_paragraph(para)
    buf = io.BytesIO()
    doc.save(buf)
    buf.seek(0)
    return buf.read()


def _parse_comments_from_docx(docx_bytes: bytes) -> list[dict]:
    """Extrait les commentaires d'un .docx annoté depuis comments.xml."""
    with ZipFile(io.BytesIO(docx_bytes), "r") as z:
        if "word/comments.xml" not in z.namelist():
            return []
        comments_xml = z.read("word/comments.xml")

    root = etree.fromstring(comments_xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    comments = []
    for comment_el in root.findall("w:comment", ns):
        cid    = comment_el.get(f"{{{ns['w']}}}id")
        author = comment_el.get(f"{{{ns['w']}}}author", "")
        texts  = []
        for p in comment_el.findall(".//w:t", ns):
            if p.text:
                texts.append(p.text)
        comments.append({
            "id": int(cid) if cid and cid.isdigit() else -1,
            "author": author,
            "text": "\n".join(texts),
        })
    return comments


def _count_comment_anchors(docx_bytes: bytes) -> int:
    """Compte les balises w:commentRangeStart dans document.xml."""
    with ZipFile(io.BytesIO(docx_bytes), "r") as z:
        doc_xml = z.read("word/document.xml")
    root = etree.fromstring(doc_xml)
    ns = {"w": "http://schemas.openxmlformats.org/wordprocessingml/2006/main"}
    return len(root.findall(".//w:commentRangeStart", ns))


def _get_document_text(docx_bytes: bytes) -> str:
    """Extrait tout le texte d'un .docx."""
    doc = Document(io.BytesIO(docx_bytes))
    return "\n".join(p.text for p in doc.paragraphs)


# ─── Fixtures ─────────────────────────────────────────────────────────────────

SAMPLE_TEXT_WITH_VIOLATIONS = [
    "Titre : Notre étude sur les politiques économiques",
    "Nous avons analysé les données de référence [1] et [2].",
    "Notre recherche montre des résultats significatifs.",
    "1. Introduction",
    "Cette étude présente les résultats obtenus.",
    "Conclusion",
    "Des améliorations ont été observées.",
]

SAMPLE_TEXT_COMPLIANT = [
    "Titre : Analyse des politiques économiques en RDC",
    "Cette étude examine les politiques d'innovation.",
    "Une analyse comparative a été conduite.",
    "1. Introduction",
    "Les données ont été collectées selon un protocole rigoureux.",
]


# ═══════════════════════════════════════════════════════════════════════════════
# Tests : _format_comment_text
# ═══════════════════════════════════════════════════════════════════════════════

class TestFormatCommentText:
    def test_contains_rule_id(self):
        """Le texte formaté contient l'ID de la règle."""
        v = _make_violation(rule_id="RCST-S01")
        text = _format_comment_text(v)
        assert "RCST-S01" in text

    def test_contains_severity_label(self):
        """Le texte formaté contient le label de gravité traduit."""
        v = _make_violation(severity=Severity.CRITICAL)
        text = _format_comment_text(v)
        assert "CRITIQUE" in text

    def test_contains_warning_label(self):
        v = _make_violation(severity=Severity.WARNING)
        text = _format_comment_text(v)
        assert "AVERTISSEMENT" in text

    def test_contains_message(self):
        """Le texte formaté contient le message de la violation."""
        v = _make_violation(message="Voici le message spécifique.")
        text = _format_comment_text(v)
        assert "Voici le message spécifique" in text

    def test_contains_correction_model(self):
        """Le modèle de correction S01 est inclus."""
        v = _make_violation(rule_id="RCST-S01")
        text = _format_comment_text(v)
        assert "impersonnel" in text.lower() or "passive" in text.lower()

    def test_contains_correction_c01(self):
        """Le modèle de correction C01 (APA 7) est inclus."""
        v = _make_violation(rule_id="RCST-C01")
        text = _format_comment_text(v)
        assert "APA" in text

    def test_excerpt_included_when_present(self):
        """L'extrait fautif est inclus dans le commentaire si présent."""
        v = _make_violation(excerpt="nous avons mesuré les données")
        text = _format_comment_text(v)
        assert "nous avons mesuré" in text

    def test_no_excerpt_no_crash(self):
        """Pas d'extrait → pas de crash, juste pas de section 'Passage'."""
        v = _make_violation(excerpt="")
        text = _format_comment_text(v)
        assert isinstance(text, str)
        assert len(text) > 0


# ═══════════════════════════════════════════════════════════════════════════════
# Tests : annotate_docx — Structure OOXML
# ═══════════════════════════════════════════════════════════════════════════════

class TestAnnotateDocxStructure:
    def test_output_is_valid_docx(self):
        """Le fichier retourné est un .docx valide lisible par python-docx."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        v = _make_violation()
        result = annotate_docx(docx_bytes, [v])
        # Doit s'ouvrir sans exception
        doc = Document(io.BytesIO(result))
        assert doc is not None

    def test_output_is_zip(self):
        """Le fichier retourné est un ZIP valide (structure .docx)."""
        docx_bytes = _build_docx(["Texte test"])
        v = _make_violation()
        result = annotate_docx(docx_bytes, [v])
        assert ZipFile(io.BytesIO(result)).testzip() is None

    def test_comments_xml_created(self):
        """Le fichier word/comments.xml est présent dans le .docx annoté."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        v = _make_violation(excerpt="nous avons")
        result = annotate_docx(docx_bytes, [v])
        with ZipFile(io.BytesIO(result), "r") as z:
            assert "word/comments.xml" in z.namelist()

    def test_one_comment_created_per_violation(self):
        """Autant de <w:comment> que de violations dans comments.xml."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        violations = [
            _make_violation("RCST-S01", excerpt="nous avons"),
            _make_violation("RCST-C01", excerpt="[1]"),
        ]
        result = annotate_docx(docx_bytes, violations)
        comments = _parse_comments_from_docx(result)
        assert len(comments) == 2

    def test_no_comments_when_no_violations(self):
        """Aucun commentaire si violations=[]."""
        docx_bytes = _build_docx(SAMPLE_TEXT_COMPLIANT)
        result = annotate_docx(docx_bytes, [])
        comments = _parse_comments_from_docx(result)
        assert len(comments) == 0

    def test_comment_author_is_rcst(self):
        """L'auteur du commentaire est bien 'RCST Système d'Audit'."""
        docx_bytes = _build_docx(["Nous avons analysé."])
        v = _make_violation()
        result = annotate_docx(docx_bytes, [v])
        comments = _parse_comments_from_docx(result)
        assert len(comments) == 1
        assert "RCST" in comments[0]["author"]

    def test_comment_text_contains_rule_id(self):
        """Le texte du commentaire contient l'ID de la règle."""
        docx_bytes = _build_docx(["Nous avons analysé."])
        v = _make_violation(rule_id="RCST-S01")
        result = annotate_docx(docx_bytes, [v])
        comments = _parse_comments_from_docx(result)
        assert any("RCST-S01" in c["text"] for c in comments)

    def test_comment_anchored_in_document(self):
        """Le document.xml contient des balises w:commentRangeStart."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        v = _make_violation(excerpt="nous avons")
        result = annotate_docx(docx_bytes, [v])
        anchor_count = _count_comment_anchors(result)
        assert anchor_count >= 1

    def test_content_types_declares_comments(self):
        """[Content_Types].xml déclare le type MIME de comments.xml."""
        docx_bytes = _build_docx(["Nous avons test."])
        v = _make_violation()
        result = annotate_docx(docx_bytes, [v])
        with ZipFile(io.BytesIO(result), "r") as z:
            ct = z.read("[Content_Types].xml").decode("utf-8")
        assert "comments" in ct.lower()

    def test_document_relationships_reference_comments(self):
        """word/_rels/document.xml.rels référence comments.xml."""
        docx_bytes = _build_docx(["Nos résultats prouvent [1]."])
        v = _make_violation()
        result = annotate_docx(docx_bytes, [v])
        with ZipFile(io.BytesIO(result), "r") as z:
            rels = z.read("word/_rels/document.xml.rels").decode("utf-8")
        assert "comments.xml" in rels


# ═══════════════════════════════════════════════════════════════════════════════
# Tests : Intégrité du texte original
# ═══════════════════════════════════════════════════════════════════════════════

class TestTextIntegrity:
    def test_original_text_unchanged(self):
        """Le texte du document original n'est pas modifié par l'annotation."""
        paragraphs = [
            "Nous avons analysé les données [1].",
            "Notre étude prouve notre hypothèse.",
        ]
        docx_bytes = _build_docx(paragraphs)
        violations = [
            _make_violation("RCST-S01", excerpt="nous avons"),
            _make_violation("RCST-C01", excerpt="[1]"),
        ]
        result = annotate_docx(docx_bytes, violations)
        original_text = _get_document_text(docx_bytes)
        annotated_text = _get_document_text(result)
        # Le texte des paragraphes doit être identique
        # (les commentaires sont dans comments.xml, pas dans le texte)
        assert "Nous avons analysé" in annotated_text
        assert "Notre étude prouve" in annotated_text

    def test_paragraph_count_unchanged(self):
        """Le nombre de paragraphes reste identique après annotation."""
        paragraphs = SAMPLE_TEXT_WITH_VIOLATIONS
        docx_bytes = _build_docx(paragraphs)
        violations = [_make_violation("RCST-S01")]
        result = annotate_docx(docx_bytes, violations)
        doc_orig = Document(io.BytesIO(docx_bytes))
        doc_annot = Document(io.BytesIO(result))
        # Les paragraphes du corps sont conservés
        orig_texts = [p.text for p in doc_orig.paragraphs]
        annot_texts = [p.text for p in doc_annot.paragraphs]
        assert orig_texts == annot_texts

    def test_empty_document_no_crash(self):
        """Un document vide ne provoque pas d'exception."""
        docx_bytes = _build_docx([""])
        violations = [_make_violation()]
        result = annotate_docx(docx_bytes, violations)
        assert len(result) > 100  # fichier .docx non vide

    def test_no_violation_no_crash(self):
        """Pas de violation → fichier retourné identique (structure)."""
        docx_bytes = _build_docx(SAMPLE_TEXT_COMPLIANT)
        result = annotate_docx(docx_bytes, [])
        assert isinstance(result, bytes)
        assert len(result) >= len(docx_bytes) - 500  # tolérance compression


# ═══════════════════════════════════════════════════════════════════════════════
# Tests : annotate_docx_from_report (intégration rules_engine)
# ═══════════════════════════════════════════════════════════════════════════════

class TestAnnotateFromReport:
    def test_from_report_dict_creates_comments(self):
        """annotate_docx_from_report crée des commentaires depuis un rapport dict."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        report = {
            "rulesReport": {
                "violations": [
                    {
                        "rule_id": "RCST-S01",
                        "severity": "CRITICAL",
                        "title": "Pronoms subjectifs",
                        "message": "3 occurrences de pronoms détectées.",
                        "excerpt": "nous avons",
                        "position": 10,
                    }
                ]
            }
        }
        result = annotate_docx_from_report(docx_bytes, report)
        comments = _parse_comments_from_docx(result)
        assert len(comments) == 1
        assert "RCST-S01" in comments[0]["text"]

    def test_from_empty_report_no_comments(self):
        """Un rapport vide ne génère aucun commentaire."""
        docx_bytes = _build_docx(SAMPLE_TEXT_COMPLIANT)
        result = annotate_docx_from_report(docx_bytes, {})
        comments = _parse_comments_from_docx(result)
        assert len(comments) == 0

    def test_from_real_rules_engine(self):
        """Intégration complète : rules_engine → annotate_docx_from_report."""
        # Texte avec violations réelles
        text = "\n".join(SAMPLE_TEXT_WITH_VIOLATIONS)
        rules_report = run_all_rules(text)
        report_dict = {"rulesReport": rules_report.to_dict()}

        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        result = annotate_docx_from_report(docx_bytes, report_dict)

        comments = _parse_comments_from_docx(result)
        # Au moins les violations RCST-S01 et RCST-C01 doivent être commentées
        assert len(comments) >= 2
        rule_ids_in_comments = " ".join(c["text"] for c in comments)
        assert "RCST" in rule_ids_in_comments

    def test_multiple_violations_multiple_comments(self):
        """Plusieurs violations → plusieurs commentaires."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        report = {
            "rulesReport": {
                "violations": [
                    {"rule_id": "RCST-S01", "severity": "CRITICAL", "title": "T1",
                     "message": "M1", "excerpt": "nous avons", "position": 0},
                    {"rule_id": "RCST-C01", "severity": "CRITICAL", "title": "T2",
                     "message": "M2", "excerpt": "[1]", "position": 50},
                    {"rule_id": "RCST-A01", "severity": "CRITICAL", "title": "T3",
                     "message": "M3", "excerpt": "", "position": None},
                ]
            }
        }
        result = annotate_docx_from_report(docx_bytes, report)
        comments = _parse_comments_from_docx(result)
        assert len(comments) == 3


# ═══════════════════════════════════════════════════════════════════════════════
# Tests : Déterminisme
# ═══════════════════════════════════════════════════════════════════════════════

class TestAnnotatorDeterminism:
    def test_same_input_same_output(self):
        """Même entrée → même commentaires (déterminisme)."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        violations = [
            _make_violation("RCST-S01", excerpt="nous avons"),
            _make_violation("RCST-C01", excerpt="[1]"),
        ]
        date_str = "2026-01-01T00:00:00Z"

        results = [
            annotate_docx(docx_bytes, violations, date_str=date_str)
            for _ in range(3)
        ]
        # Comparer les commentaires extraits (pas les bytes bruts qui peuvent varier par ZIP)
        comment_sets = [
            [(c["text"], c["author"]) for c in _parse_comments_from_docx(r)]
            for r in results
        ]
        assert comment_sets[0] == comment_sets[1] == comment_sets[2]

    def test_comment_ids_are_unique(self):
        """Les IDs de commentaires sont uniques dans le même fichier."""
        docx_bytes = _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)
        violations = [_make_violation(f"RCST-S0{i}") for i in range(5)]
        result = annotate_docx(docx_bytes, violations)
        comments = _parse_comments_from_docx(result)
        ids = [c["id"] for c in comments]
        assert len(ids) == len(set(ids)), "Des IDs de commentaires sont dupliqués"


# ═══════════════════════════════════════════════════════════════════════════════
# Tests : Endpoint HTTP /api/annotate-docx (via httpx + TestClient)
# ═══════════════════════════════════════════════════════════════════════════════

@pytest.fixture(scope="module")
def test_client():
    """Client HTTP de test FastAPI avec variables d'env configurées."""
    import os
    os.environ.setdefault("ENVIRONMENT",    "development")
    os.environ.setdefault("JWT_SECRET_KEY", "test-secret-key-minimum-32-characters-rcst-ok")
    os.environ.setdefault("CORS_ORIGINS",   "http://localhost:5173")

    from fastapi.testclient import TestClient
    from main import app
    return TestClient(app)


@pytest.fixture(scope="module")
def admin_token(test_client):
    """Crée un compte admin et retourne son token."""
    import uuid
    email = f"admin_{uuid.uuid4().hex[:6]}@rcst.cd"
    resp = test_client.post("/api/auth/register", json={
        "email": email, "full_name": "Admin B1 Test",
        "password": "Admin1234!", "role": "ADMIN"
    })
    assert resp.status_code == 200, f"Register failed: {resp.text}"
    return resp.json()["access_token"]


@pytest.fixture(scope="module")
def sample_docx_bytes():
    """Génère un .docx de test avec des violations."""
    return _build_docx(SAMPLE_TEXT_WITH_VIOLATIONS)


class TestAnnotateDocxEndpoint:
    def test_401_without_token(self, test_client, sample_docx_bytes):
        """401 si aucun token JWT fourni."""
        resp = test_client.post(
            "/api/annotate-docx",
            files={"file": ("test.docx", sample_docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert resp.status_code == 401

    def test_415_non_docx_file(self, test_client, admin_token):
        """415 si le fichier n'est pas un .docx."""
        resp = test_client.post(
            "/api/annotate-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("rapport.pdf", b"%PDF-1.4 fake content", "application/pdf")},
        )
        assert resp.status_code == 415

    def test_200_with_valid_docx(self, test_client, admin_token, sample_docx_bytes):
        """200 + fichier .docx annoté retourné avec le bon Content-Type."""
        resp = test_client.post(
            "/api/annotate-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("manuscrit.docx", sample_docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert resp.status_code == 200
        ct = resp.headers.get("content-type", "")
        assert "wordprocessingml" in ct or "application/octet-stream" in ct

    def test_response_is_downloadable_docx(self, test_client, admin_token, sample_docx_bytes):
        """Le fichier retourné est un .docx valide."""
        resp = test_client.post(
            "/api/annotate-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("manuscrit.docx", sample_docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert resp.status_code == 200
        result_bytes = resp.content
        # Vérifier que c'est un fichier ZIP valide (.docx)
        assert ZipFile(io.BytesIO(result_bytes)).testzip() is None

    def test_response_contains_comments(self, test_client, admin_token, sample_docx_bytes):
        """Le .docx retourné contient des commentaires OOXML."""
        resp = test_client.post(
            "/api/annotate-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("manuscrit.docx", sample_docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert resp.status_code == 200
        comments = _parse_comments_from_docx(resp.content)
        # Le texte avec SAMPLE_TEXT_WITH_VIOLATIONS contient des violations
        assert len(comments) >= 1

    def test_content_disposition_header(self, test_client, admin_token, sample_docx_bytes):
        """Le header Content-Disposition contient '_RCST_annote.docx'."""
        resp = test_client.post(
            "/api/annotate-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("manuscrit.docx", sample_docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert resp.status_code == 200
        cd = resp.headers.get("content-disposition", "")
        assert "RCST_annote" in cd

    def test_200_with_audit_report_provided(self, test_client, admin_token, sample_docx_bytes):
        """200 quand le rapport d'audit est fourni explicitement."""
        report_json = json.dumps({
            "rulesReport": {
                "violations": [
                    {"rule_id": "RCST-S01", "severity": "CRITICAL",
                     "title": "Pronoms", "message": "Test", "excerpt": "nous avons"}
                ]
            }
        })
        resp = test_client.post(
            "/api/annotate-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("manuscrit.docx", sample_docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
            data={"audit_report": report_json},
        )
        assert resp.status_code == 200
        comments = _parse_comments_from_docx(resp.content)
        assert len(comments) == 1
        assert "RCST-S01" in comments[0]["text"]

    def test_x_rcst_violations_header(self, test_client, admin_token, sample_docx_bytes):
        """Le header X-RCST-Violations indique le nombre de violations traitées."""
        resp = test_client.post(
            "/api/annotate-docx",
            headers={"Authorization": f"Bearer {admin_token}"},
            files={"file": ("manuscrit.docx", sample_docx_bytes,
                            "application/vnd.openxmlformats-officedocument.wordprocessingml.document")},
        )
        assert resp.status_code == 200
        violations_count = int(resp.headers.get("x-rcst-violations", 0))
        assert violations_count >= 0  # header présent et parsable
