/**
 * effect.spec.ts
 * effect 函数的测试用例
 * 
 * 这些测试用例将在 Day 5 开始逐步实现
 */

import { describe, it, expect } from 'vitest'
import { effect } from '@/reactivity/effect'
import { reactive } from '@/reactivity/reactive'

describe('effect', () => {
  it.skip('should run the effect function immediately', () => {
    // TODO: Day 5 实现
    let dummy
    effect(() => {
      dummy = 'effect ran'
    })
    expect(dummy).toBe('effect ran')
  })

  it.skip('should observe basic properties', () => {
    // TODO: Day 5 实现
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => {
      dummy = counter.num
    })

    expect(dummy).toBe(0)
    counter.num = 7
    expect(dummy).toBe(7)
  })

  // 更多测试用例将在后续添加...
})
