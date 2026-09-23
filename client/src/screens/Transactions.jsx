import { useState, useEffect, useCallback, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Search, ChevronLeft, Banknote, ArrowRightLeft } from "lucide-react";
import { api } from "../api/client.js";
import { useData } from "../context/DataContext.jsx";
import Layout from "../components/Layout.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import CatIcon from "../components/CatIcon.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { EmptyState, Skeleton } from "../components/UI.jsx";
import { formatINR, dayKey, groupDayLabel, PAYMENT_METHOD_LABELS, toDateInput } from "../utils/format.js";

const TYPE_FILTERS = [
  { value: "all", label: "All" },
  { value: "expense", label: "Expenses" },
  { value: "income", label: "Income" },
  { value: "transfer", label: "Transfers" },
];

export default function Transactions() {
  const navigate = useNavigate();
  const { refresh } = useData();
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ type: "all", q: "" });
  const [sort, setSort] = useState("desc");
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.type !== "all") params.set("type", filters.type);
      if (filters.q) params.set("q", filters.q);
      params.set("sort", sort);
      const data = await api.get(`/api/transactions?${params}`);
      setTransactions(data.transactions);
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [filters.type, filters.q, sort]);

  useEffect(() => {
    load();
  }, [load]);

  const grouped = useMemo(() => {
    const map = new Map();
    for (const t of transactions) {
      const key = dayKey(t.date);
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(t);
    }
    return [...map.entries()].sort((a, b) =>
      sort === "asc" ? a[0].localeCompare(b[0]) : b[0].localeCompare(a[0]),
    );
  }, [transactions, sort]);

  const todayKey = dayKey(new Date());

  const onSuccess = () => {
    refresh();
    load();
    setForm(null);
  };

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <button className="back" onClick={() => navigate("/more")}>
            <ChevronLeft size={18} /> More
          </button>
          <h1 className="screen-title">Transactions</h1>
          <div style={{ width: 60 }} />
        </div>

        <div className="search-box">
          <Search size={17} />
          <input
            placeholder="Search transactions"
            value={filters.q}
            onChange={(e) => setFilters((f) => ({ ...f, q: e.target.value }))}
          />
        </div>

        <div className="tabs" style={{ marginBottom: 16 }}>
          {TYPE_FILTERS.map((f) => (
            <button
              key={f.value}
              className={`tab ${filters.type === f.value ? "active" : ""}`}
              onClick={() => setFilters((s) => ({ ...s, type: f.value }))}
            >
              {f.label}
            </button>
          ))}
          <button
            className="tab"
            onClick={() => setSort(sort === "desc" ? "asc" : "desc")}
          >
            {sort === "desc" ? "Newest ↓" : "Oldest ↑"}
          </button>
        </div>

        {loading ? (
          <Skeleton lines={8} />
        ) : transactions.length === 0 ? (
          <EmptyState
            icon={<Search size={30} />}
            title="No transactions found"
            sub={filters.q ? "Try a different search." : "Record your first transaction to get started."}
          />
        ) : (
          grouped.map(([key, txns]) => (
            <div key={key}>
              <div className="day-header">
                <span>{groupDayLabel(key, todayKey)}</span>
                <span style={{ color: "var(--fg-tertiary)", fontWeight: 500 }}>
                  {formatINR(
                    txns.reduce((s, t) => s + (t.type === "income" ? t.amount : t.type === "expense" || t.type === "savings" ? -t.amount : 0), 0),
                  )}
                </span>
              </div>
              <div className="list-card" style={{ marginBottom: 12 }}>
                {txns.map((t, i) => (
                  <button
                    key={t._id}
                    className="list-row"
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
                      <div className="l-title" style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                        {t.description || (t.type === "income" ? t.source : t.type === "transfer" ? "Transfer" : t.categoryId?.name) || t.type}
                      </div>
                      <div className="l-sub">
                        {t.type === "income"
                          ? t.source
                          : t.type === "transfer"
                            ? `${t.fromAccountId?.name || "?"} → ${t.toAccountId?.name || "?"}`
                            : t.categoryId?.name}
                        {t.paymentMethod && t.paymentMethod !== "other" && t.type === "expense"
                          ? ` · ${PAYMENT_METHOD_LABELS[t.paymentMethod]}`
                          : ""}
                      </div>
                    </div>
                    <div className={t.type === "income" ? "amount income" : t.type === "transfer" ? "amount" : "amount expense"} style={{ fontWeight: 650 }}>
                      {t.type === "income" ? "+" : "-"}{formatINR(t.amount)}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          ))
        )}
      </div>

      <QuickAdd open={addOpen} onClose={() => setAddOpen(false)} onSelect={setForm} />
      {form === "expense" && <TransactionForm open onClose={() => setForm(null)} type="expense" onSuccess={onSuccess} />}
      {form === "income" && <TransactionForm open onClose={() => setForm(null)} type="income" onSuccess={onSuccess} />}
      {form === "transfer" && <TransactionForm open onClose={() => setForm(null)} type="transfer" onSuccess={onSuccess} />}
      {form === "task" && <TaskForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
      {form === "note" && <NoteForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
      {form === "reminder" && <ReminderForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
      {form === "goal" && <GoalForm open onClose={() => setForm(null)} onSuccess={onSuccess} />}
    </Layout>
  );
}