import { AlertCircle, Download, Save } from 'lucide-react';

export function Panel({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <section className={`border border-line bg-panel/88 p-4 shadow-edge sm:p-5 ${className}`}>{children}</section>;
}

export function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-2 text-sm text-steel">
      <span className="font-medium text-slate-300">{label}</span>
      {children}
    </label>
  );
}

export const inputClass = 'w-full border border-line bg-ink/80 px-3 py-2.5 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-verdict focus:bg-ink';
export const textareaClass = `${inputClass} min-h-32 resize-y leading-6`;

export function ScoreBar({ label, value, tone = 'verdict' }: { label: string; value: number; tone?: 'verdict' | 'danger' | 'acid' }) {
  const color = tone === 'danger' ? 'bg-danger' : tone === 'acid' ? 'bg-acid' : 'bg-verdict';
  return (
    <div className="grid gap-2">
      <div className="flex items-center justify-between text-sm">
        <span className="text-steel">{label}</span>
        <span className="font-semibold text-white">{value}/100</span>
      </div>
      <div className="h-2 overflow-hidden bg-ink">
        <div className={`h-full ${color}`} style={{ width: `${value}%` }} />
      </div>
    </div>
  );
}

export function ActionButtons({ onSave, onExport, disabled }: { onSave: () => void; onExport: () => void; disabled?: boolean }) {
  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={onSave} disabled={disabled} className="flex items-center gap-2 border border-acid/60 bg-acid px-4 py-2 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-40">
        <Save size={16} /> Save
      </button>
      <button onClick={onExport} disabled={disabled} className="flex items-center gap-2 border border-line bg-ink/80 px-4 py-2 text-sm text-white hover:border-steel disabled:cursor-not-allowed disabled:opacity-40">
        <Download size={16} /> Export .txt
      </button>
    </div>
  );
}

export function EmptyState({ text }: { text: string }) {
  return <div className="border border-dashed border-line bg-ink/40 p-5 text-sm leading-6 text-steel">{text}</div>;
}

export function ValidationBox({ issues }: { issues: string[] }) {
  if (!issues.length) return null;
  return (
    <div className="border border-amber/40 bg-amber/10 p-3 text-sm text-amber">
      <div className="mb-2 flex items-center gap-2 font-semibold text-orange-100">
        <AlertCircle size={16} /> Needs more signal
      </div>
      <ul className="grid gap-1 leading-6 text-orange-100/85">
        {issues.map((issue) => <li key={issue}>- {issue}</li>)}
      </ul>
    </div>
  );
}

export function DemoPicker<T>({ examples, onPick }: { examples: Array<{ name: string; input: T }>; onPick: (input: T) => void }) {
  return (
    <div className="grid gap-2">
      <span className="text-xs uppercase tracking-[0.22em] text-steel">Demo examples</span>
      <div className="grid gap-2 sm:grid-cols-3">
        {examples.map((example) => (
          <button
            key={example.name}
            className="border border-line bg-ink/70 px-3 py-2 text-left text-xs font-semibold text-slate-200 hover:border-acid/60 hover:text-white"
            onClick={() => onPick(example.input)}
          >
            {example.name}
          </button>
        ))}
      </div>
    </div>
  );
}

export function SummaryStrip({ label, text }: { label: string; text: string }) {
  return (
    <div className="border-l-2 border-acid bg-acid/8 px-4 py-3">
      <p className="text-xs uppercase tracking-[0.22em] text-acid">{label}</p>
      <p className="mt-1 text-sm leading-6 text-white">{text}</p>
    </div>
  );
}
