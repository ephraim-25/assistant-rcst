import React, { useRef, useEffect } from 'react';
import { Printer, ChevronDown } from 'lucide-react';
import { AuditRef } from '../utils/auditRefs';
import { AuditReportData } from '../types/audit';

interface AuditReferencesPanelProps {
  refs: AuditRef[];
  report: AuditReportData;
  activeRefId: number | null;
  onRefClick: (ref: AuditRef) => void;
}

/** Couleur du repère : la même que le surlignage du passage dans le manuscrit. */
const MARK: Record<string, string> = {
  yellow: 'bg-yellow-300 text-slate-950',
  orange: 'bg-orange-400 text-slate-950',
  red: 'bg-rose-400 text-slate-950',
  blue: 'bg-sky-400 text-slate-950',
};

const VERDICT: Record<string, { text: string; tone: string }> = {
  Conforme: { text: 'Conforme', tone: 'text-emerald-300' },
  'Conforme avec réserves': { text: 'Conforme avec réserves', tone: 'text-amber-300' },
};
const VERDICT_REJECTED = { text: 'Modifications majeures requises', tone: 'text-rose-300' };

const scoreTone = (n: number) => (n >= 80 ? 'bg-emerald-400' : n >= 55 ? 'bg-amber-400' : 'bg-rose-400');

export const AuditReferencesPanel: React.FC<AuditReferencesPanelProps> = ({
  refs,
  report,
  activeRefId,
  onRefClick,
}) => {
  const activeCardRef = useRef<HTMLLIElement | null>(null);

  useEffect(() => {
    activeCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }, [activeRefId]);

  const verdict = VERDICT[report.status] ?? VERDICT_REJECTED;
  const toFix = refs.filter((r) => r.severity === 'major');
  const toCheck = refs.filter((r) => r.severity === 'minor');

  const renderGroup = (title: string, items: AuditRef[], bar: string) =>
    items.length > 0 && (
      <section className="mt-6 first:mt-0" aria-label={title}>
        <h3 className="mb-2 flex items-center gap-2 px-1 text-sm font-medium text-slate-200">
          <span className={`h-3.5 w-0.5 rounded-full ${bar}`} aria-hidden />
          {title}
          <span className="text-slate-500">{items.length}</span>
        </h3>
        <ul className="divide-y divide-slate-800 rounded-lg border border-slate-800 bg-slate-900">
          {items.map((ref) => {
            const isActive = ref.id === activeRefId;
            return (
              <li key={ref.id} ref={isActive ? activeCardRef : undefined}>
                <button
                  onClick={() => onRefClick(ref)}
                  aria-expanded={isActive}
                  className={`flex w-full items-start gap-3 px-3.5 py-3 text-left transition-colors duration-150 hover:bg-slate-800/60 ${
                    isActive ? 'bg-slate-800/70' : ''
                  }`}
                >
                  <span
                    className={`mt-0.5 grid h-5 min-w-5 place-items-center rounded px-1 text-xs font-semibold tabular-nums ${MARK[ref.color]}`}
                  >
                    {ref.id}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-slate-100">{ref.label}</span>
                    <span className="mt-0.5 block text-[13px] leading-snug text-slate-400">{ref.description}</span>

                    {isActive && ref.modelSuggestion && (
                      <span className="rcst-enter mt-3 block border-l-2 border-emerald-400/60 pl-3">
                        <span className="block text-xs font-medium text-emerald-300">Formulation attendue</span>
                        <span className="mt-1 block whitespace-pre-wrap break-words font-serif text-[14px] leading-relaxed text-slate-200">
                          {ref.modelSuggestion}
                        </span>
                      </span>
                    )}
                  </span>
                  <ChevronDown
                    className={`mt-1 h-4 w-4 shrink-0 text-slate-500 transition-transform duration-200 ${
                      isActive ? 'rotate-180' : ''
                    }`}
                    aria-hidden
                  />
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    );

  return (
    <div className="flex h-full flex-col bg-slate-950">
      <div className="shrink-0 border-b border-slate-800 px-5 pb-4 pt-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-xs text-slate-500">Rapport de conformité</h2>
            <p className={`mt-1 text-[19px] font-semibold leading-snug ${verdict.tone}`}>{verdict.text}</p>
          </div>
          <button
            onClick={() => window.print()}
            className="grid h-8 w-8 place-items-center rounded-md text-slate-400 hover:bg-slate-800 hover:text-slate-100"
            aria-label="Imprimer le rapport"
          >
            <Printer className="h-4 w-4" />
          </button>
        </div>

        <div className="mt-3 flex items-center gap-3">
          <div className="h-1 flex-1 overflow-hidden rounded-full bg-slate-800">
            <div
              className={`h-full rounded-full ${scoreTone(report.globalScore)}`}
              style={{ width: `${report.globalScore}%` }}
            />
          </div>
          <span className="text-sm font-semibold tabular-nums text-slate-100">
            {report.globalScore}
            <span className="font-normal text-slate-500"> / 100</span>
          </span>
        </div>

        <p className="mt-3 text-[13px] text-slate-400">
          {refs.length === 0
            ? 'Aucune non-conformité détectée.'
            : `${toFix.length} à corriger, ${toCheck.length} à vérifier.`}{' '}
          <span className="text-slate-500">Cliquez sur un constat pour voir le passage dans le manuscrit.</span>
        </p>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-5">
        {refs.length === 0 && (
          <p className="text-sm leading-relaxed text-slate-400">
            Le manuscrit respecte les règles contrôlées. La lecture de fond (pertinence, rigueur
            scientifique) reste du ressort du comité.
          </p>
        )}

        {renderGroup('À corriger', toFix, 'bg-rose-400')}
        {renderGroup('À vérifier', toCheck, 'bg-amber-400')}

        {refs.length > 0 && report.editorialBoardNotes?.decisionRecommendation && (
          <p className="mt-6 border-t border-slate-800 pt-4 text-[13px] leading-relaxed text-slate-400">
            <span className="text-slate-300">Recommandation : </span>
            {report.editorialBoardNotes.decisionRecommendation}
          </p>
        )}
      </div>
    </div>
  );
};
