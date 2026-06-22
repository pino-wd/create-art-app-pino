---
title: 项目文档治理与变更追溯方案
type: adr
status: active
owner: "@team"
lastReviewed: 2026-01-01
relatedRequirements: []
---

# ADR-0001: 项目文档治理与变更追溯方案

## 状态

Accepted

本 ADR 是项目文档治理的根决策，所有后续 ADR、需求记录、异常记录、参考文档、架构文档必须遵循本文。

## 背景

项目需要一套统一的文档治理方案，确保文档的可维护性、可追溯性和一致性。本方案融合 Diátaxis 信息架构 + ADR + ChangeLog + 状态机 + 自动化护栏，同时覆盖「信息架构、决策追溯、对外广播、自动化守护」四个目标。

## 决策

### 1. 核心原则

1. 文档跟随代码，统一存放仓库内。
2. Markdown + Git 追踪历史。
3. 重要变化必须可追溯；小改动豁免。
4. 服务于维护，不追求形式完整。
5. 任何文档必须有明确状态（`draft` / `active` / `superseded` / `archived`）；非 active 文档必须迁出主目录。
6. 文件名一律 kebab-case，禁止把版本号塞进文件名；版本号写进 frontmatter 或正文。
7. 跨文档引用必须使用仓库相对路径，禁止私人绝对路径或外部 IM 缓存路径。

### 2. 目录结构

```txt
project/
  README.md
  CHANGELOG.md
  AGENTS.md

  docs/
    README.md                  # 文档索引（唯一入口）

    getting-started/
      quick-start.md

    guides/                    # 操作指南

    reference/                 # 参考文档
      cli.md

    architecture/              # 架构文档

    changes/
      requirements/            # 需求记录 YYYY-MM-DD-name.md

    maintenance/
      troubleshooting.md       # 排障手册
      incidents/               # 异常记录 YYYY-MM-DD-name.md

    adr/
      0001-doc-governance.md   # 本文件
      NNNN-kebab-name.md

    templates/                 # 文档模板
    archive/                   # superseded/archived 文档迁入

  scripts/docs/                # 自动化护栏脚本
    lint-frontmatter.mjs
    lint-naming.mjs
    lint-links.mjs
    lint-no-private-path.mjs
```

### 3. 文档分类

| 类型     | 存放位置                         | 使用场景                                    |
| -------- | -------------------------------- | ------------------------------------------- |
| 快速开始 | `getting-started/`               | 新人接入、本地启动                          |
| 操作指南 | `guides/`                        | 新增页面、路由、菜单、权限、组件            |
| 参考文档 | `reference/`                     | 配置项、目录结构、CLI、权限、路由、组件 API |
| 架构文档 | `architecture/`                  | 模块边界、运行流程、核心设计                |
| 需求记录 | `changes/requirements/`          | 重要需求、通用能力、复杂改造                |
| 异常记录 | `maintenance/incidents/`         | 线上故障、严重缺陷、重复问题                |
| 排障手册 | `maintenance/troubleshooting.md` | 高频问题、常见错误、处理方式                |
| 决策记录 | `adr/`                           | 技术选型、架构调整、关键方案取舍            |

### 4. 命名与 frontmatter 规范

**命名**：

- 一律 kebab-case，禁止 snake_case、PascalCase 混用。
- 禁止把版本号写进文件名。
- 日期前缀仅用于 `changes/requirements/` 与 `incidents/`：`YYYY-MM-DD-name.md`。
- ADR 用四位编号：`NNNN-name.md`。

**Frontmatter**（强制，由 CI 校验）：

```yaml
---
title: 文档标题
type: tutorial | guide | reference | architecture | adr | requirement | incident | troubleshooting
status: draft | active | superseded | archived
owner: '@username'
lastReviewed: YYYY-MM-DD
supersededBy: docs/path/to/new.md # 仅 superseded 时强制，archived 可选
relatedADR: [ADR-0001]
relatedRequirements: [YYYY-MM-DD-name]
---
```

缺字段 / status 非法 / superseded 但未填 supersededBy → 阻断合并。

补充约束：

- `templates/` 与 `archive/` 不参与 frontmatter 与命名校验。
- 私人绝对路径与死链检查仍覆盖整个 `docs/` 目录。

### 5. 文档状态机

```
draft ──→ active ──┬──→ superseded （被新版本取代，必须填 supersededBy）
                   └──→ archived   （任务关闭/能力下线/PRD 完工）
```

- 状态变更只允许在 PR 中显式声明。
- `status != active` 的文档必须迁入 `docs/archive/` 对应子目录。
- 归档不删除内容，保留历史可查。

### 6. 必须更新文档的场景

下列任一命中即视为「重要」，必须按矩阵更新文档：

- 改动跨 ≥2 个模块。
- 改动 API 契约 / 路由 / 权限 / 配置 / 环境变量 / CLI。
- 引入或移除依赖。
- 影响在线用户、触发回滚、跨多个 PR 才修复（→ incident 必写）。
- 同类问题在过去 90 天内已出现 ≥2 次（→ troubleshooting 必写）。

### 7. 不强制写文档的场景

样式微调、文案、单点 bug、内部小重构、临时实验代码 → PR 说明即可。

### 8. CHANGELOG 规范

`CHANGELOG.md` 使用 6 分区：`Added` / `Changed` / `Fixed` / `Deprecated` / `Removed` / `Breaking Changes`。每行末尾建议带详情链接（requirement 或 ADR）。

### 9. 自动化护栏

必须配 4 道护栏。脚本统一放 `scripts/docs/`，命令出口为 `package.json` 中的 `docs:lint`：

| 护栏                                              | 工具                      | 不通过则 |
| ------------------------------------------------- | ------------------------- | -------- |
| Frontmatter 必填字段 + 枚举值                     | `lint-frontmatter.mjs`    | 阻断合并 |
| 文档命名（kebab-case + 禁版本号 + 日期/编号前缀） | `lint-naming.mjs`         | 阻断提交 |
| 私人绝对路径黑名单                                | `lint-no-private-path.mjs` | 阻断提交 |
| Markdown 死链                                     | `lint-links.mjs`（lychee） | 阻断合并 |

### 10. AGENTS.md 边界

`AGENTS.md` 只写以下 4 类内容，不重复 README / quick-start：

1. 项目硬约束（包管理器、UI 范式、`.reference` 只读、业务边界）。
2. Skill 路由规则。
3. 文档治理硬规则（指向 `docs/README.md`）。
4. 提交前必跑命令（指向 `reference/cli.md`）。

启动命令、构建命令、目录结构、代码规范一律不写在 AGENTS.md，避免与 reference/ 漂移。

### 11. PR 检查规则

**默认 4 项（每个 PR 必答）**：

- 是否更新 CHANGELOG.md？
- 是否影响使用方（API / 路由 / 权限 / 配置 / 环境变量 / CLI）？
- 是否需要 ADR？
- 改动了 docs/ 引用的代码路径吗？

### 12. 季度文档体检

每季度第一周由文档 owner 跑：

1. 运行 `docs:lint` 全量校验。
2. 扫描 `lastReviewed` 距今 > 180 天的文档，逐份判定是否仍 active。
3. 扫描孤儿文档（无任何反向链接 + 无 owner）→ 归档或补反链。

## 影响

- 所有新文档必须带 frontmatter，否则被 CI 拒绝。
- 所有 PR 必须按第 11 节默认 4 项打勾。
- 新增 4 道护栏脚本与 `docs:lint` 命令，对开发者透明运行。

## 备选方案

- **不治理，继续累加**：文档无状态管理，命名混乱，跨文档引用断裂。
- **只补 README，不立规范**：解决入口问题但不解决归档与状态机制。
- **采用 Diátaxis 纯框架，无 ADR / CHANGELOG**：解决信息架构但不解决决策追溯与对外广播。

本方案选择融合 Diátaxis + ADR + ChangeLog + 状态机 + 自动化护栏，因为这是同时覆盖「信息架构、决策追溯、对外广播、自动化守护」四个目标的最小集。
