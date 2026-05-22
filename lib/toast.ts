// Lightweight module-singleton toast store. The store lives outside React so
// non-component code (Server Action catch blocks in workbench-context, async
// callbacks, etc.) can fire toasts without threading a hook through props.
//
// React side: <ToastViewport /> subscribes via useToastSubscription.
// Caller side: `import { toast } from "@/lib/toast"; toast.error("…")`.

export type ToastVariant = "success" | "error" | "info";

export type ToastItem = {
  id: string;
  message: string;
  variant: ToastVariant;
  duration: number; // ms; 0 = sticky (manual dismiss only)
};

type Listener = (toasts: ToastItem[]) => void;

let listeners: Listener[] = [];
let current: ToastItem[] = [];
let nextId = 1;

function emit() {
  for (const l of listeners) l(current);
}

function add(
  message: string,
  variant: ToastVariant,
  duration: number,
): string {
  const id = `t-${nextId++}`;
  current = [...current, { id, message, variant, duration }];
  emit();
  if (duration > 0 && typeof window !== "undefined") {
    window.setTimeout(() => dismiss(id), duration);
  }
  return id;
}

function dismiss(id: string) {
  const before = current.length;
  current = current.filter((t) => t.id !== id);
  if (current.length !== before) emit();
}

function clear() {
  if (current.length === 0) return;
  current = [];
  emit();
}

type Opts = { duration?: number };

export const toast = {
  success: (msg: string, opts?: Opts) =>
    add(msg, "success", opts?.duration ?? 3000),
  error: (msg: string, opts?: Opts) =>
    add(msg, "error", opts?.duration ?? 5000),
  info: (msg: string, opts?: Opts) =>
    add(msg, "info", opts?.duration ?? 4000),
  dismiss,
  clear,
};

// React subscription helper. Lives in the same module so the React component
// reads the same `current`/`listeners` as the imperative `toast.*` calls
// (HMR re-imports break separate-module singletons in dev).
export function subscribeToasts(listener: Listener): () => void {
  listeners.push(listener);
  listener(current);
  return () => {
    listeners = listeners.filter((l) => l !== listener);
  };
}

/**
 * Convenience: format a thrown error's message for display. Falls back to a
 * generic message so we never surface "[object Object]" or "undefined".
 */
export function toastErrorMessage(err: unknown, fallback: string): string {
  if (err instanceof Error && err.message) return err.message;
  if (typeof err === "string" && err) return err;
  return fallback;
}
