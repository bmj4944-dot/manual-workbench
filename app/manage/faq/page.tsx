import { fetchFaqsForManage } from "@/lib/data/faqs";
import { fetchDocumentTree } from "@/lib/data/documents";
import { FaqClient } from "./faq-client";

export const dynamic = "force-dynamic";

export default async function ManageFaqPage() {
  const [faqs, tree] = await Promise.all([
    fetchFaqsForManage(),
    fetchDocumentTree(),
  ]);

  return <FaqClient faqs={faqs} tree={tree} />;
}
