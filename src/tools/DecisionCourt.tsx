import { useState } from 'react';
import type React from 'react';
import { AlertTriangle, ChevronDown, FileSearch, Scale, ShieldCheck } from 'lucide-react';
import { AnalyzeSource, DecisionAiResult, DecisionSituationInput, HistoryItem } from '../types';
import { analyzeWithAi, unavailableMessage } from '../utils/aiClient';
import { analyzeDecisionFallback, formatDecisionAiExport } from '../utils/decisionAnalysis';
import { decisionExamples } from '../utils/examples';
import { downloadTxt } from '../utils/scoring';
import { ActionButtons, DemoPicker, EmptyState, Field, inputClass, Panel, ScoreBar, SummaryStrip, textareaClass } from '../components/UI';

const blankInput: DecisionSituationInput = {
  situation: 'Should I buy this used car tonight? The seller says other buyers are waiting and wants Zelle.',
  additionalContext: '',
  optionA: '',
  optionB: '',
  deadline: '',
  riskTolerance: 'medium',
  importance: 'medium',
};

export function DecisionCourt({ onSave }: { onSave: (item: HistoryItem) => void }) {
  const [input, setInput] = useState<DecisionSituationInput>(blankInput);
  const [result, setResult] = useState<DecisionAiResult | null>(null);
  const [source, setSource] = useState<AnalyzeSource>('fallback');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const exportText = result ? formatDecisionAiExport(input, result, source) : '';

  const analyze = async () => {
    if (!input.situation.trim()) {
      setNotice('Describe the decision first.');
      return;
    }
    setLoading(true);
    setNotice('');
    const preScan = analyzeDecisionFallback(input);
    try {
      const response = await analyzeWithAi({ tool: 'decisionCourt', input, preScan });
      setResult(response.result as DecisionAiResult);
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
      tool: 'Decision Court',
      title: result.decisionQuestion || input.situation.slice(0, 64),
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
          <p className="text-xs uppercase tracking-[0.28em] text-acid">Courtroom analysis</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Decision Court</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">Paste a messy decision and get a practical verdict, inferred stakes, hidden assumptions, and the next safest move.</p>
        </div>
        <ActionButtons onSave={save} onExport={() => downloadTxt('decision-court.txt', exportText)} disabled={!result} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="grid gap-4">
          <DemoPicker examples={decisionExamples} onPick={(next) => { setInput(next); setResult(null); setNotice(''); }} />
          <Field label="Decision situation">
            <textarea
              className={`${textareaClass} min-h-52 text-base leading-7`}
              value={input.situation}
              onChange={(event) => setInput({ ...input, situation: event.target.value })}
              placeholder="Describe the decision in one sentence or paste the full situation..."
            />
          </Field>
          <button onClick={analyze} disabled={loading || !input.situation.trim()} className="border border-acid/70 bg-acid px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? 'Analyzing...' : 'Analyze Decision'}
          </button>
          {notice ? <p className="border border-amber/40 bg-amber/10 p-3 text-sm leading-6 text-orange-100">{notice}</p> : null}

          <button
            className="flex items-center justify-between border border-line bg-ink/70 px-3 py-2 text-left text-sm font-semibold text-slate-200"
            onClick={() => setAdvancedOpen((open) => !open)}
          >
            Add details for a stronger verdict
            <ChevronDown className={advancedOpen ? 'rotate-180 transition' : 'transition'} size={16} />
          </button>
          {advancedOpen ? (
            <div className="grid gap-4 border border-line bg-ink/35 p-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Option A">
                  <input className={inputClass} value={input.optionA} onChange={(event) => setInput({ ...input, optionA: event.target.value })} placeholder="Proceed, accept, buy, sign..." />
                </Field>
                <Field label="Option B">
                  <input className={inputClass} value={input.optionB} onChange={(event) => setInput({ ...input, optionB: event.target.value })} placeholder="Delay, decline, verify..." />
                </Field>
              </div>
              <div className="grid gap-4 sm:grid-cols-3">
                <Field label="Deadline">
                  <input className={inputClass} value={input.deadline} onChange={(event) => setInput({ ...input, deadline: event.target.value })} placeholder="tonight, July 5..." />
                </Field>
                <Field label="Risk tolerance">
                  <select className={inputClass} value={input.riskTolerance} onChange={(event) => setInput({ ...input, riskTolerance: event.target.value as DecisionSituationInput['riskTolerance'] })}>
                    <option>low</option><option>medium</option><option>high</option>
                  </select>
                </Field>
                <Field label="Importance">
                  <select className={inputClass} value={input.importance} onChange={(event) => setInput({ ...input, importance: event.target.value as DecisionSituationInput['importance'] })}>
                    <option>low</option><option>medium</option><option>high</option>
                  </select>
                </Field>
              </div>
              <Field label="Additional context">
                <textarea className={textareaClass} value={input.additionalContext} onChange={(event) => setInput({ ...input, additionalContext: event.target.value })} placeholder="Constraints, stakeholders, downside, reversibility..." />
              </Field>
            </div>
          ) : null}
        </Panel>

        <div className="grid gap-4">
          {result ? (
            <>
              <Panel className="grid gap-4">
                <SummaryStrip label={result.analysisQuality === 'low' ? 'Low analysis quality' : result.analysisQuality === 'medium' ? 'Medium analysis quality' : 'High analysis quality'} text={result.summary} />
                <div className="grid gap-3 sm:grid-cols-2">
                  <ScoreBar label="Risk" value={result.riskScore} tone="danger" />
                  <ScoreBar label="Confidence" value={result.confidenceScore} tone="acid" />
                </div>
              </Panel>
              <Panel>
                <h2 className="mb-3 font-semibold text-white">Inferred Inputs</h2>
                <div className="grid gap-2 text-sm leading-6 text-steel">
                  <p><span className="text-slate-300">Question:</span> {result.decisionQuestion}</p>
                  <p><span className="text-slate-300">Context:</span> {result.contextSummary}</p>
                  <p><span className="text-slate-300">Option A:</span> {result.optionA}</p>
                  <p><span className="text-slate-300">Option B:</span> {result.optionB}</p>
                  <p><span className="text-slate-300">Deadline:</span> {result.inferredInputs.deadline}</p>
                  <p><span className="text-slate-300">Risk tolerance:</span> {result.inferredInputs.riskTolerance}</p>
                  <p><span className="text-slate-300">Importance:</span> {result.inferredInputs.importance}</p>
                  <p><span className="text-slate-300">Stakes:</span> {result.inferredInputs.stakes.join(', ')}</p>
                </div>
              </Panel>
              <div className="grid gap-4 md:grid-cols-2">
                <CourtCard icon={<AlertTriangle size={18} />} title="Prosecutor" items={result.prosecutor} tone="danger" />
                <CourtCard icon={<ShieldCheck size={18} />} title="Defense" items={result.defense} tone="verdict" />
                <CourtCard icon={<FileSearch size={18} />} title="Missing Information" items={result.missingInformation} tone="amber" />
                <Panel>
                  <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Scale size={18} /> Verdict</h2>
                  <p className="text-sm leading-6 text-steel">{result.verdict}</p>
                  <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-white">{result.bestNextAction}</p>
                </Panel>
              </div>
              <CourtCard icon={<FileSearch size={18} />} title="Hidden assumptions" items={result.hiddenAssumptions} tone="amber" />
            </>
          ) : (
            <EmptyState text="Enter a decision situation and run the analysis. One sentence is enough for an initial verdict." />
          )}
        </div>
      </div>
    </div>
  );
}

function CourtCard({ icon, title, items, tone }: { icon: React.ReactNode; title: string; items: string[]; tone: 'danger' | 'verdict' | 'amber' }) {
  const color = tone === 'danger' ? 'text-danger' : tone === 'amber' ? 'text-amber' : 'text-verdict';
  return (
    <Panel>
      <h2 className={`mb-3 flex items-center gap-2 font-semibold ${color}`}>{icon}{title}</h2>
      <ul className="grid gap-2 text-sm leading-6 text-steel">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </Panel>
  );
}
