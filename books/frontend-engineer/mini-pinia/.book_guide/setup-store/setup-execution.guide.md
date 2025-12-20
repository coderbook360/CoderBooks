# 章节写作指导：setup 函数执行与返回值处理

## 1. 章节信息
- **章节标题**: setup 函数执行与返回值处理
- **文件名**: setup-store/setup-execution.md
- **所属部分**: 第五部分：Setup Store 实现
- **预计阅读时间**: 15分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 setup 函数的执行上下文
- 掌握返回值的处理流程
- 了解与 store 对象的合并方式

### 技能目标
- 能够解释 setup 执行的完整流程
- 能够理解返回值如何成为 Store 的一部分

## 3. 内容要点
### 核心概念
- **setup 执行上下文**：在 scope 内执行
- **返回值 (setupStore)**：包含 state、getters、actions
- **合并到 store**：与 partialStore 合并

### 关键知识点
- runWithContext 的作用
- action helper 的传入
- toRaw 与 assign 的使用

## 4. 写作要求
### 开篇方式
"setup 函数是 Store 逻辑的核心所在。它的执行时机、上下文环境，以及返回值的处理方式，决定了 Store 的最终行为。"

### 结构组织
```
1. setup 的执行时机
2. 执行上下文设置
3. action helper 参数
4. 返回值的类型
5. 返回值的处理
6. 合并到 store 对象
7. 实现代码
```

### 代码示例
```typescript
// setup 执行
const runWithContext = pinia._a?.runWithContext || fallbackRunWithContext

const setupStore = runWithContext(() =>
  pinia._e.run(() =>
    (scope = effectScope()).run(() =>
      setup({ action })  // 传入 action helper
    )!
  )
)!

// 返回值处理
for (const key in setupStore) {
  const prop = setupStore[key]
  
  // 类型识别与处理（上一章节的内容）
  if ((isRef(prop) && !isComputed(prop)) || isReactive(prop)) {
    // State 处理
  } else if (typeof prop === 'function') {
    // Action 包装
    setupStore[key] = action(prop, key)
  }
}

// 合并到 store
assign(toRaw(store), setupStore)

// 定义 $state
Object.defineProperty(store, '$state', {
  get: () => pinia.state.value[$id],
  set: (state) => {
    $patch(($state) => {
      assign($state, state)
    })
  },
})
```

## 5. 技术细节
### action helper
```typescript
// setup 接收一个参数对象
interface SetupStoreHelpers {
  action: <Fn extends _Method>(fn: Fn, name?: string) => Fn
}

// 使用场景：显式标记 action
const useStore = defineStore('test', ({ action }) => {
  const count = ref(0)
  
  // 不需要 action() 包装，因为会自动识别
  function increment() {
    count.value++
  }
  
  // 但可以显式使用（用于某些边缘情况）
  const customAction = action((value: number) => {
    count.value = value
  }, 'customAction')
  
  return { count, increment, customAction }
})
```

### toRaw 的作用
```typescript
// store 是 reactive 对象
const store = reactive(assign({}, partialStore))

// assign 时需要用 toRaw 避免触发响应式
assign(toRaw(store), setupStore)

// 如果不用 toRaw:
// assign(store, setupStore)
// 会触发 reactive 的 set trap，可能导致不必要的更新
```

### 返回值必须是对象
```typescript
// ✅ 正确：返回对象
defineStore('test', () => {
  const count = ref(0)
  return { count }  // 对象
})

// ❌ 错误：返回非对象
defineStore('test', () => {
  const count = ref(0)
  return count  // 不是对象
})
```

## 6. 风格指导
- **语气**：流程化讲解
- **重点**：返回值处理的细节

## 7. 章节检查清单
- [ ] 执行上下文清晰
- [ ] action helper 解释
- [ ] 返回值处理完整
- [ ] toRaw 使用原因
- [ ] 合并逻辑清楚
