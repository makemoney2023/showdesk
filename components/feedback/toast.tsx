"use client";

import { useEffect, useState } from "react";

export type ToastTone = "ok" | "error";

export type ToastItem = {
  id: number;
  message: string;
  tone: ToastTone;
};

let nextId = 1;
let toasts: ToastItem[] = [];
const listeners = new Set<(items: ToastItem[]) => void>();

function emit() {
  for (const listener of listeners) listener(toasts);
}

export function pushToast(message: string, tone: ToastTone = "ok") {
  const item = { id: nextId++, message, tone };
  toasts = [...toasts, item];
  emit();
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== item.id);
    emit();
  }, 4000);
}

export function ToastHost() {
  const [items, setItems] = useState<ToastItem[]>(toasts);

  useEffect(() => {
    listeners.add(setItems);
    return () => {
      listeners.delete(setItems);
    };
  }, []);

  if (items.length === 0) return null;

  return (
    <div
      className="pointer-events-none fixed top-4 right-4 z-50 flex w-80 max-w-[calc(100%-2rem)] flex-col gap-2"
      role="status"
      aria-live="polite"
    >
      {items.map((item) => (
        <p
          key={item.id}
          className={`sss-paper px-3 py-2 text-sm ${
            item.tone === "error" ? "border-sss-error text-sss-error" : ""
          }`}
        >
          {item.message}
        </p>
      ))}
    </div>
  );
}
