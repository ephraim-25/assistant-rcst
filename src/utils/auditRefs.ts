import { AuditReportData } from '../types/audit';

/**
 * AuditRef : une non-conformité numérotée liant un surlignage dans le manuscrit
 * à une explication dans le panneau central.
 */
export interface AuditRef {
  id: number;
  label: string;        // Titre court affiché dans le badge
  shortLabel: string;   // Titre ultra-court pour la puce dans le manuscrit
  description: string;  // Explication de la non-conformité
  auditSection: string; // Clé de la section du rapport d'audit
  severity: 'major' | 'minor';
  color: 'yellow' | 'red' | 'orange' | 'blue';
  pattern?: RegExp;     // Regex pour surligner dans le manuscrit (optionnel)
  modelSuggestion?: string; // Exemple de correction
}

/**
 * Construit la liste numérotée des non-conformités à partir du rapport d'audit.
 * Chaque entrée peut porter un pattern regex pour surligner le texte correspondant.
 */
export function buildAuditRefs(report: AuditReportData): AuditRef[] {
  const refs: AuditRef[] = [];
  let id = 1;
  const s = report.sections;

  // ── 1. TITRE ──────────────────────────────────────────────────────
  if (s.titleAndAuthors.hasSuperfluousQuotes) {
    refs.push({
      id: id++,
      label: 'Guillemets dans le titre',
      shortLabel: 'Guillemets',
      description: 'La Constitution RCST interdit formellement les guillemets (« », " ", " ") dans le titre.',
      auditSection: 'titleAndAuthors',
      severity: 'major',
      color: 'red',
      pattern: /[«»""]/g,
      modelSuggestion: 'Titre sans guillemets : Évaluation épidémiologique du paludisme chez les femmes enceintes...',
    });
  }

  if (!s.titleAndAuthors.isBilingualTitle) {
    refs.push({
      id: id++,
      label: 'Titre non bilingue',
      shortLabel: 'Titre EN manquant',
      description: 'Le titre doit être fourni en français ET en anglais (Constitution RCST §1).',
      auditSection: 'titleAndAuthors',
      severity: 'major',
      color: 'blue',
      modelSuggestion: 'Titre (FR) : Évaluation épidémiologique...\nTitle (EN) : Epidemiological evaluation...',
    });
  }

  // ── 2. AUTEURS & AFFILIATIONS ──────────────────────────────────────
  if (s.titleAndAuthors.hasBulletedAuthors) {
    refs.push({
      id: id++,
      label: 'Puces auteurs interdites',
      shortLabel: 'Puces interdites',
      description: 'Les puces (-, •, *) pour lister les auteurs sont formellement proscrites (Constitution RCST §2).',
      auditSection: 'titleAndAuthors',
      severity: 'major',
      color: 'red',
      pattern: /^[-•*]\s+\S/gm,
      modelSuggestion: 'Nom Prénom¹*, Co-Auteur², Troisième Auteur³\n¹ Université de Kinshasa\n² INRB',
    });
  }

  if (!s.titleAndAuthors.hasOrcid16Digits) {
    refs.push({
      id: id++,
      label: 'ORCID manquant',
      shortLabel: 'ORCID requis',
      description: 'Identifiant ORCID (format 0000-0000-0000-000X) obligatoire pour chaque auteur (Constitution RCST §2).',
      auditSection: 'titleAndAuthors',
      severity: 'major',
      color: 'orange',
      modelSuggestion: 'ORCID : 0000-0000-0000-0001 (format strict, 16 chiffres)',
    });
  }

  if (!s.titleAndAuthors.hasCorrespondingAsterisk) {
    refs.push({
      id: id++,
      label: 'Auteur correspondant non identifié',
      shortLabel: 'Astérisque (*) manquant',
      description: "L'auteur correspondant doit être désigné par un astérisque (*) en exposant, avec email et téléphone.",
      auditSection: 'titleAndAuthors',
      severity: 'minor',
      color: 'orange',
      modelSuggestion: 'Nom Prénom¹* — *Auteur correspondant : email@institution.cd | +243 XXX XXX XXX',
    });
  }

  // ── 3. RÉSUMÉ & MOTS-CLÉS ─────────────────────────────────────────
  if (s.abstractAndKeywords.hasForbiddenSubtitles) {
    refs.push({
      id: id++,
      label: 'Sous-titres dans le résumé',
      shortLabel: 'Sous-titres prohibés',
      description: 'Le résumé doit être un paragraphe unique et fluide. Interdiction formelle des sous-titres (Constitution RCST §3).',
      auditSection: 'abstractAndKeywords',
      severity: 'major',
      color: 'red',
      pattern: /\b(Objectif|M[eé]thode|R[eé]sultats|Conclusion)\s*:/gi,
      modelSuggestion: 'Rédiger un paragraphe continu de max 250 mots, sans structure Objectif/Méthode.',
    });
  }

  if (s.abstractAndKeywords.wordCountFr > 250) {
    refs.push({
      id: id++,
      label: `Résumé trop long (${s.abstractAndKeywords.wordCountFr} mots)`,
      shortLabel: 'Résumé > 250 mots',
      description: `Le résumé dépasse le plafond strict de 250 mots (actuel : ${s.abstractAndKeywords.wordCountFr} mots). Constitution RCST §3.`,
      auditSection: 'abstractAndKeywords',
      severity: 'major',
      color: 'orange',
      modelSuggestion: 'Condenser le résumé à maximum 250 mots par version (FR et EN).',
    });
  }

  if (!s.abstractAndKeywords.isBilingual) {
    refs.push({
      id: id++,
      label: 'Bilinguisme du résumé',
      shortLabel: 'Abstract EN absent',
      description: 'Un Abstract en anglais est obligatoire, suivi de 5 Keywords (Constitution RCST §3).',
      auditSection: 'abstractAndKeywords',
      severity: 'major',
      color: 'blue',
      modelSuggestion: 'Abstract: [English translation, max 250 words]\nKeywords: keyword1, keyword2, keyword3, keyword4, keyword5',
    });
  }

  if (s.abstractAndKeywords.hasReferences) {
    refs.push({
      id: id++,
      label: 'Références dans le résumé',
      shortLabel: 'Références interdites',
      description: 'Aucune référence bibliographique ne doit figurer dans le résumé (Constitution RCST §3).',
      auditSection: 'abstractAndKeywords',
      severity: 'major',
      color: 'red',
      pattern: /\(\w[\w\s]+,\s*\d{4}\)|\[\d+\]/g,
      modelSuggestion: 'Supprimer toute citation du résumé. Les références n\'apparaissent que dans le corps du texte.',
    });
  }

  // ── 4. STYLE ───────────────────────────────────────────────────────
  if (!s.style.isImpersonal) {
    refs.push({
      id: id++,
      label: 'Style subjectif prohibé',
      shortLabel: 'Pronoms personnels',
      description: `Style impersonnel obligatoire (Constitution RCST §5). ${s.style.personalPronounsDetected.length > 0 ? `Occurrences : "${s.style.personalPronounsDetected.slice(0, 4).join('", "')}"` : ''}`,
      auditSection: 'style',
      severity: 'major',
      color: 'yellow',
      pattern: /\b(nous\s+avons|nous\s+pensons|nous\s+concluons|nous\s+constatons|nous\s+observons|nous\s+avons\s+constat[ée]|nous\s+avons\s+analys[ée]|notre\s+[ée]tude|notre\s+[ée]quipe|nos\s+travaux|nos\s+r[ée]sultats|nos\s+donn[ée]es|nous\b|notre\b|nos\b|j['']ai\b|je\b)\b/gi,
      modelSuggestion: '"nous avons analysé" → "une analyse a été conduite"\n"nos résultats montrent" → "les résultats démontrent"\n"notre étude prouve" → "les données attestent"',
    });
  }

  // ── 5. CITATIONS ───────────────────────────────────────────────────
  if (s.citationsAndReferences.hasNumericStyleBracket) {
    refs.push({
      id: id++,
      label: 'Citations [n] prohibées',
      shortLabel: 'Format [N] interdit',
      description: 'Les citations numériques [1], [2] sont proscrites. APA 7 requis : (Auteur, Année) (Constitution RCST §6).',
      auditSection: 'citationsAndReferences',
      severity: 'major',
      color: 'orange',
      pattern: /\[\d+(?:[,;\s]+\d+)*\]/g,
      modelSuggestion: '[1] → (Mboma & Mabiala, 2020)\n[1, 2] → (Mboma & Mabiala, 2020 ; Mukendi, 2019)',
    });
  }

  if (!s.citationsAndReferences.apa7Compliant && !s.citationsAndReferences.hasNumericStyleBracket) {
    refs.push({
      id: id++,
      label: 'Format APA 7 non conforme',
      shortLabel: 'APA 7 requis',
      description: 'Les références bibliographiques ne respectent pas intégralement la norme APA 7e édition.',
      auditSection: 'citationsAndReferences',
      severity: 'minor',
      color: 'orange',
      modelSuggestion: 'Auteur, N. (Année). Titre de l\'article. Nom de la Revue, Volume(Numéro), pages. https://doi.org/...',
    });
  }

  // ── 6. STRUCTURE IMRAD ─────────────────────────────────────────────
  if (!s.imradAndStructure.hasArabicNumbering) {
    refs.push({
      id: id++,
      label: 'Numérotation en chiffres romains',
      shortLabel: 'Chiffres romains proscrits',
      description: 'Les sections doivent être numérotées en chiffres arabes, pas romains (Constitution RCST §4).',
      auditSection: 'imradAndStructure',
      severity: 'major',
      color: 'red',
      pattern: /^[IVX]+\.\s+\S/gm,
      modelSuggestion: '1. Introduction\n2. Matériels et méthodes\n3. Résultats\n4. Discussion\n5. Conclusion',
    });
  }

  if (s.imradAndStructure.hasSuperfluousSubtitlesInIntro) {
    refs.push({
      id: id++,
      label: 'Sous-titres dans l\'introduction',
      shortLabel: 'Sous-titres interdits',
      description: 'L\'Introduction ne doit comporter aucun sous-titre. Elle doit être rédigée en texte continu (Constitution RCST §4).',
      auditSection: 'imradAndStructure',
      severity: 'minor',
      color: 'red',
      modelSuggestion: 'Fusionner les sous-sections de l\'introduction en un texte continu de max 1 page ½.',
    });
  }

  if (!s.imradAndStructure.tablesAndFiguresCompliant.tablesRomanBefore) {
    refs.push({
      id: id++,
      label: 'Tableaux : format incorrect',
      shortLabel: 'Tableau mal numéroté',
      description: 'Les tableaux doivent être numérotés en chiffres ROMAINS (Tableau I, II...) et leur intitulé placé AVANT.',
      auditSection: 'imradAndStructure',
      severity: 'minor',
      color: 'orange',
      pattern: /Tableau\s+\d+/gi,
      modelSuggestion: 'Tableau I : Distribution des cas par tranche d\'âge\n[contenu du tableau]',
    });
  }

  // ── 7. SECTIONS FINALES ────────────────────────────────────────────
  const es = s.imradAndStructure.mandatoryEndSections;
  const missing: string[] = [];
  if (!es.remerciements) missing.push('Remerciements');
  if (!es.financement) missing.push('Financement');
  if (!es.conflitInteret) missing.push("Conflit d'Intérêt");
  if (!es.considerationsEthiques) missing.push("Considérations d'Éthiques");
  if (!es.orcidAuteurs) missing.push('ORCID des Auteurs');
  if (!es.contributionAuteursInitialsOnly) missing.push('Contribution des Auteurs');

  if (missing.length > 0) {
    refs.push({
      id: id++,
      label: 'Sections finales manquantes',
      shortLabel: `${missing.length} sections absentes`,
      description: `Sections obligatoires manquantes : ${missing.join(', ')}. Ces 6 sections sont imposées par la Constitution RCST (§4).`,
      auditSection: 'imradAndStructure',
      severity: missing.length >= 3 ? 'major' : 'minor',
      color: 'blue',
      modelSuggestion: missing.map(m =>
        m === 'Contribution des Auteurs'
          ? `${m} :\nJ.-P.I. a conçu l'étude ; M.M. a collecté les données ; A.T. a rédigé le manuscrit.`
          : `${m} : [insérer le contenu requis]`
      ).join('\n\n'),
    });
  }

  return refs;
}
