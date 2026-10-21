import { apiFetch } from './lib/api';
import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { GovernanceProvider, useGovernance } from './context/GovernanceContext';
import { LoginScreen } from './components/LoginScreen';
import { Sidebar } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { CentralHub } from './components/CentralHub';
import { EditorialCockpit } from './components/EditorialCockpit';
import { ReviewerDashboard } from './components/ReviewerDashboard';
import { AdminGovernanceDashboard } from './components/AdminGovernanceDashboard';
import { UserProfileModal } from './components/UserProfileModal';
import { ConstitutionGuide } from './components/ConstitutionGuide';
import { StyleReformulator } from './components/StyleReformulator';
import { ApaConverter } from './components/ApaConverter';
import { AuditReportData } from './types/audit';
import { AuditHistoryItem } from './types/governance';
import { AlertCircle } from 'lucide-react';

export type AppView = 
  | 'hub' 
  | 'cockpit' 
  | 'reviewer-dashboard' 
  | 'admin-dashboard' 
  | 'constitution' 
  | 'style' 
  | 'apa';

function EditorialEnterpriseApp() {
  const { isAuthenticated, authReady, user } = useAuth();
  const { addAuditToHistory } = useGovernance();

  const [activeView, setActiveView] = useState<AppView>('hub');
  const [report, setReport] = useState<AuditReportData | null>(null);
  const [currentManuscriptText, setCurrentManuscriptText] = useState<string>('');
  const [currentSourceFilename, setCurrentSourceFilename] = useState<string>('Manuscrit_RCST.docx');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState<boolean>(false);

  // Blocage de sécurité : si non authentifié, afficher l'écran de connexion institutionnel
  if (!authReady) {
    return null; // vérification de la session auprès du serveur en cours
  }
  if (!isAuthenticated) {
    return <LoginScreen />;
  }

  /**
   * Lancement d'un audit de manuscrit via le backend FastAPI
   */
  const handleRunAudit = async (manuscriptText: string, sourceFilename?: string) => {
    if (!manuscriptText.trim()) return;
    setIsLoading(true);
    setError(null);
    const fname = sourceFilename || 'Manuscrit_001_Final.docx';
    setCurrentManuscriptText(manuscriptText);
    setCurrentSourceFilename(fname);

    try {
      const response = await apiFetch('/api/audit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ manuscriptText, sourceFilename: fname }),
      });

      if (!response.ok) {
        throw new Error(`Erreur du serveur d'audit (Code ${response.status})`);
      }

      const data = await response.json();
      const enrichedReport: AuditReportData = {
        ...data,
        referenceId: `RCST-AUDIT-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        timestamp: new Date().toLocaleDateString('fr-FR', {
          day: '2-digit',
          month: 'long',
          year: 'numeric',
        }),
      };

      setReport(enrichedReport);

      // Ajouter automatiquement dans l'historique de gouvernance
      const derivedTitle = fname.replace(/\.[^/.]+$/, '').replace(/_/g, ' ');
      addAuditToHistory(
        derivedTitle,
        fname,
        manuscriptText,
        enrichedReport,
        user?.id || 'usr-anon',
        user?.name || 'Éditeur Anonyme'
      );

      // Basculer immédiatement vers le Cockpit Éditorial Split-Screen
      setActiveView('cockpit');
    } catch (err: any) {
      console.error('Erreur audit:', err);
      setError(
        err.message || 'Une anomalie est survenue lors de l’analyse éditoriale du manuscrit.'
      );
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Recharge un audit directement depuis l'historique dans la Sidebar
   */
  const handleLoadAuditFromHistory = (item: AuditHistoryItem) => {
    setCurrentManuscriptText(item.manuscriptText);
    setCurrentSourceFilename(item.sourceFilename);
    setReport(item.report);
    setActiveView('cockpit');
  };

  const handleReset = () => {
    setReport(null);
    setCurrentManuscriptText('');
    setActiveView('hub');
  };

  const handleNewAudit = () => {
    setReport(null);
    setCurrentManuscriptText('');
    setActiveView('hub');
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-950 text-slate-100 font-sans selection:bg-amber-500/30 selection:text-amber-200">
      {/* ─── VOLET LATÉRAL DÉROULANT & RÉTRACTABLE (STYLE GEMINI/CHATGPT) ─── */}
      <Sidebar
        activeView={activeView}
        setActiveView={setActiveView}
        hasActiveReport={!!report}
        onNewAudit={handleNewAudit}
        onLoadAuditFromHistory={handleLoadAuditFromHistory}
        onOpenProfile={() => setIsProfileModalOpen(true)}
      />

      {/* ─── CONTENU PRINCIPAL : TOPBAR + VUES DYNAMIQUES ─── */}
      <div className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Lueur d'ambiance cuivrée discrète sur le quadrant supérieur droit */}
        <div 
          className="absolute top-0 right-0 w-[550px] h-[400px] pointer-events-none opacity-40 z-0"
          style={{
            background: 'radial-gradient(circle at 75% 20%, rgba(180, 83, 9, 0.22) 0%, rgba(147, 51, 234, 0.08) 40%, transparent 70%)'
          }}
        />

        {/* Barre supérieure unifiée */}
        <TopBar
          activeView={activeView}
          setActiveView={setActiveView}
          hasActiveReport={!!report}
          onOpenProfile={() => setIsProfileModalOpen(true)}
        />

        {/* Zone centrale d'affichage */}
        <main className="flex-1 overflow-y-auto relative z-10 flex flex-col">
          {error && (
            <div className="max-w-4xl mx-auto w-full mt-4 px-4">
              <div className="p-3.5 rounded-md bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
                  <span>{error}</span>
                </div>
                <button
                  onClick={() => setError(null)}
                  className="text-xs px-2.5 py-1 rounded bg-red-900/60 hover:bg-red-900 text-red-100 cursor-pointer"
                >
                  Fermer
                </button>
              </div>
            </div>
          )}

          {/* VUE 1 : CENTRAL HUB & PROMPT CENTER (LANDING PAGE) */}
          {activeView === 'hub' && (
            <CentralHub
              onAudit={handleRunAudit}
              isLoading={isLoading}
              onNavigateTab={(tab) => setActiveView(tab as AppView)}
              onLoadAuditFromHistory={handleLoadAuditFromHistory}
            />
          )}

          {/* VUE 2 : COCKPIT ÉDITORIAL SPLIT-SCREEN */}
          {activeView === 'cockpit' && report && (
            <div className="flex-1 flex flex-col h-full overflow-hidden">
              <EditorialCockpit
                manuscriptText={currentManuscriptText}
                sourceFilename={currentSourceFilename}
                report={report}
                onReset={handleReset}
              />
            </div>
          )}

          {/* Si cockpit sélectionné mais aucun rapport en cours */}
          {activeView === 'cockpit' && !report && (
            <div className="flex-1 flex flex-col items-center justify-center p-8 text-center space-y-4">
              <div className="w-16 h-16 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-slate-400">
                <AlertCircle className="w-8 h-8 text-amber-400" />
              </div>
              <h2 className="text-lg font-bold text-white">Aucun rapport actif dans le Cockpit</h2>
              <p className="text-xs text-slate-400 max-w-md">
                Sélectionnez un audit dans l'historique latéral ou soumettez un nouveau manuscrit depuis l'accueil.
              </p>
              <button
                onClick={() => setActiveView('hub')}
                className="px-4 py-2 rounded-md bg-amber-500 text-slate-950 font-bold text-xs"
              >
                Aller au Prompt Center
              </button>
            </div>
          )}

          {/* VUE 3 : TABLEAU DE BORD REVIEWER (ESPACE ÉDITEUR) */}
          {activeView === 'reviewer-dashboard' && (
            <ReviewerDashboard
              onStartAudit={handleRunAudit}
              onOpenProfile={() => setIsProfileModalOpen(true)}
            />
          )}

          {/* VUE 4 : TABLEAU DE BORD ADMINISTRATEUR (GOUVERNANCE SIGC & IA) */}
          {activeView === 'admin-dashboard' && (
            <AdminGovernanceDashboard />
          )}

          {/* VUE 5 : CONSTITUTION RCST */}
          {activeView === 'constitution' && (
            <div className="max-w-5xl w-full mx-auto px-6 py-8">
              <ConstitutionGuide />
            </div>
          )}

          {/* VUE 6 : ATELIER STYLE IMPERSONNEL */}
          {activeView === 'style' && (
            <div className="max-w-5xl w-full mx-auto px-6 py-8">
              <StyleReformulator />
            </div>
          )}

          {/* VUE 7 : VÉRIFICATEUR APA 7 */}
          {activeView === 'apa' && (
            <div className="max-w-5xl w-full mx-auto px-6 py-8">
              <ApaConverter />
            </div>
          )}
        </main>
      </div>

      {/* ─── MODALE MON PROFIL ÉDITORIAL ─── */}
      <UserProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <GovernanceProvider>
        <EditorialEnterpriseApp />
      </GovernanceProvider>
    </AuthProvider>
  );
}
