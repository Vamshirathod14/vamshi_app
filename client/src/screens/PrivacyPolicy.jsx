import { Link } from "react-router-dom";
import { ChevronLeft } from "lucide-react";
import { useAuth } from "../context/AuthContext.jsx";

const SECTIONS = [
  {
    h: "1. What we collect",
    p: "We only ask for your email address (and an optional name) when you create your account. That's the only personal information we collect. Everything else in the app is data you choose to enter — income, expenses, tasks, notes and so on — and it belongs to you.",
  },
  {
    h: "2. Your data in the app",
    p: "The information you enter in Vamshi is stored securely on your private account and used only to run the app for you — displaying your totals, generating your reports and syncing across your own devices. We never track, sell, share or advertise based on your finances.",
  },
  {
    h: "3. Advertising & cookies",
    p: "The free app is supported by ads served by third parties such as Google AdSense. These providers may use cookies or similar technologies to show and measure ads. You can manage or opt out of personalised ads at Google Ad Settings (adssettings.google.com).",
  },
  {
    h: "4. Where your data is stored",
    p: "Your data is stored securely in cloud servers operated by trusted providers (MongoDB Atlas). Access is limited and protected with industry-standard security measures.",
  },
  {
    h: "5. Sharing",
    p: "We do not sell, rent or trade any of your data. We only share it with the service providers who help run the app (hosting and storage) or when the law requires it.",
  },
  {
    h: "6. Data retention & deletion",
    p: "We keep your data while your account is active. You can export it (More > Data & Backup) or permanently delete your account and all its data at any time (More > Account).",
  },
  {
    h: "7. Your rights",
    p: "You can access, correct, export or delete your data at any time. To delete your account and everything in it, use More > Account.",
  },
  {
    h: "8. Security",
    p: "We use encryption in transit, secure authentication sessions and access controls to protect your information. No method of transmission is 100% secure, but we work hard to guard your data.",
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
        <p className="auth-sub">Last updated: 20 September 2026</p>
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