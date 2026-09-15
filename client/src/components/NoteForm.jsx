import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field } from "./UI.jsx";

export default function NoteForm({ open, onClose, onSuccess, note = null }) {
  const { push } = useToast();
  const isEdit = !!note;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [checklist, setChecklist] = useState([]); // [{text, checked}]

  useEffect(() => {
    if (!open) return;
    if (note) {
      setTitle(note.title || "");
      setContent(note.content || "");
      setChecklist((note.checklist || []).map((c) => ({ text: c.text, checked: c.checked })));
    } else {
      setTitle("");
      setContent("");
      setChecklist([]);
    }
  }, [open, note]);

  function addCheckItem() {
    setChecklist((l) => [...l, { text: "", checked: false }]);
  }

  async function save() {
    if (!title.trim() && !content.trim() && checklist.every((c) => !c.text.trim())) {
      push("Your note is empty.", "error");
      return;
    }
    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        content,
        checklist: checklist.filter((c) => c.text.trim()).map((c) => ({ text: c.text.trim(), checked: c.checked })),
      };
      if (isEdit) await api.patch(`/api/notes/${note._id}`, body);
      else await api.post("/api/notes", body);
      push(isEdit ? "Note saved!" : "Note created!", "success");
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit note" : "New note"}>
      <Field label="Title">
        <input className="input" autoFocus placeholder="Note title" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </Field>
      <Field label="Content">
        <textarea className="textarea" placeholder="Write something…" value={content} onChange={(e) => setContent(e.target.value)} rows={4} />
      </Field>

      {checklist.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <label style={{ display: "block", fontSize: 13, fontWeight: 600, color: "var(--fg-secondary)", marginBottom: 8 }}>Checklist</label>
          {checklist.map((item, i) => (
            <div key={i} className="hstack" style={{ marginBottom: 8 }}>
              <input
                type="checkbox"
                checked={item.checked}
                onChange={(e) =>
                  setChecklist((l) => l.map((c, j) => (j === i ? { ...c, checked: e.target.checked } : c)))
                }
              />
              <input
                className="input"
                style={{ padding: "10px 12px", fontSize: 14 }}
                placeholder="Checklist item…"
                value={item.text}
                onChange={(e) =>
                  setChecklist((l) => l.map((c, j) => (j === i ? { ...c, text: e.target.value } : c)))
                }
              />
              <button className="icon-btn" onClick={() => setChecklist((l) => l.filter((_, j) => j !== i))} aria-label="Remove">
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      <Button variant="btn-sm" onClick={addCheckItem} style={{ marginBottom: 16 }}>+ Checklist item</Button>

      <Button className="btn-block" onClick={save} loading={loading} variant="btn-primary">
        {isEdit ? "Save Note" : "Create Note"}
      </Button>
    </Sheet>
  );
}