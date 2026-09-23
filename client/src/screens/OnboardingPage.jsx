import { Link } from "react-router-dom";
import {
  Wallet,
  IndianRupee,
  Repeat,
  BarChart3,
  Target,
  PiggyBank,
  Gauge,
  Rocket,
  ListChecks,
  Lock,
  BellRing,
  CalendarClock,
  ArrowRight,
  LogIn,
} from "lucide-react";

const SECTIONS = [
  {
    icon: Wallet,
    title: "📊 Smart Expense & Income Tracking Ledger",
    text: "Take absolute control of your daily financial health. Log every single income, cash inflow, and recurring expenditure effortlessly in Indian Rupees (INR). Our modern categorization engine offers rich analytical charts that update in real-time, providing deep visual breakdowns of your spending habits so you can save wisely and grow your wealth sustainably.",
    features: [
      { icon: Wallet, label: "One-tap income & expense logging" },
      { icon: IndianRupee, label: "Everything works in ₹ (INR)" },
      { icon: Repeat, label: "Recurring bills & subscriptions tracked" },
      { icon: BarChart3, label: "Real-time analytical charts" },
    ],
  },
  {
    icon: Rocket,
    title: "🎯 Strategic Financial Goals & Target Milestones",
    text: "Plan for your future milestones with precision. Whether you are saving for an emergency cushion, an investment asset, or a dream vacation, Liv helps you configure concrete financial targets. Allocate budgets dynamically, track your saving velocity week-over-week, and unlock progress indicators that keep you disciplined until your milestone is completely achieved.",
    features: [
      { icon: Target, label: "Set precise saving targets" },
      { icon: PiggyBank, label: "Weekly saving-velocity tracking" },
      { icon: Gauge, label: "Dynamic budget allocation" },
      { icon: Rocket, label: "Milestone progress unlocks" },
    ],
  },
  {
    icon: ListChecks,
    title: "✅ Daily Task Management & Payment Reminders",
    text: "Liv is an integrated life productivity hub. Seamlessly organize your busy routines, pen secure financial notes, and set high-priority notifications for upcoming utilities, billing cycles, and credit card dues. Avoid stressful deadlines and handle your daily obligations with automated trackers built directly into your dashboard.",
    features: [
      { icon: ListChecks, label: "Organized daily task routines" },
      { icon: Lock, label: "Secure financial note-taking" },
      { icon: BellRing, label: "Utilities & card-due alerts" },
      { icon: CalendarClock, label: "Billing-cycle trackers" },
    ],
  },
];

export default function OnboardingPage() {
  return (
    <div className="landing">
      <nav className="landing-nav">
        <Link to="/" className="landing-brand">
          <div className="logo-mark">V</div>
          <span className="landing-brand-name">Liv</span>
        </Link>
        <Link to="/login" className="btn btn-primary landing-login">
          <LogIn size={16} /> Login / Open App
        </Link>
      </nav>

      <header className="landing-hero">
        <section className="landing-inner">
          <div className="landing-badge">Your private finance &amp; life companion</div>
          <h1 className="landing-title">
            Liv — The Ultimate All-in-One Personal Finance &amp; Productivity Hub
          </h1>
          <p className="landing-sub">
            Liv brings your money and your life into one calm, private place. Track every rupee you
            earn and spend with effortless clarity in Indian Rupees (INR), capture recurring bills
            and subscriptions before they surprise you, and plan your day with tasks, notes and
            reminders that keep you ahead of deadlines. Rich analytical charts, budgets and savings
            goals turn your daily habits into a clear picture — so you can save more, stress less
            and stay in control, all from your phone.
          </p>
          <div className="landing-hero-cta">
            <Link to="/login" className="btn btn-primary btn-lg">
              Open App Free <ArrowRight size={17} />
            </Link>
            <Link to="/register" className="btn btn-outline btn-lg">
              Create Account
            </Link>
          </div>
        </section>
      </header>

      <main className="landing-inner">
        {SECTIONS.map((s, i) => (
          <section className="landing-section" key={s.title}>
            <div className="landing-card">
              <div className="landing-section-head">
                <div className="landing-section-ic">
                  <s.icon size={22} />
                </div>
                <h2 className="landing-section-title">{s.title}</h2>
              </div>
              <p className="landing-section-text">{s.text}</p>
              <div className="ob-features landing-features">
                {s.features.map((f, fi) => {
                  const F = f.icon;
                  return (
                    <div className="ob-feat" key={f.label} style={{ animationDelay: `${fi * 40}ms` }}>
                      <span className="ob-feat-ic">
                        <F size={15} />
                      </span>
                      <span>{f.label}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        ))}

        <section className="landing-cta">
          <h3>Ready to take control of your money?</h3>
          <p className="small muted" style={{ margin: "8px 0 18px" }}>
            Free to start. No bank-account connection, no card required — sign up with just your email.
          </p>
          <Link to="/register" className="btn btn-primary btn-lg">
            Get Started Free <ArrowRight size={17} />
          </Link>
        </section>
      </main>

      <footer className="landing-foot">
        <span className="small muted">© 2026 Liv · Your finance &amp; life home</span>
        <div className="ob-links">
          <Link to="/terms">Terms &amp; Conditions</Link>
          <span className="ob-sep">·</span>
          <Link to="/privacy-policy">Privacy Policy</Link>
        </div>
      </footer>
    </div>
  );
}