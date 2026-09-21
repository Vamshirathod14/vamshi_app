export function toDateOnly(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfDay(date = new Date()) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function endOfMonth(date = new Date()) {
  const d = new Date(date);
  d.setMonth(d.getMonth() + 1, 0);
  d.setHours(23, 59, 59, 999);
  return d;
}

export function startOfWeek(date = new Date()) {
  const d = new Date(date);
  const day = d.getDay() === 0 ? 6 : d.getDay() - 1;
  d.setDate(d.getDate() - day);
  d.setHours(0, 0, 0, 0);
  return d;
}

export function startOfYear(date = new Date()) {
  const d = new Date(date);
  d.setMonth(0, 1);
  d.setHours(0, 0, 0, 0);
  return d;
}

/** "2026-09" style month key from a date */
export function monthKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export function monthBounds(key) {
  const [y, m] = key.split("-").map(Number);
  return { start: new Date(y, m - 1, 1), end: new Date(y, m, 0, 23, 59, 59, 999) };
}

/** Combine "YYYY-MM-DD" date and "HH:mm" time into a Date.
 *
 * The user's wall-clock is resolved CLIENT-side: forms send an ISO datetime
 * ("2026-09-21T12:45:00.000+05:30" — absolute instant). When an ISO string
 * arrives, it is passed through unchanged so the SERVER timezone (Render = UTC,
 * laptop = IST) can never skew when a reminder fires. The legacy
 * "YYYY-MM-DD" + "HH:mm" combo is kept for backward compatibility.
 */
export function combineDateTime(dateStr, timeStr) {
  if (dateStr instanceof Date) {
    if (Number.isNaN(dateStr.getTime())) return new Date();
    return dateStr;
  }
  if (typeof dateStr === "string" && /T\d{2}/.test(dateStr)) {
    const d = new Date(dateStr);
    return Number.isNaN(d.getTime()) ? new Date() : d;
  }
  const d = new Date(dateStr);
  if (timeStr) {
    const [h, min] = timeStr.split(":").map(Number);
    if (!Number.isFinite(h) || !Number.isFinite(min)) return d;
    d.setHours(h, min, 0, 0);
  }
  return Number.isNaN(d.getTime()) ? new Date() : d;
}

export function toDateInputValue(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
}

export function toTimeInputValue(date) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function formatDayLabel(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

export function formatMonthYear(date) {
  return new Date(date).toLocaleDateString("en-IN", {
    month: "long",
    year: "numeric",
  });
}

export function relativeDayLabel(date, today = new Date()) {
  const d = toDateOnly(date);
  const t = toDateOnly(today);
  const diff = Math.round((d - t) / 86400000);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  return d.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}