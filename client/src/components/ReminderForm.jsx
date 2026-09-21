import { useState, useEffect } from "react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import { Sheet, Button, Field, Segmented, Switch } from "./UI.jsx";
import { toDateInput } from "../utils/format.js";

const NOW = new Date();
const REPEAT_OPTIONS = ["none", "daily", "weekly", "monthly", "yearly"];

export default function ReminderForm({ open, onClose, onSuccess, reminder = null }) {
  const { push } = useToast();
  const isEdit = !!reminder;
  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState(toDateInput(new Date()));
  const [time, setTime] = useState(`${String(NOW.getHours()).padStart(2, "0")}:${String(NOW.getMinutes()).padStart(2, "0")}`);
  const [repeat, setRepeat] = useState("none");
  const [priority, setPriority] = useState("medium");
  const [alarmMode, setAlarmMode] = useState(true);

  useEffect(() => {
    if (!open) return;
    if (reminder) {
      setTitle(reminder.title || "");
      setDescription(reminder.description || "");
      setDate(toDateInput(reminder.date));
      setTime(reminder.time || "20:00");
      setRepeat(reminder.repeat || "none");
      setPriority(reminder.priority || "medium");
      setAlarmMode(reminder.alarmMode !== false);
    } else {
      setTitle("");
      setDescription("");
      setDate(toDateInput(new Date()));
      setTime(`${String(NOW.getHours()).padStart(2, "0")}:${String(NOW.getMinutes()).padStart(2, "0")}`);
      setRepeat("none");
      setPriority("medium");
      setAlarmMode(true);
    }
  }, [open, reminder]);

  async function save() {
    if (!title.trim()) {
      push("Give your reminder a title.", "error");
      return;
    }
    setLoading(true);
    try {
      // Resolve the user's chosen wall-clock to an absolute instant HERE (their
      // browser timezone) so the server never re-interprets it in another TZ.
      const when = new Date(`${date}T${time}:00`);
      const body = {
        title: title.trim(),
        description,
        date: Number.isNaN(when.getTime()) ? date : when.toISOString(),
        time,
        repeat,
        priority,
        alarmMode,
      };
      if (isEdit) await api.patch(`/api/reminders/${reminder._id}`, body);
      else await api.post("/api/reminders", body);
      push("Reminder set!", "success");
      onSuccess?.();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <Sheet open={open} onClose={onClose} title={isEdit ? "Edit reminder" : "New reminder"}>
      <Field label="Title">
        <input className="input" autoFocus placeholder="e.g. Call Mom" value={title} onChange={(e) => setTitle(e.target.value)} maxLength={200} />
      </Field>
      <Field label="Details">
        <textarea className="textarea" placeholder="Optional details" value={description} onChange={(e) => setDescription(e.target.value)} rows={2} />
      </Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <Field label="Date">
          <input className="input" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Time">
          <input className="input" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
        </Field>
      </div>
      <Field label="Repeat">
        <Segmented
          options={[
            { value: "none", label: "Once" },
            { value: "daily", label: "Daily" },
            { value: "weekly", label: "Weekly" },
            { value: "monthly", label: "Monthly" },
          ]}
          value={repeat}
          onChange={setRepeat}
        />
      </Field>
      <Field label="Ring like an alarm" hint="Keeps buzzing every ~15s for 1 minute until you tap it or press Dismiss.">
        <Switch checked={alarmMode} onChange={setAlarmMode} />
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
      <Button className="btn-block" onClick={save} loading={loading} variant="btn-primary">
        {isEdit ? "Update Reminder" : "Set Reminder"}
      </Button>
    </Sheet>
  );
}