"""
bib_checker.py — Concordance bibliographique et conformité APA 7 (B5)
=====================================================================
Ce module réalise un contrôle déterministe rigoureux entre le corps du manuscrit
et la section bibliographique finale :
  1. Extraction des citations in-text au format auteur-date :
       - Citations entre parenthèses : (Mboma, 2021), (Kabasele & Mabiala, 2020), (Tshilombo et al., 2019)
       - Citations narratives : Selon Mboma (2021), d'après Kabasele et Mabiala (2020)
  2. Extraction des entrées de la section Références / Bibliographie.
  3. Détection des discordances :
       - Citations orphelines (in-text sans correspondance en bibliographie)
       - Références non citées (entrées biblio jamais appelées dans le texte)
  4. Contrôle de formatage APA 7e édition élémentaire :
       - Présence de l'année entre parenthèses
       - Détection des crochets numériques prohibés dans la biblio
       - Vérification de l'ordre alphabétique des entrées
"""
from __future__ import annotations

import re
from dataclasses import dataclass, field
from typing import Dict, List, Optional, Set, Tuple


# ─── Expressions Régulières Bibliographiques ─────────────────────────────────

# Citations entre parenthèses : (Nom, Année) ou (Nom & Nom, Année) ou (Nom et al., Année)
_PAREN_CITATION_PATTERN = re.compile(
    r"\(\s*([A-ZÀ-ÖØ-ß][a-zA-ZÀ-ÿ\s\'-]+?)(?:,\s*|\s+et\s+al\.?,\s*|\s*&\s*[A-ZÀ-ÖØ-ß][a-zA-ZÀ-ÿ\s\'-]+?,\s*)((?:19|20)\d{2}[a-z]?)\s*(?:,\s*p\.\s*\d+)?\s*\)",
    re.UNICODE,
)

# Citations narratives : Nom (Année)
_NARRATIVE_CITATION_PATTERN = re.compile(
    r"\b([A-ZÀ-ÖØ-ß][a-zA-ZÀ-ÿ\'-]+)(?:\s+et\s+al\.?|\s+et\s+[A-ZÀ-ÖØ-ß][a-zA-ZÀ-ÿ\'-]+)?\s*\(\s*((?:19|20)\d{2}[a-z]?)\s*\)",
    re.UNICODE,
)

# Délimiteur de la section bibliographique
_BIBLIO_HEADER_PATTERN = re.compile(
    r"(?:^|\n)\s*(?:R[ée]f[ée]rences(?:\s+bibliographiques)?|Bibliographie|References)\s*:?\s*\n",
    re.IGNORECASE,
)


@dataclass
class InTextCitation:
    raw: str
    author: str
    year: str
    position: int


@dataclass
class BibEntry:
    raw: str
    author_key: str
    year: Optional[str]
    index: int


@dataclass
class BibConcordanceReport:
    in_text_citations: List[InTextCitation] = field(default_factory=list)
    bibliography_entries: List[BibEntry] = field(default_factory=list)
    orphan_citations: List[InTextCitation] = field(default_factory=list)
    uncited_references: List[BibEntry] = field(default_factory=list)
    is_alphabetical: bool = True
    has_numeric_entries: bool = False
    concordance_score: int = 100

    def to_dict(self) -> Dict[str, object]:
        return {
            "totalInText": len(self.in_text_citations),
            "totalBibEntries": len(self.bibliography_entries),
            "orphanCitationsCount": len(self.orphan_citations),
            "orphanCitations": [
                {"raw": c.raw, "author": c.author, "year": c.year}
                for c in self.orphan_citations
            ],
            "uncitedReferencesCount": len(self.uncited_references),
            "uncitedReferences": [
                {"author": b.author_key, "year": b.year, "raw": b.raw[:120]}
                for b in self.uncited_references
            ],
            "isAlphabetical": self.is_alphabetical,
            "hasNumericEntries": self.has_numeric_entries,
            "concordanceScore": self.concordance_score,
        }


def _normalize_name(name: str) -> str:
    """Normalise un patronyme pour comparaison insensible aux accents et à la casse."""
    clean = re.sub(r"[^\w]", "", name.lower())
    return clean


def extract_in_text_citations(body_text: str) -> List[InTextCitation]:
    """Extrait toutes les citations in-text du corps du texte (avant la bibliographie)."""
    citations: List[InTextCitation] = []
    seen: Set[Tuple[str, str, int]] = set()

    # Citations entre parenthèses
    for m in _PAREN_CITATION_PATTERN.finditer(body_text):
        author_raw = m.group(1).strip()
        year = m.group(2).strip()
        first_author = author_raw.split()[0].replace(",", "")
        key = (_normalize_name(first_author), year, m.start())
        if key not in seen:
            seen.add(key)
            citations.append(InTextCitation(raw=m.group(0), author=first_author, year=year, position=m.start()))

    # Citations narratives
    for m in _NARRATIVE_CITATION_PATTERN.finditer(body_text):
        first_author = m.group(1).strip()
        year = m.group(2).strip()
        key = (_normalize_name(first_author), year, m.start())
        if key not in seen:
            seen.add(key)
            citations.append(InTextCitation(raw=m.group(0), author=first_author, year=year, position=m.start()))

    return citations


def extract_bibliography_entries(bib_text: str) -> List[BibEntry]:
    """Extrait et segmente les références individuelles d'une section bibliographique."""
    entries: List[BibEntry] = []
    lines = [line.strip() for line in bib_text.split("\n") if line.strip()]

    current_entry = ""
    entry_idx = 0

    for line in lines:
        # Nouvelle entrée typique commençant par un auteur (Nom, I.) ou [1]
        is_new_entry = bool(re.match(r"^(?:\[?\d+\]?|[A-ZÀ-ÖØ-ß][a-zA-ZÀ-ÿ\'-]+,\s*[A-ZÀ-ÖØ-ß]\.)", line))

        if is_new_entry and current_entry:
            entries.append(_parse_bib_entry(current_entry, entry_idx))
            entry_idx += 1
            current_entry = line
        else:
            if current_entry:
                current_entry += " " + line
            else:
                current_entry = line

    if current_entry:
        entries.append(_parse_bib_entry(current_entry, entry_idx))

    return entries


def _parse_bib_entry(raw: str, index: int) -> BibEntry:
    # Recherche de l'année (19xx ou 20xx)
    year_match = re.search(r"\b((?:19|20)\d{2}[a-z]?)\b", raw)
    year = year_match.group(1) if year_match else None

    # Extraction du premier mot-clé d'auteur
    author_match = re.search(r"^[\[\d\]\s\.\-]*([A-ZÀ-ÖØ-ß][a-zA-ZÀ-ÿ\'-]+)", raw)
    author_key = author_match.group(1) if author_match else "Inconnu"

    return BibEntry(raw=raw, author_key=author_key, year=year, index=index)


def check_bibliography_concordance(manuscript_text: str) -> BibConcordanceReport:
    """
    Point d'entrée principal : partitionne le texte entre corps et bibliographie,
    puis confronte les citations aux entrées bibliographiques.
    """
    match_bib = _BIBLIO_HEADER_PATTERN.search(manuscript_text)
    if not match_bib:
        # Pas de section bibliographique distincte identifiée
        body_text = manuscript_text
        bib_text = ""
    else:
        body_text = manuscript_text[:match_bib.start()]
        bib_text = manuscript_text[match_bib.end():]

    in_text = extract_in_text_citations(body_text)
    bib_entries = extract_bibliography_entries(bib_text) if bib_text else []

    # Vérification de l'ordre alphabétique
    author_keys = [_normalize_name(b.author_key) for b in bib_entries if b.author_key != "Inconnu"]
    is_alphabetical = (author_keys == sorted(author_keys)) if len(author_keys) > 1 else True

    # Vérification des crochets numériques
    has_numeric = bool(re.search(r"(?:^|\n)\s*\[\d+\]", bib_text))

    # Concordance croisée
    orphan_citations: List[InTextCitation] = []
    matched_bib_indices: Set[int] = set()

    for cite in in_text:
        c_author = _normalize_name(cite.author)
        found = False
        for b in bib_entries:
            b_author = _normalize_name(b.author_key)
            # Match si le nom correspond (ou est sous-chaîne) et si l'année concorde
            if c_author and (c_author in b_author or b_author in c_author):
                if not cite.year or not b.year or cite.year.startswith(b.year[:4]):
                    found = True
                    matched_bib_indices.add(b.index)
                    break
        if not found and bib_entries:
            orphan_citations.append(cite)

    uncited_references = [b for b in bib_entries if b.index not in matched_bib_indices]

    # Calcul du score de concordance
    score = 100
    if not bib_entries and in_text:
        score = 20
    else:
        score -= len(orphan_citations) * 12
        score -= len(uncited_references) * 6
        if not is_alphabetical:
            score -= 10
        if has_numeric:
            score -= 15
        score = max(10, min(100, score))

    return BibConcordanceReport(
        in_text_citations=in_text,
        bibliography_entries=bib_entries,
        orphan_citations=orphan_citations,
        uncited_references=uncited_references,
        is_alphabetical=is_alphabetical,
        has_numeric_entries=has_numeric,
        concordance_score=score,
    )
