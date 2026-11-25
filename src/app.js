import {
  App,
  applyDocumentTheme,
  applyHostStyleVariables,
} from "@modelcontextprotocol/ext-apps";

const app = new App({ name: "win-explorer", version: "1.0.0" }, {});

const titleEl = document.getElementById("card-title");
const badgeEl = document.getElementById("card-badge");
const openDirBtn = document.getElementById("open-dir-btn");
const listEl = document.getElementById("file-list");
const toastEl = document.getElementById("toast");

let currentCommonDir = "";
let toastTimer = null;

function showToast(msg, isError = false) {
  if (!toastEl) return;
  toastEl.textContent = msg;
  toastEl.dataset.error = isError ? "1" : "0";
  toastEl.classList.add("visible");
  if (toastTimer) clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastEl.classList.remove("visible");
  }, 2200);
}

function getFileIcon(ext, isDir) {
  if (isDir || ext === "folder") return { label: "DIR", cls: "ico-folder" };
  switch (ext) {
    case ".doc":
    case ".docx":
      return { label: "W", cls: "ico-word" };
    case ".xls":
    case ".xlsx":
    case ".csv":
      return { label: "X", cls: "ico-excel" };
    case ".ppt":
    case ".pptx":
      return { label: "P", cls: "ico-ppt" };
    case ".pdf":
      return { label: "PDF", cls: "ico-pdf" };
    case ".png":
    case ".jpg":
    case ".jpeg":
    case ".svg":
    case ".webp":
      return { label: "IMG", cls: "ico-img" };
    case ".md":
    case ".txt":
      return { label: "MD", cls: "ico-doc" };
    case ".json":
    case ".js":
    case ".mjs":
    case ".ts":
    case ".py":
    case ".ps1":
    case ".bat":
    case ".html":
      return { label: "</>", cls: "ico-code" };
    default:
      return { label: "FILE", cls: "ico-default" };
  }
}

async function revealPath(targetPath, openFolder = false) {
  try {
    const res = await app.callServerTool({
      name: "reveal_in_explorer",
      arguments: { path: targetPath, openFolder },
    });
    if (res?.isError) {
      showToast("路径不存在或无法打开", true);
    } else {
      showToast(openFolder ? "已打开文件夹" : "已在资源管理器中定位");
    }
  } catch (err) {
    showToast("定位失败：" + (err?.message || "未知错误"), true);
  }
}

async function openFile(targetPath) {
  try {
    const res = await app.callServerTool({
      name: "open_file",
      arguments: { path: targetPath },
    });
    if (res?.isError) {
      showToast("文件不存在或无法打开", true);
    } else {
      showToast("已用系统默认程序打开");
    }
  } catch (err) {
    showToast("打开失败：" + (err?.message || "未知错误"), true);
  }
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    ta.style.position = "fixed";
    ta.style.opacity = "0";
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  const old = btn.textContent;
  btn.textContent = "已复制";
  showToast("已复制完整路径");
  setTimeout(() => {
    btn.textContent = old;
  }, 1500);
}

function render(data) {
  if (!data) return;
  const files = Array.isArray(data.files) ? data.files : [];
  currentCommonDir = data.commonDir || "";

  titleEl.textContent = data.title || "Win Explorer · 相关文件";
  badgeEl.textContent = `双击可直接定位 · ${files.length} 项`;

  if (currentCommonDir) {
    openDirBtn.hidden = false;
    openDirBtn.title = currentCommonDir;
  } else {
    openDirBtn.hidden = true;
  }

  listEl.innerHTML = "";
  if (files.length === 0) {
    const empty = document.createElement("div");
    empty.className = "empty-row";
    empty.textContent = "暂无可展示的文件";
    listEl.appendChild(empty);
    return;
  }

  for (const f of files) {
    const row = document.createElement("div");
    row.className = "file-row" + (f.exists ? "" : " is-missing");
    row.title = "双击在 Windows 资源管理器中定位";
    row.addEventListener("dblclick", () => {
      if (f.exists) revealPath(f.fullPath, f.isDir);
    });

    const icoInfo = getFileIcon(f.ext, f.isDir);
    const ico = document.createElement("span");
    ico.className = `file-ico ${icoInfo.cls}`;
    ico.textContent = icoInfo.label;

    const meta = document.createElement("div");
    meta.className = "file-meta";

    const nameEl = document.createElement("div");
    nameEl.className = "file-name";
    nameEl.textContent = f.name;
    nameEl.title = f.name;

    const pathEl = document.createElement("div");
    pathEl.className = "file-path";
    pathEl.textContent = f.fullPath;
    pathEl.title = f.fullPath;

    meta.appendChild(nameEl);
    meta.appendChild(pathEl);

    const sizeEl = document.createElement("span");
    sizeEl.className = "file-size";
    sizeEl.textContent = f.sizeLabel || "";

    const actions = document.createElement("div");
    actions.className = "file-actions";

    const btnLocate = document.createElement("button");
    btnLocate.type = "button";
    btnLocate.className = "btn btn-primary";
    btnLocate.textContent = "定位";
    btnLocate.disabled = !f.exists;
    btnLocate.addEventListener("click", (e) => {
      e.stopPropagation();
      revealPath(f.fullPath, f.isDir);
    });

    const btnOpen = document.createElement("button");
    btnOpen.type = "button";
    btnOpen.className = "btn";
    btnOpen.textContent = "打开";
    btnOpen.disabled = !f.exists;
    btnOpen.addEventListener("click", (e) => {
      e.stopPropagation();
      openFile(f.fullPath);
    });

    const btnCopy = document.createElement("button");
    btnCopy.type = "button";
    btnCopy.className = "btn";
    btnCopy.textContent = "复制";
    btnCopy.addEventListener("click", (e) => {
      e.stopPropagation();
      copyText(f.fullPath, btnCopy);
    });

    actions.appendChild(btnLocate);
    actions.appendChild(btnOpen);
    actions.appendChild(btnCopy);

    row.appendChild(ico);
    row.appendChild(meta);
    row.appendChild(sizeEl);
    row.appendChild(actions);
    listEl.appendChild(row);
  }
}

openDirBtn.addEventListener("click", () => {
  if (currentCommonDir) revealPath(currentCommonDir, true);
});

// Register handlers BEFORE connect()
app.ontoolinput = ({ arguments: args }) => {
  if (args?.title) titleEl.textContent = args.title;
  badgeEl.textContent = "加载文件列表...";
};

app.ontoolresult = (result) => {
  if (result?.structuredContent) {
    render(result.structuredContent);
  }
};

app.onhostcontextchanged = (ctx) => {
  if (ctx?.theme) applyDocumentTheme(ctx.theme);
  if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
};

await app.connect();
const ctx = app.getHostContext();
if (ctx?.theme) applyDocumentTheme(ctx.theme);
if (ctx?.styles?.variables) applyHostStyleVariables(ctx.styles.variables);
