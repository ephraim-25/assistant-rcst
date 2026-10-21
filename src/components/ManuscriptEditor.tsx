import { apiFetch } from '../lib/api';
import React, { useState, useMemo, useRef } from 'react';
import { 
  FileText, 
  Sparkles, 
  RefreshCw, 
  Upload, 
  Trash2, 
  AlertTriangle, 
  CheckCircle2, 
  Info, 
  BookOpen, 
  FileType,
  FileCheck,
  FileSpreadsheet,
  FileCode,
  ShieldAlert,
  ShieldCheck
} from 'lucide-react';
import { SAMPLE_MANUSCRIPTS, SampleManuscript } from '../data/samples';

interface ManuscriptEditorProps {
  text: string;
  setText: (text: string) => void;
  onAudit: (sourceFilename?: string) => void;
  isLoading: boolean;
}

export const ManuscriptEditor: React.FC<ManuscriptEditorProps> = ({
  text,
  setText,
  onAudit,
  isLoading,
}) => {
  const [selectedSampleId, setSelectedSampleId] = useState<string>('');
  const [isExtracting, setIsExtracting] = useState<boolean>(false);
  const [fileDetails, setFileDetails] = useState<{
    name: string;
    extension: string;
    sizeKb: number;
    wordCount: number;
  } | null>(null);
  const [dragActive, setDragActive] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Live real-time preliminary indicators based on Constitution RCST
  const stats = useMemo(() => {
    const words = text.trim() ? text.trim().split(/\s+/).length : 0;
    const lines = text.trim() ? text.split('\n').length : 0;
    const personalPronounsMatches = [
      ...text.matchAll(/\b(nous|je|notre|nos|j'|moi|mon|mes|on a|nous avons|nous pensons|nous concluons|nos travaux|notre équipe)\b/gi),
    ];
    const personalPronounsCount = personalPronounsMatches.length;
    const hasOrcid = /orcid(?:\.org)?\/?[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9xX]/i.test(text) || /\b[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9xX]\b/.test(text);
    const hasEmails = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
    const hasPhone = /(?:\+243|0[0-9]{2}|\b\+?[0-9]{1,4}[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{2,4}\b)/.test(text) || /t[ée]l[ée]phone|phone|tel\s*:/i.test(text);
    const hasBulletedAuthors = /auteurs?\s*:\s*\n\s*[-*•]/i.test(text);
    const hasImradIntro = /(?:1\.?\s*)?introduction/i.test(text);
    const hasImradMethods = /(?:2\.?\s*)?(?:matériels? et méthodes|m[ée]thodes|methodology|methods)/i.test(text);
    const hasImradResults = /(?:3\.?\s*)?(?:r[ée]sultats|results)/i.test(text);
    const hasImradDiscussion = /(?:4\.?\s*)?(?:discussion)/i.test(text);
    const hasBilingual = /résumé/i.test(text) && /abstract/i.test(text);
    const hasEndSections = /remerciements|financement|conflit d['’]int[ée]r[êe]t|contribution des auteurs/i.test(text);
    const hasQuotesInTitle = /^["«'].*["»']$/m.test(text);

    return {
      words,
      lines,
      personalPronounsCount,
      hasOrcid,
      hasEmails,
      hasPhone,
      hasBulletedAuthors,
      hasImradIntro,
      hasImradMethods,
      hasImradResults,
      hasImradDiscussion,
      hasBilingual,
      hasEndSections,
      hasQuotesInTitle,
    };
  }, [text]);

  const loadSample = (sample: SampleManuscript) => {
    setSelectedSampleId(sample.id);
    setText(sample.text);
    setFileDetails(null);
  };

  const processFile = async (file: File) => {
    setIsExtracting(true);
    const ext = file.name.split('.').pop()?.toLowerCase();

    // If simple text or markdown, we can read directly or send to server
    if (ext === 'txt' || ext === 'md' || ext === 'text') {
      const reader = new FileReader();
      reader.onload = (e) => {
        const content = (e.target?.result as string) || '';
        setText(content);
        setSelectedSampleId('');
        setFileDetails({
          name: file.name,
          extension: `.${ext}`,
          sizeKb: Math.round(file.size / 1024),
          wordCount: content.split(/\s+/).filter(Boolean).length,
        });
        setIsExtracting(false);
      };
      reader.readAsText(file);
      return;
    }

    // For Word (.docx) or PDF (.pdf) or others, send to server extraction endpoint
    try {
      const formData = new FormData();
      formData.append('file', file);

      const response = await apiFetch('/api/extract-file', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error("Impossible d'extraire le texte du document.");
      }

      const data = await response.json();
      setText(data.text);
      setSelectedSampleId('');
      setFileDetails({
        name: data.filename,
        extension: data.extension,
        sizeKb: Math.round(file.size / 1024),
        wordCount: data.wordCount,
      });
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erreur lors du traitement du fichier.');
    } finally {
      setIsExtracting(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      processFile(file);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-slate-900 border border-sky-800/40 rounded-lg p-6 sm:p-7">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <FileCheck className="w-3.5 h-3.5" />
              Soumission Multi-formats (Word, PDF, TXT, MD)
            </div>
            <h2 className="text-xl sm:text-2xl font-serif font-bold text-white tracking-tight">
              Banc d'Audit Éditorial des Manuscrits RCST
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Déposez votre document au format <strong className="text-amber-400">Word (.docx)</strong>, <strong className="text-sky-400">PDF (.pdf)</strong>, <strong className="text-emerald-400">Texte (.txt)</strong> ou <strong className="text-indigo-400">Markdown (.md)</strong>, ou collez directement le texte. L'auditeur applique la Constitution RCST avec tolérance automatique pour les artéfacts d'extraction technique.
            </p>
          </div>

          <div className="flex-shrink-0">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-4 py-2.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/80 text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
            >
              <Upload className="w-4 h-4 text-sky-400" />
              <span>Importer (.docx, .pdf, .txt, .md)</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.pdf,.txt,.md,.text"
              onChange={handleFileChange}
              className="hidden"
            />
          </div>
        </div>
      </div>

      {/* Multi-format Drag & Drop area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => !fileDetails && fileInputRef.current?.click()}
        className={`border-2 border-dashed rounded-md p-5 text-center transition-colors cursor-pointer ${
          dragActive
            ? 'border-amber-400 bg-amber-500/10'
            : fileDetails
            ? 'border-emerald-500/40 bg-slate-900/60'
            : 'border-slate-800 hover:border-slate-700 bg-slate-950/40'
        }`}
      >
        {isExtracting ? (
          <div className="flex items-center justify-center gap-3 py-3 text-sky-400 text-xs font-medium">
            <RefreshCw className="w-4 h-4 animate-spin" />
            <span>Extraction et normalisation du texte en cours...</span>
          </div>
        ) : fileDetails ? (
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-left">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-emerald-950 border border-emerald-800 text-emerald-400 flex items-center justify-center font-bold text-xs font-mono">
                {fileDetails.extension.replace('.', '')}
              </div>
              <div>
                <div className="text-xs font-bold text-white flex items-center gap-2">
                  <span>{fileDetails.name}</span>
                  <span className="text-xs font-mono px-2 py-0.5 rounded bg-slate-800 text-slate-300">
                    {fileDetails.sizeKb} Ko • {fileDetails.wordCount} mots
                  </span>
                </div>
                <p className="text-xs text-emerald-400/90 mt-0.5">
                  ✓ Document extrait avec succès. Prêt pour l'audit constitutionnel RCST.
                </p>
              </div>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                fileInputRef.current?.click();
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium"
            >
              Changer de fichier
            </button>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-2 text-slate-400">
            <div className="flex items-center gap-2 mb-1.5 text-xs font-semibold text-slate-300">
              <Upload className="w-4 h-4 text-amber-400" />
              <span>Glissez-déposez ici votre manuscrit Word (.docx), PDF (.pdf), Texte (.txt) ou Markdown (.md)</span>
            </div>
            <p className="text-xs text-slate-500">
              Extraction instantanée du texte avec préservation des sections et des métadonnées
            </p>
          </div>
        )}
      </div>

      {/* Preset Academic Samples Selector */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-md p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold text-amber-300 flex items-center gap-1.5">
            <BookOpen className="w-3.5 h-3.5" />
            Échantillons types de test (Constitution RCST) :
          </span>
          <span className="text-xs text-slate-400">Cliquez pour tester l'auditeur</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_MANUSCRIPTS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => loadSample(sample)}
              className={`p-3 rounded-lg border text-left transition-colors flex flex-col justify-between ${
                selectedSampleId === sample.id
                  ? 'bg-amber-500/10 border-amber-500/60 ring-1 ring-amber-500/30'
                  : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-900/80'
              }`}
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                    sample.id === 'sample-rejected' 
                      ? 'bg-rose-950 text-rose-300 border border-rose-800' 
                      : sample.id === 'sample-reserves'
                      ? 'bg-amber-950 text-amber-300 border border-amber-800'
                      : 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                  }`}>
                    {sample.badge}
                  </span>
                </div>
                <h4 className="text-xs font-bold text-slate-200 line-clamp-1">{sample.name}</h4>
                <p className="text-xs text-slate-400 mt-1 line-clamp-2 leading-relaxed">{sample.description}</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Editor Main Box */}
      <div className="bg-slate-900/95 border border-slate-800 rounded-lg p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3 pb-3 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="text-xs font-semibold text-slate-300">
              Texte Intégral Extrait du Manuscrit
            </span>
            {fileDetails && (
              <span className="text-xs px-2 py-0.5 rounded bg-sky-950 border border-sky-800 text-sky-400 font-mono">
                Source : {fileDetails.name}
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 text-xs text-slate-400">
            <span className="font-mono">{stats.words} mots</span>
            <span>•</span>
            <span className="font-mono">{stats.lines} lignes</span>
            {text && (
              <button
                onClick={() => {
                  setText('');
                  setSelectedSampleId('');
                  setFileDetails(null);
                }}
                className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                title="Effacer le texte"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Textarea */}
        <textarea
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setSelectedSampleId('');
          }}
          placeholder="Collez ici le texte complet du manuscrit ou déposez un fichier .docx / .pdf ci-dessus..."
          rows={16}
          className="w-full bg-slate-950 border border-slate-800 rounded-md p-4 text-xs sm:text-sm text-slate-100 placeholder-slate-600 focus:outline-none focus:ring-1 focus:ring-amber-500 font-mono leading-relaxed resize-y min-h-[320px]"
        />

        {/* Live Heuristic Inspection Bar */}
        <div className="mt-4 p-3 rounded-md bg-slate-950/70 border border-slate-850 flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="text-xs font-mono text-slate-400 font-bold">Pré-contrôle instantané :</span>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              stats.personalPronounsCount === 0 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
            }`}>
              {stats.personalPronounsCount === 0 ? '✓ Style impersonnel' : `⚠️ ${stats.personalPronounsCount} pronoms subjectifs`}
            </span>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              stats.hasOrcid 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                : 'bg-rose-950/80 text-rose-300 border border-rose-800/60'
            }`}>
              {stats.hasOrcid ? '✓ ORCID 16 chiffres' : '⚠️ ORCID manquant'}
            </span>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              stats.hasPhone 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
            }`}>
              {stats.hasPhone ? '✓ Téléphone' : '⚠️ Téléphone manquant'}
            </span>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              stats.hasBilingual 
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
            }`}>
              {stats.hasBilingual ? '✓ Bilingue Résumé/Abstract' : '⚠️ Bilinguisme à vérifier'}
            </span>

            <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${
              stats.hasEndSections
                ? 'bg-emerald-950/80 text-emerald-300 border border-emerald-800/60'
                : 'bg-amber-950/80 text-amber-300 border border-amber-800/60'
            }`}>
              {stats.hasEndSections ? '✓ Sections de fin' : '⚠️ 6 sections de fin requises'}
            </span>
          </div>

          <div className="text-xs text-slate-500 font-mono">
            Constitution RCST 2026
          </div>
        </div>

        {/* Audit Action Button */}
        <div className="mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-slate-800">
          <div className="text-xs text-slate-400 flex items-center gap-2">
            <Info className="w-4 h-4 text-sky-400 flex-shrink-0" />
            <span>Les artéfacts d'extraction technique (sauts de ligne, exposants aplatis) sont tolérés sans pénalité.</span>
          </div>

          <button
            onClick={() => onAudit(fileDetails?.name)}
            disabled={isLoading || !text.trim() || stats.words < 20}
            className="w-full sm:w-auto px-7 py-3 rounded-md bg-slate-100 hover:bg-white text-slate-950 font-serif font-semibold text-sm flex items-center justify-center gap-2.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                <span>Audit constitutionnel assermenté en cours...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-slate-950" />
                <span>Lancer l'Audit Officiel RCST</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
