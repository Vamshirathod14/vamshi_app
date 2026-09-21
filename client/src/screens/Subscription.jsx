import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ChevronLeft,
  CreditCard,
  Crown,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Tag,
  X,
} from "lucide-react";
import { api } from "../api/client.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";
import { Button, Card, Skeleton, Chip } from "../components/UI.jsx";
import { formatDateFull, formatPaise } from "../utils/format.js";

const FEATURES = [
  "Expense & income tracking",
  "Accounts & wallets",
  "Budgets and limits",
  "Financial goals",
  "Analytics & insights",
  "Recurring payments",
  "Tasks, notes & reminders",
  "Data export & backup",
];

const STATUS_META = {
  inactive: { label: "No subscription", variant: "neutral" },
  pending: { label: "Payment pending", variant: "amber" },
  active: { label: "Premium active", variant: "green" },
  expired: { label: "Expired", variant: "amber" },
  cancelled: { label: "Cancelled", variant: "red" },
};

// Maps server promo error codes to friendly, test-matching messages.
const PROMO_ERRORS = {
  INVALID: "This promo code is invalid.",
  NOT_ACTIVE: "This promo code is not active.",
  NOT_STARTED: "This promo code is not active yet.",
  EXPIRED: "This promo code has expired.",
  LIMIT_REACHED: "This promo code is no longer available.",
  ALREADY_USED: "You have already used this promo code.",
  WRONG_PLAN: "This promo code does not apply to this plan.",
  MINIMUM_NOT_MET: "This promo code does not apply to the selected amount.",
};

function loadRazorpayScript() {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve(window.Razorpay);
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve(window.Razorpay);
    s.onerror = () => reject(new Error("Could not load the payment page. Check your connection."));
    document.head.appendChild(s);
  });
}

export default function Subscription() {
  const navigate = useNavigate();
  const { user, reload, logout } = useAuth();
  const { push } = useToast();
  const [config, setConfig] = useState(null);
  const [sub, setSub] = useState(null);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [checkoutBusy, setCheckoutBusy] = useState(false);
  const [promoInput, setPromoInput] = useState("");
  const [appliedPromo, setAppliedPromo] = useState(null);
  const [promoBusy, setPromoBusy] = useState(false);
  const [promoError, setPromoError] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const [c, s, h] = await Promise.all([
          api.get("/api/subscription/config"),
          api.get("/api/subscription"),
          api.get("/api/subscription/history"),
        ]);
        if (!alive) return;
        setConfig(c);
        setSub(s.subscription);
        setHistory(h.payments || []);
      } catch (err) {
        if (alive) push(err.message || "Could not load subscription.", "error");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [push]);

  const meta = STATUS_META[sub?.status] || STATUS_META.inactive;
  const active = sub?.status === "active";
  const planAmountPaise = config?.plan?.amountPaise || 9900;
  const payablePaise = appliedPromo ? appliedPromo.finalAmount : planAmountPaise;

  async function applyPromo() {
    const code = promoInput.trim();
    if (!code) {
      setPromoError("Enter a promo code first.");
      return;
    }
    setPromoBusy(true);
    setPromoError("");
    try {
      const res = await api.post("/api/subscription/promo/validate", { code });
      setAppliedPromo(res);
      setPromoInput("");
    } catch (err) {
      setAppliedPromo(null);
      setPromoError(PROMO_ERRORS[err.code] || err.message || "This promo code is invalid.");
    } finally {
      setPromoBusy(false);
    }
  }

  function removePromo() {
    setAppliedPromo(null);
    setPromoInput("");
    setPromoError("");
  }

  async function startCheckout() {
    setCheckoutBusy(true);
    try {
      const res = await api.post("/api/subscription/order", {
        promoCode: appliedPromo ? appliedPromo.code : undefined,
      });
      await loadRazorpayScript();
      const rzp = new window.Razorpay({
        key: res.keyId,
        amount: res.order.amountPaise,
        currency: res.order.currency,
        name: "Vamshi",
        description: `${res.plan.name} · ${formatPaise(res.order.amountPaise)}/mo first payment`,
        order_id: res.order.id,
        prefill: { name: user.name, email: user.email },
        theme: { color: "#0284c7" },
        handler: async (response) => {
          try {
            await api.post("/api/subscription/verify", {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
            });
            push("Welcome to Vamshi Premium!", "success");
            await reload();
          } catch (err) {
            push(err.message || "Payment could not be confirmed.", "error");
            await reload();
          }
        },
        modal: {
          ondismiss: () => {},
        },
      });
      rzp.on("payment.failed", () => {
        push("Payment failed. You have not been charged.", "error");
        reload();
      });
      rzp.open();
    } catch (err) {
      push(err.message || "Could not start checkout. Please try again.", "error");
    } finally {
      setCheckoutBusy(false);
    }
  }

  const progress =
    active && sub.startDate && sub.endDate
      ? Math.round(
          ((Date.now() - new Date(sub.startDate).getTime()) /
            (new Date(sub.endDate).getTime() - new Date(sub.startDate).getTime())) *
            100,
        )
      : 0;

  return (
    <div className="sub-page">
      <div className="screen-head">
        <button className="back" onClick={() => (user.subscriptionStatus === "active" ? navigate("/more") : navigate("/login"))}>
          <ChevronLeft size={18} /> Back
        </button>
        <h1 className="screen-title">Subscription</h1>
        <button className="back" onClick={() => logout()} title="Sign out">
          <LogOut size={16} />
        </button>
      </div>

      <div className="page">
        {loading ? (
          <Skeleton lines={5} />
        ) : (
          <>
            {/* Status */}
            <Card className="sub-hero">
              <div className="hstack">
                <div className="sub-badge">
                  {active ? <Crown size={22} /> : <CreditCard size={22} />}
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div className="hstack" style={{ gap: 8 }}>
                    <h2 style={{ margin: 0, fontSize: 17 }}>{sub.planName}</h2>
                    <Chip variant={meta.variant}>{meta.label}</Chip>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {formatPaise(planAmountPaise)}/month · {sub.currency}
                  </div>
                </div>
              </div>

              {active && (
                <>
                  <div className="sub-dates">
                    <div>
                      <div className="small muted">Start date</div>
                      <div>{formatDateFull(sub.startDate)}</div>
                    </div>
                    <div>
                      <div className="small muted">Renews on</div>
                      <div>{formatDateFull(sub.endDate)}</div>
                    </div>
                  </div>
                  <div className="sub-progress">
                    <div className="progress">
                      <div className="progress-fill" style={{ width: `${Math.min(100, progress)}%` }} />
                    </div>
                    <div className="small muted">
                      {sub.daysLeft} day{sub.daysLeft === 1 ? "" : "s"} left
                    </div>
                  </div>
                  <Button
                    variant="btn-outline btn-sm"
                    onClick={startCheckout}
                    loading={checkoutBusy}
                    icon={<RefreshCw size={15} />}
                  >
                    Renew now at {formatPaise(planAmountPaise)}/month
                  </Button>
                  <div className="small muted" style={{ marginTop: 10, textAlign: "center" }}>
                    Renewals bill automatically at {formatPaise(planAmountPaise)}/month.
                  </div>
                </>
              )}
            </Card>

            {/* Price summary + promo — one-time / first payments */}
            {!active && !config?.configured && (
              <div className="sub-cta">
                <Button className="btn-block" variant="btn-primary" disabled title="Payments are not configured on this server yet.">
                  Unlock Vamshi Premium
                </Button>
                <div className="small muted" style={{ marginTop: 10, textAlign: "center" }}>
                  Payments are not configured on this server yet. Please try again later.
                </div>
              </div>
            )}

            {config?.configured && !active && (
              <div className="sub-price-card card">
                <div className="group-label" style={{ marginTop: 0 }}>
                  Order summary
                </div>

                {/* Promo input */}
                <div className="promo-row">
                  {appliedPromo ? (
                    <>
                      <span className="promo-applied">✓ {appliedPromo.code} applied</span>
                      <Button variant="btn-outline btn-sm" onClick={removePromo} icon={<X size={14} />}>
                        Remove
                      </Button>
                    </>
                  ) : (
                    <>
                      <div className="promo-input-wrap">
                        <Tag size={15} />
                        <input
                          className="input"
                          placeholder="Promo code"
                          value={promoInput}
                          onChange={(e) => {
                            setPromoInput(e.target.value.toUpperCase());
                            setPromoError("");
                          }}
                          onKeyDown={(e) => e.key === "Enter" && applyPromo()}
                          maxLength={40}
                          aria-label="Promo code"
                        />
                      </div>
                      <Button
                        variant="btn-outline btn-sm"
                        onClick={applyPromo}
                        loading={promoBusy}
                        disabled={!promoInput.trim()}
                      >
                        Apply
                      </Button>
                    </>
                  )}
                </div>
                {promoError && (
                  <div className="small" style={{ color: "var(--red)", marginTop: 6 }}>
                    {promoError}
                  </div>
                )}

                {/* Price breakdown */}
                <div className="price-row">
                  <span>Vamshi Premium {formatPaise(planAmountPaise)}/month</span>
                  <span>{formatPaise(planAmountPaise)}</span>
                </div>
                {appliedPromo && appliedPromo.discountAmount > 0 && (
                  <div className="price-row" style={{ color: "var(--green)", fontWeight: 600 }}>
                    <span>Promo discount ({appliedPromo.code})</span>
                    <span>− {formatPaise(appliedPromo.discountAmount)}</span>
                  </div>
                )}
                <div className="price-row total">
                  <span>Payable today</span>
                  <span>{formatPaise(payablePaise)}</span>
                </div>

                <div className="small muted" style={{ marginTop: 10, marginBottom: 14 }}>
                  {active
                    ? "Renewing extends your current subscription term."
                    : appliedPromo
                      ? "The discount applies to this first payment only. "
                      : ""}
                  {appliedPromo && (
                    <span style={{ fontWeight: 600, color: "var(--fg)" }}>
                      Next renewal: {formatPaise(planAmountPaise)}/month
                    </span>
                  )}
                  {!active && !appliedPromo && (
                    <>
                      After the first month your plan renews at {formatPaise(planAmountPaise)}/month.
                    </>
                  )}
                </div>

                <Button
                  className="btn-block"
                  variant="btn-primary"
                  onClick={startCheckout}
                  loading={checkoutBusy}
                  icon={<Crown size={16} />}
                >
                  Pay {formatPaise(payablePaise)} now
                </Button>

                {config?.mode === "test" && (
                  <div className="small muted" style={{ marginTop: 8, textAlign: "center" }}>
                    Test payments are enabled on this server.
                  </div>
                )}
                <div className="hstack" style={{ gap: 6, marginTop: 10, justifyContent: "center" }}>
                  <ShieldCheck size={14} style={{ color: "var(--green)" }} />
                  <span className="small muted">
                    Secure payment via Razorpay · No card details stored on Vamshi servers
                  </span>
                </div>
              </div>
            )}

            {sub.status === "expired" && (
              <div className="small" style={{ marginTop: 4, color: "var(--amber)", textAlign: "center" }}>
                Your subscription ended on {formatDateFull(sub.endDate)}. Your data is safe — renew to keep using it.
              </div>
            )}

            {/* Plan details */}
            {!active && (
              <div className="list-card" style={{ padding: "4px 0" }}>
                {FEATURES.map((f) => (
                  <div key={f} className="set-row">
                    <span style={{ color: "var(--green)", marginRight: 10 }}>✓</span>
                    {f}
                  </div>
                ))}
              </div>
            )}

            {/* Payment history */}
            <div className="group-label">Payment history</div>
            {history.length === 0 ? (
              <div className="empty" style={{ padding: "20px 16px" }}>
                <div className="empty-icon">🧾</div>
                <h3>No payments yet</h3>
                <p>Payments you make will appear here.</p>
              </div>
            ) : (
              <div className="list-card" style={{ padding: "4px 16px" }}>
                {history.map((p) => (
                  <div key={p.orderId} className="set-row">
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div>
                        {p.planName}
                        {p.promoCode ? <span className="promo-tag"> {p.promoCode}</span> : null}
                      </div>
                      <div className="small muted">
                        {formatDateFull(p.createdAt)}
                        {p.status === "paid" && p.paidAt ? ` · paid ${formatDateFull(p.paidAt)}` : ""}
                      </div>
                    </div>
                    <Chip variant={p.status === "paid" ? "green" : p.status === "failed" ? "red" : "amber"}>
                      {p.status}
                    </Chip>
                    <div className="small" style={{ fontWeight: 600, marginLeft: 10 }}>
                      {formatPaise(p.finalAmount)}
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="account-link">
              <Link to="/account">Manage account</Link>
            </div>
          </>
        )}
      </div>
    </div>
  );
}