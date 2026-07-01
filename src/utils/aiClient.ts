import { AnalyzeRequest, AnalyzeResponse } from '../types';

export const unavailableMessage = 'AI analysis is temporarily unavailable. Showing limited local analysis.';

export async function analyzeWithAi(request: AnalyzeRequest): Promise<AnalyzeResponse> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(request),
  });

  const payload = await response.json().catch(() => null) as AnalyzeResponse | null;
  if (!response.ok || !payload?.ok || !payload.result) {
    throw new Error(payload?.error || 'AI analysis failed.');
  }
  return payload;
}
