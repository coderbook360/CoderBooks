# 生命周期钩子的注册机制

`onMounted(() => { ... })` 是如何知道应该在哪个组件上注册的？生命周期钩子的执行顺序是怎样的？

**这两个问题看似简单，但它们的答案揭示了 Vue 组合式 API 的核心设计。** 本章将深入分析生命周期钩子的注册原理和执行时机。

## 核心问题

思考一下，当你写这段代码时：

```javascript
setup() {
  onMounted(() => {
    console.log('mounted')
  })
}
```

`onMounted` 是如何知道这个回调应该注册到当前组件，而不是其他组件的？

答案：**依赖 currentInstance 全局指针**。

## 生命周期阶段

Vue 3 的组件生命周期：

```
创建阶段
    ↓
setup() 执行        ← 组合式 API 入口
    ↓
onBeforeMount       ← 即将挂载
    ↓
挂载 DOM
    ↓
onMounted           ← 挂载完成
    ↓
更新阶段
    ↓
onBeforeUpdate      ← 即将更新
    ↓
更新 DOM
    ↓
onUpdated           ← 更新完成
    ↓
卸载阶段
    ↓
onBeforeUnmount     ← 即将卸载
    ↓
卸载 DOM
    ↓
onUnmounted         ← 卸载完成
```

## 钩子类型枚举

Vue 3 内部定义了生命周期钩子类型：

```javascript
const LifecycleHooks = {
  BEFORE_MOUNT: 'bm',
  MOUNTED: 'm',
  BEFORE_UPDATE: 'bu',
  UPDATED: 'u',
  BEFORE_UNMOUNT: 'bum',
  UNMOUNTED: 'um',
  ACTIVATED: 'a',
  DEACTIVATED: 'da',
  ERROR_CAPTURED: 'ec',
  RENDER_TRACKED: 'rtg',
  RENDER_TRIGGERED: 'rtc'
}
```

这些简写存储在组件实例上：

```javascript
interface ComponentInstance {
  bm: Function[] | null   // beforeMount
  m: Function[] | null    // mounted
  bu: Function[] | null   // beforeUpdate
  u: Function[] | null    // updated
  bum: Function[] | null  // beforeUnmount
  um: Function[] | null   // unmounted
  // ...
}
```

## 钩子注册实现

所有生命周期钩子都通过 `injectHook` 注册：

```javascript
function injectHook(type, hook, target = currentInstance) {
  if (target) {
    // 获取或创建钩子数组
    const hooks = target[type] || (target[type] = [])
    
    // 包装钩子，设置正确的实例上下文
    const wrappedHook = (...args) => {
      // 暂停依赖收集
      pauseTracking()
      // 设置当前实例
      setCurrentInstance(target)
      
      // 执行钩子
      const res = callWithAsyncErrorHandling(hook, target, type, args)
      
      // 恢复状态
      unsetCurrentInstance()
      resetTracking()
      
      return res
    }
    
    hooks.push(wrappedHook)
    return wrappedHook
  } else if (__DEV__) {
    console.warn(
      `${type} is called when there is no active component instance.`
    )
  }
}
```

关键点：
1. 依赖 `currentInstance` 获取目标组件
2. 钩子被包装，执行时会设置正确的实例上下文
3. 存储在实例的对应数组中

## 具体钩子函数

每个钩子都是对 `injectHook` 的封装：

```javascript
const createHook = (lifecycle) => {
  return (hook, target = currentInstance) => {
    injectHook(lifecycle, hook, target)
  }
}

const onBeforeMount = createHook('bm')
const onMounted = createHook('m')
const onBeforeUpdate = createHook('bu')
const onUpdated = createHook('u')
const onBeforeUnmount = createHook('bum')
const onUnmounted = createHook('um')
```

使用时：

```javascript
setup() {
  // currentInstance 指向当前组件
  onMounted(() => {
    console.log('mounted!')
  })
  // 钩子被添加到 instance.m 数组
}
```

## 钩子的调用时机

### beforeMount 和 mounted

```javascript
function setupRenderEffect(instance, initialVNode, container) {
  const componentUpdateFn = () => {
    if (!instance.isMounted) {
      // 首次挂载
      
      // 调用 beforeMount 钩子
      if (instance.bm) {
        invokeArrayFns(instance.bm)
      }
      
      // 渲染并挂载
      const subTree = instance.render.call(instance.proxy)
      patch(null, subTree, container)
      instance.subTree = subTree
      
      // 调用 mounted 钩子（通过调度器延迟）
      queuePostFlushCb(() => {
        if (instance.m) {
          invokeArrayFns(instance.m)
        }
      })
      
      instance.isMounted = true
    } else {
      // 更新...
    }
  }
  
  instance.update = effect(componentUpdateFn)
}
```

注意：`mounted` 钩子通过 `queuePostFlushCb` 延迟执行，确保在 DOM 更新后调用。

### beforeUpdate 和 updated

```javascript
const componentUpdateFn = () => {
  if (instance.isMounted) {
    // 更新
    
    // 调用 beforeUpdate 钩子
    if (instance.bu) {
      invokeArrayFns(instance.bu)
    }
    
    // 重新渲染
    const nextTree = instance.render.call(instance.proxy)
    const prevTree = instance.subTree
    instance.subTree = nextTree
    
    // patch 更新 DOM
    patch(prevTree, nextTree, container)
    
    // 调用 updated 钩子（延迟）
    queuePostFlushCb(() => {
      if (instance.u) {
        invokeArrayFns(instance.u)
      }
    })
  }
}
```

### beforeUnmount 和 unmounted

```javascript
function unmountComponent(instance) {
  // 调用 beforeUnmount 钩子
  if (instance.bum) {
    invokeArrayFns(instance.bum)
  }
  
  // 卸载子树
  unmount(instance.subTree)
  
  // 调用 unmounted 钩子（延迟）
  queuePostFlushCb(() => {
    if (instance.um) {
      invokeArrayFns(instance.um)
    }
  })
}
```

## 父子组件执行顺序

关键问题：父子组件的生命周期执行顺序是怎样的？

```
挂载顺序：
父 beforeMount
  子 beforeMount
  子 mounted
父 mounted

更新顺序：
父 beforeUpdate
  子 beforeUpdate
  子 updated
父 updated

卸载顺序：
父 beforeUnmount
  子 beforeUnmount
  子 unmounted
父 unmounted
```

为什么是这样？

因为 mounted 钩子在 patch 完成后通过 `queuePostFlushCb` 调度。子组件先完成渲染，其 mounted 钩子先入队；父组件后完成，其 mounted 钩子后入队。但队列按顺序执行，所以子 mounted 先于父 mounted。

## invokeArrayFns 工具函数

批量执行钩子数组：

```javascript
function invokeArrayFns(fns, arg) {
  for (let i = 0; i < fns.length; i++) {
    fns[i](arg)
  }
}
```

## 特殊钩子：activated 和 deactivated

配合 KeepAlive 使用：

```javascript
const onActivated = createHook('a')
const onDeactivated = createHook('da')
```

当组件被 KeepAlive 缓存/激活时调用，而非 mounted/unmounted。

## 特殊钩子：onRenderTracked 和 onRenderTriggered

调试用钩子，追踪组件渲染的依赖关系：

```javascript
onRenderTracked((event) => {
  console.log('依赖被追踪:', event.target, event.key)
})

onRenderTriggered((event) => {
  console.log('触发更新:', event.target, event.key)
})
```

这些钩子在 effect 的 `onTrack` 和 `onTrigger` 中调用。

## 错误处理

钩子执行被 `callWithAsyncErrorHandling` 包装：

```javascript
function callWithAsyncErrorHandling(fn, instance, type, args) {
  try {
    const res = fn(...args)
    
    // 处理异步钩子
    if (res && isPromise(res)) {
      res.catch(err => handleError(err, instance, type))
    }
    
    return res
  } catch (err) {
    handleError(err, instance, type)
  }
}
```

钩子中的错误会被捕获，不会导致整个应用崩溃。

## 注册多个相同钩子

可以多次调用同一个钩子函数：

```javascript
setup() {
  onMounted(() => {
    console.log('first mounted hook')
  })
  
  onMounted(() => {
    console.log('second mounted hook')
  })
}
```

两个回调都会执行，按注册顺序。

## 本章小结

本章分析了生命周期钩子的工作原理：

- **注册机制**：依赖 `currentInstance` 确定目标组件
- **injectHook**：包装钩子并存储到实例对应数组
- **执行时机**：在组件生命周期的特定阶段调用
- **延迟执行**：mounted/updated/unmounted 通过调度器延迟
- **父子顺序**：beforeXxx 父先子后，Xxx 子先父后
- **错误处理**：钩子执行被错误处理包装

理解这些机制后，你就能解释为什么 `onMounted` 必须在 setup 内部调用——因为只有那时 `currentInstance` 才指向正确的组件。

下一章，我们将分析 provide/inject 的实现原理。
