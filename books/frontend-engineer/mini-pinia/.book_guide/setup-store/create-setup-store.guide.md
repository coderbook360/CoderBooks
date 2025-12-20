# 章节写作指导：createSetupStore 函数解析

## 1. 章节信息
- **章节标题**: createSetupStore 函数解析
- **文件名**: setup-store/create-setup-store.md
- **所属部分**: 第五部分：Setup Store 实现
- **预计阅读时间**: 25分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 createSetupStore 的完整实现
- 掌握 Store 构建的核心流程
- 了解各个组成部分的集成方式

### 技能目标
- 能够从零实现 createSetupStore
- 能够解释每个步骤的作用

## 3. 内容要点
### 核心概念
- **createSetupStore**：Store 创建的核心工厂函数
- **partialStore**：基础 Store 对象（包含 API）
- **setupStore**：setup 函数返回的对象
- **store**：最终合并后的完整 Store

### 关键知识点
- effectScope 的创建与使用
- partialStore 的 API 定义
- setup 执行与返回值处理
- 插件的应用

## 4. 写作要求
### 开篇方式
"createSetupStore 是 Pinia 源码中最核心也是最复杂的函数，约占整个 store.ts 的 60%。它负责创建 Store 实例、执行 setup 函数、处理响应式数据、应用插件。"

### 结构组织
```
1. 函数签名与参数
2. effectScope 创建
3. 定义内部状态
4. 构建 partialStore
5. 创建 store 对象
6. 提前注册到 Map
7. 执行 setup 函数
8. 处理 setupStore 返回值
9. 应用插件
10. 返回 store
```

### 代码示例
```typescript
function createSetupStore<Id extends string, S, G, A>(
  $id: Id,
  setup: () => SS,
  options: DefineSetupStoreOptions<Id, S, G, A> = {},
  pinia: Pinia,
  hot?: boolean,
  isOptionsStore?: boolean
): Store<Id, S, G, A> {
  // 1. 创建 effectScope
  let scope!: EffectScope
  
  // 2. 内部状态
  let isListening: boolean
  let isSyncListening: boolean
  let subscriptions: Set<SubscriptionCallback<S>> = new Set()
  let actionSubscriptions: Set<StoreOnActionListener> = new Set()
  const initialState = pinia.state.value[$id] as S | undefined
  
  // 3. 定义 $patch
  function $patch(partialStateOrMutator) { /* ... */ }
  
  // 4. 定义 $reset
  const $reset = isOptionsStore
    ? function $reset() { /* ... */ }
    : __DEV__
    ? () => { throw new Error('...') }
    : noop
  
  // 5. 定义 $dispose
  function $dispose() {
    scope.stop()
    subscriptions.clear()
    actionSubscriptions.clear()
    pinia._s.delete($id)
  }
  
  // 6. 定义 action 包装器
  const action = (fn, name) => { /* ... */ }
  
  // 7. 构建 partialStore
  const partialStore = {
    _p: pinia,
    $id,
    $onAction: addSubscription.bind(null, actionSubscriptions),
    $patch,
    $reset,
    $subscribe(callback, options = {}) { /* ... */ },
    $dispose,
  }
  
  // 8. 创建 store 对象
  const store: Store<Id, S, G, A> = reactive(
    assign({}, partialStore)
  ) as unknown as Store<Id, S, G, A>
  
  // 9. 提前注册
  pinia._s.set($id, store)
  
  // 10. 执行 setup
  const runWithContext = pinia._a?.runWithContext || fallbackRunWithContext
  const setupStore = runWithContext(() =>
    pinia._e.run(() => (scope = effectScope()).run(() => setup({ action }))!)
  )!
  
  // 11. 处理返回值
  for (const key in setupStore) { /* ... */ }
  
  // 12. 应用插件
  pinia._p.forEach((extender) => { /* ... */ })
  
  return store
}
```

## 5. 技术细节
### 执行顺序的重要性
```typescript
// 1. 先注册到 Map（支持循环引用）
pinia._s.set($id, store)

// 2. 再执行 setup（此时其他 Store 可以引用这个 Store）
const setupStore = scope.run(() => setup())

// 3. 最后处理返回值和应用插件
```

### runWithContext 的作用
```typescript
// Vue 3.3+ 的 API，确保 inject 在正确的上下文中
const runWithContext = pinia._a?.runWithContext || fallbackRunWithContext

const setupStore = runWithContext(() =>
  pinia._e.run(() => scope.run(() => setup())!)
)

// 嵌套作用域：
// 1. App context (runWithContext)
// 2. Pinia scope (pinia._e)
// 3. Store scope (scope)
```

## 6. 风格指导
- **语气**：深度源码解读
- **结构**：分步骤详细讲解

## 7. 章节检查清单
- [ ] 完整流程覆盖
- [ ] 每个步骤解释清楚
- [ ] 代码与解释对应
- [ ] 与其他章节的关联
