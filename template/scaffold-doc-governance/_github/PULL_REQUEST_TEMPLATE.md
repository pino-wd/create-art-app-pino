## PR 检查清单

### 默认检查（每个 PR 必答）

- [ ] 是否更新 CHANGELOG.md？
- [ ] 是否影响使用方（API / 路由 / 权限 / 配置 / 环境变量 / CLI）？
- [ ] 是否需要 ADR？
- [ ] 改动了 docs/ 引用的代码路径吗？

### 触发检查（命中关键路径时填写）

<details>
<summary>展开触发项</summary>

- [ ] `src/router/**` 变更 → 更新 `docs/reference/routing.md`
- [ ] `src/services/**` 或 API 契约变更 → 更新 `docs/reference/api/*` + ADR
- [ ] 权限相关变更 → 更新 `docs/reference/permissions.md` + `docs/guides/add-permission.md`
- [ ] `vite.config.ts` / `.env*` 变更 → 更新 `docs/reference/config.md` / `env-vars.md`
- [ ] 引入/移除依赖 → ADR + CHANGELOG
- [ ] 故障修复 → `docs/maintenance/incidents/` + `docs/maintenance/troubleshooting.md`

</details>

---

### 变更说明

<!-- 简要描述本 PR 的目的和改动内容 -->
