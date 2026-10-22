import { apiFetch } from '../lib/api';
import React, { useState, useRef, useEffect } from 'react';
import { Paperclip, FileText, X, Loader2, AlertCircle, ArrowUp } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGovernance } from '../context/GovernanceContext';
import { SAMPLE_MANUSCRIPTS } from '../data/samples';
import { AuditHistoryItem } from '../types/governance';

interface CentralHubProps {
  onAudit: (text: string, filename?: string, sourceFile?: File) => Promise<void>;
  isLoading: boolean;
  onNavigateTab: (
    tab: 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa'
  ) => void;
  onLoadAuditFromHistory?: (item: AuditHistoryItem) => void;
  onSetFile?: (file: File | null) => void;
}

const MIN_CHARS = 50;

const scoreTone = (score: number) =>
  score >= 80 ? 'bg-emerald-400' : score >= 55 ? 'bg-amber-400' : 'bg-rose-400';

export const CentralHub: React.FC<CentralHubProps> = ({
  onAudit,
  isLoading,
  onNavigateTab,
  onLoadAuditFromHistory,
  onSetFile,
}) => {
  const { user } = useAuth();
  const { historyItems } = useGovernance();
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; text?: string; file?: File } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(Math.max(el.scrollHeight, 96), 320)}px`;
  }, [text]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setErrorMsg(null);
    setIsReadingFile(true);
    const size = `${Math.max(1, Math.round(file.size / 1024))} Ko`;
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'txt' || ext === 'md' || ext === 'text') {
        setAttachedFile({ name: file.name, size, text: await file.text(), file });
        onSetFile?.(file);
      } else if (ext === 'docx' || ext === 'pdf' || ext === 'doc') {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiFetch('/api/extract-file', { method: 'POST', body: formData });
        if (!res.ok) throw new Error('Le texte du document n\'a pas pu être extrait.');
        const data = await res.json();
        setAttachedFile({ name: file.name, size, text: data.text, file });
        onSetFile?.(file);
      } else {
        throw new Error('Format non pris en charge. Utilisez un fichier .docx, .pdf, .txt ou .md.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Le fichier n\'a pas pu être lu.');
      setAttachedFile(null);
      onSetFile?.(null);
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const content = attachedFile?.text ? attachedFile.text : text.trim();
  const canSubmit = content.length > 0 && !isLoading && !isReadingFile;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    if (content.length < MIN_CHARS) {
      setErrorMsg(`Le texte est trop court pour être analysé (${MIN_CHARS} caractères minimum).`);
      return;
    }
    setErrorMsg(null);
    await onAudit(content, attachedFile?.name, attachedFile?.file);
  };

  // Ctrl/Cmd + Entrée lance l'audit ; Entrée seule garde son sens (saut de ligne),
  // pour ne pas envoyer un manuscrit à moitié collé.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const loadSample = (sample: (typeof SAMPLE_MANUSCRIPTS)[number]) => {
    setText(sample.text);
    setAttachedFile({ name: `${sample.id}.docx`, size: '—', text: sample.text });
    onSetFile?.(null); // Pas de fichier réel pour les samples
    setErrorMsg(null);
  };

  const firstName = (user?.name || '').split(' ')[0];
  const recent = historyItems.filter((i) => !i.isArchived).slice(0, 4);

  return (
    <div className="mx-auto w-full max-w-2xl px-6 pb-16 pt-14 sm:pt-20">
      <header className="rcst-enter">
        <h1 className="text-[28px] font-semibold leading-tight tracking-tight text-slate-50">
          Quel manuscrit voulez-vous vérifier ?
        </h1>
        <p className="mt-2 text-[15px] leading-relaxed text-slate-400">
          {firstName ? `${firstName}, déposez` : 'Déposez'} le fichier Word de l’auteur ou collez son texte.
          Le rapport indique ce qui est à corriger, ce qui est à vérifier et ce qui est conforme.
        </p>
      </header>

      {errorMsg && (
        <div
          role="alert"
          className="mt-6 flex items-start justify-between gap-3 rounded-md border border-rose-500/40 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-100"
        >
          <span className="flex items-start gap-2.5">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
            {errorMsg}
          </span>
          <button onClick={() => setErrorMsg(null)} aria-label="Fermer le message" className="text-slate-400 hover:text-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      <section className="mt-8 rounded-lg border border-slate-700 bg-slate-900 focus-within:border-sky-400/70 transition-colors duration-150">
        {attachedFile && (
          <div className="flex items-center gap-2 border-b border-slate-800 px-4 py-2.5 text-sm text-slate-200">
            <FileText className="h-4 w-4 shrink-0 text-slate-400" aria-hidden />
            <span className="truncate font-medium">{attachedFile.name}</span>
            <span className="text-xs text-slate-500">{attachedFile.size}</span>
            <button
              onClick={() => {
                setAttachedFile(null);
                setText('');
                onSetFile?.(null);
              }}
              aria-label="Retirer le fichier"
              className="ml-auto grid h-6 w-6 place-items-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}

        <textarea
          ref={textareaRef}
          value={attachedFile ? '' : text}
          disabled={Boolean(attachedFile)}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          rows={3}
          placeholder={attachedFile ? 'Le texte du fichier joint sera analysé.' : 'Collez le texte du manuscrit ici'}
          className="block w-full resize-none bg-transparent px-4 py-3.5 text-[15px] leading-relaxed text-slate-100 placeholder:text-slate-500 focus:outline-none disabled:cursor-default"
          aria-label="Texte du manuscrit"
        />

        <div className="flex items-center justify-between gap-3 border-t border-slate-800 px-3 py-2.5">
          <div className="flex items-center gap-1">
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.pdf,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isReadingFile}
              className="flex h-8 items-center gap-2 rounded-md px-2.5 text-sm text-slate-300 hover:bg-slate-800 hover:text-slate-50"
            >
              {isReadingFile ? (
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
              ) : (
                <Paperclip className="h-4 w-4" aria-hidden />
              )}
              {isReadingFile ? 'Lecture du fichier…' : 'Joindre un fichier'}
            </button>
            <span className="hidden text-xs text-slate-500 sm:inline">Word, PDF ou texte</span>
          </div>

          <button
            onClick={handleSubmit}
            disabled={!canSubmit}
            className="flex h-9 items-center gap-2 rounded-md bg-slate-100 px-3.5 text-sm font-semibold text-slate-950 hover:bg-white disabled:bg-slate-800 disabled:text-slate-500"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden /> Analyse en cours…
              </>
            ) : (
              <>
                Lancer l’audit <ArrowUp className="h-4 w-4" aria-hidden />
              </>
            )}
          </button>
        </div>
      </section>
      <p className="mt-2 text-xs text-slate-500">
        Ctrl + Entrée lance l’audit. Le fichier de l’auteur n’est jamais modifié.
      </p>

      {/* Reprendre */}
      <section className="mt-12" aria-labelledby="recent-title">
        <h2 id="recent-title" className="text-sm font-medium text-slate-300">
          Audits récents
        </h2>
        {recent.length === 0 ? (
          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            Aucun audit pour l’instant. Pour voir le résultat sur un cas réaliste, chargez un manuscrit d’exemple :
          </p>
        ) : (
          <ul className="mt-2 divide-y divide-slate-800 border-y border-slate-800">
            {recent.map((item) => (
              <li key={item.id}>
                <button
                  onClick={() => onLoadAuditFromHistory?.(item)}
                  className="flex w-full items-center justify-between gap-4 px-1 py-3 text-left hover:bg-slate-900"
                >
                  <span className="min-w-0 truncate text-[15px] text-slate-200">{item.title}</span>
                  <span className="flex shrink-0 items-center gap-2 text-xs text-slate-500">
                    <span className={`h-1.5 w-1.5 rounded-full ${scoreTone(item.conformityScore)}`} aria-hidden />
                    {item.conformityScore}/100 · {item.timestamp}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5">
          <h3 className="text-sm font-medium text-slate-300">Manuscrits d’exemple</h3>
          <ul className="mt-1.5">
            {SAMPLE_MANUSCRIPTS.map((sample) => (
              <li key={sample.id}>
                <button
                  onClick={() => loadSample(sample)}
                  className="w-full py-1.5 text-left text-sm text-slate-400 underline-offset-4 hover:text-slate-100 hover:underline"
                >
                  {sample.name.replace(/^Exemple \d : /, '')}
                </button>
              </li>
            ))}
          </ul>
        </div>

        <p className="mt-8 text-sm text-slate-500">
          Une règle vous échappe ?{' '}
          <button onClick={() => onNavigateTab('constitution')} className="text-sky-400 underline-offset-4 hover:underline">
            Consulter la Constitution RCST
          </button>
          .
        </p>
      </section>
    </div>
  );
};
