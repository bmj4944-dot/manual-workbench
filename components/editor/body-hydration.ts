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

  return () => cleanups.forEach((c) => c());
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
