import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';

/**
 * Écran de connexion.
 * Le panneau de gauche montre ce que fait l'outil (une phrase corrigée, comme sur une
 * épreuve d'imprimerie) plutôt qu'un slogan ; celui de droite porte le formulaire.
 */

type Mode = 'login' | 'register';

const inputClass =
  'w-full h-11 rounded-md bg-slate-900 border border-slate-700 px-3.5 text-[15px] text-slate-100 ' +
  'placeholder:text-slate-500 transition-colors duration-150 hover:border-slate-600 ' +
  'focus:border-sky-400 focus:outline-none focus-visible:outline-none';

const Proof: React.FC = () => (
  <figure className="max-w-md">
    <blockquote className="font-serif text-[22px] leading-[1.55] text-slate-100">
      <span className="line-through decoration-rose-400/80 decoration-2 text-slate-400">
        Nous avons mesuré la teneur en cuivre
      </span>{' '}
      <span className="rounded-sm bg-emerald-400/10 px-1 -mx-1 text-slate-50">
        La teneur en cuivre a été mesurée
      </span>{' '}
      sur 120 échantillons prélevés à Kolwezi.
    </blockquote>
    <figcaption className="mt-5 text-sm text-slate-400 leading-relaxed">
      Chaque manuscrit est lu selon le guide aux auteurs de la revue : structure IMRAD, résumé
      bilingue, citations APA 7, style impersonnel. Les points à corriger sont signalés à l’endroit
      exact du texte.
    </figcaption>
  </figure>
);

export const LoginScreen: React.FC = () => {
  const { login, register } = useAuth();
  const [mode, setMode] = useState<Mode>('login');

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const switchMode = (next: Mode) => {
    setMode(next);
    setError(null);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsLoading(true);
    try {
      const result =
        mode === 'login'
          ? await login(email, password)
          : await register({ name, email, password });
      if (!result.success) {
        setError(
          result.error ||
            (mode === 'login' ? 'Identifiants invalides.' : 'Le compte n’a pas pu être créé.')
        );
      }
    } catch {
      setError('Une erreur inattendue est survenue. Réessayez dans un instant.');
    } finally {
      setIsLoading(false);
    }
  };

  const isRegister = mode === 'register';

  return (
    <div className="min-h-screen grid lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)] bg-slate-950 text-slate-100">
      {/* Panneau gauche */}
      <aside className="hidden lg:flex flex-col justify-between bg-slate-900 border-r border-slate-800 px-14 py-12">
        <div>
          <div className="text-xl font-semibold tracking-tight">RCST</div>
          <div className="mt-1 text-sm text-slate-400">
            Revue Congolaise des Sciences &amp; Technologies
          </div>
        </div>
        <Proof />
        <p className="text-xs text-slate-500">Conseil Scientifique National · République démocratique du Congo</p>
      </aside>

      {/* Formulaire */}
      <main className="flex flex-col justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="w-full max-w-sm mx-auto lg:mx-0 rcst-enter">
          <div className="lg:hidden mb-10">
            <div className="text-xl font-semibold tracking-tight">RCST</div>
            <div className="mt-1 text-sm text-slate-400">Assistant de contrôle des manuscrits</div>
          </div>

          <h1 className="text-[26px] font-semibold tracking-tight">
            {isRegister ? 'Créer un compte' : 'Se connecter'}
          </h1>
          <p className="mt-2 text-sm text-slate-400">
            {isRegister
              ? 'Le compte est créé avec le rôle Reviewer. L’éditeur principal attribue les autres rôles.'
              : 'Utilisez l’adresse e-mail de votre compte RCST.'}
          </p>

          {error && (
            <div
              role="alert"
              className="mt-6 flex items-start gap-2.5 rounded-md border border-rose-500/40 bg-rose-500/10 px-3.5 py-3 text-sm text-rose-100"
            >
              <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-rose-300" aria-hidden />
              <span>{error}</span>
            </div>
          )}

          <form onSubmit={submit} className="mt-7 space-y-5" noValidate>
            {isRegister && (
              <div>
                <label htmlFor="name" className="mb-1.5 block text-sm font-medium text-slate-200">
                  Nom complet
                </label>
                <input
                  id="name"
                  type="text"
                  autoComplete="name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className={inputClass}
                  placeholder="Prénom Nom"
                  required
                />
              </div>
            )}

            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-200">
                Adresse e-mail
              </label>
              <input
                id="email"
                type="email"
                autoComplete="username"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className={inputClass}
                placeholder="nom@universite.cd"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-200">
                Mot de passe
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete={isRegister ? 'new-password' : 'current-password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`${inputClass} pr-11`}
                  placeholder={isRegister ? '8 caractères minimum' : undefined}
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
                  className="absolute inset-y-0 right-0 grid w-11 place-items-center text-slate-400 hover:text-slate-100"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="h-11 w-full rounded-md bg-slate-100 text-[15px] font-semibold text-slate-950 hover:bg-white disabled:opacity-60"
            >
              {isLoading
                ? isRegister
                  ? 'Création en cours…'
                  : 'Connexion en cours…'
                : isRegister
                  ? 'Créer le compte'
                  : 'Se connecter'}
            </button>
          </form>

          <p className="mt-6 text-sm text-slate-400">
            {isRegister ? 'Vous avez déjà un compte ? ' : 'Pas encore de compte ? '}
            <button
              type="button"
              onClick={() => switchMode(isRegister ? 'login' : 'register')}
              className="font-medium text-sky-400 underline-offset-4 hover:underline"
            >
              {isRegister ? 'Se connecter' : 'Créer un compte'}
            </button>
          </p>
        </div>
      </main>
    </div>
  );
};
