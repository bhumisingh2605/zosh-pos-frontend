import { create } from 'zustand';

let idCounter = 0;

export const useToastStore = create((set) => ({
  toasts: [],
  push: (message, variant = 'info') => {
    const id = ++idCounter;
    set((s) => ({ toasts: [...s.toasts, { id, message, variant }] }));
    setTimeout(() => {
      set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) }));
    }, 4000);
  },
  dismiss: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
}));

export const toast = {
  success: (msg) => useToastStore.getState().push(msg, 'success'),
  error: (msg) => useToastStore.getState().push(msg, 'error'),
  info: (msg) => useToastStore.getState().push(msg, 'info'),
};
