import { AuditReportData } from './audit';

export type AuditDecisionStatus = 'rejected' | 'major_revisions' | 'minor_revisions' | 'accepted';

export interface AuditHistoryItem {
  id: string;
  userId: string;
  userName: string;
  title: string;
  sourceFilename: string;
  conformityScore: number;
  status: AuditDecisionStatus;
  timestamp: string;
  createdAtMs: number;
  manuscriptText: string;
  report: AuditReportData;
  isArchived: boolean;
  tokensUsed: number;
}

export type QueueItemStatus = 'pending_audit' | 'under_review' | 'report_validated' | 'transmitted';

export interface ReviewQueueItem {
  id: string;
  title: string;
  sourceFilename: string;
  authorName: string;
  assignedReviewerId: string;
  assignedReviewerName: string;
  submittedDate: string;
  status: QueueItemStatus;
  priority: 'high' | 'normal' | 'low';
  manuscriptText: string;
  score?: number;
  category: string;
}

export type GeminiModelId = 'gemini-2.5-flash' | 'gemini-3.5-flash' | 'gemini-3-flash-preview';

export interface AiGovernanceConfig {
  defaultModel: GeminiModelId;
  temperature: number; // 0.0 à 1.0 (0.2 par défaut)
  reviewerDailyQuota: number; // ex: 20
  adminDailyQuota: number; // -1 pour illimité
  maxOutputTokensAudit: number; // ex: 4096
  maxOutputTokensChat: number; // ex: 2048
  monthlyBudgetLimitTokens: number; // ex: 2_000_000
  totalTokensConsumed: number;
  budgetAlertThresholdPercent: number; // ex: 80%
}

export interface SystemAuditLog {
  id: string;
  userId: string;
  userName: string;
  userRole: 'admin' | 'reviewer';
  manuscriptTitle: string;
  timestamp: string;
  tokensUsed: number;
  score: number;
  decision: string;
  modelUsed: string;
}
