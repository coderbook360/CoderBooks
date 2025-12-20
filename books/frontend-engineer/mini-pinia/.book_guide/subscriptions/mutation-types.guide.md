# 章节写作指导：MutationType 与变更追踪

## 1. 章节信息
- **章节标题**: MutationType 与变更追踪
- **文件名**: subscriptions/mutation-types.md
- **所属部分**: 第六部分：订阅机制
- **预计阅读时间**: 10分钟
- **难度等级**: 中级

## 2. 学习目标
### 知识目标
- 理解三种 MutationType 的含义
- 掌握变更追踪的实现原理
- 了解不同变更类型的使用场景

### 技能目标
- 能够根据 mutation.type 做出不同响应
- 能够理解变更来源

## 3. 内容要点
### 核心概念
- **MutationType.direct**：直接修改
- **MutationType.patchObject**：$patch 对象方式
- **MutationType.patchFunction**：$patch 函数方式

### 关键知识点
- 类型定义
- 各类型的触发条件
- SubscriptionCallback 的参数

## 4. 写作要求
### 开篇方式
"当 state 发生变化时，知道'变化了什么'很重要，但知道'如何变化的'同样重要。Pinia 通过 MutationType 告诉你变更的来源和方式。"

### 结构组织
```
1. MutationType 定义
2. 三种类型详解
3. SubscriptionCallback 参数
4. 实际使用示例
5. 变更追踪的价值
```

### 代码示例
```typescript
// MutationType 定义
export const enum MutationType {
  direct = 'direct',
  patchObject = 'patch object',
  patchFunction = 'patch function',
}

// SubscriptionCallback 类型
export type SubscriptionCallback<S> = (
  mutation: SubscriptionCallbackMutation<S>,
  state: UnwrapRef<S>
) => void

// SubscriptionCallbackMutation 类型
export type SubscriptionCallbackMutation<S> =
  | SubscriptionCallbackMutationDirect
  | SubscriptionCallbackMutationPatchObject<S>
  | SubscriptionCallbackMutationPatchFunction

interface SubscriptionCallbackMutationBase {
  storeId: string
  events: DebuggerEvent | DebuggerEvent[]
}

interface SubscriptionCallbackMutationDirect extends SubscriptionCallbackMutationBase {
  type: MutationType.direct
  events: DebuggerEvent
}

interface SubscriptionCallbackMutationPatchObject<S> extends SubscriptionCallbackMutationBase {
  type: MutationType.patchObject
  payload: _DeepPartial<S>
}

interface SubscriptionCallbackMutationPatchFunction extends SubscriptionCallbackMutationBase {
  type: MutationType.patchFunction
  events: DebuggerEvent[]
}
```

## 5. 技术细节
### 各类型的触发条件

| 类型 | 触发方式 | 示例 |
|-----|---------|------|
| `direct` | 直接赋值 | `store.count++` |
| `patchObject` | $patch 对象 | `store.$patch({ count: 1 })` |
| `patchFunction` | $patch 函数 | `store.$patch(s => s.count++)` |

### 订阅回调中的使用
```typescript
store.$subscribe((mutation, state) => {
  switch (mutation.type) {
    case MutationType.direct:
      // 单个值直接修改
      console.log('Direct mutation')
      // events 是单个 DebuggerEvent
      console.log(mutation.events)
      break
      
    case MutationType.patchObject:
      // 通过对象批量修改
      console.log('Patch with object:', mutation.payload)
      break
      
    case MutationType.patchFunction:
      // 通过函数修改
      console.log('Patch with function')
      // events 是 DebuggerEvent 数组
      console.log(mutation.events)
      break
  }
})
```

### DebuggerEvent 的来源
```typescript
// watch 的 onTrigger 回调提供 DebuggerEvent
watch(
  pinia.state,
  () => { /* ... */ },
  {
    onTrigger(e: DebuggerEvent) {
      // e 包含触发变化的详细信息
      debuggerEvents = e
    }
  }
)
```

## 6. 风格指导
- **语气**：类型系统讲解
- **表格**：用表格总结触发条件

## 7. 章节检查清单
- [ ] 三种类型解释清楚
- [ ] 触发条件明确
- [ ] 使用示例完整
- [ ] 类型定义准确
