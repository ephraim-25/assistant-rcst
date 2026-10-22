export type AuditStatus = 'Conforme' | 'Conforme avec réserves' | 'Refusé - Modifications majeures requises';

export interface SectionAnalysisDetail {
  score: number;
  status: 'Conforme' | 'Partiellement conforme' | 'Non conforme';
  issues: string[];
  recommendations: string[];
}

export interface TitleAndAuthorsAnalysis extends SectionAnalysisDetail {
  isBilingualTitle: boolean;
  hasSuperfluousQuotes: boolean;
  hasBulletedAuthors: boolean;
  hasSuperscriptAffiliations: boolean;
  hasCorrespondingAsterisk: boolean;
  hasEmails: boolean;
  hasPhone: boolean;
  hasOrcid16Digits: boolean;
  correctedTitleBlock?: {
    fr: string;
    en: string;
  };
  correctedAuthorsBlock?: string;
}

export interface AbstractAndKeywordsAnalysis extends SectionAnalysisDetail {
  wordCountFr: number;
  wordCountEn: number;
  isBilingual: boolean;
  hasForbiddenSubtitles: boolean;
  hasReferences: boolean;
  keywordsCountFr: number;
  keywordsCountEn: number;
  correctedAbstractFr?: string;
  correctedAbstractEn?: string;
}

export interface ImradAndStructureAnalysis extends SectionAnalysisDetail {
  hasArabicNumbering: boolean;
  hasSuperfluousSubtitlesInIntro: boolean;
  introLengthCompliant: boolean;
  tablesAndFiguresCompliant: {
    tablesRomanBefore: boolean;
    figuresArabicAfter: boolean;
    redundancyDetected: boolean;
    notes: string;
  };
  mandatoryEndSections: {
    remerciements: boolean;
    financement: boolean;
    conflitInteret: boolean;
    considerationsEthiques: boolean;
    orcidAuteurs: boolean;
    contributionAuteursInitialsOnly: boolean;
  };
}

export interface CitationsAndReferencesAnalysis extends SectionAnalysisDetail {
  apa7Compliant: boolean;
  hasNumericStyleBracket: boolean;
  crossReferencingValid: boolean;
  hangingIndentCompliant: boolean;
  alphabeticalOrderCompliant: boolean;
  missingFromBibliography: string[];
  missingFromText: string[];
  flaggedCitations: Array<{
    raw: string;
    error: string;
    correctedApa7: string;
  }>;
}

export interface StyleAnalysis extends SectionAnalysisDetail {
  isImpersonal: boolean;
  personalPronounsDetected: string[];
  sampleReformulations: Array<{
    original: string;
    corrected: string;
  }>;
}

export interface EditorialBoardNotes {
  decisionRecommendation: string;
  confidentialComments: string;
  ethicalChecklist: string[];
  questionsForAuthors: string[];
}

export interface AuditReportData {
  status: AuditStatus;
  globalScore: number;
  summary: string;
  sections: {
    titleAndAuthors: TitleAndAuthorsAnalysis;
    abstractAndKeywords: AbstractAndKeywordsAnalysis;
    imradAndStructure: ImradAndStructureAnalysis;
    citationsAndReferences: CitationsAndReferencesAnalysis;
    style: StyleAnalysis;
  };
  priorityRecommendations: string[];
  editorialBoardNotes: EditorialBoardNotes;
  rawAuditMarkdown?: string;
  isAiGenerated?: boolean;
  referenceId?: string;
  timestamp?: string;
}

// ─── Types pour Concordance Bibliographique (B5) ───────────────────────────────

export interface ConcordanceReport {
  orphanCitations: string[];
  uncitedReferences: string[];
  alphabeticalOrderCompliant: boolean;
  alphabeticalOrderViolations: string[];
  totalCitationsInText: number;
  totalReferencesInBiblio: number;
}

// ─── Types pour CrossRef Verification (B6) ───────────────────────────────────────

export interface CrossrefVerificationResult {
  query: string;
  doi: string | null;
  isFound: boolean;
  verifiedTitle: string | null;
  verifiedYear: string | null;
  verifiedContainer: string | null;
  divergences: string[];
  score: number;
}
