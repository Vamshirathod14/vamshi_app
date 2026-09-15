import { createContext, useContext, useCallback, useState, useRef } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";

const ToastContext = createContext(null);
let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    setToasts((ts) => ts.filter((t) => t.id !== id));
    const timer = timers.current.get(id);
    if (timer) clearTimeout(timer);
    timers.current.delete(id);
  }, []);

  const push = useCallback((message, type = "info") => {
    const id = ++toastId;
    setToasts((ts) => [...ts.slice(-2), { id, message, type }]);
    timers.current.set(
      id,
      setTimeout(() => dismiss(id), type === "error" ? 3800 : 2600),
    );
  }, [dismiss]);

  const Icon = ({ type }) => {
    if (type === "success") return <CheckCircle2 size={18} />;
    if (type === "error") return <AlertCircle size={18} />;
    return <Info size={18} />;
  };

  return (
    <ToastContext.Provider value={{ push, dismiss }}>
      {children}
      <div className="toast-wrap">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`toast ${t.type}`}
            onClick={() => dismiss(t.id)}
            role="button"
          >
            <Icon type={t.type} />
            <span>{t.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}