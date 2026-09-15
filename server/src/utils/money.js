/**
 * Monetary values are stored as INR with 2-decimal precision
 * (integer paise under the hood via rounding helpers).
 */

export function roundMoney(value) {
  const n = Number(value);
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

export function toPaise(value) {
  return Math.round(roundMoney(value) * 100);
}

export function fromPaise(paise) {
  return roundMoney(paise / 100);
}

export function addMoney(...values) {
  return roundMoney(values.reduce((sum, v) => sum + toPaise(v), 0) / 100);
}

export function subtractMoney(a, b) {
  return roundMoney((toPaise(a) - toPaise(b)) / 100);
}

export function formatINR(value, { compact = false } = {}) {
  const n = roundMoney(value);
  if (compact && Math.abs(n) >= 100000) {
    const lakh = n / 100000;
    return `₹${(Math.round(lakh * 100) / 100).toLocaleString("en-IN", {
      maximumFractionDigits: 1,
    })}L`;
  }
  return `₹${n.toLocaleString("en-IN", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}`;
}