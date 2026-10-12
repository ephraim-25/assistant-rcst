import React from 'react';
import { 
  ShieldCheck, 
  BookOpen, 
  PenTool, 
  FileText, 
  BookmarkCheck, 
  CheckCircle2 
} from 'lucide-react';

interface HeaderProps {
  activeTab: 'audit' | 'constitution' | 'style' | 'apa';
  setActiveTab: (tab: 'audit' | 'constitution' | 'style' | 'apa') => void;
}

/**
 * Blason officiel de la Revue Congolaise des Sciences & Technologies (RCST)
 * Inspiré des armoiries académiques et symboles de souveraineté scientifique de la RDC.
 */
const RcstOfficialCrest: React.FC<{ className?: string }> = ({ className = "w-11 h-11" }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-label="Blason officiel RCST"
  >
    <defs>
      <linearGradient id="crestGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="crestShieldBg" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
      <linearGradient id="drcBlue" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stopColor="#0284c7" />
        <stop offset="100%" stopColor="#0369a1" />
      </linearGradient>
      <linearGradient id="drcRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
    </defs>

    {/* Ombre portée du bouclier */}
    <path
      d="M50 94 C25 80 14 62 14 26 L50 14 L86 26 C86 62 75 80 50 94 Z"
      fill="black"
      opacity="0.3"
      transform="translate(0, 2)"
    />

    {/* Bouclier principal */}
    <path
      d="M50 92 C26 78 15 61 15 26 L50 15 L85 26 C85 61 74 78 50 92 Z"
      fill="url(#crestShieldBg)"
      stroke="url(#crestGold)"
      strokeWidth="2.5"
    />

    {/* Filet intérieur doré */}
    <path
      d="M50 87 C30 74 20 58 20 29 L50 19 L80 29 C80 58 70 74 50 87 Z"
      fill="none"
      stroke="url(#crestGold)"
      strokeWidth="1"
      strokeOpacity="0.6"
      strokeDasharray="2 1"
    />

    {/* Diagonale rouge & liseré jaune (drapeau RDC) */}
    <path
      d="M20 29 L74 83 C76 80 78 77 80 73 L26 21 Z"
      fill="url(#drcRed)"
      opacity="0.85"
    />
    <path
      d="M26 21 L80 73 L80 70 L28 20 Z"
      fill="#fbbf24"
      opacity="0.9"
    />

    {/* Étoile d'or au sommet */}
    <polygon
      points="50,22 52.5,28 58.5,28.5 54,32.5 55.5,38.5 50,35 44.5,38.5 46,32.5 41.5,28.5 47.5,28"
      fill="url(#crestGold)"
      stroke="#78350f"
      strokeWidth="0.5"
    />

    {/* Couronne de laurier dorée stylisée */}
    <path
      d="M32 60 C30 45 36 34 40 30 M68 60 C70 45 64 34 60 30"
      stroke="url(#crestGold)"
      strokeWidth="1.5"
      strokeLinecap="round"
      opacity="0.8"
    />

    {/* Livre ouvert de la science */}
    <path
      d="M36 56 C42 54 48 56 50 58 C52 56 58 54 64 56 L64 68 C58 66 52 68 50 70 C48 68 42 66 36 68 Z"
      fill="#f8fafc"
      stroke="url(#crestGold)"
      strokeWidth="1.2"
    />
    <line x1="50" y1="58" x2="50" y2="70" stroke="#f59e0b" strokeWidth="1" />

    {/* Flamme de la recherche */}
    <path
      d="M50 42 C48 46 45 48 45 51 C45 54 47 55 50 55 C53 55 55 54 55 51 C55 48 52 46 50 42 Z"
      fill="url(#crestGold)"
    />

    {/* Inscription académique sur le bas du bouclier */}
    <text
      x="50"
      y="82"
      textAnchor="middle"
      fill="#fef08a"
      fontSize="7.5"
      fontWeight="900"
      fontFamily="serif"
      letterSpacing="1"
    >
      RDC
    </text>
  </svg>
);

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-800 bg-[#0c101c] sticky top-0 z-40 shadow-xl">
      {/* 1. BANDE SUPÉRIEURE (Top Bar) */}
      <div className="border-t-[3px] border-amber-400 bg-[#07090e] border-b border-slate-800/80 px-4 sm:px-6 lg:px-8 py-1.5 text-xs flex flex-col sm:flex-row justify-between items-center gap-1.5 shadow-inner">
        {/* Texte à gauche */}
        <div className="flex items-center gap-2 flex-wrap justify-center sm:justify-start">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.9)] animate-pulse shrink-0"></span>
          <span className="font-bold tracking-wider uppercase text-[11px] text-amber-300">
            RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
          </span>
          <span className="text-slate-600 font-light hidden sm:inline">|</span>
          <span className="text-slate-300 text-[11px] font-medium tracking-normal">
            Ministère de l'Enseignement Supérieur, Universitaire et Recherche Scientifique
          </span>
        </div>

        {/* Texte à droite */}
        <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono shrink-0">
          <span className="text-slate-400 font-semibold tracking-wider">ISSN 2789-4112</span>
          <span className="text-slate-600">•</span>
          <span className="text-emerald-400 font-medium flex items-center gap-1.5">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="font-sans font-semibold">Audit Éditorial Assermenté</span>
          </span>
        </div>
      </div>

      {/* 2. BARRE DE NAVIGATION PRINCIPALE */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Logo de la RCST à gauche avec le blason officiel */}
        <div className="flex items-center gap-3.5">
          <div className="flex items-center gap-2.5 shrink-0">
            <RcstOfficialCrest className="w-12 h-12 shrink-0 drop-shadow-[0_2px_8px_rgba(245,158,11,0.25)]" />
            <div className="flex flex-col">
              <span className="font-serif font-black text-2xl tracking-tight text-white leading-none">
                RCST
              </span>
              <span className="text-[8.5px] font-bold tracking-wider text-amber-400/90 uppercase leading-tight mt-0.5">
                Conseil Scientifique National
              </span>
            </div>
          </div>

          <div className="h-9 w-px bg-slate-800 hidden sm:block mx-1"></div>

          {/* Titre et sous-titre officiel */}
          <div>
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-base sm:text-lg lg:text-xl font-bold font-serif tracking-tight text-white flex items-center gap-2">
                Revue Congolaise des Sciences & Technologies
              </h1>
              <span className="inline-flex items-center px-2 py-0.5 text-[10px] uppercase font-extrabold tracking-widest rounded bg-gradient-to-r from-amber-500/20 via-yellow-500/15 to-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm shadow-amber-500/10">
                OFFICIEL
              </span>
            </div>
            <p className="text-xs text-slate-400 flex flex-wrap items-center gap-2 mt-0.5">
              <span className="text-amber-400 font-semibold flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-amber-400 inline shrink-0" />
                Auditeur Éditorial Principal
              </span>
              <span className="text-slate-600 hidden sm:inline">•</span>
              <span className="text-slate-300 text-[11px] sm:text-xs">
                Contrôle de conformité Constitution RCST & Normes Académiques Internationales
              </span>
            </p>
          </div>
        </div>

        {/* Boutons de navigation à droite (style pastilles sombres et bouton orange proéminent) */}
        <nav className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 scrollbar-none shrink-0">
          {/* 📄 [Bouton Orange Proéminent] "Audit de Manuscrit" */}
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
              activeTab === 'audit'
                ? 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 text-slate-950 shadow-lg shadow-orange-500/30 border border-amber-200/50 ring-2 ring-amber-400/80 ring-offset-2 ring-offset-slate-950 scale-[1.02]'
                : 'bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-slate-950 shadow-md shadow-orange-500/20 border border-amber-300/40 hover:scale-[1.02] active:scale-[0.99]'
            }`}
            title="Lancer l'audit complet du manuscrit"
          >
            <FileText className="w-4 h-4 shrink-0" />
            <span>Audit de Manuscrit</span>
          </button>

          {/* 📖 "Constitution RCST" */}
          <button
            onClick={() => setActiveTab('constitution')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'constitution'
                ? 'bg-slate-800 text-amber-300 border border-amber-500/60 ring-1 ring-amber-400/40 shadow-md shadow-amber-500/10 font-semibold'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 shadow-sm'
            }`}
            title="Consulter les 10 règles d'or de la Constitution RCST"
          >
            <BookOpen className="w-4 h-4 text-amber-400 shrink-0" />
            <span>Constitution RCST</span>
          </button>

          {/* ✍️ "Atelier Style Impersonnel" */}
          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'style'
                ? 'bg-slate-800 text-amber-300 border border-amber-500/60 ring-1 ring-amber-400/40 shadow-md shadow-amber-500/10 font-semibold'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 shadow-sm'
            }`}
            title="Reformuler en style impersonnel strict conforme RCST"
          >
            <PenTool className="w-4 h-4 text-sky-400 shrink-0" />
            <span>Atelier Style Impersonnel</span>
          </button>

          {/* 🔖 "Vérificateur APA 7" */}
          <button
            onClick={() => setActiveTab('apa')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-medium transition-all cursor-pointer ${
              activeTab === 'apa'
                ? 'bg-slate-800 text-amber-300 border border-amber-500/60 ring-1 ring-amber-400/40 shadow-md shadow-amber-500/10 font-semibold'
                : 'bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700/70 shadow-sm'
            }`}
            title="Convertir et valider les références selon APA 7e édition"
          >
            <BookmarkCheck className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>Vérificateur APA 7</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
