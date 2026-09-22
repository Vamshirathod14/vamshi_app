import { useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  CheckSquare,
  StickyNote,
  Bell,
  Wallet,
  Repeat,
  PiggyBank,
  ChevronRight,
  Settings,
  Database,
  BellRing,
  UserRound,
  Download,
  ShieldCheck,
  ScrollText,
  Lock,
} from "lucide-react";
import Layout from "../components/Layout.jsx";
import QuickAdd from "../components/QuickAdd.jsx";
import { AdBanner } from "../components/AdBanner.jsx";
import TransactionForm from "../components/TransactionForm.jsx";
import TaskForm from "../components/TaskForm.jsx";
import NoteForm from "../components/NoteForm.jsx";
import ReminderForm from "../components/ReminderForm.jsx";
import GoalForm from "../components/GoalForm.jsx";
import { useData } from "../context/DataContext.jsx";
import { useAuth } from "../context/AuthContext.jsx";

export default function More() {
  const navigate = useNavigate();
  const { refresh } = useData();
  const { user } = useAuth();
  const [addOpen, setAddOpen] = useState(false);
  const [form, setForm] = useState(null);

  const rows = [
    { to: "/transactions", icon: <ArrowRightLeft size={17} />, color: "var(--accent)", title: "Transactions", sub: "History, search & filters" },
    { to: "/tasks", icon: <CheckSquare size={17} />, color: "var(--amber)", title: "Tasks", sub: "Get things done" },
    { to: "/notes", icon: <StickyNote size={17} />, color: "var(--accent)", title: "Notes", sub: "Quick notes & checklists" },
    { to: "/reminders", icon: <Bell size={17} />, color: "var(--violet)", title: "Reminders", sub: "Never forget anything" },
  ];

  const moneyRows = [
    { to: "/budgets", icon: <PiggyBank size={17} />, color: "var(--accent)", title: "Budgets", sub: "Monthly category limits" },
    { to: "/accounts", icon: <Wallet size={17} />, color: "var(--accent)", title: "Accounts", sub: "Wallets & balances" },
    { to: "/recurring", icon: <Repeat size={17} />, color: "var(--red)", title: "Recurring payments", sub: "Auto-generate transactions" },
    { to: "/notifications", icon: <BellRing size={17} />, color: "var(--amber)", title: "Notifications", sub: "Alerts & reminders" },
  ];

  const dataRows = [
    { to: "/data", icon: <Database size={17} />, color: "var(--violet)", title: "Data & Backup", sub: "Export CSV, JSON backup" },
    { to: "/account", icon: <UserRound size={17} />, color: "var(--accent)", title: "Account", sub: "Profile & password" },
    { to: "/install", icon: <Download size={17} />, color: "var(--accent)", title: "Install app", sub: "Add Liv to your home screen" },
    { to: "/settings", icon: <Settings size={17} />, color: "var(--fg-secondary)", title: "Settings", sub: "Preferences & security" },
    { to: "/terms", icon: <ScrollText size={17} />, color: "var(--fg-tertiary)", title: "Terms & Conditions", sub: "Terms of use & conditions" },
    { to: "/privacy-policy", icon: <Lock size={17} />, color: "var(--fg-tertiary)", title: "Privacy Policy", sub: "How we handle your data" },
  ];

  if (user?.role === "admin") {
    dataRows.push({
      to: "/admin",
      icon: <ShieldCheck size={17} />,
      color: "var(--red)",
      title: "Admin",
      sub: "Users, promos & stats",
    });
  }

  const render = (list) =>
    list.map((r) => (
      <button key={r.to} className="set-row" onClick={() => navigate(r.to)}>
        <div className="set-ico" style={{ background: "var(--bg-sunken)", color: r.color }}>{r.icon}</div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div>{r.title}</div>
          <div style={{ fontSize: 12, color: "var(--fg-secondary)", fontWeight: 450, marginTop: 1 }}>{r.sub}</div>
        </div>
        <ChevronRight size={17} style={{ color: "var(--fg-tertiary)" }} />
      </button>
    ));

  const onSuccess = () => {
    refresh();
    setForm(null);
  };

  return (
    <Layout onOpenAdd={() => setAddOpen(true)}>
      <div className="page">
        <div className="screen-head">
          <h1 className="screen-title">More</h1>
        </div>

        <div className="group-label">Productivity</div>
        {render(rows)}
        <div className="group-label">Money</div>
        {render(moneyRows)}
        <div className="group-label">Data & Settings</div>
        {render(dataRows)}
        <AdBanner slot="0987654321" />
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