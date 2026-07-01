import { useState } from 'react';
import type React from 'react';
import { CheckCircle2, HelpCircle, Mail, Pin, Users } from 'lucide-react';
import { AnalyzeSource, HistoryItem, MeetingAiResult, MeetingInput } from '../types';
import { analyzeWithAi, unavailableMessage } from '../utils/aiClient';
import { analyzeMeetingFallback, formatMeetingAiExport } from '../utils/meetingAnalysis';
import { meetingExamples } from '../utils/examples';
import { downloadTxt } from '../utils/scoring';
import { ActionButtons, DemoPicker, EmptyState, Field, inputClass, Panel, SummaryStrip, textareaClass } from '../components/UI';

export function MeetingRealityCheck({ onSave }: { onSave: (item: HistoryItem) => void }) {
  const [input, setInput] = useState<MeetingInput>(meetingExamples[0].input);
  const [result, setResult] = useState<MeetingAiResult | null>(null);
  const [source, setSource] = useState<AnalyzeSource>('fallback');
  const [notice, setNotice] = useState('');
  const [loading, setLoading] = useState(false);
  const exportText = result ? formatMeetingAiExport(input, result, source) : '';

  const analyze = async () => {
    if (!input.notes.trim()) {
      setNotice('Paste meeting notes first.');
      return;
    }
    setLoading(true);
    setNotice('');
    const preScan = analyzeMeetingFallback(input);
    try {
      const response = await analyzeWithAi({ tool: 'meetingRealityCheck', input, preScan });
      setResult(response.result as MeetingAiResult);
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
      tool: 'MeetingRealityCheck',
      title: input.goal || 'Meeting recap',
      createdAt: new Date().toISOString(),
      metricLabel: 'Actions',
      metricValue: result.actionItems.length,
      exportText,
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-acid">Meeting accountability</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">MeetingRealityCheck</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">Paste messy notes and extract decisions, owners, due dates, unresolved questions, vague residue, and a follow-up email.</p>
        </div>
        <ActionButtons onSave={save} onExport={() => downloadTxt('meeting-reality-check.txt', exportText)} disabled={!result} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="grid gap-4">
          <DemoPicker examples={meetingExamples} onPick={(next) => { setInput(next); setResult(null); setNotice(''); }} />
          <Field label="Raw meeting notes">
            <textarea className={`${textareaClass} min-h-96 text-base leading-7`} value={input.notes} onChange={(event) => setInput({ ...input, notes: event.target.value })} placeholder="Paste messy notes, bullets, decisions, questions, and loose discussion..." />
          </Field>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Meeting goal (optional)">
              <input className={inputClass} value={input.goal} onChange={(event) => setInput({ ...input, goal: event.target.value })} placeholder="Launch readiness" />
            </Field>
            <Field label="Attendees (optional)">
              <input className={inputClass} value={input.attendees} onChange={(event) => setInput({ ...input, attendees: event.target.value })} placeholder="Maya, Jordan, Alex" />
            </Field>
          </div>
          <button onClick={analyze} disabled={loading || !input.notes.trim()} className="border border-acid/70 bg-acid px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
            {loading ? 'Analyzing...' : 'Analyze Meeting Notes'}
          </button>
          {notice ? <p className="border border-amber/40 bg-amber/10 p-3 text-sm leading-6 text-orange-100">{notice}</p> : null}
        </Panel>

        <div className="grid gap-4">
          {result ? (
            <>
              <Panel>
                <SummaryStrip label={`${result.extractionQuality} extraction quality`} text={result.summary} />
              </Panel>
              <Section icon={<CheckCircle2 size={18} />} title="Decisions" items={result.decisions} />
              <Panel>
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Pin size={18} /> Action Items</h2>
                <div className="grid gap-2">
                  {result.actionItems.map((item) => (
                    <div key={`${item.owner}-${item.task}-${item.due}`} className="grid gap-1 border border-line bg-ink/50 p-3 sm:grid-cols-[9rem_1fr_auto] sm:items-start">
                      <span className="text-sm font-semibold text-acid">{item.owner}</span>
                      <span className="text-sm leading-6 text-steel">{item.task}</span>
                      <span className="w-fit border border-line px-2 py-1 text-xs text-steel">{item.due}</span>
                    </div>
                  ))}
                </div>
              </Panel>
              <Section icon={<HelpCircle size={18} />} title="Unresolved Questions" items={result.unresolvedQuestions} />
              <Section icon={<Users size={18} />} title="Vague Statements" items={result.vagueStatements} />
              <Panel>
                <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Mail size={18} /> Follow-up Email</h2>
                <pre className="thin-scrollbar max-h-72 overflow-auto whitespace-pre-wrap border border-line bg-ink/70 p-4 text-sm leading-6 text-steel">{result.followUpEmail}</pre>
              </Panel>
              <Section icon={<Pin size={18} />} title="Next Meeting Agenda" items={result.nextAgenda} />
            </>
          ) : (
            <EmptyState text="Paste meeting notes and run the analysis. Goal and attendees are optional but improve extraction quality." />
          )}
        </div>
      </div>
    </div>
  );
}

function Section({ icon, title, items }: { icon: React.ReactNode; title: string; items: string[] }) {
  return (
    <Panel>
      <h2 className="mb-3 flex items-center gap-2 font-semibold text-white">{icon} {title}</h2>
      <ul className="grid gap-2 text-sm leading-6 text-steel">
        {items.map((item) => <li key={item}>- {item}</li>)}
      </ul>
    </Panel>
  );
}
