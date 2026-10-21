import React, { useState } from 'react';
import { 
  User as UserIcon, 
  X, 
  Mail, 
  Building2, 
  GraduationCap, 
  Lock, 
  Save, 
  CheckCircle2, 
  AlertCircle,
  ShieldCheck,
  Award
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface UserProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({ isOpen, onClose }) => {
  const { user, updateProfile } = useAuth();

  const [name, setName] = useState(user?.name || '');
  const [email, setEmail] = useState(user?.email || '');
  const [affiliation, setAffiliation] = useState(user?.affiliation || '');
  const [specialty, setSpecialty] = useState(user?.specialty || '');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [isSaving, setIsSaving] = useState(false);

  // Synchronisation lors de l'ouverture
  React.useEffect(() => {
    if (user) {
      setName(user.name);
      setEmail(user.email);
      setAffiliation(user.affiliation || '');
      setSpecialty(user.specialty || '');
      setNewPassword('');
      setConfirmPassword('');
      setFeedback(null);
    }
  }, [user, isOpen]);

  if (!isOpen || !user) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFeedback(null);

    if (newPassword && newPassword.length < 8) {
      setFeedback({ type: 'error', message: 'Le mot de passe doit comporter au moins 8 caractères.' });
      return;
    }

    if (newPassword && newPassword !== confirmPassword) {
      setFeedback({ type: 'error', message: 'Les deux mots de passe ne correspondent pas.' });
      return;
    }

    setIsSaving(true);
    const res = await updateProfile({
      name,
      email,
      affiliation,
      specialty,
      password: newPassword || undefined,
    });
    setIsSaving(false);

    if (res.success) {
      setFeedback({ type: 'success', message: 'Votre profil éditorial a été mis à jour avec succès.' });
      setTimeout(() => {
        setFeedback(null);
        onClose();
      }, 1400);
    } else {
      setFeedback({ type: 'error', message: res.error || 'Erreur lors de la mise à jour.' });
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 animate-fadeIn">
      <div 
        className="w-full max-w-lg bg-slate-950 border border-white/10 rounded-lg overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête */}
        <div className="px-6 py-4 border-b border-white/10 bg-slate-900 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-md bg-amber-500/20 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Mon Profil Éditorial</span>
                <span className={`text-[11px] px-2 py-0.5 rounded-full font-mono border ${
                  user.role === 'admin'
                    ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                    : 'bg-sky-500/20 text-sky-300 border-sky-500/40'
                }`}>
                  {user.role === 'admin' ? 'Admin' : 'Reviewer'}
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Informations académiques et accréditation auprès de la RCST
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="w-8 h-8 rounded-lg hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Formulaire */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {feedback && (
            <div className={`p-3 rounded-md border text-xs flex items-center gap-2.5 animate-fadeIn ${
              feedback.type === 'success'
                ? 'bg-emerald-950/70 border-emerald-800 text-emerald-200'
                : 'bg-red-950/70 border-red-800 text-red-200'
            }`}>
              {feedback.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />
              )}
              <span>{feedback.message}</span>
            </div>
          )}

          {/* Nom complet */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Nom complet & Titre académique
            </label>
            <div className="relative">
              <Award className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ex: Prof. Marcel Kalonji"
                className="w-full bg-slate-900 border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Email institutionnel */}
          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-1">
              Adresse e-mail institutionnelle
            </label>
            <div className="relative">
              <Mail className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="nom.prenom@unikin.ac.cd"
                className="w-full bg-slate-900 border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
              />
            </div>
          </div>

          {/* Deux colonnes : Affiliation & Spécialité */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Affiliation académique
              </label>
              <div className="relative">
                <Building2 className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={affiliation}
                  onChange={(e) => setAffiliation(e.target.value)}
                  placeholder="Ex: Université de Kinshasa"
                  className="w-full bg-slate-900 border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1">
                Spécialité / Discipline
              </label>
              <div className="relative">
                <GraduationCap className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={specialty}
                  onChange={(e) => setSpecialty(e.target.value)}
                  placeholder="Ex: Énergies renouvelables"
                  className="w-full bg-slate-900 border border-white/10 rounded-md pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Section Sécurité / Mot de passe */}
          <div className="pt-2 border-t border-white/5 space-y-3">
            <h3 className="text-xs font-semibold text-amber-400 flex items-center gap-1.5">
              <Lock className="w-3.5 h-3.5" />
              <span>Changement de mot de passe (optionnel)</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Nouveau mot de passe"
                  className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
              <div>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirmer mot de passe"
                  className="w-full bg-slate-900 border border-white/10 rounded-md px-3 py-2 text-xs text-white focus:outline-none focus:border-amber-500/50"
                />
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="pt-4 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md bg-white/5 hover:bg-white/10 text-xs font-medium text-slate-300 hover:text-white transition-colors cursor-pointer"
            >
              Annuler
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-5 py-2 rounded-md bg-slate-100 hover:bg-white text-slate-950 font-bold text-xs flex items-center gap-2 transition-all cursor-pointer disabled:opacity-50"
            >
              <Save className="w-3.5 h-3.5" />
              <span>{isSaving ? 'Enregistrement...' : 'Enregistrer les modifications'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
