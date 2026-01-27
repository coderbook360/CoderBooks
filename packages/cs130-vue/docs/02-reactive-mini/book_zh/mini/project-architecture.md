# 项目架构设计

在动手实现之前，我们需要规划 mini-reactivity 的整体架构。良好的架构设计让代码更易理解、更易测试、更易扩展。

## 目标定义

我们的 mini-reactivity 将实现以下核心功能：

1. **reactive**：将普通对象转换为响应式代理
2. **readonly**：创建只读的响应式代理
3. **shallowReactive**：浅层响应式
4. **effect**：创建响应式副作用
5. **ref / shallowRef**：创建响应式引用
6. **computed**：创建计算属性
7. **watch / watchEffect**：监听响应式数据变化
8. **effectScope**：管理副作用作用域

## 我们不会实现的功能

为保持核心逻辑清晰，以下功能不在实现范围：

- triggerRef（可触发的 ref）
- customRef（自定义 ref）
- markRaw / toRaw（原始值标记）
- SSR 相关逻辑
- 调试钩子（onTrack / onTrigger）

## 模块划分

```
mini-reactivity/
├── index.ts           # 入口，统一导出 API
├── reactive.ts        # reactive / readonly / shallowReactive
├── baseHandlers.ts    # Proxy handlers (get/set/has/deleteProperty)
├── collectionHandlers.ts  # Map/Set 的 handlers
├── effect.ts          # effect 系统核心
├── ref.ts             # ref / shallowRef / toRef / toRefs
├── computed.ts        # computed 实现
├── watch.ts           # watch / watchEffect 实现
├── effectScope.ts     # effectScope 实现
├── dep.ts             # 依赖管理
├── scheduler.ts       # 调度器（简化版）
└── shared.ts          # 工具函数
```

## 类型设计

先定义核心类型，这是实现的基础：

```typescript
// shared.ts
export const isObject = (val: unknown): val is object =>
  val !== null && typeof val === 'object'

export const isFunction = (val: unknown): val is Function =>
  typeof val === 'function'

export const hasChanged = (value: any, oldValue: any): boolean =>
  !Object.is(value, oldValue)

export const NOOP = () => {}
```

```typescript
// effect.ts - 核心类型
export interface ReactiveEffect<T = any> {
  (): T
  _isEffect: true
  active: boolean
  deps: Set<ReactiveEffect>[]
  options: ReactiveEffectOptions
}

export interface ReactiveEffectOptions {
  lazy?: boolean
  scheduler?: (effect: ReactiveEffect) => void
  onStop?: () => void
}
```

```typescript
// ref.ts - Ref 类型
export interface Ref<T = any> {
  value: T
  _isRef: true
}

export interface ComputedRef<T = any> extends Ref<T> {
  readonly value: T
  _isComputed: true
}
```

## 核心数据结构

响应式系统的核心是依赖追踪，我们使用三层结构：

```typescript
// WeakMap<target, Map<key, Set<effect>>>
type TargetMap = WeakMap<object, Map<string | symbol, Set<ReactiveEffect>>>

const targetMap: TargetMap = new WeakMap()
```

这个结构的设计意图：

- **WeakMap**：以原始对象为键，便于垃圾回收
- **Map**：以属性键为键，追踪每个属性的依赖
- **Set**：存储依赖该属性的 effect，避免重复

```
targetMap
└── target (object)
    └── depsMap (Map)
        ├── 'count' → Set<effect1, effect2>
        ├── 'name'  → Set<effect1>
        └── 'items' → Set<effect3>
```

## 核心流程

### 依赖收集流程

```
effect(() => console.log(state.count))
    ↓
执行 effect 函数
    ↓
访问 state.count，触发 Proxy get
    ↓
track(target, 'count')
    ↓
将当前 effect 添加到 count 的依赖集合
```

### 触发更新流程

```
state.count++
    ↓
触发 Proxy set
    ↓
trigger(target, 'count')
    ↓
获取 count 的所有依赖 effect
    ↓
依次执行或调度这些 effect
```

## 依赖关系图

```
effect.ts (核心)
    ↓
reactive.ts ─────────── ref.ts
    ↓                      ↓
baseHandlers.ts        computed.ts
    ↓                      ↓
collectionHandlers.ts   watch.ts
```

## 实现顺序

我们按依赖关系从底向上实现：

1. **effect.ts**：建立依赖追踪机制（track/trigger）
2. **baseHandlers.ts**：实现 Proxy 拦截器
3. **reactive.ts**：组装 reactive/readonly/shallowReactive
4. **ref.ts**：基于 effect 实现 ref
5. **computed.ts**：基于 effect + ref 实现 computed
6. **watch.ts**：基于 effect 实现 watch
7. **effectScope.ts**：管理 effect 生命周期

## 开发环境设置

```json
// package.json
{
  "name": "mini-reactivity",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "test": "vitest",
    "build": "tsup src/index.ts"
  },
  "devDependencies": {
    "tsx": "^4.7.0",
    "typescript": "^5.3.0",
    "vitest": "^1.2.0",
    "tsup": "^8.0.0"
  }
}
```

```json
// tsconfig.json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true,
    "outDir": "dist"
  },
  "include": ["src"]
}
```

## 测试策略

每个模块都应该有对应的测试：

```typescript
// __tests__/reactive.test.ts
import { describe, it, expect } from 'vitest'
import { reactive, effect } from '../src'

describe('reactive', () => {
  it('should observe basic properties', () => {
    let dummy
    const counter = reactive({ num: 0 })
    effect(() => (dummy = counter.num))

    expect(dummy).toBe(0)
    counter.num = 7
    expect(dummy).toBe(7)
  })
})
```

## 与 Vue 源码的对比

完成实现后，可以对比 Vue 源码看我们简化了什么：

| 功能 | Vue 源码 | Mini 实现 |
|------|---------|-----------|
| 依赖追踪 | 位运算优化 | 简单 Set |
| 调度器 | 完整队列 | 简化版 |
| 数组 | 特殊处理 | 基础支持 |
| 集合 | 完整支持 | 简化支持 |
| Debug | 完整钩子 | 不支持 |

理解核心实现后，再看 Vue 如何优化这些细节会更容易。
