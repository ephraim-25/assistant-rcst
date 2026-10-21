import { apiFetch } from '../lib/api';
import React, { useState, useRef, useEffect } from 'react';
import { Plus, ArrowUp, FileText, X, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { SAMPLE_MANUSCRIPTS } from '../data/samples';

interface GeminiPromptInputProps {
  onAudit: (text: string, filename?: string) => Promise<void>;
  isLoading: boolean;
}

export const GeminiPromptInput: React.FC<GeminiPromptInputProps> = ({ onAudit, isLoading }) => {
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; text?: string } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize du textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 48), 260)}px`;
    }
  }, [text]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setErrorMsg(null);
    setIsReadingFile(true);
    const sizeStr = `${Math.round(file.size / 1024)} Ko`;
    const ext = file.name.split('.').pop()?.toLowerCase();

    try {
      if (ext === 'txt' || ext === 'md' || ext === 'text') {
        const fileContent = await file.text();
        setAttachedFile({ name: file.name, size: sizeStr, text: fileContent });
      } else if (ext === 'docx' || ext === 'pdf' || ext === 'doc') {
        const formData = new FormData();
        formData.append('file', file);
        const res = await apiFetch('/api/extract-file', {
          method: 'POST',
          body: formData,
        });
        if (!res.ok) throw new Error("Échec de l'extraction textuelle du document.");
        const data = await res.json();
        setAttachedFile({ name: file.name, size: sizeStr, text: data.text });
      } else {
        throw new Error('Format non supporté. Veuillez fournir un fichier .docx, .pdf, .txt ou .md.');
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Erreur lors de la lecture du fichier.');
      setAttachedFile(null);
    } finally {
      setIsReadingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSubmit = async () => {
    const content = attachedFile?.text ? attachedFile.text : text.trim();
    if (!content || isLoading || isReadingFile) return;

    if (content.length < 50) {
      setErrorMsg('Le texte soumis est trop court pour un audit éditorial valide.');
      return;
    }

    setErrorMsg(null);
    await onAudit(content, attachedFile?.name);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const loadSample = (sampleText: string) => {
    setText(sampleText);
    setAttachedFile(null);
    setErrorMsg(null);
  };

  return (
    <div className="w-full max-w-3xl mx-auto flex flex-col items-center">
      {/* Messages d'erreur discrets */}
      {errorMsg && (
        <div className="w-full mb-3 px-3.5 py-2 rounded-md bg-red-500/10 border border-red-500/20 text-red-300 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="hover:text-white text-slate-400">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Cadre de saisie Gemini Minimaliste */}
      <div className="w-full bg-slate-900 border border-white/10 hover:border-white/20 focus-within:border-white/30 rounded-lg p-2.5 transition-colors relative flex flex-col">
        {/* Fichier attaché en capsule discrète */}
        {attachedFile && (
          <div className="mb-2 px-2.5 py-1.5 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between w-fit max-w-full text-xs text-slate-200">
            <div className="flex items-center gap-2 truncate">
              <FileText className="w-3.5 h-3.5 text-sky-400 shrink-0" />
              <span className="font-medium truncate">{attachedFile.name}</span>
              <span className="text-xs text-slate-400">({attachedFile.size})</span>
            </div>
            <button
              onClick={() => setAttachedFile(null)}
              className="ml-3 p-0.5 hover:bg-white/10 rounded text-slate-400 hover:text-white"
              title="Retirer"
            >
              <X className="w-3 h-3" />
            </button>
          </div>
        )}

        {/* Zone de texte auto-extensible */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            attachedFile
              ? "Ajoutez des consignes particulières ou lancez l'audit..."
              : "Collez votre manuscrit ou cliquez sur + pour attacher un fichier Word ou PDF..."
          }
          rows={1}
          disabled={isLoading || isReadingFile}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none px-2 py-1 leading-relaxed"
        />

        {/* Barre d'outils inférieure sobre */}
        <div className="flex items-center justify-between pt-2 px-1 border-t border-white/5 mt-1">
          <div className="flex items-center gap-1.5">
            {/* Bouton Plus pour joindre un document */}
            <input
              ref={fileInputRef}
              type="file"
              accept=".docx,.doc,.pdf,.txt,.md"
              onChange={handleFileUpload}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isLoading || isReadingFile}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-slate-200 transition-colors cursor-pointer disabled:opacity-50"
              title="Attacher un manuscrit (.docx, .pdf, .txt)"
            >
              <Plus className="w-4 h-4" />
            </button>

            <span className="text-xs text-slate-500 font-mono pl-1">
              {attachedFile ? 'Fichier prêt' : text.trim() ? `${text.trim().split(/\s+/).length} mots` : '.docx, .pdf acceptés'}
            </span>
          </div>

          {/* Bouton Envoyer */}
          <button
            type="button"
            onClick={handleSubmit}
            disabled={(!text.trim() && !attachedFile) || isLoading || isReadingFile}
            className={`w-8 h-8 rounded-full flex items-center justify-center transition-colors ${
              (text.trim() || attachedFile) && !isLoading && !isReadingFile
                ? 'bg-white text-slate-950 hover:bg-slate-200 cursor-pointer'
                : 'bg-white/10 text-slate-500 cursor-not-allowed'
            }`}
            title="Lancer l'audit de conformité"
          >
            {isLoading || isReadingFile ? (
              <Loader2 className="w-4 h-4 animate-spin text-slate-400" />
            ) : (
              <ArrowUp className="w-4 h-4 stroke-[2.5]" />
            )}
          </button>
        </div>
      </div>

      {/* Exemples rapides de manuscrits en bas du prompt */}
      <div className="flex flex-wrap items-center justify-center gap-2 mt-4 text-xs text-slate-400">
        <span className="text-slate-500">Exemples de test :</span>
        {SAMPLE_MANUSCRIPTS.map((s, idx) => (
          <button
            key={s.id}
            onClick={() => loadSample(s.text)}
            className="px-2.5 py-1 rounded-full bg-white/5 hover:bg-white/10 border border-white/5 hover:border-white/10 text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            {idx === 0 ? 'Exemple 1 (Anomalies courantes)' : 'Exemple 2 (Conforme)'}
          </button>
        ))}
      </div>
    </div>
  );
};
