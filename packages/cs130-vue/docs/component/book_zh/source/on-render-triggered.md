# onRenderTriggered 调试钩子

onRenderTriggered 是一个调试钩子，在响应式数据变化触发组件重新渲染时调用。它与 onRenderTracked 配合使用，帮助开发者理解为什么组件会重新渲染。

## 定义

```typescript
export const onRenderTriggered = createHook<DebuggerHook>(LifecycleHooks.RENDER_TRIGGERED)

type DebuggerHook = (e: DebuggerEvent) => void

interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
  oldTarget?: Map<any, any> | Set<any>
}
```

## 基本用法

```typescript
import { ref, onRenderTriggered } from 'vue'

export default {
  setup() {
    const count = ref(0)
    
    onRenderTriggered((event) => {
      console.log('Render triggered by:', event)
      // {
      //   effect: ReactiveEffect,
      //   target: { value: 0 },
      //   type: 'set',
      //   key: 'value',
      //   newValue: 1,
      //   oldValue: 0
      // }
    })
    
    const increment = () => {
      count.value++  // 这会触发 onRenderTriggered
    }
    
    return { count, increment }
  }
}
```

## 实现原理

在 setupRenderEffect 中设置 onTrigger：

```typescript
if (__DEV__) {
  effect.onTrack = instance.rtc
    ? e => invokeArrayFns(instance.rtc!, e)
    : void 0
  effect.onTrigger = instance.rtg
    ? e => invokeArrayFns(instance.rtg!, e)
    : void 0
}
```

## trigger 中调用

```typescript
export function trigger(
  target: object,
  type: TriggerOpTypes,
  key?: unknown,
  newValue?: unknown,
  oldValue?: unknown,
  oldTarget?: Map<unknown, unknown> | Set<unknown>
) {
  const depsMap = targetMap.get(target)
  if (!depsMap) return
  
  let deps: (Dep | undefined)[] = []
  // 收集需要触发的 effects...
  
  const eventInfo = __DEV__
    ? { target, type, key, newValue, oldValue, oldTarget }
    : undefined
  
  // 触发每个 effect
  for (const effect of effects) {
    if (__DEV__ && effect.onTrigger) {
      effect.onTrigger({
        effect,
        ...eventInfo!
      })
    }
    
    if (effect.scheduler) {
      effect.scheduler()
    } else {
      effect.run()
    }
  }
}
```

## TriggerOpTypes

```typescript
export const enum TriggerOpTypes {
  SET = 'set',
  ADD = 'add',
  DELETE = 'delete',
  CLEAR = 'clear'
}
```

## 使用场景

### 调试不期望的重渲染

```typescript
onRenderTriggered((event) => {
  console.log('Why am I re-rendering?')
  console.log('Changed key:', event.key)
  console.log('Old value:', event.oldValue)
  console.log('New value:', event.newValue)
  console.trace()  // 打印调用栈
})
```

### 追踪特定属性变化

```typescript
onRenderTriggered((event) => {
  if (event.key === 'problematicKey') {
    console.warn('This property changed:', event)
    debugger  // 断点调试
  }
})
```

### 性能监控

```typescript
let triggerCount = 0

onRenderTriggered(() => {
  triggerCount++
  if (triggerCount > 10) {
    console.warn('Too many re-renders!')
  }
})
```

## 完整事件信息

```typescript
onRenderTriggered((event) => {
  console.log('Effect:', event.effect)       // ReactiveEffect 实例
  console.log('Target:', event.target)        // 被修改的对象
  console.log('Type:', event.type)           // 'set' | 'add' | 'delete' | 'clear'
  console.log('Key:', event.key)             // 被修改的属性名
  console.log('New Value:', event.newValue)   // 新值
  console.log('Old Value:', event.oldValue)   // 旧值
  console.log('Old Target:', event.oldTarget) // 用于 Map/Set
})
```

## 与 onRenderTracked 配合

```typescript
const trackedDeps = new Map()

onRenderTracked((e) => {
  trackedDeps.set(e.key, e)
})

onRenderTriggered((e) => {
  console.log('Trigger Key:', e.key)
  console.log('Was it tracked?', trackedDeps.has(e.key))
  console.log('Trigger Type:', e.type)
})
```

## 实际调试示例

```vue
<template>
  <div>
    <p>{{ user.name }} - {{ user.age }}</p>
    <button @click="updateAge">Update Age</button>
  </div>
</template>

<script setup>
import { reactive, onRenderTriggered } from 'vue'

const user = reactive({ name: 'Vue', age: 3 })

onRenderTriggered((e) => {
  console.log(`Re-render triggered by: ${e.key} (${e.type})`)
  console.log(`${e.oldValue} -> ${e.newValue}`)
})

const updateAge = () => {
  user.age++
}
// 点击按钮输出：
// Re-render triggered by: age (set)
// 3 -> 4
</script>
```

## 区分操作类型

```typescript
onRenderTriggered((e) => {
  switch (e.type) {
    case 'set':
      console.log(`Property ${e.key} was modified`)
      break
    case 'add':
      console.log(`Property ${e.key} was added`)
      break
    case 'delete':
      console.log(`Property ${e.key} was deleted`)
      break
    case 'clear':
      console.log('Collection was cleared')
      break
  }
})
```

## 注意事项

```typescript
// 1. 只在开发环境有效
if (import.meta.env.DEV) {
  onRenderTriggered((e) => {
    // 调试代码
  })
}

// 2. 不要在钩子中修改状态
onRenderTriggered((e) => {
  // ❌ 会导致无限循环
  // someRef.value = e.newValue
})

// 3. 考虑性能影响
onRenderTriggered((e) => {
  // 复杂的日志可能影响性能
  // 使用条件过滤
})
```

## debugger 技巧

```typescript
onRenderTriggered((e) => {
  if (e.key === 'suspiciousKey') {
    debugger  // 在这里设置断点
  }
})
```

## 批量更新的情况

```typescript
// 批量更新只会触发一次重渲染
const updateMultiple = () => {
  // 虽然修改了多个属性
  state.a = 1
  state.b = 2
  state.c = 3
  // 但 onRenderTriggered 可能被多次调用
  // 渲染只会发生一次（批量处理）
}
```

## 小结

onRenderTriggered 的核心要点：

1. **调试触发器**：理解重渲染的原因
2. **详细信息**：包含 type、key、newValue、oldValue
3. **开发环境**：只在 __DEV__ 模式下工作
4. **trigger 时调用**：响应式数据变化时触发
5. **配合使用**：与 onRenderTracked 一起调试

这两个调试钩子是理解 Vue 响应式系统的重要工具。

下一章将分析组件更新流程 component-update-flow.md。
