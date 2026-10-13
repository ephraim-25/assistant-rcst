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

const HISTORY_STORAGE_KEY = 'rcst_audit_history_v2';
const QUEUE_STORAGE_KEY = 'rcst_review_queue_v2';
const AI_CONFIG_STORAGE_KEY = 'rcst_ai_governance_config_v2';
const LOGS_STORAGE_KEY = 'rcst_system_audit_logs_v2';

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
const INITIAL_HISTORY: AuditHistoryItem[] = [
  {
    id: 'hist-001',
    userId: 'usr-admin-001',
    userName: 'Prof. Marcel Kalonji',
    title: 'Évaluation épidémiologique du paludisme à Kinshasa',
    sourceFilename: 'Manuscrit_Paludisme_Kingasani.docx',
    conformityScore: 42,
    status: 'major_revisions',
    timestamp: 'Aujourd’hui, 10:24',
    createdAtMs: Date.now() - 1000 * 60 * 60 * 2,
    manuscriptText: SAMPLE_MANUSCRIPTS[0].text,
    report: createMockReport(
      42,
      'Refusé - Modifications majeures requises',
      'Manuscrit comportant des non-conformités critiques : utilisation récurrente du pronom « nous », formatage bibliographique [1] non conforme aux normes APA 7, absence d’identifiant ORCID et omissions des sections finales.',
      'Modifications majeures requises avant réexamen par le comité',
      'RCST-2026-AUDIT-084',
      'Aujourd’hui, 10:24'
    ),
    isArchived: false,
    tokensUsed: 3120,
  },
  {
    id: 'hist-002',
    userId: 'usr-rev-002',
    userName: 'Dr. Nadine Masika',
    title: 'Optimisation des bétons de pouzzolane au Nord-Kivu',
    sourceFilename: 'Pouzzolane_Goma_GenieCivil.docx',
    conformityScore: 78,
    status: 'minor_revisions',
    timestamp: 'Aujourd’hui, 08:15',
    createdAtMs: Date.now() - 1000 * 60 * 60 * 4,
    manuscriptText: SAMPLE_MANUSCRIPTS[1]?.text || SAMPLE_MANUSCRIPTS[0].text,
    report: createMockReport(
      78,
      'Conforme avec réserves',
      'Excellente tenue rédactionnelle globale. Quelques réserves sur la numérotation des tableaux qui doivent être en chiffres romains et insertion requise de l’ORCID du 3ème co-auteur.',
      'Modifications mineures requises',
      'RCST-2026-AUDIT-083',
      'Aujourd’hui, 08:15'
    ),
    isArchived: false,
    tokensUsed: 2940,
  },
  {
    id: 'hist-003',
    userId: 'usr-admin-001',
    userName: 'Prof. Marcel Kalonji',
    title: 'Audit express : Structure du titre et résumé bilingue',
    sourceFilename: 'Extrait_Resume_Photovoltaique.docx',
    conformityScore: 88,
    status: 'accepted',
    timestamp: 'Il y a 3 jours',
    createdAtMs: Date.now() - 1000 * 60 * 60 * 24 * 3,
    manuscriptText: SAMPLE_MANUSCRIPTS[0].text,
    report: createMockReport(
      88,
      'Conforme',
      'Titre bilingue conforme, absence de guillemets superflus, résumé de 234 mots sans références bibliographiques.',
      'Conforme aux normes de publication RCST',
      'RCST-2026-AUDIT-079',
      '11 Oct. 2026'
    ),
    isArchived: false,
    tokensUsed: 2150,
  },
  {
    id: 'hist-004',
    userId: 'usr-rev-003',
    userName: 'Dr. Benjamin Lukusa',
    title: 'Vérification bibliographique APA 7ème édition',
    sourceFilename: 'Bibliographie_Hydraulique_KongoCentral.pdf',
    conformityScore: 62,
    status: 'minor_revisions',
    timestamp: '08 Oct. 2026',
    createdAtMs: Date.now() - 1000 * 60 * 60 * 24 * 6,
    manuscriptText: SAMPLE_MANUSCRIPTS[0].text,
    report: createMockReport(
      62,
      'Conforme avec réserves',
      'Présence de crochets [3], [4] résiduels dans la section Discussion à convertir en format APA 7.',
      'Modifications mineures - Harmonisation APA 7',
      'RCST-2026-AUDIT-071',
      '08 Oct. 2026'
    ),
    isArchived: false,
    tokensUsed: 1980,
  },
  {
    id: 'hist-005',
    userId: 'usr-admin-001',
    userName: 'Prof. Marcel Kalonji',
    title: 'Modélisation du potentiel minier du Katanga',
    sourceFilename: 'Geologie_Katanga_2026.docx',
    conformityScore: 91,
    status: 'accepted',
    timestamp: '25 Sept. 2026',
    createdAtMs: Date.now() - 1000 * 60 * 60 * 24 * 19,
    manuscriptText: SAMPLE_MANUSCRIPTS[0].text,
    report: createMockReport(
      91,
      'Conforme',
      'Conformité exemplaire à la Constitution de la RCST.',
      'Accepté pour publication dans le prochain numéro',
      'RCST-2026-AUDIT-055',
      '25 Sept. 2026'
    ),
    isArchived: false,
    tokensUsed: 3400,
  }
];

// File de traitement initiale pour les Reviewers
const INITIAL_QUEUE: ReviewQueueItem[] = [
  {
    id: 'queue-001',
    title: 'Étude hydrogéologique des aquifères de la plaine de la Ruzizi',
    sourceFilename: 'Hydrogeo_Ruzizi_SudKivu.docx',
    authorName: 'Dr. Éric Mukendi et al.',
    assignedReviewerId: 'usr-rev-002',
    assignedReviewerName: 'Dr. Nadine Masika',
    submittedDate: '13 Oct. 2026',
    status: 'pending_audit',
    priority: 'high',
    category: 'Sciences de la Terre & Environnement',
    manuscriptText: SAMPLE_MANUSCRIPTS[0].text,
  },
  {
    id: 'queue-002',
    title: 'Caractérisation mécanique des essences de bois d’Équateur pour la construction',
    sourceFilename: 'Bois_Equateur_Mecanique.docx',
    authorName: 'Prof. Justin Banza et al.',
    assignedReviewerId: 'usr-rev-003',
    assignedReviewerName: 'Dr. Benjamin Lukusa',
    submittedDate: '11 Oct. 2026',
    status: 'under_review',
    priority: 'normal',
    score: 68,
    category: 'Génie Civil & Matériaux',
    manuscriptText: SAMPLE_MANUSCRIPTS[1]?.text || SAMPLE_MANUSCRIPTS[0].text,
  },
  {
    id: 'queue-003',
    title: 'Prévalence des souches résistantes de Salmonella à Lubumbashi',
    sourceFilename: 'Salmonella_Microbio_Lubumbashi.docx',
    authorName: 'Dr. Claire Tshilobo et al.',
    assignedReviewerId: 'usr-rev-002',
    assignedReviewerName: 'Dr. Nadine Masika',
    submittedDate: '09 Oct. 2026',
    status: 'report_validated',
    priority: 'high',
    score: 84,
    category: 'Sciences Médicales & Microbiologie',
    manuscriptText: SAMPLE_MANUSCRIPTS[0].text,
  },
  {
    id: 'queue-004',
    title: 'Algorithmes de détection des pannes sur le réseau SNEL Kinshasa',
    sourceFilename: 'SmartGrid_SNEL_Kinshasa.docx',
    authorName: 'Ir. Patrick Kanyinda et al.',
    assignedReviewerId: 'usr-admin-001',
    assignedReviewerName: 'Prof. Marcel Kalonji',
    submittedDate: '05 Oct. 2026',
    status: 'transmitted',
    priority: 'low',
    score: 92,
    category: 'Génie Électrique & Informatique',
    manuscriptText: SAMPLE_MANUSCRIPTS[0].text,
  }
];

// Logs initiaux de traçabilité système
const INITIAL_LOGS: SystemAuditLog[] = [
  {
    id: 'log-001',
    userId: 'usr-admin-001',
    userName: 'Prof. Marcel Kalonji',
    userRole: 'admin',
    manuscriptTitle: 'Évaluation épidémiologique du paludisme à Kinshasa',
    timestamp: '14/10/2026 10:24',
    tokensUsed: 3120,
    score: 42,
    decision: 'Modifications majeures',
    modelUsed: 'gemini-2.5-flash',
  },
  {
    id: 'log-002',
    userId: 'usr-rev-002',
    userName: 'Dr. Nadine Masika',
    userRole: 'reviewer',
    manuscriptTitle: 'Optimisation des bétons de pouzzolane au Nord-Kivu',
    timestamp: '14/10/2026 08:15',
    tokensUsed: 2940,
    score: 78,
    decision: 'Modifications mineures',
    modelUsed: 'gemini-2.5-flash',
  },
  {
    id: 'log-003',
    userId: 'usr-rev-002',
    userName: 'Dr. Nadine Masika',
    userRole: 'reviewer',
    manuscriptTitle: 'Prévalence des souches résistantes de Salmonella à Lubumbashi',
    timestamp: '12/10/2026 14:40',
    tokensUsed: 3200,
    score: 84,
    decision: 'Conforme avec réserves',
    modelUsed: 'gemini-2.5-flash',
  },
  {
    id: 'log-004',
    userId: 'usr-rev-003',
    userName: 'Dr. Benjamin Lukusa',
    userRole: 'reviewer',
    manuscriptTitle: 'Vérification bibliographique APA 7ème édition',
    timestamp: '08/10/2026 11:15',
    tokensUsed: 1980,
    score: 62,
    decision: 'Modifications mineures',
    modelUsed: 'gemini-2.5-flash',
  }
];

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
