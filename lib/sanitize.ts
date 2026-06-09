import "server-only";
import sanitizeHtml from "sanitize-html";

/**
 * 문서 본문(Tiptap HTML) 저장형 XSS 방어 — 그룹 5-A.
 *
 * 본문은 `dangerouslySetInnerHTML`/`innerHTML` 로 렌더되므로 신뢰할 수 없는
 * HTML 이 그대로 실행될 수 있다. 저장(saveBody/pushVersion)과 읽기
 * (fetchDocumentContent/fetchHistory) 양쪽에서 이 함수를 통과시켜 script/
 * 이벤트 핸들러/javascript: URL/위험 태그를 제거한다.
 *
 * allowlist 는 본문의 커스텀 위젯을 깨지 않도록 신중히 잡았다:
 *   - script-card: button[data-action], input[data-var-input], .var-slot[data-var]
 *   - decision-tree: data-tree, button.dt-choice[data-choice]
 *   - embed: .embed[data-embed] (내용은 hydrate 시 재생성)
 *   - checklist: input[type=checkbox]
 * 인라인 SVG 아이콘(복사 버튼 등)을 위해 안전한 SVG 하위 집합도 허용하되
 * use/script/foreignObject/event 핸들러/href 는 제외한다. viewBox 등 camelCase
 * 속성 보존을 위해 lowerCaseAttributeNames=false.
 *
 * style 속성은 값 필터 없이 통과시킨다(본문이 var(--x)/oklch() 를 광범위하게
 * 사용 + 현대 브라우저는 CSS expression() 미실행). 실질 XSS 벡터인 script,
 * 이벤트 핸들러, javascript: URL 은 태그·속성·스킴 allowlist 로 차단된다.
 */
const SVG_PRESENTATION = [
  "fill",
  "stroke",
  "stroke-width",
  "stroke-linecap",
  "stroke-linejoin",
  "fill-rule",
  "clip-rule",
  "opacity",
  "transform",
];

const OPTIONS: sanitizeHtml.IOptions = {
  allowedTags: [
    // 텍스트 & 구조
    "p", "div", "span", "section", "article", "br", "hr",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "strong", "b", "em", "i", "u", "s", "strike", "del", "ins", "mark",
    "sub", "sup", "small",
    "ul", "ol", "li", "blockquote", "code", "pre", "kbd", "samp", "var",
    "q", "abbr", "cite",
    "a", "img", "figure", "figcaption",
    "table", "thead", "tbody", "tfoot", "tr", "td", "th", "caption",
    "colgroup", "col",
    // 인터랙티브 위젯
    "button", "input", "label",
    // 안전한 SVG 하위 집합 (아이콘)
    "svg", "path", "line", "polyline", "polygon", "rect", "circle",
    "ellipse", "g",
  ],
  allowedAttributes: {
    "*": [
      "class", "style", "id", "title", "contenteditable",
      "data-template", "data-tree", "data-embed", "data-var",
      "data-var-input", "data-action", "data-choice", "data-hydrated",
      "data-placeholder", "aria-hidden", "aria-label",
    ],
    a: ["href", "target", "rel", "name"],
    img: ["src", "alt", "width", "height", "loading"],
    input: [
      "type", "placeholder", "value", "checked", "disabled",
      "readonly", "name", "data-var-input",
    ],
    button: ["type", "data-action", "data-choice", "disabled"],
    td: ["colspan", "rowspan"],
    th: ["colspan", "rowspan", "scope"],
    col: ["span"],
    colgroup: ["span"],
    svg: ["viewbox", "viewBox", "width", "height", "xmlns", ...SVG_PRESENTATION],
    path: ["d", ...SVG_PRESENTATION],
    line: ["x1", "y1", "x2", "y2", ...SVG_PRESENTATION],
    polyline: ["points", ...SVG_PRESENTATION],
    polygon: ["points", ...SVG_PRESENTATION],
    rect: ["x", "y", "width", "height", "rx", "ry", ...SVG_PRESENTATION],
    circle: ["cx", "cy", "r", ...SVG_PRESENTATION],
    ellipse: ["cx", "cy", "rx", "ry", ...SVG_PRESENTATION],
    g: SVG_PRESENTATION,
  },
  // script/style/iframe 등은 태그뿐 아니라 내부 텍스트까지 통째로 제거
  nonTextTags: [
    "script", "style", "noscript", "iframe", "object", "embed",
    "template", "textarea", "title", "head",
  ],
  allowedSchemes: ["http", "https", "mailto", "tel"],
  allowedSchemesByTag: { img: ["http", "https", "data"] },
  allowedSchemesAppliedToAttributes: ["href", "src"],
  allowProtocolRelative: false,
  // viewBox 등 SVG camelCase 속성 보존
  parser: { lowerCaseAttributeNames: false },
};

export function sanitizeBodyHtml(html: string | null | undefined): string {
  if (!html) return "";
  return sanitizeHtml(html, OPTIONS);
}
