import { useState, useEffect, useCallback } from "react";
import { TrendingUp, Flame, Crown, CalendarDays, Wallet, CreditCard } from "lucide-react";
import {
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Tooltip,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";
import { api } from "../api/client.js";
import Layout from "../components/Layout.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { EmptyState, Skeleton, Segmented } from "../components/UI.jsx";
import { formatINR, PAYMENT_METHOD_LABELS } from "../utils/format.js";

const PERIODS = [
  { value: "today", label: "Today" },
  { value: "week", label: "Week" },
  { value: "month", label: "Month" },
  { value: "year", label: "Year" },
];

export default function Analytics() {
  const [period, setPeriod] = useState("month");
  const [summary, setSummary] = useState(null);
  const [categories, setCategories] = useState([]);
  const [insights, setInsights] = useState(null);
  const [trend, setTrend] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [s, c, i, t] = await Promise.all([
        api.get(`/api/analytics/summary?period=${period}`),
        api.get(`/api/analytics/categories?period=${period}`),
        api.get(`/api/analytics/insights?period=${period}`),
        api.get("/api/analytics/trend?type=expense&months=6"),
      ]);
      setSummary(s);
      setCategories(c.categories);
      setInsights(i);
      setTrend(t.points);
    } catch {
      // handled by empty state
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const expandedTrend = trend.flatMap((p) => [p.expense, p.income]);
  const maxY = Math.max(...expandedTrend, 0);
  void maxY;

  const pieData = categories.map((c) => ({
    name: c.name,
    value: c.amount,
    color: c.color,
    emoji: c.emoji,
  }));

  const statusCard = (icon, label, value, color = "accent") => (
    <div className="stat-box">
      <div className="stat-ico" style={{ background: `var(--${color}-soft)`, color: `var(--${color})` }}>{icon}</div>
      <div className="stat-val">{value}</div>
      <div className="stat-lab">{label}</div>
    </div>
  );

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <h1 className="screen-title">Analytics</h1>
        </div>

        <div className="pill-row">
          {PERIODS.map((p) => (
            <button key={p.value} className={`pill ${period === p.value ? "active" : ""}`} onClick={() => setPeriod(p.value)}>
              {p.label}
            </button>
          ))}
        </div>

        {loading || !summary ? (
          <Skeleton lines={10} />
        ) : (
          <>
            <div className="analytics-summary">
              <div className="a-box"><div className="a-label">Income</div><div className="a-val" style={{ color: "var(--green)" }}>{formatINR(summary.income)}</div></div>
              <div className="a-box"><div className="a-label">Expenses</div><div className="a-val" style={{ color: "var(--red)" }}>{formatINR(summary.expense)}</div></div>
              <div className="a-box"><div className="a-label">Savings</div><div className="a-val" style={{ color: "var(--accent)" }}>{formatINR(summary.savings)}</div></div>
            </div>

            <div className="stats-2" style={{ marginTop: 16 }}>
              {statusCard(<CalendarDays size={17} />, "Avg daily spend", formatINR(summary.averageDailySpend), "red")}
              {insights && (
                statusCard(
                  insights.largestExpense ? <Crown size={17} /> : <Flame size={17} />,
                  "Largest expense",
                  insights.largestExpense ? formatINR(insights.largestExpense.amount) : "—",
                  "amber",
                )
              )}
              {insights && insights.spendChange !== null && insights.spendChange !== undefined && (
                statusCard(
                  <TrendingUp size={17} />,
                  `vs last month ${Math.abs(insights.spendChange)}% ${insights.spendChange > 0 ? "up" : "down"}`,
                  `${insights.spendChange > 0 ? "+" : ""}${insights.spendChange}%`,
                  insights.spendChange > 0 ? "red" : "green",
                )
              )}
              {insights && (
                statusCard(
                  <Flame size={17} />,
                  `Total spend · ${insights.transactionCount ?? 0} txns`,
                  formatINR(insights.totalSpend),
                  "accent",
                )
              )}
            </div>

            {/* category breakdown */}
            {pieData.length > 0 && (
              <div className="card chart-card" style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>Category breakdown</h3>
                <div style={{ height: 200 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" innerRadius={55} outerRadius={82} paddingAngle={2} strokeWidth={0}>
                        {pieData.map((entry, i) => (
                          <Cell key={i} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(v) => formatINR(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div style={{ display: "grid", gap: 8, marginTop: 8 }}>
                  {categories.slice(0, 6).map((c) => (
                    <div key={c.id} className="row">
                      <span style={{ fontSize: 15 }}>{c.emoji}</span>
                      <span style={{ flex: 1, fontSize: 13.5, fontWeight: 550 }}>{c.name}</span>
                      <span className="small muted">{Math.round((c.amount / (summary.expense || 1)) * 100)}%</span>
                      <span style={{ fontWeight: 650, fontSize: 13.5 }}>{formatINR(c.amount)}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* payment methods */}
            {insights?.byMethod?.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>By payment method</h3>
                {insights.byMethod.map((m, i) => (
                  <div key={m.method} className="row" style={{ marginTop: 10 }}>
                    <div className="chip sm"><CreditCard size={15} /></div>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 550 }}>{PAYMENT_METHOD_LABELS[m.method] || m.method}</span>
                    <span style={{ fontWeight: 650, fontSize: 13.5 }}>{formatINR(m.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* by account */}
            {insights?.byAccount?.length > 0 && (
              <div className="card" style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 8px", fontSize: 15 }}>By account</h3>
                {insights.byAccount.map((a, i) => (
                  <div key={a.id} className="row" style={{ marginTop: 10 }}>
                    <div className="chip sm"><Wallet size={15} /></div>
                    <span style={{ flex: 1, fontSize: 13.5, fontWeight: 550 }}>{a.name}</span>
                    <span style={{ fontWeight: 650, fontSize: 13.5 }}>{formatINR(a.amount)}</span>
                  </div>
                ))}
              </div>
            )}

            {/* trend */}
            {trend.length > 0 && (
              <div className="card chart-card" style={{ marginTop: 16 }}>
                <h3 style={{ margin: "0 0 12px", fontSize: 15 }}>6-month trend</h3>
                <div style={{ height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={trend} barGap={2}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="var(--border)" />
                      <XAxis dataKey="month" tick={{ fill: "var(--fg-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tickFormatter={(v) => formatINR(v, { compact: true })} tick={{ fill: "var(--fg-tertiary)", fontSize: 11 }} axisLine={false} tickLine={false} width={44} />
                      <Tooltip formatter={(v, n) => [formatINR(v), n === "income" ? "Income" : "Expenses"]} labelStyle={{ color: "var(--fg)" }} contentStyle={{ background: "var(--bg-elevated)", border: "1px solid var(--border)", borderRadius: 10 }} />
                      <Bar dataKey="expense" fill="var(--red)" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="income" fill="var(--green)" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}

            {pieData.length === 0 && insights?.byMethod?.length === 0 && (
              <EmptyState emoji="📊" title="No data in this period" sub="Add some transactions to see insights." />
            )}
          </>
        )}
      </div>

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={setForm} />
      {form === "expense" && <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={() => { setForm(null); load(); }} />}
      {form === "income" && <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={() => { setForm(null); load(); }} />}
      {form === "transfer" && <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={() => { setForm(null); load(); }} />}
      {form === "task" && <TaskForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "note" && <NoteForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "reminder" && <ReminderForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={() => setForm(null)} />}
    </Layout>
  );
}