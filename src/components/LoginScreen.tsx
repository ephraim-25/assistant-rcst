import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { UserRole } from '../types/auth';
import { 
  ShieldCheck, 
  Lock, 
  Mail, 
  User as UserIcon, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  CheckCircle2, 
  UserPlus, 
  LogIn, 
  ArrowRight,
  Award
} from 'lucide-react';

/**
 * Blason officiel RCST
 */
const RcstOfficialCrest: React.FC<{ className?: string }> = ({ className = "w-24 h-24" }) => (
  <svg
    viewBox="0 0 100 100"
    className={className}
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <defs>
      <linearGradient id="loginCrestGold" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#fef08a" />
        <stop offset="50%" stopColor="#f59e0b" />
        <stop offset="100%" stopColor="#b45309" />
      </linearGradient>
      <linearGradient id="loginCrestShield" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#1e293b" />
        <stop offset="50%" stopColor="#0f172a" />
        <stop offset="100%" stopColor="#020617" />
      </linearGradient>
      <linearGradient id="loginDrcRed" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#ef4444" />
        <stop offset="100%" stopColor="#b91c1c" />
      </linearGradient>
    </defs>

    {/* Ombre portée */}
    <path
      d="M50 94 C25 80 14 62 14 26 L50 14 L86 26 C86 62 75 80 50 94 Z"
      fill="black"
      opacity="0.4"
      transform="translate(0, 3)"
    />

    {/* Bouclier principal */}
    <path
      d="M50 92 C26 78 15 61 15 26 L50 15 L85 26 C85 61 74 78 50 92 Z"
      fill="url(#loginCrestShield)"
      stroke="url(#loginCrestGold)"
      strokeWidth="2.5"
    />

    {/* Filet intérieur doré */}
    <path
      d="M50 87 C30 74 20 58 20 29 L50 19 L80 29 C80 58 70 74 50 87 Z"
      fill="none"
      stroke="url(#loginCrestGold)"
      strokeWidth="1"
      strokeOpacity="0.6"
      strokeDasharray="2 1"
    />

    {/* Diagonale rouge & liseré jaune (drapeau RDC) */}
    <path
      d="M20 29 L74 83 C76 80 78 77 80 73 L26 21 Z"
      fill="url(#loginDrcRed)"
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
      fill="url(#loginCrestGold)"
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
      stroke="url(#loginCrestGold)"
      strokeWidth="1.2"
    />
    <line x1="50" y1="58" x2="50" y2="70" stroke="#f59e0b" strokeWidth="1" />

    {/* Flamme de la recherche */}
    <path
      d="M50 42 C48 46 45 48 45 51 C45 54 47 55 50 55 C53 55 55 54 55 51 C55 48 52 46 50 42 Z"
      fill="url(#loginCrestGold)"
    />

    {/* Inscription RDC */}
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

export const LoginScreen: React.FC = () => {
  const { login, register, registeredUsers } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');

  // Champs de formulaire
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('admin');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    setIsLoading(true);
    try {
      const result = await login(email, password);
      if (!result.success) {
        setError(result.error || 'Identifiants invalides.');
      }
    } catch {
      setError('Erreur inattendue lors de la tentative de connexion.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    setIsLoading(true);
    try {
      const result = await register({
        name,
        email,
        password,
        role,
      });

      if (!result.success) {
        setError(result.error || 'Erreur lors de la création du compte.');
      } else {
        setSuccessMsg('Compte créé avec succès ! Connexion immédiate en cours...');
      }
    } catch {
      setError('Erreur inattendue lors de l’enregistrement du compte.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#071317] flex flex-col justify-between text-slate-100 font-sans selection:bg-orange-500/30 selection:text-orange-200 relative overflow-hidden">
      {/* Halo lumineux d'ambiance */}
      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-cyan-900/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-orange-950/20 rounded-full blur-3xl pointer-events-none" />

      {/* Bandeau supérieur étatique */}
      <header className="border-b border-white/5 bg-[#050c0f]/80 backdrop-blur-md px-4 sm:px-8 py-2.5 flex items-center justify-between text-xs z-10">
        <div className="flex items-center gap-2 text-slate-400">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse shrink-0" />
          <span className="font-semibold text-amber-300 text-[11px] tracking-wider uppercase">
            RÉPUBLIQUE DÉMOCRATIQUE DU CONGO
          </span>
          <span className="text-slate-600 hidden sm:inline">|</span>
          <span className="text-slate-400 text-[11px] hidden sm:inline">
            Ministère de l'Enseignement Supérieur, Universitaire et Recherche Scientifique
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-400 font-mono">
          <span>ISSN 2789-4112</span>
          <span>•</span>
          <span className="text-emerald-400 font-sans font-medium flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Accréditation Officielle
          </span>
        </div>
      </header>

      {/* Conteneur principal inspiré du visuel de référence (Double Panneau) */}
      <main className="flex-1 flex items-center justify-center p-4 sm:p-6 lg:p-8 z-10">
        <div className="w-full max-w-4xl bg-[#09171d]/90 border border-slate-800/80 rounded-2xl shadow-2xl backdrop-blur-xl overflow-hidden grid grid-cols-1 md:grid-cols-2 relative">
          
          {/* PANNEAU DE GAUCHE : Identité officielle & Souveraineté RCST */}
          <div className="p-8 sm:p-12 flex flex-col justify-center items-center text-center relative border-b md:border-b-0 md:border-r border-slate-700/50 bg-gradient-to-b from-[#0a1b22]/70 to-[#071419]/90">
            <div className="mb-6 relative">
              <RcstOfficialCrest className="w-24 h-24 sm:w-28 sm:h-28 drop-shadow-[0_8px_24px_rgba(245,158,11,0.25)]" />
            </div>

            <h2 className="text-2xl sm:text-3xl font-serif font-black tracking-tight text-white mb-1">
              RCST
            </h2>
            <div className="text-xs uppercase tracking-widest font-bold text-amber-400/90 mb-3">
              Conseil Scientifique National
            </div>

            <p className="text-xs sm:text-sm text-slate-300 font-serif leading-relaxed max-w-xs mb-6">
              Revue Congolaise des Sciences & Technologies
            </p>

            <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400 font-medium">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-400" />
              <span>Portail d'Audit Éditorial Assermenté</span>
            </div>

            <div className="mt-8 text-[11px] text-slate-500 font-light flex items-center gap-2">
              <span>Normes IMRAD</span>
              <span>•</span>
              <span>APA 7th Edition</span>
              <span>•</span>
              <span>Contrôle Éthique</span>
            </div>
          </div>

          {/* PANNEAU DE DROITE : Formulaire Dynamique (Connexion / Enregistrement) */}
          <div className="p-8 sm:p-12 flex flex-col justify-center">
            
            {/* Onglets de bascule Connexion / Inscription */}
            <div className="flex border-b border-slate-800 mb-6 pb-2 gap-4">
              <button
                type="button"
                onClick={() => {
                  setMode('login');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                  mode === 'login'
                    ? 'text-orange-400 border-b-2 border-orange-500 -mb-[10px]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <LogIn className="w-4 h-4" />
                <span>Connexion</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setMode('register');
                  setError(null);
                  setSuccessMsg(null);
                }}
                className={`flex items-center gap-2 pb-2 text-xs font-bold uppercase tracking-wider transition-all cursor-pointer relative ${
                  mode === 'register'
                    ? 'text-orange-400 border-b-2 border-orange-500 -mb-[10px]'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <UserPlus className="w-4 h-4" />
                <span>Créer un compte</span>
              </button>
            </div>

            {/* En-tête du panneau droit */}
            <div className="mb-6">
              <h1 className="text-2xl font-sans font-medium text-white tracking-tight">
                {mode === 'login' ? 'Bienvenue' : 'Nouvelle Accréditation'}
              </h1>
              <p className="text-[11px] font-semibold tracking-wider text-slate-400 uppercase mt-1">
                {mode === 'login' 
                  ? 'VEUILLEZ VOUS CONNECTER À VOTRE ESPACE ÉDITORIAL.' 
                  : 'ENREGISTREMENT OFFICIEL D’UN AUDITEUR OU REVIEWER.'}
              </p>
            </div>

            {/* Message d'erreur */}
            {error && (
              <div className="mb-4 p-3 rounded-xl bg-red-950/70 border border-red-800/80 text-red-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            {/* Message de succès */}
            {successMsg && (
              <div className="mb-4 p-3 rounded-xl bg-emerald-950/70 border border-emerald-800/80 text-emerald-200 text-xs flex items-start gap-2.5 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* FORMULAIRE DE CONNEXION */}
            {mode === 'login' && (
              <form onSubmit={handleLoginSubmit} className="space-y-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    ADRESSE E-MAIL INSTITUTIONNELLE
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="nom.prenom@universite.cd"
                      className="w-full pl-10 pr-4 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                      disabled={isLoading}
                      autoComplete="username"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    MOT DE PASSE
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-10 pr-11 py-3 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                      disabled={isLoading}
                      autoComplete="current-password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer"
                      title={showPassword ? 'Masquer' : 'Afficher'}
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-lg bg-[#f95721] hover:bg-[#ff6936] active:bg-[#e04816] text-white font-bold tracking-widest text-xs uppercase shadow-lg shadow-orange-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-[0.99] disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>CONNEXION</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-2">
                  <button
                    type="button"
                    onClick={() => setMode('register')}
                    className="text-[11px] font-medium text-amber-400/90 hover:text-amber-300 tracking-wider underline cursor-pointer"
                  >
                    Pas encore de compte ? Enregistrez-vous ici
                  </button>
                </div>

                {registeredUsers.length === 0 && (
                  <div className="mt-4 p-3 rounded-lg bg-slate-900/80 border border-slate-800 text-[11px] text-slate-400 text-center">
                    💡 <strong>Premier lancement :</strong> Aucun compte enregistré sur cet appareil. Cliquez sur <strong>« Créer un compte »</strong> pour enregistrer votre accès Administrateur ou Reviewer.
                  </div>
                )}
              </form>
            )}

            {/* FORMULAIRE D'INSCRIPTION / CRÉATION DE COMPTE */}
            {mode === 'register' && (
              <form onSubmit={handleRegisterSubmit} className="space-y-3.5">
                {/* Nom complet */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    NOM COMPLET (AVEC GRADE / TITRE)
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <UserIcon className="w-4 h-4" />
                    </div>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Ex: Prof. Dr. Jean Mukendi"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Adresse e-mail institutionnelle */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    ADRESSE E-MAIL INSTITUTIONNELLE
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Mail className="w-4 h-4" />
                    </div>
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="jmukendi@unikin.ac.cd"
                      className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                      disabled={isLoading}
                    />
                  </div>
                </div>

                {/* Mot de passe */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1">
                    MOT DE PASSE
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 4 caractères"
                      className="w-full pl-10 pr-11 py-2.5 rounded-lg bg-white text-slate-900 placeholder-slate-400 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-orange-500 shadow-sm transition-all"
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Sélecteur de Rôle / Grade */}
                <div>
                  <label className="block text-[11px] font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                    SÉLECTION DU GRADE / RÔLE OFFICIEL
                  </label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <button
                      type="button"
                      onClick={() => setRole('admin')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        role === 'admin'
                          ? 'bg-amber-500/15 border-amber-500 text-amber-200 ring-1 ring-amber-400/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 text-amber-300 text-[11px]">
                        <span>👑 Administrateur</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Éditeur Principal
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        Supervision & paramétrage
                      </div>
                    </button>

                    <button
                      type="button"
                      onClick={() => setRole('reviewer')}
                      className={`p-2.5 rounded-lg border text-left transition-all cursor-pointer ${
                        role === 'reviewer'
                          ? 'bg-sky-500/15 border-sky-500 text-sky-200 ring-1 ring-sky-400/50'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700'
                      }`}
                    >
                      <div className="font-bold flex items-center gap-1.5 text-sky-300 text-[11px]">
                        <span>🔬 Reviewer</span>
                      </div>
                      <div className="text-[10px] text-slate-400 mt-1">
                        Comité de lecture
                      </div>
                      <div className="text-[9px] text-slate-500 mt-0.5">
                        Audits & chat contextuel
                      </div>
                    </button>
                  </div>
                </div>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full py-3.5 px-4 rounded-lg bg-[#f95721] hover:bg-[#ff6936] active:bg-[#e04816] text-white font-bold tracking-widest text-xs uppercase shadow-lg shadow-orange-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-[0.99] disabled:opacity-60"
                  >
                    {isLoading ? (
                      <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>CRÉER MON COMPTE ET ACCÉDER</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </div>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setMode('login')}
                    className="text-[11px] font-medium text-slate-400 hover:text-white tracking-wider underline cursor-pointer"
                  >
                    Déjà un compte accrédité ? Se connecter
                  </button>
                </div>
              </form>
            )}

          </div>

        </div>
      </main>

      {/* Footer officiel */}
      <footer className="border-t border-white/5 bg-[#050c0f]/90 py-3 text-center text-xs text-slate-500 z-10">
        <p>© 2026 Revue Congolaise des Sciences & Technologies (RCST) • Conseil Scientifique National RDC</p>
      </footer>
    </div>
  );
};
