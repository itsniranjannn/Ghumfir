// Nepali-style digit grouping (1,23,456) for rupees.
export const npr = (n) => `Rs ${Math.round(Number(n) || 0).toLocaleString('en-IN')}`;
export const num = (n) => Math.round(Number(n) || 0).toLocaleString('en-IN');
export const compactNpr = (n) => {
  n = Number(n) || 0;
  if (n >= 100000) return `Rs ${(n / 100000).toFixed(n >= 1000000 ? 0 : 1)}L`;
  if (n >= 1000) return `Rs ${(n / 1000).toFixed(0)}k`;
  return `Rs ${n}`;
};
export const hours = (h) => {
  h = Number(h) || 0;
  const whole = Math.floor(h);
  const mins = Math.round((h - whole) * 60);
  return mins ? `${whole}h ${mins}m` : `${whole}h`;
};
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const fmtDate = (d, opts = { day: 'numeric', month: 'short' }) =>
  d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', opts) : '';
export const weekday = (d) => (d ? new Date(`${String(d).slice(0, 10)}T00:00:00`).toLocaleDateString('en-GB', { weekday: 'short' }) : '');
export const cap = (s) => String(s || '').charAt(0).toUpperCase() + String(s || '').slice(1);
export const plural = (n, word, many = `${word}s`) => `${n} ${n === 1 ? word : many}`;
