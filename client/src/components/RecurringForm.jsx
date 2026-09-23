import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useData } from "../context/DataContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, MoneyInput, Segmented, ChipItem } from "./UI.jsx";
import { toDateInput } from "../utils/format.js";
import CatIcon from "./CatIcon.jsx";

const FREQ = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
  { value: "custom", label: "Custom" },
];

const WEEKDAYS = [
  { value: 0, label: "Sun" },
  { value: 1, label: "Mon" },
  { value: 2, label: "Tue" },
  { value: 3, label: "Wed" },
  { value: 4, label: "Thu" },
  { value: 5, label: "Fri" },
  { value: 6, label: "Sat" },
];

export default function RecurringForm({ open, onClose, item, onSuccess }) {
  const { push } = useToast();
  const { accounts, expenseCategories, incomeCategories } = useData();
  const [type, setType] = useState(item?.type || "expense");
  const [amount, setAmount] = useState(item ? String(item.amount) : "");
  const [categoryId, setCategoryId] = useState(item?.category?._id || "");
  const [accountId, setAccountId] = useState(item?.account?._id || "");
  const [source, setSource] = useState(item?.source || "");
  const [description, setDescription] = useState(item?.description || "");
  const [frequency, setFrequency] = useState(item?.frequency || "monthly");
  const [interval, setInterval] = useState(item?.interval || 1);
  const [daysOfWeek, setDaysOfWeek] = useState(item?.customDaysOfWeek || []);
  const [dayOfMonth, setDayOfMonth] = useState(item?.customDayOfMonth || "");
  const [startDate, setStartDate] = useState(item ? toDateInput(item.startDate) : toDateInput());
  const [endDate, setEndDate] = useState(item?.endDate ? toDateInput(item.endDate) : "");
  const [active, setActive] = useState(item?.active !== false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setType(item?.type || "expense");
      setAmount(item ? String(item.amount) : "");
      setCategoryId(item?.category?._id || "");
      setAccountId(item?.account?._id || "");
      setSource(item?.source || "");
      setDescription(item?.description || "");
      setFrequency(item?.frequency || "monthly");
      setInterval(item?.interval || 1);
      setDaysOfWeek(item?.customDaysOfWeek || []);
      setDayOfMonth(item?.customDayOfMonth || "");
      setStartDate(item ? toDateInput(item.startDate) : toDateInput());
      setEndDate(item?.endDate ? toDateInput(item.endDate) : "");
      setActive(item?.active !== false);
    }
  }, [open, item]);

  function toggleDay(d) {
    setDaysOfWeek((xs) => (xs.includes(d) ? xs.filter((x) => x !== d) : [...xs, d]));
  }

  async function save() {
    const val = parseFloat(amount);
    if (!val || val <= 0) {
      push("Enter a valid amount.", "error");
      return;
    }
    if (!startDate) {
      push("Pick a start date.", "error");
      return;
    }
    const cats = type === "income" ? incomeCategories : expenseCategories;
    if (type !== "income" && !categoryId) {
      push("Pick a category.", "error");
      return;
    }
    setLoading(true);
    try {
      const body = {
        type,
        amount: val,
        categoryId: categoryId || (type === "income" ? null : undefined),
        accountId: accountId || null,
        source: type === "income" ? source || null : null,
        description,
        frequency,
        interval,
        customDaysOfWeek: frequency === "custom" ? daysOfWeek : [],
        customDayOfMonth: frequency === "custom" && dayOfMonth ? parseInt(dayOfMonth, 10) : null,
        startDate,
        endDate: endDate || null,
        active,
      };
      if (item) {
        await api.patch(`/api/recurring/${item._id}`, body);
        push("Recurring updated.", "success");
      } else {
        await api.post("/api/recurring", body);
        push("Recurring added.", "success");
      }
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  const cats = type === "income" ? incomeCategories : expenseCategories;

  return (
    <Sheet open={open} onClose={onClose} title={item ? "Edit Recurring" : "New Recurring"}>
      <Field label="Type">
        <Segmented
          options={[
            { value: "expense", label: "Expense" },
            { value: "income", label: "Income" },
          ]}
          value={type}
          onChange={setType}
        />
      </Field>
      <Field label="Amount">
        <MoneyInput value={amount} onChange={setAmount} placeholder="0" />
      </Field>
      <Field label="Category">
        <div className="chip-grid">
          {cats.map((c) => (
            <ChipItem key={c._id} active={categoryId === c._id} onClick={() => setCategoryId(c._id)} icon={<CatIcon category={c} size={20} />} label={c.name} />
          ))}
        </div>
      </Field>
      {type === "income" && (
        <Field label="Source">
          <input className="input" placeholder="e.g. Salary" value={source} onChange={(e) => setSource(e.target.value)} maxLength={60} />
        </Field>
      )}
      <Field label="Account (optional)">
        <div className="chip-grid">
          {accounts.map((a) => (
            <ChipItem key={a._id} active={accountId === a._id} onClick={() => setAccountId(a._id)} label={a.name} />
          ))}
        </div>
      </Field>
      <Field label="Repeats">
        <Segmented options={FREQ} value={frequency} onChange={setFrequency} />
      </Field>
      {frequency === "custom" && (
        <div className="stack" style={{ gap: 10 }}>
          <Field label="Interval (every N days)">
            <input className="input" type="number" min={1} max={365} value={interval} onChange={(e) => setInterval(parseInt(e.target.value || "1", 10))} />
          </Field>
          <Field label="Or days of week">
            <div className="chip-grid">
              {WEEKDAYS.map((d) => (
                <ChipItem key={d.value} active={daysOfWeek.includes(d.value)} onClick={() => toggleDay(d.value)} label={d.label} />
              ))}
            </div>
          </Field>
          <Field label="Or day of month (1–31)">
            <input className="input" type="number" min={1} max={31} placeholder="e.g. 5 (for rent on the 5th)" value={dayOfMonth} onChange={(e) => setDayOfMonth(e.target.value)} />
          </Field>
        </div>
      )}
      {frequency !== "custom" && (
        <Field label="Every (interval)">
          <input className="input" type="number" min={1} max={365} value={interval} onChange={(e) => setInterval(parseInt(e.target.value || "1", 10))} />
        </Field>
      )}
      <div className="hstack" style={{ gap: 10 }}>
        <Field label="Start date">
          <input className="input" type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
        </Field>
        <Field label="End date (optional)">
          <input className="input" type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
        </Field>
      </div>
      <Field label="Description (optional)">
        <input className="input" placeholder="e.g. Flat rent" value={description} onChange={(e) => setDescription(e.target.value)} maxLength={200} />
      </Field>
      <label className="hstack gap-s" style={{ marginTop: 4 }}>
        <input type="checkbox" checked={active} onChange={(e) => setActive(e.target.checked)} />
        <span style={{ fontSize: 14 }}>Active — generate transactions on schedule</span>
      </label>
      <Button className="btn-block" variant="btn-primary" onClick={save} loading={loading}>
        {item ? "Save Changes" : "Add Recurring"}
      </Button>
    </Sheet>
  );
}