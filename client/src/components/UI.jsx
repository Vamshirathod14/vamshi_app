import { X } from "lucide-react";

export function Button({ children, variant = "", loading, className = "", icon, ...rest }) {
  return (
    <button className={`btn ${variant} ${className}`} disabled={loading} {...rest}>
      {loading ? <span className="spin" /> : icon}
      {children}
    </button>
  );
}

export function Card({ children, className = "", ...rest }) {
  return (
    <div className={`card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function Sheet({ open, onClose, title, children }) {
  if (!open) return null;
  return (
    <>
      <div className="sheet-backdrop" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true">
        <div className="sheet-handle" />
        {title && (
          <div className="hstack mb-4">
            <h2 style={{ margin: 0, fontSize: 18 }}>{title}</h2>
            <div className="spacer" />
            <button className="icon-btn" onClick={onClose} aria-label="Close">
              <X size={18} />
            </button>
          </div>
        )}
        {children}
      </div>
    </>
  );
}

export function Modal({ open, onClose, title, sub, children, actions }) {
  if (!open) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        {title && <h2>{title}</h2>}
        {sub && <p className="modal-sub">{sub}</p>}
        {children}
        {actions && <div className="modal-actions">{actions}</div>}
      </div>
    </div>
  );
}

export function Field({ label, children, hint }) {
  return (
    <div className="field">
      <label>{label}</label>
      {children}
      {hint && <div className="small muted" style={{ marginTop: 6 }}>{hint}</div>}
    </div>
  );
}

export function MoneyInput({ value, onChange, placeholder = "0", id }) {
  return (
    <div className="money-input">
      <span className="cur">₹</span>
      <input
        id={id}
        type="number"
        inputMode="decimal"
        placeholder={placeholder}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        min="0"
      />
    </div>
  );
}

export function Segmented({ options, value, onChange, equal = true }) {
  return (
    <div className="segmented">
      {options.map((o) => (
        <button
          key={o.value}
          className={value === o.value ? "active" : ""}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function ChipItem({ active, onClick, emoji, icon, label, color, condensed }) {
  return (
    <button
      className={`chip-item ${condensed ? "condensed" : ""} ${active ? "active" : ""}`}
      onClick={onClick}
    >
      <span className="cat-emoji">{icon || emoji || "📦"}</span>
      <span style={{ overflow: "hidden", textOverflow: "ellipsis", maxWidth: "100%" }}>{label}</span>
    </button>
  );
}

export function EmptyState({ icon, title, sub, action, emoji }) {
  return (
    <div className="empty">
      <div className="empty-icon">{emoji || icon || "✨"}</div>
      <h3>{title}</h3>
      <p>{sub}</p>
      {action}
    </div>
  );
}

export function Switch({ checked, onChange }) {
  return (
    <label className="switch">
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} />
      <span className="track" />
      <span className="thumb" />
    </label>
  );
}

export function Progress({ percent, tone = "" }) {
  const p = Math.max(0, Math.min(100, percent));
  return (
    <div className="progress">
      <div className={`progress-fill ${tone}`} style={{ width: `${p}%` }} />
    </div>
  );
}

export function Skeleton({ lines = 1 }) {
  return (
    <div>
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton" style={{ height: 14, marginBottom: 12 }} />
      ))}
    </div>
  );
}

export function Section({ title, action, children }) {
  return (
    <section>
      <div className="section-title">
        <h3>{title}</h3>
        {action}
      </div>
      {children}
    </section>
  );
}

export function ListCard({ children }) {
  return <div className="list-card">{children}</div>;
}

export function ListRow({ children, ...rest }) {
  return (
    <button className="list-row" {...rest}>
      {children}
    </button>
  );
}

export function Chip({ children, variant = "neutral" }) {
  return <span className={`badge ${variant}`}>{children}</span>;
}