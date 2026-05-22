"use client";

import { useEffect, useState } from "react";
import { subscribeToasts, toast, type ToastItem } from "@/lib/toast";

export function ToastViewport() {
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  useEffect(() => subscribeToasts(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="toast-viewport" aria-live="polite" aria-atomic="false">
      {toasts.map((t) => (
        <div
          key={t.id}
          className={`toast toast-${t.variant}`}
          role={t.variant === "error" ? "alert" : "status"}
        >
          <span className="toast-icon" aria-hidden="true">
            {t.variant === "success" ? (
              <IcCheck />
            ) : t.variant === "error" ? (
              <IcAlert />
            ) : (
              <IcInfo />
            )}
          </span>
          <span className="toast-msg">{t.message}</span>
          <button
            type="button"
            className="toast-x"
            aria-label="닫기"
            onClick={() => toast.dismiss(t.id)}
          >
            <IcClose />
          </button>
        </div>
      ))}
    </div>
  );
}

function IcCheck() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="2.5 7.5 5.5 10.5 11.5 4" />
    </svg>
  );
}

function IcAlert() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="5.5" />
      <line x1="7" y1="4" x2="7" y2="7.5" />
      <circle cx="7" cy="10" r="0.6" fill="currentColor" />
    </svg>
  );
}

function IcInfo() {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx="7" cy="7" r="5.5" />
      <line x1="7" y1="6.5" x2="7" y2="10" />
      <circle cx="7" cy="4" r="0.6" fill="currentColor" />
    </svg>
  );
}

function IcClose() {
  return (
    <svg
      width={11}
      height={11}
      viewBox="0 0 14 14"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.6}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1="3.5" y1="3.5" x2="10.5" y2="10.5" />
      <line x1="10.5" y1="3.5" x2="3.5" y2="10.5" />
    </svg>
  );
}
