"use client";

import { Check, ShieldAlert } from "lucide-react";
import { useWorkbench } from "@/lib/workbench-context";
import { cn } from "@/lib/utils";

export function MustReadBar({ nodeId }: { nodeId: string }) {
  const { acked, ack, mustRead } = useWorkbench();
  const required = mustRead.has(nodeId);
  if (!required) return null;
  const done = acked.has(nodeId);

  return (
    <div
      className={cn(
        "mt-6 flex items-center gap-3 rounded-[var(--radius-lg)] border px-4 py-3",
        done
          ? "border-ok/40 bg-[oklch(0.92_0.06_145_/_0.4)] text-[oklch(0.38_0.13_145)]"
          : "border-warn/50 bg-[oklch(0.96_0.05_75_/_0.6)] text-warn",
      )}
    >
      {done ? <Check size={16} /> : <ShieldAlert size={16} />}
      <div className="flex-1 text-[12.5px]">
        {done ? (
          <span>
            <strong>확인 완료</strong> — 이 항목은 필독으로 지정되어 있으며 본인이
            이미 확인했습니다.
          </span>
        ) : (
          <span>
            <strong>필독 항목입니다</strong> — 끝까지 읽으신 뒤 확인해주세요. 관리
            대시보드에서 미확인 멤버에게 알림이 발송될 수 있습니다.
          </span>
        )}
      </div>
      {!done && (
        <button
          type="button"
          onClick={() => ack(nodeId)}
          className="rounded-md bg-warn px-3 py-1 text-[12px] font-medium text-white hover:opacity-90"
        >
          확인했습니다
        </button>
      )}
    </div>
  );
}
