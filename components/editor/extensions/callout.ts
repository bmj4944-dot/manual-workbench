import { Node, mergeAttributes } from "@tiptap/core";

/**
 * Block-level node that preserves `<div class="callout {info|warn|tip}">`
 * with the inner `.ico` and `.body` structure intact. Without this extension,
 * Tiptap silently strips the wrapper divs while parsing the seed HTML.
 *
 * Schema:
 *   callout (kind)
 *     ├ calloutIcon  — single line / inline content
 *     └ calloutBody  — block content (paragraphs, lists, ...)
 */

export const CalloutIcon = Node.create({
  name: "calloutIcon",
  group: "block",
  content: "inline*",
  parseHTML() {
    return [{ tag: "div.ico" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "ico" }), 0];
  },
});

export const CalloutBody = Node.create({
  name: "calloutBody",
  group: "block",
  content: "block+",
  parseHTML() {
    return [{ tag: "div.body" }];
  },
  renderHTML({ HTMLAttributes }) {
    return ["div", mergeAttributes(HTMLAttributes, { class: "body" }), 0];
  },
});

export const Callout = Node.create({
  name: "callout",
  group: "block",
  content: "calloutIcon calloutBody",
  defining: true,

  addAttributes() {
    return {
      kind: {
        default: "info",
        parseHTML: (el) => {
          const cls = (el as HTMLElement).className || "";
          if (cls.includes("warn")) return "warn";
          if (cls.includes("tip")) return "tip";
          return "info";
        },
      },
    };
  },

  parseHTML() {
    return [{ tag: "div.callout" }];
  },

  renderHTML({ node, HTMLAttributes }) {
    const kind = (node.attrs.kind ?? "info") as string;
    return [
      "div",
      mergeAttributes(HTMLAttributes, { class: `callout ${kind}` }),
      0,
    ];
  },
});
