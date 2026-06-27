import { ArrowRight, Gavel, Search, Users } from 'lucide-react';
import { ToolId } from '../types';
import { Panel } from './UI';

const tools = [
  {
    id: 'decision',
    icon: Gavel,
    title: 'Decision Court',
    copy: 'Put a hard choice on trial with arguments, witnesses, verdict, confidence, and appeal evidence.',
    stat: 'Risk + confidence verdict',
  },
  {
    id: 'scam',
    icon: Search,
    title: 'ScamLens',
    copy: 'Inspect suspicious messages for pressure tactics, risky links, impersonation, and unsafe requests.',
    stat: 'Signal-based threat read',
  },
  {
    id: 'meeting',
    icon: Users,
    title: 'MeetingRealityCheck',
    copy: 'Convert messy notes into decisions, owners, unanswered questions, and a follow-up draft.',
    stat: 'Owners + agenda output',
  },
] as const;

export function Landing({ openTool }: { openTool: (tool: ToolId) => void }) {
  return (
    <div className="grid gap-6">
      <section className="grid gap-6 border-b border-line pb-6 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="max-w-3xl">
          <p className="mb-3 text-xs uppercase tracking-[0.34em] text-acid">Reality Tools</p>
          <h1 className="text-4xl font-semibold tracking-normal text-white sm:text-5xl">Practical tools for decisions that deserve pressure.</h1>
          <p className="mt-4 text-base leading-7 text-steel">
            Stress-test tradeoffs, scan suspicious messages, and turn meeting fog into accountable next steps.
          </p>
        </div>
        <div className="grid gap-2 sm:grid-cols-3 lg:w-[32rem]">
          {['No backend', 'Rule-based', 'Local history'].map((item) => (
            <div key={item} className="border border-line bg-panel/70 px-3 py-3 text-sm font-semibold text-white">
              <span className="block text-xs uppercase tracking-[0.2em] text-steel">Built for</span>
              {item}
            </div>
          ))}
        </div>
      </section>
      <div className="grid gap-4 md:grid-cols-3">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <Panel key={tool.id} className="flex min-h-64 flex-col justify-between">
              <div>
                <div className="mb-5 grid h-12 w-12 place-items-center border border-verdict/50 bg-verdict/10 text-verdict">
                  <Icon size={22} />
                </div>
                <h2 className="text-xl font-semibold text-white">{tool.title}</h2>
                <p className="mt-3 text-sm leading-6 text-steel">{tool.copy}</p>
                <p className="mt-4 w-fit border border-line bg-ink/70 px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.16em] text-acid">{tool.stat}</p>
              </div>
              <button onClick={() => openTool(tool.id)} className="mt-6 flex w-full items-center justify-between border border-line bg-ink/80 px-4 py-3 text-sm font-semibold text-white hover:border-acid/70">
                Open Tool <ArrowRight size={17} />
              </button>
            </Panel>
          );
        })}
      </div>
    </div>
  );
}
