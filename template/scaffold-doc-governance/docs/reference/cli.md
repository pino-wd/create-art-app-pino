---
title: CLI 命令参考
type: reference
status: active
owner: "@team"
lastReviewed: 2026-01-01
---

# CLI 命令参考

## 开发

| 命令 | 说明 |
| --- | --- |
| `pnpm dev` | 启动 Vite 开发服务器 |
| `pnpm build` | 生产构建 |
| `pnpm preview` | 预览构建产物 |

## 代码质量

| 命令 | 说明 |
| --- | --- |
| `pnpm lint` | ESLint 检查 |
| `pnpm lint:fix` | ESLint 自动修复 |
| `pnpm type-check` | TypeScript 类型检查 |

## 文档治理

| 命令 | 说明 |
| --- | --- |
| `pnpm docs:lint` | 运行全部 4 道文档护栏 |

`docs:lint` 依次执行：

1. **lint-frontmatter** — 校验 frontmatter 必填字段与枚举值
2. **lint-naming** — 校验文件名 kebab-case、日期前缀、ADR 编号前缀
3. **lint-no-private-path** — 检测私人绝对路径（`/Users/`、`/home/`）
4. **lint-links** — 检测死链（需安装 [lychee](https://github.com/lycheeverse/lychee)，未安装则跳过）

## Git Hooks

| Hook | 执行内容 |
| --- | --- |
| `pre-commit` | `lint-staged`（ESLint + frontmatter + naming）+ 私人路径检测 |
| `commit-msg` | `commitlint`（Conventional Commits） |
| `pre-push` | `lint` + `type-check` + `docs:lint` |
