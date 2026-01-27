# 生命周期钩子注册

Vue 的生命周期钩子通过统一的注册机制实现。每个钩子函数都是通过 createHook 工厂创建的。

## createHook 工厂

```typescript
export const createHook = <T extends Function = () => any>(
  lifecycle: LifecycleHooks
) => (hook: T, target: ComponentInternalInstance | null = currentInstance) =>
  (!isInSSRComponentSetup || lifecycle === LifecycleHooks.SERVER_PREFETCH) &&
  injectHook(lifecycle, hook, target)
```

createHook 返回一个函数，这个函数接收钩子回调并注册到当前组件实例。

## 所有生命周期钩子的定义

```typescript
export const onBeforeMount = createHook(LifecycleHooks.BEFORE_MOUNT)
export const onMounted = createHook(LifecycleHooks.MOUNTED)
export const onBeforeUpdate = createHook(LifecycleHooks.BEFORE_UPDATE)
export const onUpdated = createHook(LifecycleHooks.UPDATED)
export const onBeforeUnmount = createHook(LifecycleHooks.BEFORE_UNMOUNT)
export const onUnmounted = createHook(LifecycleHooks.UNMOUNTED)
export const onServerPrefetch = createHook(LifecycleHooks.SERVER_PREFETCH)

export const onRenderTriggered = createHook<DebuggerHook>(LifecycleHooks.RENDER_TRIGGERED)
export const onRenderTracked = createHook<DebuggerHook>(LifecycleHooks.RENDER_TRACKED)

export const onErrorCaptured = createHook<ErrorCapturedHook>(LifecycleHooks.ERROR_CAPTURED)

export const onActivated = createHook(LifecycleHooks.ACTIVATED)
export const onDeactivated = createHook(LifecycleHooks.DEACTIVATED)
```

## LifecycleHooks 枚举

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

使用缩写节省内存。

## injectHook 实现

```typescript
export function injectHook(
  type: LifecycleHooks,
  hook: Function & { __weh?: Function },
  target: ComponentInternalInstance | null = currentInstance,
  prepend: boolean = false
): Function | undefined {
  if (target) {
    // 获取该类型的钩子数组
    const hooks = target[type] || (target[type] = [])
    
    // 包装钩子以注入目标实例
    const wrappedHook =
      hook.__weh ||
      (hook.__weh = (...args: unknown[]) => {
        if (target.isUnmounted) {
          return
        }
        // 暂停追踪以避免误收集依赖
        pauseTracking()
        // 设置当前实例
        setCurrentInstance(target)
        // 调用钩子
        const res = callWithAsyncErrorHandling(hook, target, type, args)
        // 清理
        unsetCurrentInstance()
        resetTracking()
        return res
      })
    
    if (prepend) {
      hooks.unshift(wrappedHook)
    } else {
      hooks.push(wrappedHook)
    }
    
    return wrappedHook
  } else if (__DEV__) {
    const apiName = toHandlerKey(ErrorTypeStrings[type].replace(/ hook$/, ''))
    warn(
      `${apiName} is called when there is no active component instance.`
    )
  }
}
```

## 组件实例上的钩子存储

```typescript
interface ComponentInternalInstance {
  // 生命周期钩子数组
  bc: LifecycleHook    // beforeCreate
  c: LifecycleHook     // created
  bm: LifecycleHook    // beforeMount
  m: LifecycleHook     // mounted
  bu: LifecycleHook    // beforeUpdate
  u: LifecycleHook     // updated
  bum: LifecycleHook   // beforeUnmount
  um: LifecycleHook    // unmounted
  da: LifecycleHook    // deactivated
  a: LifecycleHook     // activated
  rtg: LifecycleHook   // renderTriggered
  rtc: LifecycleHook   // renderTracked
  ec: LifecycleHook    // errorCaptured
  sp: LifecycleHook    // serverPrefetch
}

type LifecycleHook<TFn = Function> = TFn[] | null
```

## 钩子包装器

```typescript
const wrappedHook = (...args: unknown[]) => {
  // 已卸载的组件不执行钩子
  if (target.isUnmounted) {
    return
  }
  
  // 暂停依赖追踪
  pauseTracking()
  
  // 设置当前实例（使钩子内部可以使用 getCurrentInstance）
  setCurrentInstance(target)
  
  // 通过错误处理调用
  const res = callWithAsyncErrorHandling(hook, target, type, args)
  
  // 恢复
  unsetCurrentInstance()
  resetTracking()
  
  return res
}
```

## 缓存包装器

```typescript
const wrappedHook =
  hook.__weh ||
  (hook.__weh = (...args) => { ... })
```

包装后的函数缓存在 `__weh` 属性上，避免重复包装。

## prepend 参数

```typescript
if (prepend) {
  hooks.unshift(wrappedHook)
} else {
  hooks.push(wrappedHook)
}
```

prepend 为 true 时钩子会添加到数组开头，优先执行。

## SSR 处理

```typescript
(!isInSSRComponentSetup || lifecycle === LifecycleHooks.SERVER_PREFETCH) &&
injectHook(lifecycle, hook, target)
```

SSR 期间只有 onServerPrefetch 会被注册，其他钩子被跳过。

## 使用示例

```typescript
import { 
  onBeforeMount, 
  onMounted, 
  onBeforeUpdate, 
  onUpdated,
  onBeforeUnmount,
  onUnmounted,
  ref
} from 'vue'

export default {
  setup() {
    const count = ref(0)
    
    onBeforeMount(() => {
      console.log('beforeMount: DOM 即将挂载')
    })
    
    onMounted(() => {
      console.log('mounted: DOM 已挂载')
    })
    
    onBeforeUpdate(() => {
      console.log('beforeUpdate: 即将更新')
    })
    
    onUpdated(() => {
      console.log('updated: 更新完成')
    })
    
    onBeforeUnmount(() => {
      console.log('beforeUnmount: 即将卸载')
    })
    
    onUnmounted(() => {
      console.log('unmounted: 已卸载')
    })
    
    return { count }
  }
}
```

## 多次注册

```typescript
onMounted(() => {
  console.log('first mounted hook')
})

onMounted(() => {
  console.log('second mounted hook')
})

// 两个钩子都会执行，按注册顺序
```

## 在可组合函数中使用

```typescript
function useEventListener(target, event, handler) {
  onMounted(() => {
    target.addEventListener(event, handler)
  })
  
  onUnmounted(() => {
    target.removeEventListener(event, handler)
  })
}

// 使用
export default {
  setup() {
    useEventListener(window, 'resize', handleResize)
  }
}
```

## Options API 集成

```typescript
function registerLifecycleHook(
  register: Function,
  hook?: Function | Function[]
) {
  if (isArray(hook)) {
    hook.forEach(_hook => register(_hook.bind(publicThis)))
  } else if (hook) {
    register((hook as Function).bind(publicThis))
  }
}

// 在 applyOptions 中调用
registerLifecycleHook(onBeforeMount, options.beforeMount)
registerLifecycleHook(onMounted, options.mounted)
// ...
```

## 小结

生命周期钩子注册的核心机制：

1. **工厂模式**：createHook 统一创建所有钩子注册函数
2. **数组存储**：同类型钩子存储在数组中，支持多次注册
3. **包装器**：钩子被包装以处理上下文和错误
4. **缓存**：__weh 缓存包装后的函数
5. **SSR 感知**：SSR 期间跳过不必要的钩子

这是 Composition API 生命周期的基础实现。

下一章将分析 onBeforeMount 的具体实现。
