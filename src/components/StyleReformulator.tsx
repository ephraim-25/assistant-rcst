import { apiFetch } from '../lib/api';
import React, { useState } from 'react';
import { PenTool, ArrowRight, Sparkles, Check, Copy, RefreshCw, AlertCircle, ShieldAlert } from 'lucide-react';

export const StyleReformulator: React.FC = () => {
  const [inputText, setInputText] = useState<string>(
    "Dans notre travail, nous avons analysé 300 échantillons et nous avons découvert que notre méthode était plus rapide que celle de nos prédécesseurs. Nous pensons donc que nous pouvons recommander cette solution pour Kinshasa."
  );
  const [result, setResult] = useState<string | null>(null);
  const [explanations, setExplanations] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  const sampleSnippets = [
    {
      title: "Introduction subjective",
      text: "Nous avons voulu comprendre la transmission du paludisme et nous avons émis l'hypothèse que les pluies augmentaient le nombre de cas.",
    },
    {
      title: "Méthodologie avec 'nous'",
      text: "Nous avons prélevé 50 litres d'eau dans le fleuve Congo et nous avons procédé à la filtration sous vide avec notre matériel de laboratoire.",
    },
    {
      title: "Résultats & discussion subjectifs",
      text: "Nos résultats nous montrent une augmentation de 45% et nous concluons que notre étude a résolu le problème de contamination.",
    },
  ];

  const handleReformulate = async () => {
    if (!inputText.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const response = await apiFetch('/api/reformulate-style', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ textToReformulate: inputText }),
      });
      const data = await response.json();
      if (data.rephrased) {
        setResult(data.rephrased);
        setExplanations(data.explanations || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-indigo-800/40 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex items-center gap-2 text-indigo-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <PenTool className="w-4 h-4" />
          Règle Fondamentale #5 RCST
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
          Atelier de Reformulation Impersonnelle
        </h2>
        <p className="text-sm text-slate-300 max-w-3xl mt-2 leading-relaxed">
          La Constitution de la RCST bannit strictement toute formulation subjective ou personnelle (« nous », « je », « notre équipe », « nos travaux »). Cet outil convertit instantanément vos passages scientifiques vers les tournures passives et nominales exigées pour la publication.
        </p>
      </div>

      {/* Preset quick test snippets */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
          Charger un exemple typique à réécrire :
        </label>
        <div className="flex flex-wrap gap-2">
          {sampleSnippets.map((s, idx) => (
            <button
              key={idx}
              onClick={() => {
                setInputText(s.text);
                setResult(null);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-300 hover:text-white transition-all text-left"
            >
              {s.title}
            </button>
          ))}
        </div>
      </div>

      {/* Editor & output */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        {/* Input box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
                <ShieldAlert className="w-4 h-4" />
                Texte Source avec marques de subjectivité
              </span>
              <span className="text-[11px] text-slate-400 font-mono">
                {inputText.split(/\s+/).filter(Boolean).length} mots
              </span>
            </div>
            <textarea
              rows={8}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Collez ici un paragraphe contenant 'nous', 'je', etc."
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 font-sans leading-relaxed resize-none"
            />
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 flex justify-end">
            <button
              onClick={handleReformulate}
              disabled={isLoading || !inputText.trim()}
              className="px-5 py-2.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs flex items-center gap-2 shadow-lg shadow-indigo-600/20 transition-all disabled:opacity-50 cursor-pointer"
            >
              {isLoading ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Audit & Reformulation académique en cours...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Reformuler en Style Impersonnel RCST</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Output box */}
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold uppercase tracking-wider text-emerald-400 flex items-center gap-1.5">
                <Sparkles className="w-4 h-4" />
                Prose Académique Impersonnelle (RCST)
              </span>
              {result && (
                <button
                  onClick={handleCopy}
                  className="text-xs px-2.5 py-1 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-300 flex items-center gap-1 transition-all"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copié !' : 'Copier'}</span>
                </button>
              )}
            </div>

            {result ? (
              <div className="space-y-4">
                <div className="w-full bg-emerald-950/20 border border-emerald-900/40 rounded-lg p-3.5 text-sm text-emerald-100 font-sans leading-relaxed">
                  {result}
                </div>
                {explanations.length > 0 && (
                  <div className="bg-slate-950/60 rounded-lg p-3 border border-slate-850">
                    <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2">
                      Règles de dépersonnalisation appliquées :
                    </h5>
                    <ul className="space-y-1.5 text-xs text-slate-300">
                      {explanations.map((exp, i) => (
                        <li key={i} className="flex items-start gap-2">
                          <span className="text-indigo-400">•</span>
                          <span>{exp}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ) : (
              <div className="h-48 border border-dashed border-slate-800 rounded-lg flex flex-col items-center justify-center text-slate-500 text-center p-6">
                <PenTool className="w-8 h-8 mb-2 text-slate-600" />
                <p className="text-xs">
                  Le résultat dépersonnalisé apparaîtra ici avec l'explication des règles appliquées.
                </p>
              </div>
            )}
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 flex items-center gap-1.5">
            <Check className="w-3.5 h-3.5 text-emerald-400" />
            Conforme à la Constitution RCST et au style international Elsevier / Springer.
          </div>
        </div>
      </div>
    </div>
  );
};
