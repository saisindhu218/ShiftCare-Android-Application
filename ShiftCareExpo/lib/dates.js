// Local-timezone date helpers. Never use toISOString() for calendar dates:
// it converts to UTC and is off by a day for anyone east of UTC (e.g. India).
const pad = (n) => String(n).padStart(2, "0");

export function toDateStr(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function todayStr() {
  return toDateStr(new Date());
}

export function monthStartStr() {
  const d = new Date();
  return toDateStr(new Date(d.getFullYear(), d.getMonth(), 1));
}
