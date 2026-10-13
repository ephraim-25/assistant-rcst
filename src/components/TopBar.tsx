import React, { useState } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  Search, 
  Bell, 
  Sparkles, 
  ShieldCheck, 
  LogOut,
  Settings,
  LayoutDashboard,
  User as UserIcon,
  CheckCircle2
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface TopBarProps {
  activeView: 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa';
  setActiveView: (view: 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa') => void;
  hasActiveReport: boolean;
  onOpenProfile: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({
  activeView,
  setActiveView,
  hasActiveReport,
  onOpenProfile,
}) => {
  const { user, logout } = useAuth();
  const [searchValue, setSearchValue] = useState('');
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);

  const getBreadcrumb = () => {
    switch (activeView) {
      case 'cockpit':
        return 'Home > Cockpit Éditorial > Audit Split-Screen';
      case 'reviewer-dashboard':
        return 'Home > Espace Reviewer > File de Traitement & KPIs';
      case 'admin-dashboard':
        return 'Home > Gouvernance SIGC > Régulation IA & Comptes';
      case 'constitution':
        return 'Home > Constitution RCST > Règles Fondamentales';
      case 'style':
        return 'Home > Atelier Rédactionnel > Style Impersonnel';
      case 'apa':
        return 'Home > Normalisation Bibliographique > APA 7';
      case 'hub':
      default:
        return 'Home > AI Assistant & Prompt Center';
    }
  };

  return (
    <header className="h-14 w-full bg-[#07090e]/90 backdrop-blur-md border-b border-white/[0.05] px-4 sm:px-6 flex items-center justify-between select-none z-30 transition-all shrink-0">
      {/* Côté Gauche : Flèches, fil d'Ariane & Mode pills */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        {/* Flèches Précédent */}
        <div className="flex items-center gap-1 text-slate-400 shrink-0">
          <button 
            onClick={() => setActiveView('hub')}
            className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors cursor-pointer text-slate-400 hover:text-white"
            title="Accueil"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button 
            className="w-7 h-7 rounded-lg hover:bg-white/5 flex items-center justify-center transition-colors cursor-not-allowed opacity-40 text-slate-500"
            disabled
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Fil d'Ariane */}
        <div className="text-xs font-mono text-slate-400 tracking-wide truncate hidden sm:block">
          {getBreadcrumb()}
        </div>

        {/* Segmented Mode Pills */}
        <div className="hidden md:flex items-center ml-2 p-0.5 rounded-full bg-[#111420] border border-white/5 text-xs shrink-0">
          <button
            onClick={() => setActiveView(hasActiveReport ? 'cockpit' : 'hub')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeView === 'hub' || activeView === 'cockpit'
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Mode Audit
          </button>
          <button
            onClick={() => setActiveView(user?.role === 'admin' ? 'admin-dashboard' : 'reviewer-dashboard')}
            className={`px-3 py-1 rounded-full text-xs font-medium transition-all cursor-pointer ${
              activeView === 'admin-dashboard' || activeView === 'reviewer-dashboard'
                ? 'bg-white text-slate-950 font-semibold shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            {user?.role === 'admin' ? 'Gouvernance SIGC' : 'Mon Tableau de Bord'}
          </button>
        </div>
      </div>

      {/* Côté Droit : Recherche, Statut IA & Profil */}
      <div className="flex items-center gap-3 sm:gap-4 shrink-0">
        {/* Recherche rapide */}
        <div className="relative hidden lg:block w-48 xl:w-56">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search Anything..."
            className="w-full bg-[#111420] hover:bg-[#151926] focus:bg-[#161a29] border border-white/5 focus:border-amber-500/30 rounded-full pl-9 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none transition-all"
          />
        </div>

        {/* Statut IA Gemini */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1 rounded-full bg-[#111420] border border-white/5 text-xs text-slate-300 shadow-inner">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-[11px] font-medium text-slate-300">Gemini 2.5 Flash Actif</span>
        </div>

        {/* Notification Bell */}
        <button 
          className="relative w-8 h-8 rounded-full hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
          title="Notifications de conformité"
        >
          <Bell className="w-4 h-4" />
          <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-amber-500" />
        </button>

        {/* Profil Avatar & Menu */}
        <div className="relative">
          <button
            onClick={() => setIsProfileMenuOpen(!isProfileMenuOpen)}
            className="flex items-center gap-2 p-0.5 rounded-full hover:ring-2 hover:ring-amber-500/30 transition-all cursor-pointer"
            title={user?.name}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-bold text-xs flex items-center justify-center shadow-md">
              {user?.name ? user.name.charAt(0).toUpperCase() : 'U'}
            </div>
          </button>

          {/* Menu Dropdown */}
          {isProfileMenuOpen && (
            <div 
              className="absolute right-0 mt-2 w-64 bg-[#121622] border border-white/10 rounded-2xl shadow-2xl py-2 text-slate-200 z-50 animate-fadeIn"
              onMouseLeave={() => setIsProfileMenuOpen(false)}
            >
              <div className="px-4 py-2 border-b border-white/5">
                <p className="text-xs font-semibold text-white">{user?.name}</p>
                <p className="text-[11px] text-slate-400 truncate font-mono">{user?.email}</p>
                <div className="mt-1.5 inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-[10px] font-mono border bg-amber-500/10 text-amber-300 border-amber-500/20">
                  <ShieldCheck className="w-3 h-3" />
                  <span>{user?.role === 'admin' ? 'Éditeur Principal (Admin)' : 'Reviewer (Comité)'}</span>
                </div>
              </div>

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  onOpenProfile();
                }}
                className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors cursor-pointer"
              >
                <UserIcon className="w-3.5 h-3.5 text-amber-400" />
                <span>Mon Profil Éditorial</span>
              </button>

              {user?.role === 'admin' ? (
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setActiveView('admin-dashboard');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
                  <span>Console de Gouvernance SIGC</span>
                </button>
              ) : (
                <button
                  onClick={() => {
                    setIsProfileMenuOpen(false);
                    setActiveView('reviewer-dashboard');
                  }}
                  className="w-full px-4 py-2 text-left text-xs text-slate-300 hover:text-white hover:bg-white/5 flex items-center gap-2.5 transition-colors cursor-pointer"
                >
                  <LayoutDashboard className="w-3.5 h-3.5 text-sky-400" />
                  <span>Tableau de Bord Reviewer</span>
                </button>
              )}

              <button
                onClick={() => {
                  setIsProfileMenuOpen(false);
                  logout();
                }}
                className="w-full px-4 py-2 text-left text-xs text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 flex items-center gap-2.5 transition-colors cursor-pointer border-t border-white/5 mt-1"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Se déconnecter</span>
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
