import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import TaskForm from "../components/TaskForm.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { Modal, Button, EmptyState, Skeleton, Chip } from "../components/UI.jsx";
import { formatDate, timeLabel, toDateInput } from "../utils/format.js";

const FILTERS = [
  { value: "today", label: "Today" },
  { value: "upcoming", label: "Upcoming" },
  { value: "overdue", label: "Overdue" },
  { value: "completed", label: "Completed" },
];

const PRIORITY = { high: "red", medium: "amber", low: "neutral" };

export default function Tasks() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [tasks, setTasks] = useState([]);
  const [filter, setFilter] = useState("today");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async (f) => {
    setLoading(true);
    try {
      const data = await api.get(`/api/tasks?filter=${f}`);
      setTasks(data.tasks);
    } catch {
      setTasks([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filter);
  }, [load, filter]);

  async function toggle(task) {
    setTasks((ts) => ts.map((t) => (t._id === task._id ? { ...t, completed: !t.completed } : t)));
    try {
      await api.patch(`/api/tasks/${task._id}/toggle`);
    } catch (err) {
      push(err.message, "error");
      load(filter);
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/tasks/${deleteTarget._id}`);
      setDeleteOpen(false);
      load(filter);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Tasks</h1>
          <button className="icon-btn" onClick={() => { setEditTask(null); setFormOpen(true); }} aria-label="New task">
            <Plus size={19} />
          </button>
        </div>

        <div className="tabs">
          {FILTERS.map((f) => (
            <button key={f.value} className={`tab ${filter === f.value ? "active" : ""}`} onClick={() => setFilter(f.value)}>
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Skeleton lines={7} />
        ) : tasks.length === 0 ? (
          <EmptyState
            emoji={filter === "completed" ? "🎉" : "🗒️"}
            title={filter === "completed" ? "Nothing completed yet" : filter === "overdue" ? "No overdue tasks" : filter === "upcoming" ? "No upcoming tasks" : "You're all clear"}
            sub={filter === "today" ? "No tasks for today." : "Tasks will appear here."}
            action={<Button variant="btn-primary" onClick={() => { setEditTask(null); setFormOpen(true); }}>Add Task</Button>}
          />
        ) : (
          <div className="list-card">
            {tasks.map((t, i) => {
              const overdue = !t.completed && t.dueDate && toDateInput(t.dueDate) < toDateInput(new Date());
              return (
                <div key={t._id} className="list-row" onClick={() => { setEditTask(t); setFormOpen(true); }}>
                  <button
                    className={`toggle-btn ${t.completed ? "checked" : ""}`}
                    onClick={(e) => { e.stopPropagation(); toggle(t); }}
                    aria-label="Toggle"
                  >
                    ✓
                  </button>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div className={`l-title ${t.completed ? "done" : ""}`} style={{ textDecoration: t.completed ? "line-through" : "none", color: t.completed ? "var(--fg-tertiary)" : undefined }}>
                      {t.title}
                    </div>
                    <div className="l-sub">
                      {t.dueDate ? `${formatDate(t.dueDate)}${t.dueTime ? " · " + timeLabel(t.dueTime) : ""}` : "No due date"}
                      {overdue ? " · Overdue" : ""}
                    </div>
                  </div>
                  <Chip variant={PRIORITY[t.priority]}>{t.priority}</Chip>
                  <button
                    className="icon-btn"
                    style={{ width: 32, height: 32 }}
                    onClick={(e) => { e.stopPropagation(); setDeleteTarget(t); setDeleteOpen(true); }}
                    aria-label="Delete task"
                  >
                    <Trash2 size={15} style={{ color: "var(--red)" }} />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {formOpen && (
        <TaskForm open onClose={() => { setFormOpen(false); setEditTask(null); }} task={editTask || null} onSuccess={() => { setFormOpen(false); setEditTask(null); load(filter); }} />
      )}

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={setForm} />
      {form === "expense" && <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={() => setForm(null)} />}
      {form === "income" && <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={() => setForm(null)} />}
      {form === "transfer" && <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={() => setForm(null)} />}
      {form === "note" && <NoteForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "reminder" && <ReminderForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this task?"
        sub={`"${deleteTarget?.title}" will be permanently removed.`}
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