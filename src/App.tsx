/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { Header } from './components/Header';
import { ManuscriptEditor } from './components/ManuscriptEditor';
import { AuditReportView } from './components/AuditReportView';
import { ConstitutionGuide } from './components/ConstitutionGuide';
import { StyleReformulator } from './components/StyleReformulator';
import { ApaConverter } from './components/ApaConverter';
import { SAMPLE_MANUSCRIPTS } from './data/samples';
import { AuditReportData } from './types/audit';
import { AlertCircle, ShieldCheck, Scale, Award } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'audit' | 'constitution' | 'style' | 'apa'>('audit');
  // Initialize with Sample 1 so the user can immediately test and see the auditor in action
  const [manuscriptText, setManuscriptText] = useState<string>(SAMPLE_MANUSCRIPTS[0].text);
  const [report, setReport] = useState<AuditReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleRunAudit = async (sourceFilename?: string) => {
    if (!manuscriptText.trim()) return;
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscriptText, sourceFilename }),
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

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-amber-500/30 selection:text-amber-200">
      <Header activeTab={activeTab} setActiveTab={setActiveTab} />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        {error && (
          <div className="mb-6 p-4 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-200 text-sm flex items-center justify-between">
            <div className="flex items-center gap-3">
              <AlertCircle className="w-5 h-5 text-rose-400 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => setError(null)}
              className="text-xs px-2.5 py-1 rounded bg-rose-900/60 hover:bg-rose-900 text-rose-100"
            >
              Fermer
            </button>
          </div>
        )}

        {activeTab === 'audit' && (
          <>
            {report ? (
              <AuditReportView report={report} onReset={() => setReport(null)} />
            ) : (
              <ManuscriptEditor
                text={manuscriptText}
                setText={setManuscriptText}
                onAudit={handleRunAudit}
                isLoading={isLoading}
              />
            )}
          </>
        )}

        {activeTab === 'constitution' && <ConstitutionGuide />}
        {activeTab === 'style' && <StyleReformulator />}
        {activeTab === 'apa' && <ApaConverter />}
      </main>

      {/* Official Journal Footer */}
      <footer className="border-t border-slate-800/80 bg-slate-950 text-slate-400 py-8 text-xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center font-serif font-black text-amber-400">
              RCST
            </div>
            <div>
              <p className="font-semibold text-slate-200">
                Revue Congolaise des Sciences & Technologies (RCST)
              </p>
              <p className="text-[11px] text-slate-500">
                Organe officiel d'évaluation par les pairs et de publication scientifique • Kinshasa, RDC
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-[11px] text-slate-400">
            <span className="flex items-center gap-1">
              <Scale className="w-3.5 h-3.5 text-amber-400" /> Constitution RCST v2026
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-sky-400" /> APA 7ème Édition
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" /> Conformité IMRAD
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
