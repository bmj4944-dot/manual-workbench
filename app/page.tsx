"use client";

import { useWorkbench } from "@/lib/workbench-context";
import { Topbar } from "@/components/shell/topbar";
import { Sidebar } from "@/components/shell/sidebar";
import { DocTabs } from "@/components/shell/doc-tabs";
import { MainPane } from "@/components/shell/main-pane";
import { RightPanel } from "@/components/shell/right-panel";
import { CommandPalette } from "@/components/shell/command-palette";
import { SearchView } from "@/components/shell/search-view";
import { KeyboardShortcuts } from "@/components/shell/keyboard-shortcuts";
import { DashboardView } from "@/components/views/dashboard-view";
import { CasesView } from "@/components/views/cases-view";
import { FaqView } from "@/components/views/faq-view";
import { OnboardingView } from "@/components/views/onboarding-view";

export default function Home() {
  const { view } = useWorkbench();
  const showThreePane = view === "doc";

  return (
    <div className="grid h-screen grid-rows-[var(--topbar-h)_1fr]">
      <Topbar />
      <div
        className="grid min-h-0"
        style={{
          gridTemplateColumns: showThreePane ? "280px 1fr 300px" : "280px 1fr",
        }}
      >
        <Sidebar />
        {view === "doc" && (
          <div className="grid min-h-0 grid-rows-[auto_1fr]">
            <DocTabs />
            <MainPane />
          </div>
        )}
        {view === "search" && <SearchView />}
        {view === "dashboard" && <DashboardView />}
        {view === "cases" && <CasesView />}
        {view === "faq" && <FaqView />}
        {view === "onboarding" && <OnboardingView />}
        {showThreePane && <RightPanel />}
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
    </div>
  );
}
