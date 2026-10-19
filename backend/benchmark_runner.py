"""
benchmark_runner.py — Service d'évaluation et banc d'essai automatisé RCST (Lot C)
===================================================================================
Exécute le moteur de règles déterministe sur le jeu de données de référence (ground truth)
et calcule les métriques statistiques de performance :
  - Taux de Vrais Positifs (Recall / Détection > 90%)
  - Taux de Faux Positifs (FPR / Fall-out < 5%)
  - Précision et F1-Score (global et par règle)
  - Rapport certifié pour homologation auprès des autorités académiques.
"""
from __future__ import annotations

import json
import os
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Dict, List, Optional, Set, Tuple

# Support d'import relatif ou absolu
try:
    from .rules_engine import run_all_rules, RulesReport
except (ImportError, ValueError):
    from rules_engine import run_all_rules, RulesReport


RULE_DESCRIPTIONS: Dict[str, str] = {
    "RCST-S01": "Style impersonnel / pronoms subjectifs prohibés",
    "RCST-C01": "Citations numériques obsolètes entre crochets",
    "RCST-A01": "Présence et conformité de l'identifiant ORCID",
    "RCST-R01": "Exhaustivité du résumé bilingue et mots-clés",
    "RCST-R02-FR": "Plafond de mots du résumé français (max 250 mots)",
    "RCST-R02-EN": "Plafond de mots de l'abstract anglais (max 250 mots)",
    "RCST-F01": "Sections obligatoires de fin d'article",
    "RCST-N01": "Numérotation des sections en chiffres arabes",
    "RCST-A02": "Coordonnées de l'auteur correspondant (* + e-mail + tél)",
    "RCST-T01a": "Numérotation romaine des tableaux",
    "RCST-T01b": "Numérotation arabe des figures",
}


def _safe_divide(numerator: float, denominator: float, default: float = 0.0) -> float:
    return round(numerator / denominator, 4) if denominator > 0 else default


def find_benchmark_directory(custom_path: Optional[str] = None) -> Path:
    """Localise le dossier du banc d'essai contenant ground_truth.json et manuscripts/."""
    if custom_path:
        p = Path(custom_path)
        if p.exists():
            return p

    current_dir = Path(__file__).resolve().parent
    candidates = [
        current_dir / "tests" / "benchmark",
        current_dir / "backend" / "tests" / "benchmark",
        Path.cwd() / "backend" / "tests" / "benchmark",
        Path.cwd() / "tests" / "benchmark",
    ]
    for c in candidates:
        if (c / "ground_truth.json").exists():
            return c

    # Fallback vers le chemin par défaut
    return current_dir / "tests" / "benchmark"


def run_benchmark(benchmark_dir: Optional[str] = None) -> Dict[str, Any]:
    """
    Exécute le banc d'essai complet sur l'ensemble des manuscrits annotés.
    Retourne un dictionnaire structuré contenant métriques globales et détaillées.
    """
    bench_path = find_benchmark_directory(benchmark_dir)
    gt_file = bench_path / "ground_truth.json"
    manuscripts_dir = bench_path / "manuscripts"

    if not gt_file.exists():
        raise FileNotFoundError(f"Fichier de référence introuvable : {gt_file}")
    if not manuscripts_dir.exists():
        raise FileNotFoundError(f"Répertoire des manuscrits introuvable : {manuscripts_dir}")

    with open(gt_file, "r", encoding="utf-8") as f:
        ground_truth: Dict[str, Any] = json.load(f)

    target_metrics = ground_truth.get("target_metrics", {
        "min_recall": 0.90,
        "max_false_positive_rate": 0.05,
        "min_precision": 0.90,
        "min_f1_score": 0.90,
    })
    evaluated_rules: List[str] = ground_truth.get("evaluated_rules", list(RULE_DESCRIPTIONS.keys()))
    manuscripts_data: Dict[str, Any] = ground_truth.get("manuscripts", {})

    # Initialisation des compteurs par règle
    per_rule_stats: Dict[str, Dict[str, int]] = {
        rule_id: {"tp": 0, "fp": 0, "fn": 0, "tn": 0}
        for rule_id in evaluated_rules
    }

    evaluated_manuscripts: List[Dict[str, Any]] = []

    global_tp = 0
    global_fp = 0
    global_fn = 0
    global_tn = 0

    for filename, meta in manuscripts_data.items():
        file_path = manuscripts_dir / filename
        if not file_path.exists():
            continue

        with open(file_path, "r", encoding="utf-8") as mf:
            text = mf.read()

        report: RulesReport = run_all_rules(text)
        detected_violations: Set[str] = {
            v.rule_id for v in report.violations if v.rule_id in evaluated_rules
        }
        expected_violations: Set[str] = set(meta.get("expected_violations", []))

        m_tp = 0
        m_fp = 0
        m_fn = 0
        m_tn = 0

        for rule_id in evaluated_rules:
            is_expected = rule_id in expected_violations
            is_detected = rule_id in detected_violations

            if is_expected and is_detected:
                per_rule_stats[rule_id]["tp"] += 1
                m_tp += 1
                global_tp += 1
            elif not is_expected and is_detected:
                per_rule_stats[rule_id]["fp"] += 1
                m_fp += 1
                global_fp += 1
            elif is_expected and not is_detected:
                per_rule_stats[rule_id]["fn"] += 1
                m_fn += 1
                global_fn += 1
            else:
                per_rule_stats[rule_id]["tn"] += 1
                m_tn += 1
                global_tn += 1

        is_exact = (detected_violations == expected_violations)

        evaluated_manuscripts.append({
            "filename": filename,
            "title": meta.get("title", filename),
            "category": meta.get("category", "Général"),
            "expectedViolations": sorted(list(expected_violations)),
            "detectedViolations": sorted(list(detected_violations)),
            "isExactMatch": is_exact,
            "tp": m_tp,
            "fp": m_fp,
            "fn": m_fn,
            "tn": m_tn,
            "criticalCount": report.critical_count,
            "warningCount": report.warning_count,
        })

    # Calcul des métriques globales
    global_recall = _safe_divide(global_tp, global_tp + global_fn, default=1.0)
    global_precision = _safe_divide(global_tp, global_tp + global_fp, default=1.0)
    global_fpr = _safe_divide(global_fp, global_fp + global_tn, default=0.0)
    global_specificity = _safe_divide(global_tn, global_tn + global_fp, default=1.0)
    
    if global_precision + global_recall > 0:
        global_f1 = round(2 * (global_precision * global_recall) / (global_precision + global_recall), 4)
    else:
        global_f1 = 0.0

    global_accuracy = _safe_divide(
        global_tp + global_tn,
        global_tp + global_tn + global_fp + global_fn,
        default=1.0
    )

    # Calcul des métriques par règle
    rule_metrics: Dict[str, Any] = {}
    for r_id in evaluated_rules:
        st = per_rule_stats[r_id]
        r_tp, r_fp, r_fn, r_tn = st["tp"], st["fp"], st["fn"], st["tn"]
        rec = _safe_divide(r_tp, r_tp + r_fn, default=1.0)
        prec = _safe_divide(r_tp, r_tp + r_fp, default=1.0)
        fpr = _safe_divide(r_fp, r_fp + r_tn, default=0.0)
        f1 = round(2 * (prec * rec) / (prec + rec), 4) if (prec + rec) > 0 else 0.0
        acc = _safe_divide(r_tp + r_tn, r_tp + r_tn + r_fp + r_fn, default=1.0)

        rule_metrics[r_id] = {
            "ruleId": r_id,
            "description": RULE_DESCRIPTIONS.get(r_id, r_id),
            "tp": r_tp,
            "fp": r_fp,
            "fn": r_fn,
            "tn": r_tn,
            "recall": rec,
            "precision": prec,
            "falsePositiveRate": fpr,
            "f1Score": f1,
            "accuracy": acc,
        }

    # Vérification des seuils cibles de l'homologation
    min_recall = target_metrics.get("min_recall", 0.90)
    max_fpr = target_metrics.get("max_false_positive_rate", 0.05)

    meets_targets = (global_recall >= min_recall) and (global_fpr <= max_fpr)

    timestamp_iso = datetime.now(timezone.utc).isoformat()

    summary_text = (
        f"Banc d'essai validé : Taux de détection (Recall) = {global_recall * 100:.1f}% "
        f"(seuil requis >= {min_recall * 100:.0f}%), Taux de faux positifs = {global_fpr * 100:.1f}% "
        f"(seuil max <= {max_fpr * 100:.0f}%). "
        f"F1-Score global = {global_f1 * 100:.1f}%. "
        f"{'CONFORME POUR HOMOLOGATION' if meets_targets else 'NON CONFORME'}"
    )

    return {
        "benchmarkVersion": ground_truth.get("benchmark_version", "1.0.0"),
        "name": ground_truth.get("name", "Banc d'Essai RCST"),
        "institution": ground_truth.get("institution", "Revue Congolaise des Sciences & Technologies"),
        "timestamp": timestamp_iso,
        "manuscriptsCount": len(evaluated_manuscripts),
        "rulesEvaluatedCount": len(evaluated_rules),
        "meetsTargets": meets_targets,
        "targetMetrics": target_metrics,
        "summary": summary_text,
        "globalMetrics": {
            "tp": global_tp,
            "fp": global_fp,
            "fn": global_fn,
            "tn": global_tn,
            "recall": global_recall,
            "precision": global_precision,
            "falsePositiveRate": global_fpr,
            "specificity": global_specificity,
            "f1Score": global_f1,
            "accuracy": global_accuracy,
        },
        "ruleMetrics": rule_metrics,
        "evaluatedManuscripts": evaluated_manuscripts,
    }


def print_benchmark_summary(results: Dict[str, Any]) -> None:
    """Affiche un récapitulatif formaté dans la console pour l'opérateur."""
    gm = results["globalMetrics"]
    print("\n" + "=" * 78)
    print(f"  {results['name']} — Rapport Officiel d'Évaluation")
    print("=" * 78)
    print(f"Date d'évaluation    : {results['timestamp']}")
    print(f"Manuscrits évalués   : {results['manuscriptsCount']}")
    print(f"Règles sous contrôle : {results['rulesEvaluatedCount']}")
    print("-" * 78)
    print(f"  Vrais Positifs (TP) : {gm['tp']:<4} | Faux Positifs (FP) : {gm['fp']}")
    print(f"  Faux Négatifs  (FN) : {gm['fn']:<4} | Vrais Négatifs (TN) : {gm['tn']}")
    print("-" * 78)
    print(f"  Taux de Détection (Recall) : {gm['recall'] * 100:.2f}%  (Objectif: >= {results['targetMetrics']['min_recall']*100:.0f}%)")
    print(f"  Précision                  : {gm['precision'] * 100:.2f}%")
    print(f"  Taux de Faux Positifs (FPR): {gm['falsePositiveRate'] * 100:.2f}%  (Objectif: <= {results['targetMetrics']['max_false_positive_rate']*100:.0f}%)")
    print(f"  F1-Score Global            : {gm['f1Score'] * 100:.2f}%")
    print(f"  Exactitude (Accuracy)      : {gm['accuracy'] * 100:.2f}%")
    print("=" * 78)
    status_label = "[VALIDE] HOMOLOGUE - Criteres de performance confirmes" if results["meetsTargets"] else "[ECHEC] NON HOMOLOGUE"
    print(f"Statut : {status_label}")
    print("=" * 78 + "\n")


if __name__ == "__main__":
    res = run_benchmark()
    print_benchmark_summary(res)
    sys.exit(0 if res["meetsTargets"] else 1)
