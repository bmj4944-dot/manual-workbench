import type { ReactNode } from "react";
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
import { fetchAttachments } from "@/lib/data/attachments";

/**
 * Async server component that owns the heavy data fetch. Lives outside
 * `app/layout.tsx` so the root layout can wrap it in `<Suspense>` and stream
 * the loading skeleton during SSR — without this split, layout.tsx blocks
 * the entire first paint until every Supabase fetch resolves.
 */
export async function WorkbenchShell({ children }: { children: ReactNode }) {
  const currentUser = await fetchCurrentUser();
  const initial: Omit<ProviderProps, "children"> = {
    initialCurrentUser: currentUser,
  };

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
        attachments,
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
        fetchAttachments(),
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
      initial.initialAttachments = attachments;
    } catch (error) {
      console.error(
        "[workbench-shell] failed to fetch workbench data from Supabase:",
        error,
      );
    }
  }

  return <Providers {...initial}>{children}</Providers>;
}
