import React, { useState, useRef, useEffect } from 'react';
import { 
  Plus, 
  Send, 
  FileText, 
  X, 
  Loader2, 
  Sparkles, 
  AlertCircle, 
  ChevronDown, 
  Clock, 
  BookOpen, 
  PenTool, 
  Layers, 
  ArrowRight,
  Mic,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { SAMPLE_MANUSCRIPTS } from '../data/samples';

import { useGovernance } from '../context/GovernanceContext';
import { AuditHistoryItem } from '../types/governance';

interface CentralHubProps {
  onAudit: (text: string, filename?: string) => Promise<void>;
  isLoading: boolean;
  onNavigateTab: (tab: 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa') => void;
  onLoadAuditFromHistory?: (item: AuditHistoryItem) => void;
}

/**
 * Composant de sphère 3D animée (Glowing Metallic Orb)
 * Inspirée directement de la sphère iridescente fluide du modèle de référence.
 */
const GlowingMetallicOrb: React.FC = () => {
  return (
    <div className="relative w-24 h-24 mb-6 flex items-center justify-center select-none group cursor-pointer">
      {/* Halo de lueur ambiante externe */}
      <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-rose-600/30 via-amber-500/25 to-pink-500/20 blur-xl animate-pulse" />
      
      {/* Sphère SVG avec dégradés métalliques et reflets liquides */}
      <svg
        viewBox="0 0 100 100"
        className="w-20 h-20 relative z-10 transition-transform duration-700 ease-out group-hover:scale-105"
      >
        <defs>
          {/* Dégradé de fond de la sphère (marron rouge métallisé) */}
          <radialGradient id="orbBg" cx="35%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#ff7b7b" />
            <stop offset="25%" stopColor="#e11d48" />
            <stop offset="60%" stopColor="#881337" />
            <stop offset="90%" stopColor="#350616" />
            <stop offset="100%" stopColor="#120108" />
          </radialGradient>

          {/* Dégradé pour les volutes liquides internes */}
          <linearGradient id="liquidSwirl" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#fecdd3" stopOpacity="0.9" />
            <stop offset="40%" stopColor="#fb7185" stopOpacity="0.7" />
            <stop offset="70%" stopColor="#be123c" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#fda4af" stopOpacity="0.8" />
          </linearGradient>

          {/* Reflet spéculaire éclatant */}
          <radialGradient id="specularGlow" cx="40%" cy="25%" r="35%">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.95" />
            <stop offset="50%" stopColor="#ffe4e6" stopOpacity="0.4" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </radialGradient>
        </defs>

        {/* Corps principal de la sphère */}
        <circle cx="50" cy="50" r="46" fill="url(#orbBg)" />

        {/* Ondulations métalliques / tourbillons internes */}
        <g opacity="0.85">
          <path
            d="M20 54 Q35 32 58 48 T84 56 Q72 74 46 72 T20 54 Z"
            fill="url(#liquidSwirl)"
            className="animate-pulse"
          />
          <path
            d="M26 40 Q45 28 66 38 T78 50 Q60 62 40 56 T26 40 Z"
            fill="none"
            stroke="#ffe4e6"
            strokeWidth="1.2"
            opacity="0.6"
          />
          <path
            d="M32 62 Q50 48 70 58"
            fill="none"
            stroke="#fecdd3"
            strokeWidth="0.8"
            opacity="0.4"
          />
        </g>

        {/* Reflet spéculaire en croissant en haut à droite */}
        <ellipse cx="42" cy="28" rx="20" ry="12" fill="url(#specularGlow)" />
        
        {/* Liseré fin de brillance périphérique */}
        <circle
          cx="50"
          cy="50"
          r="45.5"
          fill="none"
          stroke="rgba(255, 255, 255, 0.25)"
          strokeWidth="0.75"
        />
      </svg>
    </div>
  );
};

export const CentralHub: React.FC<CentralHubProps> = ({
  onAudit,
  isLoading,
  onNavigateTab,
  onLoadAuditFromHistory,
}) => {
  const { user } = useAuth();
  const [text, setText] = useState('');
  const [attachedFile, setAttachedFile] = useState<{ name: string; size: string; text?: string } | null>(null);
  const [isReadingFile, setIsReadingFile] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  
  // Menus déroulants de la boîte d'entrée
  const [modeAudit, setModeAudit] = useState<'normal' | 'express'>('normal');
  const [thinkDepth, setThinkDepth] = useState<'deep' | 'standard'>('deep');
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [showThinkMenu, setShowThinkMenu] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Auto-resize du champ textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      const scrollHeight = textareaRef.current.scrollHeight;
      textareaRef.current.style.height = `${Math.min(Math.max(scrollHeight, 52), 220)}px`;
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
        const res = await fetch('/api/extract-file', {
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
      setErrorMsg('Le texte soumis est trop court pour un audit éditorial valide (minimum 50 caractères).');
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

  const loadSample = (sampleText: string, sampleName: string) => {
    setText(sampleText);
    setAttachedFile({ name: sampleName, size: '24 Ko', text: sampleText });
    setErrorMsg(null);
  };

  const loadAndRunSample = (sample: typeof SAMPLE_MANUSCRIPTS[0]) => {
    onAudit(sample.text, `${sample.id}.docx`);
  };

  const { historyItems } = useGovernance();
  const displayRecent = historyItems.slice(0, 4);

  return (
    <div className="relative w-full max-w-3xl mx-auto flex flex-col items-center pt-8 pb-16 px-4">
      {/* Sphère métallique 3D animée */}
      <GlowingMetallicOrb />

      {/* Titres d'accueil épurés */}
      <div className="text-center mb-7">
        <p className="text-slate-400 text-xs sm:text-sm font-normal tracking-wide mb-1.5">
          Bonjour, {user?.name || 'Cher Éditeur'}
        </p>
        <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight uppercase">
          QUE SOUHAITEZ-VOUS AUDITER AUJOURD'HUI ?
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 mt-2 font-normal">
          Analyse de conformité éditoriale RCST, normes APA 7 et style impersonnel
        </p>
      </div>

      {/* Message d'erreur discret */}
      {errorMsg && (
        <div className="w-full mb-4 px-4 py-2.5 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-xs flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button onClick={() => setErrorMsg(null)} className="text-slate-400 hover:text-white cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Boîte de saisie principale arrondie avec bordure néon subtile (Ask Anything) */}
      <div className="w-full relative group mb-7">
        {/* Bordure lueur gradient subtile (cyan à orange) */}
        <div className="absolute -inset-[1px] rounded-2xl bg-gradient-to-r from-sky-500/20 via-purple-500/20 to-amber-500/30 opacity-70 group-hover:opacity-100 transition-opacity blur-[1px] pointer-events-none" />

        <div className="relative w-full rounded-2xl bg-[#0c0e14] border border-white/[0.08] shadow-2xl p-4 flex flex-col transition-all">
          {/* Fichier joint s'il existe */}
          {attachedFile && (
            <div className="mb-3 inline-flex items-center gap-2 px-3 py-1.5 rounded-lg bg-[#141824] border border-white/10 text-xs text-slate-200 self-start">
              <FileText className="w-3.5 h-3.5 text-amber-400" />
              <span className="font-medium max-w-[260px] truncate">{attachedFile.name}</span>
              <span className="text-[10px] text-slate-400">({attachedFile.size})</span>
              <button
                onClick={() => setAttachedFile(null)}
                className="ml-1 text-slate-400 hover:text-red-400 cursor-pointer"
                title="Retirer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Zone de texte principale */}
          <textarea
            ref={textareaRef}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Collez ici un extrait ou les sections d'un manuscrit à auditer..."
            rows={2}
            className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm focus:outline-none resize-none leading-relaxed"
          />

          {/* Barre d'outils inférieure intégrée */}
          <div className="flex items-center justify-between pt-3 mt-1 border-t border-white/[0.04]">
            {/* Outils gauches : Bouton +, Sélecteur Normal / Deep Think */}
            <div className="flex items-center gap-2">
              {/* Bouton Upload + */}
              <input
                ref={fileInputRef}
                type="file"
                accept=".docx,.pdf,.txt,.md,.doc"
                className="hidden"
                onChange={handleFileUpload}
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={isReadingFile || isLoading}
                className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-all cursor-pointer disabled:opacity-50"
                title="Importer un fichier (.docx, .pdf, .txt)"
              >
                {isReadingFile ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-400" />
                ) : (
                  <Plus className="w-3.5 h-3.5" />
                )}
              </button>

              {/* Mode Normal / Audit Rapide */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowModeMenu(!showModeMenu)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <span className="text-[11px]">{modeAudit === 'normal' ? 'Normal' : 'Audit Rapide'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {showModeMenu && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-36 rounded-xl bg-[#141722] border border-white/10 shadow-xl py-1 z-30 text-xs">
                    <button
                      onClick={() => { setModeAudit('normal'); setShowModeMenu(false); }}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span>Normal</span>
                      {modeAudit === 'normal' && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                    <button
                      onClick={() => { setModeAudit('express'); setShowModeMenu(false); }}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span>Audit Rapide</span>
                      {modeAudit === 'express' && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                  </div>
                )}
              </div>

              {/* Sélecteur Deep Think */}
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowThinkMenu(!showThinkMenu)}
                  className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 border border-white/5 text-slate-300 hover:text-white text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  <Sparkles className="w-3 h-3 text-amber-400" />
                  <span className="text-[11px]">{thinkDepth === 'deep' ? 'Deep Think' : 'Standard'}</span>
                  <ChevronDown className="w-3 h-3 text-slate-400" />
                </button>
                {showThinkMenu && (
                  <div className="absolute left-0 bottom-full mb-1.5 w-40 rounded-xl bg-[#141722] border border-white/10 shadow-xl py-1 z-30 text-xs">
                    <button
                      onClick={() => { setThinkDepth('deep'); setShowThinkMenu(false); }}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span>Deep Think (6 Règles)</span>
                      {thinkDepth === 'deep' && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                    <button
                      onClick={() => { setThinkDepth('standard'); setShowThinkMenu(false); }}
                      className="w-full px-3 py-1.5 text-left text-slate-300 hover:text-white hover:bg-white/5 flex items-center justify-between cursor-pointer"
                    >
                      <span>Standard</span>
                      {thinkDepth === 'standard' && <Check className="w-3 h-3 text-amber-400" />}
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Outils droits : Bouton Exemple & Bouton Envoi Orange */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const s = SAMPLE_MANUSCRIPTS[0];
                  loadSample(s.text, 'Exemple_Non_Conforme.docx');
                }}
                className="px-2.5 py-1 rounded-lg hover:bg-white/5 text-slate-400 hover:text-slate-200 text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                title="Charger un exemple de test"
              >
                <span className="text-[11px]">Exemple</span>
              </button>

              {/* Bouton d'envoi orange lumineux */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isLoading || isReadingFile || (!text.trim() && !attachedFile?.text)}
                className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-white flex items-center justify-center shadow-lg shadow-orange-500/20 hover:shadow-orange-500/40 transition-all cursor-pointer disabled:opacity-30 disabled:cursor-not-allowed"
                title="Lancer l'audit de conformité"
              >
                {isLoading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5 -translate-y-0.5 translate-x-0.5" />
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Cartes d'action rapide (3 cartes horizontales comme dans le mockup) */}
      <div className="w-full grid grid-cols-1 sm:grid-cols-3 gap-3 mb-10">
        {/* Carte 1 : Lancer un Audit (Bleue) */}
        <div 
          onClick={() => {
            if (SAMPLE_MANUSCRIPTS[0]) {
              loadAndRunSample(SAMPLE_MANUSCRIPTS[0]);
            }
          }}
          className="group rounded-2xl bg-[#0c0e14] hover:bg-[#121520] border border-white/[0.06] hover:border-sky-500/30 p-4 flex flex-col justify-between transition-all cursor-pointer shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-sky-500/15 border border-sky-500/30 flex items-center justify-center text-sky-400 shadow-inner">
              <Layers className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-white group-hover:text-sky-300 transition-colors">
              Lancer un Audit de Manuscrit
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 group-hover:text-slate-200">
            <span>Démarrer l'audit</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Carte 2 : Consulter la Constitution RCST (Violette) */}
        <div 
          onClick={() => onNavigateTab('constitution')}
          className="group rounded-2xl bg-[#0c0e14] hover:bg-[#121520] border border-white/[0.06] hover:border-purple-500/30 p-4 flex flex-col justify-between transition-all cursor-pointer shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400 shadow-inner">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-white group-hover:text-purple-300 transition-colors">
              Consulter la Constitution RCST
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 group-hover:text-slate-200">
            <span>Explorer les règles</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>

        {/* Carte 3 : Style Impersonnel & APA 7 (Rouge/Orange) */}
        <div 
          onClick={() => onNavigateTab('style')}
          className="group rounded-2xl bg-[#0c0e14] hover:bg-[#121520] border border-white/[0.06] hover:border-amber-500/30 p-4 flex flex-col justify-between transition-all cursor-pointer shadow-lg"
        >
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400 shadow-inner">
              <PenTool className="w-4 h-4" />
            </div>
            <div className="text-xs font-semibold text-white group-hover:text-amber-300 transition-colors">
              Style Impersonnel & APA 7
            </div>
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 group-hover:text-slate-200">
            <span>Vérifier le style</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
          </div>
        </div>
      </div>

      {/* Section des audits et conversations récentes (Arbre connecté avec lignes fines) */}
      <div className="w-full">
        {/* Titre de section */}
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-300 mb-3">
          <Clock className="w-3.5 h-3.5 text-slate-400" />
          <span>Audits & Conversations Récentes</span>
        </div>

        {/* Arbre avec branches connectées */}
        <div className="relative pl-3 border-l border-white/[0.08] space-y-3.5">
          {displayRecent.map((item) => (
            <div 
              key={item.id} 
              onClick={() => {
                if (onLoadAuditFromHistory) {
                  onLoadAuditFromHistory(item);
                } else {
                  onAudit(item.manuscriptText, item.sourceFilename);
                }
              }}
              className="relative flex items-center justify-between text-xs text-slate-400 hover:text-white transition-colors cursor-pointer group"
            >
              {/* Ligne horizontale de branchement */}
              <div className="absolute -left-3 top-1/2 -translate-y-1/2 w-2.5 h-[1px] bg-white/[0.08] group-hover:bg-amber-400/50 transition-colors" />

              <div className="flex items-center gap-2 truncate max-w-[420px]">
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                  item.conformityScore >= 80 ? 'bg-emerald-400' : item.conformityScore >= 60 ? 'bg-amber-400' : 'bg-rose-400'
                }`} />
                <span className="truncate font-normal group-hover:text-slate-200">
                  {item.title}
                </span>
              </div>
              <span className="text-[11px] text-slate-600 group-hover:text-slate-400 font-mono shrink-0 ml-4">
                {item.timestamp}
              </span>
            </div>
          ))}
        </div>

        {/* Lien "Voir plus" */}
        <div className="mt-4 pl-3">
          <button 
            onClick={() => onNavigateTab('constitution')}
            className="text-xs text-slate-400 hover:text-amber-400 flex items-center gap-1 transition-colors cursor-pointer"
          >
            <span>Voir plus</span>
            <ArrowRight className="w-3 h-3" />
          </button>
        </div>
      </div>
    </div>
  );
};
