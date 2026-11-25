import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
  CallToolRequestSchema,
  ListResourcesRequestSchema,
  ListToolsRequestSchema,
  ReadResourceRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const APP_URI = "ui://win-explorer/app.html";
const APP_HTML_PATH = path.join(__dirname, "app.html");

function logDebug() {
  // No-op in production release
}

function formatSize(bytes) {
  if (bytes == null || Number.isNaN(bytes)) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

function normalizeWinPath(inputPath) {
  let p = String(inputPath || "").trim();
  if (p.startsWith("file:///")) {
    try {
      p = decodeURIComponent(p.slice("file:///".length));
    } catch {
      p = p.slice("file:///".length);
    }
  }
  p = p.replace(/\//g, "\\");
  return path.win32.resolve(p);
}

function findCommonDir(files) {
  const dirs = files
    .filter((f) => f.exists)
    .map((f) => (f.isDir ? f.fullPath : f.dir));
  if (dirs.length === 0) return "";
  let common = dirs[0];
  for (let i = 1; i < dirs.length; i++) {
    const a = common.split("\\");
    const b = dirs[i].split("\\");
    const shared = [];
    for (let j = 0; j < Math.min(a.length, b.length); j++) {
      if (a[j].toLowerCase() === b[j].toLowerCase()) {
        shared.push(a[j]);
      } else {
        break;
      }
    }
    common = shared.join("\\");
    if (!common) return "";
  }
  if (/^[A-Za-z]:$/.test(common)) common += "\\";
  return common;
}

function inspectPath(rawPath) {
  const fullPath = normalizeWinPath(rawPath);
  const name = path.win32.basename(fullPath) || fullPath;
  const dir = path.win32.dirname(fullPath);
  const ext = path.win32.extname(fullPath).toLowerCase();
  try {
    const st = fs.statSync(fullPath);
    const isDir = st.isDirectory();
    return {
      name,
      fullPath,
      dir,
      ext: isDir ? "folder" : ext,
      isDir,
      exists: true,
      size: isDir ? null : st.size,
      sizeLabel: isDir ? "文件夹" : formatSize(st.size),
      mtime: st.mtime.toISOString(),
    };
  } catch {
    return {
      name,
      fullPath,
      dir,
      ext,
      isDir: false,
      exists: false,
      size: null,
      sizeLabel: "不存在",
      mtime: "",
    };
  }
}

function launchExplorer(args) {
  return new Promise((resolve, reject) => {
    logDebug(`spawn explorer.exe ${JSON.stringify(args)}`);
    const child = spawn("explorer.exe", args, {
      windowsVerbatimArguments: true,
      detached: true,
      stdio: "ignore",
    });
    child.on("error", (err) => {
      logDebug(`explorer.exe error: ${err.message}`);
      reject(err);
    });
    child.unref();
    setTimeout(() => resolve(), 60);
  });
}

function launchDefaultApp(targetPath) {
  return new Promise((resolve, reject) => {
    logDebug(`open default app: ${targetPath}`);
    // explorer.exe "<file>" opens files with their registered Windows default app without console flash
    const child = spawn("explorer.exe", [`"${targetPath}"`], {
      windowsVerbatimArguments: true,
      detached: true,
      stdio: "ignore",
    });
    child.on("error", (err) => {
      logDebug(`open default app error: ${err.message}`);
      reject(err);
    });
    child.unref();
    setTimeout(() => resolve(), 60);
  });
}

const server = new Server(
  { name: "win-explorer", version: "1.0.1" },
  { capabilities: { tools: {}, resources: {} } }
);

server.setRequestHandler(ListResourcesRequestSchema, async () => ({
  resources: [
    {
      uri: APP_URI,
      name: "Win Explorer File Card",
      description: "Interactive Windows file card for locating and opening local files.",
      mimeType: "text/html;profile=mcp-app",
      _meta: {
        ui: {
          prefersBorder: false,
        },
      },
    },
  ],
}));

server.setRequestHandler(ReadResourceRequestSchema, async (request) => {
  if (request.params.uri !== APP_URI) {
    throw new Error(`Unknown resource: ${request.params.uri}`);
  }
  const html = fs.readFileSync(APP_HTML_PATH, "utf-8");
  return {
    contents: [
      {
        uri: APP_URI,
        mimeType: "text/html;profile=mcp-app",
        text: html,
      },
    ],
  };
});

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: "show_files",
      title: "展示 Windows 文件卡片",
      description:
        "在对话中渲染一张交互式文件卡片，列出相关本地文件，支持用户一键在 Windows 资源管理器中定位选中文件、用默认软件直接打开或复制路径。",
      inputSchema: {
        type: "object",
        properties: {
          paths: {
            type: "array",
            items: { type: "string" },
            description: "要展示的文件或文件夹的 Windows 绝对路径列表。",
          },
          title: {
            type: "string",
            description: "可选的卡片标题，默认显示“Win Explorer · 相关文件”。",
          },
        },
        required: ["paths"],
      },
      _meta: {
        ui: {
          resourceUri: APP_URI,
        },
      },
    },
    {
      name: "reveal_in_explorer",
      title: "在 Windows 资源管理器中定位",
      description: "打开 Windows 资源管理器并高亮选中目标文件（或直接打开目标文件夹）。",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "目标文件或文件夹绝对路径" },
          openFolder: {
            type: "boolean",
            description: "为 true 时直接打开文件夹内容；为 false 时定位并高亮选中文件。",
          },
        },
        required: ["path"],
      },
      _meta: {
        ui: {
          visibility: ["app"],
        },
      },
    },
    {
      name: "open_file",
      title: "用系统默认程序打开文件",
      description: "调用 Windows 默认关联程序（如 Word、Excel、PDF 阅读器）直接打开本地文件。",
      inputSchema: {
        type: "object",
        properties: {
          path: { type: "string", description: "目标文件绝对路径" },
        },
        required: ["path"],
      },
      _meta: {
        ui: {
          visibility: ["app"],
        },
      },
    },
  ],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args = {} } = request.params;
  logDebug(`tools/call ${name} args=${JSON.stringify(args)}`);

  if (name === "show_files") {
    const rawPaths = Array.isArray(args.paths) ? args.paths : [];
    const seen = new Set();
    const files = [];
    for (const p of rawPaths) {
      if (!p || typeof p !== "string") continue;
      const info = inspectPath(p);
      const key = info.fullPath.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      files.push(info);
    }

    const title =
      typeof args.title === "string" && args.title.trim()
        ? args.title.trim()
        : "Win Explorer · 相关文件";
    const commonDir = findCommonDir(files);
    const summaryLines = files.map(
      (f) => `- ${f.name} (${f.sizeLabel}) -> ${f.fullPath}`
    );

    return {
      content: [
        {
          type: "text",
          text:
            files.length > 0
              ? `已展示 ${files.length} 个文件卡片：\n${summaryLines.join("\n")}`
              : "未传入有效文件路径。",
        },
      ],
      structuredContent: {
        title,
        commonDir,
        files,
      },
    };
  }

  if (name === "reveal_in_explorer") {
    const target = normalizeWinPath(args.path);
    if (!fs.existsSync(target)) {
      logDebug(`reveal_in_explorer missing: ${target}`);
      return {
        isError: true,
        content: [{ type: "text", text: `路径不存在：${target}` }],
      };
    }
    const st = fs.statSync(target);
    const openFolder = Boolean(args.openFolder) || st.isDirectory();
    if (openFolder && st.isDirectory()) {
      await launchExplorer([`"${target}"`]);
    } else {
      await launchExplorer([`/select,"${target}"`]);
    }
    return {
      content: [{ type: "text", text: `已在 Windows 资源管理器中打开：${target}` }],
      structuredContent: { ok: true, path: target },
    };
  }

  if (name === "open_file") {
    const target = normalizeWinPath(args.path);
    if (!fs.existsSync(target)) {
      logDebug(`open_file missing: ${target}`);
      return {
        isError: true,
        content: [{ type: "text", text: `文件不存在：${target}` }],
      };
    }
    await launchDefaultApp(target);
    return {
      content: [{ type: "text", text: `已调用系统默认程序打开：${target}` }],
      structuredContent: { ok: true, path: target },
    };
  }

  throw new Error(`Unknown tool: ${name}`);
});

logDebug("win-explorer MCP server starting...");
const transport = new StdioServerTransport();
await server.connect(transport);
