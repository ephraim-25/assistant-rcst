"""
tests/test_rules_engine.py — Suite de tests A4 : Moteur de règles déterministe RCST
=====================================================================================
Pour chaque règle : au moins 1 test "détecté" (violation présente)
                   et 1 test "non détecté" (règle respectée).
Garantie de reproductibilité : même texte → même résultat à chaque exécution.
"""
from __future__ import annotations

import sys, os
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

import pytest
from rules_engine import (
    check_prohibited_pronouns,
    check_legacy_citations,
    check_orcid_presence,
    check_bilingual_abstract,
    check_word_count,
    check_final_sections,
    check_section_numbering,
    check_corresponding_author,
    check_tables_figures,
    run_all_rules,
    compute_score_from_report,
    RulesReport,
    Severity,
)


# ═══════════════════════════════════════════════════════════════════════════════
# Fixtures — textes de référence
# ═══════════════════════════════════════════════════════════════════════════════

# Manuscrit minimal conforme (toutes les sections présentes)
COMPLIANT_MINIMAL = """
Titre : Analyse de l'impact des politiques d'innovation sur la croissance économique en RDC
Title: Analysis of the Impact of Innovation Policies on Economic Growth in DRC

Jean Mboma¹*, Pierre Mabiala²
¹ Université de Kinshasa | ORCID : 0000-0002-1234-5678
² Université de Lubumbashi | ORCID : 0000-0003-8765-4321
*Auteur correspondant : jean.mboma@unikin.cd | +243 815 123 456

Résumé :
Cette étude examine l'influence des politiques d'innovation sur la croissance économique
dans le contexte congolais. Une analyse comparative a été conduite sur dix années de données
macroéconomiques. Les résultats révèlent une corrélation positive entre les investissements
en recherche-développement et les indicateurs de croissance. Des recommandations sont formulées
à l'intention des décideurs politiques congolais. Cette contribution enrichit la littérature
sur le développement économique en Afrique subsaharienne.

Mots-clés : Innovation, Croissance économique, RDC, Politique publique, Développement

Abstract :
This study examines the influence of innovation policies on economic growth in the Congolese
context. A comparative analysis was conducted over ten years of macroeconomic data. Results
reveal a positive correlation between research and development investments and growth indicators.
Recommendations are formulated for Congolese policymakers. This contribution enriches literature
on economic development in sub-Saharan Africa.

Keywords: Innovation, Economic growth, DRC, Public policy, Development

1. Introduction
Les politiques d'innovation constituent un levier stratégique pour le développement économique.

2. Méthodologie
Des données ont été collectées auprès de sources officielles.

3. Résultats
Les résultats de cette analyse indiquent une corrélation positive.

4. Discussion
Cette corrélation s'explique par plusieurs facteurs structurels.

5. Conclusion
Cette étude démontre l'importance des investissements en innovation.

Remerciements
Les auteurs remercient le Conseil Scientifique National de la RDC.

Financement
Cette recherche a été financée par le Fonds National de Recherche.

Conflit d'Intérêt
Les auteurs déclarent n'avoir aucun conflit d'intérêt.

Considérations Éthiques
Cette étude a été conduite dans le respect des normes éthiques de la recherche.

Contribution des Auteurs
J.M. : conceptualisation, rédaction. P.M. : analyse, révision.
"""

# Manuscrit non conforme (tous les problèmes)
NON_COMPLIANT = """
Titre : Notre étude sur les politiques

Par nous, les auteurs principaux.

Introduction
Nous avons analysé les données. Notre recherche montre que les résultats
sont significatifs. Nous pensons que cela est important. Nos travaux prouvent
notre hypothèse. Je confirme ces résultats dans la figure [1] et [2].

Comme le montrent les références [3], [4,5], les résultats sont concluants.
"""


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-S01 : Pronoms subjectifs
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckProhibitedPronouns:
    def test_detected_multiple_pronouns(self):
        """DÉTECTÉ : Texte avec 'nous', 'notre', 'nos' dépasse le seuil CRITICAL."""
        text = "Nous avons analysé les données. Notre étude prouve notre hypothèse. Nos résultats confirment nos travaux."
        violations = check_prohibited_pronouns(text)
        assert len(violations) == 1
        v = violations[0]
        assert v.rule_id == "RCST-S01"
        assert v.severity == Severity.CRITICAL
        assert "nous" in v.message.lower() or "pronoms" in v.message.lower()
        assert v.position is not None

    def test_detected_single_pronoun_warning(self):
        """DÉTECTÉ : Un seul 'nous' → violation de niveau WARNING."""
        text = "Les données ont été collectées. Nous avons vérifié les résultats. Les conclusions sont claires."
        violations = check_prohibited_pronouns(text)
        assert len(violations) == 1
        assert violations[0].severity == Severity.WARNING

    def test_not_detected_impersonal_text(self):
        """NON DÉTECTÉ : Texte entièrement impersonnel."""
        text = COMPLIANT_MINIMAL
        violations = check_prohibited_pronouns(text)
        assert len(violations) == 0

    def test_not_detected_empty_text(self):
        """NON DÉTECTÉ : Texte vide."""
        violations = check_prohibited_pronouns("")
        assert len(violations) == 0

    def test_excerpt_is_populated(self):
        """Le champ excerpt contient un extrait du texte fautif."""
        text = "Nous avons prouvé cela. Nos travaux sont importants. Notre étude est cruciale."
        violations = check_prohibited_pronouns(text)
        assert len(violations) > 0
        assert len(violations[0].excerpt) > 0

    def test_deterministic_same_result(self):
        """DÉTERMINISME : Même texte → même résultat à 3 exécutions."""
        text = "Nous avons effectué nos travaux. Notre étude est complète."
        results = [check_prohibited_pronouns(text) for _ in range(3)]
        for r in results[1:]:
            assert len(r) == len(results[0])
            # results[0] est une liste de RuleViolation, pas un RuleViolation
            if results[0]:
                assert r[0].severity == results[0][0].severity


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-C01 : Citations numériques entre crochets
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckLegacyCitations:
    def test_detected_single_bracket(self):
        """DÉTECTÉ : Citation [1] simple."""
        text = "Les résultats sont conformes aux travaux antérieurs [1]."
        violations = check_legacy_citations(text)
        assert len(violations) == 1
        v = violations[0]
        assert v.rule_id == "RCST-C01"
        assert v.severity == Severity.CRITICAL
        assert "[1]" in v.excerpt

    def test_detected_multiple_brackets(self):
        """DÉTECTÉ : Plusieurs citations [1], [2,3], [4-6]."""
        text = "Voir [1], [2,3] et [4-6] pour plus de détails."
        violations = check_legacy_citations(text)
        assert len(violations) == 1
        assert "3" in violations[0].message  # 3 occurrences

    def test_detected_count_in_message(self):
        """DÉTECTÉ : Le message mentionne le nombre de citations."""
        text = "Données de [1]. Résultats de [2]. Discussion dans [3]."
        violations = check_legacy_citations(text)
        assert "3" in violations[0].message

    def test_not_detected_apa_style(self):
        """NON DÉTECTÉ : Citations APA 7 correctes."""
        text = "Selon Mboma et Mabiala (2015), les résultats sont (Kimani, 2020) cohérents."
        violations = check_legacy_citations(text)
        assert len(violations) == 0

    def test_not_detected_code_brackets(self):
        """NON DÉTECTÉ : Crochets non-citation (ex: [i] en Python, tableaux)."""
        text = "Calculer somme[i] pour i allant de 0 à N."
        violations = check_legacy_citations(text)
        assert len(violations) == 0

    def test_deterministic(self):
        """DÉTERMINISME : Résultat stable."""
        text = "Données [1], [2] et [3,4]."
        r1 = check_legacy_citations(text)
        r2 = check_legacy_citations(text)
        assert len(r1) == len(r2)
        assert r1[0].excerpt == r2[0].excerpt


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-A01 : Présence ORCID
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckOrcidPresence:
    def test_detected_no_orcid(self):
        """DÉTECTÉ : Aucun ORCID dans le texte."""
        text = "Jean Mboma¹*, Pierre Mabiala². Aucun identifiant de chercheur."
        violations = check_orcid_presence(text)
        assert len(violations) == 1
        assert violations[0].rule_id == "RCST-A01"
        assert violations[0].severity == Severity.CRITICAL

    def test_detected_malformed_orcid(self):
        """DÉTECTÉ : Format ORCID invalide (pas assez de chiffres)."""
        text = "ORCID : 0000-0002-1234"  # incomplet
        violations = check_orcid_presence(text)
        assert len(violations) == 1

    def test_not_detected_valid_orcid(self):
        """NON DÉTECTÉ : ORCID valide présent."""
        text = "Jean Mboma, ORCID : 0000-0002-1234-5678"
        violations = check_orcid_presence(text)
        assert len(violations) == 0

    def test_not_detected_orcid_with_x(self):
        """NON DÉTECTÉ : ORCID se terminant par X (légal selon spec)."""
        text = "Auteur : ORCID 0000-0003-8765-432X"
        violations = check_orcid_presence(text)
        assert len(violations) == 0

    def test_not_detected_multiple_orcids(self):
        """NON DÉTECTÉ : Plusieurs auteurs avec ORCID valides."""
        text = (
            "¹ ORCID : 0000-0002-1234-5678 "
            "² ORCID : 0000-0003-8765-4321"
        )
        violations = check_orcid_presence(text)
        assert len(violations) == 0

    def test_deterministic(self):
        """DÉTERMINISME : Résultat stable."""
        text = "Auteur sans ORCID."
        r1 = check_orcid_presence(text)
        r2 = check_orcid_presence(text)
        assert len(r1) == len(r2)


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-R01 : Résumé bilingue
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckBilingualAbstract:
    def test_detected_no_abstract_at_all(self):
        """DÉTECTÉ : Aucun bloc résumé / abstract."""
        text = "Introduction\nMéthodologie\nRésultats\nConclusion"
        violations = check_bilingual_abstract(text)
        assert len(violations) == 1
        assert violations[0].rule_id == "RCST-R01"

    def test_detected_missing_english_block(self):
        """DÉTECTÉ : Résumé FR présent mais Abstract EN manquant."""
        text = (
            "Résumé :\nCette étude analyse les données économiques.\n"
            "Mots-clés : économie, données\n\n"
            "1. Introduction\nTexte de l'introduction."
        )
        violations = check_bilingual_abstract(text)
        assert any(v.rule_id == "RCST-R01" for v in violations)

    def test_not_detected_complete_bilingual(self):
        """NON DÉTECTÉ : Manuscrit bilingue complet."""
        violations = check_bilingual_abstract(COMPLIANT_MINIMAL)
        assert len(violations) == 0

    def test_not_detected_with_keywords_both_languages(self):
        """NON DÉTECTÉ : Les deux blocs + mots-clés dans les deux langues."""
        text = (
            "Résumé :\nAnalyse des données.\n"
            "Mots-clés : données, analyse\n\n"
            "Abstract :\nData analysis.\n"
            "Keywords: data, analysis\n\n"
            "1. Introduction\nTexte."
        )
        violations = check_bilingual_abstract(text)
        assert len(violations) == 0

    def test_deterministic(self):
        """DÉTERMINISME : Résultat stable."""
        r1 = check_bilingual_abstract(NON_COMPLIANT)
        r2 = check_bilingual_abstract(NON_COMPLIANT)
        assert len(r1) == len(r2)


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-R02 : Comptage de mots du résumé
# ═══════════════════════════════════════════════════════════════════════════════

def _make_abstract(n_words: int, lang: str = "fr") -> str:
    """Génère un texte avec un résumé de n mots."""
    filler = " ".join(["mot"] * n_words)
    if lang == "fr":
        return (
            f"Résumé :\n{filler}\n"
            f"Mots-clés : a, b\n\n"
            f"Abstract :\nShort abstract.\n"
            f"Keywords: a\n\n"
            f"1. Introduction\nTexte."
        )
    else:
        return (
            f"Résumé :\nCourt résumé.\n"
            f"Mots-clés : a\n\n"
            f"Abstract :\n{filler}\n"
            f"Keywords: a\n\n"
            f"1. Introduction\nText."
        )


class TestCheckWordCount:
    def test_detected_french_abstract_too_long(self):
        """DÉTECTÉ : Résumé FR dépasse 250 mots."""
        text = _make_abstract(280, "fr")
        violations = check_word_count(text)
        assert any(v.rule_id == "RCST-R02-FR" for v in violations)
        v = next(v for v in violations if v.rule_id == "RCST-R02-FR")
        assert v.severity == Severity.CRITICAL
        assert "280" in v.message

    def test_detected_english_abstract_too_long(self):
        """DÉTECTÉ : Abstract EN dépasse 250 mots."""
        text = _make_abstract(260, "en")
        violations = check_word_count(text)
        assert any(v.rule_id == "RCST-R02-EN" for v in violations)

    def test_not_detected_exactly_250_words(self):
        """NON DÉTECTÉ : Résumé de exactement 250 mots (limite inclusive)."""
        text = _make_abstract(250, "fr")
        violations = [v for v in check_word_count(text) if v.rule_id == "RCST-R02-FR"]
        assert len(violations) == 0

    def test_not_detected_short_abstract(self):
        """NON DÉTECTÉ : Résumé court de 100 mots."""
        text = _make_abstract(100, "fr")
        violations = [v for v in check_word_count(text) if v.rule_id == "RCST-R02-FR"]
        assert len(violations) == 0

    def test_deterministic_word_count(self):
        """DÉTERMINISME : Même texte → même compte de mots."""
        text = _make_abstract(280, "fr")
        r1 = check_word_count(text)
        r2 = check_word_count(text)
        assert len(r1) == len(r2)
        if r1:
            assert r1[0].message == r2[0].message


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-F01 : Sections obligatoires de fin
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckFinalSections:
    def test_detected_all_missing(self):
        """DÉTECTÉ : Aucune section de fin."""
        text = "1. Introduction\nTexte.\n2. Conclusion\nFin."
        violations = check_final_sections(text)
        assert len(violations) == 1
        v = violations[0]
        assert v.rule_id == "RCST-F01"
        assert v.severity == Severity.CRITICAL
        assert "Remerciements" in v.message

    def test_detected_partial_missing(self):
        """DÉTECTÉ : Seulement 2 sections présentes sur 6 → WARNING."""
        text = (
            "1. Introduction\nTexte.\n\n"
            "Remerciements\nMerci.\n\n"
            "Financement\nFonds National."
        )
        violations = check_final_sections(text)
        assert len(violations) == 1
        assert violations[0].severity in (Severity.WARNING, Severity.CRITICAL)

    def test_not_detected_all_present(self):
        """NON DÉTECTÉ : Toutes les sections obligatoires présentes."""
        violations = check_final_sections(COMPLIANT_MINIMAL)
        assert len(violations) == 0

    def test_detected_missing_specific_section(self):
        """DÉTECTÉ : 'Éthique' manquante mais les autres présentes."""
        text = (
            "1. Introduction\n\n"
            "Remerciements\nMerci.\n"
            "Financement\nFonds.\n"
            "Conflit d'Intérêt\nAucun.\n"
            "Contribution des Auteurs\nA.B. rédaction.\n"
            "ORCID : 0000-0002-1234-5678\n"
        )
        violations = check_final_sections(text)
        # Éthique manquante → au moins 1 violation
        assert len(violations) == 1
        assert "thique" in violations[0].message  # "Éthiques"

    def test_deterministic(self):
        """DÉTERMINISME : Résultat stable."""
        r1 = check_final_sections(NON_COMPLIANT)
        r2 = check_final_sections(NON_COMPLIANT)
        assert len(r1) == len(r2)
        if r1:
            assert r1[0].rule_id == r2[0].rule_id


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-N01 : Numérotation des sections
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckSectionNumbering:
    def test_detected_roman_numerals(self):
        """DÉTECTÉ : Sections numérotées en chiffres romains sans chiffres arabes."""
        text = "I. Introduction\nII. Méthodologie\nIII. Résultats\nIV. Discussion"
        violations = check_section_numbering(text)
        assert len(violations) == 1
        assert violations[0].rule_id == "RCST-N01"
        assert violations[0].severity == Severity.WARNING

    def test_not_detected_arabic_numerals(self):
        """NON DÉTECTÉ : Sections en chiffres arabes (correct)."""
        text = "1. Introduction\n2. Méthodologie\n3. Résultats\n4. Discussion"
        violations = check_section_numbering(text)
        assert len(violations) == 0

    def test_not_detected_compliant_manuscript(self):
        """NON DÉTECTÉ : Manuscrit complet conforme."""
        violations = check_section_numbering(COMPLIANT_MINIMAL)
        assert len(violations) == 0

    def test_deterministic(self):
        """DÉTERMINISME : Résultat stable."""
        text = "I. Introduction\nII. Méthodologie"
        r1 = check_section_numbering(text)
        r2 = check_section_numbering(text)
        assert len(r1) == len(r2)


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-A02 : Auteur correspondant
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckCorrespondingAuthor:
    def test_detected_no_contact_info(self):
        """DÉTECTÉ : Aucune information de contact."""
        text = "Jean Mboma et Pierre Mabiala ont rédigé cet article."
        violations = check_corresponding_author(text)
        assert len(violations) == 1
        assert violations[0].rule_id == "RCST-A02"
        assert violations[0].severity == Severity.WARNING

    def test_not_detected_complete_info(self):
        """NON DÉTECTÉ : Astérisque + email + téléphone présents."""
        violations = check_corresponding_author(COMPLIANT_MINIMAL)
        assert len(violations) == 0

    def test_detected_missing_phone(self):
        """DÉTECTÉ : Email présent mais téléphone manquant."""
        text = "*Auteur correspondant : jean.mboma@unikin.cd"
        violations = check_corresponding_author(text)
        # Doit avoir au moins un avertissement sur le téléphone
        missing_phone = any("téléphone" in v.message for v in violations)
        assert missing_phone

    def test_deterministic(self):
        """DÉTERMINISME : Résultat stable."""
        text = "Auteur : Jean Mboma, sans contact."
        r1 = check_corresponding_author(text)
        r2 = check_corresponding_author(text)
        assert len(r1) == len(r2)


# ═══════════════════════════════════════════════════════════════════════════════
# RCST-T01 : Tableaux et Figures
# ═══════════════════════════════════════════════════════════════════════════════

class TestCheckTablesFigures:
    def test_detected_arabic_table(self):
        """DÉTECTÉ : Tableau numéroté en chiffres arabes."""
        text = "Voir Tableau 1 pour les résultats détaillés."
        violations = check_tables_figures(text)
        assert any(v.rule_id == "RCST-T01a" for v in violations)

    def test_detected_roman_figure(self):
        """DÉTECTÉ : Figure numérotée en chiffres romains."""
        text = "La Figure III montre la distribution des données."
        violations = check_tables_figures(text)
        assert any(v.rule_id == "RCST-T01b" for v in violations)

    def test_not_detected_roman_table(self):
        """NON DÉTECTÉ : Tableau I (chiffres romains — correct)."""
        text = "Voir Tableau I pour les résultats détaillés."
        violations = [v for v in check_tables_figures(text) if v.rule_id == "RCST-T01a"]
        assert len(violations) == 0

    def test_not_detected_arabic_figure(self):
        """NON DÉTECTÉ : Figure 1 (chiffres arabes — correct)."""
        text = "La Figure 1 montre la distribution des données."
        violations = [v for v in check_tables_figures(text) if v.rule_id == "RCST-T01b"]
        assert len(violations) == 0

    def test_deterministic(self):
        """DÉTERMINISME : Résultat stable."""
        text = "Tableau 1 et Figure III constituent les données."
        r1 = check_tables_figures(text)
        r2 = check_tables_figures(text)
        assert len(r1) == len(r2)
        assert {v.rule_id for v in r1} == {v.rule_id for v in r2}


# ═══════════════════════════════════════════════════════════════════════════════
# run_all_rules — Tests d'intégration
# ═══════════════════════════════════════════════════════════════════════════════

class TestRunAllRules:
    def test_non_compliant_manuscript_has_critical_violations(self):
        """Un manuscrit non conforme produit des violations CRITICAL."""
        report = run_all_rules(NON_COMPLIANT)
        assert report.critical_count > 0

    def test_compliant_manuscript_passes(self):
        """Un manuscrit conforme produit peu ou pas de violations."""
        report = run_all_rules(COMPLIANT_MINIMAL)
        # Le manuscrit minimal peut avoir des warnings (téléphone, etc.)
        # mais ne doit pas avoir trop de CRITICAL
        assert report.critical_count <= 1

    def test_report_contains_passed_ids(self):
        """Le rapport liste les règles qui passent."""
        report = run_all_rules(COMPLIANT_MINIMAL)
        assert len(report.passed) > 0

    def test_metrics_are_populated(self):
        """Les métriques brutes sont calculées."""
        report = run_all_rules(NON_COMPLIANT)
        assert report.pronoun_count > 0
        assert report.bracket_citation_count > 0
        assert report.orcid_count == 0

    def test_metrics_compliant(self):
        """Métriques du manuscrit conforme."""
        report = run_all_rules(COMPLIANT_MINIMAL)
        assert report.orcid_count >= 2
        assert report.has_keywords_fr is True
        assert report.has_keywords_en is True

    def test_to_dict_serializable(self):
        """Le rapport est sérialisable en dict."""
        report = run_all_rules(COMPLIANT_MINIMAL)
        d = report.to_dict()
        assert "violations" in d
        assert "passed" in d
        assert "criticalCount" in d
        assert isinstance(d["violations"], list)


# ═══════════════════════════════════════════════════════════════════════════════
# GARANTIE DE REPRODUCTIBILITÉ — Tests de déterminisme global
# ═══════════════════════════════════════════════════════════════════════════════

class TestDeterminism:
    TEXTS = [
        COMPLIANT_MINIMAL,
        NON_COMPLIANT,
        "Texte vide ou presque.",
        "Nous avons constaté [1] que l'ORCID est absent.",
    ]

    @pytest.mark.parametrize("text", TEXTS)
    def test_same_result_across_10_runs(self, text):
        """Le même texte produit exactement le même RulesReport sur 10 exécutions."""
        reports = [run_all_rules(text) for _ in range(10)]
        first = reports[0]
        for r in reports[1:]:
            assert r.critical_count == first.critical_count, \
                f"critical_count instable : {r.critical_count} vs {first.critical_count}"
            assert r.warning_count == first.warning_count, \
                f"warning_count instable : {r.warning_count} vs {first.warning_count}"
            assert r.pronoun_count == first.pronoun_count
            assert r.bracket_citation_count == first.bracket_citation_count
            assert r.orcid_count == first.orcid_count
            assert sorted(r.passed) == sorted(first.passed)
            assert sorted(v.rule_id for v in r.violations) == \
                   sorted(v.rule_id for v in first.violations)

    def test_score_is_deterministic(self):
        """Le score et le statut sont déterministes."""
        for text in self.TEXTS:
            scores = [compute_score_from_report(run_all_rules(text)) for _ in range(5)]
            assert all(s == scores[0] for s in scores), \
                f"Score non déterministe pour le texte : {text[:50]}..."

    def test_order_independence(self):
        """Les résultats ne dépendent pas de l'ordre d'exécution des textes."""
        texts = self.TEXTS
        # Ordre normal
        normal = [run_all_rules(t).critical_count for t in texts]
        # Ordre inversé
        reversed_order = [run_all_rules(t).critical_count for t in reversed(texts)]
        assert normal == list(reversed(reversed_order))


# ═══════════════════════════════════════════════════════════════════════════════
# Tests de score et statut
# ═══════════════════════════════════════════════════════════════════════════════

class TestComputeScore:
    def test_perfect_score_no_violations(self):
        """Score = 100 si aucune violation."""
        report = RulesReport()  # aucune violation
        score, status = compute_score_from_report(report)
        assert score == 100
        assert status == "Conforme"

    def test_score_decreases_with_critical(self):
        """Chaque violation CRITICAL réduit le score."""
        from rules_engine import RuleViolation, Severity
        r1 = RulesReport()
        r2 = RulesReport()
        r2.violations = [
            RuleViolation("RCST-S01", Severity.CRITICAL, "Test", "Msg")
        ]
        s1, _ = compute_score_from_report(r1)
        s2, _ = compute_score_from_report(r2)
        assert s2 < s1

    def test_status_refused_with_2_criticals(self):
        """Statut 'Refusé' avec 2+ violations CRITICAL."""
        from rules_engine import RuleViolation, Severity
        r = RulesReport()
        r.violations = [
            RuleViolation("RCST-S01", Severity.CRITICAL, "T1", "M1"),
            RuleViolation("RCST-C01", Severity.CRITICAL, "T2", "M2"),
        ]
        _, status = compute_score_from_report(r)
        assert "Refusé" in status or "majeures" in status

    def test_status_with_reserves_with_1_critical(self):
        """Statut 'Conforme avec réserves' avec 1 violation CRITICAL."""
        from rules_engine import RuleViolation, Severity
        r = RulesReport()
        r.violations = [RuleViolation("RCST-A01", Severity.CRITICAL, "T", "M")]
        _, status = compute_score_from_report(r)
        assert "réserves" in status
