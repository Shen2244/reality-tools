import { useMemo, useState } from 'react';
import { ShieldAlert } from 'lucide-react';
import { HistoryItem, ScamInput } from '../types';
import { analyzeScam, formatScamExport } from '../utils/scamAnalysis';
import { scamExamples } from '../utils/examples';
import { downloadTxt } from '../utils/scoring';
import { ActionButtons, DemoPicker, EmptyState, Field, inputClass, Panel, ScoreBar, SummaryStrip, textareaClass, ValidationBox } from '../components/UI';

export function ScamLens({ onSave }: { onSave: (item: HistoryItem) => void }) {
  const [input, setInput] = useState<ScamInput>(scamExamples[0].input);
  const output = useMemo(() => analyzeScam(input), [input]);
  const exportText = formatScamExport(input, output);
  const canSave = output.validation.length === 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(),
      tool: 'ScamLens',
      title: `${input.channel}: ${input.message.slice(0, 52)}${input.message.length > 52 ? '...' : ''}`,
      createdAt: new Date().toISOString(),
      metricLabel: 'Risk',
      metricValue: output.riskScore,
      exportText,
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-acid">Defensive message analysis</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">ScamLens</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">Detects scam pressure patterns and suggests defensive verification steps. It does not help write deceptive messages.</p>
        </div>
        <ActionButtons onSave={save} onExport={() => downloadTxt('scamlens.txt', exportText)} disabled={!canSave} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.95fr_1.05fr]">
        <Panel className="grid gap-4">
          <DemoPicker examples={scamExamples} onPick={setInput} />
          <ValidationBox issues={output.validation} />
          <Field label="Channel">
            <select className={inputClass} value={input.channel} onChange={(event) => setInput({ ...input, channel: event.target.value as ScamInput['channel'] })}>
              <option>SMS</option><option>email</option><option>social media</option><option>marketplace</option><option>job offer</option><option>other</option>
            </select>
          </Field>
          <Field label="Suspicious message">
            <textarea className={`${textareaClass} min-h-80`} value={input.message} onChange={(event) => setInput({ ...input, message: event.target.value })} placeholder="Paste the full suspicious message..." />
          </Field>
          <div className="border border-line bg-ink/70 p-4">
            <h2 className="mb-3 text-sm font-semibold text-white">Highlighted message</h2>
            {input.message.trim() ? (
              <p className="whitespace-pre-wrap break-words text-sm leading-7 text-steel">{highlight(input.message, output.highlightedPhrases)}</p>
            ) : (
              <EmptyState text="Paste a message to highlight suspicious phrases and links." />
            )}
          </div>
        </Panel>

        <div className="grid gap-4">
          <Panel className="grid gap-4">
            <SummaryStrip label="Risk readout" text={output.summary} />
            <ScoreBar label="Risk" value={output.riskScore} tone="danger" />
            <div className="flex flex-wrap gap-2">
              {output.signals.length ? output.signals.map((signal) => (
                <span key={`${signal.label}-${signal.matches.join('-')}`} className="border border-danger/40 bg-danger/10 px-2.5 py-1 text-xs font-medium text-red-200">
                  {signal.label}
                </span>
              )) : <span className="border border-verdict/40 bg-verdict/10 px-2.5 py-1 text-xs text-cyan-100">no major signals</span>}
            </div>
          </Panel>
          <Panel>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><ShieldAlert size={18} /> Plain-language readout</h2>
            <p className="text-sm leading-6 text-steel">{output.explanation}</p>
            <p className="mt-4 border-l-2 border-acid pl-3 text-sm leading-6 text-white">{output.safeResponse}</p>
          </Panel>
          <Panel>
            <h2 className="mb-3 font-semibold text-white">Detected scam signals</h2>
            {output.signals.length ? (
              <div className="grid gap-3">
                {output.signals.map((signal) => (
                  <div key={`${signal.label}-${signal.matches.join(',')}`} className="border border-line bg-ink/50 p-3">
                    <div className="flex justify-between gap-3 text-sm">
                      <span className="font-semibold text-white">{signal.label}</span>
                      <span className="text-danger">+{signal.severity}</span>
                    </div>
                    <p className="mt-2 break-words text-xs leading-5 text-steel">{signal.matches.join(', ')}</p>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState text="No major scam signals found. Keep verifying sender identity before acting." />
            )}
          </Panel>
          <Panel>
            <h2 className="mb-3 font-semibold text-white">Checklist before taking action</h2>
            <ul className="grid gap-2 text-sm leading-6 text-steel">
              {output.checklist.map((item) => <li key={item}>- {item}</li>)}
            </ul>
          </Panel>
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
