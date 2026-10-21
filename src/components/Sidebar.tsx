import React, { useState } from 'react';
import {
  Plus,
  PanelLeftClose,
  PanelLeftOpen,
  FileText,
  BookOpen,
  PenTool,
  BookmarkCheck,
  LayoutDashboard,
  Settings,
  Trash2,
  Archive,
  Edit3,
  Check,
  X,
  type LucideIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGovernance } from '../context/GovernanceContext';
import { AuditHistoryItem } from '../types/governance';

type View = 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa';

interface SidebarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  hasActiveReport: boolean;
  onNewAudit: () => void;
  onLoadAuditFromHistory: (item: AuditHistoryItem) => void;
  onOpenProfile: () => void;
  /** Mobile : le menu est un tiroir ouvert depuis la barre du haut. */
  mobileOpen?: boolean;
}

const DAY = 24 * 60 * 60 * 1000;

/** Le score se lit d'un coup d'œil : un point de couleur et le chiffre, sans pastille. */
const scoreTone = (score: number) =>
  score >= 80 ? 'bg-emerald-400' : score >= 55 ? 'bg-amber-400' : 'bg-rose-400';

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  hasActiveReport,
  onNewAudit,
  onLoadAuditFromHistory,
  mobileOpen = false,
}) => {
  const { user } = useAuth();
  const { historyItems, renameAudit, toggleArchiveAudit, deleteAudit } = useGovernance();
  const [collapsed, setCollapsed] = useState(false);
  // Le tiroir mobile affiche toujours les libellés ; la version réduite n'existe que sur ordinateur.
  const expanded = mobileOpen || !collapsed;
  const [editingId, setEditingId] = useState<string | null>(null);
  const [draftTitle, setDraftTitle] = useState('');

  const active = historyItems.filter((i) => !i.isArchived);
  const now = Date.now();
  const groups: { label: string; items: AuditHistoryItem[] }[] = [
    { label: 'Aujourd’hui', items: active.filter((i) => now - i.createdAtMs < DAY) },
    { label: '7 derniers jours', items: active.filter((i) => now - i.createdAtMs >= DAY && now - i.createdAtMs < 7 * DAY) },
    { label: 'Plus anciens', items: active.filter((i) => now - i.createdAtMs >= 7 * DAY) },
  ].filter((g) => g.items.length > 0);

  const isAdmin = user?.role === 'admin';

  const nav: { view: View; label: string; icon: LucideIcon; show?: boolean }[] = [
    { view: 'cockpit', label: 'Rapport en cours', icon: FileText, show: hasActiveReport },
    {
      view: isAdmin ? 'admin-dashboard' : 'reviewer-dashboard',
      label: isAdmin ? 'Administration' : 'Mon tableau de bord',
      icon: isAdmin ? Settings : LayoutDashboard,
    },
    { view: 'constitution', label: 'Constitution RCST', icon: BookOpen },
    { view: 'style', label: 'Style impersonnel', icon: PenTool },
    { view: 'apa', label: 'Références APA 7', icon: BookmarkCheck },
  ];

  const iconButton =
    'grid h-7 w-7 place-items-center rounded text-slate-400 hover:bg-slate-800 hover:text-slate-100';

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 flex h-dvh w-64 flex-col border-r border-slate-800 bg-slate-950 transition-transform duration-200 ease-[var(--ease-out)] md:static md:z-40 md:shrink-0 md:translate-x-0 md:transition-[width] ${
        mobileOpen ? 'translate-x-0' : '-translate-x-full'
      } ${collapsed ? 'md:w-14' : 'md:w-64'}`}
    >
      {/* En-tête */}
      <div className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 px-3">
        {expanded && <span className="pl-1 text-[15px] font-semibold tracking-tight text-slate-100">RCST</span>}
        <button
          onClick={() => setCollapsed((v) => !v)}
          className={`${iconButton} ${expanded ? '' : 'mx-auto'}`}
          aria-label={expanded ? 'Réduire le menu' : 'Déplier le menu'}
        >
          {expanded ? <PanelLeftClose className="h-4 w-4" /> : <PanelLeftOpen className="h-4 w-4" />}
        </button>
      </div>

      <div className="p-3">
        <button
          onClick={onNewAudit}
          className={`flex items-center justify-center gap-2 rounded-md bg-slate-100 text-sm font-semibold text-slate-950 hover:bg-white ${
            expanded ? 'h-9 w-full' : 'mx-auto h-9 w-9'
          }`}
          aria-label="Nouvel audit"
        >
          <Plus className="h-4 w-4" />
          {expanded && 'Nouvel audit'}
        </button>
      </div>

      {/* Navigation */}
      <nav className="space-y-0.5 px-3" aria-label="Navigation principale">
        {nav
          .filter((n) => n.show !== false)
          .map(({ view, label, icon: Icon }) => {
            const current = activeView === view;
            return (
              <button
                key={view}
                onClick={() => setActiveView(view)}
                aria-current={current ? 'page' : undefined}
                title={label}
                className={`flex h-9 w-full items-center gap-3 rounded-md px-2.5 text-sm ${
                  current
                    ? 'bg-slate-800 font-medium text-slate-50'
                    : 'text-slate-400 hover:bg-slate-900 hover:text-slate-100'
                } ${expanded ? '' : 'justify-center px-0'}`}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {expanded && <span className="truncate">{label}</span>}
              </button>
            );
          })}
      </nav>

      {/* Historique */}
      {expanded && (
        <div className="mt-4 min-h-0 flex-1 overflow-y-auto border-t border-slate-800 px-3 py-3">
          <h2 className="px-2.5 pb-1 text-xs font-medium text-slate-500">Audits récents</h2>

          {groups.length === 0 && (
            <p className="px-2.5 py-2 text-sm leading-relaxed text-slate-500">
              Aucun audit pour l’instant. Les manuscrits vérifiés apparaîtront ici.
            </p>
          )}

          {groups.map((group) => (
            <section key={group.label} className="mt-3 first:mt-1">
              <h3 className="px-2.5 pb-1 text-xs text-slate-500">{group.label}</h3>
              <ul>
                {group.items.map((item) => (
                  <li
                    key={item.id}
                    className="group relative rounded-md hover:bg-slate-900"
                  >
                    {editingId === item.id ? (
                      <div className="flex items-center gap-1 p-1.5">
                        <input
                          autoFocus
                          value={draftTitle}
                          onChange={(e) => setDraftTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              renameAudit(item.id, draftTitle);
                              setEditingId(null);
                            }
                            if (e.key === 'Escape') setEditingId(null);
                          }}
                          className="h-7 min-w-0 flex-1 rounded border border-slate-600 bg-slate-900 px-2 text-sm text-slate-100 focus:border-sky-400 focus:outline-none"
                        />
                        <button
                          className={iconButton}
                          aria-label="Enregistrer le titre"
                          onClick={() => {
                            renameAudit(item.id, draftTitle);
                            setEditingId(null);
                          }}
                        >
                          <Check className="h-3.5 w-3.5" />
                        </button>
                        <button className={iconButton} aria-label="Annuler" onClick={() => setEditingId(null)}>
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button
                          onClick={() => onLoadAuditFromHistory(item)}
                          className="block w-full rounded-md px-2.5 py-1.5 text-left"
                        >
                          <span className="block truncate pr-14 text-sm text-slate-200">{item.title}</span>
                          <span className="mt-0.5 flex items-center gap-1.5 text-xs text-slate-500">
                            <span className={`h-1.5 w-1.5 rounded-full ${scoreTone(item.conformityScore)}`} aria-hidden />
                            {item.conformityScore}/100 · {item.timestamp}
                          </span>
                        </button>
                        <div className="absolute right-1 top-1.5 hidden items-center group-hover:flex group-focus-within:flex">
                          <button
                            className={iconButton}
                            aria-label="Renommer"
                            onClick={() => {
                              setEditingId(item.id);
                              setDraftTitle(item.title);
                            }}
                          >
                            <Edit3 className="h-3.5 w-3.5" />
                          </button>
                          <button className={iconButton} aria-label="Archiver" onClick={() => toggleArchiveAudit(item.id)}>
                            <Archive className="h-3.5 w-3.5" />
                          </button>
                          <button
                            className={`${iconButton} hover:text-rose-300`}
                            aria-label="Supprimer"
                            onClick={() => {
                              if (window.confirm('Supprimer cet audit de l’historique ?')) deleteAudit(item.id);
                            }}
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </>
                    )}
                  </li>
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </aside>
  );
};
