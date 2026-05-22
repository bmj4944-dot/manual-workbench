"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { WorkbenchProvider, type CurrentUser } from "@/lib/workbench-context";
import { ToastViewport } from "@/components/shell/toast-viewport";
import type {
  Attachment,
  Case,
  Comment,
  DocContent,
  OnboardingTask,
  PageStats,
  TeamMember,
  TreeNode,
  Verification,
  Version,
  WhatsNewItem,
} from "@/lib/types";

export type ProviderProps = {
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
};

export function Providers({ children, ...rest }: ProviderProps) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
    >
      <WorkbenchProvider {...rest}>
        {children}
        <ToastViewport />
      </WorkbenchProvider>
    </ThemeProvider>
  );
}
