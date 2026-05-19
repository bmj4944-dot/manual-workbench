"use client";

import Mention from "@tiptap/extension-mention";
import { ReactRenderer } from "@tiptap/react";
import tippy, { type Instance, type Props as TippyProps } from "tippy.js";
import { TEAM_MEMBERS } from "@/lib/sample-data";
import { MentionList, type MentionListRef } from "./mention-list";

export function createMentionExtension() {
  return Mention.configure({
    HTMLAttributes: { class: "mention" },
    renderText({ node }) {
      return `@${node.attrs.label ?? node.attrs.id}`;
    },
    suggestion: {
      char: "@",
      items: ({ query }) =>
        TEAM_MEMBERS.filter((m) =>
          m.name.toLowerCase().includes(query.toLowerCase()),
        ).slice(0, 5),
      render: () => {
        let component: ReactRenderer<MentionListRef> | null = null;
        let popup: Instance<TippyProps>[] | null = null;
        return {
          onStart: (props) => {
            component = new ReactRenderer(MentionList, {
              props,
              editor: props.editor,
            });
            if (!props.clientRect) return;
            popup = tippy("body", {
              getReferenceClientRect: props.clientRect as () => DOMRect,
              appendTo: () => document.body,
              content: component.element,
              showOnCreate: true,
              interactive: true,
              trigger: "manual",
              placement: "bottom-start",
            });
          },
          onUpdate(props) {
            component?.updateProps(props);
            if (!props.clientRect || !popup) return;
            popup[0]?.setProps({
              getReferenceClientRect: props.clientRect as () => DOMRect,
            });
          },
          onKeyDown(props) {
            if (props.event.key === "Escape") {
              popup?.[0]?.hide();
              return true;
            }
            return component?.ref?.onKeyDown(props) ?? false;
          },
          onExit() {
            popup?.[0]?.destroy();
            component?.destroy();
            component = null;
            popup = null;
          },
        };
      },
    },
  });
}
