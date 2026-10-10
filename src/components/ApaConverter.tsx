import React, { useState } from 'react';
import { Award, Check, Copy, RefreshCw, BookMarked, ExternalLink, AlertCircle } from 'lucide-react';

export const ApaConverter: React.FC = () => {
  const [refInput, setRefInput] = useState<string>(
    "Mukendi, P. et al., Etude sur le paludisme périurbain en RDC, Revue Médicale de Kinshasa, 2020, vol 41, pp. 115-124."
  );
  const [result, setResult] = useState<{
    apaFormatted: string;
    inTextCitationParenthetical: string;
    inTextCitationNarrative: string;
    notes?: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [copiedApa, setCopiedApa] = useState<boolean>(false);

  const sampleRefs = [
    {
      label: 'Article avec auteurs multiples',
      ref: 'Banza, A. N., Gock, E. et Kongolo, K., Base metals recovery from copper smelter slag, Hydrometallurgy 2018, 178: 12-20.',
    },
    {
      label: 'Rapport d’organisation (OMS)',
      ref: 'OMS, Rapport mondial sur le paludisme 2022, Organisation Mondiale de la Santé, Genève.',
    },
    {
      label: 'Thèse de doctorat (UNIKIN)',
      ref: 'Kalonji Marcel, Modélisation de l’énergie solaire à Kinshasa, Thèse de doctorat, Faculté Polytechnique, Université de Kinshasa, 2023.',
    },
  ];

  const handleConvert = async () => {
    if (!refInput.trim()) return;
    setIsLoading(true);
    setResult(null);
    try {
      const response = await fetch('/api/convert-apa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ referenceString: refInput }),
      });
      const data = await response.json();
      setResult(data);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedApa(true);
    setTimeout(() => setCopiedApa(false), 2000);
  };

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-900 via-amber-950/40 to-slate-900 border border-amber-800/40 rounded-2xl p-6 sm:p-8 mb-8 shadow-xl">
        <div className="flex items-center gap-2 text-amber-400 text-xs font-semibold uppercase tracking-wider mb-2">
          <Award className="w-4 h-4" />
          Règle Fondamentale #4 RCST
        </div>
        <h2 className="text-2xl sm:text-3xl font-serif font-bold text-white tracking-tight">
          Vérificateur & Convertisseur APA 7ème Édition
        </h2>
        <p className="text-sm text-slate-300 max-w-3xl mt-2 leading-relaxed">
          Toutes les citations et références de la Revue Congolaise des Sciences & Technologies doivent impérativement respecter la norme APA 7 (American Psychological Association). Vérifiez une référence et obtenez immédiatement son format bibliographique et ses citations dans le texte.
        </p>
      </div>

      {/* Preset buttons */}
      <div className="mb-6">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 block">
          Références d'exemple à tester :
        </label>
        <div className="flex flex-wrap gap-2">
          {sampleRefs.map((item, idx) => (
            <button
              key={idx}
              onClick={() => {
                setRefInput(item.ref);
                setResult(null);
              }}
              className="text-xs px-3 py-1.5 rounded-lg bg-slate-900 border border-slate-800 hover:border-amber-500/50 text-slate-300 hover:text-white transition-all text-left"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 mb-8 shadow-lg">
        <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 block">
          Coller une référence bibliographique brute :
        </label>
        <textarea
          rows={3}
          value={refInput}
          onChange={(e) => setRefInput(e.target.value)}
          placeholder="Ex : Auteur, Titre, Revue, Année, Pages..."
          className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-sm text-slate-200 focus:outline-none focus:ring-1 focus:ring-amber-500 font-sans leading-relaxed resize-none mb-4"
        />

        <div className="flex justify-end">
          <button
            onClick={handleConvert}
            disabled={isLoading || !refInput.trim()}
            className="px-5 py-2.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-2 shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                <span>Conversion aux normes APA 7 en cours...</span>
              </>
            ) : (
              <>
                <Award className="w-3.5 h-3.5" />
                <span>Convertir en Norme APA (7e éd.)</span>
              </>
            )}
          </button>
        </div>
      </div>

      {result && (
        <div className="space-y-6">
          {/* Main APA formatted card */}
          <div className="bg-slate-900/90 border border-amber-500/40 rounded-xl p-6 shadow-xl ring-1 ring-amber-500/20">
            <div className="flex items-center justify-between mb-3 pb-3 border-b border-slate-800">
              <span className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-2">
                <BookMarked className="w-4 h-4" />
                Entrée Bibliographique Officielle APA 7 (Pour la liste finale)
              </span>
              <button
                onClick={() => copyToClipboard(result.apaFormatted)}
                className="text-xs px-3 py-1.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 flex items-center gap-1.5 transition-all"
              >
                {copiedApa ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedApa ? 'Copié !' : 'Copier APA 7'}</span>
              </button>
            </div>

            <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-sm font-serif text-slate-100 pl-8 -indent-8 leading-relaxed">
              {result.apaFormatted}
            </div>

            {result.notes && (
              <p className="text-xs text-slate-400 mt-3 flex items-start gap-2">
                <span className="text-amber-400 font-bold">•</span>
                <span>{result.notes}</span>
              </p>
            )}
          </div>

          {/* In-text citation models */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-sky-400 mb-2">
                Citation Parenthétique (Dans le texte)
              </h4>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-xs text-sky-200">
                {result.inTextCitationParenthetical}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                À placer en fin de phrase ou d'assertion entre parenthèses.
              </p>
            </div>

            <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4">
              <h4 className="text-xs font-semibold uppercase tracking-wider text-purple-400 mb-2">
                Citation Narrative (Dans le texte)
              </h4>
              <div className="bg-slate-950 p-3 rounded-lg border border-slate-850 font-mono text-xs text-purple-200">
                {result.inTextCitationNarrative}
              </div>
              <p className="text-[11px] text-slate-400 mt-2">
                À intégrer directement dans la syntaxe de la phrase.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
