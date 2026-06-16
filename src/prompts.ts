import prompts from 'prompts'
import type { Feature } from './featureDeps'

export interface ProjectOptions {
  projectName: string
  auth: 'art' | 'zhihuishu'
  routerMode: 'history' | 'hash'
  features: Feature[]
  scaffold: {
    reference: boolean
    vscode: boolean
    agentsMd: boolean
    docGovernance: boolean
  }
  packageManager: 'pnpm' | 'npm'
}

export async function getProjectOptions(argv: Record<string, any>): Promise<ProjectOptions | null> {
  // CLI flag quick mode
  const defaultMode = argv.default === true
  const argProjectName = argv._[0] as string | undefined

  let result: prompts.Answers<string>

  try {
    result = await prompts(
      [
        {
          type: argProjectName ? null : 'text',
          name: 'projectName',
          message: '项目名称:',
          initial: 'my-project',
          validate: (val: string) => /^[a-z0-9-]+$/.test(val) || '项目名只能包含小写字母、数字和连字符',
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
            { title: '文档治理（docs/ + 4 道护栏）', value: 'docGovernance', selected: true },
          ],
        },
        {
          type: defaultMode ? null : 'select',
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
  const auth = argv.auth === 'zhs' ? 'zhihuishu' : (argv.auth || result.auth || 'art')
  const routerMode = argv.hash ? 'hash' : (argv.history ? 'history' : (result.routerMode || 'history'))
  const features = defaultMode
    ? ['markdown', 'sse', 'echarts', 'draggable', 'dayjs']
    : (result.features || ['markdown', 'sse', 'echarts', 'draggable', 'dayjs'])
  const scaffoldChoices: string[] = defaultMode
    ? ['reference', 'vscode', 'agentsMd', 'docGovernance']
    : (result.scaffold || ['reference', 'vscode', 'agentsMd', 'docGovernance'])

  // Handle --no-reference / --no-vscode / --no-agents flags
  // minimist parses --no-xxx as { xxx: false }
  const scaffold = {
    reference: argv.reference === false ? false : scaffoldChoices.includes('reference'),
    vscode: argv.vscode === false ? false : scaffoldChoices.includes('vscode'),
    agentsMd: argv.agents === false ? false : scaffoldChoices.includes('agentsMd'),
    docGovernance: argv['doc-governance'] === false ? false : scaffoldChoices.includes('docGovernance'),
  }

  const packageManager = defaultMode ? 'pnpm' : (result.packageManager || 'pnpm')

  return {
    projectName,
    auth,
    routerMode,
    features,
    scaffold,
    packageManager,
  } as ProjectOptions
}
