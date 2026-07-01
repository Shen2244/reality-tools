import { ScamAiResult, ScamInput, ScamOutput, ScamSignal } from '../types';
import { clamp } from './scoring';

const signalRules = [
  { label: 'urgency / account suspension', severity: 18, terms: ['locked today', 'account will be locked', 'suspended', 'suspension', 'avoid suspension', 'today', 'now', 'immediately', 'urgent', 'final warning', 'limited time', 'last chance', 'expires', 'within 24 hours', 'act fast', 'final notice', 'today only'] },
  { label: 'external link pressure', severity: 18, terms: ['click this link', 'click link', 'tap here', 'open this link', 'verify here', 'follow this link', 'use this link', 'link below', 'http://', 'https://', 'bit.ly', 'tinyurl', 't.co/', '.ru/', '.cn/'] },
  { label: 'verification code theft', severity: 22, terms: ['6-digit code', 'six digit code', 'verification code', 'otp', 'one-time code', 'security code', 'login code', 'authentication code', '2fa'] },
  { label: 'credential request', severity: 22, terms: ['password', 'login', 'username', 'bank account', 'account number', 'pin', 'ssn', 'social security', 'card number', 'date of birth', 'driver license'] },
  { label: 'payment pressure', severity: 18, terms: ['gift card', 'crypto', 'bitcoin', 'wire transfer', 'zelle', 'venmo', 'cash app', 'paypal friends and family', 'payment now', 'deposit now', 'payment required', 'send money', 'processing fee'] },
  { label: 'off-platform pressure', severity: 15, terms: ['move off platform', 'text me directly', 'whatsapp', 'telegram', 'outside the app', 'continue by email', 'continue off platform', 'private chat'] },
  { label: 'too-good-to-be-true', severity: 12, terms: ['guaranteed', 'free money', 'no risk', 'easy money', 'double your money', 'selected winner', 'prize', 'you won', 'risk-free', 'easy income', 'no experience'] },
  { label: 'identity impersonation', severity: 16, terms: ['bank', 'bank account', 'irs', 'paypal', 'amazon', 'apple support', 'police', 'recruiter', 'security team', 'usps', 'fedex', 'microsoft', 'meta support'] },
  { label: 'refund or delivery trick', severity: 12, terms: ['refund', 'delivery failed', 'package held', 'customs fee', 'overpayment', 'shipping label', 'missed delivery'] },
  { label: 'strange grammar or formatting', severity: 8, terms: ['kindly', 'dear customer', '!!!', '100% legit', 'congratulation', 'sir/madam'] },
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

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const findMatches = (message: string, terms: string[]) => {
  const matches: string[] = [];
  terms.forEach((term) => {
    const pattern = new RegExp(escapeRegExp(term), 'gi');
    const found = message.match(pattern) ?? [];
    matches.push(...found);
  });
  return Array.from(new Set(matches));
};

export const analyzeScam = (input: ScamInput): ScamOutput => {
  const validation = validateScamInput(input);
  const signals: ScamSignal[] = signalRules.flatMap((rule) => {
    const matches = findMatches(input.message, rule.terms);
    return matches.length ? [{ label: rule.label, severity: rule.severity, matches }] : [];
  });

  const { links, suspicious } = domainNotes(input.message);
  if (links.length && !signals.some((signal) => signal.label === 'external link pressure')) {
    signals.push({ label: 'external link pressure', severity: 18, matches: links });
  }
  if (suspicious.length) {
    signals.push({ label: 'suspicious link shape', severity: 10, matches: suspicious });
  }
  const hasSignal = (label: string) => signals.some((signal) => signal.label === label);
  if (hasSignal('credential request') && hasSignal('verification code theft') && hasSignal('urgency / account suspension')) {
    signals.push({ label: 'credential panic combo', severity: 24, matches: ['credential request + verification code + urgency'] });
  }
  if (hasSignal('identity impersonation') && hasSignal('external link pressure') && hasSignal('credential request')) {
    signals.push({ label: 'account takeover link combo', severity: 24, matches: ['impersonation + link pressure + credential request'] });
  }
  if (hasSignal('payment pressure') && hasSignal('off-platform pressure')) {
    signals.push({ label: 'off-platform payment combo', severity: 22, matches: ['payment pressure + off-platform request'] });
  }

  const baseRisk = input.message.trim() ? 10 : 0;
  const rawRisk = clamp(baseRisk + signals.reduce((sum, signal) => sum + signal.severity + Math.min(signal.matches.length * 3, 12), 0) - validation.length * 5);
  const riskFloor = hasSignal('credential panic combo') || hasSignal('account takeover link combo') ? 90 : hasSignal('off-platform payment combo') ? 80 : 0;
  const riskScore = Math.max(rawRisk, riskFloor);
  const highlightedPhrases = Array.from(new Set(signals.flatMap((signal) => signal.matches))).sort((a, b) => b.length - a.length);
  const topSignals = signals.slice().sort((a, b) => b.severity - a.severity).slice(0, 3);
  const severityLabel = riskScore >= 80 ? 'Critical' : riskScore >= 55 ? 'High' : riskScore >= 30 ? 'Moderate' : 'Low';

  return {
    summary: validation.length
      ? 'Paste a full message to get a meaningful scam read.'
      : `${severityLabel} risk ${input.channel} message. Strongest signal: ${topSignals[0]?.label ?? 'no obvious pattern'}.`,
    riskScore,
    signals,
    highlightedPhrases,
    explanation: hasSignal('credential panic combo') || hasSignal('account takeover link combo')
      ? 'This message creates panic about an account, pushes you toward a link, asks for credentials, and requests a verification code. That combination is a common account-takeover pattern.'
      : signals.length
        ? `This ${input.channel} message combines ${topSignals.map((signal) => signal.label).join(', ')}. That pattern is risky because it pushes action before independent verification.`
      : `No major scam markers were detected. Still verify sender identity independently before clicking links, paying, or sharing personal data.`,
    safeResponse: riskScore >= 55
      ? 'Do not reply. Do not click. Do not share passwords or verification codes. Verify through the official app/site or a known phone number, then report or block the sender.'
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

const domainFromSender = (sender = '') => sender.match(/@([a-z0-9.-]+\.[a-z]{2,})/i)?.[1]?.toLowerCase();
const normalizedDomain = (value = '') => value.toLowerCase().replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];

export const analyzeScamFallback = (input: ScamInput): ScamAiResult => {
  const output = analyzeScam(input);
  const senderDomain = domainFromSender(input.sender);
  const visibleDomain = normalizedDomain(input.visibleDomain);
  const claimed = (input.claimedOrganization ?? '').toLowerCase();
  const likelyLegitimateSignals: string[] = [];

  if (senderDomain && visibleDomain && (senderDomain === visibleDomain || senderDomain.endsWith(`.${visibleDomain}`) || visibleDomain.endsWith(senderDomain))) {
    likelyLegitimateSignals.push(`Sender domain matches visible domain (${visibleDomain}).`);
  }
  if (claimed && visibleDomain && (claimed.includes('virginia tech') && visibleDomain === 'vt.edu')) {
    likelyLegitimateSignals.push('Claimed organization matches the vt.edu domain.');
  }
  if (/\bportal\b/i.test(input.message)) likelyLegitimateSignals.push('Request points to a portal workflow rather than asking you to send secrets in the message.');
  if (!/\b(password|otp|6-digit|verification code|security code|pin|ssn|card number)\b/i.test(input.message)) {
    likelyLegitimateSignals.push('No direct request to send a password, code, SSN, or card number in the message.');
  }

  let riskScore = output.riskScore;
  if (likelyLegitimateSignals.length >= 3 && !/\b(send|share|reply).{0,30}(password|code|otp|pin|ssn)\b/i.test(input.message)) {
    riskScore = Math.min(riskScore, 35);
  }
  if (/\bbank account will be locked today\b|\b6-digit code\b|\bavoid suspension\b/i.test(input.message)) {
    riskScore = Math.max(riskScore, 92);
  }
  if (/\bwhatsapp\b|\bmove off\b|\btext me\b/i.test(input.message) && /\bzelle\b|\bpay\b|\bpayment\b/i.test(input.message)) {
    riskScore = Math.max(riskScore, 82);
  }
  const marketplacePayment = input.channel === 'marketplace' && /\bwhatsapp\b|\bmove off\b|\btext me\b|\bzelle\b|\bcash app\b/i.test(input.message);

  const riskLevel = riskScore >= 85 ? 'critical' : riskScore >= 65 ? 'high' : riskScore >= 35 ? 'medium' : 'low';
  const confidence = input.sender || input.visibleDomain || input.claimedOrganization ? 'medium' : output.signals.length >= 3 ? 'high' : 'low';

  return {
    summary: riskLevel === 'low'
      ? 'Risk appears low based on the provided details, but verify through the official website or app.'
      : output.summary,
    riskScore,
    riskLevel,
    confidence,
    likelyLegitimateSignals: likelyLegitimateSignals.length ? likelyLegitimateSignals : ['No strong legitimacy signals were provided.'],
    suspiciousSignals: output.signals.map((signal) => ({ label: signal.label, evidence: signal.matches, severity: signal.severity })),
    highlightPhrases: output.highlightedPhrases,
    plainLanguageReadout: output.explanation,
    safeResponse: marketplacePayment
      ? 'Stay on the marketplace platform, do not move to WhatsApp or direct text, and avoid irreversible payment methods like Zelle until the transaction is verified and protected.'
      : output.safeResponse,
    verificationSteps: [
      marketplacePayment ? 'Keep communication and payment inside the marketplace platform.' : 'Do not use links from the message if anything feels off.',
      marketplacePayment ? 'Decline overpayment, courier, or direct-payment pressure.' : 'Open the official site or app manually in a separate browser tab.',
      input.claimedOrganization && !/^none|unknown$/i.test(input.claimedOrganization) ? `Verify through official ${input.claimedOrganization} contact channels.` : 'Verify through a known phone number or official support page.',
    ].filter(Boolean),
    checklist: output.checklist,
    defensiveOnly: true,
  };
};

export const formatScamAiExport = (input: ScamInput, output: ScamAiResult, source: string) => [
  `ScamLens (${source}): ${input.channel}`,
  '',
  output.summary,
  `Risk score: ${output.riskScore}`,
  `Risk level: ${output.riskLevel}`,
  `Confidence: ${output.confidence}`,
  '',
  'Likely legitimate signals',
  ...output.likelyLegitimateSignals.map((item) => `- ${item}`),
  '',
  'Suspicious signals',
  ...(output.suspiciousSignals.length ? output.suspiciousSignals.map((signal) => `- ${signal.label}: ${signal.evidence.join(', ')}`) : ['- None detected']),
  '',
  `Readout: ${output.plainLanguageReadout}`,
  `Safe response: ${output.safeResponse}`,
  '',
  'Verification steps',
  ...output.verificationSteps.map((item) => `- ${item}`),
  '',
  'Original message',
  input.message,
].join('\n');

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
