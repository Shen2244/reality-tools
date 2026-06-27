import { Trash2, Download } from 'lucide-react';
import { HistoryItem } from '../types';
import { downloadTxt } from '../utils/scoring';
import { EmptyState, Panel } from './UI';

export function History({ items, onDelete }: { items: HistoryItem[]; onDelete: (id: string) => void }) {
  return (
    <div className="grid gap-5">
      <div className="border-b border-line pb-5">
        <p className="text-xs uppercase tracking-[0.28em] text-acid">Saved local results</p>
        <h1 className="mt-2 text-3xl font-semibold text-white">History</h1>
      </div>
      {items.length === 0 ? (
        <EmptyState text="No saved results yet. Run a tool and press Save to keep a local record." />
      ) : (
        <div className="grid gap-3">
          {items.map((item) => (
            <Panel key={item.id} className="grid gap-4 lg:grid-cols-[1fr_auto] lg:items-center">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="border border-verdict/40 bg-verdict/10 px-2 py-1 text-xs font-medium text-cyan-100">{item.tool}</span>
                  {item.metricLabel && (
                    <span className="border border-line bg-ink/70 px-2 py-1 text-xs text-steel">
                      {item.metricLabel}: {item.metricValue}
                    </span>
                  )}
                </div>
                <h2 className="mt-3 text-lg font-semibold text-white">{item.title}</h2>
                <p className="mt-1 text-sm text-steel">{new Date(item.createdAt).toLocaleString()}</p>
              </div>
              <div className="flex gap-2">
                <button className="grid h-10 w-10 place-items-center border border-line bg-ink/70 text-steel hover:text-white" title="Export" onClick={() => downloadTxt(`${item.tool.toLowerCase().replace(/\s+/g, '-')}.txt`, item.exportText)}>
                  <Download size={16} />
                </button>
                <button className="grid h-10 w-10 place-items-center border border-danger/40 bg-danger/10 text-red-200 hover:bg-danger/20" title="Delete" onClick={() => onDelete(item.id)}>
                  <Trash2 size={16} />
                </button>
              </div>
            </Panel>
          ))}
        </div>
      )}
    </div>
  );
}
