// Date + formatting helpers ported verbatim from app.js.

export function getDateInputValue(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function parseDateInputValue(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value || '');
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function formatDateForPicker(value) {
  const date = parseDateInputValue(value);
  if (!date) return 'Select date';
  return `${String(date.getDate()).padStart(2, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${date.getFullYear()}`;
}

export function formatDate(dateString) {
  if (!dateString) return 'No date';
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return 'No date';
  return date.toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

export function getMonthKey(date) {
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${date.getFullYear()}-${month}`;
}

export function getPreviousMonthKey(monthKey) {
  const [year, month] = monthKey.split('-').map(Number);
  return getMonthKey(new Date(year, month - 2, 1));
}

export function getRecentMonths(count) {
  const formatter = new Intl.DateTimeFormat('en', { month: 'short' });
  const now = new Date();
  const months = [];
  for (let index = count - 1; index >= 0; index--) {
    const date = new Date(now.getFullYear(), now.getMonth() - index, 1);
    months.push({
      key: `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`,
      label: formatter.format(date)
    });
  }
  return months;
}

export function getLastTenMonths() {
  return getRecentMonths(10);
}

export function getMonthLabel(monthKey = '') {
  if (!monthKey) return 'N/A';
  const [year, month] = monthKey.split('-').map(Number);
  if (!year || !month) return 'N/A';
  return new Intl.DateTimeFormat('en', { month: 'short', year: 'numeric' }).format(new Date(year, month - 1, 1));
}

export function getInitials(text = '') {
  const words = String(text || '').trim().split(/\s+/).filter(Boolean);
  if (words.length === 0) return 'EX';
  return words.slice(0, 2).map(word => word[0]).join('').toUpperCase();
}

export function escapeHtmlJs(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function normalizeSearchText(value) {
  return String(value || '').trim().toLowerCase();
}

export function debounce(callback, delay = 180) {
  let timeoutId;
  return (...args) => {
    window.clearTimeout(timeoutId);
    timeoutId = window.setTimeout(() => callback(...args), delay);
  };
}

export function getTrendMeta(current, previous) {
  const currentValue = Number(current) || 0;
  const previousValue = Number(previous) || 0;
  if (currentValue === 0 && previousValue === 0) {
    return { text: 'No data yet', className: 'trend-neutral' };
  }
  if (previousValue === 0) {
    return { text: 'New this month', className: 'trend-up' };
  }
  const percent = Math.round(((currentValue - previousValue) / previousValue) * 100);
  if (percent === 0) {
    return { text: '0% last month', className: 'trend-neutral' };
  }
  return {
    text: `${percent > 0 ? '+' : ''}${percent}% last month`,
    className: percent > 0 ? 'trend-up' : 'trend-down'
  };
}
