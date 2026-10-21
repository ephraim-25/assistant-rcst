import React, { useEffect, useRef, useState } from 'react';
import { LogOut, Menu, User as UserIcon, LayoutDashboard, Settings } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

type View = 'hub' | 'cockpit' | 'reviewer-dashboard' | 'admin-dashboard' | 'constitution' | 'style' | 'apa';

interface TopBarProps {
  activeView: View;
  setActiveView: (view: View) => void;
  hasActiveReport: boolean;
  onOpenProfile: () => void;
  onOpenMenu?: () => void;
}

const VIEW_TITLES: Record<View, string> = {
  hub: 'Nouvel audit',
  cockpit: 'Rapport de conformité',
  'reviewer-dashboard': 'Mon tableau de bord',
  'admin-dashboard': 'Administration',
  constitution: 'Constitution RCST',
  style: 'Style impersonnel',
  apa: 'Références APA 7',
};

const menuItem =
  'flex w-full items-center gap-2.5 px-3.5 py-2 text-left text-sm text-slate-200 hover:bg-slate-800';

export const TopBar: React.FC<TopBarProps> = ({ activeView, setActiveView, onOpenProfile, onOpenMenu }) => {
  const { user, logout } = useAuth();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fermeture au clic extérieur et à Échap (le menu ne se ferme plus quand la souris le quitte)
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const isAdmin = user?.role === 'admin';
  const go = (view: View) => {
    setOpen(false);
    setActiveView(view);
  };

  return (
    <header className="flex h-14 shrink-0 items-center justify-between border-b border-slate-800 bg-slate-950 px-5 sm:px-8">
      <div className="flex min-w-0 items-center gap-2">
        {onOpenMenu && (
          <button
            onClick={onOpenMenu}
            aria-label="Ouvrir le menu"
            className="-ml-2 grid h-10 w-10 shrink-0 place-items-center rounded-md text-slate-300 hover:bg-slate-900 md:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        )}
        <h1 className="truncate text-[15px] font-semibold text-slate-100">{VIEW_TITLES[activeView]}</h1>
      </div>

      <div ref={ref} className="relative">
        <button
          onClick={() => setOpen((v) => !v)}
          aria-haspopup="menu"
          aria-expanded={open}
          className="flex items-center gap-2.5 rounded-md py-1 pl-2.5 pr-1 hover:bg-slate-900"
        >
          <span className="hidden text-sm text-slate-300 sm:block">{user?.name}</span>
          <span
            aria-hidden
            className="grid h-8 w-8 place-items-center rounded-full bg-slate-800 text-xs font-semibold text-slate-100"
          >
            {user?.name ? user.name.charAt(0).toUpperCase() : '?'}
          </span>
        </button>

        {open && (
          <div
            role="menu"
            className="rcst-enter absolute right-0 z-50 mt-2 w-64 origin-top-right overflow-hidden rounded-lg border border-slate-700 bg-slate-900 py-1"
          >
            <div className="border-b border-slate-800 px-3.5 py-2.5">
              <p className="text-sm font-medium text-slate-100">{user?.name}</p>
              <p className="truncate text-xs text-slate-400">{user?.email}</p>
              <p className="mt-1.5 text-xs text-amber-300">
                {isAdmin ? 'Éditeur principal' : 'Reviewer, comité de lecture'}
              </p>
            </div>

            <button
              role="menuitem"
              className={menuItem}
              onClick={() => {
                setOpen(false);
                onOpenProfile();
              }}
            >
              <UserIcon className="h-4 w-4 text-slate-400" /> Mon profil
            </button>
            <button
              role="menuitem"
              className={menuItem}
              onClick={() => go(isAdmin ? 'admin-dashboard' : 'reviewer-dashboard')}
            >
              {isAdmin ? (
                <Settings className="h-4 w-4 text-slate-400" />
              ) : (
                <LayoutDashboard className="h-4 w-4 text-slate-400" />
              )}
              {isAdmin ? 'Administration' : 'Mon tableau de bord'}
            </button>
            <button
              role="menuitem"
              className={`${menuItem} border-t border-slate-800 text-rose-300`}
              onClick={() => {
                setOpen(false);
                logout();
              }}
            >
              <LogOut className="h-4 w-4" /> Se déconnecter
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
