import { useState } from 'react';
import { ShieldAlert, ShieldCheck } from 'lucide-react';
import { AnalyzeSource, HistoryItem, ScamAiResult, ScamInput } from '../types';
import { analyzeWithAi, unavailableMessage } from '../utils/aiClient';
import { analyzeScamFallback, formatScamAiExport } from '../utils/scamAnalysis';
import { scamExamples } from '../utils/examples';
import { downloadTxt } from '../utils/scoring';
import { ActionButtons, DemoPicker, EmptyState, Field, inputClass, Panel, ScoreBar, SummaryStrip, textareaClass } from '../components/UI';

export function ScamLens({ onSave }: { onSave: (item: HistoryItem) => void }) {
  const [input, setInput] = useState<ScamInput>(scamExamples[0].input);
  const [result, setResult] = useState<ScamAiResult | null>(null);
  const [source, setSource] = useState<AnalyzeSource>('fallback');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const exportText = result ? formatScamAiExport(input, result, source) : '';

  const analyze = async () => {
    if (!input.message.trim()) {
      setNotice('Paste the suspicious message first.');
      return;
    }
    setLoading(true);
    setNotice('');
    const preScan = analyzeScamFallback(input);
    try {
      const response = await analyzeWithAi({ tool: 'scamLens', input, preScan });
      setResult(response.result as ScamAiResult);
      setSource('ai');
    } catch {
      setResult(preScan);
      setSource('fallback');
      setNotice(unavailableMessage);
    } finally {
      setLoading(false);
    }
  };

  const save = () => {
    if (!result) return;
    onSave({
      id: crypto.randomUUID(),
      tool: 'ScamLens',
      title: `${input.channel}: ${input.message.slice(0, 52)}${input.message.length > 52 ? '...' : ''}`,
      createdAt: new Date().toISOString(),
      metricLabel: 'Risk',
      metricValue: result.riskScore,
      exportText,
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-acid">Defensive message analysis</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">ScamLens</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">Judges message risk from context, sender, domain, pressure, secrets requested, and the safest verification path.</p>
        </div>
        <ActionButtons onSave={save} onExport={() => downloadTxt('scamlens.txt', exportText)} disabled={!result} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="grid gap-4">
          <DemoPicker examples={scamExamples} onPick={(next) => { setInput(next); setResult(null); setNotice(''); }} />
          <Field label="Suspicious message">
            <textarea className={`${textareaClass} min-h-72`} value={input.message} onChange={(event) => setInput({ ...input, message: event.target.value })} placeholder="Paste the full suspicious message..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Channel">
              <select className={inputClass} value={input.channel} onChange={(event) => setInput({ ...input, channel: event.target.value as ScamInput['channel'] })}>
                <option>SMS</option><option>email</option><option>social media</option><option>marketplace</option><option>job offer</option><option>other</option>
              </select>
            </Field>
            <Field label="Sender email / phone / username">
              <input className={inputClass} value={input.sender ?? ''} onChange={(event) => setInput({ ...input, sender: event.target.value })} placeholder="unknown, finaid@vt.edu..." />
            </Field>
            <Field label="Visible link or domain">
              <input className={inputClass} value={input.visibleDomain ?? ''} onChange={(event) => setInput({ ...input, visibleDomain: event.target.value })} placeholder="vt.edu, unknown, none..." />
            </Field>
            <Field label="Claimed organization">
              <input className={inputClass} value={input.claimedOrganization ?? ''} onChange={(event) => setInput({ ...input, claimedOrganization: event.target.value })} placeholder="Virginia Tech, bank, none..." />
            </Field>
          </div>
          <button onClick={analyze} disabled={loading || !input.message.trim()} className="border border-acid/70 bg-acid px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? 'Analyzing...' : 'Analyze Message'}
          </button>
          {notice ? <p className="border border-amber/40 bg-amber/10 p-3 text-sm leading-6 text-orange-100">{notice}</p> : null}
          <div className="border border-line bg-ink/70 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Highlighted message</h2>
            {input.message.trim() && result ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-steel">{highlight(input.message, result.highlightPhrases)}</p>
            ) : (
              <EmptyState text="Run an analysis to highlight suspicious phrases." />
            )}
          </div>
        </Panel>

        <div className="grid gap-4">
          {result ? (
            <>
              <Panel className="grid gap-4">
                <SummaryStrip label={`${result.riskLevel} risk / ${result.confidence} confidence`} text={result.summary} />
                <ScoreBar label="Risk" value={result.riskScore} tone="danger" />
              </Panel>
              <Panel>
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-verdict"><ShieldCheck size={18} /> Likely legitimate signals</h2>
                <ul className="grid gap-2 text-sm leading-6 text-steel">
                  {result.likelyLegitimateSignals.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </Panel>
              <Panel>
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-danger"><ShieldAlert size={18} /> Suspicious signals</h2>
                {result.suspiciousSignals.length ? (
                  <div className="grid gap-3">
                    {result.suspiciousSignals.map((signal) => (
                      <div key={`${signal.label}-${signal.evidence.join(',')}`} className="border border-line bg-ink/50 p-3">
                        <div className="flex justify-between gap-3 text-sm">
                          <span className="font-semibold text-white">{signal.label}</span>
                          <span className="text-danger">+{signal.severity}</span>
                        </div>
                        <p className="mt-2 break-words text-xs leading-5 text-steel">{signal.evidence.join(', ') || 'Contextual concern'}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <EmptyState text="No strong suspicious signals were found from the provided details." />
                )}
              </Panel>
              <Panel>
                <h2 className="mb-3 font-semibold text-white">Plain-language readout</h2>
                <p className="text-sm leading-6 text-steel">{result.plainLanguageReadout}</p>
                <p className="mt-4 border-l-2 border-acid pl-3 text-sm leading-6 text-white">{result.safeResponse}</p>
              </Panel>
              <Panel>
                <h2 className="mb-3 font-semibold text-white">Verification steps</h2>
                <ul className="grid gap-2 text-sm leading-6 text-steel">
                  {result.verificationSteps.map((item) => <li key={item}>- {item}</li>)}
                </ul>
              </Panel>
            </>
          ) : (
            <EmptyState text="Paste a message and add any sender or domain details you have. The result will separate legitimate signals from suspicious pressure." />
          )}
        </div>
      </div>
    </div>
  );
}

function highlight(message: string, phrases: string[]) {
  if (!phrases.length) return message;
  const escaped = phrases.map((phrase) => phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|');
  const parts = message.split(new RegExp(`(${escaped})`, 'gi'));
  return parts.map((part, index) => phrases.some((phrase) => phrase.toLowerCase() === part.toLowerCase())
    ? <mark key={`${part}-${index}`} className="bg-danger/25 px-1 text-red-100">{part}</mark>
    : part);
}
