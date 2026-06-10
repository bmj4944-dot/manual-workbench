"use client";

import { useMemo, useState, useTransition } from "react";
import {
  addTeamMemberAction,
  createTeamAction,
  deleteTeamAction,
  removeTeamMemberAction,
  renameTeamAction,
} from "@/lib/actions/teams";
import { ROLE_LABELS } from "@/lib/sample-data";
import { toast, toastErrorMessage } from "@/lib/toast";
import type { Role } from "@/lib/types";
import type { TeamWithMembers } from "@/lib/data/teams";

type UserLite = {
  profileId: string;
  name: string;
  initials: string;
  color: string;
  role: Role;
};

export function TeamsClient({
  teams,
  users,
}: {
  teams: TeamWithMembers[];
  users: UserLite[];
}) {
  const [selectedId, setSelectedId] = useState<string | null>(
    teams[0]?.id ?? null,
  );
  const [newName, setNewName] = useState("");
  const [pending, startTransition] = useTransition();

  const selected = teams.find((t) => t.id === selectedId) ?? null;

  const create = () => {
    const name = newName.trim();
    if (!name) return;
    startTransition(async () => {
      try {
        const res = await createTeamAction(name);
        if (res.ok) {
          toast.success(`'${name}' 팀을 만들었습니다.`);
          setNewName("");
        } else toast.error(res.reason);
      } catch (err) {
        console.error("createTeamAction failed", err);
        toast.error(toastErrorMessage(err, "팀 생성에 실패했습니다."));
      }
    });
  };

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, margin: 0 }}>
          팀 {teams.length}개
        </h2>
        <span style={{ flex: 1 }} />
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") create();
          }}
          placeholder="새 팀 이름"
          disabled={pending}
          style={{
            padding: "7px 12px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--panel)",
            color: "var(--ink)",
            fontSize: 13,
            outline: "none",
            width: 200,
          }}
        />
        <button
          type="button"
          onClick={create}
          disabled={pending || !newName.trim()}
          style={{
            padding: "7px 14px",
            borderRadius: 6,
            border: 0,
            background: "var(--accent)",
            color: "white",
            fontSize: 12.5,
            fontWeight: 600,
            cursor: pending || !newName.trim() ? "not-allowed" : "pointer",
            opacity: pending || !newName.trim() ? 0.6 : 1,
          }}
        >
          + 팀 생성
        </button>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(240px, 1fr) minmax(320px, 1.6fr)",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* 팀 목록 */}
        <div
          style={{
            border: "1px solid var(--line)",
            borderRadius: 8,
            overflow: "hidden",
            background: "var(--panel)",
          }}
        >
          {teams.length === 0 ? (
            <div style={{ padding: 28, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
              아직 팀이 없습니다.
            </div>
          ) : (
            teams.map((t) => (
              <TeamRow
                key={t.id}
                team={t}
                active={t.id === selectedId}
                onSelect={() => setSelectedId(t.id)}
              />
            ))
          )}
        </div>

        {/* 선택 팀 멤버 */}
        {selected ? (
          <MemberPanel team={selected} users={users} />
        ) : (
          <div
            style={{
              border: "1px dashed var(--line)",
              borderRadius: 8,
              padding: 32,
              textAlign: "center",
              color: "var(--ink-3)",
              fontSize: 13,
            }}
          >
            팀을 선택하면 멤버를 관리할 수 있습니다.
          </div>
        )}
      </div>
    </div>
  );
}

function TeamRow({
  team,
  active,
  onSelect,
}: {
  team: TeamWithMembers;
  active: boolean;
  onSelect: () => void;
}) {
  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(team.name);
  const [pending, startTransition] = useTransition();

  const rename = () => {
    const clean = name.trim();
    if (!clean || clean === team.name) {
      setEditing(false);
      setName(team.name);
      return;
    }
    startTransition(async () => {
      try {
        const res = await renameTeamAction(team.id, clean);
        if (res.ok) {
          toast.success("팀 이름을 변경했습니다.");
          setEditing(false);
        } else {
          toast.error(res.reason);
          setName(team.name);
        }
      } catch (err) {
        console.error("renameTeamAction failed", err);
        toast.error(toastErrorMessage(err, "이름 변경에 실패했습니다."));
        setName(team.name);
      }
    });
  };

  const remove = () => {
    if (!window.confirm(`'${team.name}' 팀을 삭제합니까? 멤버 배정과 문서의 소유 팀 지정이 해제됩니다.`)) return;
    startTransition(async () => {
      try {
        const res = await deleteTeamAction(team.id);
        if (res.ok) toast.success("팀을 삭제했습니다.");
        else toast.error(res.reason);
      } catch (err) {
        console.error("deleteTeamAction failed", err);
        toast.error(toastErrorMessage(err, "팀 삭제에 실패했습니다."));
      }
    });
  };

  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "10px 14px",
        borderBottom: "1px solid var(--line)",
        background: active ? "var(--accent-2)" : "transparent",
        opacity: pending ? 0.5 : 1,
      }}
    >
      {editing ? (
        <input
          value={name}
          autoFocus
          onChange={(e) => setName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") rename();
            if (e.key === "Escape") {
              setEditing(false);
              setName(team.name);
            }
          }}
          onBlur={rename}
          style={{
            flex: 1,
            padding: "4px 8px",
            borderRadius: 6,
            border: "1px solid var(--accent)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: 13,
            outline: "none",
          }}
        />
      ) : (
        <button
          type="button"
          onClick={onSelect}
          style={{
            flex: 1,
            textAlign: "left",
            border: 0,
            background: "transparent",
            color: active ? "var(--accent)" : "var(--ink)",
            fontSize: 13,
            fontWeight: active ? 600 : 500,
            cursor: "pointer",
            padding: 0,
          }}
        >
          {team.name}
          <span style={{ color: "var(--ink-3)", fontWeight: 400, marginLeft: 6 }}>
            · {team.members.length}명
          </span>
        </button>
      )}
      <button
        type="button"
        onClick={() => setEditing(true)}
        disabled={pending}
        title="이름 변경"
        style={iconBtnStyle}
      >
        이름
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={pending}
        title="삭제"
        style={{ ...iconBtnStyle, color: "#c0392b", borderColor: "#c0392b" }}
      >
        삭제
      </button>
    </div>
  );
}

function MemberPanel({
  team,
  users,
}: {
  team: TeamWithMembers;
  users: UserLite[];
}) {
  const [pending, startTransition] = useTransition();
  const memberIds = useMemo(
    () => new Set(team.members.map((m) => m.profileId)),
    [team.members],
  );
  const candidates = users.filter((u) => !memberIds.has(u.profileId));

  const add = (profileId: string) => {
    if (!profileId) return;
    startTransition(async () => {
      try {
        const res = await addTeamMemberAction(team.id, profileId);
        if (res.ok) toast.success("멤버를 추가했습니다.");
        else toast.error(res.reason);
      } catch (err) {
        console.error("addTeamMemberAction failed", err);
        toast.error(toastErrorMessage(err, "멤버 추가에 실패했습니다."));
      }
    });
  };

  const remove = (profileId: string, name: string) => {
    startTransition(async () => {
      try {
        const res = await removeTeamMemberAction(team.id, profileId);
        if (res.ok) toast.success(`${name}을(를) 팀에서 제외했습니다.`);
        else toast.error(res.reason);
      } catch (err) {
        console.error("removeTeamMemberAction failed", err);
        toast.error(toastErrorMessage(err, "멤버 제외에 실패했습니다."));
      }
    });
  };

  return (
    <div
      style={{
        border: "1px solid var(--line)",
        borderRadius: 8,
        background: "var(--panel)",
        padding: 16,
        opacity: pending ? 0.6 : 1,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 14 }}>
        <h3 style={{ fontSize: 15, fontWeight: 700, margin: 0 }}>{team.name}</h3>
        <span style={{ color: "var(--ink-3)", fontSize: 12 }}>
          멤버 {team.members.length}명
        </span>
        <span style={{ flex: 1 }} />
        <select
          defaultValue=""
          disabled={pending || candidates.length === 0}
          onChange={(e) => {
            add(e.target.value);
            e.target.value = "";
          }}
          style={{
            padding: "6px 10px",
            borderRadius: 6,
            border: "1px solid var(--line)",
            background: "var(--surface)",
            color: "var(--ink)",
            fontSize: 12.5,
            maxWidth: 220,
          }}
        >
          <option value="">
            {candidates.length === 0 ? "추가할 사용자 없음" : "+ 멤버 추가…"}
          </option>
          {candidates.map((u) => (
            <option key={u.profileId} value={u.profileId}>
              {u.name} ({ROLE_LABELS[u.role].ko})
            </option>
          ))}
        </select>
      </div>

      {team.members.length === 0 ? (
        <div style={{ padding: 20, textAlign: "center", color: "var(--ink-3)", fontSize: 13 }}>
          아직 멤버가 없습니다.
        </div>
      ) : (
        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
          {team.members.map((m) => (
            <div
              key={m.profileId}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "7px 10px",
                borderRadius: 6,
                background: "var(--surface-2)",
              }}
            >
              <span
                style={{
                  display: "grid",
                  placeItems: "center",
                  width: 26,
                  height: 26,
                  borderRadius: "50%",
                  background: m.color,
                  color: "white",
                  fontSize: 11,
                  fontWeight: 600,
                }}
              >
                {m.initials}
              </span>
              <span style={{ fontSize: 13, fontWeight: 500 }}>{m.name}</span>
              <span style={{ fontSize: 11, color: "var(--ink-3)" }}>
                {ROLE_LABELS[m.role].ko}
              </span>
              <span style={{ flex: 1 }} />
              <button
                type="button"
                onClick={() => remove(m.profileId, m.name)}
                disabled={pending}
                style={iconBtnStyle}
              >
                제외
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

const iconBtnStyle: React.CSSProperties = {
  padding: "3px 8px",
  borderRadius: 6,
  border: "1px solid var(--line)",
  background: "transparent",
  color: "var(--ink-2)",
  fontSize: 11.5,
  cursor: "pointer",
};
