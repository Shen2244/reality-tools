import { DecisionAiResult, DecisionInput, DecisionOutput, DecisionSituationInput, QuickDecisionParse } from '../types';
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
const sentenceSplit = (value: string) => value.match(/[^.!?]+[.!?]?/g)?.map((item) => item.trim()).filter(Boolean) ?? [];
const hasAny = (value: string, terms: RegExp[]) => terms.some((term) => term.test(value));

const urgentTerms = [/\btonight\b/i, /\btoday\b/i, /\bnow\b/i, /\bimmediately\b/i, /\burgent\b/i, /\bdeadline\b/i, /\bonly today\b/i, /\blimited time\b/i];
const highImportanceTerms = [/\$\s?\d[\d,]*(?:\.\d{2})?\b/i, /\bpayment\b/i, /\birreversible\b/i, /\bcontract\b/i, /\bjob\b/i, /\bschool\b/i, /\bcar\b/i, /\blease\b/i, /\bmedical\b/i, /\baccount\b/i, /\bpassword\b/i, /\bverification code\b/i, /\bseller pressure\b/i, /\blegal\b/i];
const lowToleranceTerms = [/\bpressure\b/i, /\bpayment\b/i, /\bseller pressure\b/i, /\bunknowns?\b/i, /\bnot inspected\b/i, /\bnot sure\b/i, /\bunclear\b/i, /\bdon't know\b/i, /\birreversible\b/i, /\bwire transfer\b/i, /\bzelle\b/i, /\bcrypto\b/i, /\bgift card\b/i];
const quickRiskTerms = [/\btonight\b/i, /\btoday\b/i, /\bnow\b/i, /\burgent\b/i, /\blimited time\b/i, /\bwaiting\b/i, /\bthree other buyers\b/i, /\bseller wants\b/i, /\bzelle\b/i, /\bwire\b/i, /\bcrypto\b/i, /\bgift card\b/i, /\bnot inspected\b/i, /\bwithout seeing\b/i, /\bno refund\b/i];
const confidenceWeakTerms = [/\bnot inspected\b/i, /\bnot sure\b/i, /\bunclear\b/i, /\bdon't know\b/i, /\bmaybe\b/i, /\bno details\b/i, /\bunknown\b/i];

const detectedRiskDrivers = (text: string) => {
  const drivers: string[] = [];
  if (/\bzelle\b|\bwire\b|\bcrypto\b|\bgift card\b/i.test(text)) drivers.push('irreversible payment method');
  if (/\bnot inspected\b|\bwithout seeing\b/i.test(text)) drivers.push('commitment before inspection');
  if (/\btonight\b|\btoday\b|\bnow\b|\burgent\b|\blimited time\b/i.test(text)) drivers.push('artificial urgency');
  if (/\bthree other buyers\b|\bwaiting\b|\bpressure\b|\bseller wants\b/i.test(text)) drivers.push('seller or counterparty pressure');
  if (/\bno refund\b|\birreversible\b|\bcontract\b|\blegal\b/i.test(text)) drivers.push('hard-to-reverse consequence');
  return drivers;
};

export const parseQuickDecision = (raw: string): QuickDecisionParse => {
  const text = raw.trim();
  const sentences = sentenceSplit(text);
  const questionSentence = sentences.find((sentence) => sentence.includes('?'));
  const firstSentence = sentences[0] ?? '';
  const dateMatch = text.match(/\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}|tomorrow|next\s+(?:monday|tuesday|wednesday|thursday|friday|saturday|sunday)|(?:jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[a-z]*\s+\d{1,2})\b/i);
  const deadline = hasAny(text, urgentTerms) ? 'urgent/today' : dateMatch?.[0] ?? 'No hard deadline detected.';
  const missing: string[] = [];
  const suggestions: string[] = [];
  const hasCost = /\$\s?\d|\b\d+[,.\d]*\s?(dollars|usd)\b/i.test(text);
  const hasDeadline = deadline !== 'No hard deadline detected.';
  const hasReversibility = /\birreversible\b|\brefund\b|\bcancel\b|\bcontract\b|\bdeposit\b|\binspect/i.test(text);
  const hasClearOptions = /\bor\b|\bversus\b|\bvs\b|\boption\b|\baccept\b|\bdelay\b|\bproceed\b/i.test(text);

  if (words(text).length < 18) missing.push('More context about stakes and constraints.');
  if (!hasCost) missing.push('Cost or consequence size.');
  if (!hasDeadline) missing.push('Deadline or decision checkpoint.');
  if (!hasReversibility) missing.push('Whether the decision can be reversed.');
  if (!hasClearOptions) missing.push('A clear alternative to compare against.');
  if (missing.includes('Cost or consequence size.')) suggestions.push('Add the dollar amount, time cost, or reputational downside.');
  if (missing.includes('Deadline or decision checkpoint.')) suggestions.push('Add when the decision truly expires.');
  if (missing.includes('Whether the decision can be reversed.')) suggestions.push('Add refund, cancellation, inspection, or contract terms.');
  if (missing.includes('A clear alternative to compare against.')) suggestions.push('Name the realistic delay or fallback option.');

  const level = words(text).length < 12 || missing.length >= 4 ? 'Low' : missing.length >= 2 ? 'Medium' : 'High';

  return {
    input: {
      question: questionSentence ?? (firstSentence ? 'Should I proceed with this decision?' : ''),
      context: text,
      optionA: 'Proceed with the risky action now.',
      optionB: 'Delay the decision and gather more evidence before committing.',
      deadline,
      riskTolerance: hasAny(text, lowToleranceTerms) ? 'low' : 'medium',
      importance: hasAny(text, highImportanceTerms) ? 'high' : 'medium',
    },
    contextSummary: firstSentence ? `${firstSentence.replace(/[.!?]$/, '')}${sentences.length > 1 ? ` (+${sentences.length - 1} more detail${sentences.length === 2 ? '' : 's'})` : ''}` : 'No context detected yet.',
    quality: {
      level,
      missing: missing.length ? missing : ['No obvious missing fields.'],
      suggestions: suggestions.length ? suggestions : ['Add the one fact that would change your mind to make the verdict sharper.'],
    },
  };
};

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

export const decisionSituationToInput = (input: DecisionSituationInput): DecisionInput => {
  const quick = parseQuickDecision(input.situation);
  return {
    ...quick.input,
    context: [quick.input.context, input.additionalContext].filter(Boolean).join('\n\n'),
    optionA: input.optionA.trim() || quick.input.optionA,
    optionB: input.optionB.trim() || quick.input.optionB,
    deadline: input.deadline.trim() || quick.input.deadline,
    riskTolerance: quick.input.riskTolerance === 'low' ? 'low' : input.riskTolerance || quick.input.riskTolerance,
    importance: quick.input.importance === 'high' ? 'high' : input.importance || quick.input.importance,
  };
};

export const analyzeDecision = (input: DecisionInput, appealEvidence = ''): DecisionOutput => {
  const deadlineDays = daysUntil(input.deadline);
  const combinedText = `${input.question} ${input.context} ${input.optionA} ${input.optionB} ${input.deadline}`;
  const urgentDeadline = input.deadline !== 'No hard deadline detected.' && hasAny(combinedText, urgentTerms);
  const themes = extractThemes(`${input.question} ${input.context} ${input.optionA} ${input.optionB}`);
  const optionA = optionName(input.optionA, 'Option A');
  const optionB = optionName(input.optionB, 'Option B');
  const validation = validateDecision(input);
  const missing: string[] = [];

  if (isThin(input.context, 18)) missing.push('The record is thin: context does not yet show constraints, stakeholders, costs, or reversibility.');
  if (isThin(input.optionA, 3)) missing.push(`${optionA} needs a clearer scope, owner, or success condition.`);
  if (isThin(input.optionB, 3)) missing.push(`${optionB} needs a clearer scope, owner, or success condition.`);
  if (!input.deadline || input.deadline === 'No hard deadline detected.') missing.push('No deadline is set, so the cost of waiting is invisible.');
  if (!themes.length) missing.push('The prompt has too few concrete nouns to infer the main pressure points.');

  const riskDrivers: string[] = [];
  let risk = levelWeight(input.importance) + (input.riskTolerance === 'low' ? 24 : input.riskTolerance === 'medium' ? 12 : 4);
  riskDrivers.push(`${input.importance} importance sets a high consequence baseline`);
  if (input.riskTolerance === 'low') riskDrivers.push('low risk tolerance raises the bar for evidence');
  if ((deadlineDays !== null && deadlineDays <= 7) || urgentDeadline) {
    risk += 24;
    riskDrivers.push(urgentDeadline ? 'deadline language signals urgency today' : `deadline is close (${deadlineDays} day${deadlineDays === 1 ? '' : 's'})`);
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
  const naturalDrivers = detectedRiskDrivers(combinedText);
  if (naturalDrivers.length) {
    risk += naturalDrivers.length * 10;
    riskDrivers.push(...naturalDrivers);
  }
  const explicitRiskMatches = quickRiskTerms.filter((term) => term.test(combinedText)).length;
  if (explicitRiskMatches) risk += explicitRiskMatches * 5;
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
  const weakConfidenceMatches = confidenceWeakTerms.filter((term) => term.test(combinedText)).length;
  if (weakConfidenceMatches) {
    confidence -= weakConfidenceMatches * 8;
    confidenceDrivers.push('confidence drops because key facts are unknown or unverified');
  }
  if (appealEvidence.trim().length > 60) {
    confidence += 8;
    confidenceDrivers.push('appeal evidence adds useful new context');
  }

  const riskScore = clamp(risk);
  const confidenceScore = clamp(confidence);
  const deadlineText = urgentDeadline ? 'under urgent timing pressure' : deadlineDays === null ? 'without a defined deadline' : deadlineDays < 0 ? 'after the stated deadline' : `with ${deadlineDays} day${deadlineDays === 1 ? '' : 's'} left`;
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

export const analyzeDecisionFallback = (rawInput: DecisionSituationInput): DecisionAiResult => {
  const parsed = parseQuickDecision(rawInput.situation);
  const input = decisionSituationToInput(rawInput);
  const output = analyzeDecision(input);
  const missingInformation = [
    ...parsed.quality.missing.filter((item) => item !== 'No obvious missing fields.'),
    ...output.witnesses.filter((item) => !item.startsWith('What would')),
  ];
  const stakes = [
    ...detectedRiskDrivers(`${rawInput.situation} ${rawInput.additionalContext}`),
    input.importance === 'high' ? 'high consequence decision' : '',
  ].filter(Boolean);
  const carPressure = /\bcar\b/i.test(rawInput.situation) && /\bzelle|waiting|tonight|seller/i.test(rawInput.situation);
  const classDrop = /\bdrop this class\b|\bdrop.*class\b/i.test(rawInput.situation);
  const bestNextAction = carPressure
    ? 'Do not pay tonight. Inspect the car in person, verify title and seller identity, use a safer payment path, and refuse time pressure before committing.'
    : classDrop
      ? 'Check the drop deadline, current grade, graduation impact, financial aid or visa consequences, then ask an advisor before dropping.'
      : output.bestNextAction;

  return {
    summary: output.summary,
    decisionQuestion: input.question,
    contextSummary: parsed.contextSummary,
    optionA: input.optionA,
    optionB: input.optionB,
    prosecutor: output.prosecutor,
    defense: output.defense,
    witnesses: output.witnesses,
    hiddenAssumptions: [
      'The visible pressure is real rather than manufactured.',
      'The downside can be repaired if the decision goes badly.',
      'Waiting will not reveal material new information.',
    ],
    missingInformation: classDrop
      ? ['Current grade.', 'Drop deadline.', 'Graduation impact.', 'Financial aid, visa, or transcript consequences.', 'Whether tutoring, pass/fail, or withdrawal is available.']
      : missingInformation.length ? Array.from(new Set(missingInformation)) : ['No major missing information detected from the current text.'],
    verdict: output.judge,
    riskScore: output.riskScore,
    confidenceScore: output.confidenceScore,
    bestNextAction,
    analysisQuality: parsed.quality.level.toLowerCase() as DecisionAiResult['analysisQuality'],
    inferredInputs: {
      deadline: input.deadline || 'No hard deadline detected.',
      riskTolerance: input.riskTolerance,
      importance: input.importance,
      stakes: stakes.length ? Array.from(new Set(stakes)) : ['stakes not clearly stated'],
    },
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

export const formatDecisionAiExport = (input: DecisionSituationInput, output: DecisionAiResult, source: string) => [
  `Decision Court (${source}): ${output.decisionQuestion}`,
  '',
  input.situation,
  '',
  output.summary,
  `Risk score: ${output.riskScore}`,
  `Confidence score: ${output.confidenceScore}`,
  `Analysis quality: ${output.analysisQuality}`,
  '',
  'Inferred inputs',
  `- Option A: ${output.optionA}`,
  `- Option B: ${output.optionB}`,
  `- Deadline: ${output.inferredInputs.deadline}`,
  `- Risk tolerance: ${output.inferredInputs.riskTolerance}`,
  `- Importance: ${output.inferredInputs.importance}`,
  ...output.inferredInputs.stakes.map((item) => `- Stake: ${item}`),
  '',
  'Prosecutor',
  ...output.prosecutor.map((item) => `- ${item}`),
  '',
  'Defense',
  ...output.defense.map((item) => `- ${item}`),
  '',
  'Hidden assumptions',
  ...output.hiddenAssumptions.map((item) => `- ${item}`),
  '',
  'Missing information',
  ...output.missingInformation.map((item) => `- ${item}`),
  '',
  `Verdict: ${output.verdict}`,
  `Best next action: ${output.bestNextAction}`,
].join('\n');
