import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, MoneyInput, ChipItem } from "./UI.jsx";
import CatIcon from "./CatIcon.jsx";

export default function BudgetForm({ open, onClose, budget, onSuccess }) {
  const { push } = useToast();
  const [categories, setCategories] = useState([]);
  const [categoryId, setCategoryId] = useState(budget?.category?._id || "");
  const [limit, setLimit] = useState(budget ? String(budget.limit) : "");
  const [warnAt, setWarnAt] = useState(budget?.warnAt ? String(budget.warnAt) : "80");
  const [loading, setLoading] = useState(false);
  const month = new Date().toISOString().slice(0, 7);

  useEffect(() => {
    if (open) {
      api.get("/api/categories?type=expense").then((d) => setCategories(d.categories)).catch(() => {});
    }
  }, [open]);

  async function save() {
    const val = parseFloat(limit);
    if (!val || val <= 0) {
      push("Enter a valid limit.", "error");
      return;
    }
    if (!categoryId) {
      push("Pick a category.", "error");
      return;
    }
    setLoading(true);
    try {
      const body = { categoryId, limit: val, warnAt: parseInt(warnAt || "0", 10), month };
      if (budget) {
        await api.patch(`/api/budgets/${budget._id}`, body);
        push("Budget updated.", "success");
      } else {
        await api.post("/api/budgets", body);
        push("Budget created.", "success");
      }
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={budget ? "Edit Budget" : "New Budget"}>
      <Field label="Category">
        <div className="chip-grid">
          {categories.map((c) => (
            <ChipItem
              key={c._id}
              active={categoryId === c._id}
              onClick={() => setCategoryId(c._id)}
              icon={<CatIcon category={c} size={20} />}
              label={c.name}
            />
          ))}
        </div>
      </Field>
      <Field label={`Monthly limit (${month})`}>
        <MoneyInput value={limit} onChange={setLimit} placeholder="0" />
      </Field>
      <Field label="Warn me when spent exceeds (%)">
        <input className="input" type="number" min={0} max={100} value={warnAt} onChange={(e) => setWarnAt(e.target.value)} />
      </Field>
      <Button className="btn-block" variant="btn-primary" onClick={save} loading={loading}>
        {budget ? "Save Changes" : "Create Budget"}
      </Button>
    </Sheet>
  );
}