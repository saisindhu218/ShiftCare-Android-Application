export const SHIFT_TYPES = [
  { key: "MORNING", label: "Morning", start: "08:00 AM", end: "02:00 PM" },
  { key: "DAY", label: "Day", start: "08:00 AM", end: "05:00 PM" },
  { key: "EVENING", label: "Evening", start: "02:00 PM", end: "10:00 PM" },
  { key: "NIGHT", label: "Night", start: "10:00 PM", end: "08:00 AM" },
];

export function isValidDate(str) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(str)) return false;
  const [y, m, d] = str.split("-").map(Number);
  const dt = new Date(y, m - 1, d);
  return dt.getFullYear() === y && dt.getMonth() === m - 1 && dt.getDate() === d;
}
