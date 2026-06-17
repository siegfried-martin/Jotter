// Minimal transient-toast store (framework-neutral pub/sub; rendered by <ToastHost/>).
export interface Toast {
  id: number;
  message: string;
}

let toasts: Toast[] = [];
let nextId = 1;
const listeners = new Set<() => void>();

function emit() {
  for (const l of listeners) l();
}

/** Show a transient toast; auto-dismisses after `ms`. */
export function showToast(message: string, ms = 2000) {
  const id = nextId++;
  toasts = [...toasts, { id, message }];
  emit();
  setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    emit();
  }, ms);
}

export function subscribeToasts(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

export function getToasts() {
  return toasts;
}
