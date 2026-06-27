import { HistoryItem } from '../types';

const KEY = 'reality-tools-history';

export const getHistory = (): HistoryItem[] => {
  try {
    return JSON.parse(localStorage.getItem(KEY) ?? '[]') as HistoryItem[];
  } catch {
    return [];
  }
};

export const saveHistoryItem = (item: HistoryItem) => {
  const next = [item, ...getHistory()].slice(0, 50);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
};

export const deleteHistoryItem = (id: string) => {
  const next = getHistory().filter((item) => item.id !== id);
  localStorage.setItem(KEY, JSON.stringify(next));
  return next;
};
