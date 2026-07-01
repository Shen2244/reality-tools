import type { AnalyzeRequest } from '../src/types';

type ServerResponse = {
  status: (code: number) => ServerResponse;
  json: (body: unknown) => void;
  setHeader?: (name: string, value: string) => void;
};

type ServerRequest = {
  method?: string;
  body?: unknown;
};

const allowedTools = ['decisionCourt', 'scamLens', 'meetingRealityCheck'] as const;
const maxBodyLength = 12_000;
const model = process.env.GEMINI_MODEL || 'gemini-2.0-flash-lite';

const clampScore = (value: unknown) => Math.min(100, Math.max(0, Math.round(Number(value) || 0)));
const asArray = (value: unknown) => Array.isArray(value) ? value.map(String).slice(0, 8) : [];
const asString = (value: unknown, fallback = '') => typeof value === 'string' ? value.slice(0, 2000) : fallback;

const baseProperties = {
  summary: { type: 'string' },
};

const schemas = {
  decisionCourt: {
    name: 'decision_court_result',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'decisionQuestion', 'contextSummary', 'optionA', 'optionB', 'prosecutor', 'defense', 'witnesses', 'hiddenAssumptions', 'missingInformation', 'verdict', 'riskScore', 'confidenceScore', 'bestNextAction', 'analysisQuality', 'inferredInputs'],
      properties: {
        ...baseProperties,
        decisionQuestion: { type: 'string' },
        contextSummary: { type: 'string' },
        optionA: { type: 'string' },
        optionB: { type: 'string' },
        prosecutor: { type: 'array', items: { type: 'string' } },
        defense: { type: 'array', items: { type: 'string' } },
        witnesses: { type: 'array', items: { type: 'string' } },
        hiddenAssumptions: { type: 'array', items: { type: 'string' } },
        missingInformation: { type: 'array', items: { type: 'string' } },
        verdict: { type: 'string' },
        riskScore: { type: 'number' },
        confidenceScore: { type: 'number' },
        bestNextAction: { type: 'string' },
        analysisQuality: { type: 'string', enum: ['low', 'medium', 'high'] },
        inferredInputs: {
          type: 'object',
          additionalProperties: false,
          required: ['deadline', 'riskTolerance', 'importance', 'stakes'],
          properties: {
            deadline: { type: 'string' },
            riskTolerance: { type: 'string' },
            importance: { type: 'string' },
            stakes: { type: 'array', items: { type: 'string' } },
          },
        },
      },
    },
  },
  scamLens: {
    name: 'scam_lens_result',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'riskScore', 'riskLevel', 'confidence', 'likelyLegitimateSignals', 'suspiciousSignals', 'highlightPhrases', 'plainLanguageReadout', 'safeResponse', 'verificationSteps', 'checklist', 'defensiveOnly'],
      properties: {
        ...baseProperties,
        riskScore: { type: 'number' },
        riskLevel: { type: 'string', enum: ['low', 'medium', 'high', 'critical'] },
        confidence: { type: 'string', enum: ['low', 'medium', 'high'] },
        likelyLegitimateSignals: { type: 'array', items: { type: 'string' } },
        suspiciousSignals: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['label', 'evidence', 'severity'],
            properties: {
              label: { type: 'string' },
              evidence: { type: 'array', items: { type: 'string' } },
              severity: { type: 'number' },
            },
          },
        },
        highlightPhrases: { type: 'array', items: { type: 'string' } },
        plainLanguageReadout: { type: 'string' },
        safeResponse: { type: 'string' },
        verificationSteps: { type: 'array', items: { type: 'string' } },
        checklist: { type: 'array', items: { type: 'string' } },
        defensiveOnly: { type: 'boolean' },
      },
    },
  },
  meetingRealityCheck: {
    name: 'meeting_reality_check_result',
    schema: {
      type: 'object',
      additionalProperties: false,
      required: ['summary', 'decisions', 'actionItems', 'unresolvedQuestions', 'vagueStatements', 'followUpEmail', 'nextAgenda', 'extractionQuality'],
      properties: {
        ...baseProperties,
        decisions: { type: 'array', items: { type: 'string' } },
        actionItems: {
          type: 'array',
          items: {
            type: 'object',
            additionalProperties: false,
            required: ['owner', 'task', 'due'],
            properties: {
              owner: { type: 'string' },
              task: { type: 'string' },
              due: { type: 'string' },
            },
          },
        },
        unresolvedQuestions: { type: 'array', items: { type: 'string' } },
        vagueStatements: { type: 'array', items: { type: 'string' } },
        followUpEmail: { type: 'string' },
        nextAgenda: { type: 'array', items: { type: 'string' } },
        extractionQuality: { type: 'string', enum: ['low', 'medium', 'high'] },
      },
    },
  },
};

function validateRequest(body: unknown): AnalyzeRequest | null {
  if (!body || typeof body !== 'object') return null;
  const candidate = body as AnalyzeRequest;
  if (!allowedTools.includes(candidate.tool)) return null;
  if (!candidate.input || typeof candidate.input !== 'object') return null;
  if (JSON.stringify(candidate).length > maxBodyLength) return null;
  return candidate;
}

function systemPrompt(tool: AnalyzeRequest['tool']) {
  if (tool === 'scamLens') {
    return 'You are Reality Tools ScamLens. Provide defensive safety analysis only. Do not write scams, improve deception, impersonate institutions, or bypass detection. Judge context, sender/domain match, request type, pressure, and verification path. Never say definitely safe.';
  }
  if (tool === 'meetingRealityCheck') {
    return 'You are Reality Tools MeetingRealityCheck. Extract structured meeting accountability from messy notes. Do not copy the same paragraph into every category. Do not invent owners or dates. Use Unassigned and date needed when missing.';
  }
  return 'You are Reality Tools Decision Court. Be blunt, practical, and specific. Infer structure from minimal messy input without inventing facts. Identify weak assumptions, what could go wrong, missing information, and one concrete safest next action.';
}

function userPrompt(request: AnalyzeRequest) {
  return [
    systemPrompt(request.tool),
    '',
    `Analyze this ${request.tool} input and return only valid JSON.`,
    'Do not wrap the JSON in markdown fences.',
    'Do not include commentary before or after the JSON.',
    'Match this JSON schema shape:',
    JSON.stringify(schemas[request.tool].schema, null, 2),
    '',
    'Input:',
    JSON.stringify(request.input, null, 2),
    '',
    'Pre-scan:',
    JSON.stringify(request.preScan ?? {}, null, 2),
  ].join('\n');
}

function parseGeminiJson(content: string) {
  const trimmed = content.trim();
  const unfenced = trimmed
    .replace(/^```(?:json)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim();
  const start = unfenced.indexOf('{');
  const end = unfenced.lastIndexOf('}');
  if (start === -1 || end === -1 || end <= start) {
    throw new Error('No JSON object found.');
  }
  return JSON.parse(unfenced.slice(start, end + 1)) as Record<string, unknown>;
}

function normalize(tool: AnalyzeRequest['tool'], result: Record<string, unknown>) {
  if (tool === 'decisionCourt') {
    return {
      summary: asString(result.summary),
      decisionQuestion: asString(result.decisionQuestion),
      contextSummary: asString(result.contextSummary),
      optionA: asString(result.optionA, 'Proceed with the decision or risky action.'),
      optionB: asString(result.optionB, 'Delay, decline, or gather more evidence before committing.'),
      prosecutor: asArray(result.prosecutor),
      defense: asArray(result.defense),
      witnesses: asArray(result.witnesses),
      hiddenAssumptions: asArray(result.hiddenAssumptions),
      missingInformation: asArray(result.missingInformation),
      verdict: asString(result.verdict),
      riskScore: clampScore(result.riskScore),
      confidenceScore: clampScore(result.confidenceScore),
      bestNextAction: asString(result.bestNextAction),
      analysisQuality: ['low', 'medium', 'high'].includes(String(result.analysisQuality)) ? result.analysisQuality : 'low',
      inferredInputs: {
        deadline: asString((result.inferredInputs as Record<string, unknown>)?.deadline, 'No hard deadline detected.'),
        riskTolerance: asString((result.inferredInputs as Record<string, unknown>)?.riskTolerance, 'medium'),
        importance: asString((result.inferredInputs as Record<string, unknown>)?.importance, 'medium'),
        stakes: asArray((result.inferredInputs as Record<string, unknown>)?.stakes),
      },
    };
  }

  if (tool === 'scamLens') {
    return {
      summary: asString(result.summary),
      riskScore: clampScore(result.riskScore),
      riskLevel: ['low', 'medium', 'high', 'critical'].includes(String(result.riskLevel)) ? result.riskLevel : 'medium',
      confidence: ['low', 'medium', 'high'].includes(String(result.confidence)) ? result.confidence : 'low',
      likelyLegitimateSignals: asArray(result.likelyLegitimateSignals),
      suspiciousSignals: Array.isArray(result.suspiciousSignals) ? result.suspiciousSignals.slice(0, 8).map((signal) => ({
        label: asString((signal as Record<string, unknown>).label),
        evidence: asArray((signal as Record<string, unknown>).evidence),
        severity: clampScore((signal as Record<string, unknown>).severity),
      })) : [],
      highlightPhrases: asArray(result.highlightPhrases),
      plainLanguageReadout: asString(result.plainLanguageReadout),
      safeResponse: asString(result.safeResponse),
      verificationSteps: asArray(result.verificationSteps),
      checklist: asArray(result.checklist),
      defensiveOnly: true,
    };
  }

  return {
    summary: asString(result.summary),
    decisions: asArray(result.decisions),
    actionItems: Array.isArray(result.actionItems) ? result.actionItems.slice(0, 10).map((item) => ({
      owner: asString((item as Record<string, unknown>).owner, 'Unassigned'),
      task: asString((item as Record<string, unknown>).task),
      due: asString((item as Record<string, unknown>).due, 'date needed'),
    })) : [],
    unresolvedQuestions: asArray(result.unresolvedQuestions),
    vagueStatements: asArray(result.vagueStatements),
    followUpEmail: asString(result.followUpEmail),
    nextAgenda: asArray(result.nextAgenda),
    extractionQuality: ['low', 'medium', 'high'].includes(String(result.extractionQuality)) ? result.extractionQuality : 'low',
  };
}

export default async function handler(req: ServerRequest, res: ServerResponse) {
  res.setHeader?.('Cache-Control', 'no-store');
  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const request = validateRequest(req.body);
  if (!request) {
    return res.status(400).json({ ok: false, error: 'Invalid analysis request.' });
  }

  if (!process.env.GEMINI_API_KEY) {
    return res.status(503).json({ ok: false, error: 'AI analysis is not configured.' });
  }

  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [{ text: userPrompt(request) }],
          },
        ],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      const errorPayload = await response.json().catch(() => null);
      const message = typeof errorPayload?.error?.message === 'string'
        ? errorPayload.error.message.slice(0, 240)
        : `Gemini returned HTTP ${response.status}.`;
      return res.status(502).json({ ok: false, error: `AI model request failed: ${message}` });
    }

    const payload = await response.json();
    const content = payload?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content || typeof content !== 'string') {
      return res.status(502).json({ ok: false, error: 'AI returned an empty result.' });
    }

    const parsed = parseGeminiJson(content);
    return res.status(200).json({
      ok: true,
      source: 'ai',
      tool: request.tool,
      result: normalize(request.tool, parsed),
    });
  } catch {
    return res.status(500).json({ ok: false, error: 'AI analysis failed safely.' });
  }
}
