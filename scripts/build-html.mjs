import { build } from "esbuild";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

const bundled = await build({
  entryPoints: [path.join(rootDir, "src", "app.js")],
  bundle: true,
  format: "esm",
  minify: true,
  write: false,
  target: "es2022",
});

const jsCode = bundled.outputFiles[0].text;

const html = `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Win Explorer</title>
  <style>
    * { box-sizing: border-box; }
    html, body {
      margin: 0;
      padding: 0;
      background: transparent;
      color: var(--color-text-primary, #1f2328);
      font-family: var(--font-sans, "Segoe UI", system-ui, -apple-system, sans-serif);
      font-size: 13px;
      line-height: 1.45;
      -webkit-font-smoothing: antialiased;
    }
    .card {
      background: var(--color-background-primary, #ffffff);
      border: 1px solid var(--color-border-primary, #e2e8f0);
      border-radius: 12px;
      overflow: hidden;
    }
    .card-header {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 10px;
      padding: 10px 14px;
      background: var(--color-background-secondary, #f8fafc);
      border-bottom: 1px solid var(--color-border-primary, #e2e8f0);
    }
    .header-left {
      display: flex;
      align-items: center;
      gap: 8px;
      min-width: 0;
      flex-wrap: wrap;
    }
    .card-title {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary, #1f2328);
      white-space: nowrap;
    }
    .card-badge {
      font-size: 11px;
      padding: 1px 7px;
      border-radius: 999px;
      background: var(--color-background-info, #e8f1ff);
      color: var(--color-text-info, #1d4ed8);
      white-space: nowrap;
    }
    .file-list {
      display: flex;
      flex-direction: column;
    }
    .file-row {
      display: flex;
      align-items: center;
      gap: 10px;
      padding: 9px 14px;
      border-bottom: 1px solid var(--color-border-secondary, #f1f5f9);
      transition: background 0.12s ease;
      cursor: default;
    }
    .file-row:last-child { border-bottom: none; }
    .file-row:hover { background: var(--color-background-secondary, #f8fafc); }
    .file-row.is-missing { opacity: 0.55; }
    .file-ico {
      flex: 0 0 auto;
      width: 26px;
      height: 26px;
      border-radius: 6px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      font-size: 10px;
      font-weight: 700;
      letter-spacing: -0.02em;
    }
    .ico-word   { background: #dbeafe; color: #1d4ed8; }
    .ico-excel  { background: #dcfce7; color: #15803d; }
    .ico-ppt    { background: #ffedd5; color: #c2410c; }
    .ico-pdf    { background: #fee2e2; color: #b91c1c; }
    .ico-img    { background: #f3e8ff; color: #7e22ce; }
    .ico-folder { background: #fef3c7; color: #b45309; }
    .ico-doc    { background: #e2e8f0; color: #334155; }
    .ico-code   { background: #e0e7ff; color: #3730a3; }
    .ico-default{ background: #f1f5f9; color: #475569; }
    .file-meta {
      flex: 1 1 auto;
      min-width: 0;
    }
    .file-name {
      font-size: 13px;
      font-weight: 600;
      color: var(--color-text-primary, #1f2328);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }
    .file-path {
      font-size: 11px;
      color: var(--color-text-secondary, #64748b);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
      margin-top: 1px;
    }
    .file-size {
      flex: 0 0 auto;
      font-size: 11.5px;
      color: var(--color-text-secondary, #64748b);
      font-variant-numeric: tabular-nums;
      margin-right: 4px;
      white-space: nowrap;
    }
    .file-actions {
      flex: 0 0 auto;
      display: inline-flex;
      align-items: center;
      gap: 6px;
    }
    .btn {
      appearance: none;
      border: 1px solid var(--color-border-primary, #cbd5e1);
      background: var(--color-background-primary, #ffffff);
      color: var(--color-text-primary, #1f2328);
      font-size: 12px;
      font-weight: 500;
      padding: 3px 10px;
      border-radius: 6px;
      cursor: pointer;
      transition: all 0.12s ease;
      white-space: nowrap;
    }
    .btn:hover:not(:disabled) {
      background: var(--color-background-tertiary, #f1f5f9);
      border-color: var(--color-border-primary, #94a3b8);
    }
    .btn:disabled { opacity: 0.45; cursor: not-allowed; }
    .btn-primary {
      background: var(--color-background-info, #eff6ff);
      color: var(--color-text-info, #1d4ed8);
      border-color: var(--color-border-info, #bfdbfe);
    }
    .btn-primary:hover:not(:disabled) {
      filter: brightness(0.95);
    }
    .empty-row {
      padding: 16px;
      text-align: center;
      color: var(--color-text-secondary, #64748b);
      font-size: 12px;
    }
    .status-bar {
      display: none;
      padding: 6px 14px;
      font-size: 11.5px;
      border-top: 1px solid var(--color-border-secondary, #f1f5f9);
      background: var(--color-background-secondary, #f8fafc);
      color: var(--color-text-secondary, #475569);
    }
    .status-bar.visible { display: block; }
    .status-bar[data-error="1"] {
      background: var(--color-background-danger, #fef2f2);
      color: var(--color-text-danger, #dc2626);
    }
  </style>
</head>
<body>
  <div class="card">
    <div class="card-header">
      <div class="header-left">
        <span id="card-title" class="card-title">Win Explorer · 相关文件</span>
        <span id="card-badge" class="card-badge">双击可直接定位</span>
      </div>
      <button id="open-dir-btn" type="button" class="btn" hidden>打开所在目录</button>
    </div>
    <div id="file-list" class="file-list">
      <div class="empty-row">正在加载文件列表...</div>
    </div>
    <div id="toast" class="status-bar"></div>
  </div>
  <script type="module">${jsCode}</script>
</body>
</html>
`;

fs.writeFileSync(path.join(rootDir, "app.html"), html, "utf-8");
console.log("Built app.html successfully:", Buffer.byteLength(html, "utf-8"), "bytes");
