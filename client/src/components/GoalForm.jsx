import { useState } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, MoneyInput } from "./UI.jsx";
import { toDateInput } from "../utils/format.js";

export default function GoalForm({ open, onClose, onSuccess }) {
  const { push } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [emoji, setEmoji] = useState("🎯");
  const [target, setTarget] = useState("");
  const [current, setCurrent] = useState("");
  const [date, setDate] = useState("");

  const EMOJIS = ["🎯", "✈️", "🚗", "🖥️", "🏠", "🚴", "🎓", "💼", "💎", "🛡️", "📱", "🌴"];

  async function save() {
    if (!name.trim()) {
      push("Give your goal a name.", "error");
      return;
    }
    const t = parseFloat(target);
    if (!t || t <= 0) {
      push("Enter a target amount.", "error");
      return;
    }
    setLoading(true);
    try {
      await api.post("/api/goals", {
        name: name.trim(),
        emoji,
        targetAmount: t,
        currentAmount: current ? parseFloat(current) : 0,
        targetDate: date || null,
      });
      push("Goal created!", "success");
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title="New goal">
      <Field label="Name">
        <input className="input" autoFocus placeholder="e.g. Germany Fund" value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
      </Field>
      <Field label="Icon">
        <div className="chip-grid" style={{ gridTemplateColumns: "repeat(6, 1fr)" }}>
          {EMOJIS.map((e) => (
            <button key={e} className={`chip-item ${emoji === e ? "active" : ""}`} style={{ fontSize: 22, padding: 8 }} onClick={() => setEmoji(e)}>
              {e}
            </button>
          ))}
        </div>
      </Field>
      <Field label="Target amount">
        <MoneyInput value={target} onChange={setTarget} placeholder="2,00,000" />
      </Field>
      <Field label="Already saved (optional)">
        <MoneyInput value={current} onChange={setCurrent} placeholder="0" />
      </Field>
      <Field label="Target date (optional)">
        <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
      </Field>
      <Button className="btn-block" onClick={save} loading={loading} variant="btn-primary">
        Create Goal
      </Button>
    </Sheet>
  );
}