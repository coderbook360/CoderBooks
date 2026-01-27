# 迷你实现概述：从零构建响应式系统

在前两部分中，我们学习了响应式系统的设计理念和 Vue 源码实现。现在，我们将从零开始构建一个迷你响应式系统，通过亲手实现来加深理解。

## 为什么要手写实现

阅读源码让你知道"Vue 是怎么做的"，手写实现让你理解"为什么要这样做"。当你亲手解决依赖追踪、循环引用、嵌套 effect 等问题时，才能真正体会设计决策的精妙。

## 实现目标

我们的迷你实现将包含以下核心功能：

1. **reactive**：将普通对象转换为响应式代理
2. **effect**：创建响应式副作用
3. **ref**：创建响应式引用
4. **computed**：创建计算属性
5. **watch**：监听响应式数据变化

## 实现原则

我们遵循几个原则：

**简洁优先**：去除生产代码中的边界情况处理和性能优化，保留核心逻辑。

**循序渐进**：从最简单的版本开始，逐步添加功能和改进。

**对照源码**：实现后可以对照 Vue 源码，理解差异和优化点。

## 最终 API

完成后，我们的迷你库将支持这样的代码：

```typescript
import { reactive, ref, effect, computed, watch } from './mini-reactivity'

// reactive
const state = reactive({ count: 0 })

// effect
effect(() => {
  console.log(state.count)
})

// ref
const count = ref(0)

// computed
const double = computed(() => count.value * 2)

// watch
watch(count, (newVal, oldVal) => {
  console.log(`${oldVal} -> ${newVal}`)
})
```

## 项目结构

```
mini-reactivity/
├── reactive.ts     // reactive 实现
├── effect.ts       // effect 系统
├── ref.ts          // ref 实现
├── computed.ts     // computed 实现
├── watch.ts        // watch 实现
└── index.ts        // 统一导出
```

## 技术选择

**语言**：TypeScript，提供类型安全

**核心机制**：Proxy，与 Vue 3 一致

**依赖追踪**：WeakMap + Map + Set 组合

## 开发环境

你可以在任何支持 TypeScript 的环境中实现，比如：

```typescript
// package.json
{
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest"
  },
  "devDependencies": {
    "tsx": "^4.0.0",
    "typescript": "^5.0.0",
    "vitest": "^1.0.0"
  }
}
```

## 学习路径

接下来的章节将按以下顺序实现：

1. **effect 系统**：建立依赖追踪的基础
2. **reactive**：实现对象的响应式代理
3. **ref**：实现值的响应式包装
4. **computed**：实现惰性求值的计算属性
5. **watch**：实现数据变化监听

每个功能都会经历"简单版本 → 发现问题 → 改进"的过程，让你体验真实的开发思路。

## 与 Vue 源码的差异

我们的迷你实现会简化以下内容：

- 不处理 readonly、shallowReactive 等变体
- 不处理 Array 的特殊方法
- 不处理 Map、Set 等集合类型
- 不实现调度器的复杂队列
- 不实现 effectScope
- 不处理 SSR 相关逻辑

这些简化让核心逻辑更加清晰。理解核心后，再看 Vue 如何处理这些细节会更容易。

## 测试驱动

我们会为每个功能编写测试，确保实现正确：

```typescript
import { describe, it, expect } from 'vitest'
import { reactive, effect } from './mini-reactivity'

describe('reactive', () => {
  it('should track and trigger', () => {
    const state = reactive({ count: 0 })
    let dummy
    effect(() => {
      dummy = state.count
    })
    expect(dummy).toBe(0)
    state.count = 1
    expect(dummy).toBe(1)
  })
})
```

## 本章小结

这一部分我们将亲手实现一个迷你响应式系统。通过动手实践，你将深刻理解依赖追踪、响应式代理、计算属性等核心概念的实现原理。

让我们从 effect 系统开始，它是整个响应式系统的基础。
