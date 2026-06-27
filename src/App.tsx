import { useEffect, useState } from 'react';
import { Frame } from './components/Frame';
import { History } from './components/History';
import { Landing } from './components/Landing';
import { DecisionCourt } from './tools/DecisionCourt';
import { MeetingRealityCheck } from './tools/MeetingRealityCheck';
import { ScamLens } from './tools/ScamLens';
import { HistoryItem, ToolId } from './types';
import { deleteHistoryItem, getHistory, saveHistoryItem } from './utils/history';

export default function App() {
  const [active, setActive] = useState<ToolId>('landing');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  useEffect(() => {
    setHistory(getHistory());
  }, []);

  const save = (item: HistoryItem) => {
    setHistory(saveHistoryItem(item));
    setActive('history');
  };

  const remove = (id: string) => {
    setHistory(deleteHistoryItem(id));
  };

  return (
    <Frame active={active} setActive={setActive}>
      {active === 'landing' && <Landing openTool={setActive} />}
      {active === 'decision' && <DecisionCourt onSave={save} />}
      {active === 'scam' && <ScamLens onSave={save} />}
      {active === 'meeting' && <MeetingRealityCheck onSave={save} />}
      {active === 'history' && <History items={history} onDelete={remove} />}
    </Frame>
  );
}
