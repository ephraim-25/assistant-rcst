import React, { createContext, useContext, useState, useEffect } from 'react';
import { 
  AuditHistoryItem, 
  ReviewQueueItem, 
  AiGovernanceConfig, 
  SystemAuditLog,
  QueueItemStatus
} from '../types/governance';
import { SAMPLE_MANUSCRIPTS } from '../data/samples';
import { AuditReportData } from '../types/audit';

interface GovernanceContextType {
  historyItems: AuditHistoryItem[];
  queueItems: ReviewQueueItem[];
  aiConfig: AiGovernanceConfig;
  auditLogs: SystemAuditLog[];
  addAuditToHistory: (
    title: string, 
    sourceFilename: string, 
    manuscriptText: string, 
    report: AuditReportData, 
    userId: string, 
    userName: string
  ) => AuditHistoryItem;
  renameAudit: (id: string, newTitle: string) => void;
  toggleArchiveAudit: (id: string) => void;
  deleteAudit: (id: string) => void;
  updateQueueItemStatus: (id: string, newStatus: QueueItemStatus) => void;
  updateAiConfig: (partial: Partial<AiGovernanceConfig>) => void;
  logAuditEvent: (log: Omit<SystemAuditLog, 'id' | 'timestamp'>) => void;
}

const HISTORY_STORAGE_KEY = 'rcst_audit_history_v3';
const QUEUE_STORAGE_KEY = 'rcst_review_queue_v3';
const AI_CONFIG_STORAGE_KEY = 'rcst_ai_governance_config_v2';
const LOGS_STORAGE_KEY = 'rcst_system_audit_logs_v3';

const DEFAULT_AI_CONFIG: AiGovernanceConfig = {
  defaultModel: 'gemini-2.5-flash',
  temperature: 0.2, // Conforme aux exigences strictes de la Constitution RCST
  reviewerDailyQuota: 20,
  adminDailyQuota: -1, // Illimité
  maxOutputTokensAudit: 4096,
  maxOutputTokensChat: 2048,
  monthlyBudgetLimitTokens: 2_000_000,
  totalTokensConsumed: 485_240,
  budgetAlertThresholdPercent: 80,
};

function createMockReport(
  score: number,
  status: 'Conforme' | 'Conforme avec réserves' | 'Refusé - Modifications majeures requises',
  summary: string,
  decision: string,
  referenceId: string,
  timestamp: string
): AuditReportData {
  return {
    status,
    globalScore: score,
    summary,
    referenceId,
    timestamp,
    sections: {
      titleAndAuthors: {
        score: Math.min(100, score + 5),
        status: score >= 80 ? 'Conforme' : score >= 60 ? 'Partiellement conforme' : 'Non conforme',
        issues: score < 70 ? ['Présence de guillemets superflus', 'ORCID 16 chiffres manquant'] : [],
        recommendations: ['Renseigner les identifiants ORCID complets pour chaque co-auteur.'],
        isBilingualTitle: score >= 70,
        hasSuperfluousQuotes: score < 70,
        hasBulletedAuthors: score < 50,
        hasSuperscriptAffiliations: true,
        hasCorrespondingAsterisk: true,
        hasEmails: true,
        hasPhone: score >= 75,
        hasOrcid16Digits: score >= 85,
      },
      abstractAndKeywords: {
        score: Math.min(100, score + 10),
        status: score >= 75 ? 'Conforme' : 'Partiellement conforme',
        issues: [],
        recommendations: [],
        wordCountFr: 220,
        wordCountEn: 215,
        isBilingual: true,
        hasForbiddenSubtitles: score < 60,
        hasReferences: score < 50,
        keywordsCountFr: 5,
        keywordsCountEn: 5,
      },
      imradAndStructure: {
        score: score,
        status: score >= 80 ? 'Conforme' : 'Partiellement conforme',
        issues: [],
        recommendations: [],
        hasArabicNumbering: true,
        hasSuperfluousSubtitlesInIntro: false,
        introLengthCompliant: true,
        tablesAndFiguresCompliant: {
          tablesRomanBefore: score >= 80,
          figuresArabicAfter: true,
          redundancyDetected: false,
          notes: '',
        },
        mandatoryEndSections: {
          remerciements: true,
          financement: true,
          conflitInteret: true,
          considerationsEthiques: score >= 70,
          orcidAuteurs: score >= 85,
          contributionAuteursInitialsOnly: true,
        },
      },
      citationsAndReferences: {
        score: score,
        status: score >= 80 ? 'Conforme' : 'Non conforme',
        issues: score < 70 ? ['Citations avec crochets [1] détectées'] : [],
        recommendations: ['Remplacer par le format APA 7 (Auteur, Année).'],
        apa7Compliant: score >= 80,
        hasNumericStyleBracket: score < 70,
        crossReferencingValid: true,
        hangingIndentCompliant: true,
        alphabeticalOrderCompliant: true,
        missingFromBibliography: [],
        missingFromText: [],
        flaggedCitations: [],
      },
      style: {
        score: Math.max(25, score - 10),
        status: score >= 85 ? 'Conforme' : 'Non conforme',
        issues: score < 85 ? ['Présence du pronom « nous » et formules subjectives'] : [],
        recommendations: ['Réécrire en style impersonnel strict conforme à la Constitution RCST.'],
        isImpersonal: score >= 85,
        personalPronounsDetected: score < 85 ? ['nous', 'notre'] : [],
        sampleReformulations: [],
      },
    },
    priorityRecommendations: [
      'Appliquer le style impersonnel strict dans tout le document.',
      'Harmoniser les références bibliographiques au standard APA 7ème édition.',
    ],
    editorialBoardNotes: {
      decisionRecommendation: decision,
      confidentialComments: 'Rapport assisté par le moteur d’audit RCST.',
      ethicalChecklist: ['Approbation éthique institutionnelle contrôlée', 'ORCID vérifiés'],
      questionsForAuthors: ['Préciser le financement institutionnel'],
    },
  };
}

// Exemples initiaux pour peupler l'historique de manière représentative
const INITIAL_HISTORY: AuditHistoryItem[] = [];

// File de traitement initiale pour les Reviewers
const INITIAL_QUEUE: ReviewQueueItem[] = [];

// Logs initiaux de traçabilité système
const INITIAL_LOGS: SystemAuditLog[] = [];

const GovernanceContext = createContext<GovernanceContextType | undefined>(undefined);

export const GovernanceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [historyItems, setHistoryItems] = useState<AuditHistoryItem[]>(() => {
    try {
      const stored = localStorage.getItem(HISTORY_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_HISTORY;
    } catch {
      return INITIAL_HISTORY;
    }
  });

  const [queueItems, setQueueItems] = useState<ReviewQueueItem[]>(() => {
    try {
      const stored = localStorage.getItem(QUEUE_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_QUEUE;
    } catch {
      return INITIAL_QUEUE;
    }
  });

  const [aiConfig, setAiConfig] = useState<AiGovernanceConfig>(() => {
    try {
      const stored = localStorage.getItem(AI_CONFIG_STORAGE_KEY);
      if (stored) return JSON.parse(stored);
      return DEFAULT_AI_CONFIG;
    } catch {
      return DEFAULT_AI_CONFIG;
    }
  });

  const [auditLogs, setAuditLogs] = useState<SystemAuditLog[]>(() => {
    try {
      const stored = localStorage.getItem(LOGS_STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed) && parsed.length > 0) return parsed;
      }
      return INITIAL_LOGS;
    } catch {
      return INITIAL_LOGS;
    }
  });

  // Sauvegardes localStorage
  useEffect(() => {
    try {
      localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(historyItems));
    } catch (e) {
      console.error('Erreur sauvegarde historique:', e);
    }
  }, [historyItems]);

  useEffect(() => {
    try {
      localStorage.setItem(QUEUE_STORAGE_KEY, JSON.stringify(queueItems));
    } catch (e) {
      console.error('Erreur sauvegarde file de traitement:', e);
    }
  }, [queueItems]);

  useEffect(() => {
    try {
      localStorage.setItem(AI_CONFIG_STORAGE_KEY, JSON.stringify(aiConfig));
    } catch (e) {
      console.error('Erreur sauvegarde config IA:', e);
    }
  }, [aiConfig]);

  useEffect(() => {
    try {
      localStorage.setItem(LOGS_STORAGE_KEY, JSON.stringify(auditLogs));
    } catch (e) {
      console.error('Erreur sauvegarde logs:', e);
    }
  }, [auditLogs]);

  /**
   * Ajoute un audit complété dans l'historique et journalise l'événement
   */
  const addAuditToHistory = (
    title: string,
    sourceFilename: string,
    manuscriptText: string,
    report: AuditReportData,
    userId: string,
    userName: string
  ): AuditHistoryItem => {
    const score = report.globalScore || 50;
    const decision: any = score >= 85 ? 'accepted' : score >= 70 ? 'minor_revisions' : 'major_revisions';
    const estimatedTokens = Math.round(manuscriptText.length / 3) + 1200;

    const newItem: AuditHistoryItem = {
      id: `audit-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId,
      userName,
      title: title || sourceFilename.replace(/\.[^/.]+$/, ''),
      sourceFilename,
      conformityScore: score,
      status: decision,
      timestamp: 'Aujourd’hui, ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      createdAtMs: Date.now(),
      manuscriptText,
      report,
      isArchived: false,
      tokensUsed: estimatedTokens,
    };

    setHistoryItems((prev) => [newItem, ...prev]);

    // Incrémenter la consommation de tokens
    setAiConfig((prev) => ({
      ...prev,
      totalTokensConsumed: prev.totalTokensConsumed + estimatedTokens,
    }));

    // Enregistrer dans le journal d'audit
    logAuditEvent({
      userId,
      userName,
      userRole: 'reviewer',
      manuscriptTitle: newItem.title,
      tokensUsed: estimatedTokens,
      score,
      decision: report.editorialBoardNotes.decisionRecommendation || 'Audit complété',
      modelUsed: aiConfig.defaultModel,
    });

    return newItem;
  };

  const renameAudit = (id: string, newTitle: string) => {
    if (!newTitle.trim()) return;
    setHistoryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, title: newTitle.trim() } : item))
    );
  };

  const toggleArchiveAudit = (id: string) => {
    setHistoryItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, isArchived: !item.isArchived } : item))
    );
  };

  const deleteAudit = (id: string) => {
    setHistoryItems((prev) => prev.filter((item) => item.id !== id));
  };

  const updateQueueItemStatus = (id: string, newStatus: QueueItemStatus) => {
    setQueueItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, status: newStatus } : item))
    );
  };

  const updateAiConfig = (partial: Partial<AiGovernanceConfig>) => {
    setAiConfig((prev) => ({ ...prev, ...partial }));
  };

  const logAuditEvent = (log: Omit<SystemAuditLog, 'id' | 'timestamp'>) => {
    const newLog: SystemAuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      timestamp: new Date().toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: 'numeric' }) + ' ' + new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
    };
    setAuditLogs((prev) => [newLog, ...prev]);
  };

  return (
    <GovernanceContext.Provider
      value={{
        historyItems,
        queueItems,
        aiConfig,
        auditLogs,
        addAuditToHistory,
        renameAudit,
        toggleArchiveAudit,
        deleteAudit,
        updateQueueItemStatus,
        updateAiConfig,
        logAuditEvent,
      }}
    >
      {children}
    </GovernanceContext.Provider>
  );
};

export const useGovernance = (): GovernanceContextType => {
  const context = useContext(GovernanceContext);
  if (!context) {
    throw new Error('useGovernance doit être utilisé à l’intérieur d’un GovernanceProvider.');
  }
  return context;
};
