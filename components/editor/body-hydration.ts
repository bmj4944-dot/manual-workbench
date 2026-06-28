/**
 * Hydration helpers for read-mode body widgets — script cards, decision trees,
 * checklist toggles. The body HTML is rendered via dangerouslySetInnerHTML, so
 * we manually attach handlers after each mount/content change.
 *
 * Ported from design_handoff_manual_workbench/src/quick-actions.jsx.
 */

import { EMBED_DATA } from "@/lib/sample-data";
import type { EmbedData } from "@/lib/types";

// 본문 임베드 데이터는 운영화되어 DB(crm_tickets/products)에서 내려온다.
// 호출부(document-editor)가 워크벤치 컨텍스트의 맵을 넘긴다. 인자가 없으면
// 하드코딩 폴백(EMBED_DATA)을 쓴다 — 마이그 미적용/비로그인 SSR 등.
export function hydrateBody(
  container: HTMLElement | null,
  embeds: Record<string, EmbedData> = EMBED_DATA,
): () => void {
  if (!container) return () => {};
  const cleanups: Array<() => void> = [];

  cleanups.push(hydrateScriptCards(container));
  cleanups.push(hydrateDecisionTrees(container));
  cleanups.push(hydrateChecklists(container));
  hydrateEmbeds(container, embeds); // pure DOM mutation; no listeners to clean up
  cleanups.push(hydrateWidgetControls(container, embeds));

  return () => cleanups.forEach((c) => c());
}

// Strip dynamically-injected widget controls before persisting body HTML.
// Mutates the input string — callers should pass a clone if they need the
// original to remain intact. Used by document-editor's notifyChange so the
// trash/duplicate buttons don't leak into the saved body.
export function stripWidgetControls(html: string): string {
  if (!html.includes("widget-controls")) return html;
  if (typeof document === "undefined") return html;
  const tmp = document.createElement("div");
  tmp.innerHTML = html;
  tmp.querySelectorAll(".widget-controls").forEach((el) => el.remove());
  return tmp.innerHTML;
}

function hydrateWidgetControls(
  container: HTMLElement,
  embeds: Record<string, EmbedData>,
): () => void {
  const widgets = Array.from(
    container.querySelectorAll<HTMLElement>(".script-card, .decision-tree, .embed"),
  );
  const offs: Array<() => void> = [];

  const PEN = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M1.5 12.5 L2.5 9.5 L9 3 L11 5 L4.5 11.5 Z"/><line x1="8.5" y1="3.5" x2="10.5" y2="5.5"/></svg>`;
  const PLUS = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"><line x1="7" y1="3" x2="7" y2="11"/><line x1="3" y1="7" x2="11" y2="7"/></svg>`;
  const COPY = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="8" height="8" rx="1.5"/><path d="M6 1.5h5.5A1.5 1.5 0 0 1 13 3v5.5"/></svg>`;
  const X = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><line x1="3.5" y1="3.5" x2="10.5" y2="10.5"/><line x1="10.5" y1="3.5" x2="3.5" y2="10.5"/></svg>`;

  widgets.forEach((w) => {
    // Avoid stacking controls if hydrate runs twice (e.g. after a re-render).
    w.querySelectorAll(".widget-controls").forEach((el) => el.remove());

    // Anchor the floating toolbar — position:relative on the widget so the
    // absolute-positioned toolbar lands at the widget's own top-right.
    if (!w.style.position) w.style.position = "relative";

    // Per-widget edit buttons. Heavy editing UIs (modal forms) would be
    // nicer but are out of scope for this pass — prompt() is enough to
    // unlock the data without rewriting the widget structure.
    let typeButtons = "";
    if (w.classList.contains("script-card")) {
      typeButtons = `<button type="button" data-action="add-var" title="변수 추가">${PLUS}</button>`;
    } else if (w.classList.contains("decision-tree")) {
      typeButtons = `<button type="button" data-action="edit-tree" title="분기 JSON 편집">${PEN}</button>`;
    } else if (w.classList.contains("embed")) {
      typeButtons = `<button type="button" data-action="swap-embed" title="소스 교체">${PEN}</button>`;
    }

    const bar = document.createElement("div");
    bar.className = "widget-controls";
    bar.contentEditable = "false";
    bar.innerHTML = `
      ${typeButtons}
      <button type="button" data-action="duplicate" title="복제">${COPY}</button>
      <button type="button" data-action="delete" title="삭제">${X}</button>
    `;
    w.appendChild(bar);

    const onClick = (e: Event) => {
      const t = e.target as HTMLElement;
      const btn = t.closest<HTMLButtonElement>("button[data-action]");
      if (!btn) return;
      e.preventDefault();
      e.stopPropagation();
      const action = btn.dataset.action;

      if (action === "delete") {
        w.remove();
      } else if (action === "duplicate") {
        const clone = w.cloneNode(true) as HTMLElement;
        clone.removeAttribute("data-hydrated");
        clone.querySelectorAll(".widget-controls").forEach((el) => el.remove());
        w.after(clone);
      } else if (action === "add-var") {
        addScriptVar(w);
      } else if (action === "edit-tree") {
        editDecisionTree(w);
      } else if (action === "swap-embed") {
        swapEmbed(w, embeds);
      }

      // Notify the editor's MutationObserver path — dispatching an 'input'
      // event on the closest contenteditable triggers the normal save flow.
      const ce = w.closest<HTMLElement>('[contenteditable="true"]') ?? w.parentElement;
      ce?.dispatchEvent(new Event("input", { bubbles: true }));
    };
    bar.addEventListener("click", onClick);
    offs.push(() => bar.removeEventListener("click", onClick));
  });

  return () => offs.forEach((o) => o());
}

// ─── Per-widget editors ────────────────────────────────────────────
// prompt()-based for now — quick way to expose the underlying data without
// the modal infrastructure. Each handler mutates the widget DOM in place,
// then strips data-hydrated so the next hydrate pass re-attaches listeners.

function addScriptVar(card: HTMLElement) {
  const name = window.prompt("새 변수 이름 (예: 주문번호)")?.trim();
  if (!name) return;
  // De-dup against existing variable inputs to keep the var registry clean.
  if (card.querySelector(`[data-var-input="${cssEscape(name)}"]`)) {
    window.alert(`이미 "${name}" 변수가 있습니다.`);
    return;
  }

  // Append the new variable input row in the .sc-vars footer.
  const vars = card.querySelector<HTMLElement>(".sc-vars");
  if (vars) {
    const vk = document.createElement("span");
    vk.className = "vk";
    vk.innerHTML = `${escapeHtml(name)} <input type="text" data-var-input="${escapeAttr(
      name,
    )}" placeholder="" />`;
    vars.appendChild(vk);
  }

  // Drop a slot at the end of .sc-body so hydration can wire {var} → input.
  const body = card.querySelector<HTMLElement>(".sc-body");
  if (body) {
    body.insertAdjacentHTML(
      "beforeend",
      ` <span class="var-slot" data-var="${escapeAttr(name)}">{${escapeHtml(
        name,
      )}}</span>`,
    );
  }

  card.removeAttribute("data-hydrated");
}

function editDecisionTree(dt: HTMLElement) {
  const current = dt.dataset.tree ?? "{}";
  let pretty: string;
  try {
    pretty = JSON.stringify(JSON.parse(current), null, 2);
  } catch {
    pretty = current;
  }
  const next = window.prompt(
    "결정 트리 JSON (예: {\"q\":\"질문?\",\"y\":{\"r\":\"예 결과\",\"good\":true},\"n\":{\"r\":\"아니오 결과\"}})",
    pretty,
  );
  if (next == null) return;
  try {
    JSON.parse(next); // validate
  } catch (e) {
    window.alert(
      `JSON이 올바르지 않습니다: ${e instanceof Error ? e.message : String(e)}`,
    );
    return;
  }
  dt.dataset.tree = next;
  dt.removeAttribute("data-hydrated");
  // Reset visible state so the user immediately sees the new question.
  const q = dt.querySelector<HTMLElement>(".dt-question");
  const path = dt.querySelector<HTMLElement>(".dt-path");
  if (q) q.textContent = "";
  if (path) path.innerHTML = "";
}

function swapEmbed(el: HTMLElement, embeds: Record<string, EmbedData>) {
  const keys = Object.keys(embeds);
  const current = el.dataset.embed ?? "";
  const next = window.prompt(
    `사용 가능한 소스:\n  - ${keys.join("\n  - ")}\n\n새 소스 키`,
    current,
  );
  if (next == null) return;
  const trimmed = next.trim();
  if (!trimmed) return;
  if (!(trimmed in embeds)) {
    window.alert(`"${trimmed}" 소스가 없습니다. 등록된 키 중에서 선택해주세요.`);
    return;
  }
  el.dataset.embed = trimmed;
  // Wipe rendered body so hydrateEmbeds repaints it on the next pass.
  el.removeAttribute("data-hydrated");
  el.innerHTML = "";
}

function escapeAttr(s: string): string {
  return s.replace(/"/g, "&quot;");
}

function cssEscape(s: string): string {
  // Minimal — variable names won't contain CSS escape edge cases in practice.
  return s.replace(/(["\\])/g, "\\$1");
}

// ─── Embed rendering (CRM ticket / product catalog) ────────────────
// 데이터(EmbedData)는 lib/types 에, 운영 소스는 lib/data/embeds(DB) 에 있다.
const EXTERNAL_ICON = `<svg width="11" height="11" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"><path d="M5 2H3a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1V9"/><polyline points="9 2 12 2 12 5"/><line x1="6" y1="8" x2="12" y2="2"/></svg>`;

function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function hydrateEmbeds(
  container: HTMLElement,
  embeds: Record<string, EmbedData>,
): void {
  const els = Array.from(container.querySelectorAll<HTMLElement>(".embed"));
  els.forEach((el) => {
    if (el.dataset.hydrated) return;
    el.dataset.hydrated = "1";
    const key = el.dataset.embed ?? "";
    const data = embeds[key];
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
