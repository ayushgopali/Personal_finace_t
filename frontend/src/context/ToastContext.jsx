import { createContext, useCallback, useContext, useMemo, useState } from 'react';

// React equivalent of showNotification() from app.js.
// Same visual output (same CSS classes/ids), driven by React state.
const ToastContext = createContext({ notify: () => {} });

let toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const notify = useCallback((message, type = 'info') => {
    const id = ++toastId;
    setToasts(prev => [...prev, { id, message, type }]);
    window.setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 2700);
  }, []);

  const value = useMemo(() => ({ notify }), [notify]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-stack" id="toastStack" aria-live="polite">
        {toasts.map(t => (
          <div key={t.id} className={`toast-message toast-${t.type}`}>
            {t.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  return useContext(ToastContext);
}
