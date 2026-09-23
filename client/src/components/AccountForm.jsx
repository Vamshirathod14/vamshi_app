import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, ChipItem } from "./UI.jsx";
import { AccountTypeIcon } from "./CatIcon.jsx";

const ACC_TYPES = [
  { value: "cash", label: "Cash" },
  { value: "bank", label: "Bank" },
  { value: "card", label: "Card" },
  { value: "investment", label: "Investment" },
];

export default function AccountForm({ open, onClose, account, onSuccess }) {
  const { push } = useToast();
  const [name, setName] = useState(account?.name || "");
  const [type, setType] = useState(account?.type || "bank");
  const [balance, setBalance] = useState(account ? String(account.balance) : "");
  const [color, setColor] = useState(account?.color || "#1f6feb");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setName(account?.name || "");
      setType(account?.type || "bank");
      setBalance(account ? String(account.balance) : "");
      setColor(account?.color || "#1f6feb");
    }
  }, [open, account]);

  async function save() {
    if (!name.trim()) {
      push("Enter an account name.", "error");
      return;
    }
    const bal = parseFloat(balance);
    if (account) {
      setLoading(true);
      try {
        await api.patch(`/api/accounts/${account._id}`, { name: name.trim(), type, color });
        push("Account updated.", "success");
        onSuccess?.();
      } catch (err) {
        push(err.message, "error");
      } finally {
        setLoading(false);
      }
      return;
    }
    if (isNaN(bal) || bal < 0) {
      push("Enter a valid opening balance (0 or more).", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/accounts", { name: name.trim(), type, openingBalance: bal, color });
      push("Account created.", "success");
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={account ? "Edit Account" : "New Account"}>
      <Field label="Name">
        <input className="input" placeholder="e.g. HDFC Savings" value={name} onChange={(e) => setName(e.target.value)} maxLength={40} />
      </Field>
      <Field label="Type">
        <div className="chip-grid">
          {ACC_TYPES.map((t) => (
            <ChipItem key={t.value} active={type === t.value} onClick={() => setType(t.value)} icon={<AccountTypeIcon type={t.value} size={20} />} label={t.label} />
          ))}
        </div>
      </Field>
      <Field label="Accent colour">
        <div className="hstack" style={{ gap: 10, flexWrap: "wrap" }}>
          {["#1f6feb", "#8957e5", "#238636", "#d29922", "#cd3131", "#e992ce"].map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              aria-label={c}
              style={{
                width: 30, height: 30, borderRadius: "50%", background: c, cursor: "pointer",
                outline: color === c ? "2px solid var(--accent)" : "none", outlineOffset: 2,
              }}
            />
          ))}
        </div>
      </Field>
      {!account && (
        <Field label="Opening balance">
          <input className="input" inputMode="decimal" placeholder="0.00" value={balance} onChange={(e) => setBalance(e.target.value.replace(/[^\d.]/g, ""))} />
        </Field>
      )}
      <Button className="btn-block" variant="btn-primary" onClick={save} loading={loading}>
        {account ? "Save Changes" : "Add Account"}
      </Button>
    </Sheet>
  );
}