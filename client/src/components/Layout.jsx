import { NavLink, Link, useLocation } from "react-router-dom";
import { Home, BarChart3, Plus, Target, Menu, Download, ScrollText } from "lucide-react";

export default function Layout({ children, onOpenAdd }) {
  const location = useLocation();

  return (
    <div className="app">
      <aside className="side-nav" aria-label="Main menu">
        <Link to="/" className="side-brand">
          <div className="logo-mark">V</div>
          <div>
            <div className="side-brand-name">Vamshi</div>
            <div className="side-brand-tag">Personal finance</div>
          </div>
        </Link>

        <nav className="side-links">
          <NavLink to="/" end className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
            <Home size={18} /> Home
          </NavLink>
          <NavLink to="/analytics" className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
            <BarChart3 size={18} /> Analytics
          </NavLink>
          <NavLink to="/goals" className={({ isActive }) => `side-link ${isActive ? "active" : ""}`}>
            <Target size={18} /> Goals
          </NavLink>
          <NavLink to="/more" className={({ isActive }) => `side-link ${isActive || !["/", "/analytics", "/goals"].includes(location.pathname) ? "active" : ""}`}>
            <Menu size={18} /> More
          </NavLink>

          <div style={{ marginTop: 8 }}>
            <button className="side-add" onClick={onOpenAdd}>
              <Plus size={19} strokeWidth={2.5} /> Add
            </button>
          </div>
        </nav>

        <div className="side-foot">
          <NavLink to="/install" className={({ isActive }) => `side-link side-link-sm ${isActive ? "active" : ""}`}>
            <Download size={15} /> Install app
          </NavLink>
          <Link to="/terms" className="side-link side-link-sm">
            <ScrollText size={15} /> Terms & Conditions
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
          <NavLink to="/more" className={({ isActive }) => `nav-item ${isActive || (!["/", "/analytics", "/goals"].includes(location.pathname)) ? "active" : ""}`}>
            <Menu size={22} />
            <span>More</span>
          </NavLink>
        </div>
      </nav>
    </div>
  );
}