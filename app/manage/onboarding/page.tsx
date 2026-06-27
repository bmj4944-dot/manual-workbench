import { fetchOnboardingTasksForManage } from "@/lib/data/onboarding";
import { fetchDocumentTree } from "@/lib/data/documents";
import { OnboardingClient } from "./onboarding-client";

export const dynamic = "force-dynamic";

export default async function ManageOnboardingPage() {
  const [tasks, tree] = await Promise.all([
    fetchOnboardingTasksForManage(),
    fetchDocumentTree(),
  ]);

  return <OnboardingClient tasks={tasks} tree={tree} />;
}
