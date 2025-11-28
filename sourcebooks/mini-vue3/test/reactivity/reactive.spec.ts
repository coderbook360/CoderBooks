/**
 * reactive.spec.ts
 * reactive 函数的测试用例
 * 
 * 这些测试用例将在 Day 4 开始逐步实现
 */

import { describe, it, expect } from 'vitest'
import { reactive } from '@/reactivity/reactive'

describe('reactive', () => {
  it('should create reactive object', () => {
    const original = { count: 0 }
    const observed = reactive(original)
    
    // 代理对象不等于原始对象
    expect(observed).not.toBe(original)
    
    // 可以访问属性
    expect(observed.count).toBe(0)
  })

  it.skip('should make nested properties reactive', () => {
    // TODO: Day 4 实现
    const original = {
      nested: {
        count: 0
      }
    }
    const observed = reactive(original)
    expect(observed.nested.count).toBe(0)
  })

  // 更多测试用例将在后续添加...
})
