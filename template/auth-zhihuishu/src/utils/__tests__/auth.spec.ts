import { describe, expect, it } from 'vitest'
import { sanitizeRedirectPath } from '../auth'

describe('sanitizeRedirectPath', () => {
  it('清理回跳路径中的 CAS 参数，保留业务查询串', () => {
    expect(sanitizeRedirectPath('/workbench/list?ticket=ST-123&service=abc&page=2')).toBe('/workbench/list?page=2')
  })

  it('保留 hash 路由片段', () => {
    expect(sanitizeRedirectPath('/dashboard?ticket=ST-123#/console')).toBe('/dashboard#/console')
  })

  it('无 CAS 参数时原样返回', () => {
    expect(sanitizeRedirectPath('/dashboard/console')).toBe('/dashboard/console')
  })
})
