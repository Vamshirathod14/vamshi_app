import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Trash2, ChevronLeft, RotateCcw } from "lucide-react";
import { api } from "../api/client.js";
import { useData } from "../context/DataContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import GoalForm from "../components/GoalForm.jsx";
import ContributionSheet from "../components/ContributionSheet.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import { Button, Modal, Skeleton, EmptyState } from "../components/UI.jsx";
import { formatINR, formatDateFull } from "../utils/format.js";

export default function Goals() {
  const navigate = useNavigate();
  const { accounts, refresh } = useData();
  const { push } = useToast();
  const [goals, setGoals] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [contribGoal, setContribGoal] = useState(null);
  const [expanded, setExpanded] = useState(null);
  const [undoing, setUndoing] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get("/api/goals");
      setGoals(data.goals);
    } catch {
      setGoals([]);
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
      await api.del(`/api/goals/${deleteTarget._id}`);
      push("Goal deleted.", "success");
      setDeleteOpen(false);
      load();
      refresh();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  async function undoContribution(goal, idx) {
    const key = `${goal._id}:${idx}`;
    setUndoing(key);
    try {
      await api.del(`/api/goals/${goal._id}/contributions/${idx}`);
      push("Contribution reversed.", "success");
      load();
      refresh();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setUndoing(null);
    }
  }

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/")}>
            <ChevronLeft size={18} /> Home
          </button>
          <h1 className="screen-title">Goals</h1>
          <button className="icon-btn" onClick={() => setForm("goal")} aria-label="New goal">
            <Plus size={19} />
          </button>
        </div>

        {loading ? (
          <Skeleton lines={6} />
        ) : goals.length === 0 ? (
          <EmptyState
            emoji="🎯"
            title="Start your first goal"
            sub="Give your money a purpose — save for something you care about."
            action={<Button variant="btn-primary" onClick={() => setForm("goal")}>Create a Goal</Button>}
          />
        ) : (
          goals.map((g) => (
            <div className="goal-card" key={g._id}>
              <div className="goal-head">
                <div className="chip lg" style={{ background: `${g.color}18`, fontSize: 24 }}>{g.emoji}</div>
                <div className="goal-meta">
                  <div className="goal-name">{g.name}</div>
                  <div className="goal-sub">
                    {formatINR(g.currentAmount)} of {formatINR(g.targetAmount)}
                    {g.targetDate ? ` · by ${formatDateFull(g.targetDate)}` : ""}
                  </div>
                </div>
                {g.isCompleted ? (
                  <span className="badge green">Done 🎉</span>
                ) : (
                  <span className="badge accent">{g.percent}%</span>
                )}
                <button className="icon-btn" style={{ marginLeft: 4 }} onClick={() => { setDeleteTarget(g); setDeleteOpen(true); }} aria-label="Delete goal">
                  <Trash2 size={16} style={{ color: "var(--red)" }} />
                </button>
              </div>
              <div style={{ marginTop: 14 }}>
                <div className="progress">
                  <div className="progress-fill" style={{ width: `${g.percent}%`, background: g.color }} />
                </div>
                <div className="budget-bar-row">
                  <span>{formatINR(g.currentAmount)}</span>
                  <span>{g.percent}% saved</span>
                </div>
              </div>
              <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
                <Button className="btn-block" variant="btn-primary btn-sm" onClick={() => setContribGoal(g)}>+ Contribute</Button>
                <Button className="btn-block btn-sm" variant="btn-outline" onClick={() => setExpanded((x) => (x === g._id ? null : g._id))}>
                  {expanded === g._id ? "Hide" : "History"}
                </Button>
              </div>
              {expanded === g._id && (
                <div className="list-card" style={{ padding: "4px 16px", marginTop: 14 }}>
                  {g.contributions.length === 0 ? (
                    <div className="small muted" style={{ padding: "12px 0" }}>No contributions yet.</div>
                  ) : (
                    g.contributions.map((c, idx) => (
                      <div key={idx} className="set-row" style={{ marginBottom: 0, borderBottom: idx < g.contributions.length - 1 ? "1px solid var(--border)" : "none", padding: "12px 0" }}>
                        <div className="chip" style={{ minWidth: 34, height: 34, fontSize: 15 }}>💰</div>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontSize: 13.5, fontWeight: 600 }}>+{formatINR(c.amount)}</div>
                          <div className="small muted">{formatDateFull(c.date)}{c.note ? ` · ${c.note}` : ""}</div>
                        </div>
                        <button
                          className="icon-btn"
                          style={{ width: 30, height: 30 }}
                          onClick={() => undoContribution(g, idx)}
                          aria-label="Undo contribution"
                          disabled={undoing === `${g._id}:${idx}`}
                        >
                          <RotateCcw size={13} style={{ color: "var(--fg-tertiary)" }} />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={setForm} />
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={() => { setForm(null); load(); }} />}
      {form === "expense" && <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={() => { setForm(null); load(); }} />}
      {form === "income" && <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={() => { setForm(null); load(); }} />}
      {form === "transfer" && <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={() => { setForm(null); load(); }} />}
      {form === "task" && <TaskForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "note" && <NoteForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "reminder" && <ReminderForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}

      {contribGoal && (
        <ContributionSheet
          open
          onClose={() => setContribGoal(null)}
          goal={contribGoal}
          accounts={accounts}
          onSuccess={() => {
            setContribGoal(null);
            load();
            refresh();
          }}
        />
      )}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this goal?"
        sub={`"${deleteTarget?.name}" and its history will be removed.`}
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