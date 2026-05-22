// One-shot Markdown → HTML conversion for the SPEC doc.
// Wraps in a minimal HTML shell with light styling so Word imports it cleanly.

import { readFileSync, writeFileSync } from "node:fs";
import { marked } from "marked";

const md = readFileSync("SPEC.md", "utf8");
const body = marked.parse(md);

const html = `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<title>Manual Workbench — 기능 명세서</title>
<style>
  body { font-family: "맑은 고딕", "Malgun Gothic", sans-serif; line-height: 1.55; max-width: 920px; margin: 24px; color: #222; }
  h1 { font-size: 22pt; border-bottom: 2px solid #444; padding-bottom: 6px; margin-top: 28px; }
  h2 { font-size: 17pt; border-bottom: 1px solid #888; padding-bottom: 4px; margin-top: 24px; }
  h3 { font-size: 14pt; margin-top: 20px; }
  h4 { font-size: 12pt; margin-top: 16px; }
  table { border-collapse: collapse; width: 100%; margin: 8px 0; }
  th, td { border: 1px solid #bbb; padding: 6px 10px; font-size: 10.5pt; vertical-align: top; }
  th { background: #f1f1f1; }
  code { font-family: "Consolas", monospace; background: #f3f3f3; padding: 1px 4px; border-radius: 3px; font-size: 9.5pt; }
  pre { background: #f5f5f5; padding: 10px 12px; border-radius: 4px; font-size: 9.5pt; overflow-x: auto; }
  blockquote { border-left: 3px solid #888; padding: 4px 12px; color: #444; background: #fafafa; }
  ul, ol { padding-left: 22px; }
  hr { border: 0; border-top: 1px solid #ccc; margin: 18px 0; }
</style>
</head>
<body>
${body}
</body>
</html>
`;

writeFileSync("SPEC.html", html);
console.log("Wrote SPEC.html");
