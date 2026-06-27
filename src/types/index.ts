export type ToolId = 'landing' | 'decision' | 'scam' | 'meeting' | 'history';
export type Level = 'low' | 'medium' | 'high';

export interface DecisionInput {
  question: string;
  context: string;
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

export interface ScamInput {
  message: string;
  channel: 'SMS' | 'email' | 'social media' | 'marketplace' | 'job offer' | 'other';
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

export interface HistoryItem {
  id: string;
  tool: 'Decision Court' | 'ScamLens' | 'MeetingRealityCheck';
  title: string;
  createdAt: string;
  metricLabel?: string;
  metricValue?: number;
  exportText: string;
}
