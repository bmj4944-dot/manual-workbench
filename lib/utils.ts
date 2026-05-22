import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import type { Verification, VerifyState } from "./types";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * Verify state by age ratio. Below 70% of the interval → fresh, 70–100%
 * → aging (warning), past the interval → stale (needs re-verification).
 * Mirrors the dashboard logic so both surfaces stay in sync.
 */
export function verifyState(v: Verification): VerifyState {
  const ratio = v.lastVerified / v.intervalDays;
  if (ratio < 0.7) return "fresh";
  if (ratio < 1.0) return "aging";
  return "stale";
}

export function verifyLabel(state: VerifyState, v?: Verification): string {
  if (state === "fresh") return "검증 완료";
  if (state === "aging") {
    if (!v) return "만료 임박";
    const left = Math.max(0, v.intervalDays - v.lastVerified);
    return `만료 임박 (D-${left})`;
  }
  if (!v) return "재검증 필요";
  const over = Math.max(0, v.lastVerified - v.intervalDays);
  return `재검증 필요 (+${over}일)`;
}
