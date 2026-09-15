# 迁移指南

本文档记录 `create-art-app-pino` 各版本间的变更，帮助已创建的项目手动升级。

> **如何使用**：查看你项目 `package.json` 中的 `"create-art-app-pino".version`，找到从该版本到目标版本之间的所有段落，按顺序执行。

---

## 1.0.0（初始版本）

基线版本，无需迁移。

---

## 1.0.2 → 1.1.0

### 变更概述

- 工具链对齐 `knowledge-production-platform` 水位：vite 7、@antfu/eslint-config 6、vue-tsc 3、vitest 4，tsconfig 改 extends `@vue/tsconfig` / `@tsconfig/node22`
- 目录约定统一：`src/views` 改为 `src/pages`，`@views` 别名指向 `src/pages`
- 智慧树认证模块整体重写（store 目录化、CAS 登录状态机、换票失败熔断、jt-cas 裸 token 协议）
- 登出链路修复：`user` store 委托 auth store 退出，不再跳转不存在的 `Login` 路由
- eslint 新增单文件 650 行熔断；模板内置 vitest 起步设施
- 移除 `feature-echarts` 门控（ECharts 已内置 base）与失效的 `deepMerge`/二次 EJS 渲染等死代码

### 必须操作

1. 若项目使用智慧树认证（`--auth zhihuishu`），需按新协议改造请求层与登录态：
   - 请求头改为裸 token：`config.headers.Authorization = token`（旧代码为 `Bearer ${token}`）
   - 登录接口仍为 `POST /auth/login`，但换票改为读取 `jt-cas` Cookie（旧为 `CASLOGC`）
   - 建议直接以新版模板 `template/auth-zhihuishu/` 覆盖以下文件：`src/utils/auth.ts`、`src/utils/http/index.ts`、`src/services/authService.ts`、`src/store/modules/auth/`（目录）、`src/store/modules/user.ts`、`src/components/core/layouts/art-header-bar/widget/ArtUserMenu.vue`、`src/constants/auth.ts`、`src/types/auth.ts`
2. 若项目依赖 401 响应自动登出：新实现会保留当前路径作为回跳地址，并识别业务码 `401` / `4010001`
3. `.env.development` 增补 `VITE_DEV_SYSTEM_ROLE`（可选，用于开发态角色派生）

### 可选操作

1. 目录迁移到 `src/pages`：整体移动 `src/views` → `src/pages`，同步更新 `tsconfig.app.json` 的 `@views` 路径、`vite.config.ts` 别名、组件内 `@/views/...` 引用与动态 `import.meta.glob` 路径
2. 工具链升级：按新版 `template/base/package.json.ejs` 对齐依赖版本，`tsconfig.*` 改 extends 形式，`vite.config.ts` 增加 `manualChunks` 分包与 `dts: isServe`
3. 引入测试设施：新增 `vitest.config.ts`、`test:unit` 脚本与 `vitest` / `jsdom` / `@vue/test-utils` 依赖
4. 引入 eslint 650 行熔断规则，超长文件参考新版模板拆分方式（如 `hooks/core/useTable.ts` 拆出 `useTableConfig.ts`）

### 2026-09-15 审查修复（未发布）

本节对应当前源码修复，尚未发布新版本；已有项目不会自动获得模板变更。

- 智慧树请求层同时检查 HTTP 401 和 HTTP 200 响应中的业务码 `401` / `4010001`，触发登录失效处理并拒绝请求。业务失效错误保留 Axios 响应信息，错误码为 `ERR_AUTH_EXPIRED`。
- CAS 换票成功前不把 CAS token 写入业务 token；换票失败时清理业务 token、用户快照及认证缓存，包括重试耗尽进入 403 的分支。CAS Cookie 保留原有重试策略。
- 自动登录 Promise 在赋值并等待完成后释放，修复开发态同步返回造成的旧成功结果复用；并发登录仍共享进行中的换票。
- CLI 工程开关按布尔值解析，`--git demo --default`、`--hooks demo --default` 不再吞掉项目名；未指定的开关继续服从交互选择及默认值，`--no-*` 仍可显式关闭。

已有智慧树项目应合并新版 `template/auth-zhihuishu/src/utils/http/index.ts` 与 `template/auth-zhihuishu/src/store/modules/auth/index.ts` 的上述修改，保留项目自身接口和业务定制。CLI 参数修复仅影响后续生成，无需调整已有项目目录。

验证记录：

- `pnpm exec tsc --noEmit`：CLI 类型检查通过。
- `pnpm test:auth`：使用真实认证模板源码及隔离依赖，验证开发态失效、并发换票、换票成功/失败、HTTP 与业务失效码；不调用真实接口。
- `pnpm test:smoke`：构建 CLI 并验证五组生成组合，覆盖两类认证、关闭工程开关，以及 `--hooks` / `--git` 位于项目名前的场景。
- 未安装生成项目依赖，未运行其完整 lint/type-check 或浏览器 CAS 联调；隔离回归不能替代真实后端协议验收。

---

<!-- 新版本迁移段落模板：

## X.Y.Z-1 → X.Y.Z

### 变更概述

- 概述 1
- 概述 2

### 必须操作

1. 操作步骤 1（含代码片段或 diff）
2. 操作步骤 2

### 可选操作

1. 如果使用了 xxx 功能：操作步骤

-->
