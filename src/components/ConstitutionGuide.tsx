import React, { useState } from 'react';
import { BookOpen, CheckCircle2, XCircle, AlertTriangle, Scale, FileText, Users, Quote, PenSquare, Table2 } from 'lucide-react';

export const ConstitutionGuide: React.FC = () => {
  const [activeRule, setActiveRule] = useState<number>(1);

  const rules = [
    {
      id: 1,
      title: 'Titre & Langue (Bilinguisme Strict)',
      subtitle: 'Français & Anglais obligatoires, zéro guillemets',
      icon: BookOpen,
      tag: 'Règle Fondamentale #1',
      description: 'Tout manuscrit soumis à la RCST doit obligatoirement comporter un titre bilingue (Français et Anglais), sans fioritures typographiques ni guillemets superflus.',
      points: [
        'Le titre principal doit être immédiatement suivi de sa traduction anglaise intégrale, fidèle et scientifique (ou titre en anglais suivi du titre français).',
        'Aucun guillemet superflu dans le titre : proscription formelle des guillemets français (« ») ou anglais (" ") encadrant le titre ou des segments du titre.',
        'Concision et pertinence : éviter les formules générales du type « Contribution à l’étude de... » au profit de formulations directes et affirmatives.',
      ],
      badExample: `« Modélisation du potentiel de production photovoltaïque à Kinshasa »\n\n(Erreur critique : guillemets proscrits, absence obligatoire de la version anglaise du titre)`,
      goodExample: `Modélisation du potentiel de production photovoltaïque décentralisée en milieu périurbain à Kinshasa\nModeling of Decentralized Photovoltaic Production Potential in Peri-Urban Kinshasa`,
    },
    {
      id: 2,
      title: 'Auteurs & Affiliations',
      subtitle: 'Zéro puce, exposants, correspondant (*), téléphone & ORCID 16 chiffres',
      icon: Users,
      tag: 'Règle Fondamentale #2',
      description: 'L’attribution scientifique, la transparence institutionnelle et la traçabilité internationale des signatures exigent un formalisme rigoureux et standardisé.',
      points: [
        'Ne jamais utiliser de puces ou de tirets pour lister les auteurs.',
        'Les affiliations doivent obligatoirement comporter un chiffre en exposant rattaché au nom de l’auteur (ex: Kalonji M.T.¹, Lukusa B.K.²).',
        'L’auteur correspondant doit être impérativement identifié par un astérisque (*) en exposant.',
        'Les coordonnées complètes de l’auteur correspondant doivent être explicitement mentionnées : e-mail institutionnel, numéro de téléphone direct, et identifiant ORCID à 16 chiffres (ex: 0000-0002-7634-1920).',
        'Présence obligatoire de l’ORCID pour l’ensemble des co-auteurs de la soumission.',
      ],
      badExample: `Auteurs :\n- Dr Jean-Paul Ilunga (Université de Kinshasa)\n- Professeur Marie Masika (INRB)\nContact : ilunga@gmail.com\n\n(Erreurs : présence de puces, pas d’exposants, pas d’astérisque, absence de téléphone, aucun ORCID)`,
      goodExample: `Kalonji M.T.¹*, Lukusa B.K.², Mukendi P.A.¹\n¹Département de Génie Électrique, Faculté Polytechnique, Université de Kinshasa, Kinshasa, RDC\n²Centre de Recherches en Énergies Renouvelables, ISTA, Kinshasa, RDC\n*Auteur correspondant : marcel.kalonji@unikin.ac.cd | Tél : +243 812 345 678 | ORCID: 0000-0002-7634-1920\nLukusa B.K. : benjamin.lukusa@ista.cd | ORCID: 0000-0001-8521-9043\nMukendi P.A. : patrick.mukendi@unikin.ac.cd | ORCID: 0000-0003-4109-6712`,
    },
    {
      id: 3,
      title: 'Résumé & Mots-clés',
      subtitle: 'Bilingue, max 250 mots, zéro sous-titres, zéro références, ~5 mots-clés',
      icon: FileText,
      tag: 'Règle Fondamentale #3',
      description: 'Le résumé constitue la vitrine internationale du manuscrit. Il doit condenser la problématique, les méthodes et les résultats majeurs dans un gabarit calibré.',
      points: [
        'Le résumé doit obligatoirement être bilingue : Résumé en français et Abstract en anglais.',
        'Plage stricte : une demi-page ou 250 mots maximum (en police Times New Roman 10 ou équivalent formaté). Tout dépassement entraîne un statut avec réserves ou refus.',
        'Interdiction formelle d’inclure des sous-titres dans le résumé (bannir : "Objectif :", "Méthode :", "Résultats :", "Conclusion :"). Le résumé forme un texte continu.',
        'Interdiction absolue d’y insérer des références bibliographiques ou citations d’auteurs.',
        'Fournir environ 5 mots-clés valides pour chacune des deux versions linguistiques (Mots-clés et Keywords).',
      ],
      badExample: `Résumé (295 mots) :\nObjectif : Dans notre recherche, nous avons voulu évaluer...\nMéthode : Selon la méthode de Kabamba (2019), nous avons testé...\nRésultats : Nos analyses montrent...\n(Erreurs : > 250 mots, sous-titres internes prohibés, citation Kabamba 2019 interdite dans le résumé)`,
      goodExample: `Résumé :\nL'accès à une énergie électrique stable constitue un verrou majeur du développement socio-économique dans la périphérie de Kinshasa. La présente étude évalue la viabilité technique et le rendement énergétique de micro-réseaux photovoltaïques implantés à Maluku. Les simulations indiquent un gisement moyen de 4,82 kWh/m²/jour, autorisant une production annuelle de 1 420 kWh/kWc. Ces résultats confirment la pertinence des micro-réseaux décentralisés en zone équatoriale.\n\nMots-clés : Énergie photovoltaïque, Micro-réseau, Irradiation solaire, Kinshasa, Électrification décentralisée.`,
    },
    {
      id: 4,
      title: 'Structure IMRAD, Tableaux, Figures & 6 Sections de Fin',
      subtitle: 'Chiffres arabes, tableaux romains avant, figures arabes après, 6 sections obligatoires',
      icon: Table2,
      tag: 'Règle Fondamentale #4',
      description: 'L’architecture IMRAD standardise la présentation empirique, complétée par les 6 sections d’intégrité scientifique imposées par la Constitution RCST.',
      points: [
        'Numérotation stricte en chiffres arabes : 1. Introduction, 2. Matériels et méthodes, 3. Résultats, 4. Discussion, 5. Conclusion (les chiffres romains I, II, III sont exclus).',
        'L’Introduction ne doit comporter aucun sous-titre et ne doit pas dépasser une page et demie (structure logique : Contexte, Problème, Études antérieures, Limites, Objectifs).',
        'Non-redondance : les tableaux et les figures ne doivent jamais présenter la même information en double.',
        'Numérotation en chiffres romains pour les tableaux (ex: Tableau I, Tableau II) positionnés AVANT le tableau.',
        'Numérotation en chiffres arabes pour les figures (ex: Figure 1, Figure 2) positionnées APRÈS la figure.',
        '6 Sections obligatoires de fin d’article : Remerciements, Financement, Conflit d’Intérêt, Considérations d’Éthiques, ORCID des Auteurs, Contribution des Auteurs (rédigée avec les initiales uniquement, ex: J.P.I. a conçu le protocole, M.M. a validé les données).',
      ],
      badExample: `I. INTRODUCTION\nI.1 Contexte\nI.2 Objectifs de l'équipe\n...\nTableau 1 : Données (chiffres arabes pour tableau = erreur)\nFigure I : Courbe (chiffres romains pour figure = erreur)\n(Absence des sections Remerciements, Financement, Conflit d'intérêt, Éthique, ORCID, Contributions avec initiales)`,
      goodExample: `1. Introduction\n(Texte fluide sans sous-titre, ≤ 1,5 page)\n\n2. Matériels et méthodes\nTableau I : Paramètres de simulation (positionné AVANT le tableau)\n...\nFigure 1 : Courbe de charge (positionnée APRÈS l'illustration)\n...\nRemerciements : ...\nFinancement : ...\nConflit d'Intérêt : ...\nConsidérations d'Éthiques : ...\nORCID des Auteurs : ...\nContribution des Auteurs : M.T.K. a conçu l'étude ; B.K.L. a collecté les données ; P.A.M. a révisé le manuscrit.`,
    },
    {
      id: 5,
      title: 'Style Rédactionnel Impersonnel',
      subtitle: 'Proscription absolue du « nous », « je », « nos travaux »',
      icon: PenSquare,
      tag: 'Règle Fondamentale #5',
      description: 'La démarche scientifique se focalise sur les faits observés, les données mesurées et les démonstrations réfutables. L’effacement des auteurs dans la syntaxe est un impératif catégorique.',
      points: [
        'Bannir catégoriquement la 1ère personne du singulier et du pluriel : « nous », « je », « notre équipe », « nos analyses », « nos travaux », « nous pensons que ».',
        'Adopter systématiquement des tournures passives impersonnelles (« il a été observé », « des mesures ont été conduites », « les données ont été compilées »).',
        'Recourir à des formulations nominales précises (« les observations mettent en évidence », « les résultats indiquent », « l’analyse révèle »).',
      ],
      badExample: `« Dans notre article, nous avons analysé 150 échantillons parce que nous voulions vérifier notre hypothèse. Nous avons découvert que nos résultats étaient supérieurs à ceux de nos collègues. »`,
      goodExample: `« Dans le cadre de cette contribution, 150 échantillons ont été analysés afin d'éprouver l'hypothèse formulée. Les observations obtenues mettent en évidence des valeurs significativement supérieures aux seuils rapportés antérieurement dans la littérature. »`,
    },
    {
      id: 6,
      title: 'Citations & Bibliographie APA 7ème Édition',
      subtitle: 'Format auteur-date, pas de [1], retrait suspendu d’1 cm & concordance croisée',
      icon: Quote,
      tag: 'Règle Fondamentale #6',
      description: 'L’appareil critique doit se conformer rigoureusement aux normes de l’American Psychological Association (APA, 7e édition) avec concordance croisée absolue.',
      points: [
        'Chasse aux styles obsolètes ou numériques ([1], [2]) : interdiction formelle des crochets numériques sauf dérogation spécifique.',
        'Format APA 7 dans le texte : Pochet (2015) ; (Mboma & Mabiala, 2015) ; pour 3 auteurs et plus dès la première mention : (Mabiala et al., 2015).',
        'Références bibliographiques en fin de texte classées par ordre alphabétique strict du premier auteur, sans numérotation.',
        'Mise en page : retrait suspendu d’1 cm à partir de la deuxième ligne pour chaque entrée bibliographique.',
        'Correspondance croisée stricte : tout document cité dans le corps du texte doit figurer dans la bibliographie finale, et inversement (aucune entrée orpheline ni citation fantôme).',
      ],
      badExample: `Dans le texte : « Comme le montre [1] et [2]... »\n\nBibliographie :\n[1] Banza A., Récupération du cuivre, 2018.\n[2] Mukendi P., Paludisme, 2020.\n(Erreurs : style numérique Vancouver interdit, pas de retrait suspendu, ordre alphabétique non garanti)`,
      goodExample: `Dans le texte : « Les observations confirment les cinétiques établies par Banza et al. (2018) ainsi que les conclusions de Mboma et Mabiala (2015). »\n\nBibliographie (avec retrait d’1 cm en 2e ligne, ordre alphabétique) :\nBanza, A. N., Gock, E., & Kongolo, K. (2018). Base metals recovery from copper smelter slag by oxidizing leaching. Hydrometallurgy, 178, 12–20. https://doi.org/10.1016/j.hydromet.2018.03.011\n\nMboma, F., & Mabiala, P. (2015). Dynamique environnementale du bassin du Congo. Revue Congolaise des Sciences & Technologies, 3(1), 45–58.`,
    },
  ];

  const current = rules.find((r) => r.id === activeRule) || rules[0];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Intro banner */}
      <div className="bg-slate-900 border border-sky-800/50 rounded-lg p-6 sm:p-8 mb-8">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-semibold">
              <Scale className="w-3.5 h-3.5" />
              Charte & Normes Constitutionnelles RCST
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
              Constitution de la Revue Congolaise des Sciences & Technologies
            </h2>
            <p className="text-sm text-slate-300 max-w-3xl leading-relaxed">
              Ce recueil constitue la référence normative absolue pour l’acceptation, l’audit et la publication de tout manuscrit scientifique. Tout article soumis fait l’objet d’un audit préalable opposable par l’Auditeur Éditorial avant transmission au comité de lecture par les pairs.
            </p>
          </div>
          <div className="flex-shrink-0 bg-slate-950/80 border border-slate-800 rounded-md p-4 text-center">
            <div className="text-2xl font-bold text-amber-400">6 Directives</div>
            <div className="text-[11px] text-slate-400 font-medium">Contrôle de Conformité</div>
          </div>
        </div>
      </div>

      {/* Grid of 6 rules */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3 mb-8">
        {rules.map((rule) => {
          const Icon = rule.icon;
          const isSelected = activeRule === rule.id;
          return (
            <button
              key={rule.id}
              onClick={() => setActiveRule(rule.id)}
              className={`p-3.5 rounded-md border text-left transition-all flex flex-col justify-between gap-2.5 ${
                isSelected
                  ? 'bg-amber-500/10 border-amber-500/60 text-white ring-1 ring-amber-500/40'
                  : 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-850 hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between w-full">
                <span className={`p-1.5 rounded-lg ${isSelected ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-400'}`}>
                  <Icon className="w-3.5 h-3.5" />
                </span>
                <span className="text-[11px] font-mono font-bold text-amber-400/90">0{rule.id}</span>
              </div>
              <div>
                <h4 className="text-xs font-bold leading-tight line-clamp-2">{rule.title}</h4>
                <p className="text-[11px] text-slate-400 mt-1 line-clamp-1">{rule.subtitle}</p>
              </div>
            </button>
          );
        })}
      </div>

      {/* Detailed rule view */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-lg p-6 sm:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between pb-6 mb-6 border-b border-slate-800 gap-4">
          <div>
            <span className="text-xs font-mono font-semibold text-amber-400">
              {current.tag}
            </span>
            <h3 className="text-xl sm:text-2xl font-bold text-white mt-1">
              {current.title}
            </h3>
            <p className="text-sm text-slate-400 mt-1">{current.subtitle}</p>
          </div>
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-lg bg-sky-950/80 border border-sky-800/60 text-sky-300 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Directive Opposable
          </div>
        </div>

        <p className="text-sm sm:text-base text-slate-200 leading-relaxed mb-6">
          {current.description}
        </p>

        {/* Requirements */}
        <div className="mb-8">
          <h4 className="text-xs font-semibold text-amber-300 mb-3 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            Directives de la Constitution RCST
          </h4>
          <ul className="space-y-2.5">
            {current.points.map((pt, index) => (
              <li key={index} className="flex items-start gap-3 text-sm text-slate-300 bg-slate-950/50 p-3 rounded-lg border border-slate-850">
                <span className="text-amber-400 font-bold text-xs mt-0.5">•</span>
                <span>{pt}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Comparative Bad / Good */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="border border-rose-900/50 bg-rose-950/20 rounded-md p-5">
            <div className="flex items-center gap-2 text-rose-400 font-semibold text-xs mb-3">
              <XCircle className="w-4 h-4" />
              À Proscrire (Motif de rejet immédiat)
            </div>
            <pre className="text-xs font-mono text-rose-200/90 whitespace-pre-wrap bg-slate-950/90 p-3.5 rounded-lg border border-rose-950/80 leading-relaxed">
              {current.badExample}
            </pre>
          </div>

          <div className="border border-emerald-900/50 bg-emerald-950/20 rounded-md p-5">
            <div className="flex items-center gap-2 text-emerald-400 font-semibold text-xs mb-3">
              <CheckCircle2 className="w-4 h-4" />
              Standard d'Excellence Requis (Modèle Conforme)
            </div>
            <pre className="text-xs font-mono text-emerald-200/90 whitespace-pre-wrap bg-slate-950/90 p-3.5 rounded-lg border border-emerald-950/80 leading-relaxed">
              {current.goodExample}
            </pre>
          </div>
        </div>
      </div>
    </div>
  );
};
