import React, { useRef, useEffect } from 'react';
import { ShieldCheck, AlertTriangle, XCircle, ChevronRight, Lightbulb, Download, Printer } from 'lucide-react';
import { AuditRef } from '../utils/auditRefs';
import { AuditReportData } from '../types/audit';

interface AuditReferencesPanelProps {
  refs: AuditRef[];
  report: AuditReportData;
  activeRefId: number | null;
  onRefClick: (ref: AuditRef) => void;
}

const SEVERITY_STYLES = {
  major: {
    badge: 'bg-red-100 text-red-700 border-red-200',
    border: 'border-l-red-400',
    ring: 'ring-red-400',
    label: 'MODIFICATION REQUISE',
  },
  minor: {
    badge: 'bg-amber-100 text-amber-700 border-amber-200',
    border: 'border-l-amber-400',
    ring: 'ring-amber-400',
    label: 'RÉSERVE',
  },
};

const COLOR_DOT: Record<string, string> = {
  yellow: 'bg-yellow-400',
  orange: 'bg-orange-400',
  red: 'bg-red-400',
  blue: 'bg-blue-400',
};

export const AuditReferencesPanel: React.FC<AuditReferencesPanelProps> = ({
  refs,
  report,
  activeRefId,
  onRefClick,
}) => {
  const activeCardRef = useRef<HTMLDivElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (activeRefId != null && activeCardRef.current && panelRef.current) {
      activeCardRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }
  }, [activeRefId]);

  const statusConfig = (() => {
    switch (report.status) {
      case 'Conforme':
        return { Icon: ShieldCheck, color: 'text-emerald-400', bg: 'bg-emerald-950/60 border-emerald-800', label: 'CONFORME' };
      case 'Conforme avec réserves':
        return { Icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-950/60 border-amber-800', label: 'CONFORME AVEC RÉSERVES' };
      default:
        return { Icon: XCircle, color: 'text-red-400', bg: 'bg-red-950/60 border-red-800', label: 'REFUSÉ — MODIFICATIONS REQUISES' };
    }
  })();

  const { Icon } = statusConfig;

  const majorCount = refs.filter((r) => r.severity === 'major').length;
  const minorCount = refs.filter((r) => r.severity === 'minor').length;

  return (
    <div className="flex flex-col h-full bg-[#0e1015]">
      {/* Header */}
      <div className="shrink-0 px-4 py-3 border-b border-white/8 bg-[#13151c]">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xs font-mono font-bold text-slate-300 uppercase tracking-widest">
            Rapport d'Audit Éditorial
          </h2>
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => window.print()}
              className="p-1 rounded hover:bg-white/8 text-slate-500 hover:text-slate-300 transition-colors"
              title="Imprimer"
            >
              <Printer className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Status badge */}
        <div className={`flex items-center gap-2.5 px-3 py-2 rounded-lg border ${statusConfig.bg}`}>
          <Icon className={`w-5 h-5 shrink-0 ${statusConfig.color}`} />
          <div className="min-w-0">
            <div className={`text-[10px] font-black tracking-widest uppercase ${statusConfig.color}`}>
              {statusConfig.label}
            </div>
            <div className="flex items-center gap-2 mt-0.5">
              <div className="flex-1 h-1 bg-slate-800 rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${
                    report.globalScore >= 80 ? 'bg-emerald-400' : report.globalScore >= 55 ? 'bg-amber-400' : 'bg-red-500'
                  }`}
                  style={{ width: `${report.globalScore}%` }}
                />
              </div>
              <span className="text-[11px] font-mono font-bold text-white shrink-0">
                {report.globalScore}<span className="text-slate-400 font-normal">/100</span>
              </span>
            </div>
          </div>
        </div>

        {/* Counts */}
        <div className="flex items-center gap-3 mt-2 text-[10px] font-mono">
          {majorCount > 0 && (
            <span className="flex items-center gap-1 text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-400" />
              {majorCount} correction{majorCount > 1 ? 's' : ''} majeure{majorCount > 1 ? 's' : ''}
            </span>
          )}
          {minorCount > 0 && (
            <span className="flex items-center gap-1 text-amber-400">
              <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
              {minorCount} réserve{minorCount > 1 ? 's' : ''}
            </span>
          )}
          {refs.length === 0 && (
            <span className="text-emerald-400 flex items-center gap-1">
              <ShieldCheck className="w-3 h-3" /> Aucune non-conformité détectée
            </span>
          )}
        </div>
      </div>

      {/* Refs list */}
      <div ref={panelRef} className="flex-1 overflow-y-auto px-3 py-3 space-y-2">
        {refs.length === 0 && (
          <div className="flex flex-col items-center justify-center h-40 text-slate-500 text-xs text-center px-4">
            <ShieldCheck className="w-8 h-8 mb-2 text-emerald-600" />
            <p>Le manuscrit est conforme à la Constitution RCST.</p>
          </div>
        )}

        {refs.map((ref) => {
          const isActive = ref.id === activeRefId;
          const sev = SEVERITY_STYLES[ref.severity];
          return (
            <div
              key={ref.id}
              ref={isActive ? (el) => { activeCardRef.current = el; } : undefined}
              onClick={() => onRefClick(ref)}
              className={`
                group relative rounded-xl border-l-[3px] bg-[#1a1d26] border border-white/6
                cursor-pointer transition-all duration-150 overflow-hidden
                ${sev.border}
                ${isActive ? `ring-1 ${sev.ring} ring-offset-0 brightness-110` : 'hover:bg-[#1e2130] hover:border-white/10'}
              `}
            >
              <div className="px-3 py-2.5">
                {/* Ref number + title */}
                <div className="flex items-start gap-2 mb-1.5">
                  <span
                    className={`shrink-0 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-black ${COLOR_DOT[ref.color]} text-slate-950 mt-0.5`}
                  >
                    {ref.id}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="text-[11px] font-bold text-slate-100 leading-tight">
                        {ref.label}
                      </span>
                    </div>
                    <span className={`inline-block mt-0.5 text-[9px] font-bold tracking-wider uppercase px-1.5 py-px rounded border ${sev.badge}`}>
                      {sev.label}
                    </span>
                  </div>
                  <ChevronRight className={`w-3.5 h-3.5 shrink-0 text-slate-500 transition-transform mt-1 ${isActive ? 'rotate-90 text-slate-300' : 'group-hover:translate-x-0.5'}`} />
                </div>

                {/* Description */}
                <p className="text-[11px] text-slate-400 leading-snug pl-7">
                  {ref.description}
                </p>

                {/* Model suggestion (expanded when active) */}
                {isActive && ref.modelSuggestion && (
                  <div className="mt-2.5 pl-7">
                    <div className="flex items-center gap-1 mb-1">
                      <Lightbulb className="w-3 h-3 text-amber-400" />
                      <span className="text-[9px] font-bold text-amber-400 uppercase tracking-widest">
                        Modèle à suivre
                      </span>
                    </div>
                    <pre className="text-[11px] text-emerald-300 bg-emerald-950/40 border border-emerald-900/50 rounded-lg p-2.5 whitespace-pre-wrap break-words font-mono leading-relaxed">
                      {ref.modelSuggestion}
                    </pre>
                  </div>
                )}
              </div>

              {/* Active indicator bar */}
              {isActive && (
                <div className={`absolute top-0 left-0 w-0.5 h-full ${COLOR_DOT[ref.color]}`} />
              )}
            </div>
          );
        })}

        {/* Summary note */}
        {refs.length > 0 && (
          <div className="px-2 pt-2 pb-1">
            <p className="text-[10px] text-slate-600 text-center leading-relaxed">
              {report.editorialBoardNotes.decisionRecommendation}
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
