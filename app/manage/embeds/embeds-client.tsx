"use client";

import { useState, useTransition } from "react";
import {
  deleteProductAction,
  deleteTicketAction,
  saveProductAction,
  saveTicketAction,
} from "@/lib/actions/embeds";
import { toast, toastErrorMessage } from "@/lib/toast";
import type { ManageProduct, ManageTicket } from "@/lib/data/embeds";
import {
  ConsoleHeader,
  DangerButton,
  EmptyState,
  Labeled,
  MasterDetailGrid,
  NumberInput,
  panelStyle,
  PrimaryButton,
  Select,
  TextInput,
} from "../_widgets";

type Tab = "tickets" | "products";

const STATUS_OPTIONS = [
  { value: "open", label: "처리중 (open)" },
  { value: "resolved", label: "해결됨 (resolved)" },
  { value: "closed", label: "종료 (closed)" },
];

const STOCK_OPTIONS = [
  { value: "in", label: "정상 (in)" },
  { value: "low", label: "부족 (low)" },
];

// ── 티켓 draft ──────────────────────────────────────────────────
type TicketDraft = {
  originalId: string | null;
  id: string;
  title: string;
  customer: string;
  status: "open" | "resolved" | "closed";
  statusLabel: string;
  priority: string;
  age: string;
  assignee: string;
  channel: string;
};

function emptyTicket(): TicketDraft {
  return {
    originalId: null,
    id: "",
    title: "",
    customer: "",
    status: "open",
    statusLabel: "처리중",
    priority: "P2",
    age: "",
    assignee: "",
    channel: "",
  };
}

function toTicketDraft(t: ManageTicket): TicketDraft {
  return { originalId: t.id, ...t };
}

// ── 상품 draft ──────────────────────────────────────────────────
type ProductDraft = {
  originalSku: string | null;
  sku: string;
  name: string;
  price: string;
  stock: number;
  stockStatus: "in" | "low";
  category: string;
  rating: string;
};

function emptyProduct(): ProductDraft {
  return {
    originalSku: null,
    sku: "",
    name: "",
    price: "",
    stock: 0,
    stockStatus: "in",
    category: "",
    rating: "",
  };
}

function toProductDraft(p: ManageProduct): ProductDraft {
  return { originalSku: p.sku, ...p };
}

const STATUS_COLOR: Record<string, string> = {
  open: "oklch(0.62 0.18 25)",
  resolved: "oklch(0.62 0.15 150)",
  closed: "var(--ink-3)",
};

export function EmbedsClient({
  tickets,
  products,
}: {
  tickets: ManageTicket[];
  products: ManageProduct[];
}) {
  const [tab, setTab] = useState<Tab>("tickets");

  return (
    <div style={{ maxWidth: 1100, margin: "0 auto" }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, margin: "4px 0 4px" }}>
        임베드
      </h2>
      <p style={{ fontSize: 13, color: "var(--ink-3)", margin: "0 0 16px" }}>
        본문에 삽입되는 CRM 티켓·상품 카탈로그 카드를 운영합니다. 키 규칙:
        티켓 <code>ticket-&lt;ID&gt;</code>, 상품 <code>product-&lt;SKU&gt;</code>.
      </p>

      <div style={{ display: "flex", gap: 4, marginBottom: 16 }}>
        <TabButton active={tab === "tickets"} onClick={() => setTab("tickets")}>
          CRM 티켓 {tickets.length}
        </TabButton>
        <TabButton active={tab === "products"} onClick={() => setTab("products")}>
          상품 {products.length}
        </TabButton>
      </div>

      {tab === "tickets" ? (
        <TicketsPanel tickets={tickets} />
      ) : (
        <ProductsPanel products={products} />
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        padding: "7px 14px",
        borderRadius: 6,
        border: "1px solid var(--line)",
        background: active ? "var(--accent)" : "var(--panel)",
        color: active ? "white" : "var(--ink-2)",
        fontSize: 12.5,
        fontWeight: 600,
        fontFamily: "inherit",
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

// ── 티켓 패널 ───────────────────────────────────────────────────
function TicketsPanel({ tickets }: { tickets: ManageTicket[] }) {
  const [draft, setDraft] = useState<TicketDraft | null>(null);
  const [pending, startTransition] = useTransition();
  const patch = (p: Partial<TicketDraft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      try {
        const res = await saveTicketAction(draft);
        if (res.ok) {
          toast.success("티켓을 저장했습니다.");
          setDraft((d) => (d ? { ...d, originalId: res.data.id } : d));
        } else toast.error(res.reason);
      } catch (err) {
        console.error("saveTicketAction failed", err);
        toast.error(toastErrorMessage(err, "티켓 저장에 실패했습니다."));
      }
    });
  };

  const remove = () => {
    if (!draft?.originalId) return;
    if (!window.confirm("이 티켓을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const id = draft.originalId;
    startTransition(async () => {
      try {
        const res = await deleteTicketAction(id);
        if (res.ok) {
          toast.success("티켓을 삭제했습니다.");
          setDraft(null);
        } else toast.error(res.reason);
      } catch (err) {
        console.error("deleteTicketAction failed", err);
        toast.error(toastErrorMessage(err, "티켓 삭제에 실패했습니다."));
      }
    });
  };

  return (
    <div>
      <ConsoleHeader
        count={tickets.length}
        noun="티켓"
        onNew={() => setDraft(emptyTicket())}
        newLabel="+ 새 티켓"
      />
      <MasterDetailGrid>
        <div style={{ ...panelStyle, overflow: "hidden" }}>
          {tickets.length === 0 ? (
            <EmptyState>등록된 티켓이 없습니다.</EmptyState>
          ) : (
            tickets.map((t) => {
              const active = draft?.originalId === t.id;
              return (
                <ListRow
                  key={t.id}
                  active={active}
                  onClick={() => setDraft(toTicketDraft(t))}
                  title={t.title || "(제목 없음)"}
                  meta={
                    <>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{t.id}</span>
                      <span>·</span>
                      <span style={{ color: STATUS_COLOR[t.status], fontWeight: 700 }}>
                        {t.statusLabel || t.status}
                      </span>
                      {t.priority ? <span>· {t.priority}</span> : null}
                    </>
                  }
                />
              );
            })
          )}
        </div>

        <div style={{ ...panelStyle, padding: 16 }}>
          {!draft ? (
            <EmptyState>
              왼쪽에서 티켓을 선택하거나 “+ 새 티켓”으로 추가하세요.
            </EmptyState>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Labeled label="티켓 ID" hint="키: ticket-<ID>">
                  <TextInput
                    value={draft.id}
                    onChange={(v) => patch({ id: v })}
                    placeholder="T-2026-0089"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="상태">
                  <Select
                    value={draft.status}
                    onChange={(v) =>
                      patch({ status: v as TicketDraft["status"] })
                    }
                    options={STATUS_OPTIONS}
                    disabled={pending}
                  />
                </Labeled>
              </div>

              <Labeled label="제목">
                <TextInput
                  value={draft.title}
                  onChange={(v) => patch({ title: v })}
                  placeholder="문의 제목"
                  disabled={pending}
                />
              </Labeled>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Labeled label="상태 라벨" hint="표시용">
                  <TextInput
                    value={draft.statusLabel}
                    onChange={(v) => patch({ statusLabel: v })}
                    placeholder="처리중"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="우선순위">
                  <TextInput
                    value={draft.priority}
                    onChange={(v) => patch({ priority: v })}
                    placeholder="P2"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="고객">
                  <TextInput
                    value={draft.customer}
                    onChange={(v) => patch({ customer: v })}
                    placeholder="홍*동"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="담당자">
                  <TextInput
                    value={draft.assignee}
                    onChange={(v) => patch({ assignee: v })}
                    placeholder="김상담"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="채널">
                  <TextInput
                    value={draft.channel}
                    onChange={(v) => patch({ channel: v })}
                    placeholder="채팅"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="접수 시점" hint="표시용 문자열">
                  <TextInput
                    value={draft.age}
                    onChange={(v) => patch({ age: v })}
                    placeholder="2시간 전"
                    disabled={pending}
                  />
                </Labeled>
              </div>

              <Actions
                pending={pending}
                canDelete={!!draft.originalId}
                onSave={save}
                onDelete={remove}
              />
            </>
          )}
        </div>
      </MasterDetailGrid>
    </div>
  );
}

// ── 상품 패널 ───────────────────────────────────────────────────
function ProductsPanel({ products }: { products: ManageProduct[] }) {
  const [draft, setDraft] = useState<ProductDraft | null>(null);
  const [pending, startTransition] = useTransition();
  const patch = (p: Partial<ProductDraft>) =>
    setDraft((d) => (d ? { ...d, ...p } : d));

  const save = () => {
    if (!draft) return;
    startTransition(async () => {
      try {
        const res = await saveProductAction(draft);
        if (res.ok) {
          toast.success("상품을 저장했습니다.");
          setDraft((d) => (d ? { ...d, originalSku: res.data.sku } : d));
        } else toast.error(res.reason);
      } catch (err) {
        console.error("saveProductAction failed", err);
        toast.error(toastErrorMessage(err, "상품 저장에 실패했습니다."));
      }
    });
  };

  const remove = () => {
    if (!draft?.originalSku) return;
    if (!window.confirm("이 상품을 삭제할까요? 되돌릴 수 없습니다.")) return;
    const sku = draft.originalSku;
    startTransition(async () => {
      try {
        const res = await deleteProductAction(sku);
        if (res.ok) {
          toast.success("상품을 삭제했습니다.");
          setDraft(null);
        } else toast.error(res.reason);
      } catch (err) {
        console.error("deleteProductAction failed", err);
        toast.error(toastErrorMessage(err, "상품 삭제에 실패했습니다."));
      }
    });
  };

  return (
    <div>
      <ConsoleHeader
        count={products.length}
        noun="상품"
        onNew={() => setDraft(emptyProduct())}
        newLabel="+ 새 상품"
      />
      <MasterDetailGrid>
        <div style={{ ...panelStyle, overflow: "hidden" }}>
          {products.length === 0 ? (
            <EmptyState>등록된 상품이 없습니다.</EmptyState>
          ) : (
            products.map((p) => {
              const active = draft?.originalSku === p.sku;
              return (
                <ListRow
                  key={p.sku}
                  active={active}
                  onClick={() => setDraft(toProductDraft(p))}
                  title={p.name || "(상품명 없음)"}
                  meta={
                    <>
                      <span style={{ fontFamily: "var(--font-mono)" }}>{p.sku}</span>
                      {p.price ? <span>· {p.price}</span> : null}
                      <span>·</span>
                      <span
                        style={{
                          color:
                            p.stockStatus === "low"
                              ? "oklch(0.62 0.18 25)"
                              : "var(--ink-3)",
                          fontWeight: p.stockStatus === "low" ? 700 : 400,
                        }}
                      >
                        재고 {p.stock}
                      </span>
                    </>
                  }
                />
              );
            })
          )}
        </div>

        <div style={{ ...panelStyle, padding: 16 }}>
          {!draft ? (
            <EmptyState>
              왼쪽에서 상품을 선택하거나 “+ 새 상품”으로 추가하세요.
            </EmptyState>
          ) : (
            <>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <Labeled label="SKU" hint="키: product-<SKU>">
                  <TextInput
                    value={draft.sku}
                    onChange={(v) => patch({ sku: v })}
                    placeholder="SKU-9821"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="카테고리">
                  <TextInput
                    value={draft.category}
                    onChange={(v) => patch({ category: v })}
                    placeholder="오디오 / 이어폰"
                    disabled={pending}
                  />
                </Labeled>
              </div>

              <Labeled label="상품명">
                <TextInput
                  value={draft.name}
                  onChange={(v) => patch({ name: v })}
                  placeholder="프리미엄 무선 이어폰 Pro X"
                  disabled={pending}
                />
              </Labeled>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <Labeled label="가격" hint="표시용">
                  <TextInput
                    value={draft.price}
                    onChange={(v) => patch({ price: v })}
                    placeholder="₩249,000"
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="재고 수량">
                  <NumberInput
                    value={draft.stock}
                    onChange={(v) => patch({ stock: v })}
                    min={0}
                    step={1}
                    disabled={pending}
                  />
                </Labeled>
                <Labeled label="재고 상태">
                  <Select
                    value={draft.stockStatus}
                    onChange={(v) =>
                      patch({ stockStatus: v as ProductDraft["stockStatus"] })
                    }
                    options={STOCK_OPTIONS}
                    disabled={pending}
                  />
                </Labeled>
              </div>

              <Labeled label="평점" hint="표시용">
                <TextInput
                  value={draft.rating}
                  onChange={(v) => patch({ rating: v })}
                  placeholder="4.6 (1,283)"
                  disabled={pending}
                />
              </Labeled>

              <Actions
                pending={pending}
                canDelete={!!draft.originalSku}
                onSave={save}
                onDelete={remove}
              />
            </>
          )}
        </div>
      </MasterDetailGrid>
    </div>
  );
}

// ── 공용 ────────────────────────────────────────────────────────
function ListRow({
  active,
  onClick,
  title,
  meta,
}: {
  active: boolean;
  onClick: () => void;
  title: string;
  meta: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "block",
        width: "100%",
        textAlign: "left",
        padding: "10px 12px",
        border: 0,
        borderBottom: "1px solid var(--line)",
        background: active ? "var(--surface-2, var(--surface))" : "transparent",
        cursor: "pointer",
      }}
    >
      <div
        style={{
          fontSize: 13,
          color: "var(--ink)",
          fontWeight: active ? 600 : 400,
          marginBottom: 4,
        }}
      >
        {title}
      </div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 10.5,
          color: "var(--ink-3)",
        }}
      >
        {meta}
      </div>
    </button>
  );
}

function Actions({
  pending,
  canDelete,
  onSave,
  onDelete,
}: {
  pending: boolean;
  canDelete: boolean;
  onSave: () => void;
  onDelete: () => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        gap: 8,
        marginTop: 16,
        paddingTop: 16,
        borderTop: "1px solid var(--line)",
      }}
    >
      <PrimaryButton onClick={onSave} disabled={pending}>
        {pending ? "저장 중…" : "저장"}
      </PrimaryButton>
      {canDelete ? (
        <DangerButton onClick={onDelete} disabled={pending}>
          삭제
        </DangerButton>
      ) : null}
    </div>
  );
}
