import type { Metadata } from "next";
import "./globals.css";
import { Providers, type ProviderProps } from "./providers";
import { fetchCurrentUser } from "@/lib/data/current-user";
import { fetchDocumentTree } from "@/lib/data/documents";
import { fetchDocumentContent } from "@/lib/data/content";
import { fetchCases } from "@/lib/data/cases";
import { fetchOnboardingTasks } from "@/lib/data/onboarding";
import { fetchTeamMembers } from "@/lib/data/members";
import {
  fetchComplianceRecords,
  fetchMustReadIds,
  fetchPageStats,
  fetchVerifications,
  fetchWhatsNew,
} from "@/lib/data/insights";
import { fetchComments } from "@/lib/data/comments";
import { fetchHistory } from "@/lib/data/history";
import { fetchAckedIds, fetchFavorites } from "@/lib/data/user-state";

export const metadata: Metadata = {
  title: "Manual Workbench",
  description: "콜센터·CS팀을 위한 업무 매뉴얼 워크벤치",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const currentUser = await fetchCurrentUser();
  const initial: Omit<ProviderProps, "children"> = { initialCurrentUser: currentUser };

  if (currentUser) {
    try {
      const [
        tree,
        content,
        cases,
        onboardingTasks,
        members,
        pageStats,
        verifications,
        mustReadIds,
        whatsNew,
        compliance,
        comments,
        history,
        favorites,
        ackedIds,
      ] = await Promise.all([
        fetchDocumentTree(),
        fetchDocumentContent(),
        fetchCases(),
        fetchOnboardingTasks(),
        fetchTeamMembers(),
        fetchPageStats(),
        fetchVerifications(),
        fetchMustReadIds(),
        fetchWhatsNew(),
        fetchComplianceRecords(),
        fetchComments(),
        fetchHistory(),
        fetchFavorites(),
        fetchAckedIds(),
      ]);
      initial.initialTree = tree;
      initial.initialContent = content;
      initial.initialCases = cases;
      initial.initialOnboardingTasks = onboardingTasks;
      initial.initialMembers = members;
      initial.initialPageStats = pageStats;
      initial.initialVerifications = verifications;
      initial.initialMustRead = new Set(mustReadIds);
      initial.initialWhatsNew = whatsNew;
      initial.initialCompliance = compliance;
      initial.initialComments = comments;
      initial.initialHistory = history;
      initial.initialFavorites = favorites;
      initial.initialAcked = new Set(ackedIds);
    } catch (error) {
      console.error(
        "[layout] failed to fetch workbench data from Supabase:",
        error,
      );
    }
  }

  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Providers {...initial}>{children}</Providers>
      </body>
    </html>
  );
}
