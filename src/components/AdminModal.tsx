import React, { useState } from 'react';
import { 
  ShieldCheck, 
  Settings, 
  X, 
  Cpu, 
  Sliders, 
  Users, 
  Save, 
  Check, 
  Trash2,
  UserCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

interface AdminModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const AdminModal: React.FC<AdminModalProps> = ({ isOpen, onClose }) => {
  const { user, registeredUsers, deleteUser } = useAuth();
  const [selectedModel, setSelectedModel] = useState('gemini-3.5-flash');
  const [minPassScore, setMinPassScore] = useState(80);
  const [strictImpersonal, setStrictImpersonal] = useState(true);
  const [requireOrcid, setRequireOrcid] = useState(true);
  const [saved, setSaved] = useState(false);

  if (!isOpen || user?.role !== 'admin') return null;

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div 
        className="w-full max-w-2xl bg-[#0c131a] border border-amber-500/30 rounded-2xl shadow-2xl overflow-hidden flex flex-col text-slate-100"
        onClick={(e) => e.stopPropagation()}
      >
        {/* En-tête de la modale */}
        <div className="px-6 py-4 border-b border-white/10 bg-[#091016] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Settings className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-white flex items-center gap-2">
                <span>Panneau d'Administration RCST</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase font-mono">
                  Éditeur Principal
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                Gestion des auditeurs accrédités et paramétrage du moteur d'audit IA
              </p>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Corps des réglages */}
        <div className="p-6 space-y-6 overflow-y-auto max-h-[75vh]">
          {/* Section 1 : Utilisateurs enregistrés & Gestion des rôles */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
                <Users className="w-4 h-4" />
                <span>Auditeurs & Membres Enregistrés ({registeredUsers.length})</span>
              </div>
              <span className="text-[10px] text-slate-400">Stockage persistant local</span>
            </div>

            <div className="bg-slate-900/60 border border-slate-800 rounded-xl divide-y divide-slate-800 text-xs">
              {registeredUsers.length === 0 ? (
                <div className="p-4 text-center text-slate-400 text-xs">
                  Aucun compte enregistré pour le moment.
                </div>
              ) : (
                registeredUsers.map((account) => {
                  const isCurrent = account.id === user.id;
                  return (
                    <div key={account.id} className="p-3 flex items-center justify-between hover:bg-slate-800/40 transition-colors">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs ${
                          account.role === 'admin' 
                            ? 'bg-amber-500/20 text-amber-300 ring-1 ring-amber-500/40' 
                            : 'bg-sky-500/20 text-sky-300 ring-1 ring-sky-500/40'
                        }`}>
                          {account.role === 'admin' ? '👑' : '🔬'}
                        </div>
                        <div>
                          <div className="font-semibold text-slate-200 flex items-center gap-2">
                            <span>{account.name}</span>
                            {isCurrent && (
                              <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1.5 py-0.2 rounded font-mono">
                                Vous
                              </span>
                            )}
                          </div>
                          <div className="text-[10px] text-slate-400 flex items-center gap-2 mt-0.5">
                            <span>{account.email}</span>
                            <span>•</span>
                            <span className="text-slate-500">Inscrit le {account.createdAt}</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${
                          account.role === 'admin'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-sky-500/15 text-sky-300 border-sky-500/30'
                        }`}>
                          {account.role === 'admin' ? 'Administrateur' : 'Reviewer'}
                        </span>

                        {!isCurrent && (
                          <button
                            onClick={() => deleteUser(account.id)}
                            className="p-1.5 rounded hover:bg-red-950/60 text-slate-500 hover:text-red-400 transition-colors cursor-pointer"
                            title="Supprimer ce compte"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* Section 2 : Configuration Moteur IA */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Cpu className="w-4 h-4" />
              <span>Modèle d'Intelligence Artificielle Cible</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[
                { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash', tag: 'Défaut officiel' },
                { id: 'gemini-3.5-flash', label: 'Gemini 3.5 Flash', tag: 'Haute vitesse' },
                { id: 'gemini-3-flash-preview', label: 'Gemini 3 Flash Preview', tag: 'Fallback actif' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => setSelectedModel(m.id)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                    selectedModel === m.id
                      ? 'bg-amber-500/15 border-amber-500 text-amber-200 shadow-md shadow-amber-500/10'
                      : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="font-bold text-xs">{m.label}</div>
                  <div className="text-[10px] text-slate-500 mt-1">{m.tag}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Section 3 : Seuils de tolérance & critères d'évaluation */}
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-amber-400">
              <Sliders className="w-4 h-4" />
              <span>Paramètres de Contrôle de Conformité</span>
            </div>
            <div className="bg-slate-900/60 border border-slate-800 rounded-xl p-4 space-y-4 text-xs">
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <span className="font-medium text-slate-300">Score minimal d'acceptation automatique</span>
                  <span className="font-bold text-amber-400 font-mono">{minPassScore}%</span>
                </div>
                <input 
                  type="range" 
                  min={50} 
                  max={95} 
                  value={minPassScore}
                  onChange={(e) => setMinPassScore(Number(e.target.value))}
                  className="w-full accent-amber-500 cursor-pointer"
                />
                <span className="text-[10px] text-slate-500">
                  Les manuscrits sous ce seuil reçoivent la mention « Modifications majeures requises » ou « Refusé ».
                </span>
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-300">Style impersonnel strict (Constitution §5)</div>
                  <div className="text-[10px] text-slate-500">Pénalisation automatique des pronoms « nous » et « je »</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={strictImpersonal} 
                  onChange={(e) => setStrictImpersonal(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>

              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <div>
                  <div className="font-medium text-slate-300">Validation systématique de l'ORCID 16 chiffres (§2)</div>
                  <div className="text-[10px] text-slate-500">Requis pour l'ensemble des co-auteurs du manuscrit</div>
                </div>
                <input 
                  type="checkbox" 
                  checked={requireOrcid} 
                  onChange={(e) => setRequireOrcid(e.target.checked)}
                  className="w-4 h-4 accent-amber-500 cursor-pointer"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Pied de la modale */}
        <div className="px-6 py-4 border-t border-white/10 bg-[#091016] flex items-center justify-between">
          <div className="text-xs text-slate-400 flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Sécurité : Session chiffrée SSL / TLS 1.3</span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-400 hover:text-white hover:bg-white/5 transition-all cursor-pointer"
            >
              Fermer
            </button>
            <button
              onClick={handleSave}
              className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20 transition-all cursor-pointer"
            >
              {saved ? (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Enregistré !</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>Appliquer les réglages</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
