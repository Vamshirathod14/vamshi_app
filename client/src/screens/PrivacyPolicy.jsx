import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const SECTIONS = [
  {
    h: "1. What we collect",
    p: "Account details (name and email), and the financial data you enter such as income, expenses, budgets, goals, tasks, notes and reminders. We also collect basic technical data like your device/browser type and IP address for security and service reliability.",
  },
  {
    h: "2. How we use your data",
    p: "To operate and improve Vamshi, keep you logged in, show you your own information, respond to support, and keep the service secure. We never sell your personal data.",
  },
  {
    h: "3. Advertising & cookies",
    p: "The free app is supported by ads served by third parties such as Google AdSense. These providers may use cookies or similar technologies and device identifiers to show and measure ads. AdChoices/Google lets you manage or opt out of personalised ads at Google Ad Settings (adssettings.google.com).",
  },
  {
    h: "4. Where your data is stored",
    p: "Your data is stored securely in cloud servers operated by trusted providers (MongoDB Atlas). Access is limited and protected with industry-standard security measures.",
  },
  {
    h: "5. Sharing",
    p: "We do not sell, rent or trade your personal data. We only share it with service providers who help run the app (hosting, storage) or where the law requires it.",
  },
  {
    h: "6. Data retention & deletion",
    p: "We keep your data while your account is active. You can export or permanently delete your data at any time from More > Data & Backup and More > Account.",
  },
  {
    h: "7. Your rights",
    p: "You can access, correct, export or delete your data. You can also disable personalised ads via your browser/AdSense settings. To delete your account and its data, use More > Account.",
  },
  {
    h: "8. Security",
    p: "We use encryption in transit, secure authentication sessions, and access controls to protect your information. No method of transmission is 100% secure, but we work hard to guard your data.",
  },
  {
    h: "9. Children's privacy",
    p: "Vamshi is not intended for children under 13, and we do not knowingly collect their data.",
  },
  {
    h: "10. Changes to this policy",
    p: "We may update this policy from time to time. Continued use of the app after changes means you accept the updated policy.",
  },
  {
    h: "11. Contact",
    p: "Questions about this policy? Write to us at support@vamshi.app.",
  },
];

export default function PrivacyPolicy() {
  const { user } = useAuth();

  return (
    <div className="auth-wrap">
      <div className="auth-card terms-card">
        <div className="auth-logo">
          <div className="logo-mark">V</div>
          <h1>Vamshi</h1>
        </div>
        <Link to={user ? "/" : "/login"} className="back">
          <ChevronLeft size={18} /> Back to {user ? "home" : "sign in"}
        </Link>
        <h2 style={{ margin: "10px 0 4px" }}>Privacy Policy</h2>
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