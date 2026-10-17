# Just Todo 待办事项

Just Todo 是一个轻量级、现代化的 uTools 待办事项插件。它提供了简洁的界面和丰富的功能，帮助你高效管理日常任务和工作计划。

## ✨ 主要功能

- **任务管理**：快速创建、编辑、删除和完成任务。
- **分类清单**：支持自定义清单分类（如工作、生活、学习等），并提供"我的一天"、"计划内"等智能视图。
- **任务详情**：支持为任务添加截止日期、优先级（高/中/低）和备注信息。
- **重复任务**：支持设置每天、每周、每月、每年等重复规则，自动生成后续任务。
- **视图切换**：
  - **列表视图**：经典的清单展示，支持拖拽排序。
  - **日历视图**：直观查看每月的任务分布情况。
- **排序与筛选**：支持按创建时间、截止时间、优先级等多种方式排序。
- **数据导出**：支持将待办事项导出为 Markdown 格式。
- **现代化 UI**：清爽的卡片式设计，支持暗色模式（跟随 uTools 主题）。
- **快捷操作**：支持右键菜单进行快速操作（删除、移动、复制内容等）。

## 🛠️ 技术栈

- **前端框架**：[Vue 3](https://vuejs.org/)
- **构建工具**：[Vite](https://vitejs.dev/)
- **样式预处理**：Less
- **图标库**：[Remix Icon](https://remixicon.com/)
- **时间处理**：[Day.js](https://day.js.org/)
- **拖拽库**：[Vue.Draggable](https://github.com/SortableJS/vue.draggable.next)

## 💻 开发指南

### 环境要求

- Node.js (推荐 v16+)
- npm 或 yarn

### 安装依赖

```bash
npm install
```

### 开发模式

启动本地开发服务器：

```bash
npm run dev
```

在 uTools 开发者工具中，将插件入口配置为 `http://localhost:5174` (或其他 Vite 分配的端口) 即可实时预览。

### 构建发布

构建生产环境代码：

```bash
npm run build
```

构建完成后，会在 `dist` 目录下生成插件文件。将 `dist` 目录下的内容（包含 `plugin.json`）打包成 `.upx` 文件即可发布。

> 注意：`plugin.json` 和 `preload/services.js` 等 uTools 配置文件放置在 `public/` 目录下，Vite 构建时会自动复制到 `dist` 目录。

## 📝 目录结构

```
Just Todo待办/
├── public/              # 静态资源 (logo, preload, plugin.json)
├── src/
│   ├── components/      # Vue 组件 (TodoList, CalendarView, etc.)
│   ├── utils/           # 工具函数 (db.js 等)
│   ├── App.vue          # 主应用组件
│   ├── main.js          # 入口文件
│   └── main.css         # 全局样式
├── index.html           # HTML 模板
├── vite.config.js       # Vite 配置
└── package.json         # 项目依赖配置
```

## 🤝 贡献

欢迎提交 Issue 或 Pull Request 来改进这个项目。

## 📄 许可证

MIT License
