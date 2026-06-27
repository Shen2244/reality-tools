import type React from 'react';
import { BarChart3, FolderClock, Gavel, Home, Search, Users } from 'lucide-react';
import { ToolId } from '../types';

const tabs: { id: ToolId; label: string; icon: React.ComponentType<{ size?: number }> }[] = [
  { id: 'landing', label: 'Home', icon: Home },
  { id: 'decision', label: 'Decision Court', icon: Gavel },
  { id: 'scam', label: 'ScamLens', icon: Search },
  { id: 'meeting', label: 'Meeting Check', icon: Users },
  { id: 'history', label: 'History', icon: FolderClock },
];

interface FrameProps {
  active: ToolId;
  setActive: (tool: ToolId) => void;
  children: React.ReactNode;
}

export function Frame({ active, setActive, children }: FrameProps) {
  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-20 border-b border-line/80 bg-ink/88 backdrop-blur">
        <div className="mx-auto flex max-w-7xl flex-col gap-3 px-4 py-3 sm:px-6 lg:flex-row lg:items-center lg:justify-between">
          <button className="flex w-fit items-center gap-3 text-left" onClick={() => setActive('landing')}>
            <span className="grid h-10 w-10 place-items-center border border-acid/40 bg-acid/10 text-acid">
              <BarChart3 size={20} />
            </span>
            <span>
              <span className="block text-lg font-semibold tracking-normal text-white">Reality Tools</span>
              <span className="text-xs uppercase tracking-[0.28em] text-steel">Decision and risk lab</span>
            </span>
          </button>
          <nav className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 lg:mx-0 lg:px-0 lg:pb-0">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`flex h-10 shrink-0 items-center gap-2 border px-3 text-sm transition sm:px-3.5 ${
                    active === tab.id
                      ? 'border-acid/70 bg-acid/12 text-white'
                      : 'border-line bg-panel/70 text-steel hover:border-steel/60 hover:text-white'
                  }`}
                  title={tab.label}
                >
                  <Icon size={16} />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:py-8">{children}</main>
    </div>
  );
}
