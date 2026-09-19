import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, ChevronLeft, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import AccountForm from "../components/AccountForm.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { EmptyState, Skeleton, Modal, Button } from "../components/UI.jsx";
import { formatINR, ACCOUNT_TYPE_LABELS } from "../utils/format.js";

const EMOJI = { cash: "💵", bank: "🏦", card: "💳", investment: "📈" };

export default function Accounts() {
  const navigate = useNavigate();
  const { push } = useToast();
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editAccount, setEditAccount] = useState(null);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.get("/api/accounts");
      setAccounts(data.accounts);
    } catch {
      setAccounts([]);
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
      await api.del(`/api/accounts/${deleteTarget._id}`);
      setDeleteOpen(false);
      load();
    } catch (err) {
      push(err.message, "error");
    } finally {
      setDeleting(false);
    }
  }

  const total = accounts.reduce((s, a) => s + a.balance, 0);

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Accounts</h1>
          <button className="icon-btn" onClick={() => { setEditAccount(null); setFormOpen(true); }} aria-label="New account">
            <Plus size={19} />
          </button>
        </div>

        <div className="summary-card">
          <div className="group-label" style={{ margin: "0 0 8px" }}>Total balance</div>
          <h2>{formatINR(total)}</h2>
        </div>

        {loading ? (
          <Skeleton lines={5} />
        ) : accounts.length === 0 ? (
          <EmptyState emoji="👛" title="No accounts" sub="Add cash, bank or card accounts to track balances." action={<Button variant="btn-primary" onClick={() => { setEditAccount(null); setFormOpen(true); }}>Add Account</Button>} />
        ) : (
          <div className="list-card">
            {accounts.map((a) => (
              <div key={a._id} className="list-row">
                <div className="set-ico" style={{ minWidth: 40, height: 40, background: a.color ? `${a.color}20` : "var(--bg-sunken)" }}>
                  {EMOJI[a.type] || "🏦"}
                </div>
                <div style={{ flex: 1 }}>
                  <div className="l-title">{a.name}</div>
                  <div className="l-sub">{ACCOUNT_TYPE_LABELS[a.type]}</div>
                </div>
                <div className="l-sub" style={{ textAlign: "right", fontWeight: 600, color: "var(--fg)" }}>
                  {formatINR(a.balance)}
                </div>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setEditAccount(a); setFormOpen(true); }}><span style={{ fontSize: 14 }}>✎</span></button>
                <button className="icon-btn" style={{ width: 30, height: 30 }} onClick={() => { setDeleteTarget(a); setDeleteOpen(true); }}><Trash2 size={13} style={{ color: "var(--red)" }} /></button>
              </div>
            ))}
          </div>
        )}
      </div>

      {formOpen && <AccountForm open onClose={() => { setFormOpen(false); setEditAccount(null); }} account={editAccount} onSuccess={() => { setFormOpen(false); setEditAccount(null); load(); }} />}

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
        title="Delete this account?"
        sub={`"${deleteTarget?.name}" and its transactions will be removed. Transfers to other accounts may be affected.`}
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