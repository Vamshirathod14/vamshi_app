import { Account } from "../models/Account.js";
import { addMoney, subtractMoney, roundMoney } from "../utils/money.js";

/**
 * Apply a signed delta (in currency units) to an account balance.
 * Returns the updated document.
 */
export async function adjustAccountBalance(accountId, delta) {
  if (!accountId) return null;
  const account = await Account.findById(accountId);
  if (!account) return null;
  const next = roundMoney(addMoney(account.balance, delta));
  await Account.updateOne({ _id: account._id }, { $set: { balance: next } });
  account.balance = next;
  return account;
}

/**
 * Compute the net effect of a transaction on its accounts BEFORE persisting.
 * Returns list of { accountId, delta } or a throw describing the error.
 */
export function computeAccountDeltas({ type, accountId, fromAccountId, toAccountId, amount }) {
  if (type === "expense" || type === "savings") {
    return [{ accountId: accountId ?? toAccountId ?? fromAccountId, delta: -amount }];
  }
  if (type === "income") {
    return [{ accountId: accountId ?? toAccountId ?? fromAccountId, delta: amount }];
  }
  if (type === "transfer") {
    if (!fromAccountId || !toAccountId) throw new Error("Transfer needs from and to accounts.");
    return [
      { accountId: fromAccountId, delta: -amount },
      { accountId: toAccountId, delta: amount },
    ];
  }
  return [];
}

export async function applyDeltas(deltas) {
  const results = [];
  for (const { accountId, delta } of deltas) {
    if (!accountId || delta === 0) continue;
    const account = await adjustAccountBalance(accountId, delta);
    results.push({ accountId, delta, balance: account?.balance ?? null });
  }
  return results;
}

export async function getTotalBalance(userId) {
  const [result] = await Account.aggregate([
    { $match: { userId } },
    { $group: { _id: null, total: { $sum: "$balance" } } },
  ]);
  return roundMoney(result?.total ?? 0);
}