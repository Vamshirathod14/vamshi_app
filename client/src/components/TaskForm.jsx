import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, Segmented } from "./UI.jsx";
import { toDateInput, toTimeInput } from "../utils/format.js";

export default function TaskForm({ open, onClose, onSuccess, task = null }) {
  const { push } = useToast();
  const isEdit = !!task;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [dueDate, setDueDate] = useState(toDateInput(new Date()));
  const [dueTime, setDueTime] = useState("");
  const [priority, setPriority] = useState("medium");
  const [noDue, setNoDue] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (task) {
      setTitle(task.title || "");
      setDescription(task.description || "");
      setDueDate(task.dueDate ? toDateInput(task.dueDate) : toDateInput(new Date()));
      setDueTime(task.dueTime || "");
      setPriority(task.priority || "medium");
      setNoDue(!task.dueDate);
    } else {
      setTitle("");
      setDescription("");
      setDueDate(toDateInput(new Date()));
      setDueTime("");
      setPriority("medium");
      setNoDue(false);
    }
  }, [open, task]);

  async function save() {
    if (!title.trim()) {
      push("Give your task a title.", "error");
      return;
    }
    setLoading(true);
    try {
      const body = {
        title: title.trim(),
        description,
        dueDate: noDue ? null : dueDate,
        dueTime: dueTime || null,
        priority,
      };
      if (isEdit) await api.patch(`/api/tasks/${task._id}`, body);
      else await api.post("/api/tasks", body);
      push(isEdit ? "Task updated!" : "Task added!", "success");
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit task" : "New task"}>
      <Field label="Title">
        <input className="input" autoFocus placeholder="What needs doing?" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </Field>
      <Field label="Details">
        <textarea className="textarea" placeholder="Optional details" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </Field>
      <Field label="Priority">
        <Segmented
          options={[
            { value: "low", label: "Low" },
            { value: "medium", label: "Medium" },
            { value: "high", label: "High" },
          ]}
          value={priority}
          onChange={setPriority}
        />
      </Field>
      <div className="hstack" style={{ marginBottom: 12 }}>
        <span className="small muted" style={{ fontWeight: 600 }}>Due date:</span>
        <span className="spacer" />
        <label className="hstack gap-s" style={{ fontSize: 13, cursor: "pointer" }}>
          <input type="checkbox" checked={noDue} onChange={(e) => setNoDue(e.target.checked)} />
          No due date
        </label>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input className="input" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} disabled={noDue} />
        </Field>
        <Field label="Time">
          <input className="input" type="time" value={dueTime} onChange={(e) => setDueTime(e.target.value)} disabled={noDue} />
        </Field>
      </div>
      <Button className="btn-block" onClick={save} loading={loading} variant="btn-primary">
        {isEdit ? "Update Task" : "Add Task"}
      </Button>
    </Sheet>
  );
}