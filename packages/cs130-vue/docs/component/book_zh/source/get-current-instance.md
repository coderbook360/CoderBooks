# getCurrentInstance 实例访问

Composition API 中的 `onMounted`、`watch` 等函数需要知道当前在哪个组件中执行。`getCurrentInstance` 提供了这个能力。

## 问题背景

```javascript
setup() {
  onMounted(() => {
    console.log('mounted')
  })
}
```

`onMounted` 怎么知道把回调注册到哪个组件？答案是通过全局变量追踪当前实例。

## 源码分析

```typescript
export let currentInstance: ComponentInternalInstance | null = null

export const getCurrentInstance: () => ComponentInternalInstance | null = () =>
  currentInstance || currentRenderingInstance

export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  currentInstance = instance
  instance.scope.on()
}

export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off()
  currentInstance = null
}
```

核心是一个全局变量 `currentInstance`。

## 实例栈管理

执行 setup 时设置当前实例：

```typescript
// setupStatefulComponent 中
setCurrentInstance(instance)
pauseTracking()

const setupResult = callWithErrorHandling(setup, ...)

resetTracking()
unsetCurrentInstance()
```

流程：
1. 执行前：`setCurrentInstance`
2. 执行 setup
3. 执行后：`unsetCurrentInstance`

## effectScope 关联

设置实例时关联 effectScope：

```typescript
export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  currentInstance = instance
  instance.scope.on()
}

export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off()
  currentInstance = null
}
```

`scope.on()` 和 `scope.off()` 管理当前活动的 effect 作用域。

## currentRenderingInstance

渲染时有另一个实例变量：

```typescript
export let currentRenderingInstance: ComponentInternalInstance | null = null

export function setCurrentRenderingInstance(
  instance: ComponentInternalInstance | null
): ComponentInternalInstance | null {
  const prev = currentRenderingInstance
  currentRenderingInstance = instance
  return prev
}
```

渲染函数执行时设置这个变量。

## 两个实例变量的区别

- `currentInstance`: setup 执行期间的实例
- `currentRenderingInstance`: render 执行期间的实例

`getCurrentInstance` 同时检查两者：

```typescript
export const getCurrentInstance = () =>
  currentInstance || currentRenderingInstance
```

## 生命周期钩子注册

`onMounted` 等使用 `getCurrentInstance`：

```typescript
export const onMounted = (hook: () => any) => {
  const instance = getCurrentInstance()
  if (instance) {
    // 注册到当前实例
    ;(instance.m || (instance.m = [])).push(hook)
  } else if (__DEV__) {
    warn('onMounted is called when there is no active component instance...')
  }
}
```

简化实现，实际代码类似。

## injectHook

实际的钩子注册函数：

```typescript
export function injectHook(
  type: LifecycleHooks,
  hook: Function & { __weh?: Function },
  target: ComponentInternalInstance | null = currentInstance,
  prepend: boolean = false
): Function | undefined {
  if (target) {
    const hooks = target[type] || (target[type] = [])
    
    // 包装钩子，设置当前实例
    const wrappedHook = hook.__weh || (hook.__weh = (...args: unknown[]) => {
      if (target.isUnmounted) return
      
      pauseTracking()
      setCurrentInstance(target)
      const res = callWithAsyncErrorHandling(hook, target, type, args)
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
  }
}
```

关键点：
- 钩子执行时会重新设置当前实例
- 这让钩子内部的 Composition API 调用也能正确工作

## 嵌套组件

父子组件嵌套时，实例正确切换：

```
Parent setup 开始 → setCurrentInstance(parent)
  → 渲染子组件
  → Child setup 开始 → setCurrentInstance(child)
    → 子组件 onMounted
  → Child setup 结束 → unsetCurrentInstance
  → 继续父组件逻辑
Parent setup 结束 → unsetCurrentInstance
```

每个组件的 setup 有独立的实例上下文。

## 使用场景

### 访问实例（不推荐）

```javascript
import { getCurrentInstance } from 'vue'

setup() {
  const instance = getCurrentInstance()
  console.log(instance?.proxy)  // 公共实例
}
```

官方不推荐在应用代码中使用，主要用于库开发。

### 开发工具

调试工具使用它访问实例：

```javascript
// Vue DevTools
const instance = getCurrentInstance()
console.log(instance?.props)
console.log(instance?.setupState)
```

### 库开发

组合函数库需要它：

```javascript
// 自定义钩子
export function useRouterLink() {
  const instance = getCurrentInstance()
  const router = instance?.appContext.config.globalProperties.$router
  // ...
}
```

## 警告信息

在 setup 外调用会警告：

```javascript
// 错误用法
const instance = getCurrentInstance()  // null，可能有警告

export default {
  setup() {
    // 正确：在 setup 内调用
    const instance = getCurrentInstance()
  }
}
```

## withSetupContext

某些场景需要临时切换实例：

```typescript
export function withSetupContext(
  ctx: SetupContext,
  fn: () => void
) {
  const reset = setCurrentRenderingInstance(ctx.slots._)
  fn()
  setCurrentRenderingInstance(reset)
}
```

## 异步问题

异步操作后 `currentInstance` 会丢失：

```javascript
setup() {
  const instance = getCurrentInstance()  // 有值
  
  setTimeout(() => {
    const instance2 = getCurrentInstance()  // null！
  }, 1000)
}
```

解决方法是提前保存：

```javascript
setup() {
  const instance = getCurrentInstance()
  
  setTimeout(() => {
    // 使用之前保存的 instance
    console.log(instance?.proxy)
  }, 1000)
}
```

## 渲染期间的实例

渲染函数中也能获取实例：

```javascript
setup() {
  return () => {
    const instance = getCurrentInstance()  // 有值
    return h('div', instance?.props.title)
  }
}
```

这是因为 `currentRenderingInstance` 在渲染时被设置。

## 类型

```typescript
export interface ComponentInternalInstance {
  uid: number
  type: ConcreteComponent
  parent: ComponentInternalInstance | null
  root: ComponentInternalInstance
  appContext: AppContext
  vnode: VNode
  // ... 更多属性
}
```

`getCurrentInstance` 返回的是内部实例，不是公共 API。

## 公共实例

通过 `proxy` 访问公共实例：

```javascript
const instance = getCurrentInstance()
const publicInstance = instance?.proxy

// 公共实例有 $props, $emit 等
publicInstance?.$emit('update')
```

## 小结

`getCurrentInstance` 的工作机制：

1. **全局变量**：`currentInstance` 追踪当前活动的组件
2. **时机管理**：setup 前后设置和清除
3. **嵌套支持**：每个组件 setup 有独立的上下文
4. **双重检查**：同时检查 setup 实例和渲染实例

这个机制让 Composition API 函数能知道自己在哪个组件中执行，是整个 Composition API 的基础。

下一章将分析事件触发机制——`emit` 的实现。
