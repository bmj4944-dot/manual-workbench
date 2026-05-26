"use client";

import { useEffect, useState } from "react";
import { submitFeedbackAction } from "@/lib/actions/feedback";
import { toast, toastErrorMessage } from "@/lib/toast";

type Vote = "up" | "down" | null;
type State = "idle" | "submitting" | "submitted";

export function FeedbackBar({ nodeId }: { nodeId: string }) {
  const [vote, setVote] = useState<Vote>(null);
  const [note, setNote] = useState("");
  const [state, setState] = useState<State>("idle");

  // 문서가 바뀌면 폼 리셋
  useEffect(() => {
    setVote(null);
    setNote("");
    setState("idle");
  }, [nodeId]);

  if (state === "submitted") {
    return (
      <div className="feedback-bar thanks">
        의견 감사합니다 — 매뉴얼 개선에 반영하겠습니다.
      </div>
    );
  }

  const submit = async () => {
    if (!vote || state === "submitting") return;
    setState("submitting");
    try {
      await submitFeedbackAction(nodeId, vote, note);
      setState("submitted");
      toast.success("피드백 감사합니다");
    } catch (err) {
      console.error("submitFeedbackAction failed", err);
      toast.error(toastErrorMessage(err, "피드백 제출에 실패했습니다"));
      setState("idle");
    }
  };

  return (
    <div className="feedback-bar">
      <span className="q">이 문서가 도움이 되었나요?</span>
      <div className="fb-btns">
        <button
          type="button"
          className={`fb-vote${vote === "up" ? " on" : ""}`}
          onClick={() => setVote("up")}
          aria-label="도움이 됨"
          disabled={state === "submitting"}
        >
          👍
        </button>
        <button
          type="button"
          className={`fb-vote${vote === "down" ? " on" : ""}`}
          onClick={() => setVote("down")}
          aria-label="보강 필요"
          disabled={state === "submitting"}
        >
          👎
        </button>
      </div>
      {vote && (
        <>
          <input
            className="fb-note"
            placeholder={
              vote === "up"
                ? "어떤 부분이 도움이 되었나요? (선택)"
                : "무엇이 부족했나요? (선택)"
            }
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") submit();
            }}
            maxLength={500}
            disabled={state === "submitting"}
          />
          <button
            type="button"
            onClick={submit}
            disabled={state === "submitting"}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: 0,
              background: "var(--accent)",
              color: "white",
              fontSize: 12,
              fontWeight: 500,
              cursor: state === "submitting" ? "wait" : "pointer",
              opacity: state === "submitting" ? 0.7 : 1,
            }}
          >
            {state === "submitting" ? "제출 중…" : "제출"}
          </button>
        </>
      )}
    </div>
  );
}
