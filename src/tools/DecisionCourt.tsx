import { useMemo, useState } from 'react';
import type React from 'react';
import { AlertTriangle, FileSearch, Scale, ShieldCheck } from 'lucide-react';
import { DecisionInput, HistoryItem } from '../types';
import { analyzeDecision, formatDecisionExport } from '../utils/decisionAnalysis';
import { decisionExamples } from '../utils/examples';
import { downloadTxt } from '../utils/scoring';
import { ActionButtons, DemoPicker, Field, inputClass, Panel, ScoreBar, SummaryStrip, textareaClass, ValidationBox } from '../components/UI';

export function DecisionCourt({ onSave }: { onSave: (item: HistoryItem) => void }) {
  const [input, setInput] = useState<DecisionInput>(decisionExamples[0].input);
  const [appeal, setAppeal] = useState('');
  const output = useMemo(() => analyzeDecision(input, appeal), [input, appeal]);
  const exportText = formatDecisionExport(input, output);
  const canSave = output.validation.length === 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(),
      tool: 'Decision Court',
      title: input.question || 'Untitled decision',
      createdAt: new Date().toISOString(),
      metricLabel: 'Confidence',
      metricValue: output.confidenceScore,
      exportText,
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-acid">Courtroom analysis</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">Decision Court</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">A rule-based debate that exposes risk drivers, hidden assumptions, and the next fact that would change the verdict.</p>
        </div>
        <ActionButtons onSave={save} onExport={() => downloadTxt('decision-court.txt', exportText)} disabled={!canSave} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.82fr_1.18fr]">
        <Panel className="grid gap-4">
          <DemoPicker examples={decisionExamples} onPick={(next) => { setInput(next); setAppeal(''); }} />
          <ValidationBox issues={output.validation} />
          <Field label="Decision question">
            <input className={inputClass} value={input.question} onChange={(event) => setInput({ ...input, question: event.target.value })} placeholder="Should we..." />
          </Field>
          <Field label="Context">
            <textarea className={`${textareaClass} min-h-36`} value={input.context} onChange={(event) => setInput({ ...input, context: event.target.value })} placeholder="Constraints, stakeholders, timing, downside, reversibility..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Option A">
              <input className={inputClass} value={input.optionA} onChange={(event) => setInput({ ...input, optionA: event.target.value })} />
            </Field>
            <Field label="Option B">
              <input className={inputClass} value={input.optionB} onChange={(event) => setInput({ ...input, optionB: event.target.value })} />
            </Field>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            <Field label="Deadline">
              <input type="date" className={inputClass} value={input.deadline} onChange={(event) => setInput({ ...input, deadline: event.target.value })} />
            </Field>
            <Field label="Risk tolerance">
              <select className={inputClass} value={input.riskTolerance} onChange={(event) => setInput({ ...input, riskTolerance: event.target.value as DecisionInput['riskTolerance'] })}>
                <option>low</option><option>medium</option><option>high</option>
              </select>
            </Field>
            <Field label="Importance">
              <select className={inputClass} value={input.importance} onChange={(event) => setInput({ ...input, importance: event.target.value as DecisionInput['importance'] })}>
                <option>low</option><option>medium</option><option>high</option>
              </select>
            </Field>
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel className="grid gap-4">
            <SummaryStrip label={output.verdictLabel} text={output.summary} />
            <div className="grid gap-3 sm:grid-cols-2">
              <ScoreBar label="Risk" value={output.riskScore} tone="danger" />
              <ScoreBar label="Confidence" value={output.confidenceScore} tone="acid" />
            </div>
            <DriverList title="Risk drivers" items={output.riskDrivers} />
          </Panel>
          <div className="grid gap-4 md:grid-cols-2">
            <CourtCard icon={<AlertTriangle size={18} />} title="Prosecutor" items={output.prosecutor} tone="danger" />
            <CourtCard icon={<ShieldCheck size={18} />} title="Defense" items={output.defense} tone="verdict" />
            <CourtCard icon={<FileSearch size={18} />} title="Witnesses" items={output.witnesses} tone="amber" />
            <Panel>
              <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Scale size={18} /> Judge</h2>
              <p className="text-sm leading-6 text-steel">{output.judge}</p>
              <p className="mt-4 border-t border-line pt-4 text-sm leading-6 text-white">{output.bestNextAction}</p>
            </Panel>
          </div>
          <Panel>
            <Field label="Appeal evidence">
              <textarea className={textareaClass} value={appeal} onChange={(event) => setAppeal(event.target.value)} placeholder="Add new evidence after the verdict..." />
            </Field>
            {output.appealSummary ? (
              <p className="mt-4 border-l-2 border-acid pl-3 text-sm leading-6 text-slate-200">{output.appealSummary}</p>
            ) : (
              <p className="mt-3 text-sm text-steel">Add new evidence to see what changed in the verdict.</p>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function DriverList({ title, items }: { title: string; items: string[] }) {
  return (
    <div>
      <h2 className="mb-2 text-sm font-semibold text-white">{title}</h2>
      <div className="flex flex-wrap gap-2">
        {items.map((item) => <span key={item} className="border border-line bg-ink/70 px-2.5 py-1 text-xs text-steel">{item}</span>)}
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
