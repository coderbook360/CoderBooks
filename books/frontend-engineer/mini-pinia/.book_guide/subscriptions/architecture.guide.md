# 章节写作指导：订阅系统架构概述

## 1. 章节信息
- **章节标题**: 订阅系统架构概述
- **文件名**: subscriptions/architecture.md
- **所属部分**: 第六部分：订阅机制
- **预计阅读时间**: 10分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解 Pinia 订阅系统的整体设计
- 掌握三种订阅类型的用途
- 了解订阅机制的设计目标

### 技能目标
- 能够解释订阅系统的架构
- 能够选择合适的订阅方式

## 3. 内容要点
### 核心概念
- **$subscribe**：监听 state 变化
- **$onAction**：监听 action 调用
- **watch/watchEffect**：Vue 响应式监听（补充）

### 关键知识点
- 订阅与响应式的区别
- 订阅的添加与移除
- 订阅回调的执行时机

## 4. 写作要求
### 开篇方式
"状态管理不仅要存储数据，还要让应用的其他部分知道数据何时、如何变化。Pinia 提供了完善的订阅系统，让你能够监听 state 变化和 action 调用。"

### 结构组织
```
1. 为什么需要订阅
2. 三种监听方式对比
3. $subscribe 概述
4. $onAction 概述
5. 订阅的生命周期
6. 设计目标与权衡
```

### 代码示例
```typescript
const store = useCounterStore()

// 方式一：$subscribe 监听 state 变化
store.$subscribe((mutation, state) => {
  console.log('State changed:', mutation.type)
  localStorage.setItem('counter', JSON.stringify(state))
})

// 方式二：$onAction 监听 action 调用
store.$onAction(({ name, args, after, onError }) => {
  console.log(`Action ${name} called with:`, args)
  
  after((result) => {
    console.log(`Action ${name} finished with:`, result)
  })
  
  onError((error) => {
    console.error(`Action ${name} failed:`, error)
  })
})

// 方式三：watch 监听（Vue 响应式）
watch(
  () => store.count,
  (newValue) => {
    console.log('Count changed to:', newValue)
  }
)
```

## 5. 技术细节
### 三种监听方式对比

| 特性 | $subscribe | $onAction | watch |
|-----|-----------|----------|-------|
| 监听目标 | state 变化 | action 调用 | 响应式数据 |
| 触发时机 | 变化后 | 调用前后 | 变化后 |
| 获取信息 | mutation 类型 | action 名称、参数 | 新旧值 |
| 自动清理 | detached 选项 | detached 选项 | 组件卸载时 |

### 订阅存储结构
```typescript
// store 内部
let subscriptions: Set<SubscriptionCallback<S>> = new Set()
let actionSubscriptions: Set<StoreOnActionListener> = new Set()

// Set 而非 Array：快速添加/删除，避免重复
```

## 6. 风格指导
- **语气**：全局概览，引导性
- **表格**：用表格对比不同方式

## 7. 章节检查清单
- [ ] 订阅系统全貌清晰
- [ ] 三种方式对比明确
- [ ] 使用场景说明
- [ ] 为后续章节铺垫
