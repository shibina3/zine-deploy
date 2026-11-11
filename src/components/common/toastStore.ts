import { create } from 'zustand';

export type ToastTone = 'success' | 'error' | 'info' | 'warning';

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  tone: ToastTone;
  duration: number;
}

interface ToastState {
  toasts: ToastItem[];
  notify: (toast: Omit<ToastItem, 'id' | 'duration'> & { duration?: number }) => string;
  dismiss: (id: string) => void;
}

export const useToastStore = create<ToastState>((set) => ({
  toasts: [],
  notify: (toast) => {
    const id = `toast-${Date.now()}-${Math.random().toString(16).slice(2)}`;
    set((state) => ({
      toasts: [...state.toasts.slice(-3), { ...toast, id, duration: toast.duration ?? 4500 }],
    }));
    return id;
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}));

export function notifySuccess(title: string, description?: string): void {
  useToastStore.getState().notify({ title, description, tone: 'success' });
}

export function notifyError(title: string, description?: string): void {
  useToastStore.getState().notify({ title, description, tone: 'error', duration: 6500 });
}

export function notifyInfo(title: string, description?: string): void {
  useToastStore.getState().notify({ title, description, tone: 'info' });
}
