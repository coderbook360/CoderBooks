# 生命周期钩子注册

Vue 组件有完整的生命周期。Composition API 通过 `onMounted`、`onUpdated` 等函数注册钩子，这些钩子在适当时机被调用。

## 生命周期概览

```
setup() 执行
  ↓
onBeforeMount
  ↓
挂载 DOM
  ↓
onMounted
  ↓
数据变化 → onBeforeUpdate → 更新 DOM → onUpdated
  ↓
onBeforeUnmount
  ↓
卸载 DOM
  ↓
onUnmounted
```

## 钩子类型

```typescript
export const enum LifecycleHooks {
  BEFORE_CREATE = 'bc',
  CREATED = 'c',
  BEFORE_MOUNT = 'bm',
  MOUNTED = 'm',
  BEFORE_UPDATE = 'bu',
  UPDATED = 'u',
  BEFORE_UNMOUNT = 'bum',
  UNMOUNTED = 'um',
  DEACTIVATED = 'da',
  ACTIVATED = 'a',
  RENDER_TRIGGERED = 'rtg',
  RENDER_TRACKED = 'rtc',
  ERROR_CAPTURED = 'ec',
  SERVER_PREFETCH = 'sp'
}
```

短名称用于存储在组件实例上。

## onMounted 实现

```typescript
export const onMounted = createHook(LifecycleHooks.MOUNTED)
```

所有钩子都通过 `createHook` 创建。

## createHook

```typescript
export const createHook =
  <T extends Function = () => any>(lifecycle: LifecycleHooks) =>
  (hook: T, target: ComponentInternalInstance | null = currentInstance) =>
    (!isInSSRComponentSetup || lifecycle === LifecycleHooks.SERVER_PREFETCH) &&
    injectHook(lifecycle, (...args: unknown[]) => hook(...args), target)
```

核心是调用 `injectHook`。

## injectHook

钩子注入的核心函数：

```typescript
export function injectHook(
  type: LifecycleHooks,
  hook: Function & { __weh?: Function },
  target: ComponentInternalInstance | null = currentInstance,
  prepend: boolean = false
): Function | undefined {
  if (target) {
    // 获取或创建钩子数组
    const hooks = target[type] || (target[type] = [])
    
    // 包装钩子函数
    const wrappedHook =
      hook.__weh ||
      (hook.__weh = (...args: unknown[]) => {
        if (target.isUnmounted) {
          return
        }
        
        // 暂停依赖追踪
        pauseTracking()
        // 设置当前实例
        setCurrentInstance(target)
        
        // 执行钩子
        const res = callWithAsyncErrorHandling(hook, target, type, args)
        
        // 清理
        unsetCurrentInstance()
        resetTracking()
        
        return res
      })
    
    // 添加到数组
    if (prepend) {
      hooks.unshift(wrappedHook)
    } else {
      hooks.push(wrappedHook)
    }
    
    return wrappedHook
  } else if (__DEV__) {
    const apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ''))
    warn(
      `${apiName} is called when there is no active component instance to be ` +
        `associated with. ` +
        `Lifecycle injection APIs can only be used during execution of setup().`
    )
  }
}
```

## 钩子包装

每个钩子被包装，确保：

1. **检查卸载状态**：已卸载的组件不执行钩子
2. **暂停追踪**：钩子内不应收集依赖
3. **设置实例**：让钩子内的 Composition API 正确工作
4. **错误处理**：统一捕获和处理错误

```typescript
const wrappedHook = (...args: unknown[]) => {
  if (target.isUnmounted) return
  
  pauseTracking()
  setCurrentInstance(target)
  
  const res = callWithAsyncErrorHandling(hook, target, type, args)
  
  unsetCurrentInstance()
  resetTracking()
  
  return res
}
```

## 多个钩子

同一个生命周期可以注册多个钩子：

```javascript
setup() {
  onMounted(() => console.log('first'))
  onMounted(() => console.log('second'))
  onMounted(() => console.log('third'))
}
```

按注册顺序执行。

## 组件实例上的存储

```typescript
// ComponentInternalInstance 上的钩子属性
interface ComponentInternalInstance {
  bc: LifecycleHook  // beforeCreate
  c: LifecycleHook   // created
  bm: LifecycleHook  // beforeMount
  m: LifecycleHook   // mounted
  bu: LifecycleHook  // beforeUpdate
  u: LifecycleHook   // updated
  bum: LifecycleHook // beforeUnmount
  um: LifecycleHook  // unmounted
  da: LifecycleHook  // deactivated
  a: LifecycleHook   // activated
  // ...
}

type LifecycleHook<TFn = Function> = TFn[] | null
```

## 缓存包装函数

```typescript
hook.__weh ||
(hook.__weh = (...args: unknown[]) => { ... })
```

`__weh` 缓存包装后的函数，避免重复包装。

## prepend 参数

有些场景需要优先执行：

```typescript
injectHook(type, hook, target, true)  // prepend = true
```

钩子会被添加到数组开头。

## SSR 处理

SSR 环境下跳过大部分钩子：

```typescript
(!isInSSRComponentSetup || lifecycle === LifecycleHooks.SERVER_PREFETCH)
```

只有 `serverPrefetch` 在 SSR 中执行。

## 各生命周期的定义

```typescript
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
export const onServerPrefetch = createHook(LifecycleHooks.SERVER_PREFETCH)
```

## 特殊钩子

### onErrorCaptured

```typescript
export const onErrorCaptured = (
  hook: ErrorCapturedHook,
  target: ComponentInternalInstance | null = currentInstance
) => {
  injectHook(LifecycleHooks.ERROR_CAPTURED, hook, target)
}
```

捕获子组件错误。

### onRenderTracked / onRenderTriggered

调试用钩子：

```typescript
export const onRenderTracked = createHook(LifecycleHooks.RENDER_TRACKED)
export const onRenderTriggered = createHook(LifecycleHooks.RENDER_TRIGGERED)
```

追踪渲染依赖和触发原因。

### onActivated / onDeactivated

KeepAlive 相关：

```typescript
export const onActivated = createHook(LifecycleHooks.ACTIVATED)
export const onDeactivated = createHook(LifecycleHooks.DEACTIVATED)
```

## 使用限制

只能在 setup 中调用：

```javascript
// 正确
setup() {
  onMounted(() => {})
}

// 错误
export default {
  created() {
    onMounted(() => {})  // 警告
  }
}
```

因为需要 `currentInstance`。

## 异步 setup 中的钩子

异步 setup 需要在同步阶段注册钩子：

```javascript
// 正确
setup() {
  onMounted(() => {})  // 同步阶段
  
  const data = await fetchData()  // 之后是异步
  
  return { data }
}

// 错误
async setup() {
  const data = await fetchData()
  
  onMounted(() => {})  // currentInstance 已清除
  
  return { data }
}
```

## 组合函数中的钩子

组合函数可以注册钩子：

```javascript
function useWindowSize() {
  const width = ref(window.innerWidth)
  const height = ref(window.innerHeight)
  
  const update = () => {
    width.value = window.innerWidth
    height.value = window.innerHeight
  }
  
  onMounted(() => window.addEventListener('resize', update))
  onUnmounted(() => window.removeEventListener('resize', update))
  
  return { width, height }
}
```

钩子会注册到调用组合函数的组件。

## target 参数

可以显式指定目标实例：

```typescript
injectHook(LifecycleHooks.MOUNTED, hook, targetInstance)
```

这在高级场景下有用，比如父组件控制子组件钩子。

## 小结

生命周期钩子注册机制：

1. **统一创建**：`createHook` 创建所有钩子函数
2. **注入存储**：`injectHook` 将钩子添加到实例
3. **包装执行**：确保正确的实例上下文和错误处理
4. **多钩子支持**：同一生命周期可注册多个回调

下一章将分析这些钩子如何被调用。
