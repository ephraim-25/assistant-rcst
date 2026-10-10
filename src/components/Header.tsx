import React from 'react';
import { ShieldCheck, BookOpen, PenTool, Sparkles, Award, FileCheck2 } from 'lucide-react';

interface HeaderProps {
  activeTab: 'audit' | 'constitution' | 'style' | 'apa';
  setActiveTab: (tab: 'audit' | 'constitution' | 'style' | 'apa') => void;
}

export const Header: React.FC<HeaderProps> = ({ activeTab, setActiveTab }) => {
  return (
    <header className="border-b border-slate-800 bg-slate-900/90 backdrop-blur-md sticky top-0 z-40">
      {/* Top micro-banner with national & academic identity */}
      <div className="bg-gradient-to-r from-sky-900 via-blue-900 to-amber-950/80 px-4 py-1 text-xs text-sky-200/90 flex justify-between items-center border-b border-sky-800/40">
        <div className="flex items-center gap-2">
          <span className="inline-block w-2.5 h-2.5 rounded-full bg-amber-400 animate-pulse"></span>
          <span className="font-semibold tracking-wider uppercase text-[11px] text-amber-300">
            RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
          </span>
          <span className="text-slate-400">|</span>
          <span className="text-slate-300 text-[11px]">Ministère de l'Enseignement Supérieur, Universitaire et Recherche Scientifique</span>
        </div>
        <div className="hidden md:flex items-center gap-3 text-[11px] text-slate-300 font-mono">
          <span>ISSN 2789-4112</span>
          <span>•</span>
          <span className="text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3 h-3" /> Audit Éditorial Assermenté
          </span>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        {/* Emblem & Journal Title */}
        <div className="flex items-center gap-3.5">
          <div className="relative flex-shrink-0">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 via-blue-700 to-sky-900 p-0.5 shadow-lg shadow-sky-950/50">
              <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center border border-amber-400/30">
                <span className="font-serif font-black text-amber-400 text-lg tracking-tighter">RCST</span>
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 w-4 h-4 bg-sky-500 rounded-full flex items-center justify-center text-[9px] font-bold text-slate-950 border border-slate-900">
              ★
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-lg sm:text-xl font-bold font-serif tracking-tight text-white flex items-center gap-1.5">
                Revue Congolaise des Sciences & Technologies
              </h1>
              <span className="hidden sm:inline-flex px-2 py-0.5 text-[10px] uppercase font-bold tracking-wider rounded-md bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Officiel
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <span className="text-sky-400 font-medium">Auditeur Éditorial Principal</span>
              <span>•</span>
              <span className="text-slate-400">Contrôle de conformité Constitution RCST & Normes Académiques Internationales</span>
            </p>
          </div>
        </div>

        {/* Tab Navigation */}
        <nav className="flex items-center gap-1.5 overflow-x-auto pb-1 md:pb-0 scrollbar-none">
          <button
            onClick={() => setActiveTab('audit')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'audit'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <FileCheck2 className="w-4 h-4" />
            <span>Audit de Manuscrit</span>
          </button>

          <button
            onClick={() => setActiveTab('constitution')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'constitution'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            <span>Constitution RCST</span>
          </button>

          <button
            onClick={() => setActiveTab('style')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'style'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <PenTool className="w-4 h-4" />
            <span>Atelier Style Impersonnel</span>
          </button>

          <button
            onClick={() => setActiveTab('apa')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-medium transition-all ${
              activeTab === 'apa'
                ? 'bg-amber-500 text-slate-950 font-semibold shadow-md shadow-amber-500/20'
                : 'text-slate-300 hover:text-white hover:bg-slate-800/80 border border-slate-800/60'
            }`}
          >
            <Award className="w-4 h-4" />
            <span>Vérificateur APA 7</span>
          </button>
        </nav>
      </div>
    </header>
  );
};
