import type { Metadata } from "next";
import { Suspense } from "react";
import "./globals.css";
import { WorkbenchShell } from "./workbench-shell";
import Loading from "./loading";

export const metadata: Metadata = {
  title: "Manual Workbench",
  description: "콜센터·CS팀을 위한 업무 매뉴얼 워크벤치",
};

/**
 * Root layout is intentionally lightweight — just <html>/<body> + a Suspense
 * boundary. The heavy Supabase fetch lives inside <WorkbenchShell> so that
 * the loading skeleton (already used as page-level fallback by Next.js) can
 * also stream during the initial SSR while data is still loading.
 */
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body>
        <Suspense fallback={<Loading />}>
          <WorkbenchShell>{children}</WorkbenchShell>
        </Suspense>
      </body>
    </html>
  );
}
