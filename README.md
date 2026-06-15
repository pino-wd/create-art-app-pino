# create-art-app-pino

基于 [Art Design Pro](https://github.com/Daymychen/art-design-pro) 的 Vue 3 项目脚手架 CLI。

一条命令生成包含认证、路由、工程化、文档治理的完整前端项目，生成后独立演进，CLI 不再介入。

## 快速开始

```bash
# 推荐：交互式创建
pnpm create art-app-pino my-project

# 或使用 npx
npx create-art-app-pino my-project

# 全默认（跳过所有问答）
pnpm create art-app-pino my-project --default
```

## CLI 参数

| 参数 | 说明 | 默认值 |
| --- | --- | --- |
| `--default` | 跳过所有交互，使用默认值 | — |
| `--auth art` | Art 内置登录页 | `art` |
| `--auth zhs` | 智慧树 CAS 统一认证 | — |
| `--history` | History 路由模式 | ✅ |
| `--hash` | Hash 路由模式 | — |
| `--no-reference` | 不克隆 `.reference/art-design-pro` | — |
| `--no-vscode` | 不生成 `.vscode/` 配置 | — |
| `--no-agents` | 不生成 `AGENTS.md` | — |
| `--no-doc-governance` | 不启用文档治理 | — |

### 示例

```bash
# 智慧树认证 + Hash 路由 + 不克隆 reference
pnpm create art-app-pino my-app --auth zhs --hash --no-reference

# 最小化项目
pnpm create art-app-pino my-app --default --no-reference --no-vscode --no-doc-governance
```

## 生成项目的技术栈

- **框架**：Vue 3 + TypeScript + Vite
- **UI**：Element Plus + Tailwind CSS v4
- **状态管理**：Pinia + pinia-plugin-persistedstate
- **工程化**：ESLint + Husky + lint-staged + commitlint
- **文档治理**（可选）：frontmatter 校验 + 命名规范 + 私人路径检测 + 死链检测

## 交互式选项

### 认证方式

| 选项 | 说明 |
| --- | --- |
| **Art 内置登录** | 用户名/密码登录页 + 前端 token 管理 |
| **智慧树 CAS** | 企业 CAS 统一认证 + 开发态 env token 模式 |

### 功能模块

| 模块 | 包 | 默认 |
| --- | --- | --- |
| Markdown 渲染 | `md-editor-v3` | ✅ |
| SSE 流式请求 | `@microsoft/fetch-event-source` | ✅ |
| ECharts 图表 | `echarts` + `vue-echarts` | ✅ |
| 拖拽 | `vue-draggable-plus` | ✅ |
| 日期工具 | `dayjs` | ✅ |

### 工程化配置

| 配置 | 说明 | 默认 |
| --- | --- | --- |
| `.reference` | 克隆 art-design-pro 作为参考代码 | ✅ |
| `.vscode` | 统一编辑器配置 | ✅ |
| `AGENTS.md` | AI 开发约束文件 | ✅ |
| 文档治理 | `docs/` 骨架 + 4 道护栏 + PR 模板 | ✅ |

## 版本标记与升级迁移

### 版本标记

每个生成的项目在 `package.json` 中自动记录创建时使用的 CLI 版本：

```json
{
  "create-art-app-pino": {
    "version": "1.0.0"
  }
}
```

### 迁移机制

**生成后的项目与 CLI 解耦**——CLI 只负责初始创建，不提供 `upgrade` 命令。当脚手架升级时，通过 [MIGRATION.md](./MIGRATION.md) 指导已有项目手动跟进。

#### 对于 CLI 维护者

每次发版时在 `MIGRATION.md` 中新增版本段落，包含：

1. **变更概述** — 本次改了什么
2. **必须操作** — 已有项目必须执行的步骤
3. **可选操作** — 按需执行的步骤

#### 对于已有项目的开发者

1. 查看项目 `package.json` 中的 `create-art-app-pino.version`
2. 打开 CLI 仓库的 [MIGRATION.md](./MIGRATION.md)
3. 找到从当前版本到最新版本之间的所有段落
4. 按顺序执行迁移步骤

## 开发

```bash
pnpm install     # 安装依赖
pnpm dev         # 开发模式（watch）
pnpm build       # 构建

# 本地测试
mkdir -p _test-output && cd _test-output
node ../dist/index.cjs my-test --default --no-reference
```

## 发布

### 前置：npm registry 配置

国内开发者通常用 CNPM 镜像加速安装，但 **登录和发布必须走官方 registry**。

```bash
# 查看当前 registry（如果是 npmmirror 则需要额外配置）
npm config get registry
```

**方式 A：命令行指定（推荐，不改全局配置）**

```bash
npm login --registry=https://registry.npmjs.org
```

**方式 B：在 package.json 中锁定发布地址（一劳永逸）**

项目已配置 `publishConfig`，`pnpm publish` 会自动走官方 registry：

```json
{
  "publishConfig": {
    "registry": "https://registry.npmjs.org"
  }
}
```

> 日常 `pnpm install` 仍走 CNPM 镜像，两不耽误。

### 首次发布

```bash
# 1. 登录 npm（首次需要，会打开浏览器验证）
npm login --registry=https://registry.npmjs.org

# 2. 确认登录成功
npm whoami --registry=https://registry.npmjs.org
```

### 日常发版

```bash
# 1. 更新版本号（自动同步到生成项目的版本标记）
npm version patch  # 或 minor / major

# 2. 更新 MIGRATION.md（如有变更需要已有项目跟进）

# 3. 发布到 npm（prepublishOnly 自动构建）
pnpm publish

# 4. 推送 tag
git push --follow-tags
```

发布后用户即可通过 `pnpm create art-app-pino` 使用最新版本。
## 项目结构

```
create-art-app-pino/
├── src/                         # CLI 源码
│   ├── index.ts                 # 入口
│   ├── prompts.ts               # 交互式问答 + 选项定义
│   ├── generator.ts             # 生成编排（模板叠加 + EJS）
│   ├── postActions.ts           # 后置操作（git init + .reference）
│   ├── featureDeps.ts           # 功能模块依赖声明
│   └── utils/
│       ├── renderTemplate.ts    # 模板渲染引擎
│       ├── deepMerge.ts         # package.json 深度合并
│       └── banner.ts            # CLI 横幅
├── template/                    # 模板层
│   ├── base/                    # 基础模板（所有项目共享）
│   ├── auth-art/                # Art 内置登录叠加层
│   ├── auth-zhihuishu/          # 智慧树 CAS 叠加层
│   ├── scaffold-doc-governance/ # 文档治理叠加层
│   ├── feature-markdown/        # Markdown 功能模板
│   ├── feature-sse/             # SSE 功能模板
│   └── feature-echarts/         # ECharts 功能模板
├── package.json
├── tsconfig.json
├── tsup.config.ts
├── MIGRATION.md                 # 版本迁移指南
└── README.md
```

## License

MIT
