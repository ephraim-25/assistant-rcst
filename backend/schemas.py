from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TitleAndAuthorsAudit(BaseModel):
    score: int = 100
    status: str = "Conforme"
    isBilingualTitle: bool = True
    hasSuperfluousQuotes: bool = False
    hasBulletedAuthors: bool = False
    hasSuperscriptAffiliations: bool = True
    hasCorrespondingAsterisk: bool = True
    hasEmails: bool = True
    hasPhone: bool = True
    hasOrcid16Digits: bool = True
    issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class AbstractAndKeywordsAudit(BaseModel):
    score: int = 100
    status: str = "Conforme"
    wordCountFr: int = 0
    wordCountEn: int = 0
    isBilingual: bool = True
    hasForbiddenSubtitles: bool = False
    hasReferences: bool = False
    keywordsCountFr: int = 5
    keywordsCountEn: int = 5
    issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class TablesAndFiguresInfo(BaseModel):
    tablesRomanBefore: bool = True
    figuresArabicAfter: bool = True
    redundancyDetected: bool = False
    notes: Optional[str] = ""

class MandatoryEndSectionsInfo(BaseModel):
    remerciements: bool = True
    financement: bool = True
    conflitInteret: bool = True
    considerationsEthiques: bool = True
    orcidAuteurs: bool = True
    contributionAuteursInitialsOnly: bool = True

class ImradAudit(BaseModel):
    score: int = 100
    status: str = "Conforme"
    hasArabicNumbering: bool = True
    hasSuperfluousSubtitlesInIntro: bool = False
    introLengthCompliant: bool = True
    tablesAndFiguresCompliant: TablesAndFiguresInfo = Field(default_factory=TablesAndFiguresInfo)
    mandatoryEndSections: MandatoryEndSectionsInfo = Field(default_factory=MandatoryEndSectionsInfo)
    issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class FlaggedCitation(BaseModel):
    raw: str
    error: str
    correctedApa7: str

class CitationsAudit(BaseModel):
    score: int = 100
    status: str = "Conforme"
    apa7Compliant: bool = True
    hasNumericStyleBracket: bool = False
    crossReferencingValid: bool = True
    hangingIndentCompliant: bool = True
    alphabeticalOrderCompliant: bool = True
    missingFromBibliography: List[str] = Field(default_factory=list)
    missingFromText: List[str] = Field(default_factory=list)
    flaggedCitations: List[FlaggedCitation] = Field(default_factory=list)
    issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class SampleReformulation(BaseModel):
    original: str
    corrected: str

class StyleAudit(BaseModel):
    score: int = 100
    status: str = "Conforme"
    isImpersonal: bool = True
    personalPronounsDetected: List[str] = Field(default_factory=list)
    sampleReformulations: List[SampleReformulation] = Field(default_factory=list)
    issues: List[str] = Field(default_factory=list)
    recommendations: List[str] = Field(default_factory=list)

class SectionsContainer(BaseModel):
    titleAndAuthors: TitleAndAuthorsAudit
    abstractAndKeywords: AbstractAndKeywordsAudit
    imradAndStructure: ImradAudit
    citationsAndReferences: CitationsAudit
    style: StyleAudit

class EditorialNotes(BaseModel):
    decisionRecommendation: str
    confidentialComments: Optional[str] = ""
    ethicalChecklist: List[str] = Field(default_factory=list)
    questionsForAuthors: List[str] = Field(default_factory=list)

class AuditResponse(BaseModel):
    status: str  # "Conforme" | "Conforme avec réserves" | "Refusé - Modifications majeures requises"
    globalScore: int
    summary: str
    sections: SectionsContainer
    priorityRecommendations: List[str] = Field(default_factory=list)
    editorialBoardNotes: EditorialNotes
    isAiGenerated: bool = True
    rawAuditMarkdown: Optional[str] = None

class AuditRequest(BaseModel):
    manuscriptText: str
    sourceFilename: Optional[str] = "manuscrit"

class TextExtractionResponse(BaseModel):
    text: str
    filename: str
    extension: str
    sizeBytes: int
    wordCount: int
    message: str
