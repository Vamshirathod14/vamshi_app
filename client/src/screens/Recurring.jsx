import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, Trash2, Pencil, Play } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import RecurringForm from "../components/RecurringForm.jsx";
import { EmptyState, Skeleton, Modal, Button } from "../components/UI.jsx";
import { formatINR, formatDate } from "../utils/format.js";

function freqLabel(r) {
  if (r.frequency === "custom") {
    if (r.customDayOfMonth) return `custom · day ${r.customDayOfMonth}`;
    if (r.customDaysOfWeek?.length) return `custom · ${r.customDaysOfWeek.map((d) => "SMTWTFS"[d]).join("")}`;
    return `custom · every ${r.interval}`;
  }
  if (r.interval > 1) return `every ${r.interval} ${r.frequency}s`;
  return r.frequency;
}

export default function Recurring() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/recurring");
      setItems(data.recurring);
    } catch {
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleActive(r) {
    setItems((xs) => xs.map((x) => (x._id === r._id ? { ...x, active: !x.active } : x)));
    try {
      await api.patch(`/api/recurring/${r._id}`, { active: !r.active });
    } catch (err) {
      push(err.message, "error");
      load();
    }
  }

  async function confirmDelete() {
    setDeleting(true);
    try {
      await api.del(`/api/recurring/${deleteTarget._id}`);
      setDeleteOpen(false);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  return (
    <Layout onOpenAdd={() => {}}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Recurring</h1>
          <button className="icon-btn" onClick={() => { setEditItem(null); setFormOpen(true); }} aria-label="New recurring">
            <Plus size={19} />
          </button>
        </div>

        <p className="small muted">Recurring transactions are generated automatically on their due date. Currently generated daily.</p>

        {loading ? (
          <Skeleton lines={7} />
        ) : items.length === 0 ? (
          <EmptyState emoji="🔁" title="No recurring transactions" sub="Rent, salaries, subscriptions, EMIs — set them once." action={<Button variant="btn-primary" onClick={() => { setEditItem(null); setFormOpen(true); }}>Add Recurring</Button>} />
        ) : (
          <div className="list-card">
            {items.map((r) => (
              <div key={r._id} className="list-row" style={{ opacity: r.active ? 1 : 0.55 }}>
                <div className="set-ico" style={{ minWidth: 36, height: 36, color: r.type === "income" ? "var(--green)" : "var(--red)" }}>
                  {r.type === "income" ? "↓" : "↑"}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="l-title">{r.description || (r.category?.name ?? (r.type === "income" ? "Income" : "Expense"))}</div>
                  <div className="l-sub">
                    {freqLabel(r)} · next {r.nextRunDate ? formatDate(r.nextRunDate) : "—"}
                    {r.account ? ` · ${r.account.name}` : ""}
                  </div>
                </div>
                <div className="l-sub" style={{ fontWeight: 650, color: r.type === "income" ? "var(--green)" : "var(--red)" }}>
                  {r.type === "income" ? "+" : "-"}{formatINR(r.amount)}
                </div>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => toggleActive(r)}aria-label={r.active ? "Pause" : "Resume"}>
                  <Play size={13} style={{ color: r.active ? "var(--amber)" : "var(--fg-tertiary)" }} />
                </button>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setEditItem(r); setFormOpen(true); }}><Pencil size={13} /></button>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setDeleteTarget(r); setDeleteOpen(true); }}><Trash2 size={13} style={{ color: "var(--red)" }} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && <RecurringForm open onClose={() => { setFormOpen(false); setEditItem(null); }} item={editItem} onSuccess={() => { setFormOpen(false); setEditItem(null); load(); }} />}

      <Modal
        open={deleteOpen}
        onClose={() => setDeleteOpen(false)}
        title="Delete this plan?"
        sub="Future transactions will no longer be generated. Past ones stay."
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