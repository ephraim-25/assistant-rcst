import React, { useMemo, useRef, useEffect } from 'react';
import { FileText, ChevronUp } from 'lucide-react';
import { AuditRef } from '../utils/auditRefs';

interface ManuscriptHighlighterProps {
  text: string;
  auditRefs: AuditRef[];
  activeRefId: number | null;
  sourceFilename?: string;
  onRefClick: (ref: AuditRef) => void;
}

interface MatchSpan {
  start: number;
  end: number;
  ref: AuditRef;
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

const COLOR_MAP: Record<string, { bg: string; text: string; ring: string; tag: string }> = {
  yellow: {
    bg: 'bg-yellow-200/80',
    text: 'text-yellow-900',
    ring: 'ring-yellow-500',
    tag: 'bg-yellow-400 text-yellow-950',
  },
  orange: {
    bg: 'bg-orange-200/80',
    text: 'text-orange-900',
    ring: 'ring-orange-500',
    tag: 'bg-orange-400 text-orange-950',
  },
  red: {
    bg: 'bg-red-200/80',
    text: 'text-red-900',
    ring: 'ring-red-500',
    tag: 'bg-red-400 text-red-950',
  },
  blue: {
    bg: 'bg-blue-200/80',
    text: 'text-blue-900',
    ring: 'ring-blue-500',
    tag: 'bg-blue-400 text-blue-950',
  },
};

/** Build sorted, non-overlapping match spans from all AuditRef patterns */
function buildMatchSpans(text: string, refs: AuditRef[]): MatchSpan[] {
  const raw: MatchSpan[] = [];

  for (const ref of refs) {
    if (!ref.pattern) continue;
    // Recreate regex to reset lastIndex
    const re = new RegExp(ref.pattern.source, 'gi');
    let m: RegExpExecArray | null;
    let count = 0;
    while ((m = re.exec(text)) !== null && count < 60) {
      raw.push({ start: m.index, end: m.index + m[0].length, ref });
      count++;
      // Prevent infinite loop on zero-width matches
      if (m[0].length === 0) re.lastIndex++;
    }
  }

  // Sort by start position
  raw.sort((a, b) => a.start - b.start);

  // Remove overlaps (first match wins)
  const filtered: MatchSpan[] = [];
  let cursor = 0;
  for (const span of raw) {
    if (span.start >= cursor) {
      filtered.push(span);
      cursor = span.end;
    }
  }
  return filtered;
}

/** Render a plain text segment, preserving newlines as <br> */
function renderPlain(text: string, key: string): React.ReactNode {
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <React.Fragment key={`${key}-${i}`}>
      {i > 0 && <br />}
      {line}
    </React.Fragment>
  ));
}

export const ManuscriptHighlighter: React.FC<ManuscriptHighlighterProps> = ({
  text,
  auditRefs,
  activeRefId,
  sourceFilename,
  onRefClick,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const activeMarkRef = useRef<HTMLElement | null>(null);

  const spans = useMemo(() => buildMatchSpans(text, auditRefs), [text, auditRefs]);

  // Auto-scroll to active highlight
  useEffect(() => {
    if (activeRefId == null || !containerRef.current) return;
    const el = containerRef.current.querySelector(`[data-ref="${activeRefId}"]`);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [activeRefId]);

  /** Render the whole text with inline highlights */
  const rendered = useMemo(() => {
    const nodes: React.ReactNode[] = [];
    let pos = 0;
    let key = 0;

    for (const span of spans) {
      // Plain text before
      if (span.start > pos) {
        nodes.push(renderPlain(text.slice(pos, span.start), `p${key++}`));
      }

      const colors = COLOR_MAP[span.ref.color] ?? COLOR_MAP.yellow;
      const isActive = span.ref.id === activeRefId;
      const matchedText = text.slice(span.start, span.end);

      nodes.push(
        <mark
          key={`m${key++}`}
          data-ref={span.ref.id}
          onClick={() => onRefClick(span.ref)}
          className={`
            relative inline cursor-pointer rounded-[3px] px-0.5 py-px
            transition-[background-color,box-shadow,filter] duration-150
            ${colors.bg} ${colors.text}
            ${isActive
              ? `ring-2 ${colors.ring} ring-offset-1 brightness-90`
              : `hover:brightness-90 hover:ring-1 ${colors.ring} hover:ring-offset-1`
            }
          `}
          title={`Réf. [${span.ref.id}] — ${span.ref.label}`}
        >
          {matchedText}
          <sup
            className={`
              ml-[2px] text-[8px] font-semibold leading-none rounded-sm px-[3px] py-px
              ${colors.tag}
              transition-opacity ${isActive ? 'opacity-100' : 'opacity-70'}
            `}
            style={{ verticalAlign: 'super' }}
          >
            {span.ref.id}
          </sup>
        </mark>
      );

      pos = span.end;
    }

    // Remaining plain text
    if (pos < text.length) {
      nodes.push(renderPlain(text.slice(pos), `p${key++}`));
    }

    return nodes;
  }, [text, spans, activeRefId, onRefClick]);

  const totalHighlights = spans.length;

  return (
    <div className="flex flex-col h-full bg-[#f0f0f0]">
      {/* Toolbar */}
      <div className="shrink-0 flex items-center justify-between px-4 py-2 bg-white border-b border-slate-200">
        <div className="flex items-center gap-2 min-w-0">
          <FileText className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-700 truncate max-w-[200px]">
            {sourceFilename || 'Manuscrit'}
          </span>
        </div>
        {totalHighlights > 0 && (
          <span className="text-xs font-mono bg-amber-100 text-amber-800 border border-amber-200 px-2 py-0.5 rounded-full shrink-0">
            {totalHighlights} zone{totalHighlights > 1 ? 's' : ''} surlignée{totalHighlights > 1 ? 's' : ''}
          </span>
        )}
        {totalHighlights === 0 && (
          <span className="text-xs text-emerald-600 font-medium">Aucune anomalie détectée</span>
        )}
      </div>

      {/* Legend */}
      {totalHighlights > 0 && (
        <div className="shrink-0 flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-1.5 bg-white border-b border-slate-100">
          {['yellow', 'orange', 'red', 'blue'].map((c) => {
            const hasRefs = auditRefs.some((r) => r.color === c && r.pattern);
            if (!hasRefs) return null;
            const label: Record<string, string> = {
              yellow: 'Style', orange: 'Citations', red: 'Structure', blue: 'Bilinguisme',
            };
            return (
              <span key={c} className={`flex items-center gap-1 text-xs font-medium ${COLOR_MAP[c].text}`}>
                <span className={`w-2.5 h-2.5 rounded-sm ${COLOR_MAP[c].bg} border ${COLOR_MAP[c].ring} border-opacity-50`} />
                {label[c]}
              </span>
            );
          })}
          <span className="text-xs text-slate-400 ml-auto">Cliquez sur un surlignage pour détails</span>
        </div>
      )}

      {/* Scrollable document area — Word-like look */}
      <div ref={containerRef} className="flex-1 overflow-y-auto px-6 py-8">
        <div
          className="
            mx-auto bg-white rounded
            min-h-[1000px] w-full max-w-[720px]
            px-12 py-12
            font-[Georgia,serif] text-[13.5px] leading-[1.8] text-gray-800
          "
          style={{ boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 4px 16px rgba(0,0,0,0.08)' }}
        >
          {text ? (
            <div className="whitespace-pre-wrap break-words">{rendered}</div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 text-slate-400 text-sm">
              <FileText className="w-12 h-12 mb-3 opacity-30" />
              <p>Aucun manuscrit chargé</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
