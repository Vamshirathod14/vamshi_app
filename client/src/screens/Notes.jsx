import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, Search, Pin, NotebookPen } from "lucide-react";
import { api } from "../api/client.js";
import Layout from "../components/Layout.jsx";
import NoteForm from "../components/NoteForm.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { EmptyState, Skeleton } from "../components/UI.jsx";
import { timeAgo } from "../utils/format.js";

export default function Notes() {
  const navigate = useNavigate();
  const [notes, setNotes] = useState([]);
  const [archived, setArchived] = useState(false);
  const [q, setQ] = useState("");
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ archived: String(archived) });
      if (q) params.set("q", q);
      const data = await api.get(`/api/notes?${params}`);
      setNotes(data.notes);
    } catch {
      setNotes([]);
    } finally {
      setLoading(false);
    }
  }, [archived, q]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Notes</h1>
          <button className="icon-btn" onClick={() => setFormOpen(true)} aria-label="New note">
            <Plus size={19} />
          </button>
        </div>

        <div className="tabs" style={{ marginBottom: 14 }}>
          <button className={`tab ${!archived ? "active" : ""}`} onClick={() => setArchived(false)}>Active</button>
          <button className={`tab ${archived ? "active" : ""}`} onClick={() => setArchived(true)}>Archived</button>
        </div>

        <div className="search-box">
          <Search size={17} />
          <input placeholder="Search notes" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>

        {loading ? (
          <Skeleton lines={6} />
        ) : notes.length === 0 ? (
          <EmptyState
            icon={<NotebookPen size={30} />}
            title={archived ? "No archived notes" : "No notes yet"}
            sub={archived ? "Archive notes to keep them here." : "Capture thoughts, plans and checklists."}
            action={<span />}
          />
        ) : (
          <div className="note-grid">
            {notes.map((n) => (
              <button key={n._id} className="note-card" onClick={() => navigate(`/notes/${n._id}`)}>
                {n.pinned && <span className="pin-end"><Pin size={13} /></span>}
                <h4>{n.title || "Untitled"}</h4>
                {n.content && <p>{n.content}</p>}
                {n.checklist?.length > 0 && (
                  <div className="small muted" style={{ fontSize: 12 }}>
                    {n.checklist.filter((c) => c.checked).length}/{n.checklist.length} checklist
                  </div>
                )}
                <div className="note-date">{timeAgo(n.updatedAt)}</div>
              </button>
            ))}
          </div>
        )}
      </div>

      {formOpen && <NoteForm open onClose={() => setFormOpen(false)} onSuccess={() => { setFormOpen(false); load(); }} />}

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={setForm} />
      {form === "expense" && <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={() => setForm(null)} />}
      {form === "income" && <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={() => setForm(null)} />}
      {form === "transfer" && <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={() => setForm(null)} />}
      {form === "task" && <TaskForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "reminder" && <ReminderForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
    </Layout>
  );
}