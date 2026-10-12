import React, { useState } from 'react';
import { 
  FileText, 
  MessageSquare, 
  Columns, 
  RefreshCw, 
  ArrowLeft, 
  FileCheck, 
  Sparkles,
  Download,
  Printer
} from 'lucide-react';
import { AuditReportData } from '../types/audit';
import { buildAuditRefs, AuditRef } from '../utils/auditRefs';
import { ManuscriptHighlighter } from './ManuscriptHighlighter';
import { AuditReferencesPanel } from './AuditReferencesPanel';
import { ChatPanel, ChatMessage } from './ChatPanel';

interface EditorialCockpitProps {
  manuscriptText: string;
  sourceFilename: string;
  report: AuditReportData;
  onReset: () => void;
  onReaudit?: () => void;
}

export const EditorialCockpit: React.FC<EditorialCockpitProps> = ({
  manuscriptText,
  sourceFilename,
  report,
  onReset,
}) => {
  const [activeRefId, setActiveRefId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);

  // Extraire les références numérotées à partir du rapport
  const auditRefs = React.useMemo(() => buildAuditRefs(report), [report]);

  const handleRefClick = (ref: AuditRef) => {
    setActiveRefId((prev) => (prev === ref.id ? null : ref.id));
  };

  const handleAskChatAboutRef = (ref: AuditRef) => {
    setIsChatOpen(true);
    setActiveRefId(ref.id);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-65px)] w-full overflow-hidden bg-[#0a0c10] text-slate-100">
      {/* Barre supérieure du Cockpit Éditorial */}
      <header className="shrink-0 h-14 bg-[#12141c] border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-20 shadow-sm">
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-all cursor-pointer"
            title="Revenir à l'accueil"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Nouveau manuscrit</span>
          </button>

          <div className="h-4 w-px bg-white/10" />

          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
              {sourceFilename.endsWith('.docx') ? 'Microsoft Word' : sourceFilename.endsWith('.pdf') ? 'Fichier PDF' : 'Document'}
            </span>
            <span className="text-xs font-semibold text-slate-200 truncate max-w-[240px]">
              {sourceFilename}
            </span>
          </div>
        </div>

        {/* Actions centrales & indicateurs */}
        <div className="flex items-center gap-3">
          <div className="hidden md:flex items-center gap-2 text-xs font-mono">
            <span className="text-slate-400">Réf. dossier :</span>
            <span className="text-slate-200 font-bold">{report.referenceId || 'RCST-2026-AUDIT'}</span>
          </div>

          <div className="h-4 w-px bg-white/10 hidden md:block" />

          {/* Bouton de bascule du tiroir de Chat */}
          <button
            onClick={() => setIsChatOpen(!isChatOpen)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium transition-all cursor-pointer ${
              isChatOpen
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300 shadow-sm'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Assistant Éditorial</span>
            {chatHistory.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500 text-slate-950 font-bold text-[9px] flex items-center justify-center">
                {chatHistory.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Contenu principal en mode Split-Screen / Multicolonne */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Colonne 1 : Visualiseur de manuscrit avec surbrillance Word-like (Gauche) */}
        <div className="flex-1 min-w-[340px] h-full overflow-hidden border-r border-white/10">
          <ManuscriptHighlighter
            text={manuscriptText}
            auditRefs={auditRefs}
            activeRefId={activeRefId}
            sourceFilename={sourceFilename}
            onRefClick={handleRefClick}
          />
        </div>

        {/* Colonne 2 : Rapport d'audit détaillé et repères Réf. [1], [2] (Centre/Droite) */}
        <div className="w-[380px] lg:w-[420px] shrink-0 h-full overflow-hidden border-r border-white/10">
          <AuditReferencesPanel
            refs={auditRefs}
            report={report}
            activeRefId={activeRefId}
            onRefClick={handleRefClick}
          />
        </div>

        {/* Colonne 3 : Tiroir de Chat contextuel interactif (Droite escamotable) */}
        {isChatOpen && (
          <div className="w-[340px] lg:w-[380px] shrink-0 h-full overflow-hidden animate-fadeIn shadow-2xl">
            <ChatPanel
              manuscriptText={manuscriptText}
              auditReport={report}
              history={chatHistory}
              onHistoryChange={setChatHistory}
            />
          </div>
        )}
      </div>
    </div>
  );
};
