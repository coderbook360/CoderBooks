# 章节写作指导：$patch 深度解析

## 1. 章节信息
- **章节标题**: $patch 深度解析
- **文件名**: subscriptions/patch-implementation.md
- **所属部分**: 第六部分：订阅机制
- **预计阅读时间**: 18分钟
- **难度等级**: 高级

## 2. 学习目标
### 知识目标
- 理解 $patch 的两种调用方式
- 掌握批量更新的实现原理
- 了解与订阅系统的配合机制

### 技能目标
- 能够从零实现 $patch
- 能够解释 $patch 与直接赋值的区别

## 3. 内容要点
### 核心概念
- **$patch(object)**：对象方式批量更新
- **$patch(function)**：函数方式批量更新
- **批量更新**：多个修改触发一次订阅

### 关键知识点
- 函数重载处理
- mergeReactiveObjects 调用
- isListening 控制
- MutationType 设置

## 4. 写作要求
### 开篇方式
"$patch 是 Pinia 提供的批量更新 API。相比直接修改 state，$patch 可以将多个修改合并为一次订阅通知，并提供更精确的 mutation 类型信息。"

### 结构组织
```
1. $patch 的两种使用方式
2. 函数签名与重载
3. 对象方式实现
4. 函数方式实现
5. 与订阅系统的配合
6. 与直接赋值的对比
7. 完整实现代码
```

### 代码示例
```typescript
// 使用方式一：对象
store.$patch({
  name: 'Alice',
  age: 25,
})

// 使用方式二：函数
store.$patch((state) => {
  state.items.push({ id: 1, name: 'Item' })
  state.count++
})

// $patch 实现
function $patch(partialStateOrMutator: _DeepPartial<S> | ((state: S) => void)): void {
  let subscriptionMutation: SubscriptionCallbackMutation<S>
  
  // 暂停订阅触发
  isListening = false
  isSyncListening = false
  
  if (__DEV__) {
    debuggerEvents = []
  }
  
  if (typeof partialStateOrMutator === 'function') {
    // 函数方式
    partialStateOrMutator(pinia.state.value[$id] as S)
    subscriptionMutation = {
      type: MutationType.patchFunction,
      storeId: $id,
      events: debuggerEvents as DebuggerEvent[],
    }
  } else {
    // 对象方式
    mergeReactiveObjects(pinia.state.value[$id], partialStateOrMutator)
    subscriptionMutation = {
      type: MutationType.patchObject,
      payload: partialStateOrMutator,
      storeId: $id,
      events: debuggerEvents as DebuggerEvent[],
    }
  }
  
  // 恢复订阅触发
  const myListenerId = (activeListener = Symbol())
  nextTick().then(() => {
    if (activeListener === myListenerId) {
      isListening = true
    }
  })
  isSyncListening = true
  
  // 手动触发订阅
  triggerSubscriptions(
    subscriptions,
    subscriptionMutation,
    pinia.state.value[$id] as UnwrapRef<S>
  )
}
```

## 5. 技术细节
### 对象方式 vs 函数方式

| 特性 | 对象方式 | 函数方式 |
|-----|---------|---------|
| 语法 | `$patch({ key: value })` | `$patch(state => {...})` |
| 数组操作 | 只能整体替换 | 可以 push/pop 等 |
| MutationType | `patchObject` | `patchFunction` |
| payload 信息 | 有 | 无 |

### 为什么需要 isListening
```typescript
// 问题场景
store.$patch({
  a: 1,
  b: 2,
  c: 3,
})

// 如果不禁用 isListening：
// - mergeReactiveObjects 内部会触发多次 set
// - watch 会响应每次 set
// - 导致多次触发 $subscribe 回调

// 解决方案：
isListening = false  // 禁用 watch 触发
mergeReactiveObjects(...)  // 执行修改
isListening = true
triggerSubscriptions(...)  // 手动触发一次，带正确的 mutation
```

### nextTick 的使用
```typescript
const myListenerId = (activeListener = Symbol())
nextTick().then(() => {
  if (activeListener === myListenerId) {
    isListening = true
  }
})

// 为什么用 nextTick？
// 防止在同一 tick 内的多个 $patch 导致的竞争问题
// Symbol 用于标识当前 patch 的 listener
```

## 6. 风格指导
- **语气**：深入实现，对比分析
- **表格**：对象 vs 函数方式对比

## 7. 章节检查清单
- [ ] 两种方式的区别
- [ ] isListening 机制
- [ ] nextTick 使用原因
- [ ] 完整实现代码
