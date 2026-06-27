import { ScamInput, ScamOutput, ScamSignal } from '../types';
import { clamp } from './scoring';

const signalRules = [
  { label: 'urgency', severity: 14, terms: ['urgent', 'immediately', 'now', 'last chance', 'expires', 'within 24 hours', 'act fast', 'final notice', 'today only'] },
  { label: 'payment pressure', severity: 18, terms: ['gift card', 'wire transfer', 'crypto', 'bitcoin', 'payment required', 'send money', 'deposit', 'processing fee', 'zelle', 'cash app'] },
  { label: 'external link', severity: 18, terms: ['http://', 'https://', 'bit.ly', 'tinyurl', 't.co/', '.ru/', '.cn/'] },
  { label: 'identity impersonation', severity: 15, terms: ['irs', 'bank', 'paypal', 'amazon', 'apple support', 'police', 'recruiter', 'security team', 'usps', 'fedex', 'microsoft', 'meta support'] },
  { label: 'refund or delivery trick', severity: 12, terms: ['refund', 'delivery failed', 'package held', 'customs fee', 'overpayment', 'shipping label', 'missed delivery'] },
  { label: 'too-good-to-be-true promise', severity: 12, terms: ['guaranteed', 'free money', 'risk-free', 'you won', 'selected winner', 'double your', 'easy income', 'no experience'] },
  { label: 'request for personal information', severity: 18, terms: ['password', 'verification code', '2fa', 'one-time code', 'ssn', 'social security', 'bank account', 'login', 'date of birth', 'driver license'] },
  { label: 'strange grammar or formatting', severity: 8, terms: ['kindly', 'dear customer', '!!!', '100% legit', 'congratulation', 'sir/madam'] },
  { label: 'pressure to move off-platform', severity: 14, terms: ['telegram', 'whatsapp', 'outside the app', 'text me directly', 'continue off platform', 'private chat'] },
];

export const validateScamInput = (input: ScamInput) => {
  const issues: string[] = [];
  if (!input.message.trim()) issues.push('Paste the suspicious message first.');
  if (input.message.trim().length > 0 && input.message.trim().length < 20) issues.push('Message is very short; risk analysis may be weak.');
  return issues;
};

const domainNotes = (message: string) => {
  const links = message.match(/\bhttps?:\/\/[^\s]+|\b[a-z0-9-]+\.(com|net|org|io|co|ru|cn)\b/gi) ?? [];
  const suspicious = links.filter((link) => /bit\.ly|tinyurl|t\.co|\.ru|\.cn|verify|secure|account|login|pay/i.test(link));
  return { links, suspicious };
};

export const analyzeScam = (input: ScamInput): ScamOutput => {
  const lower = input.message.toLowerCase();
  const validation = validateScamInput(input);
  const signals: ScamSignal[] = signalRules.flatMap((rule) => {
    const matches = rule.terms.filter((term) => lower.includes(term));
    return matches.length ? [{ label: rule.label, severity: rule.severity, matches }] : [];
  });

  const { links, suspicious } = domainNotes(input.message);
  if (links.length && !signals.some((signal) => signal.label === 'external link')) {
    signals.push({ label: 'external link', severity: 18, matches: links });
  }
  if (suspicious.length) {
    signals.push({ label: 'suspicious link shape', severity: 10, matches: suspicious });
  }
  if (/(code|password|login|bank|ssn|account).{0,40}(urgent|now|suspended|locked)/i.test(input.message)) {
    signals.push({ label: 'credential panic combo', severity: 20, matches: ['credential request + urgency'] });
  }
  if (/(gift card|crypto|wire|zelle|cash app).{0,60}(refund|job|deposit|fee|unlock|release)/i.test(input.message)) {
    signals.push({ label: 'irreversible payment combo', severity: 20, matches: ['irreversible payment + promised outcome'] });
  }

  const baseRisk = input.message.trim() ? 10 : 0;
  const riskScore = clamp(baseRisk + signals.reduce((sum, signal) => sum + signal.severity + Math.min(signal.matches.length * 3, 9), 0) - validation.length * 5);
  const highlightedPhrases = Array.from(new Set(signals.flatMap((signal) => signal.matches)));
  const topSignals = signals.slice().sort((a, b) => b.severity - a.severity).slice(0, 3);
  const severityLabel = riskScore >= 80 ? 'Critical' : riskScore >= 55 ? 'High' : riskScore >= 30 ? 'Moderate' : 'Low';

  return {
    summary: validation.length
      ? 'Paste a full message to get a meaningful scam read.'
      : `${severityLabel} risk ${input.channel} message. Strongest signal: ${topSignals[0]?.label ?? 'no obvious pattern'}.`,
    riskScore,
    signals,
    highlightedPhrases,
    explanation: signals.length
      ? `This ${input.channel} message combines ${topSignals.map((signal) => signal.label).join(', ')}. That pattern is risky because it pushes action before independent verification.`
      : `No major scam markers were detected. Still verify sender identity independently before clicking links, paying, or sharing personal data.`,
    safeResponse: riskScore >= 55
      ? 'Do not reply, click, pay, or share codes. Verify using the official app/site or a known phone number, then report or block the sender.'
      : 'Verify through an official channel before acting, especially if money, account access, or personal information is involved.',
    checklist: [
      links.length ? `Do not open these links until verified: ${links.slice(0, 2).join(', ')}` : 'Check whether any link points to the real official domain.',
      'Verify the sender through a separate official channel.',
      'Do not share passwords, verification codes, banking details, or identity documents.',
      'Do not pay with gift cards, crypto, wire transfer, or off-platform payment.',
      'Pause if the message creates panic, secrecy, or artificial urgency.',
    ],
    validation,
  };
};

export const formatScamExport = (input: ScamInput, output: ScamOutput) => [
  `ScamLens: ${input.channel}`,
  '',
  output.summary,
  `Risk score: ${output.riskScore}`,
  '',
  'Detected signals',
  ...(output.signals.length ? output.signals.map((signal) => `- ${signal.label}: ${signal.matches.join(', ')}`) : ['- No major signals detected']),
  '',
  `Explanation: ${output.explanation}`,
  `Safe response: ${output.safeResponse}`,
  '',
  'Checklist',
  ...output.checklist.map((item) => `- ${item}`),
  '',
  'Original message',
  input.message,
].join('\n');
