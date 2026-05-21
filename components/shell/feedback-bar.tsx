"use client";

import { useState } from "react";

type Vote = "up" | "down" | null;

export function FeedbackBar() {
  const [vote, setVote] = useState<Vote>(null);
  const [note, setNote] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (submitted) {
    return (
      <div className="feedback-bar thanks">
        의견 감사합니다 — 매뉴얼 개선에 반영하겠습니다.
      </div>
    );
  }

  return (
    <div className="feedback-bar">
      <span className="q">이 문서가 도움이 되었나요?</span>
      <div className="fb-btns">
        <button
          type="button"
          className={`fb-vote${vote === "up" ? " on" : ""}`}
          onClick={() => setVote("up")}
          aria-label="도움이 됨"
        >
          👍
        </button>
        <button
          type="button"
          className={`fb-vote${vote === "down" ? " on" : ""}`}
          onClick={() => setVote("down")}
          aria-label="보강 필요"
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
          />
          <button
            type="button"
            onClick={() => setSubmitted(true)}
            style={{
              padding: "6px 12px",
              borderRadius: 6,
              border: 0,
              background: "var(--accent)",
              color: "white",
              fontSize: 12,
              fontWeight: 500,
              cursor: "pointer",
            }}
          >
            제출
          </button>
        </>
      )}
    </div>
  );
}
