# 章节写作指导：createOptionsStore 函数解析

## 1. 章节信息
- **章节标题**: createOptionsStore 函数解析
- **文件名**: options-store/create-options-store.md
- **所属部分**: 第四部分：Options Store 实现
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 createOptionsStore 的完整实现
- 掌握 Options 到 Setup 的转换逻辑
- 了解与 createSetupStore 的关系

### 技能目标
- 能够从零实现 createOptionsStore
- 能够解释转换过程的每个步骤

## 3. 内容要点
### 核心概念
- **createOptionsStore**：Options Store 的工厂函数
- **Options → Setup 转换**：将配置转为 setup 函数
- **复用 createSetupStore**：实际创建逻辑委托

### 关键知识点
- 转换 state 为 refs
- 转换 getters 为 computed
- 保持 actions 原样
- isOptionsStore 标志

## 4. 写作要求
### 开篇方式
"createOptionsStore 的实现揭示了一个优雅的设计：Options Store 实际上会被转换为 Setup Store。这种统一使得核心逻辑只需维护一份。"

### 结构组织
```
1. createOptionsStore 函数签名
2. 转换 state 为 refs
3. 转换 getters 为 computed
4. 处理 actions
5. 构造 setup 函数
6. 调用 createSetupStore
7. 完整实现
```

### 代码示例
```typescript
function createOptionsStore<Id extends string, S, G, A>(
  id: Id,
  options: DefineStoreOptions<Id, S, G, A>,
  pinia: Pinia
): Store<Id, S, G, A> {
  const { state, getters, actions } = options
  
  // 构造 setup 函数
  function setup() {
    // 1. 初始化 state
    const initialState = pinia.state.value[id] as S | undefined
    const localState = initialState
      ? toRefs(ref(initialState).value)
      : toRefs(ref(state ? state() : {}).value)
    
    // 2. 合并 state、actions、getters
    return assign(
      localState,
      actions,
      Object.keys(getters || {}).reduce((computedGetters, name) => {
        computedGetters[name] = markRaw(
          computed(() => {
            setActivePinia(pinia)
            const store = pinia._s.get(id)!
            return getters![name].call(store, store)
          })
        )
        return computedGetters
      }, {} as Record<string, ComputedRef>)
    )
  }
  
  // 3. 委托给 createSetupStore
  const store = createSetupStore(id, setup, options, pinia, true)
  
  return store
}
```

## 5. 技术细节
### state 转换
```typescript
// 从 pinia.state.value 获取或初始化
const localState = initialState
  ? toRefs(ref(initialState).value)  // 已有状态（SSR hydration）
  : toRefs(ref(state ? state() : {}).value)  // 新状态

// 为什么用 toRefs？
// 确保解构后仍保持响应式
const { count, name } = localState  // 都是 Ref
```

### getters 转换
```typescript
Object.keys(getters || {}).reduce((computedGetters, name) => {
  computedGetters[name] = markRaw(
    computed(() => {
      setActivePinia(pinia)  // 确保嵌套 Store 调用正确
      const store = pinia._s.get(id)!
      return getters![name].call(store, store)  // this 绑定到 store
    })
  )
  return computedGetters
}, {})
```

### isOptionsStore 参数
```typescript
// 最后一个参数 true 表示是 Options Store
createSetupStore(id, setup, options, pinia, hot, true)
//                                            ^^^^ isOptionsStore

// 在 createSetupStore 中的影响
if (!isOptionsStore) {
  // Setup Store 才需要手动同步到 pinia.state
  pinia.state.value[$id][key] = prop
}
```

## 6. 风格指导
- **语气**：源码解读，逐步深入
- **对比**：Options vs Setup 的转换关系

## 7. 章节检查清单
- [ ] 转换逻辑清晰
- [ ] state/getters/actions 处理完整
- [ ] 与 createSetupStore 的关系
- [ ] isOptionsStore 标志解释
