import { lazy, Suspense } from "react";
import { Routes, Route, Navigate, Outlet } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext.jsx";
import { DataProvider } from "./context/DataContext.jsx";
import { ToastProvider } from "./context/ToastContext.jsx";

const Login = lazy(() => import("./screens/Login.jsx"));
const Register = lazy(() => import("./screens/Register.jsx"));
const Terms = lazy(() => import("./screens/Terms.jsx"));
const Subscription = lazy(() => import("./screens/Subscription.jsx"));
const Install = lazy(() => import("./screens/Install.jsx"));
const Account = lazy(() => import("./screens/Account.jsx"));
const Admin = lazy(() => import("./screens/Admin.jsx"));
const Dashboard = lazy(() => import("./screens/Dashboard.jsx"));
const Analytics = lazy(() => import("./screens/Analytics.jsx"));
const Goals = lazy(() => import("./screens/Goals.jsx"));
const More = lazy(() => import("./screens/More.jsx"));
const Transactions = lazy(() => import("./screens/Transactions.jsx"));
const TransactionDetail = lazy(() => import("./screens/TransactionDetail.jsx"));
const Tasks = lazy(() => import("./screens/Tasks.jsx"));
const Notes = lazy(() => import("./screens/Notes.jsx"));
const NoteDetail = lazy(() => import("./screens/NoteDetail.jsx"));
const Reminders = lazy(() => import("./screens/Reminders.jsx"));
const Budgets = lazy(() => import("./screens/Budgets.jsx"));
const Accounts = lazy(() => import("./screens/Accounts.jsx"));
const Settings = lazy(() => import("./screens/Settings.jsx"));
const DataPage = lazy(() => import("./screens/Data.jsx"));
const Notifications = lazy(() => import("./screens/Notifications.jsx"));
const Recurring = lazy(() => import("./screens/Recurring.jsx"));

function RouteFallback() {
  return (
    <div className="auth-wrap">
      <div className="skeleton" style={{ width: 240, height: 40, borderRadius: 12 }} />
    </div>
  );
}

function ThemeBootstrap() {
  const { user } = useAuth();
  const theme = user?.theme || "light";
  const root = document.documentElement;
  if (theme === "dark") root.dataset.theme = "dark";
  else if (theme === "system") delete root.dataset.theme;
  else root.dataset.theme = "light";
  return null;
}

// All the app feature routes live under this layout. The app is FREE for all
// users right now (monetisation switched to ads), so there is no subscription
// gate. Re-enable the Premium gate later by restoring the subscription check.
function PremiumFeatures() {
  return (
    <DataProvider>
      <Outlet />
    </DataProvider>
  );
}

function Router() {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="auth-wrap">
        <div className="skeleton" style={{ width: 240, height: 40, borderRadius: 12 }} />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <ThemeBootstrap />
        <Suspense fallback={<RouteFallback />}>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="*" element={<Navigate to="/login" replace />} />
          </Routes>
        </Suspense>
      </>
    );
  }

  return (
    <>
      <ThemeBootstrap />
      <Suspense fallback={<RouteFallback />}>
        <Routes>
          {/* Account-level pages — always reachable, even when not subscribed */}
          <Route path="/subscription" element={<Subscription />} />
          <Route path="/account" element={<Account />} />
          <Route path="/terms" element={<Terms />} />
          {user.role === "admin" && <Route path="/admin" element={<Admin />} />}

          {/* Premium features (currently FREE for everyone) */}
          <Route element={<PremiumFeatures />}>
            <Route path="/" element={<Dashboard />} />
            <Route path="/install" element={<Install />} />
            <Route path="/analytics" element={<Analytics />} />
            <Route path="/goals" element={<Goals />} />
            <Route path="/more" element={<More />} />
            <Route path="/transactions" element={<Transactions />} />
            <Route path="/transactions/:id" element={<TransactionDetail />} />
            <Route path="/tasks" element={<Tasks />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="/notes/:id" element={<NoteDetail />} />
            <Route path="/reminders" element={<Reminders />} />
            <Route path="/budgets" element={<Budgets />} />
            <Route path="/accounts" element={<Accounts />} />
            <Route path="/settings" element={<Settings />} />
            <Route path="/data" element={<DataPage />} />
            <Route path="/notifications" element={<Notifications />} />
            <Route path="/recurring" element={<Recurring />} />
          </Route>

          <Route
            path="*"
            element={<Navigate to="/" replace />}
          />
        </Routes>
      </Suspense>
    </>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <AuthProvider>
        <Router />
      </AuthProvider>
    </ToastProvider>
  );
}