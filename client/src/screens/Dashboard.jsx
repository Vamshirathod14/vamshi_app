import { useState, useEffect, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { Bell, ChevronRight, Plus, Lightbulb, Coins, PartyPopper, Banknote, ArrowRightLeft } from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useData } from "../context/DataContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import Layout from "../components/Layout.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import QuickAccess from "../components/QuickAccess.jsx";
import CatIcon from "../components/CatIcon.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import { Skeleton, EmptyState, Button, Card } from "../components/UI.jsx";
import { AdBanner } from "../components/AdBanner.jsx";
import InstallBanner from "../components/InstallBanner.jsx";
import { formatINR, greeting, formatMonthYear, timeLabel, toDateInput, timeAgo } from "../utils/format.js";

export default function Dashboard() {
  const { user } = useAuth();
  const { refresh } = useData();
  const { push } = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null); // {type: 'expense'|'income'|'transfer'|'task'|'note'|'reminder'|'goal'}

  const load = useCallback(async () => {
    try {
      const d = await api.get("/api/dashboard");
      setData(d);
    } catch (err) {
      push(err.message, "error");
    } finally {
      setLoading(false);
    }
  }, [push]);

  useEffect(() => {
    load();
  }, [load]);

  async function toggleTask(id, done) {
    setData((prev) => ({
      ...prev,
      todayTasks: prev.todayTasks.map((t) =>
        t.id === id ? { ...t, done } : t
      ),
    }));
    try {
      await api.patch(`/api/tasks/${id}/toggle`);
    } catch (err) {
      push(err.message, "error");
      load();
    }
  }

  function openForm(key) {
    setForm(key);
  }

  if (loading) {
    return (
      <Layout onOpenAdd={() => setAddOpen(true)}>
        <div className="page">
          <div className="skeleton" style={{ height: 24, width: 180, marginBottom: 20 }} />
          <div className="skeleton" style={{ height: 140, borderRadius: 20, marginBottom: 16 }} />
          <div className="skeleton" style={{ height: 60, borderRadius: 14, marginBottom: 16 }} />
          <Skeleton lines={4} />
        </div>
      </Layout>
    );
  }

  const onSuccess = () => {
    refresh();
    load();
    setForm(null);
  };

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="greet-row">
          <h1 className="greet">
            {greeting()} {user?.name ? `, ${user.name.split(" ")[0]}` : ""}
          </h1>
          <button className="icon-btn" onClick={() => navigate("/notifications")} aria-label="Notifications">
            <Bell size={19} />
            {data?.unread > 0 && (
              <span style={{ position: "absolute", transform: "translate(14px,-14px)", background: "var(--red)", color: "#fff", borderRadius: 999, fontSize: 10, fontWeight: 700, minWidth: 16, height: 16, display: "flex", alignItems: "center", justifyContent: "center", padding: "0 3px" }}>{data.unread}</span>
            )}
          </button>
        </div>

        <InstallBanner />

        <div className="dash-top">
          <div className="balance-card">
            <div className="balance-label">Total Balance</div>
            <div className="balance-amount">{formatINR(data.totalBalance)}</div>
            <div className="balance-actions">
              <Button variant="" onClick={() => openForm("expense")}>+ Expense</Button>
              <Button variant="" onClick={() => openForm("income")}>+ Income</Button>
              <Button variant="" onClick={() => navigate("/transactions")}>All Transactions</Button>
            </div>
          </div>

          <div className="dash-top-side">
            <div className="stat-3">
              <div className="stat-cell">
                <div className="s-label">Income</div>
                <div className="s-value" style={{ color: "var(--green)" }}>{formatINR(data.month.income, { compact: true })}</div>
              </div>
              <div className="stat-cell">
                <div className="s-label">Expenses</div>
                <div className="s-value" style={{ color: "var(--red)" }}>{formatINR(data.month.expenses, { compact: true })}</div>
              </div>
              <div className="stat-cell">
                <div className="s-label">Savings</div>
                <div className="s-value" style={{ color: "var(--accent)" }}>{formatINR(data.month.savings, { compact: true })}</div>
              </div>
            </div>

            <div className="today-card">
              <div className="today-spend">
                <div className="chip green"><Plus size={18} /></div>
                <div>
                  <div className="small muted">Today's spending</div>
                  <div className="today-amt">{formatINR(data.today.spent)}</div>
                </div>
                {data.today.count > 0 && (
                  <div className="badge neutral" style={{ marginLeft: "auto" }}>{data.today.count} txns</div>
                )}
              </div>
            </div>

            <AdBanner slot="1234567890" />
          </div>
        </div>

        <QuickAccess />

        {/* upayments */}
        {data.upcomingPayments?.length > 0 && (
          <div style={{ marginTop: 24 }}>
            <div className="section-title">
              <h3>Upcoming payments</h3>
            </div>
            <Card style={{ padding: "6px 16px" }}>
              {data.upcomingPayments.map((p, i) => (
                <div key={p.id} className="row" style={{ padding: "12px 0", borderBottom: i < data.upcomingPayments.length - 1 ? "1px solid var(--border)" : "none" }}>
                  <div className="chip sm" style={{ background: p.type === "income" ? "var(--green-soft)" : "var(--red-soft)" }}>
                    {p.type === "income" ? "💹" : "📅"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 600, fontSize: 14.5 }}>{p.description}</div>
                    <div className="small muted">{p.date ? toDateInput(p.date) : ""}</div>
                  </div>
                  <div className={p.type === "income" ? "amount income" : "amount expense"} style={{ fontWeight: 650 }}>
                    {formatINR(p.amount)}
                  </div>
                </div>
              ))}
            </Card>
          </div>
        )}

        <div className="dash-grid">
          <div className="dash-col">
        {/* recent transactions */}
        <div className="section-title">
          <h3>Recent transactions</h3>
          <button className="see-all" onClick={() => navigate("/transactions")}>See all</button>
        </div>
        {data.recentTransactions.length === 0 ? (
          <Card>
            <EmptyState
              icon={<Coins size={30} />}
              title="No transactions yet"
              sub="Start tracking where your money goes."
              action={<Button variant="btn-primary btn-sm" onClick={() => openForm("expense")}>Add Expense</Button>}
            />
          </Card>
        ) : (
          <Card style={{ padding: "6px 16px" }}>
            {data.recentTransactions.map((t, i) => (
              <button
                key={t._id}
                className="row"
                style={{ padding: "13px 0", borderBottom: i < data.recentTransactions.length - 1 ? "1px solid var(--border)" : "none", background: "none", borderLeft: "none", borderRight: "none", borderTop: "none", width: "100%", cursor: "pointer", textAlign: "left" }}
                onClick={() => navigate(`/transactions/${t._id}`)}
              >
                <div className="chip sm" style={{ background: t.type === "income" ? "var(--green-soft)" : t.type === "transfer" ? "var(--accent-soft)" : "var(--bg-sunken)" }}>
                  {t.type === "income" ? (
                    <Banknote size={16} />
                  ) : t.type === "transfer" ? (
                    <ArrowRightLeft size={16} />
                  ) : (
                    <CatIcon category={t.categoryId} size={16} />
                  )}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 550, fontSize: 14.5, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {t.description || (t.type === "income" ? t.source : t.categoryId?.name) || t.type}
                  </div>
                  <div className="small muted">{t.type === "transfer" ? "Transfer" : t.categoryId?.name || t.type}</div>
                </div>
                <div className={t.type === "income" ? "amount income" : t.type === "transfer" ? "amount" : "amount expense"}>
                  {t.type === "income" ? "" : "-"}{formatINR(t.amount)}
                </div>
              </button>
            ))}
          </Card>
        )}
        </div>

        <div className="dash-col">
        {/* today's tasks */}
        <div className="section-title">
          <h3>Today's tasks</h3>
          {data.todayTasks.length > 0 && <button className="see-all" onClick={() => navigate("/tasks")}>All tasks</button>}
        </div>
        {data.todayTasks.length === 0 ? (
          <Card>
            <EmptyState icon={<PartyPopper size={30} />} title="You're all clear" sub="No tasks for today." action={<Button variant="btn-sm" onClick={() => openForm("task")}>Add Task</Button>} />
          </Card>
        ) : (
          <Card style={{ padding: "6px 16px" }}>
            {data.todayTasks.map((t) => (
              <div className="task-item" key={t.id}>
                <button
                  className={`toggle-btn ${t.done ? "checked" : ""}`}
                  onClick={() => toggleTask(t.id, !t.done)}
                  aria-label="Toggle task"
                >
                  ✓
                </button>
                <span className={`task-title ${t.done ? "done" : ""}`}>{t.title}</span>
                {t.dueTime && <span className="small muted">{timeLabel(t.dueTime)}</span>}
              </div>
            ))}
          </Card>
        )}

        {/* smart insights */}
        <div className="insight-strip">
          <Lightbulb size={16} />
          <span>
            {Number(data.month.savings) >= 0
              ? `You're saving ${formatINR(data.month.savings)} this ${formatMonthYear(new Date())}.`
              : `You spent ${formatINR(Math.abs(data.month.savings))} more than you earned this month.`}
          </span>
        </div>

        {/* upcoming reminders */}
        {data.upcomingReminders?.length > 0 && (
          <>
            <div className="section-title">
              <h3>Upcoming reminders</h3>
              <button className="see-all" onClick={() => navigate("/reminders")}>All</button>
            </div>
            <Card style={{ padding: "6px 16px" }}>
              {data.upcomingReminders.map((r, i) => (
                <div key={r._id} className="reminder-item">
                  <div className="reminder-time">{r.time ? timeLabel(r.time) : timeAgo(r.date)}</div>
                  <div>
                    <div className="reminder-title">{r.title}</div>
                    {r.description && <div className="reminder-sub">{r.description}</div>}
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}

        {/* goals preview */}
        {data.goals?.length > 0 && (
          <>
            <div className="section-title">
              <h3>Goals</h3>
              <button className="see-all" onClick={() => navigate("/goals")}>All</button>
            </div>
            <Card>
              {data.goals.map((g, i) => (
                <div key={g.id} style={{ marginTop: i ? 16 : 0 }}>
                  <div className="hstack" style={{ marginBottom: 8 }}>
                    <div className="chip sm"><CatIcon category={g} size={15} /></div>
                    <div style={{ flex: 1, fontWeight: 600, fontSize: 14.5 }}>{g.name}</div>
                    <div className="small muted">{g.percent}%</div>
                  </div>
                  <div className="progress">
                    <div className="progress-fill" style={{ width: `${g.percent}%` }} />
                  </div>
                </div>
              ))}
            </Card>
          </>
        )}
        </div>
        </div>
      </div>

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={openForm} />

      {form === "expense" && (
        <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={onSuccess} />
      )}
      {form === "income" && (
        <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={onSuccess} />
      )}
      {form === "transfer" && (
        <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={onSuccess} />
      )}
      {form === "task" && <TaskForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
      {form === "note" && <NoteForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
      {form === "reminder" && <ReminderForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
    </Layout>
  );
}