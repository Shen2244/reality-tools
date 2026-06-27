import { ActionItem, MeetingInput, MeetingOutput } from '../types';

const cleanLines = (text: string) => text.split(/\n+/).map((line) => line.trim().replace(/^[-*]\s*/, '')).filter(Boolean);

const attendeeNames = (attendees: string) => attendees.split(/,|\n/).map((name) => name.trim()).filter(Boolean);

const ownerFrom = (line: string, attendees: string): string => {
  const names = attendeeNames(attendees);
  const explicit = line.match(/\bowner[:\s-]+([A-Z][a-z]+(?:\s[A-Z][a-z]+)?)/);
  if (explicit) return explicit[1];
  return names.find((name) => new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i').test(line)) ?? 'Unassigned';
};

const dueFrom = (line: string) => {
  const match = line.match(/\b(by|due|before)\s+([A-Z]?[a-z]+day|tomorrow|EOD|end of day|next week|next month|\d{1,2}\/\d{1,2}|\d{4}-\d{2}-\d{2})\b/i);
  return match?.[2];
};

export const validateMeetingInput = (input: MeetingInput) => {
  const issues: string[] = [];
  if (!input.goal.trim()) issues.push('Add the meeting goal.');
  if (!input.attendees.trim()) issues.push('Add attendees so owners can be inferred.');
  if (cleanLines(input.notes).length < 3) issues.push('Add several lines of notes for extraction.');
  return issues;
};

export const analyzeMeeting = (input: MeetingInput): MeetingOutput => {
  const lines = cleanLines(input.notes);
  const validation = validateMeetingInput(input);
  const decisionPattern = /\b(decided|agreed|approved|finalized|confirmed|greenlit|we will|go with|selected)\b/i;
  const actionPattern = /\b(will|need to|should|assigned|owner|by friday|deadline|due|follow up|send|draft|review|confirm|prepare|schedule|ship|publish)\b/i;
  const questionPattern = /\?$|\b(unclear|need to confirm|tbd|open question|not sure|blocked|waiting on|unknown)\b/i;
  const vaguePattern = /\b(circle back|align|look into|touch base|synergy|later|soon|maybe|explore|nice to have|figure out|keep in mind)\b/i;

  const decisions = lines.filter((line) => decisionPattern.test(line));
  const actionItems: ActionItem[] = lines
    .filter((line) => actionPattern.test(line) && !decisionPattern.test(line))
    .map((line) => ({ text: line, owner: ownerFrom(line, input.attendees), due: dueFrom(line) }));
  const unresolvedQuestions = lines.filter((line) => questionPattern.test(line));
  const vagueStatements = lines.filter((line) => vaguePattern.test(line));
  const attendeeList = input.attendees || 'team';
  const missingOwners = actionItems.filter((item) => item.owner === 'Unassigned').length;
  const missingDates = actionItems.filter((item) => !item.due).length;

  const decisionsForEmail = decisions.length ? decisions.map((item) => `- ${item}`).join('\n') : '- No explicit decisions were captured.';
  const actionsForEmail = actionItems.length
    ? actionItems.map((item) => `- ${item.owner}: ${item.text}${item.due ? ` (${item.due})` : ' (date needed)'}`).join('\n')
    : '- No accountable action items were captured.';

  return {
    summary: validation.length
      ? 'Meeting notes need more structure before the recap is reliable.'
      : `${decisions.length} decision${decisions.length === 1 ? '' : 's'}, ${actionItems.length} action item${actionItems.length === 1 ? '' : 's'}, ${unresolvedQuestions.length} unresolved question${unresolvedQuestions.length === 1 ? '' : 's'}.`,
    decisions: decisions.length ? decisions : ['No explicit decisions detected. Add lines with decided/agreed/approved/finalized when a choice is made.'],
    actionItems: actionItems.length ? actionItems : [{ text: 'Assign owners and due dates for the next concrete step.', owner: 'Unassigned' }],
    unresolvedQuestions: unresolvedQuestions.length ? unresolvedQuestions : ['No unresolved questions detected.'],
    vagueStatements: vagueStatements.length ? vagueStatements : ['No vague statements detected.'],
    followUpEmail: `Subject: Follow-up: ${input.goal || 'Meeting recap'}\n\nHi ${attendeeList},\n\nHere is the accountability recap from our meeting.\n\nDecisions:\n${decisionsForEmail}\n\nAction items:\n${actionsForEmail}\n\nOpen questions:\n${unresolvedQuestions.length ? unresolvedQuestions.map((item) => `- ${item}`).join('\n') : '- None captured.'}\n\nPlease reply with corrections, missing owners, or missing dates by end of day.\n`,
    nextAgenda: [
      `Confirm progress against goal: ${input.goal || 'current priority'}`,
      missingOwners ? `Assign owners for ${missingOwners} unowned action item${missingOwners === 1 ? '' : 's'}` : 'Review owners for all open action items',
      missingDates ? `Add due dates to ${missingDates} action item${missingDates === 1 ? '' : 's'}` : 'Review deadlines and blockers',
      'Resolve unanswered questions',
      'Convert vague discussion into decisions or explicit parking-lot items',
    ],
    validation,
  };
};

export const formatMeetingExport = (input: MeetingInput, output: MeetingOutput) => [
  `MeetingRealityCheck: ${input.goal}`,
  '',
  output.summary,
  '',
  'Decisions',
  ...output.decisions.map((item) => `- ${item}`),
  '',
  'Action items',
  ...output.actionItems.map((item) => `- ${item.owner}${item.due ? ` (${item.due})` : ''}: ${item.text}`),
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
