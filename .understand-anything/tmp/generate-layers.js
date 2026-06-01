#!/usr/bin/env node
const fs = require('fs');
const input = JSON.parse(fs.readFileSync('/root/mind-land/.understand-anything/tmp/ua-arch-input.json', 'utf8'));
const results = JSON.parse(fs.readFileSync('/root/mind-land/.understand-anything/tmp/ua-arch-results.json', 'utf8'));

const allIds = new Set(input.fileNodes.map(n => n.id));
console.log('Total file nodes:', allIds.size);

const groupToIds = results.directoryGroups;

function findNode(id) {
  return input.fileNodes.find(n => n.id === id);
}

// ---- Layer 1: UI Layer (前端 UI 层) ----
const uiIds = [
  "file:mind-land-web/src/components/ToastProvider.tsx",
  "file:mind-land-web/src/pages/Container/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/ImageUploadDialog.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/CardList/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/PathBar/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/RightSider/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/SearchBar/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/SlipEditor/TagHighlight.ts",
  "file:mind-land-web/src/pages/SlipBox/components/SlipEditor/TiptapEditor.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/SlipEditor/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/components/SortMenu/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/hooks/usePathItems.ts",
  "file:mind-land-web/src/pages/SlipBox/index.tsx",
  "file:mind-land-web/src/pages/SlipBox/functions/showDeleteConfirm.tsx",
  "file:mind-land-web/src/pages/ToDo/components/List/index.tsx",
  "file:mind-land-web/src/pages/ToDo/components/ToDoItem/index.tsx",
  "file:mind-land-web/src/pages/ToDo/index.tsx",
  "file:mind-land-web/src/pages/Settings/components/CustomSelect.tsx",
  "file:mind-land-web/src/pages/Settings/components/Preferences.tsx",
  "file:mind-land-web/src/pages/Settings/index.tsx",
  "file:mind-land-web/src/pages/AI/index.tsx",
  "file:mind-land-web/src/pages/Diary/index.tsx",
  "file:mind-land-web/src/pages/Draft/index.tsx",
  "file:mind-land-web/src/pages/Home/index.tsx",
  "file:mind-land-web/src/pages/MarkList/index.tsx",
  "file:mind-land-web/src/pages/MindMap/index.tsx",
  "file:mind-land-web/src/pages/Note/index.tsx",
  "file:mind-land-web/src/App.tsx",
  "file:mind-land-web/src/index.tsx",
  "file:mind-land-web/src/router/index.tsx",
  "file:mind-land-web/src/components/ui/alert-dialog.tsx",
  "file:mind-land-web/src/components/ui/button.tsx",
  "file:mind-land-web/src/components/ui/card.tsx",
  "file:mind-land-web/src/components/ui/input.tsx",
  "file:mind-land-web/src/index.css",
  "file:mind-land-web/src/App.css",
  "file:mind-land-web/index.html",
  "file:mind-land-web/public/index.html",
];

// ---- Layer 2: State Layer (状态管理层) ----
const stateIds = [
  "file:mind-land-web/src/store/hooks.ts",
  "file:mind-land-web/src/store/modules/toDoStore.ts",
  "file:mind-land-web/src/store/modules/slipBoxStore.ts",
  "file:mind-land-web/src/store/index.ts",
  "file:mind-land-web/src/store/modules/themeStore.ts",
];

// ---- Layer 3: API Layer (API 层) ----
const apiIds = [
  "file:mind-land-web/src/apis/layout.ts",
  "file:mind-land-web/src/apis/toDo.ts",
  "file:mind-land-web/src/apis/upload.ts",
  "file:mind-land-web/src/apis/slipBox.ts",
  "file:mind-land-server/todo/handler.go",
  "file:mind-land-server/upload/handler.go",
  "file:mind-land-server/slipbox/handler.go",
  "file:mind-land-server/main.go",
];

// ---- Layer 4: Service Layer (后端服务层) ----
const serviceIds = [
  "file:mind-land-server/todo/service.go",
  "file:mind-land-server/slipbox/service.go",
];

// ---- Layer 5: Data Layer (数据层) ----
const dataIds = [
  "file:mind-land-web/src/apis/interfaces/Response.ts",
  "file:mind-land-web/src/pages/ToDo/interfaces.ts",
  "file:mind-land-web/src/pages/SlipBox/interfaces.ts",
  "file:mind-land-web/server/data.json",
  "file:mind-land-server/todo/model.go",
  "file:mind-land-server/slipbox/model.go",
];

// ---- Layer 6: Utility Layer (工具层) ----
const utilityIds = [
  "file:mind-land-web/src/utils/request.ts",
  "file:mind-land-web/src/lib/utils.ts",
  "file:mind-land-web/src/lib/confirm.tsx",
  "file:mind-land-server/common/response.go",
  "concept:vite-config-proxy",
  "concept:vite-config-alias",
];

// ---- Layer 7: Config Layer (配置层) ----
const configIds = [
  "file:mind-land-web/package.json",
  "file:mind-land-web/tsconfig.app.json",
  "file:mind-land-web/tsconfig.json",
  "file:mind-land-web/tsconfig.node.json",
  "file:mind-land-web/tsconfig.node.tsbuildinfo",
  "file:mind-land-web/tsconfig.tsbuildinfo",
  "file:mind-land-web/vite.config.ts",
  "file:mind-land-web/public/manifest.json",
  "file:mind-land-web/public/robots.txt",
  "file:mind-land-web/src/vite-env.d.ts",
  "file:mind-land-web/.claude/sessions/.last_inbox_check",
  "file:mind-land-web/.claude/state/breezing-timeline.jsonl",
  "file:mind-land-web/.claude/state/changed-files.jsonl",
  "file:mind-land-server/go.mod",
  "file:mind-land-server/go.sum",
  "file:mind-land-server/package.json",
  "file:mind-land-server/.claude/sessions/.last_inbox_check",
  "file:mind-land-server/.claude/state/breezing-timeline.jsonl",
  "file:mind-land-server/.claude/state/changed-files.jsonl",
  "file:mind-land-server/.claude/state/test-recommendation.json",
  "file:mind-land-server/mind-land-server",
  "file:mind-land-server/server",
  "file:mind-land-server/server-new",
  "file:mind-land-server/server-test",
  "file:.mcp.json",
  "file:package.json",
  "file:.claude/sessions/.last_inbox_check",
  "file:.claude/settings.local.json",
  "file:.understand-anything/.understandignore",
  "file:.understand-anything/config.json",
];

// ---- Layer 8: Infrastructure Layer (项目基础设施层) ----
const infraIds = [
  "file:CLAUDE.md",
  "file:Plans.md",
  "file:QA_REPORT.md",
  "file:README.md",
  "file:.claude/memory/session-log.md",
  "file:mind-land-server/README.md",
  "file:plans/fix-batch-b.md",
  "file:qa-playwright.mjs",
  "file:qa-screenshots/17-before-snapshot.yml",
];

// Collect all .playwright-mcp files from groups
const playwrightIdsSet = new Set();
for (const [group, ids] of Object.entries(groupToIds)) {
  if (group === '__root__' || group === '.playwright-mcp') {
    for (const id of ids) {
      const node = findNode(id);
      const p = (node ? (node.filePath || node.name || '') : id);
      if (p.includes('.playwright-mcp') || id.includes('.playwright-mcp')) {
        playwrightIdsSet.add(id);
      }
    }
  }
}
infraIds.push(...Array.from(playwrightIdsSet));

// ---- Verify ----
const allAssigned = new Set([
  ...uiIds, ...stateIds, ...apiIds, ...serviceIds,
  ...dataIds, ...utilityIds, ...configIds, ...infraIds
]);

const missing = [...allIds].filter(id => !allAssigned.has(id));
const extra = [...allAssigned].filter(id => !allIds.has(id));

console.log(`Assigned: ${allAssigned.size}, Expected: ${allIds.size}`);
console.log(`Missing: ${missing.length}`);
if (missing.length > 0) {
  console.log('MISSING:', missing);
}
if (extra.length > 0) {
  console.log('EXTRA:', extra);
}

// Build layers
const layersOutput = [
  {
    id: "layer:ui",
    name: "前端 UI 层",
    description: "React 页面组件、布局容器、UI 基础组件、路由配置和全局样式，构成整个前端用户界面",
    nodeIds: uiIds.sort()
  },
  {
    id: "layer:state",
    name: "状态管理层",
    description: "Redux Toolkit 和 Zustand 状态管理，管理 SlipBox 卡片、ToDo 事项和主题偏好的全局状态",
    nodeIds: stateIds.sort()
  },
  {
    id: "layer:api",
    name: "API 层",
    description: "前端 Axios HTTP 客户端和后端 Gin HTTP 处理器，处理前后端之间的请求响应和数据交换",
    nodeIds: apiIds.sort()
  },
  {
    id: "layer:service",
    name: "后端服务层",
    description: "Go 业务逻辑层，封装 SlipBox 卡片标签管理和 ToDo 清单事项的核心 CRUD 操作",
    nodeIds: serviceIds.sort()
  },
  {
    id: "layer:data",
    name: "数据层",
    description: "Go GORM 数据模型和 TypeScript 类型定义，描述 Card、Tag、ToDo 等核心数据结构和 API 响应格式",
    nodeIds: dataIds.sort()
  },
  {
    id: "layer:utility",
    name: "工具层",
    description: "跨模块共享的工具函数、HTTP 客户端实例、UI 确认对话框和统一响应格式",
    nodeIds: utilityIds.sort()
  },
  {
    id: "layer:config",
    name: "配置层",
    description: "项目构建配置、TypeScript 编译选项、依赖管理文件、工具链配置和构建产物",
    nodeIds: configIds.sort()
  },
  {
    id: "layer:infrastructure",
    name: "项目基础设施层",
    description: "项目文档、Playwright 端到端测试脚本和页面快照、质量报告和修复计划",
    nodeIds: infraIds.sort()
  }
];

const totalAssigned = layersOutput.reduce((s, l) => s + l.nodeIds.length, 0);
console.log(`Total across all layers: ${totalAssigned}`);
console.log(`Layer counts: ${layersOutput.map(l => `${l.id}: ${l.nodeIds.length}`).join(', ')}`);

if (totalAssigned === allIds.size && missing.length === 0 && extra.length === 0) {
  fs.writeFileSync('/root/mind-land/.understand-anything/intermediate/layers.json', JSON.stringify(layersOutput, null, 2));
  console.log('SUCCESS: layers.json written');
} else {
  console.error('ERROR: Verification failed!');
  process.exit(1);
}
