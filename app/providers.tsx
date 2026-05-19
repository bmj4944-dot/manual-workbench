"use client";

import { ThemeProvider } from "next-themes";
import type { ReactNode } from "react";
import { WorkbenchProvider } from "@/lib/workbench-context";

export function Providers({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="data-theme"
      defaultTheme="light"
      enableSystem={false}
      themes={["light", "dark"]}
      disableTransitionOnChange
    >
      <WorkbenchProvider>{children}</WorkbenchProvider>
    </ThemeProvider>
  );
}
