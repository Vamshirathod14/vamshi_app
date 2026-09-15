export function formatINR(value, { compact = false, signed = false } = {}) {
  const n = Number(value) || 0;
  const sign = signed && n > 0 ? "+" : n < 0 ? "-" : "";
  if (compact && Math.abs(n) >= 100000) {
    return `${sign}₹${(Math.abs(n) / 100000).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}L`;
  }
  return `${sign}₹${Math.abs(n).toLocaleString("en-IN", {
    maximumFractionDigits: 2,
    minimumFractionDigits: 0,
  })}`;
}

export function moneyInputValue(v) {
  const n = Number(v) || 0;
  return n % 1 === 0 ? String(n) : n.toFixed(2);
}

export function formatDate(date) {
  if (!date) return "";
  const d = new Date(date);
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

export function formatDateFull(date) {
  if (!date) return "";
  return new Date(date).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatMonthYear(date) {
  return new Date(date).toLocaleDateString("en-IN", { month: "long", year: "numeric" });
}

export function timeLabel(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hh = Number(h);
  const suffix = hh >= 12 ? "PM" : "AM";
  const hr = hh % 12 || 12;
  return `${hr}:${m} ${suffix}`;
}

export function timeAgo(date) {
  const d = new Date(date).getTime();
  const diff = Date.now() - d;
  const mins = Math.round(diff / 60000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.round(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return formatDate(date);
}

export function dayKey(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function groupDayLabel(key, todayKey) {
  if (key === todayKey) return "Today";
  const d = new Date(key);
  const yesterday = new Date(new Date(todayKey));
  yesterday.setDate(yesterday.getDate() - 1);
  const prev = new Date(new Date(todayKey));
  prev.setDate(prev.getDate() - 2);
  if (dayKey(yesterday) === key) return "Yesterday";
  if (dayKey(prev) === key) return "2 days ago";
  return d.toLocaleDateString("en-IN", { weekday: "short", month: "short", day: "numeric" });
}

export function toDateInput(date = new Date()) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function toTimeInput(date = new Date()) {
  const d = new Date(date);
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}

export function greeting() {
  const h = new Date().getHours();
  if (h < 5) return "Good night";
  if (h < 12) return "Good morning";
  if (h < 17) return "Good afternoon";
  return "Good evening";
}

export function CATEGORY_META(name) {
  const fallback = { emoji: "📦", color: "#64748b" };
  const map = {
    Food: { emoji: "🍔", color: "#f59e0b" },
    Transport: { emoji: "🚗", color: "#3b82f6" },
    Home: { emoji: "🏠", color: "#8b5cf6" },
    Shopping: { emoji: "🛒", color: "#ec4899" },
    "Bills & Recharge": { emoji: "📱", color: "#06b6d4" },
    Software: { emoji: "💻", color: "#6366f1" },
    Education: { emoji: "🎓", color: "#14b8a6" },
    Entertainment: { emoji: "🎬", color: "#f43f5e" },
    Travel: { emoji: "✈️", color: "#0ea5e9" },
    Health: { emoji: "🏥", color: "#ef4444" },
    Personal: { emoji: "👕", color: "#a855f7" },
    Other: { emoji: "📦", color: "#64748b" },
    Salary: { emoji: "💼", color: "#10b981" },
    Freelance: { emoji: "🧑‍💻", color: "#22c55e" },
    Business: { emoji: "🏪", color: "#84cc16" },
  };
  return map[name] || fallback;
}

export const PAYMENT_METHOD_LABELS = {
  upi: "UPI",
  cash: "Cash",
  "credit-card": "Credit Card",
  "debit-card": "Debit Card",
  "bank-transfer": "Bank Transfer",
  other: "Other",
};

export const ACCOUNT_TYPE_LABELS = {
  bank: "Bank",
  cash: "Cash",
  upi: "UPI Wallet",
  "credit-card": "Credit Card",
  "debit-card": "Debit Card",
  other: "Other",
};

export const PAYMENT_ICONS = {
  upi: "📱",
  cash: "💵",
  "credit-card": "💳",
  "debit-card": "💳",
  "bank-transfer": "🏦",
  other: "💷",
};