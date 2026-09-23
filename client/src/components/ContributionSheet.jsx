import { useState } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, MoneyInput, ChipItem } from "./UI.jsx";
import { AccountTypeIcon } from "./CatIcon.jsx";

export default function ContributionSheet({ open, onClose, goal, accounts, onSuccess }) {
  const { push } = useToast();
  const [amount, setAmount] = useState("");
  const [accountId, setAccountId] = useState("");
  const [fromGoal, setFromGoal] = useState(false);
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);

  async function save() {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      push("Enter a valid amount.", "error");
      return;
    }
    if (!accountId && !fromGoal) {
      push("Choose an account or select “track only”.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post(`/api/goals/${goal._id}/contributions`, {
        amount: val,
        accountId: accountId || null,
        note,
      });
      push("Contribution added 🎉", "success");
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={`Contribute to ${goal.emoji} ${goal.name}`}>
      <Field label="Amount">
        <MoneyInput value={amount} onChange={setAmount} placeholder="0" />
      </Field>
      <Field label="Move money from account">
        <div className="chip-grid">
          {accounts.map((a) => (
            <ChipItem
              key={a._id}
              active={accountId === a._id}
              onClick={() => { setAccountId(a._id); setFromGoal(false); }}
              icon={<AccountTypeIcon type={a.type} size={20} />}
              label={a.name}
            />
          ))}
        </div>
        <label className="hstack gap-s" style={{ marginTop: 12, fontSize: 13.5, cursor: "pointer" }}>
          <input type="checkbox" checked={fromGoal} onChange={(e) => { setFromGoal(e.target.checked); if (e.target.checked) setAccountId(""); }} />
          Track only (don't move any money)
        </label>
        {!fromGoal && (
          <div className="small muted" style={{ marginTop: 8 }}>
            This deducts the amount from the selected account and records it as savings (never as an expense).
          </div>
        )}
      </Field>
      <Field label="Note (optional)">
        <input className="input" placeholder="e.g. Monthly top-up" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
      </Field>
      <Button className="btn-block" onClick={save} loading={loading} variant="btn-primary">
        Add Contribution
      </Button>
    </Sheet>
  );
}