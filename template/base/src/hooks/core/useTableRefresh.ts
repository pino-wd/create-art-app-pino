/**
 * useTable 搜索与分页刷新动作（单文件 650 行熔断，从 useTable.ts 拆出）
 *
 * createTableRefreshStrategies 工厂产出：
 * - 5 种刷新策略：refreshCreate / refreshUpdate / refreshRemove / refreshData / refreshSoft；
 * - 搜索参数动作：resetSearchParams / replaceSearchParams；
 * - 分页动作：handleSizeChange / handleCurrentChange。
 *
 * 拆分契约：
 * - 依赖全部经参数注入：error 为 useTable 实例状态 ref（resetSearchParams 清错），
 *   log 为实例 logger.log 回调（保留 enableLog 实例配置），cancelDebouncedSearch
 *   对应实例的 debouncedGetDataByPage.cancel，getData 为保持当前页的数据获取；
 * - isCurrentChanging 分页防重入标志为本工厂实例私有的闭包状态，不得提升为模块级共享；
 * - fetchData（竞态区域）与缓存、生命周期留守 useTable.ts，不在此文件。
 */
import type { Ref } from 'vue'
import type { TableError } from '../../utils/table/tableUtils'
import { nextTick } from 'vue'
import { CacheInvalidationStrategy } from '../../utils/table/tableCache'

/**
 * 刷新动作工厂依赖：均为 useTable 实例内持有的状态与方法。
 * searchParams/data 为延迟条件类型经 reactive/ref 包装后的实例状态，
 * 这里按运行时实际所需的最小结构面声明（类型契约由 TParams 承担）。
 */
interface TableRefreshDependencies<TParams extends object> {
  /** 分页状态（reactive 对象，动作内直接改写） */
  pagination: Api.Common.PaginationParams
  /** 搜索参数（reactive 对象，动作内直接改写） */
  searchParams: object
  /** 当前页码字段名 */
  pageKey: string
  /** 每页条数字段名 */
  sizeKey: string
  /** 默认请求参数，resetSearchParams 重置时回填 */
  apiParams?: Partial<TParams>
  /** 表格数据（只读读取面：refreshRemove 仅读当前页是否为空） */
  data: { readonly value: unknown[] }
  /** 错误状态，resetSearchParams 清空 */
  error: Ref<TableError | null>
  /** 缓存清理入口（useTable 实例的 clearCache） */
  clearCache: (strategy: CacheInvalidationStrategy, context?: string) => void
  /** 保持当前页的数据获取（useTable 实例的 getData） */
  getData: (params?: Partial<TParams>) => Promise<unknown>
  /** 取消防抖搜索（useTable 实例的 debouncedGetDataByPage.cancel） */
  cancelDebouncedSearch: () => void
  /** 重置表单回调，resetSearchParams 完成后触发 */
  resetFormCallback?: () => void
  /** 日志回调（useTable 实例 logger.log，保留 enableLog 实例配置） */
  log: (message: string, ...args: unknown[]) => void
}

/**
 * 搜索与分页动作工厂：逐段迁移自 useTable.ts，
 * 除依赖注入（cancelDebouncedSearch / log 回调）外不改写任何行为。
 */
export function createTableRefreshStrategies<TParams extends object>(
  deps: TableRefreshDependencies<TParams>,
) {
  const {
    pagination,
    searchParams,
    pageKey,
    sizeKey,
    apiParams,
    data,
    error,
    clearCache,
    getData,
    cancelDebouncedSearch,
    resetFormCallback,
    log,
  } = deps

  // 重置搜索参数
  const resetSearchParams = async (): Promise<void> => {
    // 取消防抖的搜索
    cancelDebouncedSearch()

    // 保存分页相关的默认值
    const paramsRecord = searchParams as Record<string, unknown>
    const defaultPagination = {
      [pageKey]: 1,
      [sizeKey]: (paramsRecord[sizeKey] as number) || 10,
    }

    // 清空所有搜索参数
    Object.keys(searchParams).forEach((key) => {
      delete paramsRecord[key]
    })

    // 重新设置默认参数
    Object.assign(searchParams, apiParams || {}, defaultPagination)

    // 重置分页
    pagination.current = 1
    pagination.size = defaultPagination[sizeKey] as number

    // 清空错误状态
    error.value = null

    // 清空缓存
    clearCache(CacheInvalidationStrategy.CLEAR_ALL, '重置搜索')

    // 重新获取数据
    await getData()

    // 执行重置回调
    if (resetFormCallback) {
      await nextTick()
      resetFormCallback()
    }
  }

  // 替换搜索参数：适用于表单查询，避免旧字段残留
  const replaceSearchParams = (params?: Partial<TParams>): void => {
    const paramsRecord = searchParams as Record<string, unknown>
    const currentSize = pagination.size || ((paramsRecord[sizeKey] as number) ?? 10)

    Object.keys(searchParams).forEach((key) => {
      if (key !== pageKey && key !== sizeKey) {
        delete paramsRecord[key]
      }
    })

    Object.assign(
      searchParams,
      {
        [pageKey]: 1,
        [sizeKey]: currentSize,
      },
      params || {},
    )

    pagination.current = 1
    pagination.size = currentSize
  }

  // 防重复调用的标志（工厂实例私有，不与其它实例共享）
  let isCurrentChanging = false

  // 处理分页大小变化
  const handleSizeChange = async (newSize: number): Promise<void> => {
    if (newSize <= 0)
      return

    cancelDebouncedSearch()

    const paramsRecord = searchParams as Record<string, unknown>
    pagination.size = newSize
    pagination.current = 1
    paramsRecord[sizeKey] = newSize
    paramsRecord[pageKey] = 1

    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '分页大小变化')

    await getData()
  }

  // 处理当前页变化
  const handleCurrentChange = async (newCurrent: number): Promise<void> => {
    if (newCurrent <= 0)
      return

    // 修复：防止重复调用
    if (isCurrentChanging) {
      return
    }

    // 修复：如果当前页没有变化，不需要重新请求
    if (pagination.current === newCurrent) {
      log('分页页码未变化，跳过请求')
      return
    }

    try {
      isCurrentChanging = true

      // 修复：只更新必要的状态
      const paramsRecord = searchParams as Record<string, unknown>
      pagination.current = newCurrent
      // 只有当 searchParams 的分页字段与新值不同时才更新
      if (paramsRecord[pageKey] !== newCurrent) {
        paramsRecord[pageKey] = newCurrent
      }

      await getData()
    }
    finally {
      isCurrentChanging = false
    }
  }

  // 针对不同业务场景的刷新方法

  // 新增后刷新：回到第一页并清空分页缓存（适用于新增数据后）
  const refreshCreate = async (): Promise<void> => {
    cancelDebouncedSearch()
    pagination.current = 1
    ;(searchParams as Record<string, unknown>)[pageKey] = 1
    clearCache(CacheInvalidationStrategy.CLEAR_PAGINATION, '新增数据')
    await getData()
  }

  // 更新后刷新：保持当前页，仅清空当前搜索缓存（适用于更新数据后）
  const refreshUpdate = async (): Promise<void> => {
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '编辑数据')
    await getData()
  }

  // 删除后刷新：智能处理页码，避免空页面（适用于删除数据后）
  const refreshRemove = async (): Promise<void> => {
    const { current } = pagination

    // 清除缓存并获取最新数据
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '删除数据')
    await getData()

    // 如果当前页为空且不是第一页，回到上一页
    if (data.value.length === 0 && current > 1) {
      pagination.current = current - 1
      ;(searchParams as Record<string, unknown>)[pageKey] = current - 1
      await getData()
    }
  }

  // 全量刷新：清空所有缓存，重新获取数据（适用于手动刷新按钮）
  const refreshData = async (): Promise<void> => {
    cancelDebouncedSearch()
    clearCache(CacheInvalidationStrategy.CLEAR_ALL, '手动刷新')
    await getData()
  }

  // 轻量刷新：仅清空当前搜索条件的缓存，保持分页状态（适用于定时刷新）
  const refreshSoft = async (): Promise<void> => {
    clearCache(CacheInvalidationStrategy.CLEAR_CURRENT, '软刷新')
    await getData()
  }

  return {
    resetSearchParams,
    replaceSearchParams,
    handleSizeChange,
    handleCurrentChange,
    refreshCreate,
    refreshUpdate,
    refreshRemove,
    refreshData,
    refreshSoft,
  }
}
