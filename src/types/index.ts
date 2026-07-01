export type ToolId = 'landing' | 'decision' | 'scam' | 'meeting' | 'history';
export type Level = 'low' | 'medium' | 'high';
export type AnalyzeSource = 'ai' | 'fallback';
export type AnalysisQuality = 'low' | 'medium' | 'high';

export interface DecisionInput {
  question: string;
  context: string;
  optionA: string;
  optionB: string;
  deadline: string;
  riskTolerance: Level;
  importance: Level;
}

export interface DecisionSituationInput {
  situation: string;
  additionalContext: string;
  optionA: string;
  optionB: string;
  deadline: string;
  riskTolerance: Level;
  importance: Level;
}

export interface DecisionOutput {
  summary: string;
  prosecutor: string[];
  defense: string[];
  witnesses: string[];
  verdictLabel: string;
  judge: string;
  riskScore: number;
  confidenceScore: number;
  riskDrivers: string[];
  confidenceDrivers: string[];
  bestNextAction: string;
  validation: string[];
  appealSummary?: string;
}

export interface DecisionQuality {
  level: 'Low' | 'Medium' | 'High';
  missing: string[];
  suggestions: string[];
}

export interface QuickDecisionParse {
  input: DecisionInput;
  contextSummary: string;
  quality: DecisionQuality;
}

export interface DecisionAiResult {
  summary: string;
  decisionQuestion: string;
  contextSummary: string;
  optionA: string;
  optionB: string;
  prosecutor: string[];
  defense: string[];
  witnesses: string[];
  hiddenAssumptions: string[];
  missingInformation: string[];
  verdict: string;
  riskScore: number;
  confidenceScore: number;
  bestNextAction: string;
  analysisQuality: AnalysisQuality;
  inferredInputs: {
    deadline: string;
    riskTolerance: string;
    importance: string;
    stakes: string[];
  };
}

export interface ScamInput {
  message: string;
  channel: 'SMS' | 'email' | 'social media' | 'marketplace' | 'job offer' | 'other';
  sender?: string;
  visibleDomain?: string;
  claimedOrganization?: string;
}

export interface ScamSignal {
  label: string;
  severity: number;
  matches: string[];
}

export interface ScamOutput {
  summary: string;
  riskScore: number;
  signals: ScamSignal[];
  highlightedPhrases: string[];
  explanation: string;
  safeResponse: string;
  checklist: string[];
  validation: string[];
}

export interface ScamAiSignal {
  label: string;
  evidence: string[];
  severity: number;
}

export interface ScamAiResult {
  summary: string;
  riskScore: number;
  riskLevel: 'low' | 'medium' | 'high' | 'critical';
  confidence: AnalysisQuality;
  likelyLegitimateSignals: string[];
  suspiciousSignals: ScamAiSignal[];
  highlightPhrases: string[];
  plainLanguageReadout: string;
  safeResponse: string;
  verificationSteps: string[];
  checklist: string[];
  defensiveOnly: true;
}

export interface MeetingInput {
  notes: string;
  attendees: string;
  goal: string;
}

export interface ActionItem {
  text: string;
  owner: string;
  due?: string;
}

export interface MeetingAiActionItem {
  owner: string;
  task: string;
  due: string;
}

export interface MeetingOutput {
  summary: string;
  decisions: string[];
  actionItems: ActionItem[];
  unresolvedQuestions: string[];
  vagueStatements: string[];
  followUpEmail: string;
  nextAgenda: string[];
  validation: string[];
}

export interface MeetingAiResult {
  summary: string;
  decisions: string[];
  actionItems: MeetingAiActionItem[];
  unresolvedQuestions: string[];
  vagueStatements: string[];
  followUpEmail: string;
  nextAgenda: string[];
  extractionQuality: AnalysisQuality;
}

export type AnalyzeRequest =
  | { tool: 'decisionCourt'; input: DecisionSituationInput; preScan?: object }
  | { tool: 'scamLens'; input: ScamInput; preScan?: object }
  | { tool: 'meetingRealityCheck'; input: MeetingInput; preScan?: object };

export type AnalyzeResult =
  | DecisionAiResult
  | ScamAiResult
  | MeetingAiResult;

export interface AnalyzeResponse {
  ok: boolean;
  source?: AnalyzeSource;
  tool?: AnalyzeRequest['tool'];
  result?: AnalyzeResult;
  error?: string;
}

export interface HistoryItem {
  id: string;
  tool: 'Decision Court' | 'ScamLens' | 'MeetingRealityCheck';
  title: string;
  createdAt: string;
  metricLabel?: string;
  metricValue?: number;
  exportText: string;
}
