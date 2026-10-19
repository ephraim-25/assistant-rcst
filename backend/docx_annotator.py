"""
docx_annotator.py — Service d'annotation Word natif RCST (B1)
=============================================================
Insère des commentaires Word natifs (révisions OOXML) dans un fichier .docx
soumis par l'auteur, ancrés exactement sur les passages fautifs détectés par
le moteur de règles RCST.

Contraintes :
  • Le texte original n'est JAMAIS modifié.
  • Chaque commentaire contient : [ID règle] | Gravité | Explication | Modèle de correction.
  • Les commentaires sont conformes OOXML (Word 2007+, LibreOffice, Google Docs).
  • Garantie de déterminisme : mêmes violations → même fichier annoté.

Architecture OOXML des commentaires Word :
  - <w:comment w:id="N" w:author="..." w:date="...">
      <w:p><w:r><w:t>Texte du commentaire</w:t></w:r></w:p>
    </w:comment>
  - Ancrage dans le corps :
      <w:bookmarkStart w:id="N" w:name="commentN"/>
      <w:commentRangeStart w:id="N"/>
      …runs fautifs…
      <w:commentRangeEnd w:id="N"/>
      <w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>
           <w:commentReference w:id="N"/></w:r>
      <w:bookmarkEnd w:id="N"/>
"""
from __future__ import annotations

import copy
import io
import re
from datetime import datetime, timezone
from typing import List, Optional, Tuple
from zipfile import ZipFile

from docx import Document
from docx.oxml import OxmlElement
from docx.oxml.ns import qn
from lxml import etree

try:
    from .rules_engine import RuleViolation, Severity
except (ImportError, ValueError):
    from rules_engine import RuleViolation, Severity


# ─── Namespace OOXML ──────────────────────────────────────────────────────────

_W  = "http://schemas.openxmlformats.org/wordprocessingml/2006/main"
_W14 = "http://schemas.microsoft.com/office/word/2010/wordml"

COMMENT_AUTHOR = "RCST Système d'Audit"
COMMENT_INITIALS = "RCST"


# ─── Helpers XML ──────────────────────────────────────────────────────────────

def _w(tag: str) -> str:
    """Retourne le tag qualifié dans le namespace w:."""
    return f"{{{_W}}}{tag}"


def _new_element(tag: str, **attrs: str) -> etree._Element:
    """Crée un élément XML dans le namespace w: avec attributs optionnels."""
    el = OxmlElement(f"w:{tag}")
    for k, v in attrs.items():
        el.set(_w(k), v)
    return el


def _make_comment_element(
    comment_id: int,
    text: str,
    author: str = COMMENT_AUTHOR,
    initials: str = COMMENT_INITIALS,
    date_str: str = "",
) -> etree._Element:
    """
    Construit un élément <w:comment> OOXML complet.
    Le texte est découpé en lignes pour une meilleure lisibilité dans Word.
    """
    if not date_str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    comment = OxmlElement("w:comment")
    comment.set(_w("id"), str(comment_id))
    comment.set(_w("author"), author)
    comment.set(_w("initials"), initials)
    comment.set(_w("date"), date_str)

    # Chaque ligne devient un <w:p>
    lines = text.strip().split("\n")
    for i, line in enumerate(lines):
        p = OxmlElement("w:p")
        # Style du paragraphe commentaire
        pPr = OxmlElement("w:pPr")
        pStyle = OxmlElement("w:pStyle")
        pStyle.set(_w("val"), "CommentText")
        pPr.append(pStyle)
        p.append(pPr)

        r = OxmlElement("w:r")
        # Marque de référence uniquement sur le premier paragraphe
        if i == 0:
            rPr = OxmlElement("w:rPr")
            rStyle = OxmlElement("w:rStyle")
            rStyle.set(_w("val"), "CommentReference")
            rPr.append(rStyle)
            r.append(rPr)
            ref = OxmlElement("w:annotationRef")
            r.append(ref)
            p.append(r)
            r = OxmlElement("w:r")  # run séparé pour le texte

        t = OxmlElement("w:t")
        t.text = line
        if line.startswith(" ") or line.endswith(" "):
            t.set("{http://www.w3.org/XML/1998/namespace}space", "preserve")
        r.append(t)
        p.append(r)
        comment.append(p)

    return comment


def _format_comment_text(v: RuleViolation) -> str:
    """Formate le texte du commentaire Word depuis une RuleViolation."""
    sev_label = {
        Severity.CRITICAL: "🔴 CRITIQUE",
        Severity.WARNING:  "🟡 AVERTISSEMENT",
        Severity.INFO:     "🔵 INFO",
    }.get(v.severity, v.severity.value)

    lines = [
        f"[{v.rule_id}] {sev_label}",
        f"Règle : {v.title}",
        "─" * 40,
        v.message,
    ]
    if v.excerpt:
        lines.append(f"Passage : « {v.excerpt[:120]}… »" if len(v.excerpt) > 120 else f"Passage : « {v.excerpt} »")

    # Modèles de correction selon la règle
    corrections = {
        "RCST-S01": "✏️  Remplacer par une tournure impersonnelle ou passive.\n    Ex: « nous avons analysé » → « une analyse a été conduite »",
        "RCST-C01": "✏️  Reformater en APA 7 : (Auteur, Année)\n    Ex: [1] → (Mboma, 2022)",
        "RCST-A01": "✏️  Ajouter l'ORCID complet : 0000-0000-0000-000X\n    Obtenir sur https://orcid.org/register",
        "RCST-R01": "✏️  Rédiger un Résumé (FR) + Abstract (EN) + 5 mots-clés dans chaque langue.",
        "RCST-R02-FR": "✏️  Réduire le Résumé français à 250 mots maximum.",
        "RCST-R02-EN": "✏️  Réduire l'Abstract anglais à 250 mots maximum.",
        "RCST-F01": "✏️  Ajouter toutes les sections obligatoires de fin d'article manquantes.",
        "RCST-N01": "✏️  Renuméroter les sections en chiffres arabes : 1., 2., 3.…",
        "RCST-A02": "✏️  Identifier l'auteur correspondant (*) avec e-mail, téléphone et ORCID.",
        "RCST-T01a": "✏️  Renuméroter les tableaux en chiffres romains (Tableau I, II…) placés AVANT.",
        "RCST-T01b": "✏️  Renuméroter les figures en chiffres arabes (Figure 1, 2…) placées APRÈS.",
    }
    corr = corrections.get(v.rule_id, "✏️  Corriger selon la Constitution RCST en vigueur.")
    lines.append(corr)
    lines.append("━" * 40)
    lines.append("Constitution RCST | Conseil Scientifique National RDC")

    return "\n".join(lines)


# ─── Recherche de texte dans les paragraphes ──────────────────────────────────

def _paragraph_full_text(para) -> str:
    """Concatène le texte de tous les runs d'un paragraphe."""
    return "".join(r.text or "" for r in para.runs)


def _find_paragraphs_containing(doc: Document, excerpt: str, max_results: int = 3) -> List[int]:
    """
    Retourne les indices des paragraphes contenant `excerpt` (insensible à la casse).
    Cherche aussi les 40 premiers caractères de l'extrait pour des correspondances partielles.
    """
    if not excerpt:
        return []

    # Nettoyer l'extrait des marqueurs «…»
    clean = excerpt.strip().strip("…").strip("«»").strip()
    if not clean:
        return []

    # Plusieurs stratégies de correspondance (ordre de précision décroissant)
    patterns = [clean]
    # Sous-extrait court plus tolérant
    if len(clean) > 30:
        patterns.append(clean[:30])
    # Mots-clés extraits (2+ mots consécutifs)
    words = clean.split()
    if len(words) >= 2:
        patterns.append(" ".join(words[:3]))

    results = []
    for idx, para in enumerate(doc.paragraphs):
        text = _paragraph_full_text(para).lower()
        for pattern in patterns:
            if pattern.lower() in text:
                results.append(idx)
                break
        if len(results) >= max_results:
            break
    return results


def _find_best_paragraph(doc: Document, violation: RuleViolation) -> Optional[int]:
    """
    Choisit le meilleur paragraphe à annoter pour une violation.
    Priorité : extrait → excerpt court → premiers paragraphes de contenu.
    """
    # 1. Chercher par extrait littéral
    if violation.excerpt:
        idxs = _find_paragraphs_containing(doc, violation.excerpt)
        if idxs:
            return idxs[0]

    # 2. Chercher par mots-clés du message (pronoms, crochets…)
    keyword_map = {
        "RCST-S01": ["nous", "notre", "nos", "je "],
        "RCST-C01": ["[1]", "[2]", "[3]"],
        "RCST-N01": ["I.", "II.", "III.", "I -"],
        "RCST-T01a": ["tableau 1", "tableau 2"],
        "RCST-T01b": ["figure i", "figure ii"],
    }
    keywords = keyword_map.get(violation.rule_id, [])
    for kw in keywords:
        idxs = _find_paragraphs_containing(doc, kw)
        if idxs:
            return idxs[0]

    # 3. Pas d'ancrage précis → commenter le premier paragraphe non vide
    for idx, para in enumerate(doc.paragraphs):
        if _paragraph_full_text(para).strip():
            return idx

    return None


# ─── Insertion des commentaires OOXML ─────────────────────────────────────────

def _get_or_create_comments_part(doc: Document) -> Tuple[etree._Element, etree._Element]:
    """
    Retourne (comments_root, word_body_root).
    Si la partie comments.xml n'existe pas encore, elle est créée.
    """
    # Accéder à l'élément body principal
    body = doc.element.body

    # Chercher la partie comments dans le package
    part = doc.part
    try:
        comments_part = part.comments_part
        comments_root = comments_part._element
    except AttributeError:
        # python-docx < 1.x ou absence de propriété
        comments_part = None
        comments_root = None

    if comments_root is None:
        # Créer un document comments.xml minimal
        comments_xml = (
            '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>'
            '<w:comments xmlns:wpc="http://schemas.microsoft.com/office/word/2010/wordprocessingCanvas" '
            'xmlns:cx="http://schemas.microsoft.com/office/drawing/2014/chartex" '
            'xmlns:mc="http://schemas.openxmlformats.org/markup-compatibility/2006" '
            'xmlns:o="urn:schemas-microsoft-com:office:office" '
            'xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships" '
            'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" '
            'xmlns:v="urn:schemas-microsoft-com:vml" '
            'xmlns:wp14="http://schemas.microsoft.com/office/word/2010/wordprocessingDrawing" '
            'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" '
            'xmlns:w10="urn:schemas-microsoft-com:office:word" '
            f'xmlns:w="{_W}" '
            'xmlns:w14="http://schemas.microsoft.com/office/word/2010/wordml" '
            'xmlns:w15="http://schemas.microsoft.com/office/word/2012/wordml" '
            'xmlns:w16se="http://schemas.microsoft.com/office/word/2015/wordml/symex" '
            'xmlns:wpg="http://schemas.microsoft.com/office/word/2010/wordprocessingGroup" '
            'xmlns:wpi="http://schemas.microsoft.com/office/word/2010/wordprocessingInk" '
            'xmlns:wne="http://schemas.microsoft.com/office/word/2006/wordml" '
            'xmlns:wps="http://schemas.microsoft.com/office/word/2010/wordprocessingShape" '
            'mc:Ignorable="w14 w15 w16se wp14"></w:comments>'
        )
        comments_root = etree.fromstring(comments_xml.encode("utf-8"))

    return comments_root, body


def _anchor_comment_in_paragraph(
    para_element: etree._Element,
    comment_id: int,
) -> None:
    """
    Entoure tous les runs d'un paragraphe avec les balises d'ancrage de commentaire :
      <w:commentRangeStart w:id="N"/>
      ... runs existants ...
      <w:commentRangeEnd w:id="N"/>
      <w:r><w:rPr><w:rStyle w:val="CommentReference"/></w:rPr>
           <w:commentReference w:id="N"/></w:r>
    """
    cid = str(comment_id)

    # Insérer commentRangeStart avant le premier run
    range_start = OxmlElement("w:commentRangeStart")
    range_start.set(_w("id"), cid)

    # Trouver le premier run (w:r) ou insérer en tête
    runs = para_element.findall(_w("r"))
    if runs:
        runs[0].addprevious(range_start)
    else:
        # Paragraphe sans runs → insérer après les pPr
        pPr = para_element.find(_w("pPr"))
        if pPr is not None:
            pPr.addnext(range_start)
        else:
            para_element.insert(0, range_start)

    # Insérer commentRangeEnd + référence après le dernier run
    range_end = OxmlElement("w:commentRangeEnd")
    range_end.set(_w("id"), cid)

    ref_run = OxmlElement("w:r")
    ref_rpr = OxmlElement("w:rPr")
    ref_style = OxmlElement("w:rStyle")
    ref_style.set(_w("val"), "CommentReference")
    ref_rpr.append(ref_style)
    ref_run.append(ref_rpr)
    comment_ref = OxmlElement("w:commentReference")
    comment_ref.set(_w("id"), cid)
    ref_run.append(comment_ref)

    # Insérer après le dernier run (ou à la fin du paragraphe)
    all_runs = para_element.findall(_w("r"))
    if all_runs:
        last_run = all_runs[-1]
        last_run.addnext(ref_run)
        last_run.addnext(range_end)  # range_end avant ref_run
    else:
        para_element.append(range_end)
        para_element.append(ref_run)


# ─── Sérialisation OOXML via ZIP ──────────────────────────────────────────────

def _save_with_comments(doc: Document, comments_root: etree._Element) -> bytes:
    """
    Sauvegarde le document en injectant comments.xml dans l'archive ZIP .docx.
    Retourne les bytes du fichier .docx annoté.
    """
    # 1. Sauvegarder le document de base en mémoire
    base_buffer = io.BytesIO()
    doc.save(base_buffer)
    base_buffer.seek(0)

    comments_xml_bytes = etree.tostring(
        comments_root, xml_declaration=True, encoding="UTF-8", standalone=True
    )

    # 2. Reconstruire l'archive ZIP en ajoutant / remplaçant comments.xml
    output_buffer = io.BytesIO()
    with ZipFile(base_buffer, "r") as zin, ZipFile(output_buffer, "w") as zout:
        # Conserver les métadonnées de compression
        for item in zin.infolist():
            data = zin.read(item.filename)

            if item.filename == "word/document.xml":
                # Déjà modifié via lxml en mémoire — réécrire
                zout.writestr(item, data)
            elif item.filename == "word/comments.xml":
                # Remplacer par notre version
                zout.writestr(item, comments_xml_bytes)
            elif item.filename == "[Content_Types].xml":
                # S'assurer que le content type comments est déclaré
                content_types_str = data.decode("utf-8")
                if "comments.xml" not in content_types_str:
                    override = (
                        '<Override PartName="/word/comments.xml" '
                        'ContentType="application/vnd.openxmlformats-officedocument'
                        '.wordprocessingml.comments+xml"/>'
                    )
                    content_types_str = content_types_str.replace(
                        "</Types>", f"{override}</Types>"
                    )
                zout.writestr(item, content_types_str.encode("utf-8"))
            elif item.filename == "word/_rels/document.xml.rels":
                # S'assurer que la relation comments existe
                rels_str = data.decode("utf-8")
                if "comments.xml" not in rels_str:
                    rel = (
                        '<Relationship Id="rIdComments" '
                        'Type="http://schemas.openxmlformats.org/officeDocument/'
                        '2006/relationships/comments" '
                        'Target="comments.xml"/>'
                    )
                    rels_str = rels_str.replace("</Relationships>", f"{rel}</Relationships>")
                zout.writestr(item, rels_str.encode("utf-8"))
            else:
                zout.writestr(item, data)

        # Si comments.xml n'existait pas, l'ajouter
        existing = {item.filename for item in zin.infolist()}
        if "word/comments.xml" not in existing:
            zout.writestr("word/comments.xml", comments_xml_bytes)

    output_buffer.seek(0)
    return output_buffer.read()


# ═══════════════════════════════════════════════════════════════════════════════
# POINT D'ENTRÉE PUBLIC
# ═══════════════════════════════════════════════════════════════════════════════

def annotate_docx(
    docx_bytes: bytes,
    violations: List[RuleViolation],
    date_str: str = "",
) -> bytes:
    """
    Injecte des commentaires Word natifs dans un fichier .docx à partir
    d'une liste de violations RCST.

    Args:
        docx_bytes : Contenu brut du fichier .docx source (texte inchangé).
        violations : Liste de RuleViolation issues de run_all_rules().
        date_str   : Date ISO 8601 pour les commentaires (vide = maintenant).

    Returns:
        bytes du fichier .docx annoté (prêt pour StreamingResponse/FileResponse).

    Garanties :
        • Le texte original n'est jamais modifié.
        • Idempotent : mêmes violations → même résultat.
        • Conforme Word 2007+ / LibreOffice / Google Docs.
    """
    if not date_str:
        date_str = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")

    doc = Document(io.BytesIO(docx_bytes))
    comments_root, body = _get_or_create_comments_part(doc)

    # Index des IDs déjà utilisés pour éviter les doublons
    existing_ids = {
        int(el.get(_w("id"), -1))
        for el in comments_root.findall(_w("comment"))
        if el.get(_w("id"), "").isdigit()
    }
    next_id = max(existing_ids, default=-1) + 1

    anchored_paragraphs: set[int] = set()  # éviter 2 commentaires sur même para

    for violation in violations:
        comment_id = next_id
        next_id += 1

        # 1. Construire le texte du commentaire
        comment_text = _format_comment_text(violation)

        # 2. Créer l'élément <w:comment>
        comment_el = _make_comment_element(
            comment_id=comment_id,
            text=comment_text,
            date_str=date_str,
        )
        comments_root.append(comment_el)

        # 3. Trouver le paragraphe cible
        para_idx = _find_best_paragraph(doc, violation)
        if para_idx is None:
            continue  # pas d'ancrage possible → commentaire dans la liste seulement

        # 4. Ancrer le commentaire (une seule fois par paragraphe)
        if para_idx not in anchored_paragraphs:
            anchored_paragraphs.add(para_idx)
            _anchor_comment_in_paragraph(doc.paragraphs[para_idx]._element, comment_id)

    # 5. Sauvegarder avec injection ZIP
    return _save_with_comments(doc, comments_root)


def annotate_docx_from_report(
    docx_bytes: bytes,
    audit_report: dict,
) -> bytes:
    """
    Surcharge pratique : accepte directement le dict retourné par
    `audit_manuscript_with_ai()` ou `run_all_rules().to_dict()`.
    Reconstruit les RuleViolation depuis le rapport et délègue à `annotate_docx`.
    """
    raw_violations = audit_report.get("rulesReport", {}).get("violations", [])
    violations = [
        RuleViolation(
            rule_id=v.get("rule_id", "RCST-XXX"),
            severity=Severity(v.get("severity", "WARNING")),
            title=v.get("title", ""),
            message=v.get("message", ""),
            excerpt=v.get("excerpt", ""),
            position=v.get("position"),
        )
        for v in raw_violations
    ]
    return annotate_docx(docx_bytes, violations)
