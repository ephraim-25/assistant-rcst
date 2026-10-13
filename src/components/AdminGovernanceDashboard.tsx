import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Users, 
  Cpu, 
  BarChart3, 
  UserPlus, 
  Search, 
  Filter, 
  Trash2, 
  Edit2, 
  Ban, 
  CheckCircle2, 
  AlertTriangle, 
  Clock, 
  Sparkles, 
  Gauge, 
  Sliders, 
  FileText, 
  TrendingUp, 
  Lock, 
  Mail, 
  Building2, 
  GraduationCap, 
  X, 
  Save, 
  RefreshCw,
  Coins,
  History,
  Check
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useGovernance } from '../context/GovernanceContext';
import { StoredUserAccount, UserRole, UserStatus } from '../types/auth';
import { GeminiModelId } from '../types/governance';

export const AdminGovernanceDashboard: React.FC = () => {
  const { 
    registeredUsers, 
    adminCreateUser, 
    adminUpdateUser, 
    adminToggleUserStatus, 
    adminDeleteUser 
  } = useAuth();
  const { aiConfig, updateAiConfig, auditLogs, historyItems } = useGovernance();

  // Navigation par onglets dans la gouvernance
  const [activeTab, setActiveTab] = useState<'users' | 'ai-regulation' | 'analytics'>('users');

  // Filtres pour la console utilisateurs
  const [userRoleFilter, setUserRoleFilter] = useState<string>('all');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('all');
  const [userSearchTerm, setUserSearchTerm] = useState<string>('');

  // Modale de création d'utilisateur
  const [isCreateModalOpen, setIsCreateModalOpen] = useState<boolean>(false);
  const [newUserName, setNewUserName] = useState<string>('');
  const [newUserEmail, setNewUserEmail] = useState<string>('');
  const [newUserPassword, setNewUserPassword] = useState<string>('password123');
  const [newUserRole, setNewUserRole] = useState<UserRole>('reviewer');
  const [newUserAffiliation, setNewUserAffiliation] = useState<string>('Université de Kinshasa');
  const [newUserSpecialty, setNewUserSpecialty] = useState<string>('Sciences Appliquées');
  const [createFeedback, setCreateFeedback] = useState<string | null>(null);

  // Modale d'édition d'utilisateur
  const [editingUser, setEditingUser] = useState<StoredUserAccount | null>(null);
  const [editUserName, setEditUserName] = useState<string>('');
  const [editUserEmail, setEditUserEmail] = useState<string>('');
  const [editUserRole, setEditUserRole] = useState<UserRole>('reviewer');
  const [editUserAffiliation, setEditUserAffiliation] = useState<string>('');
  const [editUserSpecialty, setEditUserSpecialty] = useState<string>('');
  const [editNewPassword, setEditNewPassword] = useState<string>('');

  // État local de la config IA
  const [selectedModel, setSelectedModel] = useState<GeminiModelId>(aiConfig.defaultModel);
  const [temperature, setTemperature] = useState<number>(aiConfig.temperature);
  const [reviewerQuota, setReviewerQuota] = useState<number>(aiConfig.reviewerDailyQuota);
  const [maxOutputTokensAudit, setMaxOutputTokensAudit] = useState<number>(aiConfig.maxOutputTokensAudit);
  const [maxOutputTokensChat, setMaxOutputTokensChat] = useState<number>(aiConfig.maxOutputTokensChat);
  const [budgetAlertThreshold, setBudgetAlertThreshold] = useState<number>(aiConfig.budgetAlertThresholdPercent);
  const [configSavedToast, setConfigSavedToast] = useState<boolean>(false);

  // Sauvegarde des paramètres IA
  const handleSaveAiConfig = () => {
    updateAiConfig({
      defaultModel: selectedModel,
      temperature,
      reviewerDailyQuota: reviewerQuota,
      maxOutputTokensAudit,
      maxOutputTokensChat,
      budgetAlertThresholdPercent: budgetAlertThreshold,
    });
    setConfigSavedToast(true);
    setTimeout(() => setConfigSavedToast(false), 2000);
  };

  // Filtrage des utilisateurs
  const filteredUsers = registeredUsers.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role === userRoleFilter;
    const matchesStatus = userStatusFilter === 'all' || u.status === userStatusFilter;
    const matchesSearch = 
      u.name.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearchTerm.toLowerCase()) ||
      (u.affiliation && u.affiliation.toLowerCase().includes(userSearchTerm.toLowerCase()));
    return matchesRole && matchesStatus && matchesSearch;
  });

  // Soumission création utilisateur
  const handleCreateUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreateFeedback(null);

    const res = await adminCreateUser({
      name: newUserName,
      email: newUserEmail,
      password: newUserPassword,
      role: newUserRole,
      affiliation: newUserAffiliation,
      specialty: newUserSpecialty,
    });

    if (res.success) {
      setIsCreateModalOpen(false);
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('password123');
    } else {
      setCreateFeedback(res.error || 'Erreur lors de la création');
    }
  };

  // Ouverture modale d'édition
  const openEditModal = (u: StoredUserAccount) => {
    setEditingUser(u);
    setEditUserName(u.name);
    setEditUserEmail(u.email);
    setEditUserRole(u.role);
    setEditUserAffiliation(u.affiliation || '');
    setEditUserSpecialty(u.specialty || '');
    setEditNewPassword('');
  };

  const handleEditUserSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    await adminUpdateUser(editingUser.id, {
      name: editUserName,
      email: editUserEmail,
      role: editUserRole,
      affiliation: editUserAffiliation,
      specialty: editUserSpecialty,
      password: editNewPassword ? editNewPassword : editingUser.password,
    });

    setEditingUser(null);
  };

  // Calcul du budget consommé
  const tokenConsumptionPercent = Math.min(
    100,
    Math.round((aiConfig.totalTokensConsumed / aiConfig.monthlyBudgetLimitTokens) * 100)
  );

  return (
    <div className="w-full max-w-6xl mx-auto px-6 py-8 space-y-8 animate-fadeIn text-slate-100">
      {/* ─── BANDEAU SUPÉRIEUR INSTITUTIONNEL (SIGC RCST) ─── */}
      <div className="rounded-3xl bg-gradient-to-r from-[#181308] via-[#120f06] to-[#1c180e] border border-amber-500/30 p-6 sm:p-8 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-2xl relative overflow-hidden">
        <div className="absolute right-0 top-0 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-4 z-10">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-600 to-amber-400 text-slate-950 font-black text-2xl flex items-center justify-center shadow-lg shadow-amber-500/20">
            <ShieldCheck className="w-9 h-9" />
          </div>
          <div>
            <div className="flex items-center gap-2 mb-1">
              <h1 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                Console de Gouvernance SIGC & Régulation IA
              </h1>
              <span className="px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[10px] font-mono uppercase">
                Éditeur Principal
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Système Intégré de Gestion des Comptes (SIGC) • Surveillance des Quotas Gemini • Traçabilité Système
            </p>
          </div>
        </div>

        {/* Boutons onglets */}
        <div className="flex items-center gap-2 z-10 bg-[#0e1118] p-1.5 rounded-2xl border border-white/10 w-full md:w-auto">
          <button
            onClick={() => setActiveTab('users')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'users'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-3.5 h-3.5" />
            <span>Gestion Comptes (CRUD)</span>
          </button>

          <button
            onClick={() => setActiveTab('ai-regulation')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'ai-regulation'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <Cpu className="w-3.5 h-3.5" />
            <span>Régulation IA & Quotas</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex-1 md:flex-initial px-4 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-2 transition-all cursor-pointer ${
              activeTab === 'analytics'
                ? 'bg-amber-500 text-slate-950 shadow-md font-bold'
                : 'text-slate-400 hover:text-white hover:bg-white/5'
            }`}
          >
            <BarChart3 className="w-3.5 h-3.5" />
            <span>Analytics Revue</span>
          </button>
        </div>
      </div>

      {/* ─── ONGLET 1 : CONSOLE DE GESTION UTILISATEURS (CRUD SIGC) ─── */}
      {activeTab === 'users' && (
        <div className="rounded-3xl bg-[#0c0e15] border border-white/10 p-6 shadow-2xl space-y-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
                <span>Comptes Accrédités RCST</span>
                <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-white/5 text-amber-300">
                  {filteredUsers.length} utilisateur(s)
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Administration des privilèges, suspension temporaire et accréditation des réviseurs
              </p>
            </div>

            <div className="flex items-center gap-3 w-full sm:w-auto">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
              >
                <UserPlus className="w-4 h-4" />
                <span>+ Nouvel Utilisateur</span>
              </button>
            </div>
          </div>

          {/* Barre de filtres */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-72">
              <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchTerm}
                onChange={(e) => setUserSearchTerm(e.target.value)}
                placeholder="Rechercher par nom, email, affiliation..."
                className="w-full bg-[#121520] border border-white/10 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-amber-500/50"
              />
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-[#121520] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Tous les rôles</option>
                <option value="admin">Administrateur</option>
                <option value="reviewer">Reviewer</option>
              </select>

              <select
                value={userStatusFilter}
                onChange={(e) => setUserStatusFilter(e.target.value)}
                className="bg-[#121520] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-slate-200 focus:outline-none cursor-pointer"
              >
                <option value="all">Tous les statuts</option>
                <option value="active">Actif</option>
                <option value="suspended">Suspendu</option>
              </select>
            </div>
          </div>

          {/* Tableau CRUD */}
          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#090b11]">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-[#121522] text-slate-400 font-semibold border-b border-white/5 uppercase text-[10px] tracking-wider">
                <tr>
                  <th className="py-3 px-4">Utilisateur & Contact</th>
                  <th className="py-3 px-4">Grade & Rôle</th>
                  <th className="py-3 px-4">Affiliation & Spécialité</th>
                  <th className="py-3 px-4 text-center">Audits Réalisés</th>
                  <th className="py-3 px-4 text-center">Statut Compte</th>
                  <th className="py-3 px-4 text-right">Actions SIGC</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                    {/* Nom et email */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-slate-700 to-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                          {u.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="font-semibold text-white">{u.name}</p>
                          <p className="text-[11px] text-slate-400 font-mono">{u.email}</p>
                        </div>
                      </div>
                    </td>

                    {/* Rôle */}
                    <td className="py-3.5 px-4">
                      <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase font-bold border ${
                        u.role === 'admin'
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                          : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                      }`}>
                        {u.role === 'admin' ? '👑 Administrateur' : '🔬 Reviewer'}
                      </span>
                    </td>

                    {/* Affiliation */}
                    <td className="py-3.5 px-4">
                      <p className="text-slate-300 font-medium">{u.affiliation || 'Non renseignée'}</p>
                      <p className="text-[11px] text-slate-500">{u.specialty || 'Généraliste'}</p>
                    </td>

                    {/* Audits réalisés */}
                    <td className="py-3.5 px-4 text-center font-mono font-bold text-slate-200">
                      {u.auditsCount}
                    </td>

                    {/* Statut */}
                    <td className="py-3.5 px-4 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        u.status === 'active'
                          ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      }`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${u.status === 'active' ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                        {u.status === 'active' ? 'Actif' : 'Suspendu'}
                      </span>
                    </td>

                    {/* Actions */}
                    <td className="py-3.5 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Modifier */}
                        <button
                          onClick={() => openEditModal(u)}
                          className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
                          title="Modifier le compte"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>

                        {/* Suspendre / Réactiver */}
                        <button
                          onClick={() => adminToggleUserStatus(u.id)}
                          className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                            u.status === 'active'
                              ? 'hover:bg-amber-500/20 text-slate-400 hover:text-amber-400'
                              : 'hover:bg-emerald-500/20 text-slate-400 hover:text-emerald-400'
                          }`}
                          title={u.status === 'active' ? 'Suspendre l’accès' : 'Réactiver l’accès'}
                        >
                          <Ban className="w-3.5 h-3.5" />
                        </button>

                        {/* Supprimer définitivement */}
                        <button
                          onClick={() => {
                            if (confirm(`Êtes-vous sûr de vouloir supprimer définitivement le compte de ${u.name} ?`)) {
                              adminDeleteUser(u.id);
                            }
                          }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                          title="Supprimer définitivement"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ─── ONGLET 2 : RÉGULATION & CONTRÔLE DE L'USAGE DE L'IA ─── */}
      {activeTab === 'ai-regulation' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Colonne 1 & 2 : Paramètres du moteur Gemini & Quotas */}
            <div className="lg:col-span-2 rounded-3xl bg-[#0c0e15] border border-white/10 p-6 shadow-2xl space-y-6">
              <div className="flex items-center justify-between pb-4 border-b border-white/10">
                <div>
                  <h2 className="text-base font-bold text-white flex items-center gap-2">
                    <Sliders className="w-4 h-4 text-amber-400" />
                    <span>Configuration du Moteur GenAI</span>
                  </h2>
                  <p className="text-xs text-slate-400">
                    Paramètres d'inférence Gemini et politique de conformité stricte RCST
                  </p>
                </div>
                {configSavedToast && (
                  <span className="text-xs text-emerald-400 flex items-center gap-1 animate-fadeIn">
                    <Check className="w-4 h-4" /> Sauvegardé
                  </span>
                )}
              </div>

              {/* Modèle Gemini & Température */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Modèle Gemini par défaut
                  </label>
                  <select
                    value={selectedModel}
                    onChange={(e) => setSelectedModel(e.target.value as GeminiModelId)}
                    className="w-full bg-[#121520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50 cursor-pointer"
                  >
                    <option value="gemini-2.5-flash">Gemini 2.5 Flash (Officiel RCST - Clé Active)</option>
                    <option value="gemini-3.5-flash">Gemini 3.5 Flash (Secours Next-Gen)</option>
                    <option value="gemini-3-flash-preview">Gemini 3 Flash Preview (Haute Vitesse)</option>
                  </select>
                </div>

                <div>
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="font-semibold text-slate-300">Température d'échantillonnage</span>
                    <span className="font-mono text-amber-400 font-bold">{temperature.toFixed(2)}</span>
                  </div>
                  <input
                    type="range"
                    min="0.0"
                    max="1.0"
                    step="0.05"
                    value={temperature}
                    onChange={(e) => setTemperature(parseFloat(e.target.value))}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                  <p className="text-[10px] text-slate-400 mt-1">
                    Recommandé RCST : <strong>0.20</strong> pour une conformité déterministe et rigoureuse.
                  </p>
                </div>
              </div>

              {/* Quotas & Rate Limiting */}
              <div className="pt-4 border-t border-white/5 space-y-4">
                <h3 className="text-xs font-semibold text-white flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-amber-400" />
                  <span>Régulation des Quotas & Limites de Jetons (Token Budgeting)</span>
                </h3>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Quota Journalier Reviewer
                    </label>
                    <input
                      type="number"
                      value={reviewerQuota}
                      onChange={(e) => setReviewerQuota(parseInt(e.target.value) || 20)}
                      className="w-full bg-[#121520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">audits max / jour</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Max Output Tokens (Audit)
                    </label>
                    <input
                      type="number"
                      value={maxOutputTokensAudit}
                      onChange={(e) => setMaxOutputTokensAudit(parseInt(e.target.value) || 4096)}
                      className="w-full bg-[#121520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">jetons max par rapport</span>
                  </div>

                  <div>
                    <label className="block text-[11px] text-slate-400 mb-1">
                      Max Output Tokens (Chat)
                    </label>
                    <input
                      type="number"
                      value={maxOutputTokensChat}
                      onChange={(e) => setMaxOutputTokensChat(parseInt(e.target.value) || 2048)}
                      className="w-full bg-[#121520] border border-white/10 rounded-xl px-3 py-2 text-xs text-white font-mono"
                    />
                    <span className="text-[10px] text-slate-500">jetons max par réponse chat</span>
                  </div>
                </div>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={handleSaveAiConfig}
                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 hover:from-amber-500 hover:to-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>Enregistrer la Régulation IA</span>
                </button>
              </div>
            </div>

            {/* Colonne 3 : Jauge budgétaire de consommation */}
            <div className="rounded-3xl bg-[#0c0e15] border border-white/10 p-6 shadow-2xl flex flex-col justify-between space-y-6">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2 mb-1">
                  <Coins className="w-4 h-4 text-amber-400" />
                  <span>Budget API & Tokens</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Consommation mensuelle globale du moteur Google GenAI
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-[#111420] border border-white/5 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-400">Tokens Consommés</span>
                  <span className="font-mono text-amber-300 font-bold">
                    {aiConfig.totalTokensConsumed.toLocaleString()} / {aiConfig.monthlyBudgetLimitTokens.toLocaleString()}
                  </span>
                </div>

                {/* Barre de progression de la jauge */}
                <div className="w-full h-3 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10">
                  <div 
                    className={`h-full rounded-full transition-all duration-500 ${
                      tokenConsumptionPercent > budgetAlertThreshold
                        ? 'bg-gradient-to-r from-amber-500 to-rose-500'
                        : 'bg-gradient-to-r from-amber-500 to-emerald-400'
                    }`}
                    style={{ width: `${tokenConsumptionPercent}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Usage : {tokenConsumptionPercent}%</span>
                  <span>Seuil alerte : {budgetAlertThreshold}%</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200">
                <span className="font-bold">Statut Quota : NORMAL</span>. Les requêtes s'exécutent sans restriction de débit avec bascule de sécurité active.
              </div>
            </div>
          </div>

          {/* Journal d'Audit Système (Audit Trail Logs) */}
          <div className="rounded-3xl bg-[#0c0e15] border border-white/10 p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <History className="w-4 h-4 text-sky-400" />
                  <span>Journal d'Audit Système (Audit Trail Logs)</span>
                </h3>
                <p className="text-xs text-slate-400">
                  Traçabilité assermentée des audits exécutés, auditeurs accrédités et tokens consommés
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400 bg-white/5 px-2.5 py-1 rounded-lg">
                {auditLogs.length} événements
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#090b11]">
              <table className="w-full text-left text-xs text-slate-300">
                <thead className="bg-[#121522] text-slate-400 font-semibold border-b border-white/5 uppercase text-[10px] tracking-wider">
                  <tr>
                    <th className="py-3 px-4">Date & Heure</th>
                    <th className="py-3 px-4">Auditeur</th>
                    <th className="py-3 px-4">Manuscrit Audité</th>
                    <th className="py-3 px-4 text-center">Score</th>
                    <th className="py-3 px-4">Avis Éditorial</th>
                    <th className="py-3 px-4 text-right">Tokens Consommés</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-white/[0.02]">
                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">{log.timestamp}</td>
                      <td className="py-3 px-4">
                        <span className="font-semibold text-white">{log.userName}</span>
                        <span className="text-[10px] text-slate-500 font-mono ml-2">({log.userRole})</span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-200 truncate max-w-xs">{log.manuscriptTitle}</td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        <span className={log.score >= 80 ? 'text-emerald-400' : log.score >= 60 ? 'text-amber-400' : 'text-rose-400'}>
                          {log.score}%
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-300">{log.decision}</td>
                      <td className="py-3 px-4 text-right font-mono text-amber-300">{log.tokensUsed.toLocaleString()} tk</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ─── ONGLET 3 : ANALYTICS GLOBAUX DE LA REVUE ─── */}
      {activeTab === 'analytics' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="p-6 rounded-3xl bg-[#0c0e15] border border-white/10 shadow-xl space-y-2">
              <span className="text-xs text-slate-400">Taux de Conformité Global</span>
              <p className="text-3xl font-extrabold text-white font-mono">68.4%</p>
              <p className="text-[11px] text-emerald-400">+4.2% d'amélioration sur les 30 derniers jours</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0c0e15] border border-white/10 shadow-xl space-y-2">
              <span className="text-xs text-slate-400">Délai Moyen d'Audit Assisté</span>
              <p className="text-3xl font-extrabold text-white font-mono">1.8 min</p>
              <p className="text-[11px] text-slate-400">Contre 14 jours en révision manuelle classique</p>
            </div>

            <div className="p-6 rounded-3xl bg-[#0c0e15] border border-white/10 shadow-xl space-y-2">
              <span className="text-xs text-slate-400">Conformité Constitutionnelle</span>
              <p className="text-3xl font-extrabold text-white font-mono">92.1%</p>
              <p className="text-[11px] text-amber-400">Validation après 1ère vague de corrections</p>
            </div>
          </div>

          {/* Répartition des motifs de non-conformité IMRAD */}
          <div className="rounded-3xl bg-[#0c0e15] border border-white/10 p-6 shadow-2xl space-y-4">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-4 h-4 text-amber-400" />
              <span>Motifs Récurrents de Non-Conformité Constitutionnelle RCST</span>
            </h3>
            <p className="text-xs text-slate-400">
              Fréquence d'apparition des infractions lors des soumissions initiales
            </p>

            <div className="space-y-4 pt-2">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Absence d'identifiant ORCID 16 chiffres pour tous les co-auteurs</span>
                  <span className="font-mono text-rose-400 font-bold">52%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-rose-500 rounded-full" style={{ width: '52%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Emploi subjectif du pronom « nous », « notre », « nos travaux »</span>
                  <span className="font-mono text-amber-400 font-bold">46%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-amber-500 rounded-full" style={{ width: '46%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Citations numériques [1], [2] au lieu des normes APA 7 (Auteur, Année)</span>
                  <span className="font-mono text-amber-400 font-bold">38%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-amber-400 rounded-full" style={{ width: '38%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Tableaux numérotés en chiffres arabes (Requis : chiffres romains I, II)</span>
                  <span className="font-mono text-sky-400 font-bold">29%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-sky-400 rounded-full" style={{ width: '29%' }} />
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span>Absence du résumé bilingue intégral (Français & Anglais)</span>
                  <span className="font-mono text-sky-400 font-bold">22%</span>
                </div>
                <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden">
                  <div className="h-full bg-sky-500 rounded-full" style={{ width: '22%' }} />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODALE CREATE USER ─── */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0e1118] border border-amber-500/30 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-amber-400" />
                <span>Créer un Compte Accrédité</span>
              </h3>
              <button onClick={() => setIsCreateModalOpen(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            {createFeedback && (
              <div className="p-2.5 rounded-xl bg-red-950/70 border border-red-800 text-red-200 text-xs">
                {createFeedback}
              </div>
            )}

            <form onSubmit={handleCreateUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nom complet & Grade</label>
                <input
                  type="text"
                  required
                  value={newUserName}
                  onChange={(e) => setNewUserName(e.target.value)}
                  placeholder="Prof. Jean-Paul Ilunga"
                  className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email institutionnel</label>
                <input
                  type="email"
                  required
                  value={newUserEmail}
                  onChange={(e) => setNewUserEmail(e.target.value)}
                  placeholder="j.ilunga@unikin.ac.cd"
                  className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Mot de passe temporaire</label>
                <input
                  type="password"
                  required
                  value={newUserPassword}
                  onChange={(e) => setNewUserPassword(e.target.value)}
                  className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Rôle initial</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value as UserRole)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-2.5 py-2 text-white"
                  >
                    <option value="reviewer">Reviewer (Comité)</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Affiliation</label>
                  <input
                    type="text"
                    value={newUserAffiliation}
                    onChange={(e) => setNewUserAffiliation(e.target.value)}
                    placeholder="INRB, UNIKIN..."
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-amber-500 text-slate-950 font-bold hover:bg-amber-400"
                >
                  Créer l'utilisateur
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ─── MODALE EDIT USER ─── */}
      {editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md bg-[#0e1118] border border-white/10 rounded-2xl shadow-2xl p-6 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <h3 className="text-sm font-bold text-white flex items-center gap-2">
                <Edit2 className="w-4 h-4 text-sky-400" />
                <span>Modifier le Compte : {editingUser.name}</span>
              </h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditUserSubmit} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-300 mb-1">Nom complet</label>
                <input
                  type="text"
                  required
                  value={editUserName}
                  onChange={(e) => setEditUserName(e.target.value)}
                  className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Email institutionnel</label>
                <input
                  type="email"
                  required
                  value={editUserEmail}
                  onChange={(e) => setEditUserEmail(e.target.value)}
                  className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-300 mb-1">Grade / Rôle (Promotion)</label>
                  <select
                    value={editUserRole}
                    onChange={(e) => setEditUserRole(e.target.value as UserRole)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-2.5 py-2 text-white"
                  >
                    <option value="reviewer">Reviewer</option>
                    <option value="admin">Administrateur</option>
                  </select>
                </div>
                <div>
                  <label className="block text-slate-300 mb-1">Affiliation</label>
                  <input
                    type="text"
                    value={editUserAffiliation}
                    onChange={(e) => setEditUserAffiliation(e.target.value)}
                    className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-300 mb-1">Réinitialiser le mot de passe (optionnel)</label>
                <input
                  type="password"
                  value={editNewPassword}
                  onChange={(e) => setEditNewPassword(e.target.value)}
                  placeholder="Laisser vide pour ne pas modifier"
                  className="w-full bg-[#141824] border border-white/10 rounded-xl px-3 py-2 text-white"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-white/5 text-slate-300 hover:text-white"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-xl bg-gradient-to-r from-amber-600 to-amber-500 text-slate-950 font-bold hover:from-amber-500 hover:to-amber-400"
                >
                  Mettre à jour
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
