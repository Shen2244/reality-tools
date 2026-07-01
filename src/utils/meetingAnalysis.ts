import { ActionItem, MeetingAiResult, MeetingInput, MeetingOutput } from '../types';

export const splitMeetingSentences = (text: string) => text
  .split(/[\n.;?!]+/)
  .map((line) => line.trim().replace(/^[-*]\s*/, ''))
  .filter(Boolean);

const attendeeNames = (attendees: string) => attendees.split(/,|\n/).map((name) => name.trim()).filter(Boolean);

const ownerFrom = (line: string, attendees: string): string => {
  const names = attendeeNames(attendees);
  const explicit = line.match(/\bowner[:\s-]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (explicit) return explicit[1];
  const named = line.match(/\b([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\b/);
  const inferred = named?.[1];
  if (inferred && /^(Need|Do|Does|Did|Which|What|When|Where|Why|How|Budget)$/i.test(inferred)) return 'Unassigned';
  return names.find((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line)) ?? inferred ?? 'Unassigned';
};

const dueFrom = (line: string) => {
  const match = line.match(/\b(by|due|before)\s+([A-Z]?[a-z]+day|tomorrow|EOD|end of day|next week|next month|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i);
  return match?.[2];
};

const sentenceCase = (value: string) => {
  const trimmed = value.trim().replace(/\s+/g, ' ');
  if (!trimmed) return trimmed;
  const withCapital = `${trimmed[0].toUpperCase()}${trimmed.slice(1)}`;
  return /[.!?]$/.test(withCapital) ? withCapital : `${withCapital}.`;
};

const cleanDecision = (line: string) => sentenceCase(line
  .replace(/^we\s+agreed\s+to\s+/i, '')
  .replace(/^we\s+decided\s+to\s+/i, '')
  .replace(/^it\s+was\s+approved\s+that\s+/i, '')
  .replace(/^it\s+was\s+decided\s+that\s+/i, '')
  .replace(/^we\s+finalized\s+/i, '')
  .replace(/^we\s+confirmed\s+/i, '')
  .replace(/^approved:\s*/i, '')
  .replace(/^confirmed:\s*/i, '')
  .replace(/^finalized:\s*/i, ''));

const cleanUnresolved = (line: string) => sentenceCase(line
  .replace(/^need\s+to\s+confirm\s+/i, 'confirm ')
  .replace(/^need\s+to\s+decide\s+/i, 'decide ')
  .replace(/^tbd[:\s-]*/i, '')
  .replace(/^unclear[:\s-]*/i, '')
  .replace(/^need\s+clarification\s+(on\s+)?/i, 'clarify ')
  .replace(/^not\s+decided[:\s-]*/i, '')
  .replace(/^unresolved[:\s-]*/i, ''));

const cleanVague = (line: string) => sentenceCase(line.replace(/^we\s+should\s+/i, ''));

const actionFrom = (line: string, attendees: string): ActionItem | null => {
  const patterns = [
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+will\s+(.+?)(?:\s+by\s+(.+))?$/i,
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+needs\s+to\s+(.+?)(?:\s+by\s+(.+))?$/i,
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+to\s+(.+?)(?:\s+by\s+(.+))?$/i,
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+is\s+responsible\s+for\s+(.+?)(?:\s+by\s+(.+))?$/i,
    /^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+owns\s+(.+?)(?:\s+by\s+(.+))?$/i,
  ];
  const match = patterns.map((pattern) => line.match(pattern)).find(Boolean);
  if (match && !/^(Need|Do|Does|Did|Which|What|When|Where|Why|How)$/i.test(match[1])) {
    return { owner: match[1], text: match[2].trim(), due: (match[3] ?? dueFrom(line))?.trim() };
  }

  const unassignedNeed = line.match(/^need\s+to\s+(.+)$/i);
  if (unassignedNeed) return { owner: 'Unassigned', text: unassignedNeed[1].trim(), due: dueFrom(line) };

  const taskBeforeOwner = line.match(/^need\s+to\s+(.+?)\s+([A-Z][a-z]+)?\s*maybe\s+by\s+(.+)$/i);
  if (taskBeforeOwner) return { owner: taskBeforeOwner[2] ?? 'Unassigned', text: taskBeforeOwner[1].trim(), due: taskBeforeOwner[3].trim() };

  if (/\b(will|needs to|assigned|owner|deadline|due|follow up|send|draft|review|prepare|schedule|ship|publish|fix)\b/i.test(line)) {
    const owner = ownerFrom(line, attendees);
    const text = line
      .replace(new RegExp(`^${owner}\\s+`, 'i'), '')
      .replace(/\bmaybe\s+by\s+.+$/i, '')
      .trim();
    return { owner, text: text || line, due: dueFrom(line) };
  }
  return null;
};

export const validateMeetingInput = (input: MeetingInput) => {
  const issues: string[] = [];
  if (!input.notes.trim()) issues.push('Paste meeting notes first.');
  if (input.notes.trim() && splitMeetingSentences(input.notes).length < 2) issues.push('Notes are very short; extraction quality may be low.');
  return issues;
};

export const analyzeMeetingFallback = (input: MeetingInput): MeetingAiResult => {
  const lines = splitMeetingSentences(input.notes);
  const decisionPattern = /\b(agreed|decided|approved|finalized|confirmed|we will|greenlit|go with|selected)\b/i;
  const questionPattern = /\b(need to confirm|need to decide|tbd|unclear|waiting on|need clarification|not decided|unresolved|open question|blocked|unknown)\b/i;
  const vaguePattern = /\b(circle back|align|touch base|look into|sync later|soon|later|maybe|explore|think about|keep in mind|synergy|nice to have|figure out)\b/i;

  const decisions = lines.filter((line) => decisionPattern.test(line)).map(cleanDecision);
  const actionItems = lines
    .map((line, index) => {
      if (decisionPattern.test(line) || questionPattern.test(line) || vaguePattern.test(line)) return null;
      const action = actionFrom(line, input.attendees);
      const nextMaybe = lines[index + 1]?.match(/^([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)\s+maybe\s+by\s+(.+)$/i);
      if (action && action.owner === 'Unassigned' && nextMaybe) {
        return { owner: nextMaybe[1], text: action.text, due: nextMaybe[2] };
      }
      return action;
    })
    .filter((item): item is ActionItem => Boolean(item))
    .map((item) => ({ owner: item.owner, task: item.text, due: item.due ?? 'date needed' }));
  const unresolvedQuestions = lines.filter((line) => questionPattern.test(line)).map(cleanUnresolved);
  const vagueStatements = lines.filter((line) => vaguePattern.test(line)).map(cleanVague);
  const missingGoal = !input.goal.trim();
  const missingAttendees = !input.attendees.trim();
  const extractionQuality = lines.length < 3 || missingAttendees ? 'low' : decisions.length + actionItems.length + unresolvedQuestions.length >= 3 ? 'high' : 'medium';

  const decisionsForEmail = decisions.length ? decisions.map((item) => `- ${item}`).join('\n') : '- No explicit decisions were captured.';
  const actionsForEmail = actionItems.length
    ? actionItems.map((item) => `- ${item.owner}: ${item.task}${item.due !== 'date needed' ? ` by ${item.due}` : ' (date needed)'}.`).join('\n')
    : '- No accountable action items were captured.';
  const questionsForEmail = unresolvedQuestions.length ? unresolvedQuestions.map((item) => `- ${item}`).join('\n') : '- None captured.';
  const vagueForEmail = vagueStatements.length ? vagueStatements.map((item) => `- ${item}`).join('\n') : '- None captured.';
  const warnings = [missingGoal ? 'goal is missing' : '', missingAttendees ? 'attendees are missing' : ''].filter(Boolean);

  return {
    summary: warnings.length
      ? `Sentence extraction succeeded, but ${warnings.join(' and ')}.`
      : `${decisions.length} decision${decisions.length === 1 ? '' : 's'}, ${actionItems.length} action item${actionItems.length === 1 ? '' : 's'}, ${unresolvedQuestions.length} unresolved question${unresolvedQuestions.length === 1 ? '' : 's'}.`,
    decisions: decisions.length ? decisions : ['No explicit decisions detected.'],
    actionItems: actionItems.length ? actionItems : [{ owner: 'Unassigned', task: 'Assign the next concrete step.', due: 'date needed' }],
    unresolvedQuestions: unresolvedQuestions.length ? unresolvedQuestions : ['No unresolved questions detected.'],
    vagueStatements: vagueStatements.length ? vagueStatements : ['No vague statements detected.'],
    followUpEmail: `Subject: Follow-up: ${input.goal || 'Meeting recap'}\n\nHi ${input.attendees || 'team'},\n\nHere is the accountability recap from our meeting.\n\nDecisions:\n${decisionsForEmail}\n\nAction items:\n${actionsForEmail}\n\nOpen questions:\n${questionsForEmail}\n\nParking lot / vague items:\n${vagueForEmail}\n\nPlease reply with corrections, missing owners, or missing dates by end of day.\n`,
    nextAgenda: [
      `Confirm progress against goal: ${input.goal || 'current priority'}`,
      actionItems.some((item) => item.owner === 'Unassigned') ? 'Assign owners for unowned action items' : 'Review owners for all open action items',
      actionItems.some((item) => item.due === 'date needed') ? 'Add due dates to action items without deadlines' : 'Review deadlines and blockers',
      'Resolve unanswered questions',
      'Convert vague discussion into decisions or explicit parking-lot items',
    ],
    extractionQuality,
  };
};

export const analyzeMeeting = (input: MeetingInput): MeetingOutput => {
  const fallback = analyzeMeetingFallback(input);
  return {
    summary: fallback.summary,
    decisions: fallback.decisions,
    actionItems: fallback.actionItems.map((item) => ({ owner: item.owner, text: item.task, due: item.due === 'date needed' ? undefined : item.due })),
    unresolvedQuestions: fallback.unresolvedQuestions,
    vagueStatements: fallback.vagueStatements,
    followUpEmail: fallback.followUpEmail,
    nextAgenda: fallback.nextAgenda,
    validation: validateMeetingInput(input),
  };
};

export const formatMeetingAiExport = (input: MeetingInput, output: MeetingAiResult, source: string) => [
  `MeetingRealityCheck (${source}): ${input.goal || 'Meeting recap'}`,
  '',
  output.summary,
  `Extraction quality: ${output.extractionQuality}`,
  '',
  'Decisions',
  ...output.decisions.map((item) => `- ${item}`),
  '',
  'Action items',
  ...output.actionItems.map((item) => `- ${item.owner} (${item.due}): ${item.task}`),
  '',
  'Unresolved questions',
  ...output.unresolvedQuestions.map((item) => `- ${item}`),
  '',
  'Vague statements',
  ...output.vagueStatements.map((item) => `- ${item}`),
  '',
  'Follow-up email',
  output.followUpEmail,
  'Next agenda',
  ...output.nextAgenda.map((item) => `- ${item}`),
].join('\n');

export const formatMeetingExport = (input: MeetingInput, output: MeetingOutput) => formatMeetingAiExport(input, {
  summary: output.summary,
  decisions: output.decisions,
  actionItems: output.actionItems.map((item) => ({ owner: item.owner, task: item.text, due: item.due ?? 'date needed' })),
  unresolvedQuestions: output.unresolvedQuestions,
  vagueStatements: output.vagueStatements,
  followUpEmail: output.followUpEmail,
  nextAgenda: output.nextAgenda,
  extractionQuality: output.validation.length ? 'low' : 'medium',
}, 'fallback');
