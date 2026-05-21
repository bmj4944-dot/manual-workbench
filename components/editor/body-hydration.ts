/**
 * Hydration helpers for read-mode body widgets — script cards, decision trees,
 * checklist toggles. The body HTML is rendered via dangerouslySetInnerHTML, so
 * we manually attach handlers after each mount/content change.
 *
 * Ported from design_handoff_manual_workbench/src/quick-actions.jsx.
 */

export function hydrateBody(container: HTMLElement | null): () => void {
  if (!container) return () => {};
  const cleanups: Array<() => void> = [];

  cleanups.push(hydrateScriptCards(container));
  cleanups.push(hydrateDecisionTrees(container));
  cleanups.push(hydrateChecklists(container));
  hydrateEmbeds(container); // pure DOM mutation; no listeners to clean up

  return () => cleanups.forEach((c) => c());
}

// ─── Embed data (CRM ticket / product catalog) ────────────────────
type TicketEmbed = {
  type: "ticket";
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
type ProductEmbed = {
  type: "product";
  sku: string;
  name: string;
  price: string;
  stock: number;
  stockStatus: "in" | "low";
  category: string;
  rating: string;
};
type EmbedData = TicketEmbed | ProductEmbed;

const EMBED_DATA: Record<string, EmbedData> = {
  "ticket-T-2026-0089": {
    type: "ticket",
    id: "T-2026-0089",
    title: "장바구니에 담긴 상품이 자꾸 사라져요",
    customer: "홍*동",
    status: "open",
    statusLabel: "처리중",
    priority: "P2",
    age: "2시간 전",
    assignee: "김상담",
    channel: "채팅",
  },
  "ticket-T-2026-0123": {
    type: "ticket",
    id: "T-2026-0123",
    title: "환불 요청 — 5월 3일 결제 건",
    customer: "박*수",
    status: "resolved",
    statusLabel: "해결됨",
    priority: "P3",
    age: "어제",
    assignee: "박매니저",
    channel: "전화",
  },
  "product-SKU-9821": {
    type: "product",
    sku: "SKU-9821",
    name: "프리미엄 무선 이어폰 Pro X",
    price: "₩249,000",
    stock: 142,
    stockStatus: "in",
    category: "오디오 / 이어폰",
    rating: "4.6 (1,283)",
  },
};

const EXTERNAL_ICON = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9"/><polyline points="9 2 12 2 12 5"/><line x1="6" y1="8" x2="12" y2="2"/></svg>`;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hydrateEmbeds(container: HTMLElement): void {
  const els = Array.from(container.querySelectorAll<HTMLElement>(".embed"));
  els.forEach((el) => {
    if (el.dataset.hydrated) return;
    el.dataset.hydrated = "1";
    const key = el.dataset.embed ?? "";
    const data = EMBED_DATA[key];
    if (!data) {
      el.innerHTML = `<div class="em-bd" style="color:var(--ink-3);font-size:12.5px">임베드 없음: ${escapeHtml(key)}</div>`;
      return;
    }
    if (data.type === "ticket") {
      el.classList.add("ticket");
      el.innerHTML = `
        <div class="em-hd">
          <span class="src"><span class="dot"></span>CRM TICKET</span>
          <span class="external" title="외부 시스템에서 열기">${EXTERNAL_ICON}</span>
        </div>
        <div class="em-bd">
          <div class="ticket-row">
            <span class="ticket-id">${escapeHtml(data.id)}</span>
            <span class="stat-pill ${escapeHtml(data.status)}">${escapeHtml(data.statusLabel)}</span>
            <span style="font-family:var(--font-mono);font-size:10.5px;color:var(--ink-3)">${escapeHtml(data.priority)}</span>
          </div>
          <h4>${escapeHtml(data.title)}</h4>
          <div class="meta">
            <span>고객 <b>${escapeHtml(data.customer)}</b></span>
            <span>담당 <b>${escapeHtml(data.assignee)}</b></span>
            <span>채널 <b>${escapeHtml(data.channel)}</b></span>
            <span>접수 <b>${escapeHtml(data.age)}</b></span>
          </div>
        </div>`;
    } else if (data.type === "product") {
      el.classList.add("product");
      el.innerHTML = `
        <div class="em-hd">
          <span class="src" style="--c:oklch(0.45 0.13 145)"><span class="dot" style="background:oklch(0.55 0.13 145)"></span>PRODUCT CATALOG</span>
          <span class="external">${EXTERNAL_ICON}</span>
        </div>
        <div class="em-bd">
          <div class="ph"></div>
          <div style="flex:1; min-width:0;">
            <div class="pn">${escapeHtml(data.name)}</div>
            <div class="sku">${escapeHtml(data.sku)} · ${escapeHtml(data.category)}</div>
            <div class="meta">
              <span class="pr">${escapeHtml(data.price)}</span>
              <span class="stock${data.stockStatus === "low" ? " low" : ""}"><span class="dot"></span>재고 ${data.stock}</span>
              <span style="color:var(--ink-3)">★ ${escapeHtml(data.rating)}</span>
            </div>
          </div>
        </div>`;
    }
  });
}

export const EMBED_KEYS = Object.keys(EMBED_DATA);

function hydrateScriptCards(container: HTMLElement): () => void {
  const cards = Array.from(container.querySelectorAll<HTMLElement>(".script-card"));
  const offs: Array<() => void> = [];

  cards.forEach((card) => {
    if (card.dataset.hydrated) return;
    card.dataset.hydrated = "1";

    const body = card.querySelector<HTMLElement>(".sc-body");
    const tpl = card.dataset.template || body?.textContent || "";
    const slots = Array.from(card.querySelectorAll<HTMLElement>(".var-slot"));
    const inputs = Array.from(
      card.querySelectorAll<HTMLInputElement>("input[data-var-input]"),
    );
    const copyBtn = card.querySelector<HTMLElement>('[data-action="copy"]');
    const state: Record<string, string> = {};

    inputs.forEach((inp) => {
      const onInput = () => {
        const k = inp.dataset.varInput!;
        state[k] = inp.value;
        slots.forEach((s) => {
          if (s.dataset.var === k) {
            s.textContent = inp.value || "{" + k + "}";
            s.classList.toggle("filled", !!inp.value);
          }
        });
      };
      const onMouseDown = (e: Event) => e.stopPropagation();
      inp.addEventListener("input", onInput);
      inp.addEventListener("mousedown", onMouseDown);
      offs.push(() => {
        inp.removeEventListener("input", onInput);
        inp.removeEventListener("mousedown", onMouseDown);
      });
    });

    if (copyBtn) {
      const onCopy = async (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
        let txt = tpl;
        Object.entries(state).forEach(([k, v]) => {
          if (v) txt = txt.replaceAll("{" + k + "}", v);
        });
        try {
          await navigator.clipboard.writeText(txt);
        } catch {
          const ta = document.createElement("textarea");
          ta.value = txt;
          document.body.appendChild(ta);
          ta.select();
          try {
            document.execCommand("copy");
          } catch {
            /* noop */
          }
          ta.remove();
        }
        copyBtn.classList.add("copied");
        const orig = copyBtn.innerHTML;
        copyBtn.innerHTML =
          '<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="2 7 5.5 10.5 12 4"/></svg> 복사됨';
        setTimeout(() => {
          copyBtn.classList.remove("copied");
          copyBtn.innerHTML = orig;
        }, 1500);
      };
      copyBtn.addEventListener("click", onCopy);
      offs.push(() => copyBtn.removeEventListener("click", onCopy));
    }
  });

  return () => offs.forEach((o) => o());
}

type TreeNode = { q?: string; r?: string; good?: boolean; y?: TreeNode; n?: TreeNode };

function hydrateDecisionTrees(container: HTMLElement): () => void {
  const trees = Array.from(container.querySelectorAll<HTMLElement>(".decision-tree"));
  const offs: Array<() => void> = [];

  trees.forEach((dt) => {
    if (dt.dataset.hydrated) return;
    dt.dataset.hydrated = "1";

    let tree: TreeNode;
    try {
      tree = JSON.parse(dt.dataset.tree ?? "{}");
    } catch {
      return;
    }

    const qEl = dt.querySelector<HTMLElement>(".dt-question");
    const choicesEl = dt.querySelector<HTMLElement>(".dt-choices");
    const pathEl = dt.querySelector<HTMLElement>(".dt-path");
    if (!qEl || !choicesEl || !pathEl) return;

    const path: Array<{ q?: string; a: "y" | "n" }> = [];
    let current: TreeNode = tree;

    const render = () => {
      qEl.textContent = current.q ?? "";
      choicesEl.style.display = current.q ? "flex" : "none";
      choicesEl
        .querySelectorAll<HTMLElement>(".dt-choice")
        .forEach((b) => b.classList.remove("on"));
      pathEl.innerHTML = "";
      path.forEach((step) => {
        const el = document.createElement("div");
        el.className = "dt-step";
        el.innerHTML = `<div style="color:var(--ink-3);font-size:11.5px;margin-bottom:2px">${
          step.q ?? ""
        }</div><div><b>${step.a === "y" ? "✓ 예" : "✗ 아니오"}</b></div>`;
        pathEl.appendChild(el);
      });
      if (current.r) {
        const r = document.createElement("div");
        r.className = "dt-result" + (current.good ? "" : " bad");
        r.innerHTML = `${current.good ? "✓" : "✗"} <span>${current.r}</span>`;
        pathEl.appendChild(r);
        const reset = document.createElement("button");
        reset.className = "dt-reset";
        reset.textContent = "↺ 처음부터 다시";
        reset.addEventListener("click", (e) => {
          e.preventDefault();
          path.length = 0;
          current = tree;
          render();
        });
        pathEl.appendChild(reset);
      }
    };

    choicesEl.querySelectorAll<HTMLElement>(".dt-choice").forEach((btn) => {
      const onClick = (e: Event) => {
        e.preventDefault();
        const ch = (btn as HTMLElement).dataset.choice as "y" | "n";
        path.push({ q: current.q, a: ch });
        const next = current[ch];
        current = next ?? { r: "다음 단계 없음", good: false };
        render();
      };
      btn.addEventListener("click", onClick);
      offs.push(() => btn.removeEventListener("click", onClick));
    });

    render();
  });

  return () => offs.forEach((o) => o());
}

function hydrateChecklists(container: HTMLElement): () => void {
  const inputs = Array.from(
    container.querySelectorAll<HTMLInputElement>(
      ".checklist input[type='checkbox']",
    ),
  );
  const offs: Array<() => void> = [];

  inputs.forEach((inp) => {
    if (inp.dataset.hydrated) return;
    inp.dataset.hydrated = "1";
    const li = inp.closest("li");
    const onChange = () => {
      li?.classList.toggle("done", inp.checked);
    };
    // Sync initial state
    onChange();
    inp.addEventListener("change", onChange);
    offs.push(() => inp.removeEventListener("change", onChange));
  });

  return () => offs.forEach((o) => o());
}
