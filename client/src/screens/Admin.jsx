import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ChevronLeft, Eye, Pencil, Plus, Power, ShieldCheck, Trash2 } from "lucide-react";
import { api } from "../api/client.js";
import { Button, Field, Sheet, Switch, Skeleton, Chip } from "../components/UI.jsx";
import { formatDate, formatPaise, toDateInput } from "../utils/format.js";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "promo", label: "Promo codes" },
];

const rup = (paise) => (paise == null ? "" : String(Math.round(paise) / 100));
const toPaise = (value) => (value === "" || value == null ? null : Math.round(Number(value) * 100));

const EMPTY_FORM = {
  code: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  startDate: "",
  expiryDate: "",
  usageLimit: "",
  perUserLimit: "1",
  minimumAmount: "",
  maximumDiscount: "",
  appliesToPlan: "vamshi-premium",
  isActive: true,
};

const statusVariant = (s) =>
  s === "active" ? "green" : s === "expired" || s === "cancelled" ? "amber" : s === "pending" ? "amber" : "neutral";

const promoStatus = (c) => {
  if (c.archived) return { label: "Archived", variant: "neutral" };
  if (!c.isActive) return { label: "Inactive", variant: "amber" };
  return { label: "Active", variant: "green" };
};

const discountLabel = (c) =>
  c.discountType === "percentage" ? `${c.discountValue}% off` : `${formatPaise(c.discountValue)} off`;

export default function Admin() {
  const navigate = useNavigate();
  const [tab, setTab] = useState("overview");

  if (tab === "promo") return <PromoCodes navigate={navigate} onBack={() => setTab("overview")} />;
  return <Overview navigate={navigate} onOpenPromo={() => setTab("promo")} />;
}

function Overview({ navigate, onOpenPromo }) {
  const [stats, setStats] = useState(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/admin/stats");
        if (alive) setStats(data);
      } catch (err) {
        if (alive) setError(err.message || "Could not load admin data.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const tiles = stats
    ? [
        { label: "Total users", value: stats.totalUsers },
        { label: "Active subscriptions", value: stats.activeSubscriptions, tone: "green" },
        { label: "Pending payments", value: stats.pendingCount, tone: "amber" },
        { label: "Inactive", value: stats.inactiveCount },
        { label: "Expired", value: stats.expiredCount, tone: "amber" },
        { label: "Cancelled", value: stats.cancelledCount, tone: "red" },
      ]
    : [];

  return (
    <div className="page">
      <div className="screen-head">
        <button className="back" onClick={() => navigate("/more")}>
          <ChevronLeft size={18} /> More
        </button>
        <h1 className="screen-title">Admin</h1>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === "overview" ? "active" : ""} onClick={onOpenPromo}>
            {t.label}
          </button>
        ))}
      </div>

      {error ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">🔒</div>
          <h3>Not allowed</h3>
          <p>{error}</p>
        </div>
      ) : !stats ? (
        <Skeleton lines={6} />
      ) : (
        <>
          <div className="admin-grid">
            {tiles.map((t) => (
              <div key={t.label} className="card admin-tile">
                <div className="stat-val" style={t.tone ? { color: `var(--${t.tone})` } : undefined}>
                  {t.value}
                </div>
                <div className="stat-lab">{t.label}</div>
              </div>
            ))}
          </div>

          <div className="hstack" style={{ justifyContent: "space-between", alignItems: "baseline" }}>
            <div className="group-label" style={{ marginTop: 0 }}>Revenue</div>
            <button className="chip-link" onClick={onOpenPromo}>Manage promo codes →</button>
          </div>
          <div className="card admin-tile revenue-tile">
            <div className="stat-val">{formatPaise(stats.revenue)}</div>
            <div className="stat-lab">Total collected from paid subscriptions</div>
          </div>

          <div className="group-label">Recent registrations</div>
          {stats.recentRegistrations.length === 0 ? (
            <div className="empty" style={{ padding: "20px 16px" }}>
              <h3>No users yet</h3>
            </div>
          ) : (
            <div className="list-card" style={{ padding: "4px 16px" }}>
              {stats.recentRegistrations.map((u) => (
                <div key={u._id} className="set-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>{u.name}</div>
                    <div className="small muted">{u.email}</div>
                  </div>
                  <div className="small muted" style={{ marginRight: 8 }}>{formatDate(u.createdAt)}</div>
                  <Chip variant={statusVariant(u.subscriptionStatus)}>{u.subscriptionStatus}</Chip>
                </div>
              ))}
            </div>
          )}

          <div className="group-label">Recent payments</div>
          {stats.recentPayments.length === 0 ? (
            <div className="empty" style={{ padding: "20px 16px" }}>
              <h3>No payments yet</h3>
            </div>
          ) : (
            <div className="list-card" style={{ padding: "4px 16px" }}>
              {stats.recentPayments.map((p) => (
                <div key={p.id} className="set-row">
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div>
                      {p.user ? p.user.name : "Deleted user"}
                      {p.promoCode ? <span className="promo-tag"> {p.promoCode}</span> : null}
                    </div>
                    <div className="small muted">{p.user ? p.user.email : ""} · {formatDate(p.createdAt)}</div>
                  </div>
                  <Chip variant={p.status === "paid" ? "green" : p.status === "failed" ? "red" : "amber"}>
                    {p.status}
                  </Chip>
                  <div className="small" style={{ fontWeight: 600, marginLeft: 10 }}>{formatPaise(p.finalAmount)}</div>
                </div>
              ))}
            </div>
          )}

          <div className="hstack" style={{ gap: 8, marginTop: 16, justifyContent: "center", color: "var(--fg-secondary)" }}>
            <ShieldCheck size={15} /> Server-protected · admins only
          </div>
        </>
      )}
    </div>
  );
}

function PromoCodes({ navigate, onBack }) {
  const [codes, setCodes] = useState(null);
  const [error, setError] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [usage, setUsage] = useState(null);
  const [usageOpen, setUsageOpen] = useState(false);

  async function load() {
    const data = await api.get("/api/admin/promo-codes");
    setCodes(data.promoCodes);
  }

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const data = await api.get("/api/admin/promo-codes");
        if (alive) setCodes(data.promoCodes);
      } catch (err) {
        if (alive) setError(err.message || "Could not load promo codes.");
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  function openCreate() {
    setEditing(null);
    setForm(EMPTY_FORM);
    setFormOpen(true);
  }

  function openEdit(c) {
    setEditing(c);
    setForm({
      code: c.code,
      description: c.description || "",
      discountType: c.discountType,
      discountValue: String(c.discountValue),
      startDate: c.startDate ? toDateInput(c.startDate) : "",
      expiryDate: c.expiryDate ? toDateInput(c.expiryDate) : "",
      usageLimit: c.usageLimit == null ? "" : String(c.usageLimit),
      perUserLimit: String(c.perUserLimit ?? 1),
      minimumAmount: rup(c.minimumAmount),
      maximumDiscount: rup(c.maximumDiscount),
      appliesToPlan: c.appliesToPlan,
      isActive: c.isActive,
    });
    setFormOpen(true);
  }

  async function saveForm() {
    const body = {
      code: form.code.trim(),
      description: form.description.trim(),
      discountType: form.discountType,
      discountValue: Number(form.discountValue),
      startDate: form.startDate ? new Date(form.startDate).toISOString() : null,
      expiryDate: form.expiryDate ? new Date(form.expiryDate).toISOString() : null,
      usageLimit: form.usageLimit === "" ? null : Number(form.usageLimit),
      perUserLimit: Number(form.perUserLimit || 1),
      minimumAmount: toPaise(form.minimumAmount),
      maximumDiscount: toPaise(form.maximumDiscount),
      appliesToPlan: form.appliesToPlan.trim() || "vamshi-premium",
      isActive: form.isActive,
    };
    setSaving(true);
    try {
      if (editing) {
        await api.patch(`/api/admin/promo-codes/${editing.id}`, body);
      } else {
        await api.post("/api/admin/promo-codes", body);
      }
      setFormOpen(false);
      setSaving(false);
      await load();
    } catch (err) {
      setSaving(false);
      window.alert(err.message || "Could not save the promo code.");
    }
  }

  async function toggleActive(c) {
    try {
      await api.patch(`/api/admin/promo-codes/${c.id}`, { isActive: !c.isActive });
      await load();
    } catch (err) {
      window.alert(err.message || "Could not update the promo code.");
    }
  }

  async function archive(c) {
    if (!window.confirm(`Archive ${c.code}? It can no longer be redeemed.`)) return;
    try {
      await api.del(`/api/admin/promo-codes/${c.id}`);
      await load();
    } catch (err) {
      window.alert(err.message || "Could not archive the promo code.");
    }
  }

  async function openUsage(c) {
    setUsage(null);
    setUsageOpen(true);
    try {
      const data = await api.get(`/api/admin/promo-codes/${c.id}/usage`);
      setUsage(data);
    } catch (err) {
      window.alert(err.message || "Could not load usage.");
      setUsageOpen(false);
    }
  }

  return (
    <div className="page">
      <div className="screen-head">
        <button className="back" onClick={onBack}>
          <ChevronLeft size={18} /> Admin
        </button>
        <h1 className="screen-title">Promo codes</h1>
      </div>

      <div className="admin-tabs">
        {TABS.map((t) => (
          <button key={t.id} className={t.id === "promo" ? "active" : ""} onClick={t.id === "promo" ? undefined : onBack}>
            {t.label}
          </button>
        ))}
      </div>

      <div className="hstack" style={{ justifyContent: "space-between", margin: "16px 0 12px" }}>
        <Button variant="btn-outline btn-sm" onClick={openCreate} icon={<Plus size={15} />}>
          New promo code
        </Button>
      </div>

      {error ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">🔒</div>
          <h3>Not allowed</h3>
          <p>{error}</p>
        </div>
      ) : !codes ? (
        <Skeleton lines={5} />
      ) : codes.length === 0 ? (
        <div className="empty" style={{ padding: "24px 16px" }}>
          <div className="empty-icon">🏷️</div>
          <h3>No promo codes yet</h3>
          <p>Create your first code to offer discounts on new subscriptions.</p>
        </div>
      ) : (
        <div className="list-card" style={{ padding: "4px 16px" }}>
          {codes.map((c) => {
            const status = promoStatus(c);
            return (
              <div key={c.id} className="set-row" style={{ alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hstack" style={{ gap: 8 }}>
                    <span style={{ fontWeight: 700 }}>{c.code}</span>
                    <Chip variant={status.variant}>{status.label}</Chip>
                  </div>
                  <div className="small muted" style={{ marginTop: 2 }}>
                    {discountLabel(c)}
                    {c.description ? ` · ${c.description}` : ""}
                    {c.expiryDate ? ` · ends ${formatDate(c.expiryDate)}` : ""}
                    {c.usageLimit != null ? ` · ${c.usedCount}/${c.usageLimit} used` : ` · ${c.usedCount} used`}
                  </div>
                </div>
                <div className="hstack" style={{ gap: 6 }}>
                  {c.usedCount > 0 && (
                    <button className="icon-btn" title="View usage" onClick={() => openUsage(c)}>
                      <Eye size={15} />
                    </button>
                  )}
                  <button className="icon-btn" title="Edit" onClick={() => openEdit(c)}>
                    <Pencil size={15} />
                  </button>
                  <button className="icon-btn" title={c.isActive ? "Deactivate" : "Activate"} onClick={() => toggleActive(c)}>
                    <Power size={15} />
                  </button>
                  <button className="icon-btn" title="Archive" style={{ color: "var(--red)" }} onClick={() => archive(c)}>
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <div className="hstack" style={{ gap: 8, marginTop: 16, justifyContent: "center", color: "var(--fg-secondary)" }}>
        <ShieldCheck size={15} /> Server-protected · admins only
      </div>

      <Sheet open={formOpen} onClose={() => setFormOpen(false)} title={editing ? `Edit ${editing.code}` : "New promo code"}>
        <Field label="Code">
          <input
            className="input"
            value={form.code}
            onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
            placeholder="e.g. WELCOME20"
            maxLength={40}
          />
        </Field>
        <Field label="Description">
          <input
            className="input"
            value={form.description}
            onChange={(e) => setForm({ ...form, description: e.target.value })}
            placeholder="Optional — shown to customers"
          />
        </Field>
        <Field label="Discount type">
          <select
            className="input"
            value={form.discountType}
            onChange={(e) => setForm({ ...form, discountType: e.target.value })}
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount</option>
          </select>
        </Field>
        <Field
          label={form.discountType === "percentage" ? "Discount value (%)" : "Discount value (₹)"}
          hint={form.discountType === "percentage" ? "Between 1 and 100." : "Fixed amount off the payable amount."}
        >
          <input
            className="input"
            type="number"
            min="0"
            step={form.discountType === "percentage" ? "1" : "0.01"}
            value={form.discountValue}
            onChange={(e) => setForm({ ...form, discountValue: e.target.value })}
          />
        </Field>
        <div className="hstack" style={{ gap: 12 }}>
          <Field label="Starts">
            <input className="input" type="date" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
          </Field>
          <Field label="Expires">
            <input className="input" type="date" value={form.expiryDate} onChange={(e) => setForm({ ...form, expiryDate: e.target.value })} />
          </Field>
        </div>
        <div className="hstack" style={{ gap: 12 }}>
          <Field label="Usage limit" hint="Empty = unlimited">
            <input className="input" type="number" min="1" value={form.usageLimit} onChange={(e) => setForm({ ...form, usageLimit: e.target.value })} />
          </Field>
          <Field label="Per-user limit">
            <input className="input" type="number" min="1" value={form.perUserLimit} onChange={(e) => setForm({ ...form, perUserLimit: e.target.value })} />
          </Field>
        </div>
        <div className="hstack" style={{ gap: 12 }}>
          <Field label="Min amount (₹)">
            <input className="input" type="number" min="0" step="0.01" value={form.minimumAmount} onChange={(e) => setForm({ ...form, minimumAmount: e.target.value })} placeholder="Any" />
          </Field>
          <Field label="Max discount (₹)">
            <input className="input" type="number" min="0" step="0.01" value={form.maximumDiscount} onChange={(e) => setForm({ ...form, maximumDiscount: e.target.value })} placeholder="Uncapped" />
          </Field>
        </div>
        <Field label="Applies to plan" hint='"*" = any plan'>
          <input className="input" value={form.appliesToPlan} onChange={(e) => setForm({ ...form, appliesToPlan: e.target.value })} />
        </Field>
        <Field label="Active">
          <Switch checked={form.isActive} onChange={(v) => setForm({ ...form, isActive: v })} />
        </Field>
        <div className="modal-actions">
          <Button variant="btn-outline" onClick={() => setFormOpen(false)}>Cancel</Button>
          <Button variant="btn-primary" onClick={saveForm} loading={saving}>
            {editing ? "Save changes" : "Create code"}
          </Button>
        </div>
      </Sheet>

      <Sheet open={usageOpen} onClose={() => setUsageOpen(false)} title={usage ? `Usage — ${usage.promo.code}` : "Usage"}>
        {!usage ? (
          <Skeleton lines={4} />
        ) : (
          <>
            <div className="hstack" style={{ gap: 10, marginBottom: 12, flexWrap: "wrap" }}>
              <div className="use-stat"><b>{usage.totals.redemptions}</b><span>redemptions</span></div>
              <div className="use-stat"><b>{formatPaise(usage.totals.discount)}</b><span>total discount given</span></div>
              <div className="use-stat"><b>{formatPaise(usage.totals.revenue)}</b><span>revenue from this code</span></div>
            </div>
            {usage.usage.length === 0 ? (
              <div className="empty" style={{ padding: "16px" }}>
                <h3>No redemptions yet</h3>
              </div>
            ) : (
              <div className="list-card" style={{ padding: "4px 16px" }}>
                {usage.usage.map((u) => (
                  <div key={u.id} className="set-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>{u.user ? u.user.name : "Deleted user"}</div>
                      <div className="small muted">{u.user ? u.user.email : ""} · {formatDate(u.usedAt)}</div>
                    </div>
                    <div className="small muted" style={{ marginRight: 8 }}>−{formatPaise(u.discountAmount)}</div>
                    <div className="small" style={{ fontWeight: 600 }}>{formatPaise(u.finalAmount)}</div>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </Sheet>
    </div>
  );
}