import { DecisionInput, DecisionOutput } from '../types';
import { clamp, daysUntil, levelWeight } from './scoring';

const words = (value: string) => value.trim().split(/\s+/).filter(Boolean);
const isThin = (value: string, minWords: number) => words(value).length < minWords;

const extractThemes = (text: string) => {
  const candidates = text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 4 && !['should', 'would', 'could', 'about', 'there', 'their', 'which', 'because', 'before', 'after'].includes(word));
  return Array.from(new Set(candidates)).slice(0, 5);
};

const optionName = (value: string, fallback: string) => value.trim() || fallback;

export const validateDecision = (input: DecisionInput) => {
  const issues: string[] = [];
  if (!input.question.trim()) issues.push('Add the decision question.');
  if (isThin(input.context, 10)) issues.push('Add at least a few sentences of context.');
  if (!input.optionA.trim()) issues.push('Define Option A.');
  if (!input.optionB.trim()) issues.push('Define Option B.');
  if (input.optionA.trim() && input.optionA.trim().toLowerCase() === input.optionB.trim().toLowerCase()) issues.push('Option A and Option B should be meaningfully different.');
  if (!input.deadline) issues.push('Add a deadline or decision checkpoint.');
  return issues;
};

export const analyzeDecision = (input: DecisionInput, appealEvidence = ''): DecisionOutput => {
  const deadlineDays = daysUntil(input.deadline);
  const themes = extractThemes(`${input.question} ${input.context} ${input.optionA} ${input.optionB}`);
  const optionA = optionName(input.optionA, 'Option A');
  const optionB = optionName(input.optionB, 'Option B');
  const validation = validateDecision(input);
  const missing: string[] = [];

  if (isThin(input.context, 18)) missing.push('The record is thin: context does not yet show constraints, stakeholders, costs, or reversibility.');
  if (isThin(input.optionA, 3)) missing.push(`${optionA} needs a clearer scope, owner, or success condition.`);
  if (isThin(input.optionB, 3)) missing.push(`${optionB} needs a clearer scope, owner, or success condition.`);
  if (!input.deadline) missing.push('No deadline is set, so the cost of waiting is invisible.');
  if (!themes.length) missing.push('The prompt has too few concrete nouns to infer the main pressure points.');

  const riskDrivers: string[] = [];
  let risk = levelWeight(input.importance) + (input.riskTolerance === 'low' ? 24 : input.riskTolerance === 'medium' ? 12 : 4);
  riskDrivers.push(`${input.importance} importance sets a high consequence baseline`);
  if (input.riskTolerance === 'low') riskDrivers.push('low risk tolerance raises the bar for evidence');
  if (deadlineDays !== null && deadlineDays <= 7) {
    risk += 24;
    riskDrivers.push(`deadline is close (${deadlineDays} day${deadlineDays === 1 ? '' : 's'})`);
  }
  if (deadlineDays !== null && deadlineDays < 0) {
    risk += 18;
    riskDrivers.push('deadline has already passed');
  }
  if (isThin(input.context, 18)) {
    risk += 16;
    riskDrivers.push('context is too short for a confident read');
  }
  if (/manual|limited|blocked|legal|budget|security|support|capacity|risk|unknown/i.test(input.context)) {
    risk += 10;
    riskDrivers.push('context mentions operational or approval constraints');
  }
  risk += missing.length * 6;

  const confidenceDrivers: string[] = [];
  let confidence = 86 - missing.length * 10;
  if (isThin(input.context, 30)) {
    confidence -= 10;
    confidenceDrivers.push('context lacks enough detail for a strong verdict');
  } else {
    confidenceDrivers.push('context includes enough material to compare tradeoffs');
  }
  if (optionA.toLowerCase() === optionB.toLowerCase()) {
    confidence -= 24;
    confidenceDrivers.push('options currently overlap');
  }
  if (themes.length >= 3) confidenceDrivers.push(`clear pressure points: ${themes.slice(0, 3).join(', ')}`);
  if (appealEvidence.trim().length > 60) {
    confidence += 8;
    confidenceDrivers.push('appeal evidence adds useful new context');
  }

  const riskScore = clamp(risk);
  const confidenceScore = clamp(confidence);
  const deadlineText = deadlineDays === null ? 'without a defined deadline' : deadlineDays < 0 ? 'after the stated deadline' : `with ${deadlineDays} day${deadlineDays === 1 ? '' : 's'} left`;
  const reversible = /test|pilot|beta|trial|prototype|small|limited|bounded/i.test(`${optionA} ${optionB} ${input.context}`);
  const verdictLabel = riskScore >= 78 ? 'Pause for evidence' : riskScore >= 55 ? 'Proceed with guardrails' : 'Proceed deliberately';
  const preferredOption = input.riskTolerance === 'low' || riskScore >= 70 ? optionB : optionA;

  const appealSummary = appealEvidence.trim()
    ? `Appeal entered: the new evidence emphasizes "${appealEvidence.trim().slice(0, 120)}${appealEvidence.trim().length > 120 ? '...' : ''}". Verdict now puts more weight on whether the evidence changes reversibility, timing, or downside exposure.`
    : undefined;

  return {
    summary: validation.length
      ? `Input is incomplete. The court can draft a provisional verdict, but ${validation.length} item${validation.length === 1 ? '' : 's'} need attention.`
      : `${verdictLabel}: ${optionA} vs ${optionB}, judged ${deadlineText} with ${input.importance} importance.`,
    prosecutor: [
      `The case against ${optionA} is that the decision is being forced ${deadlineText}, while the record points to ${themes.slice(0, 3).join(', ') || 'unclear operating constraints'}.`,
      `The most dangerous assumption is that the downside is manageable. ${missing[0] ?? 'The prompt does not prove cost, ownership, and reversibility are already controlled.'}`,
      `${optionA} can be the wrong move if it creates support, budget, trust, or execution debt that ${optionB} would avoid.`,
    ],
    defense: [
      `${optionA} has merit because a concrete move can create evidence faster than continued analysis, especially when the decision is ${input.importance} importance.`,
      `${optionB} is safer only if the delay produces specific new information rather than a cleaner-looking postponement.`,
      reversible ? 'Because the situation includes a test/pilot/bounded path, the defense can argue for a limited commitment instead of a binary leap.' : 'The defense needs a narrower first move to avoid treating a strategic choice as an all-in bet.',
    ],
    witnesses: missing.length ? missing : [
      `What would make ${optionA} obviously wrong within two weeks?`,
      `What would make ${optionB} clearly too slow or too cautious?`,
      `Who owns the decision after ${input.deadline || 'the checkpoint'}, and what metric proves it worked?`,
    ],
    verdictLabel,
    judge: riskScore > 72
      ? `Verdict: do not make a final commitment yet. Run a narrow evidence-gathering step before choosing between ${optionA} and ${optionB}.`
      : `Verdict: move toward ${preferredOption}, but make it bounded, measurable, and reversible before the deadline.`,
    riskScore,
    confidenceScore,
    riskDrivers,
    confidenceDrivers,
    bestNextAction: `Before ${input.deadline || 'the next checkpoint'}, verify the one fact that would make ${preferredOption} unsafe and assign a named owner for that check.`,
    validation,
    appealSummary,
  };
};

export const formatDecisionExport = (input: DecisionInput, output: DecisionOutput) => [
  `Decision Court: ${input.question}`,
  '',
  output.summary,
  `Risk score: ${output.riskScore}`,
  `Confidence score: ${output.confidenceScore}`,
  '',
  'Risk drivers',
  ...output.riskDrivers.map((item) => `- ${item}`),
  '',
  'Prosecutor',
  ...output.prosecutor.map((item) => `- ${item}`),
  '',
  'Defense',
  ...output.defense.map((item) => `- ${item}`),
  '',
  'Witnesses',
  ...output.witnesses.map((item) => `- ${item}`),
  '',
  `Judge: ${output.judge}`,
  `Best next action: ${output.bestNextAction}`,
  output.appealSummary ? `Appeal: ${output.appealSummary}` : '',
].filter(Boolean).join('\n');
