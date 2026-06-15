---
title: 文档索引
type: reference
status: active
owner: "@team"
lastReviewed: 2026-01-01
---

# 文档索引

本目录是项目文档的唯一入口。所有文档按 [Diátaxis](https://diataxis.fr/) 信息架构组织。

## 目录

| 类型 | 路径 | 说明 |
| --- | --- | --- |
| 快速开始 | `getting-started/` | 新人接入、本地启动 |
| 操作指南 | `guides/` | 新增页面、路由、权限、组件等操作方法 |
| 参考文档 | `reference/` | 配置项、目录结构、CLI、权限、路由等 |
| 架构文档 | `architecture/` | 模块边界、运行流程、核心设计 |
| 需求记录 | `changes/requirements/` | 重要需求详情 |
| 排障手册 | `maintenance/troubleshooting.md` | 高频问题与解决方案 |
| 异常记录 | `maintenance/incidents/` | 线上故障复盘 |
| 决策记录 | `adr/` | 技术选型与架构决策 |
| 文档模板 | `templates/` | 各类文档的标准模板 |
| 归档 | `archive/` | 已废弃或已被取代的历史文档 |

## 文档治理

本项目遵循 [ADR-0001 文档治理方案](adr/0001-doc-governance.md)。所有文档必须：

1. 包含合规的 YAML frontmatter（title / type / status / owner / lastReviewed）
2. 使用 kebab-case 命名
3. 禁止私人绝对路径
4. 通过 `pnpm docs:lint` 检查
