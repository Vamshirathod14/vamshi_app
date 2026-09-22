import { NavLink, Link, useLocation } from "react-router-dom";
import {
  Home,
  BarChart3,
  Plus,
  Target,
  Menu,
  Download,
  ScrollText,
  Lock,
  ArrowRightLeft,
  Wallet,
  PiggyBank,
  Repeat,
  CheckSquare,
  StickyNote,
  Bell,
  BellRing,
  UserRound,
  Database,
  Settings,
} from "lucide-react";

const PRIMARY = [
  { to: "/", icon: Home, label: "Home", end: true },
  { to: "/analytics", icon: BarChart3, label: "Analytics" },
  { to: "/goals", icon: Target, label: "Goals" },
];

const MONEY = [
  { to: "/transactions", icon: ArrowRightLeft, label: "Transactions" },
  { to: "/accounts", icon: Wallet, label: "Accounts" },
  { to: "/budgets", icon: PiggyBank, label: "Budgets" },
  { to: "/recurring", icon: Repeat, label: "Recurring" },
];

const PRODUCTIVITY = [
  { to: "/tasks", icon: CheckSquare, label: "Tasks" },
  { to: "/notes", icon: StickyNote, label: "Notes" },
  { to: "/reminders", icon: Bell, label: "Reminders" },
  { to: "/notifications", icon: BellRing, label: "Notifications" },
];

const ACCOUNT_LINKS = [
  { to: "/account", icon: UserRound, label: "Account" },
  { to: "/data", icon: Database, label: "Data & Backup" },
  { to: "/settings", icon: Settings, label: "Settings" },
];

function SideLink({ to, icon: Icon, label, end }) {
  return (
    <NavLink to={to} end={end} className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
      <Icon size={18} /> <span>{label}</span>
    </NavLink>
  );
}

function SideGroup({ title, items }) {
  return (
    <>
      <div className="side-group-label">{title}</div>
      <div className="side-group">
        {items.map((item) => (
          <SideLink key={item.to} {...item} />
        ))}
      </div>
    </>
  );
}

export default function Layout({ children, onOpenAdd }) {
  const location = useLocation();
  const moreActive = !["/", "/analytics", "/goals"].includes(location.pathname);

  return (
    <div className="app">
      <aside className="side-nav" aria-label="Main menu">
        <Link to="/" className="side-brand">
          <div className="logo-mark">V</div>
          <div>
            <div className="side-brand-name">Liv</div>
            <div className="side-brand-tag">Personal finance</div>
          </div>
        </Link>

        <div className="side-links">
          {PRIMARY.map((item) => (
            <SideLink key={item.to} {...item} />
          ))}
          <NavLink to="/more" className={`side-link ${moreActive ? "active" : ""}`}>
            <Menu size={18} /> <span>More</span>
          </NavLink>

          <SideGroup title="Money" items={MONEY} />
          <SideGroup title="Productivity" items={PRODUCTIVITY} />
          <SideGroup title="Data & Settings" items={ACCOUNT_LINKS} />

          <div style={{ margin: "8px 0 4px" }}>
            <button className="side-add" onClick={onOpenAdd}>
              <Plus size={19} strokeWidth={2.5} /> Add
            </button>
          </div>
        </div>

        <div className="side-foot">
          <NavLink to="/install" className={({ isActive }) => `side-link side-link-sm ${isActive ? "active" : ""}`}>
            <Download size={15} /> Install app
          </NavLink>
          <Link to="/terms" className="side-link side-link-sm">
            <ScrollText size={15} /> Terms &amp; Conditions
          </Link>
          <Link to="/privacy-policy" className="side-link side-link-sm">
            <Lock size={15} /> Privacy Policy
          </Link>
        </div>
      </aside>

      <div className="app-main">{children}</div>

      <nav className="bottom-nav" role="navigation" aria-label="Main">
        <div className="nav-inner">
          <NavLink to="/" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`} end>
            <Home size={22} />
            <span>Home</span>
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <BarChart3 size={22} />
            <span>Analytics</span>
          </NavLink>
          <div className="nav-item nav-plus">
            <button className="plus-btn" onClick={onOpenAdd} aria-label="Add transaction or task">
              <Plus size={26} strokeWidth={2.5} />
            </button>
          </div>
          <NavLink to="/goals" className={({ isActive }) => `nav-item ${isActive ? "active" : ""}`}>
            <Target size={22} />
            <span>Goals</span>
          </NavLink>
          <NavLink to="/more" className={({ isActive }) => `nav-item ${isActive || moreActive ? "active" : ""}`}>
            <Menu size={22} />
            <span>More</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}