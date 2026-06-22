import prompts from 'prompts'
import type { Feature } from './featureDeps'

type AuthMode = 'art' | 'zhihuishu'
type PackageManager = 'pnpm' | 'npm'

export interface ProjectOptions {
  projectName: string
  auth: AuthMode
  routerMode: 'history' | 'hash'
  features: Feature[]
  scaffold: {
    reference: boolean
    vscode: boolean
    agentsMd: boolean
    gitInit: boolean
    commitChecks: boolean
    docGovernance: boolean
  }
  packageManager: PackageManager
}

export async function getProjectOptions(argv: Record<string, any>): Promise<ProjectOptions | null> {
  // CLI flag quick mode
  const defaultMode = argv.default === true
  const argProjectName = argv._[0] as string | undefined
  const argPackageManager = argv['package-manager'] as string | undefined

  let result: prompts.Answers<string>

  validateCliArgs(argv, argProjectName)

  try {
    result = await prompts(
      [
        {
          type: argProjectName ? null : 'text',
          name: 'projectName',
          message: '项目名称:',
          initial: 'my-project',
          validate: validateProjectName,
        },
        {
          type: defaultMode || argv.auth ? null : 'select',
          name: 'auth',
          message: '认证方式:',
          choices: [
            { title: 'Art 内置登录页（用户名/密码 + 前端 token 管理）', value: 'art' },
            { title: '智慧树 CAS 登录（企业统一认证 + 开发态 env token）', value: 'zhihuishu' },
          ],
          initial: 0,
        },
        {
          type: defaultMode || argv.history || argv.hash ? null : 'select',
          name: 'routerMode',
          message: '路由模式:',
          choices: [
            { title: 'History（推荐，需服务端配合）', value: 'history' },
            { title: 'Hash', value: 'hash' },
          ],
          initial: 0,
        },
        {
          type: defaultMode ? null : 'multiselect',
          name: 'features',
          message: '启用功能模块（空格切换，回车确认）:',
          choices: [
            { title: 'Markdown 渲染（md-editor-v3）', value: 'markdown', selected: true },
            { title: 'SSE 流式请求（@microsoft/fetch-event-source）', value: 'sse', selected: true },
            { title: 'ECharts 图表', value: 'echarts', selected: true },
            { title: 'vue-draggable-plus 拖拽', value: 'draggable', selected: true },
            { title: 'dayjs 日期工具', value: 'dayjs', selected: true },
          ],
        },
        {
          type: defaultMode ? null : 'multiselect',
          name: 'scaffold',
          message: '工程化配置（空格切换，回车确认）:',
          choices: [
            { title: '.reference 参考项目（克隆 art-design-pro 最新代码）', value: 'reference', selected: true },
            { title: '.vscode 统一编辑器配置', value: 'vscode', selected: true },
            { title: 'AGENTS.md AI 开发约束文件', value: 'agentsMd', selected: true },
            { title: 'Git 仓库初始化', value: 'gitInit', selected: true },
            { title: '提交校验（Husky + lint-staged + commitlint）', value: 'commitChecks', selected: true },
            { title: '文档治理（docs/ + 4 道护栏）', value: 'docGovernance', selected: true },
          ],
        },
        {
          type: defaultMode || argPackageManager ? null : 'select',
          name: 'packageManager',
          message: '包管理器:',
          choices: [
            { title: 'pnpm（推荐）', value: 'pnpm' },
            { title: 'npm', value: 'npm' },
          ],
          initial: 0,
        },
      ],
      {
        onCancel: () => {
          throw new Error('操作已取消')
        },
      },
    )
  } catch {
    return null
  }

  // Resolve values with CLI args and defaults
  const projectName = argProjectName || result.projectName || 'my-project'
  const auth = normalizeAuth(argv.auth || result.auth || 'art')
  const routerMode = argv.hash ? 'hash' : (argv.history ? 'history' : (result.routerMode || 'history'))
  const features = defaultMode
    ? ['markdown', 'sse', 'echarts', 'draggable', 'dayjs']
    : (result.features || ['markdown', 'sse', 'echarts', 'draggable', 'dayjs'])
  const scaffoldChoices: string[] = defaultMode
    ? ['reference', 'vscode', 'agentsMd', 'gitInit', 'commitChecks', 'docGovernance']
    : (result.scaffold || ['reference', 'vscode', 'agentsMd', 'gitInit', 'commitChecks', 'docGovernance'])

  // Handle --no-reference / --no-vscode / --no-agents / --no-git / --no-hooks flags
  // minimist parses --no-xxx as { xxx: false }
  const scaffold = {
    reference: resolveScaffoldOption(argv.reference, scaffoldChoices, 'reference'),
    vscode: resolveScaffoldOption(argv.vscode, scaffoldChoices, 'vscode'),
    agentsMd: resolveScaffoldOption(argv.agents, scaffoldChoices, 'agentsMd'),
    gitInit: resolveScaffoldOption(argv.git, scaffoldChoices, 'gitInit'),
    commitChecks: resolveScaffoldOption(argv.hooks, scaffoldChoices, 'commitChecks'),
    docGovernance: resolveScaffoldOption(argv['doc-governance'], scaffoldChoices, 'docGovernance'),
  }

  const packageManager = normalizePackageManager(argPackageManager || result.packageManager || 'pnpm')

  return {
    projectName,
    auth,
    routerMode,
    features,
    scaffold,
    packageManager,
  } as ProjectOptions
}

function validateCliArgs(argv: Record<string, any>, projectName?: string): void {
  if (projectName) {
    const validationResult = validateProjectName(projectName)
    if (validationResult !== true) {
      throw new Error(validationResult)
    }
  }

  if (argv.history && argv.hash) {
    throw new Error('`--history` 与 `--hash` 不能同时使用')
  }

  if (argv.auth) {
    normalizeAuth(argv.auth)
  }

  if (argv['package-manager']) {
    normalizePackageManager(argv['package-manager'])
  }
}

function validateProjectName(val: string): true | string {
  return /^[a-z0-9-]+$/.test(val) || '项目名只能包含小写字母、数字和连字符'
}

function normalizeAuth(raw: string): AuthMode {
  if (raw === 'art') {
    return 'art'
  }

  if (raw === 'zhs' || raw === 'zhihuishu') {
    return 'zhihuishu'
  }

  throw new Error('`--auth` 仅支持 `art`、`zhs`、`zhihuishu`')
}

function normalizePackageManager(raw: string): PackageManager {
  if (raw === 'pnpm' || raw === 'npm') {
    return raw
  }

  throw new Error('`--package-manager` 仅支持 `pnpm`、`npm`')
}

function resolveScaffoldOption(argvValue: unknown, scaffoldChoices: string[], optionKey: string): boolean {
  if (argvValue === true) {
    return true
  }

  if (argvValue === false) {
    return false
  }

  return scaffoldChoices.includes(optionKey)
}
