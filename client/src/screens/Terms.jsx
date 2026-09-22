import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const SECTIONS = [
  {
    h: "1. Acceptance of Terms",
    p: "By accessing or using Liv (\"the app\"), you agree to be bound by these Terms & Conditions. If you do not agree, please do not use the app.",
  },
  {
    h: "2. The Service",
    p: "Liv is a personal finance companion that helps you track income, expenses, budgets, goals, tasks, notes and reminders. The app is currently provided free of charge and may display ads. We may change or discontinue features at any time.",
  },
  {
    h: "3. Account & Security",
    p: "You are responsible for keeping your login details safe and for all activity that happens under your account. Notify us immediately if you suspect any unauthorised use.",
  },
  {
    h: "4. Your Data",
    p: "Your data is stored securely and is private to you. You can export or delete your data at any time from More > Data & Backup and More > Account. We do not sell your personal data.",
  },
  {
    h: "5. Advertising",
    p: "The app may show ads served by third-party providers such as Google AdSense. These providers may use cookies or device identifiers to show relevant ads. You can manage cookie preferences in your browser.",
  },
  {
    h: "6. Accuracy of Financial Information",
    p: "Liv stores whatever you enter. We do not connect to your bank, and balances, budgets or insights are only as accurate as the information you provide. The app is a tracking tool, not an advisor.",
  },
  {
    h: "7. No Professional Advice",
    p: "Anything in the app — insights, progress or suggestions — is for informational purposes only and is not financial, tax or legal advice.",
  },
  {
    h: "8. Acceptable Use",
    p: "You agree not to misuse the app, attempt to breach its security, interfere with the service, or use it for any unlawful purpose.",
  },
  {
    h: "9. Availability",
    p: "The app depends on internet connectivity and third-party cloud infrastructure. We try to keep it reliable but do not guarantee uninterrupted availability.",
  },
  {
    h: "10. Limitation of Liability",
    p: "Liv is provided \"as is\" without warranties of any kind. To the maximum extent permitted by law, we are not liable for any indirect or consequential loss arising from your use of the app.",
  },
  {
    h: "11. Changes to these Terms",
    p: "We may update these terms from time to time. Continued use of the app after changes means you accept the updated terms.",
  },
  {
    h: "12. Contact",
    p: "Questions about these terms? Write to us at support@liv.app and we'll get back to you.",
  },
];

export default function Terms() {
  const { user } = useAuth();

  return (
    <div className="auth-wrap">
      <div className="auth-card terms-card">
        <div className="auth-logo">
          <div className="logo-mark">V</div>
          <h1>Liv</h1>
        </div>
        <Link to={user ? "/" : "/login"} className="back">
          <ChevronLeft size={18} /> Back to {user ? "home" : "sign in"}
        </Link>
        <h2 style={{ margin: "10px 0 4px" }}>Terms & Conditions</h2>
        <p className="auth-sub">Last updated: 19 September 2026</p>
        <div className="terms-body">
          {SECTIONS.map((s) => (
            <section key={s.h}>
              <h4>{s.h}</h4>
              <p>{s.p}</p>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}