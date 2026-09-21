import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  BarChart3,
  Wallet,
  IndianRupee,
  Repeat,
  Rocket,
  Target,
  PiggyBank,
  Gauge,
  ListTodo,
  ListChecks,
  Lock,
  BellRing,
  CalendarClock,
  ChevronLeft,
  ChevronRight,
  ArrowRight,
} from "lucide-react";
import { Button } from "../components/UI.jsx";

const STEPS = [
  {
    icon: Wallet,
    emoji: "📊",
    title: "📊 Vamshi Smart Expense Tracker",
    text: "Welcome to Vamshi, your premium daily accounting ledger. Take complete control of your financial ecosystem. Log every single income, cash inflow, and recurring expenditure effortlessly in Indian Rupees (INR). Our modern categorization engine offers rich analytical charts that update in real-time, providing deep visual breakdowns of your spending habits so you can save wisely and grow your wealth sustainably.",
    features: [
      { icon: Wallet, label: "One-tap income & expense logging" },
      { icon: IndianRupee, label: "Everything works in ₹ (INR)" },
      { icon: Repeat, label: "Recurring bills & subscriptions tracked" },
      { icon: BarChart3, label: "Real-time analytical charts" },
    ],
  },
  {
    icon: Rocket,
    emoji: "🎯",
    title: "🎯 Strategic Financial Goals & Milestones",
    text: "Plan for your future milestones with precision. Whether you are saving for an emergency cushion, an investment asset, or a dream vacation, Vamshi helps you configure concrete financial targets. Allocate budgets dynamically, track your saving velocity week-over-week, and unlock progress indicators that keep you disciplined until your milestone is completely achieved.",
    features: [
      { icon: Target, label: "Set precise saving targets" },
      { icon: PiggyBank, label: "Weekly saving-velocity tracking" },
      { icon: Gauge, label: "Dynamic budget allocation" },
      { icon: Rocket, label: "Milestone progress unlocks" },
    ],
  },
  {
    icon: ListTodo,
    emoji: "✅",
    title: "✅ Daily Task Management & Payment Reminders",
    text: "Vamshi is an integrated life productivity hub. Seamlessly organize your busy routines, pen secure financial notes, and set high-priority notifications for upcoming utilities, billing cycles, and credit card dues. Avoid stressful deadlines and handle your daily obligations with automated trackers built directly into your dashboard.",
    features: [
      { icon: ListChecks, label: "Organized daily task routines" },
      { icon: Lock, label: "Secure financial note-taking" },
      { icon: BellRing, label: "Utilities & card-due alerts" },
      { icon: CalendarClock, label: "Billing-cycle trackers" },
    ],
  },
];

export default function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState(0);
  const last = step === STEPS.length - 1;

  function next() {
    if (last) navigate("/login");
    else setStep((s) => s + 1);
  }
  function prev() {
    setStep((s) => Math.max(0, s - 1));
  }

  const s = STEPS[step];
  const Icon = s.icon;

  return (
    <div className="auth-wrap onboarding-wrap">
      <div className="auth-logo">
        <div className="logo-mark">V</div>
        <h1>Vamshi</h1>
      </div>

      <div className="onboarding-card">
        <div className="ob-top">
          <div className="ob-progress">
            {STEPS.map((_, i) => (
              <span key={i} className={`ob-seg ${i <= step ? "on" : ""}`} />
            ))}
          </div>
          <button className="ob-skip" onClick={() => navigate("/login")}>
            Skip to Login
          </button>
        </div>

        <div className="ob-body">
          <div className="ob-icon" key={step}>
            <span className="ob-emoji">{s.emoji}</span>
            <Icon size={34} strokeWidth={1.8} />
          </div>

          <h2 className="ob-title">{s.title}</h2>
          <p className="ob-text">{s.text}</p>

          <div className="ob-features">
            {s.features.map((f) => {
              const F = f.icon;
              return (
                <div className="ob-feat" key={f.label}>
                  <span className="ob-feat-ic">
                    <F size={15} />
                  </span>
                  <span>{f.label}</span>
                </div>
              );
            })}
          </div>
        </div>

        <div className="ob-nav">
          {step > 0 ? (
            <Button variant="btn-outline" onClick={prev}>
              <ChevronLeft size={16} /> Back
            </Button>
          ) : (
            <span />
          )}
          <div className="ob-dots">
            {STEPS.map((_, i) => (
              <button
                key={i}
                aria-label={`Step ${i + 1}`}
                className={`ob-dot ${i === step ? "on" : ""}`}
                onClick={() => setStep(i)}
              />
            ))}
          </div>
          <Button variant="btn-primary" onClick={next}>
            {last ? (
              <>
                Get Started <ArrowRight size={16} />
              </>
            ) : (
              <>
                Next <ChevronRight size={16} />
              </>
            )}
          </Button>
        </div>
      </div>

      <p className="ob-step-label">
        Step {step + 1} of {STEPS.length}
      </p>

      <footer className="ob-foot">
        <span className="small muted">© 2026 Vamshi · Your finance &amp; life home</span>
        <div className="ob-links">
          <Link to="/terms">Terms &amp; Conditions</Link>
          <span className="ob-sep">·</span>
          <Link to="/privacy-policy">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}