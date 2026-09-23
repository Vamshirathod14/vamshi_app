import { useNavigate } from "react-router-dom";
import {
  ArrowRightLeft,
  CheckSquare,
  StickyNote,
  Bell,
  Wallet,
  Repeat,
  PiggyBank,
  Settings,
  Database,
  BellRing,
  UserRound,
  Download,
} from "lucide-react";

const groups = [
  {
    label: "Productivity",
    items: [
      { to: "/tasks", icon: CheckSquare, color: "var(--amber)", title: "Tasks" },
      { to: "/notes", icon: StickyNote, color: "var(--accent)", title: "Notes" },
      { to: "/reminders", icon: Bell, color: "var(--violet)", title: "Reminders" },
      { to: "/notifications", icon: BellRing, color: "var(--amber)", title: "Alerts" },
    ],
  },
  {
    label: "Money",
    items: [
      { to: "/transactions", icon: ArrowRightLeft, color: "var(--accent)", title: "Transactions" },
      { to: "/accounts", icon: Wallet, color: "var(--accent)", title: "Accounts" },
      { to: "/budgets", icon: PiggyBank, color: "var(--accent)", title: "Budgets" },
      { to: "/recurring", icon: Repeat, color: "var(--red)", title: "Recurring" },
    ],
  },
  {
    label: "Data & Settings",
    items: [
      { to: "/data", icon: Database, color: "var(--violet)", title: "Data" },
      { to: "/account", icon: UserRound, color: "var(--accent)", title: "Account" },
      { to: "/install", icon: Download, color: "var(--accent)", title: "Install" },
      { to: "/settings", icon: Settings, color: "var(--fg-secondary)", title: "Settings" },
    ],
  },
];

export default function QuickAccess() {
  const navigate = useNavigate();
  return (
    <div className="qa-section">
      <div className="section-title">
        <h3>Quick access</h3>
        <button className="see-all" onClick={() => navigate("/more")}>See all in More</button>
      </div>
      {groups.map((g, gi) => (
        <div key={g.label}>
          <div className="group-label" style={{ marginTop: gi === 0 ? "var(--space-3)" : "var(--space-5)" }}>{g.label}</div>
          <div className="qa-grid">
            {g.items.map((it) => {
              const Icon = it.icon;
              return (
                <button key={it.to} className="qa-tile" onClick={() => navigate(it.to)}>
                  <span
                    className="qa-ico"
                    style={{ color: it.color, background: `color-mix(in srgb, ${it.color} 12%, transparent)` }}
                  >
                    <Icon size={22} strokeWidth={2} />
                  </span>
                  <span className="qa-label">{it.title}</span>
                </button>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}