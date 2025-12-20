# 章节写作指导：$subscribe 实现原理

## 1. 章节信息
- **章节标题**: $subscribe 实现原理
- **文件名**: subscriptions/subscribe-implementation.md
- **所属部分**: 第六部分：订阅机制
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 $subscribe 的完整实现
- 掌握 watch 与订阅的结合方式
- 了解 flush 选项的作用

### 技能目标
- 能够从零实现 $subscribe
- 能够解释同步与异步订阅的区别

## 3. 内容要点
### 核心概念
- **$subscribe**：订阅 state 变化的 API
- **flush**：控制回调执行时机（sync/post）
- **isListening**：控制是否触发回调

### 关键知识点
- 基于 watch 实现
- detached 选项
- immediate 选项的处理
- 与 $patch 的配合

## 4. 写作要求
### 开篇方式
"$subscribe 让你能够监听 Store 的任何 state 变化。它的实现巧妙地结合了 Vue 的 watch API 和 Pinia 自己的订阅系统。"

### 结构组织
```
1. $subscribe API 设计
2. 实现原理
3. watch 的使用
4. flush 选项
5. isListening 与 isSyncListening
6. 与 $patch 的配合
7. 完整实现代码
```

### 代码示例
```typescript
// partialStore 中的 $subscribe 定义
const partialStore = {
  $subscribe(callback, options = {}) {
    const removeSubscription = addSubscription(
      subscriptions,
      callback,
      options.detached,
      () => stopWatcher()
    )
    
    const stopWatcher = scope.run(() =>
      watch(
        () => pinia.state.value[$id] as UnwrapRef<S>,
        (state) => {
          if (options.flush === 'sync' ? isSyncListening : isListening) {
            callback(
              {
                storeId: $id,
                type: MutationType.direct,
                events: debuggerEvents as DebuggerEvent,
              },
              state
            )
          }
        },
        assign({}, $subscribeOptions, options)
      )
    )!
    
    return removeSubscription
  },
}
```

## 5. 技术细节
### isListening 与 isSyncListening
```typescript
// 在 createSetupStore 开始时
let isListening: boolean
let isSyncListening: boolean

// 默认关闭，防止初始化时触发
isListening = true
isSyncListening = true

// 在 $patch 中
function $patch(partialStateOrMutator) {
  isListening = false  // 暂停 post 订阅
  isSyncListening = false  // 暂停 sync 订阅
  
  // 执行修改...
  
  isListening = true  // 恢复 post 订阅
  isSyncListening = true  // 恢复 sync 订阅
  
  // 手动触发订阅，传入正确的 mutation type
  triggerSubscriptions(subscriptions, mutation, state)
}
```

### flush 选项
```typescript
// flush: 'post' (默认)
// 回调在 DOM 更新后执行
store.$subscribe((mutation, state) => {
  // 此时 DOM 已更新
})

// flush: 'sync'
// 回调同步执行
store.$subscribe((mutation, state) => {
  // 立即执行，DOM 可能还未更新
}, { flush: 'sync' })

// 判断逻辑
if (options.flush === 'sync' ? isSyncListening : isListening) {
  callback(...)
}
```

### 为什么需要 isListening
```typescript
// 问题：$patch 会多次修改 state
store.$patch({
  name: 'Alice',
  age: 25,
  city: 'Beijing'
})

// 如果不禁用，watch 可能触发多次
// 使用 isListening 确保只在 $patch 结束后触发一次

// $patch 内部
isListening = false  // 禁用 watch 回调
// 批量修改...
isListening = true
triggerSubscriptions(...)  // 手动触发一次，带正确的 mutation type
```

## 6. 风格指导
- **语气**：深入原理，逐步展开
- **重点**：isListening 机制

## 7. 章节检查清单
- [ ] 完整实现代码
- [ ] isListening 机制解释
- [ ] flush 选项说明
- [ ] 与 $patch 的配合
