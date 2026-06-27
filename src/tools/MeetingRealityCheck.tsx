import { useMemo, useState } from 'react';
import type React from 'react';
import { CheckCircle2, HelpCircle, Mail, Pin, Users } from 'lucide-react';
import { HistoryItem, MeetingInput } from '../types';
import { analyzeMeeting, formatMeetingExport } from '../utils/meetingAnalysis';
import { meetingExamples } from '../utils/examples';
import { downloadTxt } from '../utils/scoring';
import { ActionButtons, DemoPicker, Field, inputClass, Panel, SummaryStrip, textareaClass, ValidationBox } from '../components/UI';

export function MeetingRealityCheck({ onSave }: { onSave: (item: HistoryItem) => void }) {
  const [input, setInput] = useState<MeetingInput>(meetingExamples[0].input);
  const output = useMemo(() => analyzeMeeting(input), [input]);
  const exportText = formatMeetingExport(input, output);
  const canSave = output.validation.length === 0;

  const save = () => {
    if (!canSave) return;
    onSave({
      id: crypto.randomUUID(),
      tool: 'MeetingRealityCheck',
      title: input.goal || 'Untitled meeting',
      createdAt: new Date().toISOString(),
      metricLabel: 'Actions',
      metricValue: output.actionItems.length,
      exportText,
    });
  };

  return (
    <div className="grid gap-5">
      <div className="flex flex-col justify-between gap-4 border-b border-line pb-5 lg:flex-row lg:items-end">
        <div>
          <p className="text-xs uppercase tracking-[0.28em] text-acid">Meeting accountability</p>
          <h1 className="mt-2 text-3xl font-semibold text-white sm:text-4xl">MeetingRealityCheck</h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-steel">Extracts decisions, owners, due dates, open questions, and meeting residue that still needs a real action.</p>
        </div>
        <ActionButtons onSave={save} onExport={() => downloadTxt('meeting-reality-check.txt', exportText)} disabled={!canSave} />
      </div>

      <div className="grid gap-5 xl:grid-cols-[0.9fr_1.1fr]">
        <Panel className="grid gap-4">
          <DemoPicker examples={meetingExamples} onPick={setInput} />
          <ValidationBox issues={output.validation} />
          <Field label="Meeting goal">
            <input className={inputClass} value={input.goal} onChange={(event) => setInput({ ...input, goal: event.target.value })} placeholder="What was this meeting supposed to decide?" />
          </Field>
          <Field label="Attendees">
            <input className={inputClass} value={input.attendees} onChange={(event) => setInput({ ...input, attendees: event.target.value })} placeholder="Maya, Jordan, Alex" />
          </Field>
          <Field label="Raw meeting notes">
            <textarea className={`${textareaClass} min-h-96`} value={input.notes} onChange={(event) => setInput({ ...input, notes: event.target.value })} placeholder="Paste notes, bullets, decisions, questions, and loose discussion..." />
          </Field>
        </Panel>

        <div className="grid gap-4">
          <Panel>
            <SummaryStrip label="Extraction summary" text={output.summary} />
          </Panel>
          <Section icon={<CheckCircle2 size={18} />} title="Decisions" items={output.decisions} />
          <Panel>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Pin size={18} /> Action Items</h2>
            <div className="grid gap-2">
              {output.actionItems.map((item) => (
                <div key={`${item.owner}-${item.text}`} className="grid gap-1 border border-line bg-ink/50 p-3 sm:grid-cols-[9rem_1fr_auto] sm:items-start">
                  <span className="text-sm font-semibold text-acid">{item.owner}</span>
                  <span className="text-sm leading-6 text-steel">{item.text}</span>
                  <span className="w-fit border border-line px-2 py-1 text-xs text-steel">{item.due ?? 'date needed'}</span>
                </div>
              ))}
            </div>
          </Panel>
          <Section icon={<HelpCircle size={18} />} title="Unresolved Questions" items={output.unresolvedQuestions} />
          <Section icon={<Users size={18} />} title="Vague Statements" items={output.vagueStatements} />
          <Panel>
            <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><Mail size={18} /> Follow-up Email</h2>
            <pre className="thin-scrollbar max-h-72 overflow-auto whitespace-pre-wrap border border-line bg-ink/70 p-4 text-sm leading-6 text-steel">{output.followUpEmail}</pre>
          </Panel>
          <Section icon={<Pin size={18} />} title="Next Meeting Agenda" items={output.nextAgenda} />
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
