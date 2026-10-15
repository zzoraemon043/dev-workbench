import { create } from 'zustand'

export type ToastTone = 'success' | 'error' | 'info'

export interface Toast {
  id: number
  tone: ToastTone
  message: string
}

interface ToastStore {
  toasts: Toast[]
  push: (message: string, tone?: ToastTone) => void
  dismiss: (id: number) => void
}

let nextId = 1

export const useToasts = create<ToastStore>()((set, get) => ({
  toasts: [],
  push: (message, tone = 'success') => {
    const id = nextId++
    set((state) => ({ toasts: [...state.toasts.slice(-3), { id, tone, message }] }))
    window.setTimeout(() => get().dismiss(id), 2800)
  },
  dismiss: (id) => set((state) => ({ toasts: state.toasts.filter((toast) => toast.id !== id) })),
}))

export const toast = (message: string, tone?: ToastTone) => useToasts.getState().push(message, tone)
