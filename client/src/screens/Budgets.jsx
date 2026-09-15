import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, Trash2, Pencil } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import BudgetForm from "../components/BudgetForm.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { EmptyState, Skeleton, Modal, Button } from "../components/UI.jsx";
import { formatINR } from "../utils/format.js";

export default function Budgets() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [budgets, setBudgets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editBudget, setEditBudget] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/budgets?month=" + new Date().toISOString().slice(0, 7));
      setBudgets(data.budgets);
    } catch {
      setBudgets([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/budgets/${deleteTarget._id}`);
      setDeleteOpen(false);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  const totalSpent = budgets.reduce((s, b) => s + (b.spent ?? 0), 0);
  const totalLimit = budgets.reduce((s, b) => s + b.limit, 0);

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Budgets</h1>
          <button className="icon-btn" onClick={() => { setEditBudget(null); setFormOpen(true); }} aria-label="New budget">
            <Plus size={19} />
          </button>
        </div>

        {budgets.length > 0 && (
          <div className="summary-card">
            <div className="group-label" style={{ margin: "0 0 10px" }}>This month</div>
            <div className="budget-bar-row" style={{ fontSize: 14 }}>
              <strong>{formatINR(totalSpent)}</strong>
              <span>of {formatINR(totalLimit)}</span>
            </div>
            <div className="progress">
              <div className="progress-fill" style={{ width: `${Math.min(100, (totalSpent / Math.max(totalLimit, 1)) * 100)}%`, background: "var(--accent)" }} />
            </div>
          </div>
        )}

        {loading ? (
          <Skeleton lines={6} />
        ) : budgets.length === 0 ? (
          <EmptyState emoji="📊" title="No budgets"
            sub="Set monthly limits per category to stay on track."
            action={<Button variant="btn-primary" onClick={() => { setEditBudget(null); setFormOpen(true); }}>Create Budget</Button>} />
        ) : (
          budgets.map((b) => {
            const pct = b.limit > 0 ? (b.spent / b.limit) * 100 : 0;
            const over = pct > 100;
            const warn = b.warnAt && pct >= b.warnAt && pct < 100;
            return (
              <div className={`category-card ${over ? "over" : ""}`} key={b._id}>
                <div className="budget-head">
                  <div className="chip lg" style={{ background: "var(--bg-sunken)", fontSize: 22 }}>{b.category.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{b.category.name}</div>
                    <div className="small muted">{formatINR(b.spent)} of {formatINR(b.limit)}</div>
                  </div>
                  <span className={`badge ${over ? "red" : warn ? "amber" : "green"}`}>
                    {pct.toFixed(0)}%
                    {warn ? " · warn" : ""}
                    {over ? " · over" : ""}
                  </span>
                </div>
                <div className="progress" style={{ marginTop: 12 }}>
                  <div className="progress-fill" style={{ width: `${Math.min(100, pct)}%`, background: over ? "var(--red)" : "var(--green)" }} />
                </div>
                <div className="hstack" style={{ justifyContent: "flex-end", gap: 8, marginTop: 12 }}>
                  <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setEditBudget(b); setFormOpen(true); }}><Pencil size={13} /></button>
                  <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setDeleteTarget(b); setDeleteOpen(true); }}><Trash2 size={13} style={{ color: "var(--red)" }} /></button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {formOpen && <BudgetForm open onClose={() => { setFormOpen(false); setEditBudget(null); }} budget={editBudget} onSuccess={() => { setFormOpen(false); setEditBudget(null); load(); }} />}

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={setForm} />
      {form === "expense" && <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={() => setForm(null)} />}
      {form === "income" && <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={() => setForm(null)} />}
      {form === "transfer" && <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={() => setForm(null)} />}
      {form === "task" && <TaskForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "note" && <NoteForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "reminder" && <ReminderForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this budget?"
        sub={`${deleteTarget?.category?.name || ""} budget for this month will be removed.`}
        actions={
          <>
            <Button onClick={() => setDeleteOpen(false)}>Cancel</Button>
            <Button variant="btn-danger" onClick={confirmDelete} loading={deleting}>Delete</Button>
          </>
        }
      />
    </Layout>
  );
}