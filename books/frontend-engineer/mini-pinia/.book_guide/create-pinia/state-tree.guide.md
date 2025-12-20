# 章节写作指导：全局状态树：state 的响应式实现

## 1. 章节信息
- **章节标题**: 全局状态树：state 的响应式实现
- **文件名**: create-pinia/state-tree.md
- **所属部分**: 第二部分：createPinia 核心实现
- **预计阅读时间**: 15分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Pinia 全局 state 的结构设计
- 掌握为什么使用 Ref 而非 reactive
- 了解 state 在各 Store 间的共享机制

### 技能目标
- 能够解释 state 的数据结构
- 能够理解 SSR hydration 的需求

## 3. 内容要点
### 核心概念
- **全局 state**：`Ref<Record<string, StateTree>>`
- **StateTree**：`Record<PropertyKey, any>`
- **Store state 注册**：`pinia.state.value[storeId] = ...`

### 关键知识点
- state 结构：`{ storeId1: {...}, storeId2: {...} }`
- 为什么用 Ref 包装
- SSR hydration 场景

## 4. 写作要求
### 开篇方式
"Pinia 的全局 state 是一个看似简单却精心设计的数据结构。它存储了所有 Store 的状态，并支持 SSR 场景下的状态恢复。"

### 结构组织
```
1. state 数据结构
2. 为什么是 Ref 而非 reactive
3. Store state 的注册
4. SSR hydration 支持
5. DevTools 状态导出
6. 实现代码
```

### 代码示例
```typescript
// createPinia 中的 state 初始化
const state = scope.run<Ref<Record<string, StateTree>>>(() =>
  ref<Record<string, StateTree>>({})
)!

// state 的结构示例
pinia.state.value = {
  counter: { count: 0 },
  user: { name: 'John', loggedIn: true },
  cart: { items: [], total: 0 }
}

// Store 注册自己的 state
// store.ts createSetupStore 中
pinia.state.value[$id] = {}

// SSR hydration
if (initialState && shouldHydrate(prop)) {
  prop.value = initialState[key]
}
```

## 5. 技术细节
### 为什么用 Ref？
```typescript
// 如果用 reactive
const state = reactive({})
pinia.state = { ...newState }  // ❌ 失去响应式

// 使用 Ref
const state = ref({})
pinia.state.value = { ...newState }  // ✅ 整体替换仍保持响应式
```

### SSR Hydration 流程
1. 服务端渲染时，state 被序列化到 HTML
2. 客户端接收到 `window.__PINIA_STATE__`
3. 调用 `pinia.state.value = dehydratedState`
4. 各 Store 从全局 state 恢复

### Store 与全局 state 的关系
```typescript
// createSetupStore 中
if (!isOptionsStore && !initialState) {
  pinia.state.value[$id] = {}
}

// 后续 state 属性会同步到全局
pinia.state.value[$id][key] = prop
```

## 6. 风格指导
- **语气**：数据结构导向，注重原理
- **图示**：可用图展示 state 树结构

## 7. 章节检查清单
- [ ] state 结构清晰
- [ ] Ref vs reactive 对比
- [ ] SSR 场景说明
- [ ] 与 Store 的关联
- [ ] 代码示例可运行
