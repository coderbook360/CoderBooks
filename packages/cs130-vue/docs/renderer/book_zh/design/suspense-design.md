# Suspense 设计

Suspense 是 Vue 3 引入的内置组件，用于协调异步组件和异步依赖的加载状态。它让处理加载态和错误态变得声明式。

## 异步组件的挑战

在 Suspense 之前，处理异步组件的加载状态需要手动管理：

```vue
<template>
  <div v-if="loading">加载中...</div>
  <div v-else-if="error">出错了</div>
  <AsyncComponent v-else />
</template>

<script>
export default {
  data() {
    return { loading: true, error: null }
  },
  async created() {
    try {
      await this.loadData()
      this.loading = false
    } catch (e) {
      this.error = e
    }
  }
}
</script>
```

每个需要异步数据的组件都要重复这种模式。Suspense 将这个逻辑抽象出来。

## Suspense 基本用法

```vue
<template>
  <Suspense>
    <template #default>
      <AsyncComponent />
    </template>
    <template #fallback>
      <div>加载中...</div>
    </template>
  </Suspense>
</template>
```

Suspense 有两个插槽：
- `default`：异步内容
- `fallback`：加载时显示的后备内容

## 异步依赖

Suspense 追踪其子树中的异步依赖。异步依赖包括：

1. **带 async setup 的组件**：

```javascript
export default {
  async setup() {
    const data = await fetchData()
    return { data }
  }
}
```

2. **顶层 await（script setup）**：

```vue
<script setup>
const data = await fetchData()
</script>
```

当所有异步依赖都 resolve 后，Suspense 从 fallback 切换到 default。

## 内部状态机

Suspense 维护一个状态机：

```javascript
const SuspenseState = {
  PENDING: 'pending',    // 初始状态，显示 fallback
  RESOLVED: 'resolved',  // 异步完成，显示 default
  FALLBACK: 'fallback'   // 回退到 fallback（更新时）
}
```

状态转换：

```
初始 --> PENDING（显示 fallback）
           |
           v
      异步完成
           |
           v
       RESOLVED（显示 default）
           |
           v
      子树更新触发新异步
           |
           v
       FALLBACK（可选择显示 fallback 或保持旧内容）
```

## 异步计数

Suspense 通过计数追踪未完成的异步依赖：

```javascript
function createSuspenseBoundary(vnode, parent, container) {
  const suspense = {
    vnode,
    parent,
    container,
    deps: 0,           // 未完成的异步依赖数
    subTree: null,     // 已渲染的子树
    fallbackTree: null,
    resolve() { /* ... */ },
    fallback() { /* ... */ },
    pendingId: 0       // 用于取消过时的异步
  }
  
  return suspense
}
```

每个异步组件在 setup 时增加计数，完成时减少：

```javascript
function setupComponent(instance) {
  const suspense = instance.suspense
  
  if (isAsyncSetup) {
    suspense.deps++
    
    setupResult.then(result => {
      suspense.deps--
      if (suspense.deps === 0) {
        suspense.resolve()
      }
    })
  }
}
```

## 渲染流程

**初始渲染**：

```javascript
function mountSuspense(vnode, container) {
  const suspense = createSuspenseBoundary(vnode)
  
  // 先渲染 fallback
  const fallbackVNode = vnode.props.fallback
  mount(fallbackVNode, container)
  suspense.fallbackTree = fallbackVNode
  
  // 异步渲染 default（离屏）
  const defaultVNode = vnode.props.default
  mount(defaultVNode, hiddenContainer)
  suspense.subTree = defaultVNode
  
  // 等待异步完成后切换
}
```

**resolve 后**：

```javascript
function resolveSuspense(suspense) {
  const { subTree, fallbackTree, container } = suspense
  
  // 卸载 fallback
  unmount(fallbackTree)
  
  // 将离屏渲染的内容移到真实容器
  move(subTree, container)
  
  suspense.isResolved = true
}
```

## timeout 属性

Suspense 支持 timeout，超时后显示 fallback（即使异步未完成）：

```vue
<Suspense :timeout="3000">
  <AsyncComponent />
  <template #fallback>
    加载超时...
  </template>
</Suspense>
```

实现上通过 setTimeout 设置：

```javascript
function mountSuspense(vnode, container) {
  const timeout = vnode.props.timeout
  
  if (typeof timeout === 'number') {
    setTimeout(() => {
      if (!suspense.isResolved) {
        suspense.fallback()
      }
    }, timeout)
  }
}
```

## 嵌套 Suspense

Suspense 可以嵌套，每层独立管理状态：

```vue
<Suspense>
  <template #default>
    <div>
      外层内容
      <Suspense>
        <template #default>
          <DeepAsyncComponent />
        </template>
        <template #fallback>
          内层加载中...
        </template>
      </Suspense>
    </div>
  </template>
  <template #fallback>
    外层加载中...
  </template>
</Suspense>
```

子 Suspense 的异步不会阻塞父 Suspense。父 Suspense 只关心直接子树中的异步依赖。

## 错误处理

Suspense 配合 onErrorCaptured 处理错误：

```vue
<script setup>
import { onErrorCaptured, ref } from 'vue'

const error = ref(null)

onErrorCaptured((e) => {
  error.value = e
  return false // 阻止继续传播
})
</script>

<template>
  <div v-if="error">{{ error.message }}</div>
  <Suspense v-else>
    <AsyncComponent />
    <template #fallback>加载中...</template>
  </Suspense>
</template>
```

## 与 Transition 配合

Suspense 可以和 Transition 配合实现平滑切换：

```vue
<Suspense>
  <template #default>
    <Transition name="fade" mode="out-in">
      <AsyncComponent :key="id" />
    </Transition>
  </template>
  <template #fallback>
    <div>加载中...</div>
  </template>
</Suspense>
```

## 更新时的行为

当 Suspense 内的组件更新触发新的异步依赖时：

```javascript
function patchSuspense(n1, n2) {
  const suspense = n2.suspense = n1.suspense
  
  // 增加 pendingId，使过时的 resolve 失效
  suspense.pendingId++
  
  // 重新渲染子树
  patch(n1.children, n2.children, hiddenContainer)
  
  if (suspense.deps > 0) {
    // 有新的异步依赖
    // 可以选择：保持旧内容 或 显示 fallback
  }
}
```

Vue 3 的策略是保持旧内容直到新内容就绪，避免 UI 闪烁。

## 实现要点

**离屏渲染**：default 内容在隐藏容器中渲染，完成后移动到真实 DOM。这确保用户不会看到半完成的内容。

```javascript
const hiddenContainer = document.createElement('div')
// 渲染到 hiddenContainer
// resolve 后移动节点
```

**取消过时操作**：使用递增的 pendingId，只有最新的异步操作能触发 resolve：

```javascript
const currentPendingId = ++suspense.pendingId

asyncOperation.then(() => {
  if (suspense.pendingId !== currentPendingId) {
    return // 已过时，忽略
  }
  suspense.resolve()
})
```

## 局限性

1. **仅支持单根节点**：default 插槽需要单个根节点
2. **不能跨 Teleport**：Suspense 边界不能跨越 Teleport
3. **SSR 复杂性**：服务端渲染时需要特殊处理
4. **调试困难**：异步边界使状态追踪变复杂

## 小结

Suspense 通过声明式的方式处理异步加载状态，消除了手动管理 loading/error 的样板代码。它的核心是追踪异步依赖计数，协调 fallback 和 default 内容的切换。

理解 Suspense 的状态机和渲染流程，有助于在复杂场景下正确使用它。
