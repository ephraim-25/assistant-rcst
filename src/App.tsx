import React, { useState } from 'react';
import { Header } from './components/Header';
import { GeminiPromptInput } from './components/GeminiPromptInput';
import { EditorialCockpit } from './components/EditorialCockpit';
import { ConstitutionGuide } from './components/ConstitutionGuide';
import { StyleReformulator } from './components/StyleReformulator';
import { ApaConverter } from './components/ApaConverter';
import { AuditReportData } from './types/audit';
import { AlertCircle, ShieldCheck } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'audit' | 'constitution' | 'style' | 'apa'>('audit');
  const [report, setReport] = useState<AuditReportData | null>(null);
  const [currentManuscriptText, setCurrentManuscriptText] = useState<string>('');
  const [currentSourceFilename, setCurrentSourceFilename] = useState<string>('Manuscrit_RCST.docx');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = async (manuscriptText: string, sourceFilename?: string) => {
    if (!manuscriptText.trim()) return;
    setIsLoading(true);
    setError(null);
    const fname = sourceFilename || 'Manuscrit_001_Final.docx';
    setCurrentManuscriptText(manuscriptText);
    setCurrentSourceFilename(fname);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscriptText, sourceFilename: fname }),
      });

      if (!response.ok) {
        throw new Error(`Erreur du serveur d'audit (Code ${response.status})`);
      }

      const data = await response.json();
      setReport({
        ...data,
        referenceId: `RCST-AUDIT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      });
    } catch (err: any) {
      console.error('Erreur audit:', err);
      setError(
        err.message || 'Une anomalie est survenue lors de l’analyse éditoriale du manuscrit.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setReport(null);
    setCurrentManuscriptText('');
  };

  return (
    <div className="min-h-screen bg-[#0e1015] text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Si nous sommes sur l'onglet audit et qu'un rapport est actif, plein écran pour le Cockpit Éditorial */}
      {activeTab === 'audit' && report ? (
        <EditorialCockpit
          manuscriptText={currentManuscriptText}
          sourceFilename={currentSourceFilename}
          report={report}
          onReset={handleReset}
        />
      ) : (
        <main className="flex-1 max-w-5xl w-full mx-auto px-4 sm:px-6 py-8 flex flex-col">
          {error && (
            <div className="mb-6 p-4 rounded-xl bg-red-950/60 border border-red-800/80 text-red-200 text-sm flex items-center justify-between">
              <div className="flex items-center gap-3">
                <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                <span>{error}</span>
              </div>
              <button
                onClick={() => setError(null)}
                className="text-xs px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-900 text-red-100 cursor-pointer"
              >
                Fermer
              </button>
            </div>
          )}

          {activeTab === 'audit' && !report && (
            <div className="flex flex-col items-center justify-center my-auto py-8">
              {/* En-tête sobre style Gemini */}
              <div className="text-center mb-8 max-w-lg">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 text-xs font-medium mb-3">
                  <ShieldCheck className="w-3.5 h-3.5 text-sky-400" />
                  <span>Conseil Scientifique National • RDC</span>
                </div>
                <h1 className="text-2xl sm:text-3xl font-serif font-medium text-white tracking-tight">
                  Cockpit Éditorial & Audit RCST
                </h1>
                <p className="text-xs sm:text-sm text-slate-400 mt-2">
                  Contrôle de conformité scientifique souverain : Split-Screen interactif, détection des anomalies avec repères numérotés et assistant conversationnel.
                </p>
              </div>

              {/* Champ de saisie prompt minimaliste */}
              <GeminiPromptInput onAudit={handleRunAudit} isLoading={isLoading} />
            </div>
          )}

          {activeTab === 'constitution' && <ConstitutionGuide />}
          {activeTab === 'style' && <StyleReformulator />}
          {activeTab === 'apa' && <ApaConverter />}
        </main>
      )}

      {/* Footer sobre affiché uniquement hors du Cockpit plein écran */}
      {(!report || activeTab !== 'audit') && (
        <footer className="border-t border-white/5 bg-[#0b0c10] text-slate-500 py-4 text-xs">
          <div className="max-w-5xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2 text-center sm:text-left">
            <p>© 2026 Revue Congolaise des Sciences & Technologies (RCST). Tous droits réservés.</p>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span>Normes IMRAD</span>
              <span>•</span>
              <span>APA 7</span>
              <span>•</span>
              <span>Conseil Scientifique National</span>
            </div>
          </div>
        </footer>
      )}
    </div>
  );
}
