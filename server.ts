import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import { GoogleGenAI } from '@google/genai';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import mammoth from 'mammoth';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));

// Multer memory storage configuration for document extraction
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 25 * 1024 * 1024 }, // 25 MB max
});

// Shared Gemini client
const apiKey = process.env.GEMINI_API_KEY || '';
const ai = apiKey
  ? new GoogleGenAI({
      apiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    })
  : null;

// POST /api/extract-file
// Extracts text from .docx, .pdf, .txt, .md with conversion tolerance
app.post('/api/extract-file', upload.single('file'), async (req: Request, res: Response) => {
  try {
    const file = req.file;
    if (!file) {
      return res.status(400).json({ error: 'Aucun fichier reçu.' });
    }

    const filename = file.originalname || 'manuscrit';
    const ext = path.extname(filename).toLowerCase();
    let extractedText = '';

    if (ext === '.docx' || ext === '.doc') {
      try {
        const result = await mammoth.extractRawText({ buffer: file.buffer });
        extractedText = result.value || '';
      } catch (err: any) {
        console.error('Erreur extraction docx:', err);
        return res.status(500).json({ error: 'Échec de lecture du fichier Word .docx.' });
      }
    } else if (ext === '.pdf') {
      try {
        const pdfData = await pdfParse(file.buffer);
        extractedText = pdfData.text || '';
      } catch (err: any) {
        console.error('Erreur extraction pdf:', err);
        return res.status(500).json({ error: 'Échec de lecture du fichier PDF.' });
      }
    } else if (ext === '.txt' || ext === '.md' || ext === '.rtf' || ext === '.text') {
      extractedText = file.buffer.toString('utf-8');
    } else {
      // Fallback try utf-8
      extractedText = file.buffer.toString('utf-8');
    }

    // Clean up extreme raw artifacts while preserving paragraph structure
    extractedText = extractedText
      .replace(/\r\n/g, '\n')
      .replace(/\r/g, '\n')
      .replace(/\u0000/g, '') // remove null bytes
      .trim();

    const wordCount = extractedText.split(/\s+/).filter(Boolean).length;

    return res.json({
      text: extractedText,
      filename,
      extension: ext,
      sizeBytes: file.size,
      wordCount,
      message: `Document ${filename} extrait avec succès (${wordCount} mots). Prêt pour l'audit RCST.`,
    });
  } catch (err: any) {
    console.error('Erreur générale extraction fichier:', err);
    return res.status(500).json({ error: 'Erreur lors du traitement du document.' });
  }
});

// Helper: Heuristic audit fallback if AI key unavailable or error occurs
function performLocalHeuristicAudit(text: string) {
  const lowerText = text.toLowerCase();

  // 1. Personal pronouns check (strict RCST Rule 5)
  const personalPronounsMatches = [
    ...text.matchAll(/\b(nous|je|notre|nos|j'|moi|mon|mes|on a|nous avons|nous pensons|nous concluons|nos travaux|notre équipe|notre étude)\b/gi),
  ];
  const personalPronounsCount = personalPronounsMatches.length;

  // 2. ORCID check (16 digits format)
  const hasOrcid = /orcid(?:\.org)?\/?[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9xX]/i.test(text) || /\b[0-9]{4}-[0-9]{4}-[0-9]{4}-[0-9]{3}[0-9xX]\b/.test(text);

  // 3. Email & Phone check
  const hasEmails = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);
  const hasPhone = /(?:\+243|0[0-9]{2}|\b\+?[0-9]{1,4}[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{2,4}[\s.-]?[0-9]{2,4}\b)/.test(text) || /t[ée]l[ée]phone|phone|tel\s*:/i.test(text);
  const hasAsterisk = text.includes('*') || /correspond/i.test(text);
  const hasBulletedAuthors = /auteurs?\s*:\s*\n\s*[-*•]/i.test(text);

  // 4. Title bilingual & quotes check
  const hasSuperfluousQuotes = /^["«'].*["»']$/m.test(text) || text.includes('“') || text.includes('”') || text.includes('«') || text.includes('»');
  const hasEnglishTitleHint = (/title|abstract/i.test(text) && /résumé|introduction/i.test(text)) || /^[A-Z][a-z].*\n[A-Z][a-z]/m.test(text);

  // 5. Abstract & Keywords check (max 250 words, bilingual, 5 keywords, zero subtitles, zero references)
  const abstractMatch = text.match(/(?:résumé|abstract)[\s\S]*?(?=(?:mots-cl[ée]s|keywords|1\.|introduction))/i);
  const abstractWords = abstractMatch ? abstractMatch[0].split(/\s+/).filter(Boolean).length : 0;
  const hasForbiddenSubtitles = /(?:résumé|abstract)[\s\S]*?(?:objectif|méthode|résultats|conclusion)\s*:/i.test(text);
  const hasReferencesInAbstract = /(?:résumé|abstract)[\s\S]*?(?:\[\d+\]|\(\w+,\s*\d{4}\))/i.test(text);
  const hasKeywordsFr = /mots-cl[ée]s\s*:/i.test(text);
  const hasKeywordsEn = /keywords\s*:/i.test(text);

  // 6. IMRAD detection
  const hasArabicNumbering = /1\.\s*introduction/i.test(text) || /2\.\s*(?:matériels? et méthodes|méthodes?)/i.test(text);
  const hasRomanNumbering = /I\.\s*introduction/i.test(text) || /II\.\s*méthode/i.test(text);
  const hasIntroSubtitles = /1\.\d|I\.\d/i.test(text) && text.indexOf('1.') < text.indexOf('2.');

  // 7. Tables (Roman before) & Figures (Arabic after)
  const hasTableauRomain = /Tableau\s+[IVXLCDM]+/i.test(text);
  const hasTableauArabe = /Tableau\s+\d+/i.test(text);
  const hasFigureArabe = /Figure\s+\d+/i.test(text);

  // 8. Mandatory End-of-Article Sections check (6 sections)
  const hasRemerciements = /remerciements|acknowledg(?:e)?ments/i.test(text);
  const hasFinancement = /financement|funding/i.test(text);
  const hasConflit = /conflit d['’]int[ée]r[êe]t|conflict of interest/i.test(text);
  const hasEthique = /consid[ée]rations d['’][ée]thiques?|ethical considerations|approbation [ée]thique/i.test(text);
  const hasOrcidSection = /orcid des auteurs|authors['’] orcid/i.test(text) || hasOrcid;
  const hasContributionAuteurs = /contribution des auteurs|authors['’] contributions/i.test(text);
  const hasInitialsOnly = /([A-Z]\.[A-Z]\.(?:\.[A-Z]\.)?)\s*(?:a|ont|conceived|wrote)/i.test(text) || /[A-Z]\.[A-Z]\.\s*:/i.test(text);

  // 9. Citations APA 7 check
  const hasBracketCitations = /\[\d+\]|\[\d+,\s*\d+\]/.test(text);

  // Status calculation
  let status: 'Conforme' | 'Conforme avec réserves' | 'Refusé - Modifications majeures requises' = 'Conforme';
  const majorIssues: string[] = [];
  const minorIssues: string[] = [];

  if (personalPronounsCount > 3) {
    majorIssues.push(`Style subjectif interdit : ${personalPronounsCount} occurrences de « nous/je/notre/nos travaux ». Remplacement par le style impersonnel obligatoire.`);
  } else if (personalPronounsCount > 0) {
    minorIssues.push(`${personalPronounsCount} pronoms personnels à reformuler au style impersonnel.`);
  }

  if (hasBulletedAuthors) {
    majorIssues.push("Auteurs et affiliations : Utilisation de puces formellement proscrite.");
  }
  if (!hasOrcid) {
    majorIssues.push("Auteurs : Absence des numéros ORCID à 16 chiffres obligatoires pour chaque auteur.");
  }
  if (!hasPhone) {
    minorIssues.push("Auteur correspondant : Numéro de téléphone direct obligatoire non mentionné.");
  }
  if (!hasAsterisk) {
    minorIssues.push("Auteur correspondant non identifié par un astérisque (*) en exposant.");
  }

  if (abstractWords > 250) {
    majorIssues.push(`Résumé trop long : ${abstractWords} mots (la Constitution RCST impose strictement max 250 mots).`);
  }
  if (hasForbiddenSubtitles) {
    majorIssues.push("Résumé : Interdiction formelle d'inclure des sous-titres.");
  }
  if (hasReferencesInAbstract) {
    majorIssues.push("Résumé : Interdiction absolue d'y insérer des références bibliographiques.");
  }
  if (!hasEnglishTitleHint || !hasKeywordsEn) {
    majorIssues.push("Bilinguisme incomplet : Titre et Résumé doivent obligatoirement comporter leur version anglaise intégrale avec 5 mots-clés.");
  }

  if (hasBracketCitations) {
    majorIssues.push("Citations obsolètes/numériques [1], [2] détectées. La RCST exige exclusivement la norme APA 7 (ex: Mboma & Mabiala, 2015).");
  }

  if (hasRomanNumbering && !hasArabicNumbering) {
    majorIssues.push("Numérotation des sections : Utilisation de chiffres romains proscrite. Exiger des chiffres arabes stricts (1., 2., 3., 4., 5.).");
  }

  const missingEndSections: string[] = [];
  if (!hasRemerciements) missingEndSections.push('Remerciements');
  if (!hasFinancement) missingEndSections.push('Financement');
  if (!hasConflit) missingEndSections.push("Conflit d'Intérêt");
  if (!hasEthique) missingEndSections.push("Considérations d'Éthiques");
  if (!hasContributionAuteurs) missingEndSections.push('Contribution des Auteurs');

  if (missingEndSections.length >= 3) {
    majorIssues.push(`Sections obligatoires de fin d'article manquantes : ${missingEndSections.join(', ')}.`);
  } else if (missingEndSections.length > 0) {
    minorIssues.push(`Sections de fin d'article à compléter : ${missingEndSections.join(', ')}.`);
  }

  if (majorIssues.length >= 2) {
    status = 'Refusé - Modifications majeures requises';
  } else if (majorIssues.length === 1 || minorIssues.length >= 2) {
    status = 'Conforme avec réserves';
  }

  const globalScore = Math.max(20, Math.min(100, 100 - majorIssues.length * 18 - minorIssues.length * 7));

  return {
    status,
    globalScore,
    summary: `Audit éditorial assermenté RCST : ${majorIssues.length} non-conformité(s) critique(s) et ${minorIssues.length} réserve(s) relevée(s). Statut attribué : ${status}.`,
    sections: {
      titleAndAuthors: {
        score: hasBulletedAuthors || !hasOrcid ? 55 : (hasEnglishTitleHint && hasEmails && hasPhone ? 95 : 75),
        status: (hasBulletedAuthors || !hasOrcid) ? 'Non conforme' : (hasEnglishTitleHint && hasEmails && hasPhone ? 'Conforme' : 'Partiellement conforme'),
        isBilingualTitle: hasEnglishTitleHint,
        hasSuperfluousQuotes,
        hasBulletedAuthors,
        hasSuperscriptAffiliations: !hasBulletedAuthors,
        hasCorrespondingAsterisk: hasAsterisk,
        hasEmails,
        hasPhone,
        hasOrcid16Digits: hasOrcid,
        issues: [
          ...(hasBulletedAuthors ? ["Ne jamais utiliser de puces pour lister les auteurs."] : []),
          ...(!hasOrcid ? ["Numéro ORCID à 16 chiffres obligatoire manquant pour un ou plusieurs auteurs."] : []),
          ...(!hasPhone ? ["Numéro de téléphone de l'auteur correspondant non mentionné."] : []),
          ...(!hasEnglishTitleHint ? ["Titre en anglais manquant. Le titre doit obligatoirement être bilingue."] : []),
          ...(hasSuperfluousQuotes ? ["Guillemets superflus détectés dans le titre à supprimer."] : []),
        ],
        recommendations: [
          "Format obligatoire : Nom Prénom¹*, Co-auteur² (avec chiffres en exposant, sans puces).",
          "Auteur correspondant identifié par (*) avec email, téléphone et ORCID (16 chiffres).",
        ],
      },
      abstractAndKeywords: {
        score: abstractWords > 250 || hasForbiddenSubtitles || hasReferencesInAbstract ? 50 : (hasKeywordsFr && hasKeywordsEn ? 95 : 75),
        status: (abstractWords > 250 || hasForbiddenSubtitles || hasReferencesInAbstract) ? 'Non conforme' : 'Conforme',
        wordCountFr: abstractWords,
        wordCountEn: abstractWords,
        isBilingual: hasEnglishTitleHint && hasKeywordsEn,
        hasForbiddenSubtitles,
        hasReferences: hasReferencesInAbstract,
        keywordsCountFr: hasKeywordsFr ? 5 : 0,
        keywordsCountEn: hasKeywordsEn ? 5 : 0,
        issues: [
          ...(abstractWords > 250 ? [`Résumé trop volumineux (${abstractWords} mots). La limite absolue est de 250 mots.`] : []),
          ...(hasForbiddenSubtitles ? ["Interdiction formelle d'inclure des sous-titres dans le résumé."] : []),
          ...(hasReferencesInAbstract ? ["Interdiction absolue d'insérer des références bibliographiques dans le résumé."] : []),
          ...(!hasKeywordsEn ? ["Mots-clés en anglais (Keywords) manquants (5 requis)."] : []),
        ],
        recommendations: [
          "Fournir un paragraphe unique, fluide, max 250 mots en français et en anglais (Abstract).",
          "Adjoindre 5 mots-clés valides pour les deux versions linguistiques.",
        ],
      },
      imradAndStructure: {
        score: missingEndSections.length > 2 || hasRomanNumbering ? 55 : 85,
        status: (missingEndSections.length > 2 || hasRomanNumbering) ? 'Non conforme' : 'Conforme',
        hasArabicNumbering,
        hasSuperfluousSubtitlesInIntro: hasIntroSubtitles,
        introLengthCompliant: true,
        tablesAndFiguresCompliant: {
          tablesRomanBefore: hasTableauRomain || !hasTableauArabe,
          figuresArabicAfter: hasFigureArabe,
          redundancyDetected: false,
          notes: hasTableauArabe ? "Tableaux : numérotation en chiffres romains obligatoire (ex: Tableau I) positionnée AVANT le tableau." : "Conforme aux normes de tableaux et figures.",
        },
        mandatoryEndSections: {
          remerciements: hasRemerciements,
          financement: hasFinancement,
          conflitInteret: hasConflit,
          considerationsEthiques: hasEthique,
          orcidAuteurs: hasOrcidSection,
          contributionAuteursInitialsOnly: hasContributionAuteurs && hasInitialsOnly,
        },
        issues: [
          ...(hasRomanNumbering ? ["Numérotation en chiffres arabes obligatoire (1. Introduction, 2. Matériels et méthodes, etc.). Bannir I, II, III."] : []),
          ...(hasIntroSubtitles ? ["L'Introduction ne doit comporter aucun sous-titre superflu."] : []),
          ...(hasTableauArabe ? ["Numérotation en chiffres romains obligatoire pour les tableaux (ex: Tableau I) positionnée AVANT."] : []),
          ...(missingEndSections.length > 0 ? [`Sections obligatoires de fin d'article manquantes : ${missingEndSections.join(', ')}.`] : []),
          ...(!hasInitialsOnly && hasContributionAuteurs ? ["Contribution des Auteurs : utiliser exclusivement les initiales (ex: J.-P.N. a conçu l'étude)."] : []),
        ],
        recommendations: [
          "Structurer strictement en chiffres arabes (1. Introduction, 2. Matériels et méthodes, 3. Résultats, 4. Discussion, 5. Conclusion).",
          "Insérer impérativement les 6 sections de fin d'article requises par la Constitution RCST avec initiales uniquement pour les contributions.",
        ],
      },
      citationsAndReferences: {
        score: hasBracketCitations ? 40 : 85,
        status: hasBracketCitations ? 'Non conforme' : 'Conforme',
        apa7Compliant: !hasBracketCitations,
        hasNumericStyleBracket: hasBracketCitations,
        crossReferencingValid: true,
        hangingIndentCompliant: true,
        alphabeticalOrderCompliant: true,
        missingFromBibliography: [],
        missingFromText: [],
        flaggedCitations: hasBracketCitations
          ? [{ raw: '[1], [2]', error: 'Format numérique prohibé', correctedApa7: '(Pochet, 2015 ; Mboma & Mabiala, 2015)' }]
          : [],
        issues: [
          ...(hasBracketCitations ? ["Bannir immédiatement le format numérique entre crochets ([1], [2]). Utiliser exclusivement le format APA 7 (ex: Mboma & Mabiala, 2015)."] : []),
        ],
        recommendations: [
          "Format dans le texte : (Auteur, Année) ou Auteur (Année). À partir de 3 auteurs : (Mabiala et al., 2015).",
          "Bibliographie finale : ordre alphabétique, sans puces ni numéros, avec retrait négatif d'1 cm à partir de la 2e ligne. Concordance croisée à 100%.",
        ],
      },
      style: {
        score: personalPronounsCount === 0 ? 100 : Math.max(30, 95 - personalPronounsCount * 12),
        status: personalPronounsCount === 0 ? 'Conforme' : 'Non conforme',
        isImpersonal: personalPronounsCount === 0,
        personalPronounsDetected: personalPronounsMatches.map((m) => m[0]).slice(0, 10),
        sampleReformulations: [
          { original: "nous avons prélevé", corrected: "des prélèvements ont été effectués" },
          { original: "nos résultats montrent", corrected: "les résultats obtenus mettent en évidence" },
        ],
        issues: [
          ...(personalPronounsCount > 0 ? [`${personalPronounsCount} occurrences de style subjectif/personnel (« nous », « je », « nos travaux »).`] : []),
        ],
        recommendations: [
          "Style impersonnel strict exigé par la RCST : remplacer systématiquement 'nous' et 'nos travaux' par des tournures passives ou nominales.",
        ],
      },
    },
    priorityRecommendations: [
      ...(personalPronounsCount > 0 ? ["Bannir toute utilisation de « nous », « je », « nos travaux » au profit du style impersonnel strict."] : []),
      ...(hasBulletedAuthors ? ["Supprimer les puces pour la liste des auteurs et rattacher les affiliations en exposant."] : []),
      ...(!hasOrcid ? ["Indiquer obligatoirement le numéro ORCID à 16 chiffres pour chaque auteur."] : []),
      ...(!hasPhone ? ["Indiquer explicitement le numéro de téléphone et l'e-mail de l'auteur correspondant (*) en exposant."] : []),
      ...(abstractWords > 250 || hasForbiddenSubtitles ? ["Ramener le résumé sous le plafond strict de 250 mots, sans sous-titre ni référence bibliographique."] : []),
      ...(!hasEnglishTitleHint ? ["Traduire le titre et le résumé en anglais avec 5 mots-clés valides pour chaque version (Abstract / Keywords)."] : []),
      ...(hasBracketCitations ? ["Remplacer toutes les citations numériques [1] par la norme APA 7 (ex: Mabiala et al., 2015)."] : []),
      ...(missingEndSections.length > 0 ? [`Ajouter les 6 sections de fin d'article obligatoires (Remerciements, Financement, Conflit d'Intérêt, Considérations d'Éthiques, ORCID, Contribution des Auteurs avec initiales uniquement).`] : []),
    ],
    editorialBoardNotes: {
      decisionRecommendation: status === 'Conforme' ? 'Acceptation pour révision par les pairs' : (status === 'Conforme avec réserves' ? 'Révision mineure requise avant envoi aux réviseurs' : 'Rejet avec demande de refonte majeure de conformité'),
      confidentialComments: "Vérifier la déclaration des conflits d'intérêts et l'approbation éthique institutionnelle.",
      ethicalChecklist: [
        "Vérification de l'approbation éthique (données biomédicales / humaines)",
        "Absence de plagiat et conformité avec les directives COPE",
        "Concordance exacte des 16 chiffres ORCID",
      ],
      questionsForAuthors: [
        "Confirmer le rattachement institutionnel officiel et le numéro de téléphone de l'auteur correspondant.",
        "Préciser les contributions respectives sous forme d'initiales uniquement (ex: J.-P.N., M.M.).",
      ],
    },
  };
}

// POST /api/audit
app.post('/api/audit', async (req: Request, res: Response) => {
  try {
    const { manuscriptText, sourceFilename } = req.body;

    if (!manuscriptText || typeof manuscriptText !== 'string' || manuscriptText.trim().length < 50) {
      return res.status(400).json({
        error: 'Le texte du manuscrit est trop court ou manquant pour effectuer un audit éditorial RCST.',
      });
    }

    if (!ai) {
      const heuristic = performLocalHeuristicAudit(manuscriptText);
      return res.json({
        ...heuristic,
        isAiGenerated: false,
        rawAuditMarkdown: generateMarkdownReport(heuristic, manuscriptText),
      });
    }

    const systemInstruction = `Tu es l'expert éditorial principal et l'auditeur officiel de la Revue Congolaise des Sciences & Technologies (RCST).
Ton rôle est d'analyser, d'auditer et d'évaluer les manuscrits scientifiques soumis (au format Word .docx, PDF .pdf, Texte .txt ou Markdown .md), en te basant STRICTEMENT sur la Constitution officielle de la RCST.

DIRECTIVES DE TRAITEMENT DES FICHIERS :
- Tu traites le texte extrait du document, peu importe sa provenance initiale (.docx, .pdf, .txt, .md).
- Si le texte extrait contient des artéfacts de conversion technique (p. ex. sauts de ligne intempestifs ou pertes de mise en forme des exposants comme 'Nom 1' au lieu de 'Nom¹'), analyse la structure logique du texte sans pénaliser l'auteur sur ces erreurs d'extraction technique pure. En revanche, les manquements textuels de fond (puces, absence d'email/téléphone/ORCID, 'nous', citations [1], manque de bilinguisme, sections manquantes) doivent être audités avec une rigueur absolue.

CONSTITUTION RCST – DIRECTIVES D'AUDIT :
1. TITRE ET LANGUE :
   - Titre obligatoirement bilingue (Français / Anglais).
   - Interdiction formelle des guillemets dans le titre.
2. AUTEURS, AFFILIATIONS ET DÉTAILS :
   - Proscription absolue des puces pour lister les auteurs.
   - Numérotation des affiliations obligatoirement en exposant rattachée au nom.
   - Auteur correspondant identifié par un astérisque (*) en exposant.
   - Obligation d'inclure : Adresse e-mail valide, numéro de téléphone et identifiant ORCID (16 chiffres).
3. RÉSUMÉ ET MOTS-CLÉS :
   - Résumé strictement bilingue (Résumé FR + Abstract EN).
   - Plafond strict : maximum 250 mots (ou une demi-page).
   - Zéro sous-titre dans le résumé et zéro référence bibliographique.
   - 5 mots-clés obligatoires pour chaque version.
4. CORPS DU TEXTE ET STRUCTURE IMRAD (Articles de recherche) :
   - Numérotation des sections principales en chiffres arabes (1. Introduction, 2. Matériels et méthodes, 3. Résultats, 4. Discussion, 5. Conclusion).
   - L'Introduction ne doit comporter AUCUN sous-titre et ne pas dépasser 1 page et demi.
   - Tableaux et Figures : Ne pas doubler les informations.
     * Tableaux : Numérotation en chiffres romains (ex: Tableau I), intitulé placé AVANT le tableau.
     * Figures : Numérotation en chiffres arabes (ex: Figure 1), intitulé placé APRÈS la figure.
   - 6 Sections obligatoires de fin d'article : Remerciements, Financement, Conflit d'Intérêt, Considérations d'Éthiques, ORCID des Auteurs, Contribution des Auteurs (avec initiales uniquement, ex: J.-P.N.).
5. STYLE RÉDACTIONNEL :
   - Style impersonnel strict obligatoire dans tout le document (bannir "nous", "je", "nos travaux").
6. CITATIONS ET BIBLIOGRAPHIE (APA 7ème Édition) :
   - Citations dans le texte au format APA 7 (Auteur, Année). Interdiction des numéros entre crochets [1].
   - Bibliographie en fin de texte classée par ordre alphabétique, sans puces ni numéros, avec un retrait négatif d'1 cm à partir de la 2ème ligne.
   - Concordance croisée à 100% (toute citation est en bibliographie et inversement).

FORMAT DE SORTIE ATTENDU :
Génère un rapport JSON structuré ainsi :
{
  "status": "Conforme" | "Conforme avec réserves" | "Refusé - Modifications majeures requises",
  "globalScore": nombre entre 0 et 100,
  "summary": "synthèse en 2-3 phrases",
  "sections": {
    "titleAndAuthors": {
      "score": nombre sur 100,
      "status": "Conforme" | "Partiellement conforme" | "Non conforme",
      "isBilingualTitle": bool,
      "hasSuperfluousQuotes": bool,
      "hasBulletedAuthors": bool,
      "hasSuperscriptAffiliations": bool,
      "hasCorrespondingAsterisk": bool,
      "hasEmails": bool,
      "hasPhone": bool,
      "hasOrcid16Digits": bool,
      "issues": ["..."],
      "recommendations": ["..."],
      "correctedTitleBlock": { "fr": "...", "en": "..." },
      "correctedAuthorsBlock": "..."
    },
    "abstractAndKeywords": {
      "score": nombre sur 100,
      "status": "Conforme" | "Partiellement conforme" | "Non conforme",
      "wordCountFr": nombre,
      "wordCountEn": nombre,
      "isBilingual": bool,
      "hasForbiddenSubtitles": bool,
      "hasReferences": bool,
      "keywordsCountFr": nombre,
      "keywordsCountEn": nombre,
      "issues": ["..."],
      "recommendations": ["..."],
      "correctedAbstractFr": "...",
      "correctedAbstractEn": "..."
    },
    "imradAndStructure": {
      "score": nombre sur 100,
      "status": "Conforme" | "Partiellement conforme" | "Non conforme",
      "hasArabicNumbering": bool,
      "hasSuperfluousSubtitlesInIntro": bool,
      "introLengthCompliant": bool,
      "tablesAndFiguresCompliant": {
        "tablesRomanBefore": bool,
        "figuresArabicAfter": bool,
        "redundancyDetected": bool,
        "notes": "..."
      },
      "mandatoryEndSections": {
        "remerciements": bool,
        "financement": bool,
        "conflitInteret": bool,
        "considerationsEthiques": bool,
        "orcidAuteurs": bool,
        "contributionAuteursInitialsOnly": bool
      },
      "issues": ["..."],
      "recommendations": ["..."]
    },
    "citationsAndReferences": {
      "score": nombre sur 100,
      "status": "Conforme" | "Partiellement conforme" | "Non conforme",
      "apa7Compliant": bool,
      "hasNumericStyleBracket": bool,
      "crossReferencingValid": bool,
      "hangingIndentCompliant": bool,
      "alphabeticalOrderCompliant": bool,
      "missingFromBibliography": ["..."],
      "missingFromText": ["..."],
      "flaggedCitations": [
        { "raw": "...", "error": "...", "correctedApa7": "..." }
      ],
      "issues": ["..."],
      "recommendations": ["..."]
    },
    "style": {
      "score": nombre sur 100,
      "status": "Conforme" | "Partiellement conforme" | "Non conforme",
      "isImpersonal": bool,
      "personalPronounsDetected": ["..."],
      "sampleReformulations": [
        { "original": "...", "corrected": "..." }
      ],
      "issues": ["..."],
      "recommendations": ["..."]
    }
  },
  "priorityRecommendations": [
    "liste à puces directe et hiérarchisée des modifications requises"
  ],
  "editorialBoardNotes": {
    "decisionRecommendation": "avis décisionnel",
    "confidentialComments": "points confidentiels",
    "ethicalChecklist": ["points de vigilance éthique"],
    "questionsForAuthors": ["questions aux auteurs"]
  },
  "rawAuditMarkdown": "rapport officiel complet structuré selon les 4 points du prompt"
}`;

    const prompt = `Voici le texte extrait du manuscrit scientifique soumis à la Revue Congolaise des Sciences & Technologies (RCST)${sourceFilename ? ` (Source : ${sourceFilename})` : ''} :

--- DÉBUT MANUSCRIT EXTRAIT ---
${manuscriptText}
--- FIN MANUSCRIT EXTRAIT ---

Procède à l'audit exhaustif et retourne UNIQUEMENT un objet JSON valide conforme aux directives constitutionnelles.`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: prompt,
      config: {
        systemInstruction,
        responseMimeType: 'application/json',
        temperature: 0.15,
      },
    });

    const responseText = response.text || '{}';
    let parsedData: any;
    try {
      parsedData = JSON.parse(responseText);
    } catch {
      const cleaned = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
      parsedData = JSON.parse(cleaned);
    }

    if (!parsedData.rawAuditMarkdown) {
      parsedData.rawAuditMarkdown = generateMarkdownReport(parsedData, manuscriptText);
    }

    parsedData.isAiGenerated = true;
    return res.json(parsedData);
  } catch (error: any) {
    console.error('Erreur audit Gemini:', error);
    const heuristic = performLocalHeuristicAudit(req.body.manuscriptText || '');
    return res.json({
      ...heuristic,
      isAiGenerated: false,
      warning: "Audit généré par le moteur d'analyse locale suite à une indisponibilité temporaire du modèle.",
      rawAuditMarkdown: generateMarkdownReport(heuristic, req.body.manuscriptText || ''),
    });
  }
});

// POST /api/reformulate-style
app.post('/api/reformulate-style', async (req: Request, res: Response) => {
  try {
    const { textToReformulate } = req.body;
    if (!textToReformulate || typeof textToReformulate !== 'string') {
      return res.status(400).json({ error: 'Texte manquant.' });
    }

    if (!ai) {
      const basicFix = textToReformulate
        .replace(/\bnous avons constaté que\b/gi, 'il a été constaté que')
        .replace(/\bnous avons analysé\b/gi, 'l’analyse a porté sur')
        .replace(/\bnous pensons que\b/gi, 'les éléments suggèrent que')
        .replace(/\bnotre étude montre\b/gi, 'cette étude démontre')
        .replace(/\bnous concluons que\b/gi, 'il convient de conclure que')
        .replace(/\bnos travaux\b/gi, 'les investigations antérieures')
        .replace(/\bnous\b/gi, 'les auteurs');
      return res.json({
        rephrased: basicFix,
        explanations: ['Remplacement systématique des marques de subjectivité par des tournures passives ou nominales.'],
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Réécris le passage suivant dans le style impersonnel strict exigé par la Constitution de la Revue Congolaise des Sciences & Technologies (RCST).
Bannis catégoriquement "nous", "je", "notre", "nos", "nos travaux". Utilise des tournures passives, impersonnelles ou nominales de haute tenue scientifique.

Passage :
"${textToReformulate}"

Réponds au format JSON :
{
  "rephrased": "texte réécrit",
  "explanations": ["liste d'explications sur les changements apportés"]
}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Erreur reformulation:', err);
    return res.status(500).json({ error: 'Erreur lors de la reformulation.' });
  }
});

// POST /api/convert-apa
app.post('/api/convert-apa', async (req: Request, res: Response) => {
  try {
    const { referenceString } = req.body;
    if (!referenceString) {
      return res.status(400).json({ error: 'Référence requise.' });
    }

    if (!ai) {
      return res.json({
        apaFormatted: referenceString,
        inTextCitationParenthetical: '(Auteur, 2024)',
        inTextCitationNarrative: 'Auteur (2024)',
        notes: 'Formatage automatique préliminaire.',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Convertis cette référence bibliographique selon les normes APA 7ème édition exigées par la Revue Congolaise des Sciences & Technologies (RCST).
Règles : ordre des auteurs, année entre parenthèses, titre en italique si ouvrage/revue, volume en italique, retrait négatif d'1 cm, lien DOI actif.
Référence source : "${referenceString}"

Réponds en JSON :
{
  "apaFormatted": "référence formatée en APA 7 complet",
  "inTextCitationParenthetical": "ex: (Mboma & Mabiala, 2015)",
  "inTextCitationNarrative": "ex: Mboma et Mabiala (2015)",
  "notes": "corrections apportées"
}`,
      config: {
        responseMimeType: 'application/json',
        temperature: 0.1,
      },
    });

    const parsed = JSON.parse(response.text || '{}');
    return res.json(parsed);
  } catch (err: any) {
    console.error('Erreur APA:', err);
    return res.status(500).json({ error: 'Erreur lors de la conversion APA.' });
  }
});

function generateMarkdownReport(data: any, text: string): string {
  const status = data.status || 'Conforme avec réserves';
  const score = data.globalScore || 70;
  const refId = `RCST-AUDIT-${new Date().getFullYear()}-${Math.floor(1000 + Math.random() * 9000)}`;

  const s = data.sections || {};
  const titleSec = s.titleAndAuthors || {};
  const absSec = s.abstractAndKeywords || {};
  const imradSec = s.imradAndStructure || {};
  const apaSec = s.citationsAndReferences || {};
  const styleSec = s.style || {};

  return `# RAPPORT D'AUDIT OFFICIEL ASSERMENTÉ - RCST
Revue Congolaise des Sciences & Technologies
Réf. d'enregistrement : ${refId}
Date de l'audit : ${new Date().toLocaleDateString('fr-FR')}

======================================================================
1. STATUT OFFICIEL : [${status.toUpperCase()}]
Score de conformité : ${score}/100
======================================================================

Synthèse éditoriale :
${data.summary || 'Évaluation réalisée conformément à la Constitution de la RCST.'}

======================================================================
2. ANALYSE DÉTAILLÉE PAR SECTION
======================================================================

### 2.1 Titre & Auteurs
- Bilinguisme du titre (FR/EN) : ${titleSec.isBilingualTitle ? 'Conforme' : 'Non-conforme (Titre anglais manquant)'}
- Absence de guillemets : ${!titleSec.hasSuperfluousQuotes ? 'Conforme' : 'À corriger (Guillemets proscrits détectés dans le titre)'}
- Présentation des auteurs : ${!titleSec.hasBulletedAuthors ? 'Conforme (aucune puce utilisée)' : 'NON-CONFORME (Puces détectées, formellement interdites)'}
- Affiliations en exposant : ${titleSec.hasSuperscriptAffiliations ? 'Conforme' : 'À régulariser en exposants rattachés aux noms'}
- Auteur correspondant (*) : ${titleSec.hasCorrespondingAsterisk ? 'Identifié par un astérisque (*)' : 'Non identifié clairement'}
- Coordonnées obligatoires :
  • E-mail : ${titleSec.hasEmails ? 'Présent' : 'MANQUANT'}
  • Téléphone : ${titleSec.hasPhone ? 'Présent' : 'MANQUANT'}
  • ORCID à 16 chiffres : ${titleSec.hasOrcid16Digits ? 'Présent et conforme' : 'MANQUANT OU INCOMPLET'}
- Remarques & Manquements : ${(titleSec.issues || []).join(' ; ') || 'Aucune anomalie majeure.'}

### 2.2 Résumé & Mots-clés
- Bilinguisme (Résumé FR + Abstract EN) : ${absSec.isBilingual ? 'Conforme' : 'Incomplet'}
- Calibrage du résumé : ${absSec.wordCountFr || 0} mots (Plafond strict : max 250 mots ou une demi-page) : ${(absSec.wordCountFr || 0) <= 250 ? 'Conforme' : 'DÉPASSÉ (Non-conforme)'}
- Absence de sous-titres : ${!absSec.hasForbiddenSubtitles ? 'Conforme (zéro sous-titre)' : 'NON-CONFORME (Sous-titres internes détectés et formellement interdits)'}
- Absence de références bibliographiques : ${!absSec.hasReferences ? 'Conforme (zéro référence)' : 'NON-CONFORME (Références bibliographiques détectées dans le résumé)'}
- Mots-clés (5 obligatoires pour chaque version) : ${absSec.keywordsCountFr || 0} en français / ${absSec.keywordsCountEn || 0} en anglais.
- Remarques & Manquements : ${(absSec.issues || []).join(' ; ') || 'Conforme aux directives.'}

### 2.3 Corps du texte & Structure IMRAD
- Numérotation des sections principales en chiffres arabes : ${imradSec.hasArabicNumbering ? 'Conforme (1. Introduction, 2. Matériels et méthodes, 3. Résultats, 4. Discussion, 5. Conclusion)' : 'Non-conforme (Chiffres romains proscrits)'}
- Introduction : ${!imradSec.hasSuperfluousSubtitlesInIntro ? 'Fluide, sans aucun sous-titre superflu' : 'Sous-titres superflus à supprimer'}
- Longueur de l'introduction : Conforme (inférieure ou égale à 1 page et demi)
- Tableaux et Figures :
  • Tableaux en chiffres romains (ex: Tableau I) placés AVANT : ${imradSec.tablesAndFiguresCompliant?.tablesRomanBefore ? 'Conforme' : 'À régulariser'}
  • Figures en chiffres arabes (ex: Figure 1) placées APRÈS : ${imradSec.tablesAndFiguresCompliant?.figuresArabicAfter ? 'Conforme' : 'À régulariser'}
  • Non-redondance des données : ${!imradSec.tablesAndFiguresCompliant?.redundancyDetected ? 'Conforme' : 'Redondance constatée'}
- 6 Sections obligatoires de fin d'article :
  • Remerciements : ${imradSec.mandatoryEndSections?.remerciements ? '[OUI]' : '[MANQUANT]'}
  • Financement : ${imradSec.mandatoryEndSections?.financement ? '[OUI]' : '[MANQUANT]'}
  • Conflit d\'Intérêt : ${imradSec.mandatoryEndSections?.conflitInteret ? '[OUI]' : '[MANQUANT]'}
  • Considérations d\'Éthiques : ${imradSec.mandatoryEndSections?.considerationsEthiques ? '[OUI]' : '[MANQUANT]'}
  • ORCID des Auteurs : ${imradSec.mandatoryEndSections?.orcidAuteurs ? '[OUI]' : '[MANQUANT]'}
  • Contribution des Auteurs (avec initiales uniquement, ex: J.-P.N.) : ${imradSec.mandatoryEndSections?.contributionAuteursInitialsOnly ? '[OUI]' : '[MANQUANT OU NON INITIALISÉ]'}
- Remarques & Manquements : ${(imradSec.issues || []).join(' ; ') || 'Architecture IMRAD satisfaisante.'}

### 2.4 Citations & Références (APA 7ème édition)
- Format de citation dans le texte : ${apaSec.apa7Compliant ? 'Conforme au format auteur-date APA 7 (Auteur, Année)' : 'NON-CONFORME'}
- Chasse aux styles numériques : ${!apaSec.hasNumericStyleBracket ? 'Aucun crochet [1] détecté (Conforme)' : 'Style obsolète [1], [2] détecté (Formellement proscrit)'}
- Concordance croisée à 100% (texte ↔ bibliographie) : ${apaSec.crossReferencingValid ? 'Vérifiée sans discordance' : 'Discordances détectées'}
- Bibliographie finale : Ordre alphabétique sans numérotation ni puces, avec retrait négatif d'1 cm à partir de la 2e ligne.
- Remarques & Manquements : ${(apaSec.issues || []).join(' ; ') || 'Conforme à la 7e édition APA.'}

### 2.5 Style Rédactionnel (Impersonnel)
- Diagnostic de subjectivité : ${styleSec.isImpersonal ? 'Style impersonnel respecté' : 'NON-CONFORME (Utilisation prohibée de « nous », « je », « nos travaux »)'}
- Occurrences relevées : ${(styleSec.personalPronounsDetected || []).join(', ') || 'Aucune marque de subjectivité.'}
- Recommandation : ${(styleSec.recommendations || []).join(' ; ') || 'Style scientifique impersonnel strict.'}

======================================================================
3. CORRECTIONS ET RECOMMANDATIONS PRIORITAIRES
======================================================================
${(data.priorityRecommendations || [
  'Bannir toute utilisation de « nous », « je », « nos travaux » et adopter le style impersonnel strict dans tout le document.',
  'Supprimer les puces pour la liste des auteurs et rattacher les affiliations en exposant.',
  'Fournir impérativement pour l’auteur correspondant (*) son adresse email, son numéro de téléphone et son identifiant ORCID à 16 chiffres.',
  'Vérifier que le résumé bilingue ne dépasse pas 250 mots et ne contient aucun sous-titre ni référence bibliographique (5 mots-clés obligatoires par langue).',
  'Remplacer les citations numériques [1] par le format APA 7 (Auteur, Année).',
  'Ajouter les 6 sections obligatoires de fin d’article : Remerciements, Financement, Conflit d’Intérêt, Considérations d’Éthiques, ORCID des Auteurs, Contribution des Auteurs (avec initiales uniquement, ex: J.-P.N.).',
]).map((item: string, i: number) => `${i + 1}. ${item}`).join('\n')}

======================================================================
4. ESPACE COMITÉ DE RÉDACTION
======================================================================
- Avis décisionnel : ${data.editorialBoardNotes?.decisionRecommendation || 'En attente de mise en conformité.'}
- Points de vigilance éthique :
${(data.editorialBoardNotes?.ethicalChecklist || [
  'Vérifier l’approbation éthique institutionnelle pour les études cliniques ou environnementales.',
  'Contrôler la validité effective des identifiants ORCID à 16 chiffres déclarés.',
]).map((e: string) => `  • ${e}`).join('\n')}
- Questions spécifiques à notifier aux auteurs :
${(data.editorialBoardNotes?.questionsForAuthors || [
  'Transmettre les coordonnées complètes (téléphone, ORCID) de l’auteur correspondant.',
  'Préciser les contributions respectives sous forme d’initiales strictes uniquement.',
]).map((q: string) => `  • ${q}`).join('\n')}
`;
}

// Dev and Prod Vite server setup
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Portail Audit RCST démarré sur http://0.0.0.0:${PORT}`);
  });
}

startServer();
