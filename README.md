# Win Explorer (Antigravity MCP App Plugin)

专为 **Windows 版 Google Antigravity** 打造的交互式文件卡片插件（MCP App）。

当 AI 助手为你生成、修改或整理本地文件（如 Word `.docx`、Excel `.xlsx`、PDF、图片或脚本）时，它会在对话中直接渲染一张简洁的文件卡片，让你无需翻找路径或绕道侧边栏，一键直达 Windows 原生体验：

- **一键定位**：点击 **`定位`** 或**双击文件行**，直接弹出 Windows 资源管理器并自动高亮选中目标文件（完整支持中文路径与空格）。
- **默认程序直开**：点击 **`打开`**，直接调用本机 Microsoft Word、Excel、PDF 阅读器等系统默认程序打开文件。
- **打开所在目录**：点击卡片右上角 **`打开所在目录`**，直接打开文件所在的 Windows 文件夹。
- **一键复制路径**：点击 **`复制`**，快速复制完整 Windows 路径。
- **自动主题适配**：完整接入 `@modelcontextprotocol/ext-apps` 协议，自动同步 Antigravity 浅色与深色主题。

## 安装方式（Windows）

需要本机已安装 **Node.js**（推荐 v18+）。

1. 将本仓库下载或克隆到 Antigravity 插件目录：

   ```powershell
   # 默认插件目录
   C:\Users\<你的用户名>\.gemini\config\plugins\win-explorer
   ```

2. 进入插件目录并安装依赖（`app.html` 已预打包好，直接安装运行依赖即可）：

   ```powershell
   cd C:\Users\<你的用户名>\.gemini\config\plugins\win-explorer
   npm install
   ```

3. 如需修改前端卡片源码（`src/app.js`），可运行以下命令重新打包单文件 `app.html`：

   ```powershell
   node scripts/build-html.mjs
   ```

4. 在 Antigravity 的插件管理页启用 **Win Explorer**（或重启 Antigravity），之后交付本地文件时会自动以卡片形式展示。

## 目录结构

```text
win-explorer/
├── plugin.json             # Antigravity 插件清单
├── mcp_config.json         # MCP Server 启动配置
├── index.mjs               # 本地 MCP Server（提供 show_files / reveal_in_explorer / open_file）
├── app.html                # 预打包的单文件交互卡片 UI
├── src/app.js              # 卡片前端源码（基于 @modelcontextprotocol/ext-apps）
├── scripts/build-html.mjs  # esbuild 单文件打包脚本
├── rules/win-explorer.md   # 自动触发卡片交付的插件规则
└── package.json
```

## License

MIT
