/**
 * useTable 配置契约与类型推导工具
 *
 * 从 useTable.ts 拆出（单文件 650 行熔断）：
 * - InferApiParams / InferApiResponse / InferRecordType 类型推导工具；
 * - UseTableConfig 配置接口。
 *
 * useTable.ts 以 `export type { UseTableConfig }` 保持原导出面不变。
 */
import type { ApiResponse } from '../../utils/table/tableCache'
import type { TableError } from '../../utils/table/tableUtils'
import type { ColumnOption } from '@/types/component'

// 类型推导工具类型
export type InferApiParams<T> = T extends (params: infer P) => any ? P : never
export type InferApiResponse<T> = T extends (params: any) => Promise<infer R> ? R : never
export type InferRecordType<T> = T extends Api.Common.PaginatedResponse<infer U> ? U : never

// 优化的配置接口 - 支持自动类型推导
export interface UseTableConfig<
  TApiFn extends (params: any) => Promise<any> = (params: any) => Promise<any>,
  TRecord = InferRecordType<InferApiResponse<TApiFn>>,
  TParams = InferApiParams<TApiFn>,
  TResponse = InferApiResponse<TApiFn>,
> {
  // 核心配置
  core: {
    /** API 请求函数 */
    apiFn: TApiFn
    /** 默认请求参数 */
    apiParams?: Partial<TParams>
    /** 排除 apiParams 中的属性 */
    excludeParams?: string[]
    /** 是否立即加载数据 */
    immediate?: boolean
    /** 列配置工厂函数 */
    columnsFactory?: () => ColumnOption<TRecord>[]
    /** 自定义分页字段映射 */
    paginationKey?: {
      /** 当前页码字段名，默认为 'current' */
      current?: string
      /** 每页条数字段名，默认为 'size' */
      size?: string
    }
  }

  // 数据处理
  transform?: {
    /** 数据转换函数 */
    dataTransformer?: (data: TRecord[]) => TRecord[]
    /** 响应数据适配器 */
    responseAdapter?: (response: TResponse) => ApiResponse<TRecord>
  }

  // 性能优化
  performance?: {
    /** 是否启用缓存 */
    enableCache?: boolean
    /** 缓存时间（毫秒） */
    cacheTime?: number
    /** 防抖延迟时间（毫秒） */
    debounceTime?: number
    /** 最大缓存条数限制 */
    maxCacheSize?: number
  }

  // 生命周期钩子
  hooks?: {
    /** 数据加载成功回调（仅网络请求成功时触发） */
    onSuccess?: (data: TRecord[], response: ApiResponse<TRecord>) => void
    /** 错误处理回调 */
    onError?: (error: TableError) => void
    /** 缓存命中回调（从缓存获取数据时触发） */
    onCacheHit?: (data: TRecord[], response: ApiResponse<TRecord>) => void
    /** 加载状态变化回调 */
    onLoading?: (loading: boolean) => void
    /** 重置表单回调函数 */
    resetFormCallback?: () => void
  }

  // 调试配置
  debug?: {
    /** 是否启用日志输出 */
    enableLog?: boolean
    /** 日志级别 */
    logLevel?: 'info' | 'warn' | 'error'
  }
}
