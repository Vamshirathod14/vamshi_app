import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { EmptyState, Skeleton, Modal, Button, Chip } from "../components/UI.jsx";
import { formatDateFull, timeLabel } from "../utils/format.js";

const PRIORITY = { high: "red", medium: "amber", low: "neutral" };

export default function Reminders() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [reminders, setReminders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editReminder, setEditReminder] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/reminders");
      setReminders(data.reminders);
    } catch {
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function complete(r) {
    try {
      const data = await api.patch(`/api/reminders/${r._id}/complete`);
      setReminders((rs) => rs.map((x) => (x._id === r._id ? data.reminder : x)));
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/reminders/${deleteTarget._id}`);
      setDeleteOpen(false);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  const upcoming = reminders.filter((r) => !r.completed);
  const done = reminders.filter((r) => r.completed);

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Reminders</h1>
          <button className="icon-btn" onClick={() => { setEditReminder(null); setFormOpen(true); }} aria-label="New reminder">
            <Plus size={19} />
          </button>
        </div>

        {loading ? (
          <Skeleton lines={7} />
        ) : reminders.length === 0 ? (
          <EmptyState emoji="🔔" title="No reminders" sub="Set reminders for calls, payments and habits." action={<Button variant="btn-primary" onClick={() => { setEditReminder(null); setFormOpen(true); }}>New Reminder</Button>} />
        ) : (
          <>
            {upcoming.length > 0 && (
              <div className="list-card">
                {upcoming.map((r, i) => (
                  <div key={r._id} className="list-row">
                    <button
                      className="toggle-btn"
                      onClick={() => complete(r)}
                      aria-label="Mark done"
                    >
                      ✓
                    </button>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div className="l-title">{r.title}</div>
                      <div className="l-sub">
                        {formatDateFull(r.date)} {r.time ? " · " + timeLabel(r.time) : ""}
                        {r.repeat !== "none" ? ` · every ${r.repeat}` : ""}
                      </div>
                    </div>
                    <Chip variant={PRIORITY[r.priority]}>{r.priority}</Chip>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => { setEditReminder(r); setFormOpen(true); }}><span style={{ fontSize: 16 }}>✎</span></button>
                    <button className="icon-btn" style={{ width: 32, height: 32 }} onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }}><Trash2 size={15} style={{ color: "var(--red)" }} /></button>
                  </div>
                ))}
              </div>
            )}

            {done.length > 0 && (
              <>
                <div className="group-label">Completed</div>
                <div className="list-card">
                  {done.map((r) => (
                    <div key={r._id} className="list-row" style={{ opacity: 0.65 }}>
                      <button className="toggle-btn checked" onClick={() => complete(r)}>✓</button>
                      <div style={{ flex: 1 }}>
                        <div className="l-title" style={{ textDecoration: "line-through" }}>{r.title}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </>
        )}
      </div>

      {formOpen && <ReminderForm open onClose={() => { setFormOpen(false); setEditReminder(null); }} reminder={editReminder} onSuccess={() => { setFormOpen(false); setEditReminder(null); load(); }} />}

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={setForm} />
      {form === "expense" && <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={() => setForm(null)} />}
      {form === "income" && <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={() => setForm(null)} />}
      {form === "transfer" && <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={() => setForm(null)} />}
      {form === "task" && <TaskForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "note" && <NoteForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete reminder?"
        sub={`"${deleteTarget?.title}" will be removed.`}
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