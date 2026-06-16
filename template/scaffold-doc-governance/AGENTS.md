# AGENTS.md

## 项目硬约束

- 包管理器：`pnpm`，不得混用。
- UI 范式：Vue 3 + TypeScript + Vite + Element Plus + Tailwind CSS v4。
- 修改前先做最小必要只读分析，不扩大改动范围，不顺手重构无关模块。

## Skill 路由规则

<!-- TODO: 根据项目实际情况配置 skill 路由 -->

## 文档治理

本项目执行文档治理规范，详见 [`docs/README.md`](docs/README.md) 和 [`docs/adr/0001-doc-governance.md`](docs/adr/0001-doc-governance.md)。

核心规则：

- 所有 `docs/` 下文档必须包含合规 frontmatter。
- 文件名一律 kebab-case。
- 禁止私人绝对路径。
- 变更文档时同步更新 CHANGELOG.md。

## 提交前必跑命令

详见 [`docs/reference/cli.md`](docs/reference/cli.md)。

```bash
pnpm lint
pnpm type-check
pnpm docs:lint
```
