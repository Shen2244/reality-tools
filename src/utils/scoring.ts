export const clamp = (value: number, min = 0, max = 100) => Math.min(max, Math.max(min, Math.round(value)));

export const levelWeight = (level: 'low' | 'medium' | 'high') => {
  if (level === 'high') return 30;
  if (level === 'medium') return 18;
  return 8;
};

export const daysUntil = (dateValue: string) => {
  if (!dateValue) return null;
  const today = new Date();
  const target = new Date(`${dateValue}T23:59:59`);
  if (Number.isNaN(target.getTime())) return null;
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
};

export const downloadTxt = (filename: string, content: string) => {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
};
