"use client";

import { useEffect, useRef, useState } from "react";
import { findNode, useWorkbench } from "@/lib/workbench-context";
import { askClaudeAction } from "@/lib/actions/ai";

type ChatMsg = { role: "user" | "assistant"; content: string };

/**
 * Floating Q&A widget anchored bottom-right. Sends the active document's
 * body as context so answers ground in the user's own manual. Stateless
 * between sessions — refresh wipes the conversation, which is fine for a
 * "ask about this doc" tool rather than a long-running assistant.
 */
export function ChatbotWidget() {
  const { tree, activeId, content: contentMap } = useWorkbench();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open && scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [open, messages, busy]);

  const ask = async () => {
    const text = draft.trim();
    if (!text || busy) return;
    const node = findNode(tree, activeId);
    const bodyRaw = contentMap[activeId]?.body ?? "";
    const docText = bodyRaw
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 10000);
    const nextMessages: ChatMsg[] = [
      ...messages,
      { role: "user", content: text },
    ];
    setMessages(nextMessages);
    setDraft("");
    setBusy(true);
    const r = await askClaudeAction({
      system: [
        "당신은 콜센터·CS팀 매뉴얼에 대해 답하는 도우미입니다.",
        "사용자가 보고 있는 매뉴얼 문서의 본문을 컨텍스트로 사용하세요.",
        "본문에 답이 없는 질문은 솔직히 \"본문에 없습니다\"라고 답하세요.",
        "한국어로 간결하게 답하세요. 단정적이고 실무적인 톤.",
        node ? `현재 문서: ${node.label}` : "",
        docText ? `--- 문서 본문 ---\n${docText}\n--- 끝 ---` : "",
      ]
        .filter(Boolean)
        .join("\n\n"),
      messages: nextMessages,
    });
    setMessages((prev) => [
      ...prev,
      {
        role: "assistant",
        content: r.ok ? r.text : `⚠️ ${r.reason}`,
      },
    ]);
    setBusy(false);
  };

  return (
    <>
      <button
        type="button"
        className="chatbot-fab"
        aria-label={open ? "챗봇 닫기" : "챗봇 열기"}
        onClick={() => setOpen((v) => !v)}
        title={open ? "닫기" : "이 문서에 대해 질문하기"}
      >
        {open ? (
          <svg
            width="20"
            height="20"
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
        ) : (
          <svg width="20" height="20" viewBox="0 0 14 14" fill="currentColor">
            <path d="M7 1.5C3.7 1.5 1 3.6 1 6.3c0 1.5.9 2.9 2.3 3.7-.1.6-.5 1.4-1 2 0 0 1.6-.2 3-1.2.5.1 1.1.2 1.7.2 3.3 0 6-2.1 6-4.7s-2.7-4.8-6-4.8z" />
          </svg>
        )}
      </button>

      {open && (
        <div className="chatbot-panel" role="dialog" aria-label="챗봇">
          <div className="cbp-hd">
            <div>
              <div className="ti">매뉴얼 Q&amp;A</div>
              <div className="ms">이 문서의 내용으로 답합니다</div>
            </div>
          </div>
          <div className="cbp-body" ref={scrollRef}>
            {messages.length === 0 && (
              <div className="cbp-empty">
                <div style={{ fontSize: 13, marginBottom: 4 }}>
                  무엇이 궁금하세요?
                </div>
                <div>예: &ldquo;환불 처리는 어떻게 하나요?&rdquo;</div>
              </div>
            )}
            {messages.map((m, i) => (
              <div key={i} className={`cbp-msg ${m.role}`}>
                {m.content}
              </div>
            ))}
            {busy && (
              <div className="cbp-msg assistant cbp-typing">
                <span className="dot" />
                <span className="dot" />
                <span className="dot" />
              </div>
            )}
          </div>
          <form
            className="cbp-input"
            onSubmit={(e) => {
              e.preventDefault();
              void ask();
            }}
          >
            <input
              type="text"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder={busy ? "답변 생성 중..." : "질문 입력"}
              disabled={busy}
            />
            <button type="submit" disabled={!draft.trim() || busy}>
              <svg
                width="14"
                height="14"
                viewBox="0 0 14 14"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.6}
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <line x1="1.5" y1="7" x2="12.5" y2="7" />
                <polyline points="8 2.5 12.5 7 8 11.5" />
              </svg>
            </button>
          </form>
        </div>
      )}
    </>
  );
}
