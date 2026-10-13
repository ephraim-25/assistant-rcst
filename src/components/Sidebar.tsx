import React, { useState } from 'react';
import { 
  Plus, 
  PanelLeftClose, 
  PanelLeftOpen, 
  Home, 
  FileText, 
  BookOpen, 
  PenTool, 
  BookmarkCheck, 
  LayoutDashboard, 
  ShieldCheck, 
  Trash2, 
  Archive, 
  Edit3, 
  LogOut, 
  User as UserIcon, 
  Settings, 
  Check, 
  X,
  Clock,
  ChevronRight,
  ShieldAlert,
  Sparkles
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGovernance } from '../context/GovernanceContext';
import { AuditHistoryItem } from '../types/governance';

interface SidebarProps {
  activeView: 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa';
  setActiveView: (view: 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa') => void;
  hasActiveReport: boolean;
  onNewAudit: () => void;
  onLoadAuditFromHistory: (item: AuditHistoryItem) => void;
  onOpenProfile: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeView,
  setActiveView,
  hasActiveReport,
  onNewAudit,
  onLoadAuditFromHistory,
  onOpenProfile,
}) => {
  const { user, logout } = useAuth();
  const { historyItems, renameAudit, toggleArchiveAudit, deleteAudit } = useGovernance();

  // État rétracté (collapsed) ou déplié (expanded)
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  
  // État pour renommer un audit inline
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [newTitleValue, setNewTitleValue] = useState<string>('');

  // Menu popup du profil en bas
  const [showProfileMenu, setShowProfileMenu] = useState<boolean>(false);

  // Filtrer l'historique non-archivé
  const activeHistory = historyItems.filter((item) => !item.isArchived);

  // Séparation chronologique
  const now = Date.now();
  const ONE_DAY = 24 * 60 * 60 * 1000;
  const SEVEN_DAYS = 7 * ONE_DAY;

  const todayItems = activeHistory.filter((item) => now - item.createdAtMs < ONE_DAY);
  const last7DaysItems = activeHistory.filter(
    (item) => now - item.createdAtMs >= ONE_DAY && now - item.createdAtMs < SEVEN_DAYS
  );
  const olderItems = activeHistory.filter((item) => now - item.createdAtMs >= SEVEN_DAYS);

  const handleStartRename = (item: AuditHistoryItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(item.id);
    setNewTitleValue(item.title);
  };

  const handleSaveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    renameAudit(id, newTitleValue);
    setEditingItemId(null);
  };

  const handleCancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingItemId(null);
  };

  const renderScoreBadge = (score: number) => {
    if (score >= 80) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
          {score}%
        </span>
      );
    }
    if (score >= 55) {
      return (
        <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30">
          {score}%
        </span>
      );
    }
    return (
      <span className="text-[10px] px-1.5 py-0.5 rounded font-mono font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30">
        {score}%
      </span>
    );
  };

  return (
    <aside
      className={`h-screen shrink-0 bg-[#07090e] border-r border-white/[0.06] flex flex-col justify-between transition-all duration-300 ease-in-out select-none z-40 relative ${
        isExpanded ? 'w-72 sm:w-80' : 'w-16'
      }`}
    >
      {/* ─── HAUT : EN-TÊTE DU MENU & BOUTON NOUVEL AUDIT ─── */}
      <div className="flex flex-col p-3 border-b border-white/[0.05]">
        <div className="flex items-center justify-between mb-3">
          {isExpanded ? (
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
                R
              </div>
              <div className="flex flex-col">
                <span className="text-xs font-bold text-white tracking-tight">RCST Enterprise</span>
                <span className="text-[9px] text-amber-400 font-mono">CONSEIL SCIENTIFIQUE</span>
              </div>
            </div>
          ) : (
            <div className="w-8 h-8 mx-auto rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 flex items-center justify-center text-slate-950 font-black text-xs shadow-md">
              R
            </div>
          )}

          {/* Bouton Toggle Collapse / Expand */}
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="w-8 h-8 rounded-lg hover:bg-white/5 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            title={isExpanded ? 'Réduire le menu' : 'Déplier le menu latéral'}
          >
            {isExpanded ? <PanelLeftClose className="w-4 h-4" /> : <PanelLeftOpen className="w-4 h-4" />}
          </button>
        </div>

        {/* Bouton "+ Nouvel Audit" / "Nouveau Chat" */}
        {isExpanded ? (
          <button
            onClick={onNewAudit}
            className="w-full py-2.5 px-3.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 hover:shadow-orange-500/30 transition-all cursor-pointer group"
          >
            <Plus className="w-4 h-4 text-slate-950 stroke-[2.5]" />
            <span>+ Nouvel Audit de Manuscrit</span>
          </button>
        ) : (
          <button
            onClick={onNewAudit}
            className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-amber-600 to-orange-500 hover:from-amber-500 hover:to-orange-400 text-slate-950 flex items-center justify-center shadow-lg transition-all cursor-pointer"
            title="Nouvel Audit de Manuscrit"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </button>
        )}
      </div>

      {/* ─── CENTRE : HISTORIQUE CHRONOLOGIQUE OU ICÔNES ─── */}
      <div className="flex-1 overflow-y-auto px-2 py-3 space-y-4 scrollbar-thin scrollbar-thumb-white/10">
        {/* Liens de navigation principaux */}
        <div className="space-y-1">
          <button
            onClick={() => setActiveView('hub')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeView === 'hub'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Accueil & Prompt Hub"
          >
            <Home className="w-4 h-4 shrink-0" />
            {isExpanded && <span>Accueil & Prompt Center</span>}
          </button>

          {hasActiveReport && (
            <button
              onClick={() => setActiveView('cockpit')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeView === 'cockpit'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Cockpit Éditorial Actif"
            >
              <FileText className="w-4 h-4 shrink-0 text-amber-400" />
              {isExpanded && (
                <div className="flex items-center justify-between w-full">
                  <span>Cockpit Split-Screen</span>
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                </div>
              )}
            </button>
          )}

          {/* Tableau de bord dédié selon le rôle */}
          {user?.role === 'admin' ? (
            <button
              onClick={() => setActiveView('admin-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeView === 'admin-dashboard'
                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Gouvernance SIGC & Régulation IA"
            >
              <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
              {isExpanded && (
                <div className="flex items-center justify-between w-full">
                  <span>Gouvernance SIGC & IA</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono">
                    ADMIN
                  </span>
                </div>
              )}
            </button>
          ) : (
            <button
              onClick={() => setActiveView('reviewer-dashboard')}
              className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
                activeView === 'reviewer-dashboard'
                  ? 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
              }`}
              title="Tableau de Bord Reviewer"
            >
              <LayoutDashboard className="w-4 h-4 shrink-0 text-sky-400" />
              {isExpanded && (
                <div className="flex items-center justify-between w-full">
                  <span>Tableau de Bord</span>
                  <span className="text-[9px] px-1.5 py-0.2 rounded bg-sky-500/20 text-sky-300 font-mono">
                    REV
                  </span>
                </div>
              )}
            </button>
          )}

          <button
            onClick={() => setActiveView('constitution')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeView === 'constitution'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Constitution RCST"
          >
            <BookOpen className="w-4 h-4 shrink-0" />
            {isExpanded && <span>Constitution RCST</span>}
          </button>

          <button
            onClick={() => setActiveView('style')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeView === 'style'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Atelier Style Impersonnel"
          >
            <PenTool className="w-4 h-4 shrink-0" />
            {isExpanded && <span>Style Impersonnel</span>}
          </button>

          <button
            onClick={() => setActiveView('apa')}
            className={`w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-medium transition-all cursor-pointer ${
              activeView === 'apa'
                ? 'bg-white/10 text-white border border-white/10'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/5'
            }`}
            title="Vérificateur APA 7"
          >
            <BookmarkCheck className="w-4 h-4 shrink-0" />
            {isExpanded && <span>Vérificateur APA 7</span>}
          </button>
        </div>

        {/* Section Historique Chronologique (uniquement si déplié) */}
        {isExpanded && (
          <div className="pt-2 border-t border-white/[0.05] space-y-3">
            <div className="px-2 flex items-center justify-between text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <span className="flex items-center gap-1.5">
                <Clock className="w-3 h-3" />
                <span>Historique des Audits</span>
              </span>
              <span className="text-[10px] text-slate-500 font-mono">{activeHistory.length}</span>
            </div>

            {/* Groupe : Aujourd'hui */}
            {todayItems.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-mono text-slate-500">AUJOURD'HUI</div>
                {todayItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onLoadAuditFromHistory(item)}
                    className="group relative flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer text-xs text-slate-300 hover:text-white"
                  >
                    {editingItemId === item.id ? (
                      <div className="flex items-center gap-1 w-full" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="text"
                          value={newTitleValue}
                          onChange={(e) => setNewTitleValue(e.target.value)}
                          className="w-full bg-[#121520] border border-amber-500/40 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none"
                          autoFocus
                        />
                        <button onClick={(e) => handleSaveRename(item.id, e)} className="text-emerald-400 hover:text-emerald-300 p-0.5">
                          <Check className="w-3.5 h-3.5" />
                        </button>
                        <button onClick={handleCancelRename} className="text-slate-400 hover:text-slate-300 p-0.5">
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <div className="flex flex-col min-w-0 pr-2">
                          <span className="truncate font-medium text-slate-200 group-hover:text-amber-300 transition-colors">
                            {item.title}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0">
                          {renderScoreBadge(item.conformityScore)}

                          {/* Actions au survol */}
                          <div className="hidden group-hover:flex items-center gap-1">
                            <button
                              onClick={(e) => handleStartRename(item, e)}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                              title="Renommer"
                            >
                              <Edit3 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); toggleArchiveAudit(item.id); }}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-amber-300"
                              title="Archiver"
                            >
                              <Archive className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => { e.stopPropagation(); deleteAudit(item.id); }}
                              className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400"
                              title="Supprimer"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                ))}
              </div>
            )}

            {/* Groupe : 7 derniers jours */}
            {last7DaysItems.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-mono text-slate-500">7 DERNIERS JOURS</div>
                {last7DaysItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onLoadAuditFromHistory(item)}
                    className="group relative flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer text-xs text-slate-300 hover:text-white"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-medium text-slate-200 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderScoreBadge(item.conformityScore)}
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => handleStartRename(item, e)}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-white"
                          title="Renommer"
                        >
                          <Edit3 className="w-3 h-3" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAudit(item.id); }}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Groupe : Plus anciens */}
            {olderItems.length > 0 && (
              <div className="space-y-1">
                <div className="px-2 text-[10px] font-mono text-slate-500">PLUS ANCIENS</div>
                {olderItems.map((item) => (
                  <div
                    key={item.id}
                    onClick={() => onLoadAuditFromHistory(item)}
                    className="group relative flex items-center justify-between px-2.5 py-2 rounded-xl hover:bg-white/[0.06] transition-all cursor-pointer text-xs text-slate-300 hover:text-white"
                  >
                    <div className="flex flex-col min-w-0 pr-2">
                      <span className="truncate font-medium text-slate-300 group-hover:text-amber-300 transition-colors">
                        {item.title}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono">{item.timestamp}</span>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {renderScoreBadge(item.conformityScore)}
                      <div className="hidden group-hover:flex items-center gap-1">
                        <button
                          onClick={(e) => { e.stopPropagation(); deleteAudit(item.id); }}
                          className="p-1 rounded hover:bg-white/10 text-slate-400 hover:text-rose-400"
                          title="Supprimer"
                        >
                          <Trash2 className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ─── BAS : PROFIL UTILISATEUR & RACCOURCIS ─── */}
      <div className="p-3 border-t border-white/[0.05] relative">
        {/* Menu Popup Profil */}
        {showProfileMenu && (
          <div 
            className="absolute bottom-full left-3 right-3 mb-2 bg-[#121622] border border-white/10 rounded-2xl shadow-2xl p-2 z-50 animate-fadeIn"
            onMouseLeave={() => setShowProfileMenu(false)}
          >
            <div className="px-3 py-2 border-b border-white/5">
              <p className="text-xs font-bold text-white truncate">{user?.name}</p>
              <p className="text-[10px] text-slate-400 truncate">{user?.email}</p>
              <p className="text-[10px] text-amber-400 font-mono mt-0.5">{user?.affiliation || 'RCST National Council'}</p>
            </div>

            <button
              onClick={() => {
                setShowProfileMenu(false);
                onOpenProfile();
              }}
              className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer mt-1"
            >
              <UserIcon className="w-3.5 h-3.5 text-amber-400" />
              <span>Mon Profil Éditorial</span>
            </button>

            {user?.role === 'admin' ? (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setActiveView('admin-dashboard');
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                <span>Console de Gouvernance</span>
              </button>
            ) : (
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  setActiveView('reviewer-dashboard');
                }}
                className="w-full px-3 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
                <span>Tableau de Bord Reviewer</span>
              </button>
            )}

            <button
              onClick={() => {
                setShowProfileMenu(false);
                logout();
              }}
              className="w-full px-3 py-2 text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-xl flex items-center gap-2.5 transition-colors cursor-pointer border-t border-white/5 mt-1"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Se déconnecter</span>
            </button>
          </div>
        )}

        {/* Bouton Carte Profil */}
        {isExpanded ? (
          <div 
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] hover:bg-white/[0.08] border border-white/5 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shrink-0 shadow-md">
                {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
              </div>
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-semibold text-white truncate">{user?.name}</span>
                <span className="text-[10px] text-amber-400 font-mono truncate">
                  {user?.role === 'admin' ? '👑 Admin (Éditeur P.)' : '🔬 Reviewer (Comité)'}
                </span>
              </div>
            </div>
            <Settings className="w-4 h-4 text-slate-400 hover:text-white shrink-0" />
          </div>
        ) : (
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="w-10 h-10 mx-auto rounded-xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shadow-md cursor-pointer"
            title={user?.name}
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
          </button>
        )}
      </div>
    </aside>
  );
};
