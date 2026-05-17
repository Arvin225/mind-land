import React, { createContext, useContext, useState, useCallback, useRef, useEffect } from 'react';

interface Toast {
  id: string;
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
}

interface ToastContextValue {
  success: (msg: string, duration?: number) => void;
  error: (msg: string, duration?: number) => void;
  info: (msg: string, duration?: number) => void;
  warning: (msg: string, duration?: number) => void;
}

const ToastContext = createContext<ToastContextValue | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<Toast[]>([]);
  const timersRef = useRef<Record<string, number>>({});

  const remove = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
    if (timersRef.current[id]) {
      window.clearTimeout(timersRef.current[id]);
      delete timersRef.current[id];
    }
  }, []);

  const add = useCallback((message: string, type: Toast['type'], duration = 3000) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setToasts(prev => [...prev, { id, message, type }]);
    timersRef.current[id] = window.setTimeout(() => remove(id), duration);
  }, [remove]);

  const value: ToastContextValue = {
    success: (msg, dur) => add(msg, 'success', dur),
    error: (msg, dur) => add(msg, 'error', dur),
    info: (msg, dur) => add(msg, 'info', dur),
    warning: (msg, dur) => add(msg, 'warning', dur),
  };

  useEffect(() => {
    setExternalToast(value);
    return () => {
      setExternalToast(null);
      Object.values(timersRef.current).forEach(t => window.clearTimeout(t));
    };
  }, [value]);

  const iconMap = {
    success: '\u2713',
    error: '\u2715',
    info: '\u2139',
    warning: '\u25C6',
  };

  const colorMap = {
    success: '#7ECA6E',
    error: '#E47571',
    info: '#A8C8D8',
    warning: '#D4A574',
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2 pointer-events-none">
        {toasts.map((toast, i) => (
          <div
            key={toast.id}
            className="liquid-glass-strong px-4 py-2.5 rounded-xl flex items-center gap-2.5 pointer-events-auto animate-toast-in"
            style={{ animationDelay: `${i * 60}ms` }}
          >
            <span style={{ color: colorMap[toast.type], fontSize: 14, fontWeight: 600 }}>
              {iconMap[toast.type]}
            </span>
            <span className="text-sm text-[#F5F0E8] font-medium">{toast.message}</span>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

let _externalToast: ToastContextValue | null = null;
export function setExternalToast(t: ToastContextValue | null) {
  _externalToast = t;
}
export function toastSuccess(msg: string, dur?: number) { _externalToast?.success(msg, dur); }
export function toastError(msg: string, dur?: number) { _externalToast?.error(msg, dur); }
export function toastInfo(msg: string, dur?: number) { _externalToast?.info(msg, dur); }
export function toastWarning(msg: string, dur?: number) { _externalToast?.warning(msg, dur); }

export default ToastProvider;
