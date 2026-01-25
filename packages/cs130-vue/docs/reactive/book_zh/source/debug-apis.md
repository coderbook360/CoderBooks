# 调试 API：响应式系统的可观测性

Vue 提供了一系列调试 API，帮助开发者理解和调试响应式系统的行为。本章分析这些 API 的实现。

## onTrack 和 onTrigger

effect 可以传入调试选项：

```typescript
export interface DebuggerOptions {
  onTrack?: (event: DebuggerEvent) => void
  onTrigger?: (event: DebuggerEvent) => void
}

export interface DebuggerEvent {
  effect: ReactiveEffect
  target: object
  type: TrackOpTypes | TriggerOpTypes
  key: any
  newValue?: any
  oldValue?: any
}
```

使用示例：

```typescript
const count = ref(0)

watchEffect(() => {
  console.log(count.value)
}, {
  onTrack(e) {
    console.log('Tracking:', e.key, 'on', e.target)
  },
  onTrigger(e) {
    console.log('Triggered by:', e.key, 'change from', e.oldValue, 'to', e.newValue)
  }
})
```

## 在 track 中调用 onTrack

```typescript
export function track(target: object, type: TrackOpTypes, key: unknown): void {
  if (shouldTrack && activeEffect) {
    let depsMap = targetMap.get(target)
    if (!depsMap) {
      targetMap.set(target, (depsMap = new Map()))
    }
    let dep = depsMap.get(key)
    if (!dep) {
      depsMap.set(key, (dep = createDep()))
    }
    trackEffects(dep)
    
    // 开发模式下调用 onTrack
    if (__DEV__ && activeEffect.onTrack) {
      activeEffect.onTrack({
        effect: activeEffect,
        target,
        type,
        key,
      })
    }
  }
}
```

每次建立依赖时触发 onTrack。

## 在 trigger 中调用 onTrigger

```typescript
function triggerEffect(
  effect: ReactiveEffect,
  debuggerEventExtraInfo?: DebuggerEventExtraInfo,
) {
  // 开发模式下调用 onTrigger
  if (__DEV__ && effect.onTrigger) {
    effect.onTrigger({
      effect,
      ...debuggerEventExtraInfo,
    })
  }
  
  if (effect.scheduler) {
    effect.scheduler()
  } else {
    effect.run()
  }
}
```

每次触发 effect 时调用 onTrigger。

## watch 的调试选项

watch 也支持这些选项：

```typescript
watch(source, callback, {
  onTrack(e) {
    debugger  // 依赖被追踪时进入断点
  },
  onTrigger(e) {
    debugger  // 触发时进入断点
  }
})
```

这些选项在 doWatch 中被传递给 effect：

```typescript
const effect = new ReactiveEffect(getter, NOOP, scheduler)

if (__DEV__) {
  effect.onTrack = onTrack
  effect.onTrigger = onTrigger
}
```

## 调试事件信息

DebuggerEvent 包含丰富的信息：

```typescript
{
  effect: ReactiveEffect,  // 相关的 effect
  target: object,           // 目标对象
  type: TrackOpTypes | TriggerOpTypes,  // 操作类型
  key: any,                 // 被访问/修改的键
  newValue?: any,          // 新值（仅 trigger）
  oldValue?: any,          // 旧值（仅 trigger）
}
```

## 生产模式剥离

调试代码只在开发模式存在：

```typescript
if (__DEV__ && activeEffect.onTrack) {
  activeEffect.onTrack(...)
}
```

生产构建时这些代码会被移除，不影响性能。

## toRaw 函数

获取响应式对象的原始对象：

```typescript
export function toRaw<T>(observed: T): T {
  const raw = observed && (observed as Target)[ReactiveFlags.RAW]
  return raw ? toRaw(raw) : observed
}
```

使用示例：

```typescript
const state = reactive({ count: 0 })
const raw = toRaw(state)

console.log(raw === state)  // false
console.log(isReactive(raw))  // false
```

用于调试或需要绕过响应式的场景。

## markRaw 函数

标记对象永不被代理：

```typescript
export function markRaw<T extends object>(value: T): Raw<T> {
  if (Object.isExtensible(value)) {
    def(value, ReactiveFlags.SKIP, true)
  }
  return value
}
```

使用示例：

```typescript
const obj = markRaw({ count: 0 })
const state = reactive({ obj })

console.log(isReactive(state.obj))  // false
```

## isReactive / isReadonly / isProxy

类型检查函数：

```typescript
export function isReactive(value: unknown): boolean {
  if (isReadonly(value)) {
    return isReactive((value as Target)[ReactiveFlags.RAW])
  }
  return !!(value && (value as Target)[ReactiveFlags.IS_REACTIVE])
}

export function isReadonly(value: unknown): boolean {
  return !!(value && (value as Target)[ReactiveFlags.IS_READONLY])
}

export function isProxy(value: any): boolean {
  return value ? !!value[ReactiveFlags.RAW] : false
}
```

使用示例：

```typescript
const state = reactive({ count: 0 })
const frozen = readonly(state)

console.log(isReactive(state))   // true
console.log(isReadonly(frozen))  // true
console.log(isProxy(state))      // true
```

## isRef / isShallow

ref 类型检查：

```typescript
export function isRef(r: any): r is Ref {
  return r ? r[ReactiveFlags.IS_REF] === true : false
}

export function isShallow(value: unknown): boolean {
  return !!(value && (value as any)[ReactiveFlags.IS_SHALLOW])
}
```

## 响应式标记

Vue 使用特殊的 Symbol 作为标记：

```typescript
export enum ReactiveFlags {
  SKIP = '__v_skip',
  IS_REACTIVE = '__v_isReactive',
  IS_READONLY = '__v_isReadonly',
  IS_SHALLOW = '__v_isShallow',
  RAW = '__v_raw',
  IS_REF = '__v_isRef',
}
```

这些标记让 Vue 能够识别和处理各种响应式类型。

## 调试依赖关系

可以手动检查依赖：

```typescript
const count = ref(0)

// 获取依赖 Map
const depsMap = targetMap.get(toRaw(count))
console.log(depsMap)
```

虽然 targetMap 不是导出的 API，但可以通过其他方式访问（如 Vue DevTools）。

## Vue DevTools 集成

Vue DevTools 使用这些 API 来展示响应式状态：

1. 使用 isRef/isReactive 识别类型
2. 使用 toRaw 获取原始值
3. 使用 onTrack/onTrigger 追踪变化
4. 显示组件的依赖关系图

## 自定义调试工具

可以构建自定义调试工具：

```typescript
function debugWatch(source, callback, options = {}) {
  return watch(source, callback, {
    ...options,
    onTrack(e) {
      console.group('Dependency Tracked')
      console.log('Target:', e.target)
      console.log('Key:', e.key)
      console.log('Type:', e.type)
      console.groupEnd()
    },
    onTrigger(e) {
      console.group('Effect Triggered')
      console.log('Key:', e.key)
      console.log('Old:', e.oldValue)
      console.log('New:', e.newValue)
      console.groupEnd()
    }
  })
}
```

## 条件断点

使用 debugger 进行条件调试：

```typescript
watch(state, callback, {
  onTrigger(e) {
    if (e.key === 'count') {
      debugger  // 只在 count 变化时断点
    }
  }
})
```

## 本章小结

Vue 提供了丰富的调试 API：onTrack/onTrigger 用于追踪依赖和触发，toRaw/markRaw 用于原始对象访问，isReactive/isRef 等用于类型检查。

这些 API 在开发模式下帮助理解响应式系统的行为，生产模式下自动剥离不影响性能。它们也是 Vue DevTools 等工具的基础。
