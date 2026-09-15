import { NavLink, useLocation } from "react-router-dom";
import { Home, BarChart3, Plus, Target, Menu } from "lucide-react";

export default function Layout({ children, onOpenAdd }) {
  const location = useLocation();

  return (
    <div className="app">
      {children}
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