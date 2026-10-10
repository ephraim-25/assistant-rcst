import React, { useState } from 'react';
import { 
  ShieldCheck, 
  AlertTriangle, 
  XCircle, 
  CheckCircle2, 
  Printer, 
  Copy, 
  Check, 
  Download, 
  ChevronDown, 
  ChevronUp, 
  Sparkles,
  BookOpen,
  Users,
  FileText,
  Table2,
  Quote,
  PenSquare,
  MessageSquare,
  AlertCircle
} from 'lucide-react';
import { AuditReportData } from '../types/audit';

interface AuditReportViewProps {
  report: AuditReportData;
  onReset: () => void;
}

export const AuditReportView: React.FC<AuditReportViewProps> = ({ report, onReset }) => {
  const [copiedMd, setCopiedMd] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    titleAndAuthors: true,
    abstractAndKeywords: true,
    imradAndStructure: true,
    citationsAndReferences: true,
    style: true,
    priority: true,
    board: true,
  });

  const toggleSection = (id: string) => {
    setExpandedSections((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Conforme':
        return {
          bg: 'bg-emerald-950/80 border-emerald-500/60 text-emerald-300 ring-emerald-500/30',
          icon: ShieldCheck,
          label: 'CONFORME',
          description: 'Manuscrit satisfaisant rigoureusement la Constitution de la RCST. Prêt pour transmission aux réviseurs par les pairs.',
          color: 'text-emerald-400',
        };
      case 'Conforme avec réserves':
        return {
          bg: 'bg-amber-950/80 border-amber-500/60 text-amber-300 ring-amber-500/30',
          icon: AlertTriangle,
          label: 'CONFORME AVEC RÉSERVES',
          description: 'Modifications mineures requises par les auteurs avant envoi définitif aux examinateurs pairs.',
          color: 'text-amber-400',
        };
      default:
        return {
          bg: 'bg-rose-950/80 border-rose-500/60 text-rose-300 ring-rose-500/30',
          icon: XCircle,
          label: 'REFUSÉ - MODIFICATIONS MAJEURES REQUISES',
          description: 'Non-conformités substantielles avec la Constitution de la RCST. Réécriture profonde et resoumission requises.',
          color: 'text-rose-400',
        };
    }
  };

  const statusConfig = getStatusBadge(report.status);
  const StatusIcon = statusConfig.icon;

  const copyMarkdown = () => {
    const textToCopy = report.rawAuditMarkdown || '';
    navigator.clipboard.writeText(textToCopy);
    setCopiedMd(true);
    setTimeout(() => setCopiedMd(false), 2000);
  };

  const handlePrint = () => {
    window.print();
  };

  const downloadReport = () => {
    const textToDownload = report.rawAuditMarkdown || '';
    const element = document.createElement('a');
    const file = new Blob([textToDownload], { type: 'text/markdown;charset=utf-8' });
    element.href = URL.createObjectURL(file);
    element.download = `RAPPORT_AUDIT_RCST_${report.referenceId || '2026'}.md`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const { titleAndAuthors, abstractAndKeywords, imradAndStructure, citationsAndReferences, style } = report.sections;

  return (
    <div className="space-y-8 print:space-y-4">
      {/* Top action toolbar (hidden during print) */}
      <div className="print:hidden bg-slate-900/90 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="text-xs px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-all"
          >
            ← Auditer un nouveau manuscrit
          </button>
          <span className="text-slate-600">|</span>
          <div className="text-xs text-slate-400 font-mono">
            Réf : <span className="text-amber-400 font-semibold">{report.referenceId || 'RCST-AUDIT-2026-0842'}</span>
          </div>
          {report.isAiGenerated && (
            <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full bg-sky-950 text-sky-400 border border-sky-800 font-mono">
              <Sparkles className="w-3 h-3" /> Audit Constitutionnel IA
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={copyMarkdown}
            className="text-xs px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-all font-medium border border-slate-700/60"
          >
            {copiedMd ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copiedMd ? 'Copié !' : 'Copier Rapport (MD)'}</span>
          </button>

          <button
            onClick={downloadReport}
            className="text-xs px-3.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-all font-medium border border-slate-700/60"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Télécharger .MD</span>
          </button>

          <button
            onClick={handlePrint}
            className="text-xs px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 flex items-center gap-1.5 transition-all font-bold shadow-md shadow-amber-500/20"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Imprimer / PDF Officiel</span>
          </button>
        </div>
      </div>

      {/* Official Certificate & Letterhead */}
      <div className="bg-slate-900/95 border-2 border-slate-800 rounded-2xl overflow-hidden shadow-2xl print:border print:border-black print:bg-white print:text-black">
        {/* Header banner */}
        <div className="bg-gradient-to-r from-sky-950 via-slate-900 to-amber-950/80 p-6 sm:p-8 border-b border-slate-800 print:bg-none print:border-b-2 print:border-black">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="flex items-start gap-4">
              <div className="w-16 h-16 rounded-xl bg-slate-950 border border-amber-400/40 p-2 flex flex-col items-center justify-center text-center shadow-lg flex-shrink-0 print:border-black">
                <span className="font-serif font-black text-amber-400 text-xl tracking-tighter print:text-black">RCST</span>
                <span className="text-[9px] uppercase tracking-widest text-sky-300 font-bold print:text-black">RD CONGO</span>
              </div>
              <div>
                <div className="text-[11px] font-mono tracking-widest uppercase text-amber-400/90 font-bold print:text-black">
                  RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
                </div>
                <h2 className="text-xl sm:text-2xl font-serif font-black text-white tracking-tight print:text-black">
                  REVUE CONGOLAISE DES SCIENCES & TECHNOLOGIES
                </h2>
                <div className="text-xs text-slate-300 mt-1 flex flex-wrap items-center gap-2 print:text-black">
                  <span className="font-semibold text-sky-400 print:text-black">Bureau de l'Auditeur Éditorial Principal</span>
                  <span>•</span>
                  <span>Contrôle de Conformité à la Constitution RCST</span>
                </div>
              </div>
            </div>

            <div className="flex-shrink-0 bg-slate-950/90 border border-slate-800 rounded-xl p-3.5 text-right font-mono text-xs space-y-1 print:border-black print:bg-slate-100">
              <div className="text-[10px] uppercase text-slate-400 font-bold print:text-black">CERTIFICAT OFFICIEL D'AUDIT</div>
              <div className="text-amber-400 font-bold text-sm print:text-black">{report.referenceId || 'RCST-AUDIT-2026-0842'}</div>
              <div className="text-slate-400 text-[11px] print:text-black">
                Date : {report.timestamp || new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: 'long', year: 'numeric' })}
              </div>
            </div>
          </div>
        </div>

        {/* 1. STATUT OFFICIEL ASSERMENTÉ */}
        <div className="p-6 sm:p-8 border-b border-slate-800 print:border-b">
          <div className="text-xs font-mono font-bold uppercase tracking-wider text-slate-400 mb-3">
            1. STATUT OFFICIEL ASSERMENTÉ
          </div>

          <div className={`p-6 rounded-2xl border-2 ring-1 ${statusConfig.bg} transition-all`}>
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="flex items-start sm:items-center gap-4">
                <div className={`p-3 rounded-xl bg-slate-950/80 border border-current shadow-md ${statusConfig.color}`}>
                  <StatusIcon className="w-8 h-8" />
                </div>
                <div>
                  <div className="text-xs uppercase font-mono font-bold tracking-wider opacity-80">
                    DÉCISION D'AUDIT CONSTITUTIONNEL :
                  </div>
                  <h3 className={`text-2xl sm:text-3xl font-serif font-black tracking-tight mt-0.5 ${statusConfig.color}`}>
                    [{statusConfig.label}]
                  </h3>
                  <p className="text-sm mt-1 text-slate-300 max-w-2xl leading-relaxed print:text-black">
                    {statusConfig.description}
                  </p>
                </div>
              </div>

              {/* Score Indicator */}
              <div className="bg-slate-950/90 border border-slate-800/80 rounded-xl p-4 text-center min-w-[160px] shadow-inner print:bg-white print:border-black">
                <div className="text-[10px] font-mono uppercase text-slate-400 tracking-wider font-semibold print:text-black">
                  Score de Conformité
                </div>
                <div className="text-3xl sm:text-4xl font-serif font-bold text-white mt-0.5 print:text-black">
                  {report.globalScore}
                  <span className="text-sm font-normal text-slate-400 font-sans">/100</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full mt-2 overflow-hidden print:hidden">
                  <div
                    className={`h-full rounded-full ${
                      report.globalScore >= 80 ? 'bg-emerald-400' : report.globalScore >= 55 ? 'bg-amber-400' : 'bg-rose-500'
                    }`}
                    style={{ width: `${Math.min(100, Math.max(0, report.globalScore))}%` }}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Synthèse */}
          <div className="mt-5 p-4 rounded-xl bg-slate-950/60 border border-slate-800 text-sm text-slate-300 leading-relaxed print:bg-transparent print:border-none print:text-black">
            <span className="font-semibold text-amber-400 font-mono text-xs uppercase tracking-wide mr-2 print:text-black">
              SYNTHÈSE DE L'EXPERT ÉDITORIAL :
            </span>
            {report.summary}
          </div>
        </div>

        {/* 2. ANALYSE DÉTAILLÉE PAR SECTION */}
        <div className="p-6 sm:p-8 border-b border-slate-800 space-y-6 print:border-b">
          <div className="flex items-center justify-between pb-3 border-b border-slate-800">
            <h3 className="text-lg font-serif font-bold text-white flex items-center gap-2 print:text-black">
              <BookOpen className="w-5 h-5 text-amber-400 print:text-black" />
              2. ANALYSE DÉTAILLÉE PAR SECTION
            </h3>
            <span className="text-xs font-mono text-slate-400 uppercase print:text-black">
              5 Piliers d'Évaluation de la Constitution RCST
            </span>
          </div>

          {/* 2.1 Titre */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden print:border-black">
            <button
              onClick={() => toggleSection('title')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                  2.1
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 print:text-black">Titre (Bilinguisme & Absence de guillemets)</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{titleAndAuthors.isBilingualTitle ? '✓ Titre bilingue (FR/EN)' : '✗ Titre non bilingue'}</span>
                    <span>•</span>
                    <span>{!titleAndAuthors.hasSuperfluousQuotes ? '✓ Zéro guillemets' : '✗ Guillemets superflus proscrits'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  titleAndAuthors.isBilingualTitle && !titleAndAuthors.hasSuperfluousQuotes ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {titleAndAuthors.isBilingualTitle && !titleAndAuthors.hasSuperfluousQuotes ? '100/100' : '50/100'}
                </span>
                {expandedSections.title ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedSections.title && (
              <div className="p-4 pt-0 border-t border-slate-850/80 space-y-3 text-xs leading-relaxed">
                {(titleAndAuthors.hasSuperfluousQuotes || !titleAndAuthors.isBilingualTitle) && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-200">
                    <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Écarts constatés sur le titre :
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {titleAndAuthors.hasSuperfluousQuotes && (
                        <li>Interdiction formelle des guillemets dans le titre.</li>
                      )}
                      {!titleAndAuthors.isBilingualTitle && (
                        <li>Titre obligatoirement bilingue (Français et Anglais requis).</li>
                      )}
                    </ul>
                  </div>
                )}

                {titleAndAuthors.correctedTitleBlock && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="font-semibold text-emerald-400 mb-1">Proposition de Titre Bilingue Normalisé :</div>
                    <p className="font-serif italic text-white">{titleAndAuthors.correctedTitleBlock.fr}</p>
                    <p className="font-serif italic text-sky-300 mt-1">{titleAndAuthors.correctedTitleBlock.en}</p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2.2 Auteurs, Affiliations et Détails */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden print:border-black">
            <button
              onClick={() => toggleSection('authors')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                  2.2
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 print:text-black">Auteurs, Affiliations et Détails</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{!titleAndAuthors.hasBulletedAuthors ? '✓ Pas de puces' : '✗ Puces interdites'}</span>
                    <span>•</span>
                    <span>{titleAndAuthors.hasSuperscriptAffiliations ? '✓ Affiliations en exposant' : '✗ Exposants manquants'}</span>
                    <span>•</span>
                    <span>{titleAndAuthors.hasCorrespondingAsterisk ? '✓ Auteur correspondant (*)' : '✗ Manque astérisque (*)'}</span>
                    <span>•</span>
                    <span>{titleAndAuthors.hasPhone ? '✓ Téléphone' : '✗ Téléphone manquant'}</span>
                    <span>•</span>
                    <span>{titleAndAuthors.hasOrcid16Digits ? '✓ ORCID 16 chiffres' : '✗ ORCID 16 chiffres manquant'}</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  titleAndAuthors.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {titleAndAuthors.score}/100
                </span>
                {expandedSections.authors ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedSections.authors && (
              <div className="p-4 pt-0 border-t border-slate-850/80 space-y-3 text-xs leading-relaxed">
                {titleAndAuthors.issues && titleAndAuthors.issues.length > 0 && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-200">
                    <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Écarts constatés sur les auteurs :
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {titleAndAuthors.issues.filter(i => !i.includes('Titre') && !i.includes('Guillemets')).map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {titleAndAuthors.recommendations && (
                  <div className="p-3 bg-slate-900/60 rounded-lg text-slate-300">
                    <span className="font-semibold text-amber-400">Directives correctives : </span>
                    {titleAndAuthors.recommendations.join(' ')}
                  </div>
                )}

                {titleAndAuthors.correctedAuthorsBlock && (
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-lg">
                    <div className="font-semibold text-emerald-400 mb-1">Modèle corrigé conforme RCST :</div>
                    <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                      {titleAndAuthors.correctedAuthorsBlock}
                    </pre>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2.3 Résumé & Mots-clés */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden print:border-black">
            <button
              onClick={() => toggleSection('abstractAndKeywords')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                  2.3
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 print:text-black">Résumé & Mots-clés</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{abstractAndKeywords.isBilingual ? '✓ Résumé bilingue' : '✗ Bilinguisme incomplet'}</span>
                    <span>•</span>
                    <span>{abstractAndKeywords.wordCountFr} mots {abstractAndKeywords.wordCountFr <= 250 ? '(✓ ≤ 250 mots)' : '(⚠️ Dépasse 250 mots)'}</span>
                    <span>•</span>
                    <span>{!abstractAndKeywords.hasForbiddenSubtitles ? '✓ Zéro sous-titre' : '✗ Sous-titres interdits'}</span>
                    <span>•</span>
                    <span>{!abstractAndKeywords.hasReferences ? '✓ Zéro référence' : '✗ Références interdites'}</span>
                    <span>•</span>
                    <span>Mots-clés : {abstractAndKeywords.keywordsCountFr || 0} FR / {abstractAndKeywords.keywordsCountEn || 0} EN (~5 requis)</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  abstractAndKeywords.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {abstractAndKeywords.score}/100
                </span>
                {expandedSections.abstractAndKeywords ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedSections.abstractAndKeywords && (
              <div className="p-4 pt-0 border-t border-slate-850/80 space-y-3 text-xs leading-relaxed">
                {abstractAndKeywords.issues && abstractAndKeywords.issues.length > 0 && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-200">
                    <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Écarts constatés :
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {abstractAndKeywords.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {abstractAndKeywords.recommendations && (
                  <div className="p-3 bg-slate-900/60 rounded-lg text-slate-300">
                    <span className="font-semibold text-amber-400">Directives correctives : </span>
                    {abstractAndKeywords.recommendations.join(' ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2.4 Corps IMRAD */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden print:border-black">
            <button
              onClick={() => toggleSection('imradAndStructure')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                  2.4
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 print:text-black">Corps IMRAD (Structure, Tableaux, Figures & 6 Sections)</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{imradAndStructure.hasArabicNumbering ? '✓ Numérotation arabe (1., 2...)' : '✗ Chiffres romains proscrits'}</span>
                    <span>•</span>
                    <span>{!imradAndStructure.hasSuperfluousSubtitlesInIntro ? '✓ Intro sans sous-titre' : '✗ Sous-titres superflus dans l\'intro'}</span>
                    <span>•</span>
                    <span>Tableaux en romain AVANT / Figures en arabe APRÈS</span>
                    <span>•</span>
                    <span>6 Sections de fin d'article obligatoires</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  imradAndStructure.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {imradAndStructure.score}/100
                </span>
                {expandedSections.imradAndStructure ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedSections.imradAndStructure && (
              <div className="p-4 pt-0 border-t border-slate-850/80 space-y-4 text-xs leading-relaxed">
                {/* 6 Mandatory End-of-article sections checklist */}
                <div className="p-3.5 bg-slate-900 rounded-lg border border-slate-800">
                  <div className="font-semibold text-amber-400 mb-2 flex items-center gap-1.5">
                    <Table2 className="w-3.5 h-3.5" /> Contrôle des 6 sections obligatoires de fin d'article :
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-850">
                      <span className={imradAndStructure.mandatoryEndSections?.remerciements ? 'text-emerald-400' : 'text-rose-400'}>
                        {imradAndStructure.mandatoryEndSections?.remerciements ? '✓' : '✗'}
                      </span>
                      <span>Remerciements</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-850">
                      <span className={imradAndStructure.mandatoryEndSections?.financement ? 'text-emerald-400' : 'text-rose-400'}>
                        {imradAndStructure.mandatoryEndSections?.financement ? '✓' : '✗'}
                      </span>
                      <span>Financement</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-850">
                      <span className={imradAndStructure.mandatoryEndSections?.conflitInteret ? 'text-emerald-400' : 'text-rose-400'}>
                        {imradAndStructure.mandatoryEndSections?.conflitInteret ? '✓' : '✗'}
                      </span>
                      <span>Conflit d'Intérêt</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-850">
                      <span className={imradAndStructure.mandatoryEndSections?.considerationsEthiques ? 'text-emerald-400' : 'text-rose-400'}>
                        {imradAndStructure.mandatoryEndSections?.considerationsEthiques ? '✓' : '✗'}
                      </span>
                      <span>Considérations d'Éthiques</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-850">
                      <span className={imradAndStructure.mandatoryEndSections?.orcidAuteurs ? 'text-emerald-400' : 'text-rose-400'}>
                        {imradAndStructure.mandatoryEndSections?.orcidAuteurs ? '✓' : '✗'}
                      </span>
                      <span>ORCID des Auteurs</span>
                    </div>
                    <div className="flex items-center gap-2 p-2 rounded bg-slate-950/70 border border-slate-850">
                      <span className={imradAndStructure.mandatoryEndSections?.contributionAuteursInitialsOnly ? 'text-emerald-400' : 'text-rose-400'}>
                        {imradAndStructure.mandatoryEndSections?.contributionAuteursInitialsOnly ? '✓' : '✗'}
                      </span>
                      <span>Contribution (Initiales)</span>
                    </div>
                  </div>
                </div>

                {imradAndStructure.issues && imradAndStructure.issues.length > 0 && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-200">
                    <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Écarts constatés :
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {imradAndStructure.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {imradAndStructure.recommendations && (
                  <div className="p-3 bg-slate-900/60 rounded-lg text-slate-300">
                    <span className="font-semibold text-amber-400">Directives correctives : </span>
                    {imradAndStructure.recommendations.join(' ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2.5 Références APA 7 */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden print:border-black">
            <button
              onClick={() => toggleSection('citationsAndReferences')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                  2.5
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 print:text-black">Références APA 7 (Citations & Bibliographie)</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{citationsAndReferences.apa7Compliant ? '✓ Format auteur-date APA 7' : '✗ Non conforme APA 7'}</span>
                    <span>•</span>
                    <span>{!citationsAndReferences.hasNumericStyleBracket ? '✓ Pas de [1], [2]' : '✗ Style numérique [1] proscrit'}</span>
                    <span>•</span>
                    <span>Retrait suspendu d'1 cm en bibliographie</span>
                    <span>•</span>
                    <span>Correspondance croisée stricte texte ↔ bibliographie</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  citationsAndReferences.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {citationsAndReferences.score}/100
                </span>
                {expandedSections.citationsAndReferences ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedSections.citationsAndReferences && (
              <div className="p-4 pt-0 border-t border-slate-850/80 space-y-3 text-xs leading-relaxed">
                {citationsAndReferences.issues && citationsAndReferences.issues.length > 0 && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-200">
                    <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Écarts constatés :
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {citationsAndReferences.issues.map((issue, i) => (
                        <li key={i}>{issue}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {citationsAndReferences.flaggedCitations && citationsAndReferences.flaggedCitations.length > 0 && (
                  <div className="space-y-2 mt-2">
                    <div className="font-semibold text-amber-400">Citations pointées et conversion APA 7 requise :</div>
                    {citationsAndReferences.flaggedCitations.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 border border-slate-800 rounded-lg space-y-1">
                        <div className="text-rose-400 line-through font-mono text-[11px]">{item.raw}</div>
                        <div className="text-[11px] text-amber-300">Anomalie : {item.error}</div>
                        <div className="text-emerald-400 font-mono text-[11px] bg-slate-950 p-2 rounded border border-slate-850">
                          Format APA 7 conforme : {item.correctedApa7}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {citationsAndReferences.recommendations && (
                  <div className="p-3 bg-slate-900/60 rounded-lg text-slate-300">
                    <span className="font-semibold text-amber-400">Directives bibliographiques : </span>
                    {citationsAndReferences.recommendations.join(' ')}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 2.6 Style Impersonnel */}
          <div className="bg-slate-950/60 border border-slate-850 rounded-xl overflow-hidden print:border-black">
            <button
              onClick={() => toggleSection('style')}
              className="w-full p-4 flex items-center justify-between text-left hover:bg-slate-900/60 transition-all"
            >
              <div className="flex items-center gap-3">
                <span className="w-8 h-8 rounded-lg bg-sky-950 border border-sky-800 text-sky-400 font-mono text-xs flex items-center justify-center font-bold">
                  2.6
                </span>
                <div>
                  <h4 className="text-sm font-bold text-slate-100 print:text-black">Style Impersonnel (Proscription de « nous », « je », « nos travaux »)</h4>
                  <div className="flex flex-wrap gap-2 text-[11px] text-slate-400 mt-0.5">
                    <span>{style.isImpersonal ? '✓ Style impersonnel respecté' : '✗ Utilisation de « nous/je » prohibée'}</span>
                    <span>•</span>
                    <span>Tournures passives et nominales exigées dans tout l'article</span>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <span className={`text-xs font-mono font-semibold px-2 py-0.5 rounded ${
                  style.score >= 80 ? 'bg-emerald-950 text-emerald-400' : 'bg-rose-950 text-rose-400'
                }`}>
                  {style.score}/100
                </span>
                {expandedSections.style ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
              </div>
            </button>

            {expandedSections.style && (
              <div className="p-4 pt-0 border-t border-slate-850/80 space-y-3 text-xs leading-relaxed">
                {style.personalPronounsDetected && style.personalPronounsDetected.length > 0 && (
                  <div className="p-3 bg-rose-950/20 border border-rose-900/40 rounded-lg text-rose-200">
                    <div className="font-semibold text-rose-400 mb-1 flex items-center gap-1.5">
                      <AlertTriangle className="w-3.5 h-3.5" /> Pronoms ou formulations subjectives détectés :
                    </div>
                    <p className="font-mono text-rose-300">
                      {style.personalPronounsDetected.join(', ')}
                    </p>
                  </div>
                )}

                {style.sampleReformulations && style.sampleReformulations.length > 0 && (
                  <div className="space-y-2">
                    <div className="font-semibold text-emerald-400">Exemples de dépersonnalisation :</div>
                    {style.sampleReformulations.map((item, idx) => (
                      <div key={idx} className="p-3 bg-slate-900 rounded-lg border border-slate-800 space-y-1">
                        <div className="text-rose-400 text-[11px] italic">Auteur : « {item.original} »</div>
                        <div className="text-emerald-300 text-[11px] font-medium">Style RCST : « {item.corrected} »</div>
                      </div>
                    ))}
                  </div>
                )}

                {style.recommendations && (
                  <div className="p-3 bg-slate-900/60 rounded-lg text-slate-300">
                    <span className="font-semibold text-amber-400">Directives rédactionnelles : </span>
                    {style.recommendations.join(' ')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* 3. CORRECTIONS ET RECOMMANDATIONS PRIORITAIRES */}
        <div className="p-6 sm:p-8 border-b border-slate-800 print:border-b">
          <div className="flex items-center gap-2 mb-3">
            <CheckCircle2 className="w-5 h-5 text-amber-400" />
            <h3 className="text-lg font-serif font-bold text-white print:text-black">
              3. CORRECTIONS ET RECOMMANDATIONS PRIORITAIRES
            </h3>
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Liste hiérarchisée des modifications que les auteurs doivent impérativement apporter avant toute nouvelle évaluation.
          </p>

          <div className="space-y-2.5">
            {report.priorityRecommendations.map((rec, index) => (
              <div
                key={index}
                className="flex items-start gap-3 p-3.5 rounded-xl bg-slate-950/70 border border-slate-850 text-xs text-slate-200 print:bg-transparent print:border-black print:text-black"
              >
                <span className="flex-shrink-0 w-6 h-6 rounded-full bg-amber-500/10 border border-amber-500/40 text-amber-400 font-mono text-[11px] font-bold flex items-center justify-center">
                  {index + 1}
                </span>
                <span className="leading-relaxed mt-0.5">{rec}</span>
              </div>
            ))}
          </div>
        </div>

        {/* 4. ESPACE COMITÉ DE RÉDACTION */}
        <div className="p-6 sm:p-8 bg-slate-950/80 print:bg-white">
          <div className="flex items-center gap-2 mb-4">
            <MessageSquare className="w-5 h-5 text-sky-400" />
            <h3 className="text-lg font-serif font-bold text-white print:text-black">
              4. ESPACE COMITÉ DE RÉDACTION
            </h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2 print:border-black">
              <span className="text-[11px] font-mono uppercase font-bold text-sky-400 tracking-wider">
                Avis et Décision Recommandée
              </span>
              <p className="text-sm font-semibold text-white print:text-black">
                {report.editorialBoardNotes.decisionRecommendation}
              </p>
              <p className="text-xs text-slate-300 leading-relaxed print:text-black">
                {report.editorialBoardNotes.confidentialComments}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 print:border-black">
              <span className="text-[11px] font-mono uppercase font-bold text-amber-400 tracking-wider">
                Points de Vigilance Éthique & Questions Spécifiques aux Auteurs
              </span>
              <ul className="space-y-1.5 text-xs text-slate-300 print:text-black">
                {report.editorialBoardNotes.ethicalChecklist.map((eth, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-emerald-400 font-bold">✓</span>
                    <span>{eth}</span>
                  </li>
                ))}
                {report.editorialBoardNotes.questionsForAuthors.map((q, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-sky-400 font-bold">?</span>
                    <span>{q}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Sceau & signature pour impression */}
          <div className="mt-8 pt-6 border-t border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 print:flex-row">
            <div>
              <div className="text-[10px] uppercase font-mono text-slate-400 font-bold">Auditeur Assermenté</div>
              <div className="text-sm font-serif font-bold text-white print:text-black">
                Expert Éditorial Principal & Contrôle Constitutionnel
              </div>
              <div className="text-xs text-slate-400 print:text-black">Revue Congolaise des Sciences & Technologies (RCST)</div>
            </div>
            <div className="border border-dashed border-amber-500/50 p-4 rounded-xl text-center min-w-[220px] bg-amber-500/5 print:border-black">
              <div className="text-[10px] font-mono uppercase text-amber-400 font-bold tracking-wider print:text-black">
                SCEAU ÉDITORIAL RCST
              </div>
              <div className="text-xs font-serif italic text-slate-300 mt-1 print:text-black">
                Rapport d'Audit Officiel Opposable
              </div>
              <div className="text-[10px] font-mono text-slate-500 mt-1 print:text-black">
                RCST-CONST-2026-OK
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
