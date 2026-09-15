/** 使用真实模板源码和隔离依赖验证认证状态，不请求网络、不写浏览器存储。 */
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'
import ts from 'typescript'

/** 将模板转为内存模块，仅替换外部依赖，保留实际控制流。 */
function loadTemplate(relativePath, dependencies) {
  const source = readFileSync(new URL(`../template/auth-zhihuishu/src/${relativePath}`, import.meta.url), 'utf8')
  const { outputText } = ts.transpileModule(source.replaceAll('import.meta.env.VITE_API_BASE_URL', "''"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  })
  const exports = {}
  vm.runInNewContext(outputText, {
    exports,
    require(name) {
      assert(name in dependencies, `缺少隔离依赖 ${name}`)
      return dependencies[name]
    },
    sessionStorage: { getItem: () => '2', setItem() {}, removeItem() {} },
    URL,
    window: { location: { origin: 'https://example.test' }, setTimeout },
    Date,
  })
  return exports
}

/** 模拟持久化边界，确保失败场景会调用清理而非留下旧快照。 */
function createAuthHarness(devMode, login) {
  let cleared = 0
  const store = loadTemplate('store/modules/auth/index.ts', {
    pinia: { defineStore: (_name, setup) => setup },
    vue: { ref: value => ({ value }) },
    '@/constants/auth': { superAdminRoleCode: 'admin' },
    '@/services/authService': { loginWithCasUser: login },
    '@/utils/auth': {
      clearAuthStorage: () => { cleared += 1 },
      clearCurrentCASParamsFromUrl() {},
      getCurrentRedirectPath: () => '/',
      getJtCasToken: () => 'cas-token',
      hasTicketInUrl: () => false,
      isDevTokenAuthMode: () => devMode,
      loginOutRedirect() {},
      redirectToZhihuishuLogin() {},
      resolveCastgcHeadPic: () => null,
      sanitizeRedirectPath: path => path,
    },
    './devToken': {
      createDevTokenUserInfo: () => ({ userUid: 'dev' }),
      getEnvDevToken: () => 'dev-token',
      normalizeDevToken: token => token,
    },
    './storage': { createAuthStorage: () => ({ restoreFromStorage() {}, saveToStorage() {} }) },
  }).useAuthStore()
  return { store, getCleared: () => cleared }
}

const dev = createAuthHarness(true, () => { throw new Error('开发态不应换票') })
assert.equal(await dev.store.autoLogin(), true)
dev.store.expireSession()
assert.equal(await dev.store.autoLogin(), false, '失效后不能复用已完成的成功 Promise')
assert.equal(dev.store.getToken(), '')

let rejectLogin
let loginCalls = 0
const cas = createAuthHarness(false, () => {
  loginCalls += 1
  return new Promise((_resolve, reject) => { rejectLogin = reject })
})
cas.store.token.value = 'old-business-token'
cas.store.userInfo.value = { userUid: 'old-user' }
const first = cas.store.autoLogin()
const second = cas.store.autoLogin()
await Promise.resolve()
assert.equal(loginCalls, 1, '并发登录应合并换票请求')
assert.equal(cas.store.getToken(), 'old-business-token', '换票完成前不应写入 CAS token')
rejectLogin(new Error('换票失败'))
assert.equal(await first, false)
assert.equal(await second, false)
assert.equal(cas.store.getToken(), '')
assert.equal(cas.store.userInfo.value, null)
assert.equal(cas.getCleared(), 1)
assert.equal(cas.store.authBootstrapState.value.lastErrorCode, 'exchange-failed-exhausted')

const success = createAuthHarness(false, async () => ({ token: 'business-token', userUid: 'new-user' }))
assert.equal(await success.store.autoLogin(), true)
assert.equal(success.store.getToken(), 'business-token')
assert.equal(success.store.userInfo.value.userUid, 'new-user')

let onResponse
let onError
let expired = 0
/** 保留响应信息供调用者诊断，模拟 AxiosError 的构造契约。 */
class MockAxiosError extends Error {
  constructor(message, code, config, request, response) {
    super(message)
    Object.assign(this, { code, config, request, response })
  }
}
loadTemplate('utils/http/index.ts', {
  axios: {
    default: { create: () => ({ interceptors: {
      request: { use() {} },
      response: { use(successHandler, errorHandler) { onResponse = successHandler; onError = errorHandler } },
    } }) },
    AxiosError: MockAxiosError,
  },
  'element-plus': { ElMessage: { error() {} } },
  '@/store/modules/auth': { useAuthStore: () => ({ expireSession: () => { expired += 1 } }) },
  '@/utils/auth': { getCurrentRedirectPath: () => '/dashboard' },
})
for (const code of [401, 4010001]) {
  const response = { status: 200, data: { code }, config: {} }
  await assert.rejects(onResponse(response), error => error.response === response)
}
const unauthorized = { response: { status: 401 } }
await assert.rejects(onError(unauthorized), error => error === unauthorized)
assert.equal(expired, 3)
const normal = { status: 200, data: { code: 200, data: [] } }
assert.equal(onResponse(normal), normal.data)
assert.equal(expired, 3)
console.log('认证回归通过：开发态失效、并发换票、失败清理、成功落盘、HTTP 与业务失效码')
