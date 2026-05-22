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
import { ChatbotWidget } from "@/components/shell/chatbot";
import { DashboardView } from "@/components/views/dashboard-view";
import { CasesView } from "@/components/views/cases-view";
import { FaqView } from "@/components/views/faq-view";
import { OnboardingView } from "@/components/views/onboarding-view";

export default function Home() {
  const { view } = useWorkbench();
  const showThreePane = view === "doc";

  return (
    <div className="app">
      <Topbar />
      <div className={`main layout-${showThreePane ? "3panel" : "2panel"}`}>
        <Sidebar />
        <main className="center" data-screen-label="Center">
          {view === "doc" && <DocTabs />}
          {view === "doc" && <MainPane />}
          {view === "search" && <SearchView />}
          {view === "dashboard" && <DashboardView />}
          {view === "cases" && <CasesView />}
          {view === "faq" && <FaqView />}
          {view === "onboarding" && <OnboardingView />}
        </main>
        {showThreePane && <RightPanel />}
      </div>
      <CommandPalette />
      <KeyboardShortcuts />
      {view === "doc" && <ChatbotWidget />}
    </div>
  );
}
