"use client";

import { useMemo, useState, useTransition } from "react";
import {
  inviteUserAction,
  setUserRoleAction,
} from "@/lib/actions/admin/users";
import { ROLE_LABELS } from "@/lib/sample-data";
import { toast, toastErrorMessage } from "@/lib/toast";
import type { Role } from "@/lib/types";
import type { AdminUserRow } from "@/lib/data/users";

type Filter = "all" | Role;

const ROLE_OPTIONS: Role[] = ["admin", "reviewer", "editor", "viewer"];

function formatRelative(iso: string | null): string {
  if (!iso) return "—";
  const ms = Date.now() - new Date(iso).getTime();
  if (ms < 60_000) return "방금";
  const m = Math.floor(ms / 60_000);
  if (m < 60) return `${m}분 전`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}시간 전`;
  const d = Math.floor(h / 24);
  if (d < 30) return `${d}일 전`;
  const mo = Math.floor(d / 30);
  if (mo < 12) return `${mo}개월 전`;
  return `${Math.floor(mo / 12)}년 전`;
}

export function UsersClient({
  users,
  selfProfileId,
}: {
  users: AdminUserRow[];
  selfProfileId: string | null;
}) {
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [inviteOpen, setInviteOpen] = useState(false);

  const counts = useMemo(() => {
    const c: Record<Role, number> = { admin: 0, reviewer: 0, editor: 0, viewer: 0 };
    for (const u of users) c[u.role]++;
    return c;
  }, [users]);

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return users.filter((u) => {
      if (filter !== "all" && u.role !== filter) return false;
      if (!needle) return true;
      return (
        u.name.toLowerCase().includes(needle) ||
        (u.email?.toLowerCase().includes(needle) ?? false)
      );
    });
  }, [users, q, filter]);

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 16,
        }}
      >
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          사용자 {users.length}명
        </h2>
        <span style={{ flex: 1 }} />
        <button
          type="button"
          onClick={() => setInviteOpen(true)}
          style={{
            padding: "6px 14px",
            borderRadius: 6,
            border: 0,
            background: "var(--accent)",
            color: "white",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          + 사용자 초대
        </button>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          alignItems: "center",
          marginBottom: 16,
          flexWrap: "wrap",
        }}
      >
        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="이름 또는 이메일로 검색"
          style={{
            flex: 1,
            minWidth: 240,
            padding: "8px 12px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
            fontSize: 13,
            outline: "none",
          }}
        />
        <FilterChip label={`전체 ${users.length}`} active={filter === "all"} onClick={() => setFilter("all")} />
        {ROLE_OPTIONS.map((r) => (
          <FilterChip
            key={r}
            label={`${ROLE_LABELS[r].ko} ${counts[r]}`}
            active={filter === r}
            onClick={() => setFilter(r)}
          />
        ))}
      </div>

      <div
        style={{
          border: "1px solid var(--line)",
          borderRadius: 8,
          overflow: "hidden",
          background: "var(--panel)",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(180px, 1.4fr) minmax(180px, 1.6fr) 140px 130px 130px",
            gap: 12,
            padding: "10px 16px",
            borderBottom: "1px solid var(--line)",
            background: "var(--surface-2)",
            fontSize: 11,
            fontWeight: 600,
            color: "var(--ink-3)",
            textTransform: "uppercase",
            letterSpacing: 0.4,
          }}
        >
          <div>이름</div>
          <div>이메일</div>
          <div>역할</div>
          <div>가입일</div>
          <div>마지막 로그인</div>
        </div>

        {filtered.length === 0 ? (
          <div style={{ padding: 32, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
            검색 결과가 없습니다.
          </div>
        ) : (
          filtered.map((u) => (
            <UserRow key={u.profileId} user={u} isSelf={u.profileId === selfProfileId} />
          ))
        )}
      </div>

      {inviteOpen && <InviteModal onClose={() => setInviteOpen(false)} />}
    </div>
  );
}

function FilterChip({
  label,
  active,
  onClick,
}: {
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "5px 12px",
        borderRadius: 999,
        border: `1px solid ${active ? "var(--accent)" : "var(--line)"}`,
        background: active ? "var(--accent-2)" : "transparent",
        color: active ? "var(--accent)" : "var(--ink-2)",
        fontSize: 11.5,
        cursor: "pointer",
      }}
    >
      {label}
    </button>
  );
}

function UserRow({ user, isSelf }: { user: AdminUserRow; isSelf: boolean }) {
  const [pending, startTransition] = useTransition();

  const onChange = (newRole: Role) => {
    if (newRole === user.role) return;
    startTransition(async () => {
      try {
        const res = await setUserRoleAction(user.profileId, newRole);
        if (res.ok) {
          toast.success(`${user.name} → ${ROLE_LABELS[newRole].ko}`);
        } else {
          toast.error(res.reason);
        }
      } catch (err) {
        console.error("setUserRoleAction failed", err);
        toast.error(toastErrorMessage(err, "역할 변경에 실패했습니다."));
      }
    });
  };

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(180px, 1.4fr) minmax(180px, 1.6fr) 140px 130px 130px",
        gap: 12,
        padding: "12px 16px",
        borderBottom: "1px solid var(--line)",
        alignItems: "center",
        fontSize: 13,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <span
          style={{
            display: "grid",
            placeItems: "center",
            width: 30,
            height: 30,
            borderRadius: "50%",
            background: user.color,
            color: "white",
            fontSize: 12,
            fontWeight: 600,
          }}
        >
          {user.initials}
        </span>
        <span style={{ fontWeight: 500 }}>{user.name}</span>
        {isSelf && (
          <span
            style={{
              fontSize: 10,
              padding: "1px 6px",
              borderRadius: 4,
              background: "var(--accent-2)",
              color: "var(--accent)",
            }}
          >
            나
          </span>
        )}
      </div>
      <div style={{ color: "var(--ink-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        {user.email ?? "—"}
      </div>
      <div>
        <select
          value={user.role}
          onChange={(e) => onChange(e.target.value as Role)}
          disabled={pending}
          style={{
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
            fontSize: 12,
            cursor: pending ? "wait" : "pointer",
            width: "100%",
          }}
        >
          {ROLE_OPTIONS.map((r) => (
            <option key={r} value={r}>
              {ROLE_LABELS[r].ko}
            </option>
          ))}
        </select>
      </div>
      <div style={{ color: "var(--ink-3)", fontSize: 12 }}>
        {formatRelative(user.createdAt)}
      </div>
      <div style={{ color: "var(--ink-3)", fontSize: 12 }}>
        {formatRelative(user.lastSignInAt)}
      </div>
    </div>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<Role>("viewer");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      try {
        const res = await inviteUserAction(email, role);
        if (res.ok) {
          toast.success(`${email}로 초대 메일을 보냈습니다.`);
          onClose();
        } else {
          toast.error(res.reason);
        }
      } catch (err) {
        console.error("inviteUserAction failed", err);
        toast.error(toastErrorMessage(err, "초대에 실패했습니다."));
      }
    });
  };

  return (
    <>
      <button
        type="button"
        aria-label="close backdrop"
        onClick={onClose}
        style={{
          position: "fixed",
          inset: 0,
          background: "rgba(0, 0, 0, 0.35)",
          border: 0,
          padding: 0,
          cursor: "default",
          zIndex: 50,
        }}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label="사용자 초대"
        style={{
          position: "fixed",
          top: "50%",
          left: "50%",
          transform: "translate(-50%, -50%)",
          width: 440,
          maxWidth: "92vw",
          background: "var(--panel)",
          border: "1px solid var(--line)",
          borderRadius: 10,
          padding: 20,
          zIndex: 51,
          color: "var(--ink)",
        }}
      >
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: "0 0 16px" }}>
          사용자 초대
        </h3>
        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <label style={{ fontSize: 12, color: "var(--ink-2)" }}>
            이메일
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              autoFocus
              disabled={pending}
              onKeyDown={(e) => {
                if (e.key === "Enter") submit();
                if (e.key === "Escape") onClose();
              }}
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 13,
                outline: "none",
              }}
            />
          </label>
          <label style={{ fontSize: 12, color: "var(--ink-2)" }}>
            초기 역할
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
              disabled={pending}
              style={{
                display: "block",
                width: "100%",
                marginTop: 4,
                padding: "8px 10px",
                borderRadius: 6,
                border: "1px solid var(--line)",
                background: "var(--surface)",
                color: "var(--ink)",
                fontSize: 13,
              }}
            >
              {ROLE_OPTIONS.map((r) => (
                <option key={r} value={r}>
                  {ROLE_LABELS[r].ko}
                </option>
              ))}
            </select>
          </label>
        </div>
        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 16 }}>
          <button
            type="button"
            onClick={onClose}
            disabled={pending}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: "1px solid var(--line)",
              background: "transparent",
              color: "var(--ink-2)",
              fontSize: 12.5,
              cursor: pending ? "wait" : "pointer",
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={submit}
            disabled={pending || !email.trim()}
            style={{
              padding: "6px 14px",
              borderRadius: 6,
              border: 0,
              background: "var(--accent)",
              color: "white",
              fontSize: 12.5,
              fontWeight: 600,
              cursor: pending ? "wait" : "pointer",
              opacity: pending || !email.trim() ? 0.6 : 1,
            }}
          >
            {pending ? "전송 중…" : "초대 보내기"}
          </button>
        </div>
      </div>
    </>
  );
}
