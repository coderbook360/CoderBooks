# onRenderTracked 调试钩子

onRenderTracked 是一个调试钩子，在组件渲染过程中追踪到响应式依赖时触发。它帮助开发者理解组件依赖了哪些数据。

## 定义

```typescript
export const onRenderTracked = createHook<DebuggerHook>(LifecycleHooks.RENDER_TRACKED)

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
import { ref, onRenderTracked } from 'vue'

export default {
  setup() {
    const count = ref(0)
    const name = ref('Vue')
    
    onRenderTracked((event) => {
      console.log('Tracked:', event)
      // {
      //   effect: ReactiveEffect,
      //   target: { value: 0 },  // ref 的内部对象
      //   type: 'get',
      //   key: 'value'
      // }
    })
    
    return { count, name }
  }
}
```

## 实现原理

在组件的 render effect 创建时设置调试钩子：

```typescript
const setupRenderEffect = (
  instance: ComponentInternalInstance,
  initialVNode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  optimized: boolean
) => {
  const componentUpdateFn = () => {
    // ...
  }

  const effect = (instance.effect = new ReactiveEffect(
    componentUpdateFn,
    () => queueJob(update),
    instance.scope
  ))

  // ⭐ 设置调试钩子
  if (__DEV__) {
    effect.onTrack = instance.rtc
      ? e => invokeArrayFns(instance.rtc!, e)
      : void 0
    effect.onTrigger = instance.rtg
      ? e => invokeArrayFns(instance.rtg!, e)
      : void 0
  }
  
  const update = (instance.update = () => effect.run())
  update()
}
```

## ReactiveEffect 的 onTrack

```typescript
class ReactiveEffect<T = any> {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
  
  run() {
    // ...
  }
}
```

在依赖收集时调用：

```typescript
export function track(target: object, type: TrackOpTypes, key: unknown) {
  if (shouldTrack && activeEffect) {
    // 依赖收集逻辑...
    
    // ⭐ 调用 onTrack
    if (__DEV__ && activeEffect.onTrack) {
      activeEffect.onTrack({
        effect: activeEffect,
        target,
        type,
        key
      })
    }
  }
}
```

## TrackOpTypes

```typescript
export const enum TrackOpTypes {
  GET = 'get',
  HAS = 'has',
  ITERATE = 'iterate'
}
```

## 使用场景

### 调试不必要的依赖

```typescript
onRenderTracked((event) => {
  if (event.key === 'unexpectedKey') {
    console.warn('Why is this being tracked?', event)
  }
})
```

### 理解渲染触发原因

```typescript
const trackedKeys = new Set()

onRenderTracked((event) => {
  trackedKeys.add(`${event.type}:${event.key}`)
})

onRenderTriggered((event) => {
  console.log('Triggered by:', event.key)
  console.log('All tracked keys:', trackedKeys)
})
```

### 性能分析

```typescript
let trackCount = 0

onRenderTracked(() => {
  trackCount++
})

onMounted(() => {
  console.log(`Total dependencies tracked: ${trackCount}`)
})
```

## 事件详情

```typescript
onRenderTracked((event) => {
  console.log('Effect:', event.effect)      // 当前 effect
  console.log('Target:', event.target)       // 被追踪的对象
  console.log('Type:', event.type)          // 'get' | 'has' | 'iterate'
  console.log('Key:', event.key)            // 被访问的属性名
})
```

## 只在开发环境可用

```typescript
if (__DEV__) {
  effect.onTrack = instance.rtc
    ? e => invokeArrayFns(instance.rtc!, e)
    : void 0
}
```

生产环境中这些钩子不会被调用。

## 与 watch 的调试

watch 也支持类似的调试：

```typescript
watch(source, callback, {
  onTrack(e) {
    console.log('Watch tracked:', e)
  },
  onTrigger(e) {
    console.log('Watch triggered:', e)
  }
})
```

## 实际调试示例

```vue
<template>
  <div>
    <p>Count: {{ count }}</p>
    <p>Name: {{ user.name }}</p>
    <button @click="count++">Increment</button>
  </div>
</template>

<script setup>
import { ref, reactive, onRenderTracked } from 'vue'

const count = ref(0)
const user = reactive({ name: 'Vue', age: 3 })

onRenderTracked((e) => {
  console.log(`Tracked: ${e.type} on ${e.key}`)
})

// 输出：
// Tracked: get on value (count ref)
// Tracked: get on name (user.name)
```

## 区分不同的响应式对象

```typescript
onRenderTracked((event) => {
  if (event.target === state) {
    console.log('State accessed:', event.key)
  } else if (isRef(event.target)) {
    console.log('Ref accessed')
  }
})
```

## 注意事项

```typescript
// 1. 只在开发环境使用
if (import.meta.env.DEV) {
  onRenderTracked((e) => {
    // 调试代码
  })
}

// 2. 避免在钩子中修改状态
onRenderTracked((e) => {
  // ❌ 不要这样做
  // count.value++
})

// 3. 谨慎使用 console.log
onRenderTracked((e) => {
  // 可能产生大量日志
  // 考虑使用条件过滤
  if (e.key === 'targetKey') {
    console.log(e)
  }
})
```

## 小结

onRenderTracked 的核心要点：

1. **调试用途**：理解组件的响应式依赖
2. **开发环境**：只在 __DEV__ 模式下工作
3. **track 时触发**：每次依赖收集时调用
4. **详细信息**：包含 effect、target、type、key
5. **性能分析**：帮助识别不必要的依赖

这是 Vue 响应式调试工具的一部分。

下一章将分析 onRenderTriggered 调试钩子。
