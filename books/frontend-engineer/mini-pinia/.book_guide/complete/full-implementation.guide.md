# 章节写作指导：完整 Mini-Pinia 实现

## 1. 章节信息
- **章节标题**: 完整 Mini-Pinia 实现
- **文件名**: complete/full-implementation.md
- **所属部分**: 第十部分：完整实现与总结
- **预计阅读时间**: 30分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解完整的 Mini-Pinia 架构
- 掌握各模块之间的协作关系
- 了解简化版与完整版的差异

### 技能目标
- 能够从零实现 Mini-Pinia
- 能够根据需要扩展功能

## 3. 内容要点
### 核心概念
- **Mini-Pinia**：精简版 Pinia 实现
- **核心模块**：createPinia、defineStore、subscriptions
- **完整功能**：state、getters、actions、plugins

### 关键知识点
- 所有模块的整合
- 关键设计决策回顾
- 代码组织方式

## 4. 写作要求
### 开篇方式
"经过前面章节的逐步学习，我们已经理解了 Pinia 的各个组成部分。现在，让我们把所有知识整合起来，实现一个完整的 Mini-Pinia。"

### 结构组织
```
1. 项目结构
2. createPinia 完整实现
3. defineStore 完整实现
4. subscriptions 模块
5. 辅助函数
6. 类型定义
7. 测试验证
8. 与官方实现的对比
```

### 代码示例
```typescript
// ===== types.ts =====
export interface StateTree {
  [key: string]: any
}

export interface Pinia {
  install: (app: App) => void
  use: (plugin: PiniaPlugin) => Pinia
  state: Ref<Record<string, StateTree>>
  _s: Map<string, Store>
  _p: PiniaPlugin[]
  _a: App | null
  _e: EffectScope
}

export type Store<
  Id extends string = string,
  S extends StateTree = StateTree,
  G = {},
  A = {}
> = {
  $id: Id
  $state: S
  $patch: (partial: Partial<S> | ((state: S) => void)) => void
  $reset: () => void
  $subscribe: (callback: SubscriptionCallback) => () => void
  $onAction: (callback: ActionCallback) => () => void
  $dispose: () => void
} & S & G & A

// ===== createPinia.ts =====
import { ref, effectScope } from 'vue'

export function createPinia(): Pinia {
  const scope = effectScope(true)
  const state = scope.run(() => ref<Record<string, StateTree>>({}))!
  const _p: PiniaPlugin[] = []
  
  const pinia: Pinia = {
    install(app: App) {
      pinia._a = app
      app.provide(piniaSymbol, pinia)
      app.config.globalProperties.$pinia = pinia
    },
    
    use(plugin: PiniaPlugin) {
      _p.push(plugin)
      return this
    },
    
    state,
    _s: new Map(),
    _p,
    _a: null,
    _e: scope,
  }
  
  return pinia
}

// ===== defineStore.ts =====
export function defineStore(
  idOrOptions: string | DefineStoreOptions,
  setup?: () => any,
  setupOptions?: DefineSetupStoreOptions
): UseStoreDefinition {
  let id: string
  let options: DefineStoreOptions | undefined
  
  const isSetupStore = typeof setup === 'function'
  
  if (typeof idOrOptions === 'string') {
    id = idOrOptions
    options = isSetupStore ? setupOptions : setup as DefineStoreOptions
  } else {
    options = idOrOptions
    id = options.id
  }
  
  function useStore(pinia?: Pinia): Store {
    pinia = pinia || getActivePinia()
    
    if (!pinia._s.has(id)) {
      if (isSetupStore) {
        createSetupStore(id, setup!, options, pinia)
      } else {
        createOptionsStore(id, options!, pinia)
      }
    }
    
    return pinia._s.get(id)!
  }
  
  useStore.$id = id
  return useStore
}

// 完整代码请见本章附录
```

## 5. 技术细节
### 模块依赖关系
```
                    ┌─────────────┐
                    │   types.ts  │
                    └─────┬───────┘
                          │
          ┌───────────────┼───────────────┐
          │               │               │
    ┌─────▼─────┐   ┌─────▼─────┐   ┌─────▼─────┐
    │createPinia│   │defineStore│   │subscriptions│
    └───────────┘   └─────┬─────┘   └───────────┘
                          │
              ┌───────────┼───────────┐
              │           │           │
        ┌─────▼─────┐ ┌───▼───┐ ┌─────▼─────┐
        │OptionsStore│ │SetupStore│ │ Store │
        └───────────┘ └───────┘ └───────────┘
```

### 简化版 vs 完整版

| 特性 | Mini-Pinia | 官方 Pinia |
|-----|-----------|-----------|
| 核心 API | ✅ | ✅ |
| TypeScript | 基础 | 完整泛型 |
| DevTools | ❌ | ✅ |
| SSR 支持 | 基础 | 完整 |
| 热更新 | ❌ | ✅ |
| 代码量 | ~300 行 | ~2000 行 |

### 测试用例
```typescript
// 验证实现
describe('Mini-Pinia', () => {
  it('creates pinia instance', () => {
    const pinia = createPinia()
    expect(pinia.state.value).toEqual({})
    expect(pinia._s.size).toBe(0)
  })
  
  it('defines and uses options store', () => {
    const useStore = defineStore('counter', {
      state: () => ({ count: 0 }),
      getters: { double: (state) => state.count * 2 },
      actions: { increment() { this.count++ } }
    })
    
    const store = useStore()
    expect(store.count).toBe(0)
    store.increment()
    expect(store.count).toBe(1)
    expect(store.double).toBe(2)
  })
  
  // 更多测试...
})
```

## 6. 风格指导
- **语气**：总结性、整合性
- **完整性**：给出完整可运行的代码

## 7. 章节检查清单
- [ ] 完整代码提供
- [ ] 模块关系清晰
- [ ] 与官方对比
- [ ] 测试用例验证
