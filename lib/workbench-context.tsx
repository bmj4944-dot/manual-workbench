"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  CASES,
  COMPLIANCE_RECORDS,
  FAQ_LIST,
  MUST_READ_IDS,
  ONBOARDING_TASKS,
  PAGE_STATS,
  ROLE_PERMISSIONS,
  SAMPLE_COMMENTS,
  SAMPLE_CONTENT,
  SAMPLE_HISTORY,
  SAMPLE_TREE,
  TEAM_MEMBERS,
  VERIFICATION,
  WHATS_NEW,
} from "./sample-data";
import {
  addCommentAction,
  toggleResolveCommentAction,
} from "./actions/comments";
import {
  addFavoriteAction,
  removeFavoriteAction,
} from "./actions/favorites";
import { acknowledgeMustReadAction } from "./actions/compliance";
import { addTagAction, removeTagAction, saveBodyAction } from "./actions/content";
import { toast, toastErrorMessage } from "./toast";
import { rejectDocumentAction, setNodeStatusAction } from "./actions/workflow";
import {
  createUploadSignedUrlAction,
  finalizeAttachmentAction,
  finalizePdfAction,
} from "./actions/uploads";
import { deleteAttachmentAction } from "./actions/attachments";
import { createClient as createBrowserSupabase } from "./supabase/client";
import { reverifyDocumentAction } from "./actions/verifications";
import {
  addSiblingAction,
  createDocumentAction,
  deleteDocumentAction,
  duplicateDocumentAction,
  moveDocumentAction,
  renameDocumentAction,
} from "./actions/documents-crud";
import type {
  Attachment,
  Case,
  Comment,
  DocContent,
  FaqItem,
  Locale,
  NodeStatus,
  OnboardingTask,
  PageStats,
  Role,
  TeamMember,
  TreeNode,
  Verification,
  Version,
  WhatsNewItem,
} from "./types";

export type Tab = { id: string; pinned: boolean; dirty?: boolean };
export type View = "doc" | "search" | "dashboard" | "cases" | "onboarding" | "faq";
export type DocMode = "edit" | "read";
export type SaveState = "saved" | "saving";
export type QuizAnswers = Record<string, Record<number, number>>;
export type CurrentUser = TeamMember & { email: string };

type WorkbenchState = {
  tree: TreeNode[];
  activeId: string;
  openTabs: Tab[];
  maxTabs: number;
  view: View;
  searchQuery: string;
  paletteOpen: boolean;
  locale: Locale;
  role: Role;
  saveState: SaveState;
  comments: Record<string, Comment[]>;
  history: Record<string, Version[]>;
  content: Record<string, DocContent>;
  attachments: Record<string, Attachment[]>;
  cases: Case[];
  onboardingTasks: OnboardingTask[];
  faqs: FaqItem[];
  members: TeamMember[];
  currentUser: CurrentUser | null;
  pageStats: Record<string, PageStats>;
  verifications: Record<string, Verification>;
  mustRead: ReadonlySet<string>;
  whatsNew: WhatsNewItem[];
  compliance: Record<string, ReadonlySet<string>>;
  bodyOverrides: Record<string, string>;
  acked: ReadonlySet<string>;
  favorites: string[];
  whatsNewRead: ReadonlySet<string>;
  onboardingDone: ReadonlySet<string>;
  quizAnswers: QuizAnswers;

  setActiveId: (id: string) => void;
  toggleOpen: (id: string) => void;
  openTab: (id: string) => void;
  closeTab: (id: string) => void;
  closeOtherTabs: (id: string) => void;
  togglePin: (id: string) => void;
  setMaxTabs: (n: number) => void;
  setView: (v: View) => void;
  setSearchQuery: (q: string) => void;
  openSearch: (q: string) => void;
  setPaletteOpen: (b: boolean) => void;
  setLocale: (loc: Locale) => void;
  mode: DocMode;
  setMode: (m: DocMode) => void;

  setRole: (r: Role) => void;
  can: (action: string) => boolean;
  setNodeStatus: (id: string, status: NodeStatus) => boolean;
  rejectDocument: (id: string, reason: string) => Promise<void>;
  addComment: (nodeId: string, body: string, parentId?: string | null) => void;
  resolveComment: (nodeId: string, commentId: string) => void;
  setSaveState: (s: SaveState) => void;
  setDirty: (id: string, dirty: boolean) => void;
  pushVersion: (nodeId: string, body: string, desc?: string) => void;
  restoreVersion: (nodeId: string, versionId: string) => void;
  setBody: (nodeId: string, html: string) => void;
  ack: (nodeId: string) => void;
  toggleFavorite: (nodeId: string) => void;
  markWhatsNewRead: (id: string) => void;
  markAllWhatsNewRead: () => void;
  completeStep: (taskId: string) => void;
  recordQuizAnswer: (taskId: string, q: number, opt: number) => void;
  attachPdf: (nodeId: string, file: File) => Promise<void>;
  reverifyDocument: (nodeId: string) => Promise<void>;
  addTag: (nodeId: string, tag: string) => Promise<void>;
  removeTag: (nodeId: string, tag: string) => Promise<void>;
  uploadAttachment: (nodeId: string, file: File) => Promise<void>;
  deleteAttachment: (nodeId: string, attachmentId: string) => Promise<void>;
  createTreeNode: (parentId: string | null, kind: "chapter" | "section" | "item", label?: string) => Promise<void>;
  addSibling: (refId: string) => Promise<void>;
  duplicateTreeNode: (id: string) => Promise<void>;
  renameTreeNode: (id: string, label: string) => Promise<void>;
  deleteTreeNode: (id: string) => Promise<void>;
  moveTreeNode: (id: string, dir: -1 | 1) => Promise<void>;
};

const Ctx = createContext<WorkbenchState | null>(null);

function mutate(
  nodes: TreeNode[],
  id: string,
  fn: (n: TreeNode) => TreeNode,
): TreeNode[] {
  return nodes.map((n) => {
    if (n.id === id) return fn(n);
    if (n.children) return { ...n, children: mutate(n.children, id, fn) };
    return n;
  });
}

function removeTreeAndReturn(
  nodes: TreeNode[],
  id: string,
  onFound?: (n: TreeNode) => void,
): TreeNode[] {
  const out: TreeNode[] = [];
  for (const n of nodes) {
    if (n.id === id) {
      onFound?.(n);
      continue;
    }
    if (n.children) {
      out.push({ ...n, children: removeTreeAndReturn(n.children, id, onFound) });
    } else {
      out.push(n);
    }
  }
  return out;
}

function insertAfterId(
  nodes: TreeNode[],
  refId: string,
  newNode: TreeNode,
): TreeNode[] {
  const idx = nodes.findIndex((n) => n.id === refId);
  if (idx !== -1) {
    const next = [...nodes];
    next.splice(idx + 1, 0, newNode);
    return next;
  }
  return nodes.map((n) =>
    n.children
      ? { ...n, children: insertAfterId(n.children, refId, newNode) }
      : n,
  );
}

function swapSibling(
  nodes: TreeNode[],
  id: string,
  dir: -1 | 1,
): TreeNode[] {
  const idx = nodes.findIndex((n) => n.id === id);
  if (idx !== -1) {
    const j = idx + dir;
    if (j < 0 || j >= nodes.length) return nodes;
    const next = [...nodes];
    [next[idx], next[j]] = [next[j], next[idx]];
    return next;
  }
  return nodes.map((n) =>
    n.children ? { ...n, children: swapSibling(n.children, id, dir) } : n,
  );
}

export function WorkbenchProvider({
  children,
  initialCurrentUser,
  initialTree,
  initialContent,
  initialCases,
  initialOnboardingTasks,
  initialMembers,
  initialPageStats,
  initialVerifications,
  initialMustRead,
  initialWhatsNew,
  initialCompliance,
  initialComments,
  initialHistory,
  initialFavorites,
  initialAcked,
  initialAttachments,
}: {
  children: ReactNode;
  initialCurrentUser?: CurrentUser | null;
  initialTree?: TreeNode[];
  initialContent?: Record<string, DocContent>;
  initialCases?: Case[];
  initialOnboardingTasks?: OnboardingTask[];
  initialMembers?: TeamMember[];
  initialPageStats?: Record<string, PageStats>;
  initialVerifications?: Record<string, Verification>;
  initialMustRead?: ReadonlySet<string>;
  initialWhatsNew?: WhatsNewItem[];
  initialCompliance?: Record<string, ReadonlySet<string>>;
  initialComments?: Record<string, Comment[]>;
  initialHistory?: Record<string, Version[]>;
  initialFavorites?: string[];
  initialAcked?: ReadonlySet<string>;
  initialAttachments?: Record<string, Attachment[]>;
}) {
  const [tree, setTree] = useState<TreeNode[]>(initialTree ?? SAMPLE_TREE);
  const [content, setContent] = useState<Record<string, DocContent>>(
    initialContent ?? SAMPLE_CONTENT,
  );
  const [cases] = useState<Case[]>(initialCases ?? CASES);
  const [onboardingTasks] = useState<OnboardingTask[]>(
    initialOnboardingTasks ?? ONBOARDING_TASKS,
  );
  const [faqs] = useState<FaqItem[]>(FAQ_LIST);
  const [members] = useState<TeamMember[]>(initialMembers ?? TEAM_MEMBERS);
  const [currentUser] = useState<CurrentUser | null>(initialCurrentUser ?? null);
  const [pageStats] = useState<Record<string, PageStats>>(
    initialPageStats ?? PAGE_STATS,
  );
  const [verifications, setVerifications] = useState<
    Record<string, Verification>
  >(initialVerifications ?? VERIFICATION);
  const [mustRead] = useState<ReadonlySet<string>>(
    initialMustRead ?? MUST_READ_IDS,
  );
  const [whatsNew] = useState<WhatsNewItem[]>(initialWhatsNew ?? WHATS_NEW);
  const [compliance] = useState<Record<string, ReadonlySet<string>>>(
    initialCompliance ?? COMPLIANCE_RECORDS,
  );
  const [activeId, setActiveIdState] = useState<string>("ch1-2-1");
  const [openTabs, setOpenTabs] = useState<Tab[]>([{ id: "ch1-2-1", pinned: false }]);
  const [maxTabs, setMaxTabs] = useState<number>(8);
  const [view, setView] = useState<View>("doc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [locale, setLocale] = useState<Locale>("ko");
  const [mode, setMode] = useState<DocMode>("edit");
  const [role, setRole] = useState<Role>(initialCurrentUser?.role ?? "admin");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [comments, setComments] = useState<Record<string, Comment[]>>(
    initialComments ?? SAMPLE_COMMENTS,
  );
  const [history, setHistory] = useState<Record<string, Version[]>>(
    initialHistory ?? SAMPLE_HISTORY,
  );
  const [bodyOverrides, setBodyOverrides] = useState<Record<string, string>>({});
  const [acked, setAcked] = useState<ReadonlySet<string>>(
    initialAcked ?? new Set(),
  );
  const [favorites, setFavorites] = useState<string[]>(initialFavorites ?? []);
  const [attachments, setAttachments] = useState<Record<string, Attachment[]>>(
    initialAttachments ?? {},
  );
  const [whatsNewRead, setWhatsNewRead] = useState<ReadonlySet<string>>(new Set());
  const [onboardingDone, setOnboardingDone] = useState<ReadonlySet<string>>(new Set());
  const [quizAnswers, setQuizAnswers] = useState<QuizAnswers>({});

  const toggleOpen = useCallback((id: string) => {
    setTree((prev) => mutate(prev, id, (n) => ({ ...n, open: !n.open })));
  }, []);

  const openTab = useCallback(
    (id: string) => {
      setView("doc");
      setActiveIdState(id);
      setOpenTabs((prev) => {
        if (prev.some((t) => t.id === id)) return prev;
        let next: Tab[] = [...prev, { id, pinned: false }];
        if (next.length > maxTabs) {
          const firstUnpinned = next.findIndex((t) => !t.pinned);
          if (firstUnpinned !== -1) {
            next = [
              ...next.slice(0, firstUnpinned),
              ...next.slice(firstUnpinned + 1),
            ];
          }
        }
        return next;
      });
    },
    [maxTabs],
  );

  const setActiveId = useCallback((id: string) => openTab(id), [openTab]);

  const closeTab = useCallback(
    (id: string) => {
      setOpenTabs((prev) => {
        const next = prev.filter((t) => t.id !== id);
        if (next.length === 0) return prev;
        if (id === activeId) {
          const idx = prev.findIndex((t) => t.id === id);
          setActiveIdState(next[Math.min(idx, next.length - 1)].id);
        }
        return next;
      });
    },
    [activeId],
  );

  const closeOtherTabs = useCallback((id: string) => {
    setOpenTabs((prev) => prev.filter((t) => t.pinned || t.id === id));
    setActiveIdState(id);
  }, []);

  const togglePin = useCallback((id: string) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, pinned: !t.pinned } : t)),
    );
  }, []);

  const setDirty = useCallback((id: string, dirty: boolean) => {
    setOpenTabs((prev) =>
      prev.map((t) => (t.id === id ? { ...t, dirty } : t)),
    );
  }, []);

  const openSearch = useCallback((q: string) => {
    setSearchQuery(q);
    setView("search");
  }, []);

  const can = useCallback(
    (action: string) => ROLE_PERMISSIONS[role].includes(action),
    [role],
  );

  const setNodeStatus = useCallback(
    (id: string, status: NodeStatus) => {
      const needed: Record<NodeStatus, string> = {
        draft: "edit",
        review: "edit",
        approved: "approve",
        published: "publish",
      };
      if (!ROLE_PERMISSIONS[role].includes(needed[status])) return false;

      // 1) Optimistically update tree status
      let prevStatus: NodeStatus | undefined;
      setTree((prev) =>
        mutate(prev, id, (n) => {
          prevStatus = n.status;
          return { ...n, status };
        }),
      );

      // 2) Optimistically append a version snapshot (matches what the server
      //    action does). Skip for 'draft' transitions (no snapshot server-side).
      let optimisticVersionId: string | null = null;
      const me = currentUser ?? members.find((m) => m.role === role) ?? members[0];
      if (status !== "draft" && me) {
        const STATUS_LABEL_KO: Record<NodeStatus, string> = {
          draft: "초안",
          review: "검토중",
          approved: "승인",
          published: "공개",
        };
        const currentBody = bodyOverrides[id] ?? content[id]?.body ?? "";
        const tag: Version["tag"] | undefined =
          status === "approved" || status === "published" ? status : undefined;
        optimisticVersionId = `tmp-${Date.now()}`;
        setHistory((prev) => {
          const list = prev[id] ?? [];
          const head = list[0];
          const lastV = head ? parseFloat(head.v.replace(/^v/, "")) : 1.0;
          const nextV = `v${(lastV + 0.1).toFixed(1)}`;
          const newVersion: Version = {
            id: optimisticVersionId!,
            v: nextV,
            who: me.name,
            when: "방금",
            desc: `상태 변경 → ${STATUS_LABEL_KO[status]}`,
            body: currentBody,
            ...(tag ? { tag } : {}),
          };
          return { ...prev, [id]: [newVersion, ...list].slice(0, 30) };
        });
      }

      // 3) Server action; on failure, rollback both tree status and version.
      setNodeStatusAction(id, status).catch((err) => {
        console.error("setNodeStatusAction failed", err);
        toast.error(toastErrorMessage(err, "상태 변경에 실패했습니다."));
        setTree((prev) =>
          mutate(prev, id, (n) => ({ ...n, status: prevStatus })),
        );
        if (optimisticVersionId) {
          const vid = optimisticVersionId;
          setHistory((prev) => ({
            ...prev,
            [id]: (prev[id] ?? []).filter((x) => x.id !== vid),
          }));
        }
      });
      return true;
    },
    [role, members, currentUser, bodyOverrides, content],
  );

  const rejectDocument = useCallback(
    async (id: string, reason: string) => {
      const trimmed = reason.trim();
      if (!trimmed) {
        toast.error("거부 사유를 입력하세요.");
        return;
      }
      if (!ROLE_PERMISSIONS[role].includes("review")) {
        toast.error("거부는 리뷰어 이상만 수행할 수 있습니다.");
        return;
      }

      let prevStatus: NodeStatus | undefined;
      setTree((prev) =>
        mutate(prev, id, (n) => {
          prevStatus = n.status;
          return { ...n, status: "draft" };
        }),
      );

      const me = currentUser ?? members.find((m) => m.role === role) ?? members[0];
      const optimisticId = `tmp-${Date.now()}`;
      if (me) {
        const newComment: Comment = {
          id: optimisticId,
          who: me.name,
          initials: me.initials,
          color: me.color,
          when: "방금",
          body: `[거부] ${trimmed}`,
          parentId: null,
        };
        setComments((prev) => ({
          ...prev,
          [id]: [newComment, ...(prev[id] ?? [])],
        }));
      }

      try {
        await rejectDocumentAction(id, trimmed);
      } catch (err) {
        console.error("rejectDocumentAction failed", err);
        toast.error(toastErrorMessage(err, "거부 처리에 실패했습니다."));
        setTree((prev) =>
          mutate(prev, id, (n) => ({ ...n, status: prevStatus })),
        );
        setComments((prev) => ({
          ...prev,
          [id]: (prev[id] ?? []).filter((c) => c.id !== optimisticId),
        }));
      }
    },
    [role, members, currentUser],
  );

  const addComment = useCallback(
    (nodeId: string, body: string, parentId?: string | null) => {
      const trimmed = body.trim();
      if (!trimmed) return;
      const me = currentUser ?? members.find((m) => m.role === role) ?? members[0];
      if (!me) return;
      // Flatten on the client too: if user clicks 답글 on a reply, attach
      // to its root. Mirrors what addCommentAction does server-side so the
      // optimistic row matches the eventual server row.
      let resolvedParent: string | null = null;
      if (parentId) {
        const existing = (comments[nodeId] ?? []).find((c) => c.id === parentId);
        resolvedParent = existing?.parentId ?? existing?.id ?? null;
      }
      const optimisticId = `tmp-${Date.now()}`;
      const newComment: Comment = {
        id: optimisticId,
        who: me.name,
        initials: me.initials,
        color: me.color,
        when: "방금",
        body: trimmed,
        parentId: resolvedParent,
      };
      setComments((prev) => ({
        ...prev,
        [nodeId]: [newComment, ...(prev[nodeId] ?? [])],
      }));
      addCommentAction(nodeId, trimmed, resolvedParent).catch((err) => {
        console.error("addCommentAction failed", err);
        toast.error(toastErrorMessage(err, "댓글 등록에 실패했습니다."));
        setComments((prev) => ({
          ...prev,
          [nodeId]: (prev[nodeId] ?? []).filter((c) => c.id !== optimisticId),
        }));
      });
    },
    [role, members, currentUser, comments],
  );

  const resolveComment = useCallback((nodeId: string, commentId: string) => {
    let nextResolved = false;
    setComments((prev) => ({
      ...prev,
      [nodeId]: (prev[nodeId] ?? []).map((c) => {
        if (c.id !== commentId) return c;
        nextResolved = !c.resolved;
        return { ...c, resolved: nextResolved };
      }),
    }));
    // 낙관적 UI 후 서버 반영. 임시 id면 아직 DB에 없으니 호출 안 함.
    if (commentId.startsWith("tmp-")) return;
    toggleResolveCommentAction(commentId, nextResolved).catch((err) => {
      console.error("toggleResolveCommentAction failed", err);
      toast.error(toastErrorMessage(err, "댓글 상태 변경에 실패했습니다."));
      setComments((prev) => ({
        ...prev,
        [nodeId]: (prev[nodeId] ?? []).map((c) =>
          c.id === commentId ? { ...c, resolved: !nextResolved } : c,
        ),
      }));
    });
  }, []);

  const pushVersion = useCallback(
    (nodeId: string, body: string, desc?: string) => {
      const me = members.find((m) => m.role === role) ?? members[0];
      if (!me) return;
      setHistory((prev) => {
        const list = prev[nodeId] ?? [];
        const head = list[0];
        const lastV = head ? parseFloat(head.v.replace("v", "")) : 1.0;
        const nextV = `v${(lastV + 0.1).toFixed(1)}`;
        const newVersion: Version = {
          id: `h-${Date.now()}`,
          v: nextV,
          who: me.name,
          when: "방금",
          desc: desc ?? "자동 저장",
          body,
        };
        return { ...prev, [nodeId]: [newVersion, ...list].slice(0, 30) };
      });
    },
    [role, members],
  );

  // Autosave can fail in bursts (network blip → every keystroke retries).
  // Throttle the toast so we surface the problem without spamming.
  const lastSaveErrorAt = useRef(0);
  const setBody = useCallback((nodeId: string, html: string) => {
    setBodyOverrides((prev) => ({ ...prev, [nodeId]: html }));
    saveBodyAction(nodeId, html).catch((err) => {
      console.error("saveBodyAction failed", err);
      const now = Date.now();
      if (now - lastSaveErrorAt.current > 5000) {
        lastSaveErrorAt.current = now;
        toast.error("자동 저장에 실패했습니다. 네트워크를 확인해주세요.");
      }
    });
  }, []);

  const ack = useCallback((nodeId: string) => {
    setAcked((prev) => {
      if (prev.has(nodeId)) return prev;
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
    acknowledgeMustReadAction(nodeId).catch((err) => {
      console.error("acknowledgeMustReadAction failed", err);
      toast.error(toastErrorMessage(err, "필독 확인에 실패했습니다."));
      setAcked((prev) => {
        if (!prev.has(nodeId)) return prev;
        const next = new Set(prev);
        next.delete(nodeId);
        return next;
      });
    });
  }, []);

  const toggleFavorite = useCallback((nodeId: string) => {
    let wasFav = false;
    setFavorites((prev) => {
      wasFav = prev.includes(nodeId);
      return wasFav ? prev.filter((x) => x !== nodeId) : [...prev, nodeId];
    });
    const action = wasFav ? removeFavoriteAction : addFavoriteAction;
    action(nodeId).catch((err) => {
      console.error("favorite action failed", err);
      toast.error(
        toastErrorMessage(
          err,
          wasFav
            ? "즐겨찾기 해제에 실패했습니다."
            : "즐겨찾기 추가에 실패했습니다.",
        ),
      );
      setFavorites((prev) =>
        wasFav ? [...prev, nodeId] : prev.filter((x) => x !== nodeId),
      );
    });
  }, []);

  const markWhatsNewRead = useCallback((id: string) => {
    setWhatsNewRead((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markAllWhatsNewRead = useCallback(() => {
    setWhatsNewRead(new Set(whatsNew.map((w) => w.id)));
  }, [whatsNew]);

  const completeStep = useCallback((taskId: string) => {
    setOnboardingDone((prev) => {
      const next = new Set(prev);
      if (next.has(taskId)) next.delete(taskId);
      else next.add(taskId);
      return next;
    });
  }, []);

  const recordQuizAnswer = useCallback(
    (taskId: string, q: number, opt: number) => {
      setQuizAnswers((prev) => ({
        ...prev,
        [taskId]: { ...(prev[taskId] ?? {}), [q]: opt },
      }));
    },
    [],
  );

  const restoreVersion = useCallback(
    (nodeId: string, versionId: string) => {
      const v = (history[nodeId] ?? []).find((x) => x.id === versionId);
      if (!v) return;
      const source =
        v.body || bodyOverrides[nodeId] || content[nodeId]?.body || "";
      setBody(nodeId, source);
    },
    [history, bodyOverrides, content, setBody],
  );

  const uploadAttachment = useCallback(
    async (nodeId: string, file: File) => {
      if (!ROLE_PERMISSIONS[role].includes("edit")) {
        throw new Error("편집 권한이 없습니다.");
      }
      // 1) Ask the server for a signed upload URL (gates role/size/path).
      const grant = await createUploadSignedUrlAction({
        kind: "attachment",
        documentId: nodeId,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || "application/octet-stream",
      });
      // 2) Browser uploads straight to Supabase Storage — bypasses Vercel's
      //    4.5MB function payload cap entirely.
      const supabase = createBrowserSupabase();
      const { error: upErr } = await supabase.storage
        .from(grant.bucket)
        .uploadToSignedUrl(grant.path, grant.token, file);
      if (upErr) throw upErr;
      // 3) Finalize: insert the DB row (small JSON body, well under 4.5MB).
      const created = await finalizeAttachmentAction({
        documentId: nodeId,
        storagePath: grant.path,
        fileName: file.name,
        fileSize: file.size,
        mimeType: file.type || null,
      });
      setAttachments((prev) => ({
        ...prev,
        [nodeId]: [created, ...(prev[nodeId] ?? [])],
      }));
    },
    [role],
  );

  const deleteAttachment = useCallback(
    async (nodeId: string, attachmentId: string) => {
      const prevList = attachments[nodeId] ?? [];
      // Optimistic
      setAttachments((prev) => ({
        ...prev,
        [nodeId]: (prev[nodeId] ?? []).filter((a) => a.id !== attachmentId),
      }));
      try {
        await deleteAttachmentAction(attachmentId);
      } catch (err) {
        console.error("deleteAttachmentAction failed", err);
        toast.error(toastErrorMessage(err, "첨부 삭제에 실패했습니다."));
        setAttachments((prev) => ({ ...prev, [nodeId]: prevList }));
      }
    },
    [attachments],
  );

  // ── TOC tree management (CRUD) ─────────────────────────────────
  const createTreeNode = useCallback(
    async (
      parentId: string | null,
      kind: "chapter" | "section" | "item",
      label?: string,
    ) => {
      if (!ROLE_PERMISSIONS[role].includes("edit"))
        throw new Error("편집 권한이 없습니다.");
      const defaultLabel =
        label ?? (kind === "chapter" ? "새 장" : kind === "section" ? "새 절" : "새 항목");
      const created = await createDocumentAction({
        parentId,
        type: kind,
        label: defaultLabel,
      });
      // Insert into local tree under parent (or top-level if parent null)
      setTree((prev) => {
        if (parentId === null) {
          return [...prev, created];
        }
        return mutate(prev, parentId, (n) => ({
          ...n,
          open: true,
          children: [...(n.children ?? []), created],
        }));
      });
    },
    [role],
  );

  const addSibling = useCallback(
    async (refId: string) => {
      if (!ROLE_PERMISSIONS[role].includes("edit"))
        throw new Error("편집 권한이 없습니다.");
      const created = await addSiblingAction(refId);
      // Insert after refId in same parent's children
      setTree((prev) => insertAfterId(prev, refId, created));
    },
    [role],
  );

  const duplicateTreeNode = useCallback(
    async (id: string) => {
      if (!ROLE_PERMISSIONS[role].includes("edit"))
        throw new Error("편집 권한이 없습니다.");
      const created = await duplicateDocumentAction(id);
      setTree((prev) => insertAfterId(prev, id, created));
    },
    [role],
  );

  const renameTreeNode = useCallback(
    async (id: string, label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      let prevLabel: string | undefined;
      setTree((prev) =>
        mutate(prev, id, (n) => {
          prevLabel = n.label;
          return { ...n, label: trimmed };
        }),
      );
      try {
        await renameDocumentAction(id, trimmed);
      } catch (err) {
        console.error("renameDocumentAction failed", err);
        toast.error(toastErrorMessage(err, "이름 변경에 실패했습니다."));
        if (prevLabel !== undefined) {
          setTree((prev) =>
            mutate(prev, id, (n) => ({ ...n, label: prevLabel! })),
          );
        }
      }
    },
    [],
  );

  const deleteTreeNode = useCallback(
    async (id: string) => {
      let removed: TreeNode | null = null;
      setTree((prev) => removeTreeAndReturn(prev, id, (n) => (removed = n)));
      try {
        await deleteDocumentAction(id);
      } catch (err) {
        console.error("deleteDocumentAction failed", err);
        if (removed) {
          // Rough rollback: re-fetch on next layout — for now, surface via toast.
          toast.error(
            toastErrorMessage(
              err,
              "삭제에 실패했습니다. 페이지를 새로고침해주세요.",
            ),
          );
        }
      }
    },
    [],
  );

  const moveTreeNode = useCallback(
    async (id: string, dir: -1 | 1) => {
      setTree((prev) => swapSibling(prev, id, dir));
      try {
        await moveDocumentAction(id, dir);
      } catch (err) {
        console.error("moveDocumentAction failed", err);
        toast.error(toastErrorMessage(err, "순서 변경에 실패했습니다."));
        // Roll back via opposite swap
        setTree((prev) => swapSibling(prev, id, (dir === 1 ? -1 : 1) as -1 | 1));
      }
    },
    [],
  );

  // ── Re-verification (C-5) ────────────────────────────────────────
  // Optimistically reset lastVerified to 0 and switch the verifier name to
  // the current user; rollback on failure. Requires 'review' role server-
  // side (reviewer/admin); we also check client-side so the toast lands
  // before a server round-trip when the user simply can't.
  const reverifyDocument = useCallback(
    async (nodeId: string) => {
      if (!ROLE_PERMISSIONS[role].includes("review")) {
        throw new Error("검증 권한이 없습니다 (reviewer/admin).");
      }
      const me = currentUser ?? members.find((m) => m.role === role) ?? members[0];
      const prev = verifications[nodeId];
      // Optimistic snapshot. If no row existed yet we still show "방금"-equiv
      // (lastVerified=0); the real interval is decided server-side.
      const intervalDays = prev?.intervalDays ?? 90;
      setVerifications((s) => ({
        ...s,
        [nodeId]: {
          lastVerified: 0,
          intervalDays,
          by: me?.name ?? prev?.by ?? "—",
        },
      }));
      try {
        const result = await reverifyDocumentAction(nodeId);
        setVerifications((s) => ({
          ...s,
          [nodeId]: {
            lastVerified: 0,
            intervalDays: result.intervalDays,
            by: result.by,
          },
        }));
        toast.success("재검증이 완료되었습니다.");
      } catch (err) {
        console.error("reverifyDocumentAction failed", err);
        toast.error(toastErrorMessage(err, "재검증에 실패했습니다."));
        setVerifications((s) => {
          if (!prev) {
            const next = { ...s };
            delete next[nodeId];
            return next;
          }
          return { ...s, [nodeId]: prev };
        });
        throw err;
      }
    },
    [role, members, currentUser, verifications],
  );

  // ── Tags ─────────────────────────────────────────────────────────
  // Optimistic add/remove against `content[nodeId].tags`. On failure we
  // rollback to the previous list. Duplicate/empty are filtered locally so
  // the UI mirrors the server's idempotent behavior.
  const addTag = useCallback(
    async (nodeId: string, rawTag: string) => {
      if (!ROLE_PERMISSIONS[role].includes("edit"))
        throw new Error("편집 권한이 없습니다.");
      const tag = rawTag.replace(/[,\s]+/g, " ").trim().slice(0, 24);
      if (!tag) return;
      let prevTags: string[] | undefined;
      setContent((prev) => {
        const existing = prev[nodeId];
        const list = existing?.tags ?? [];
        prevTags = list;
        if (list.some((t) => t.toLowerCase() === tag.toLowerCase())) return prev;
        const base: DocContent = existing ?? {
          tags: [],
          updated: "방금",
          author: currentUser?.name ?? "",
          version: "v0.1",
          body: "",
        };
        return { ...prev, [nodeId]: { ...base, tags: [...list, tag] } };
      });
      try {
        const { tags } = await addTagAction(nodeId, tag);
        if (tags) {
          setContent((prev) => {
            const existing = prev[nodeId];
            if (!existing) return prev;
            return { ...prev, [nodeId]: { ...existing, tags } };
          });
        }
      } catch (err) {
        console.error("addTagAction failed", err);
        toast.error(toastErrorMessage(err, "태그 추가에 실패했습니다."));
        if (prevTags !== undefined) {
          setContent((prev) => {
            const existing = prev[nodeId];
            if (!existing) return prev;
            return { ...prev, [nodeId]: { ...existing, tags: prevTags! } };
          });
        }
        throw err;
      }
    },
    [role, currentUser],
  );

  const removeTag = useCallback(
    async (nodeId: string, tag: string) => {
      if (!ROLE_PERMISSIONS[role].includes("edit"))
        throw new Error("편집 권한이 없습니다.");
      const target = tag.trim();
      if (!target) return;
      let prevTags: string[] | undefined;
      setContent((prev) => {
        const existing = prev[nodeId];
        if (!existing) return prev;
        prevTags = existing.tags;
        return {
          ...prev,
          [nodeId]: {
            ...existing,
            tags: existing.tags.filter(
              (t) => t.toLowerCase() !== target.toLowerCase(),
            ),
          },
        };
      });
      try {
        await removeTagAction(nodeId, target);
      } catch (err) {
        console.error("removeTagAction failed", err);
        toast.error(toastErrorMessage(err, "태그 제거에 실패했습니다."));
        if (prevTags !== undefined) {
          setContent((prev) => {
            const existing = prev[nodeId];
            if (!existing) return prev;
            return { ...prev, [nodeId]: { ...existing, tags: prevTags! } };
          });
        }
        throw err;
      }
    },
    [role],
  );

  const attachPdf = useCallback(
    async (nodeId: string, file: File) => {
      if (!ROLE_PERMISSIONS[role].includes("edit")) {
        throw new Error("편집 권한이 없습니다.");
      }
      const grant = await createUploadSignedUrlAction({
        kind: "pdf",
        documentId: nodeId,
        fileSize: file.size,
      });
      const supabase = createBrowserSupabase();
      const { error: upErr } = await supabase.storage
        .from(grant.bucket)
        .uploadToSignedUrl(grant.path, grant.token, file, { upsert: true });
      if (upErr) throw upErr;
      await finalizePdfAction({
        documentId: nodeId,
        storagePath: grant.path,
      });
      // On success, mirror server state into local optimistic stores so the
      // user immediately drops into the PDF viewer (badge='PDF') with the
      // newly uploaded file (pdfStoragePath set).
      setTree((prev) =>
        mutate(prev, nodeId, (n) => ({ ...n, badge: "PDF" })),
      );
      setContent((prev) => {
        const existing = prev[nodeId] ?? {
          tags: [],
          updated: "방금",
          author: currentUser?.name ?? "",
          version: "v0.1",
          body: "",
        };
        return {
          ...prev,
          [nodeId]: {
            ...existing,
            type: "pdf" as const,
            pdfStoragePath: `${nodeId}.pdf`,
            pdfTitle: file.name.replace(/\.pdf$/i, "").trim() || existing.pdfTitle,
          },
        };
      });
    },
    [role, currentUser],
  );

  const value = useMemo<WorkbenchState>(
    () => ({
      tree,
      activeId,
      openTabs,
      maxTabs,
      view,
      searchQuery,
      paletteOpen,
      locale,
      role,
      saveState,
      comments,
      history,
      content,
      cases,
      onboardingTasks,
      faqs,
      members,
      currentUser,
      pageStats,
      verifications,
      mustRead,
      whatsNew,
      compliance,
      attachments,
      bodyOverrides,
      acked,
      favorites,
      whatsNewRead,
      onboardingDone,
      quizAnswers,
      setActiveId,
      toggleOpen,
      openTab,
      closeTab,
      closeOtherTabs,
      togglePin,
      setMaxTabs,
      setView,
      setSearchQuery,
      openSearch,
      setPaletteOpen,
      setLocale,
      mode,
      setMode,
      setRole,
      can,
      setNodeStatus,
      rejectDocument,
      addComment,
      resolveComment,
      setSaveState,
      setDirty,
      pushVersion,
      restoreVersion,
      setBody,
      ack,
      toggleFavorite,
      markWhatsNewRead,
      markAllWhatsNewRead,
      completeStep,
      recordQuizAnswer,
      attachPdf,
      reverifyDocument,
      addTag,
      removeTag,
      uploadAttachment,
      deleteAttachment,
      createTreeNode,
      addSibling,
      duplicateTreeNode,
      renameTreeNode,
      deleteTreeNode,
      moveTreeNode,
    }),
    [
      tree,
      activeId,
      openTabs,
      maxTabs,
      view,
      searchQuery,
      paletteOpen,
      locale,
      role,
      saveState,
      comments,
      history,
      content,
      cases,
      onboardingTasks,
      faqs,
      members,
      currentUser,
      pageStats,
      verifications,
      mustRead,
      whatsNew,
      compliance,
      attachments,
      bodyOverrides,
      acked,
      favorites,
      whatsNewRead,
      setActiveId,
      toggleOpen,
      openTab,
      closeTab,
      closeOtherTabs,
      togglePin,
      openSearch,
      can,
      setNodeStatus,
      rejectDocument,
      addComment,
      resolveComment,
      setDirty,
      pushVersion,
      restoreVersion,
      setBody,
      ack,
      toggleFavorite,
      markWhatsNewRead,
      markAllWhatsNewRead,
      completeStep,
      recordQuizAnswer,
      attachPdf,
      reverifyDocument,
      addTag,
      removeTag,
      uploadAttachment,
      deleteAttachment,
      createTreeNode,
      addSibling,
      duplicateTreeNode,
      renameTreeNode,
      deleteTreeNode,
      moveTreeNode,
      onboardingDone,
      quizAnswers,
      mode,
    ],
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

export function useWorkbench() {
  const v = useContext(Ctx);
  if (!v) throw new Error("useWorkbench must be used within WorkbenchProvider");
  return v;
}

export function findNode(tree: TreeNode[], id: string): TreeNode | null {
  for (const n of tree) {
    if (n.id === id) return n;
    if (n.children) {
      const found = findNode(n.children, id);
      if (found) return found;
    }
  }
  return null;
}

export function findPath(tree: TreeNode[], id: string): TreeNode[] {
  function walk(nodes: TreeNode[], trail: TreeNode[]): TreeNode[] | null {
    for (const n of nodes) {
      const next = [...trail, n];
      if (n.id === id) return next;
      if (n.children) {
        const found = walk(n.children, next);
        if (found) return found;
      }
    }
    return null;
  }
  return walk(tree, []) ?? [];
}

export function flatten(tree: TreeNode[]): TreeNode[] {
  const out: TreeNode[] = [];
  function walk(nodes: TreeNode[]) {
    for (const n of nodes) {
      out.push(n);
      if (n.children) walk(n.children);
    }
  }
  walk(tree);
  return out;
}
