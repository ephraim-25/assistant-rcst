import React, { useState } from 'react';
import { 
  FileText, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  UserCheck, 
  ArrowUpRight, 
  Play, 
  Filter, 
  Search, 
  Award, 
  Building2, 
  GraduationCap, 
  Send, 
  ShieldCheck,
  Sparkles,
  BarChart3,
  Calendar
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGovernance } from '../context/GovernanceContext';
import { ReviewQueueItem, QueueItemStatus } from '../types/governance';

interface ReviewerDashboardProps {
  onStartAudit: (manuscriptText: string, filename: string) => void;
  onOpenProfile: () => void;
}

export const ReviewerDashboard: React.FC<ReviewerDashboardProps> = ({
  onStartAudit,
  onOpenProfile,
}) => {
  const { user } = useAuth();
  const { queueItems, historyItems, aiConfig, updateQueueItemStatus } = useGovernance();

  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  // Statistiques calculées
  const userAudits = historyItems.filter((h) => h.userId === user?.id || user?.role === 'admin');
  const totalAuditsCount = userAudits.length;
  
  const averageScore = totalAuditsCount > 0
    ? Math.round(userAudits.reduce((acc, curr) => acc + curr.conformityScore, 0) / totalAuditsCount)
    : 72;

  const styleDetectionRate = '94.2%';
  const dailyQuotaUsed = 7;
  const dailyQuotaMax = aiConfig.reviewerDailyQuota;

  // Filtrer la file de traitement
  const filteredQueue = queueItems.filter((item) => {
    const matchesFilter = selectedStatusFilter === 'all' || item.status === selectedStatusFilter;
    const matchesSearch = 
      item.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.authorName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sourceFilename.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const getStatusBadge = (status: QueueItemStatus) => {
    switch (status) {
      case 'pending_audit':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-500/15 text-amber-400 border border-amber-500/30">
            <Clock className="w-3 h-3" />
            En attente d'audit
          </span>
        );
      case 'under_review':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-sky-500/15 text-sky-400 border border-sky-500/30">
            <Sparkles className="w-3 h-3" />
            En cours de relecture
          </span>
        );
      case 'report_validated':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <CheckCircle2 className="w-3 h-3" />
            Rapport validé
          </span>
        );
      case 'transmitted':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/15 text-purple-400 border border-purple-500/30">
            <Send className="w-3 h-3" />
            Transmis à l'auteur
          </span>
        );
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fadeIn text-slate-100">
      {/* ─── BANDEAU SUPÉRIEUR DE BIENVENUE & PROFIL ─── */}
      <div className="rounded-xl bg-slate-900 border border-white/10 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-sky-500/10 rounded-full pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-lg bg-slate-100 hover:bg-white text-slate-950 font-bold text-2xl flex items-center justify-center">
            {user?.name ? user.name.charAt(0).toUpperCase() : 'R'}
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">{user?.name}</h1>
              <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/30 text-xs font-mono">
                Reviewer Assermenté
              </span>
            </div>
            <p className="text-xs text-slate-400 flex items-center gap-2">
              <Building2 className="w-3.5 h-3.5 text-slate-500" />
              <span>{user?.affiliation || 'Université de Kinshasa • Faculté Polytechnique'}</span>
              <span>•</span>
              <GraduationCap className="w-3.5 h-3.5 text-slate-500" />
              <span>{user?.specialty || 'Comité de Rédaction RCST'}</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 z-10 w-full sm:w-auto">
          <button
            onClick={onOpenProfile}
            className="flex-1 sm:flex-initial px-4 py-2.5 rounded-md bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition-colors cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Modifier Mon Profil</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* ─── KPIS & STATISTIQUES PERSONNELLES ─── */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1 : Manuscrits audités */}
        <div className="p-5 rounded-lg bg-slate-950 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Manuscrits Audités</span>
            <FileText className="w-4 h-4 text-sky-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-white font-mono">{totalAuditsCount}</span>
            <span className="text-xs text-emerald-400 font-medium">+3 cette semaine</span>
          </div>
        </div>

        {/* KPI 2 : Score moyen de conformité */}
        <div className="p-5 rounded-lg bg-slate-950 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Score Moyen Révisé</span>
            <BarChart3 className="w-4 h-4 text-amber-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-white font-mono">{averageScore}%</span>
            <span className="text-xs text-slate-400">Normes RCST & IMRAD</span>
          </div>
        </div>

        {/* KPI 3 : Taux détection style & APA 7 */}
        <div className="p-5 rounded-lg bg-slate-950 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Précision Style & APA 7</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-white font-mono">{styleDetectionRate}</span>
            <span className="text-xs text-emerald-400">Haute fidélité</span>
          </div>
        </div>

        {/* KPI 4 : Quota d'audits journalier */}
        <div className="p-5 rounded-lg bg-slate-950 border border-white/10 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs mb-3">
            <span>Quota Quotidien IA</span>
            <Sparkles className="w-4 h-4 text-purple-400" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-semibold text-white font-mono">
              {dailyQuotaUsed} / {dailyQuotaMax}
            </span>
            <span className="text-xs text-slate-400">audits restants</span>
          </div>
        </div>
      </div>

      {/* ─── FILE DE TRAITEMENT (MY QUEUE) ─── */}
      <div className="rounded-xl bg-slate-950 border border-white/10 p-6 space-y-6">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>File de Traitement des Manuscrits</span>
              <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                {filteredQueue.length} dossier(s)
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Articles soumis assignés à votre expertise pour contrôle de conformité éditoriale
            </p>
          </div>

          {/* Recherche & Filtre de statut */}
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-56">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Rechercher manuscrit..."
                className="w-full bg-slate-900 border border-white/10 rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-sky-500/50"
              />
            </div>

            <select
              value={selectedStatusFilter}
              onChange={(e) => setSelectedStatusFilter(e.target.value)}
              className="bg-slate-900 border border-white/10 rounded-md px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-sky-500/50 cursor-pointer"
            >
              <option value="all">Tous les états</option>
              <option value="pending_audit">En attente d'audit</option>
              <option value="under_review">En cours de relecture</option>
              <option value="report_validated">Rapport validé</option>
              <option value="transmitted">Transmis à l'auteur</option>
            </select>
          </div>
        </div>

        {/* Liste des cartes / table de la file de traitement */}
        {filteredQueue.length === 0 ? (
          <div className="text-center py-12 text-slate-500 text-xs">
            Aucun manuscrit ne correspond à ces critères de recherche dans votre file.
          </div>
        ) : (
          <div className="space-y-3">
            {filteredQueue.map((item) => (
              <div
                key={item.id}
                className="p-4 rounded-lg bg-slate-900/70 hover:bg-slate-900 border border-white/5 hover:border-sky-500/30 transition-colors flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
              >
                <div className="flex-1 min-w-0 space-y-1.5">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    {getStatusBadge(item.status)}
                    <span className="text-xs font-mono text-slate-400 bg-white/5 px-2 py-0.5 rounded">
                      {item.category}
                    </span>
                    <span className="text-xs text-slate-500 flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      Soumis le {item.submittedDate}
                    </span>
                  </div>

                  <h3 className="text-sm font-semibold text-white truncate max-w-2xl">
                    {item.title}
                  </h3>

                  <p className="text-xs text-slate-400">
                    Auteur principal : <strong className="text-slate-300">{item.authorName}</strong> • Fichier source : <span className="font-mono text-slate-300">{item.sourceFilename}</span>
                  </p>
                </div>

                {/* Actions sur le manuscrit */}
                <div className="flex items-center gap-2.5 shrink-0 w-full md:w-auto justify-end">
                  {/* Sélecteur de statut rapide */}
                  <select
                    value={item.status}
                    onChange={(e) => updateQueueItemStatus(item.id, e.target.value as QueueItemStatus)}
                    className="bg-slate-900 border border-white/10 rounded-md px-2.5 py-1.5 text-xs text-slate-300 focus:outline-none cursor-pointer"
                  >
                    <option value="pending_audit">Attente audit</option>
                    <option value="under_review">En cours</option>
                    <option value="report_validated">Validé</option>
                    <option value="transmitted">Transmis</option>
                  </select>

                  {/* Bouton pour lancer l'audit direct dans le Cockpit */}
                  <button
                    onClick={() => onStartAudit(item.manuscriptText, item.sourceFilename)}
                    className="px-3.5 py-1.5 rounded-md bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3 h-3 fill-current" />
                    <span>Auditer dans Cockpit</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
