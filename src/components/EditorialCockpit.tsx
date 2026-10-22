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
import { AuditReportView } from './AuditReportView';

interface EditorialCockpitProps {
  manuscriptText: string;
  sourceFilename: string;
  sourceFile?: File | null;
  report: AuditReportData;
  onReset: () => void;
  onReaudit?: () => void;
}

export const EditorialCockpit: React.FC<EditorialCockpitProps> = ({
  manuscriptText,
  sourceFilename,
  sourceFile,
  report,
  onReset,
}) => {
  const [activeRefId, setActiveRefId] = useState<number | null>(null);
  const [isChatOpen, setIsChatOpen] = useState<boolean>(true);
  const [showFullReport, setShowFullReport] = useState<boolean>(false);
  // Sous 1024 px, un seul volet à la fois (manuscrit, constats ou assistant)
  const [pane, setPane] = useState<'text' | 'report' | 'chat'>('report');
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
    <div className="flex flex-col h-full w-full overflow-hidden bg-slate-950 text-slate-100">
      {/* Barre supérieure du Cockpit Éditorial */}
      <header className="shrink-0 h-14 bg-slate-900 border-b border-white/10 px-4 sm:px-6 flex items-center justify-between z-20">
        <div className="flex items-center gap-3">
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
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

          {/* Bouton de bascule Vue Rapport / Constats */}
          <button
            onClick={() => setShowFullReport(!showFullReport)}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
              showFullReport
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <FileText className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">{showFullReport ? 'Constats' : 'Rapport complet'}</span>
          </button>

          {/* Bouton de bascule du tiroir de Chat */}
          <button
            onClick={() => {
              // Mobile : le bouton ouvre le volet Assistant ; ordinateur : il affiche ou masque la colonne
              if (window.matchMedia('(max-width: 1023px)').matches) {
                setIsChatOpen(true);
                setPane('chat');
              } else {
                setIsChatOpen(!isChatOpen);
              }
            }}
            className={`flex items-center gap-2 px-3 py-1.5 rounded-lg border text-xs font-medium cursor-pointer ${
              isChatOpen
                ? 'bg-sky-500/20 border-sky-500/40 text-sky-300'
                : 'bg-white/5 hover:bg-white/10 border-white/10 text-slate-300 hover:text-white'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5 text-sky-400" />
            <span className="hidden sm:inline">Assistant Éditorial</span>
            {chatHistory.length > 0 && (
              <span className="w-4 h-4 rounded-full bg-sky-500 text-slate-950 font-bold text-xs flex items-center justify-center">
                {chatHistory.length}
              </span>
            )}
          </button>
        </div>
      </header>

      {/* Sélecteur de volet (mobile et tablette) */}
      <div role="tablist" className="flex shrink-0 border-b border-white/10 bg-slate-950 lg:hidden">
        {([['text', 'Manuscrit'], ['report', 'Constats'], ['chat', 'Assistant']] as const).map(([id, label]) => (
          <button
            key={id}
            role="tab"
            aria-selected={pane === id}
            onClick={() => setPane(id)}
            className={`h-11 flex-1 text-sm font-medium ${
              pane === id ? 'border-b-2 border-slate-100 text-slate-100' : 'text-slate-400'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Contenu principal en mode Split-Screen / Multicolonne */}
      <div className="flex-1 flex overflow-hidden relative">
        {/* Colonne 1 : Visualiseur de manuscrit avec surbrillance Word-like (Gauche) */}
        <div className={`${pane === 'text' ? 'block' : 'hidden'} lg:block flex-1 lg:min-w-[340px] h-full overflow-hidden border-r border-white/10`}>
          <ManuscriptHighlighter
            text={manuscriptText}
            auditRefs={auditRefs}
            activeRefId={activeRefId}
            sourceFilename={sourceFilename}
            onRefClick={handleRefClick}
          />
        </div>

        {/* Colonne 2 : Rapport d'audit détaillé et repères Réf. [1], [2] (Centre/Droite) */}
        <div className={`${pane === 'report' ? 'block' : 'hidden'} lg:block w-full lg:w-[420px] shrink-0 h-full overflow-hidden border-r border-white/10`}>
          {showFullReport ? (
            <div className="h-full overflow-y-auto">
              <AuditReportView
                report={report}
                onReset={onReset}
                sourceFile={sourceFile}
                manuscriptText={manuscriptText}
              />
            </div>
          ) : (
            <AuditReferencesPanel
              refs={auditRefs}
              report={report}
              activeRefId={activeRefId}
              onRefClick={handleRefClick}
              sourceFile={sourceFile}
            />
          )}
        </div>

        {/* Colonne 3 : Tiroir de Chat contextuel interactif (Droite escamotable) */}
        {isChatOpen && (
          <div className={`${pane === 'chat' ? 'block' : 'hidden'} lg:block w-full lg:w-[380px] shrink-0 h-full overflow-hidden rcst-enter`}>
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
