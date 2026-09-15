import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { ChevronLeft, Pin, Archive, Trash2, RotateCcw } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import { Modal, Button, Skeleton, EmptyState } from "../components/UI.jsx";
import { toDateInput, toTimeInput, formatDateFull } from "../utils/format.js";

export default function NoteDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { push } = useToast();
  const [note, setNote] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [taskOpen, setTaskOpen] = useState(null);

  const load = useCallback(async () => {
    try {
      const data = await api.get(`/api/notes/${id}`);
      setNote(data.note);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [id, push]);

  useEffect(() => {
    load();
  }, [load]);

  async function patch(p) {
    setSaving(true);
    try {
      const data = await api.patch(`/api/notes/${id}`, p);
      setNote(data.note);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setSaving(false);
    }
  }

  async function convertToTask(item) {
    try {
      await api.post(`/api/notes/${id}/convert`, {
        itemId: item._id,
        dueDate: toDateInput(new Date()),
        dueTime: toTimeInput(new Date()),
      });
      push("Converted to task! Check your Tasks.", "success");
      load();
    } catch (err) {
      push(err.message, "error");
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/notes/${id}`);
      push("Note deleted.", "success");
      navigate("/notes");
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  if (loading) return <Layout onOpenAdd={() => {}}><div className="page"><Skeleton lines={8} /></div></Layout>;
  if (!note) return <Layout onOpenAdd={() => {}}><EmptyState title="Note not found" /></Layout>;

  return (
    <Layout onOpenAdd={() => {}}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate(-1)}>
            <ChevronLeft size={18} /> Back
          </button>
          <div style={{ display: "flex", gap: 8 }}>
            <button className="icon-btn" onClick={() => patch({ pinned: !note.pinned })} aria-label="Pin">
              <Pin size={16} color={note.pinned ? "var(--accent)" : undefined} fill={note.pinned ? "var(--accent)" : "none"} />
            </button>
            <button className="icon-btn" onClick={() => patch({ archived: !note.archived })} aria-label={note.archived ? "Unarchive" : "Archive"}>
              {note.archived ? <RotateCcw size={16} /> : <Archive size={16} />}
            </button>
            <button className="icon-btn" style={{ color: "var(--red)" }} onClick={() => setDeleteOpen(true)} aria-label="Delete">
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        <input
          className="input"
          style={{ fontSize: 20, fontWeight: 700, border: "none", boxShadow: "none", padding: "0 0 8px", borderRadius: 0, borderBottom: "1px solid var(--border)" }}
          value={note.title}
          placeholder="Title"
          onChange={(e) => setNote((n) => ({ ...n, title: e.target.value }))}
        />
        <textarea
          className="textarea"
          style={{ border: "none", boxShadow: "none", padding: "16px 0", fontSize: 15.5, lineHeight: 1.6, minHeight: 140 }}
          value={note.content}
          placeholder="Start writing…"
          onChange={(e) => setNote((n) => ({ ...n, content: e.target.value }))}
          onBlur={() => { if (!saving) patch({ title: note.title, content: note.content }); }}
        />

        {note.checklist?.length > 0 && (
          <div className="list-card" style={{ padding: "4px 16px", marginTop: 16 }}>
            {note.checklist.map((item, idx) => (
              <div key={item._id || idx} className="check-item">
                <button
                  className={`toggle-btn ${item.checked ? "checked" : ""}`}
                  onClick={() =>
                    patch({
                      checklist: note.checklist.map((c, i) => (i === idx ? { ...c, checked: !c.checked } : c)),
                    })
                  }
                >
                  ✓
                </button>
                <span className={`check-text ${item.checked ? "done" : ""}`}>{item.text}</span>
                <button className="check-convert" onClick={() => convertToTask(item)}>Convert to Task</button>
              </div>
            ))}
          </div>
        )}
        <p className="small muted" style={{ marginTop: 16 }}>Updated {formatDateFull(note.updatedAt)} · Tags: {note.tags?.length ? note.tags.join(", ") : "none"}</p>
      </div>

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this note?"
        sub="This note will be permanently removed."
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