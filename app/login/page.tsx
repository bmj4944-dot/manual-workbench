"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const search = useSearchParams();
  const errorParam = search.get("error");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string>("");

  const supabase = createClient();
  const callback =
    typeof window !== "undefined"
      ? `${window.location.origin}/auth/callback`
      : "";

  const onMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus("sending");
    setMessage("");
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: callback },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    } else {
      setStatus("sent");
      setMessage(`${email}로 매직 링크를 보냈습니다. 메일을 확인해주세요.`);
    }
  };

  const onGoogle = async () => {
    setMessage("");
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: callback },
    });
    if (error) {
      setStatus("error");
      setMessage(error.message);
    }
    // 성공 시 supabase가 OAuth provider로 redirect — router는 사용하지 않음
  };

  return (
    <div className="grid min-h-screen place-items-center bg-surface">
      <div className="w-[400px] max-w-[92vw] rounded-[var(--radius-lg)] border border-line bg-panel p-8 shadow-sm">
        <h1 className="mb-1 text-[20px] font-bold tracking-tighter2 text-ink">
          Manual Workbench
        </h1>
        <p className="mb-6 text-[13px] text-ink-3">
          로그인해서 매뉴얼·케이스·온보딩에 접근하세요.
        </p>

        {errorParam && (
          <div className="mb-4 rounded-md border border-[oklch(0.80_0.18_28_/_0.5)] bg-[oklch(0.95_0.06_28_/_0.4)] px-3 py-2 text-[12px] text-[oklch(0.45_0.18_28)]">
            인증 콜백에서 오류: {errorParam}
          </div>
        )}

        <button
          type="button"
          onClick={onGoogle}
          className="mb-3 flex w-full items-center justify-center gap-2 rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px] font-medium text-ink hover:bg-surface-3"
        >
          <GoogleIcon /> Google로 로그인
        </button>

        <div className="my-4 flex items-center gap-2 text-[11px] text-ink-3">
          <span className="h-px flex-1 bg-line" />
          또는
          <span className="h-px flex-1 bg-line" />
        </div>

        <form onSubmit={onMagicLink} className="flex flex-col gap-2">
          <label className="text-[11.5px] font-medium text-ink-2">
            이메일
          </label>
          <input
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            className="rounded-md border border-line bg-surface-2 px-3 py-2 text-[13px] text-ink outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={status === "sending" || !email}
            className="mt-2 rounded-md bg-accent px-3 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-50"
          >
            {status === "sending" ? "보내는 중..." : "매직 링크 받기"}
          </button>
        </form>

        {message && (
          <p
            className={`mt-3 text-[12px] ${
              status === "error" ? "text-[oklch(0.55_0.18_28)]" : "text-ink-2"
            }`}
          >
            {message}
          </p>
        )}
      </div>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden="true">
      <path
        d="M21.6 12.227c0-.709-.064-1.39-.182-2.045H12v3.868h5.382a4.6 4.6 0 0 1-2 3.018v2.51h3.232c1.891-1.74 2.986-4.305 2.986-7.351z"
        fill="#4285F4"
      />
      <path
        d="M12 22c2.7 0 4.964-.895 6.614-2.422l-3.232-2.51c-.895.6-2.04.955-3.382.955-2.605 0-4.81-1.759-5.595-4.122H3.064v2.59A9.997 9.997 0 0 0 12 22z"
        fill="#34A853"
      />
      <path
        d="M6.405 13.9a6.01 6.01 0 0 1 0-3.8V7.51H3.064a10.005 10.005 0 0 0 0 8.98l3.341-2.59z"
        fill="#FBBC05"
      />
      <path
        d="M12 5.977c1.468 0 2.786.505 3.823 1.495l2.868-2.867C16.96 3.012 14.696 2 12 2A9.997 9.997 0 0 0 3.064 7.51l3.341 2.59C7.19 7.736 9.395 5.977 12 5.977z"
        fill="#EA4335"
      />
    </svg>
  );
}
