# 边界情况处理

Vue 组件系统需要处理各种边界情况，本章分析这些特殊场景的处理逻辑。

## 空渲染

```typescript
// 组件 render 返回 null
const componentUpdateFn = () => {
  const nextTree = renderComponentRoot(instance)
  // nextTree 可能是 Comment 占位符
}

// renderComponentRoot 中
export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  // ...
  let result = // 渲染结果
  
  if (result === null || result === undefined) {
    // 空渲染使用 Comment 占位
    result = createVNode(Comment)
  }
  
  return result
}
```

## 多根节点

```typescript
// Vue 3 支持多根节点
// <template>
//   <div>A</div>
//   <div>B</div>
// </template>

// 编译为 Fragment
const vnode = createVNode(Fragment, null, [
  createVNode('div', null, 'A'),
  createVNode('div', null, 'B')
])
```

## 组件根节点继承

```typescript
// 继承 class、style、事件
export function renderComponentRoot(
  instance: ComponentInternalInstance
): VNode {
  const {
    vnode: { props: vNodeProps },
    attrs
  } = instance

  // 如果组件有单一根节点且非函数式组件
  // 继承 attrs 到根节点
  if (fallthroughAttrs && !isElementRoot) {
    // 合并 attrs 到根节点
    result = cloneVNode(result, fallthroughAttrs)
  }
  
  return result
}
```

## 异步组件错误

```typescript
// defineAsyncComponent 中的错误处理
load()
  .catch(err => {
    pendingRequest = null
    handleError(
      err,
      instance,
      ErrorCodes.ASYNC_COMPONENT_LOADER,
      !errorComponent
    )
  })

// 显示错误组件
if (error.value && errorComponent) {
  return createVNode(errorComponent, { error: error.value })
}
```

## setup 返回 Promise

```typescript
// async setup
async function setup() {
  const data = await fetchData()
  return { data }
}

// setupStatefulComponent 中
if (isPromise(setupResult)) {
  setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
  
  if (isSSR) {
    return setupResult.then(...)
  } else if (__FEATURE_SUSPENSE__) {
    instance.asyncDep = setupResult
  } else if (__DEV__) {
    warn(`setup() returned a Promise, but requires Suspense support`)
  }
}
```

## 循环引用

```typescript
// 组件 A 引用 B，B 引用 A
// Vue 通过 name 属性解决

// ComponentA.vue
export default {
  name: 'ComponentA',
  components: { ComponentB }
}

// ComponentB.vue
export default {
  name: 'ComponentB',
  components: { ComponentA }
}
```

## 无限更新检测

```typescript
// scheduler.ts
const RECURSION_LIMIT = 100

function flushJobs(seen?: CountMap) {
  // ...
  
  if (__DEV__) {
    seen = seen || new Map()
  }

  try {
    for (flushIndex = 0; flushIndex < queue.length; flushIndex++) {
      const job = queue[flushIndex]
      
      if (__DEV__) {
        // 检测递归更新
        checkRecursiveUpdates(seen!, job)
      }
      
      // ...
    }
  }
}

function checkRecursiveUpdates(seen: CountMap, fn: SchedulerJob) {
  if (!seen.has(fn)) {
    seen.set(fn, 1)
  } else {
    const count = seen.get(fn)!
    if (count > RECURSION_LIMIT) {
      // 超过限制，抛出错误
      const instance = fn.ownerInstance
      const componentName = instance && getComponentName(instance.type)
      warn(
        `Maximum recursive updates exceeded${
          componentName ? ` in component <${componentName}>` : ``
        }`
      )
      return true
    } else {
      seen.set(fn, count + 1)
    }
  }
  return false
}
```

## 无效的 VNode 类型

```typescript
// patch 中的类型检查
const patch: PatchFn = (
  n1,
  n2,
  container,
  // ...
) => {
  // 类型不同，卸载旧节点
  if (n1 && !isSameVNodeType(n1, n2)) {
    anchor = getNextHostNode(n1)
    unmount(n1, parentComponent, parentSuspense, true)
    n1 = null
  }

  // 处理各种类型
  const { type, ref, shapeFlag } = n2
  switch (type) {
    case Text:
    case Comment:
    case Static:
    case Fragment:
      // ...
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        // 元素
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        // 组件
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        // Teleport
      } else if (__FEATURE_SUSPENSE__ && shapeFlag & ShapeFlags.SUSPENSE) {
        // Suspense
      } else if (__DEV__) {
        warn('Invalid VNode type:', type, `(${typeof type})`)
      }
  }
}
```

## 访问已卸载组件

```typescript
// 防止访问已卸载组件
if (instance.isUnmounted) {
  return
}

// 在 asyncDep.then 中检查
instance
  .asyncDep!
  .then(asyncSetupResult => {
    if (instance.isUnmounted) {
      return
    }
    // 继续处理...
  })
```

## 热更新边界

```typescript
// HMR 处理
if (__DEV__ && instance.type.__hmrId) {
  registerHMR(instance)
}

// 卸载时取消注册
if (__DEV__ && instance.type.__hmrId) {
  unregisterHMR(instance)
}
```

## props 类型验证失败

```typescript
// 开发环境验证
if (__DEV__) {
  validateProps(rawProps || {}, props, instance)
}

function validateProps(rawProps: Data, props: Data, instance: ComponentInternalInstance) {
  const resolvedValues = toRaw(props)
  const options = instance.propsOptions[0]

  for (const key in options) {
    const opt = options[key]
    if (opt == null) continue
    
    validateProp(
      key,
      resolvedValues[key],
      opt,
      !hasOwn(rawProps, key) && !hasOwn(rawProps, hyphenate(key))
    )
  }
}
```

## 使用示例

### 优雅处理错误

```html
<template>
  <ErrorBoundary>
    <AsyncComponent />
  </ErrorBoundary>
</template>

<script>
export default {
  errorCaptured(err, instance, info) {
    console.error('Caught error:', err, info)
    this.error = err
    return false  // 阻止向上传播
  }
}
</script>
```

### 防止内存泄漏

```html
<script setup>
import { onBeforeUnmount, ref } from 'vue'

const subscription = ref(null)

onMounted(() => {
  subscription.value = someService.subscribe(data => {
    // 处理数据
  })
})

onBeforeUnmount(() => {
  // 清理订阅
  if (subscription.value) {
    subscription.value.unsubscribe()
  }
})
</script>
```

## 小结

边界情况处理的核心要点：

1. **空渲染**：使用 Comment 占位
2. **多根节点**：Fragment 包装
3. **无限更新**：RECURSION_LIMIT 检测
4. **异步错误**：错误组件和 handleError
5. **已卸载检查**：isUnmounted 标记

下一章将分析错误处理与边界。
