import { Extension } from "@tiptap/core";
import type { Editor } from "@tiptap/core";
import { Plugin, PluginKey } from "@tiptap/pm/state";
import type { Node as PMNode } from "@tiptap/pm/model";
import { Decoration, DecorationSet } from "@tiptap/pm/view";

export type Match = { from: number; to: number };
export type SearchState = {
  query: string;
  caseSensitive: boolean;
  results: Match[];
  current: number;
};

export const searchReplacePluginKey = new PluginKey<SearchState>("searchReplace");

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm: (query: string, caseSensitive?: boolean) => ReturnType;
      clearSearch: () => ReturnType;
      goToMatch: (index: number) => ReturnType;
      nextMatch: () => ReturnType;
      prevMatch: () => ReturnType;
      replaceCurrent: (text: string) => ReturnType;
      replaceAllMatches: (text: string) => ReturnType;
    };
  }
}

function escapeRegex(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function computeMatches(doc: PMNode, query: string, caseSensitive: boolean): SearchState {
  if (!query) return { query: "", caseSensitive, results: [], current: 0 };
  const results: Match[] = [];
  const re = new RegExp(escapeRegex(query), caseSensitive ? "g" : "gi");
  doc.descendants((node, pos) => {
    if (!node.isText) return;
    const text = node.text ?? "";
    let m: RegExpExecArray | null;
    re.lastIndex = 0;
    while ((m = re.exec(text)) !== null) {
      results.push({ from: pos + m.index, to: pos + m.index + m[0].length });
      if (m[0].length === 0) re.lastIndex++;
    }
  });
  return { query, caseSensitive, results, current: 0 };
}

export const SearchReplace = Extension.create({
  name: "searchReplace",

  addProseMirrorPlugins() {
    return [
      new Plugin<SearchState>({
        key: searchReplacePluginKey,
        state: {
          init: () => ({ query: "", caseSensitive: false, results: [], current: 0 }),
          apply(tr, prev) {
            const meta = tr.getMeta(searchReplacePluginKey) as
              | { type: "setSearch"; query: string; caseSensitive: boolean }
              | { type: "clear" }
              | { type: "goTo"; index: number }
              | undefined;
            if (meta?.type === "setSearch") {
              return computeMatches(tr.doc, meta.query, meta.caseSensitive);
            }
            if (meta?.type === "clear") {
              return { query: "", caseSensitive: false, results: [], current: 0 };
            }
            if (meta?.type === "goTo") {
              if (prev.results.length === 0) return prev;
              const next =
                ((meta.index % prev.results.length) + prev.results.length) %
                prev.results.length;
              return { ...prev, current: next };
            }
            if (tr.docChanged && prev.query) {
              const fresh = computeMatches(tr.doc, prev.query, prev.caseSensitive);
              return {
                ...fresh,
                current: Math.min(prev.current, Math.max(fresh.results.length - 1, 0)),
              };
            }
            return prev;
          },
        },
        props: {
          decorations(state) {
            const s = searchReplacePluginKey.getState(state);
            if (!s || s.results.length === 0) return DecorationSet.empty;
            const decos = s.results.map((r, i) =>
              Decoration.inline(r.from, r.to, {
                class: i === s.current ? "sr-current" : "sr-match",
              }),
            );
            return DecorationSet.create(state.doc, decos);
          },
        },
      }),
    ];
  },

  addCommands() {
    return {
      setSearchTerm:
        (query: string, caseSensitive = false) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(searchReplacePluginKey, { type: "setSearch", query, caseSensitive });
          return true;
        },
      clearSearch:
        () =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(searchReplacePluginKey, { type: "clear" });
          return true;
        },
      goToMatch:
        (index: number) =>
        ({ tr, dispatch }) => {
          if (dispatch) tr.setMeta(searchReplacePluginKey, { type: "goTo", index });
          return true;
        },
      nextMatch:
        () =>
        ({ tr, dispatch, editor }) => {
          const s = searchReplacePluginKey.getState(editor.state);
          if (!s || s.results.length === 0) return false;
          if (dispatch)
            tr.setMeta(searchReplacePluginKey, { type: "goTo", index: s.current + 1 });
          return true;
        },
      prevMatch:
        () =>
        ({ tr, dispatch, editor }) => {
          const s = searchReplacePluginKey.getState(editor.state);
          if (!s || s.results.length === 0) return false;
          if (dispatch)
            tr.setMeta(searchReplacePluginKey, { type: "goTo", index: s.current - 1 });
          return true;
        },
      replaceCurrent:
        (text: string) =>
        ({ tr, dispatch, editor }) => {
          const s = searchReplacePluginKey.getState(editor.state);
          if (!s || s.results.length === 0) return false;
          const match = s.results[s.current];
          if (!match) return false;
          if (dispatch) {
            tr.replaceWith(match.from, match.to, editor.schema.text(text));
          }
          return true;
        },
      replaceAllMatches:
        (text: string) =>
        ({ tr, dispatch, editor }) => {
          const s = searchReplacePluginKey.getState(editor.state);
          if (!s || s.results.length === 0) return false;
          if (dispatch) {
            for (let i = s.results.length - 1; i >= 0; i--) {
              const m = s.results[i];
              tr.replaceWith(m.from, m.to, editor.schema.text(text));
            }
          }
          return true;
        },
    };
  },
});

export function getSearchState(editor: Editor | null): SearchState | null {
  if (!editor) return null;
  return searchReplacePluginKey.getState(editor.state) ?? null;
}
