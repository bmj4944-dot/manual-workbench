"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import {
  ROLE_PERMISSIONS,
  SAMPLE_COMMENTS,
  SAMPLE_CONTENT,
  SAMPLE_HISTORY,
  SAMPLE_TREE,
  TEAM_MEMBERS,
  WHATS_NEW,
} from "./sample-data";
import type {
  Comment,
  Locale,
  NodeStatus,
  Role,
  TreeNode,
  Version,
} from "./types";

export type Tab = { id: string; pinned: boolean; dirty?: boolean };
export type View = "doc" | "search" | "dashboard" | "cases" | "onboarding";
export type SaveState = "saved" | "saving";
export type QuizAnswers = Record<string, Record<number, number>>;

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

  setRole: (r: Role) => void;
  can: (action: string) => boolean;
  setNodeStatus: (id: string, status: NodeStatus) => boolean;
  addComment: (nodeId: string, body: string) => void;
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

export function WorkbenchProvider({ children }: { children: ReactNode }) {
  const [tree, setTree] = useState<TreeNode[]>(SAMPLE_TREE);
  const [activeId, setActiveIdState] = useState<string>("ch1-2-1");
  const [openTabs, setOpenTabs] = useState<Tab[]>([{ id: "ch1-2-1", pinned: false }]);
  const [maxTabs, setMaxTabs] = useState<number>(8);
  const [view, setView] = useState<View>("doc");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [paletteOpen, setPaletteOpen] = useState<boolean>(false);
  const [locale, setLocale] = useState<Locale>("ko");
  const [role, setRole] = useState<Role>("admin");
  const [saveState, setSaveState] = useState<SaveState>("saved");
  const [comments, setComments] = useState<Record<string, Comment[]>>(SAMPLE_COMMENTS);
  const [history, setHistory] = useState<Record<string, Version[]>>(SAMPLE_HISTORY);
  const [bodyOverrides, setBodyOverrides] = useState<Record<string, string>>({});
  const [acked, setAcked] = useState<ReadonlySet<string>>(new Set());
  const [favorites, setFavorites] = useState<string[]>([]);
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
      setTree((prev) => mutate(prev, id, (n) => ({ ...n, status })));
      return true;
    },
    [role],
  );

  const addComment = useCallback(
    (nodeId: string, body: string) => {
      if (!body.trim()) return;
      const me = TEAM_MEMBERS.find((m) => m.role === role) ?? TEAM_MEMBERS[0];
      const newComment: Comment = {
        id: `cm-${Date.now()}`,
        who: me.name,
        initials: me.initials,
        color: me.color,
        when: "방금",
        body,
      };
      setComments((prev) => ({
        ...prev,
        [nodeId]: [newComment, ...(prev[nodeId] ?? [])],
      }));
    },
    [role],
  );

  const resolveComment = useCallback((nodeId: string, commentId: string) => {
    setComments((prev) => ({
      ...prev,
      [nodeId]: (prev[nodeId] ?? []).map((c) =>
        c.id === commentId ? { ...c, resolved: !c.resolved } : c,
      ),
    }));
  }, []);

  const pushVersion = useCallback(
    (nodeId: string, body: string, desc?: string) => {
      const me = TEAM_MEMBERS.find((m) => m.role === role) ?? TEAM_MEMBERS[0];
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
    [role],
  );

  const setBody = useCallback((nodeId: string, html: string) => {
    setBodyOverrides((prev) => ({ ...prev, [nodeId]: html }));
  }, []);

  const ack = useCallback((nodeId: string) => {
    setAcked((prev) => {
      const next = new Set(prev);
      next.add(nodeId);
      return next;
    });
  }, []);

  const toggleFavorite = useCallback((nodeId: string) => {
    setFavorites((prev) =>
      prev.includes(nodeId) ? prev.filter((x) => x !== nodeId) : [...prev, nodeId],
    );
  }, []);

  const markWhatsNewRead = useCallback((id: string) => {
    setWhatsNewRead((prev) => {
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  }, []);

  const markAllWhatsNewRead = useCallback(() => {
    setWhatsNewRead(new Set(WHATS_NEW.map((w) => w.id)));
  }, []);

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
        v.body || bodyOverrides[nodeId] || SAMPLE_CONTENT[nodeId]?.body || "";
      setBody(nodeId, source);
    },
    [history, bodyOverrides, setBody],
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
      setRole,
      can,
      setNodeStatus,
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
      onboardingDone,
      quizAnswers,
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
