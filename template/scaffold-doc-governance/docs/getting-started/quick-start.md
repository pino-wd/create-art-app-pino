---
title: 快速开始
type: tutorial
status: active
owner: "@team"
lastReviewed: 2026-01-01
---

# 快速开始

## 环境要求

- Node.js >= 18
- pnpm

## 本地启动

```bash
# 安装依赖
pnpm install

# 启动开发服务器
pnpm dev
```

## 常用命令

```bash
# 构建
pnpm build

# 代码检查
pnpm lint

# 类型检查
pnpm type-check

# 文档检查
pnpm docs:lint
```

## 项目结构

```
_test-final-art/
├── src/                  # 源代码
│   ├── api/              # API 接口
│   ├── assets/           # 静态资源
│   ├── components/       # 公共组件
│   ├── router/           # 路由配置
│   ├── store/            # 状态管理
│   ├── utils/            # 工具函数
│   └── views/            # 页面组件
├── docs/                 # 项目文档
├── scripts/              # 脚本工具
└── public/               # 公共资源
```

## 下一步

- 阅读 [CLI 命令参考](../reference/cli.md)
- 查看 [文档治理规范](../adr/0001-doc-governance.md)
