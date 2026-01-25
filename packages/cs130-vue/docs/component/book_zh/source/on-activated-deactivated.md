# onActivated 与 onDeactivated

这两个钩子专门用于 KeepAlive 缓存的组件。当组件被激活或停用时调用，替代了正常的挂载和卸载钩子。

## KeepAlive 工作原理

```html
<KeepAlive>
  <component :is="currentComponent" />
</KeepAlive>
```

切换组件时：
- 旧组件不卸载，只是停用（移出 DOM 但保留实例）
- 新组件不重新创建，只是激活（移回 DOM）

## 钩子对比

| 场景 | 普通组件 | KeepAlive 组件 |
|------|----------|----------------|
| 进入 | mounted | activated |
| 离开 | unmounted | deactivated |

## 源码分析

在 KeepAlive 的 `activate` 和 `deactivate` 中：

```typescript
// activate
function activate(
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean,
  optimized: boolean
) {
  const instance = vnode.component!
  
  // 移回 DOM
  move(vnode, container, anchor, MoveType.ENTER, null)
  
  // 更新 props（可能变化了）
  patch(
    instance.vnode,
    vnode,
    container,
    anchor,
    instance,
    parentSuspense,
    isSVG,
    vnode.slotScopeIds,
    optimized
  )
  
  // 异步调用 activated 钩子
  queuePostRenderEffect(() => {
    instance.isDeactivated = false
    if (instance.a) {
      invokeArrayFns(instance.a)
    }
    // VNode 钩子
    const vnodeHook = vnode.props && vnode.props.onVnodeMounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
  }, parentSuspense)
}
```

```typescript
// deactivate
function deactivate(vnode: VNode) {
  const instance = vnode.component!
  
  // 移出 DOM（但不销毁）
  move(vnode, storageContainer, null, MoveType.LEAVE, null)
  
  // 异步调用 deactivated 钩子
  queuePostRenderEffect(() => {
    if (instance.da) {
      invokeArrayFns(instance.da)
    }
    // VNode 钩子
    const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
    instance.isDeactivated = true
  }, parentSuspense)
}
```

## onActivated

组件被激活时调用：

```javascript
import { onActivated, onDeactivated } from 'vue'

setup() {
  onActivated(() => {
    console.log('组件激活')
    // 恢复状态、重新获取数据等
  })
}
```

## onDeactivated

组件被停用时调用：

```javascript
setup() {
  onDeactivated(() => {
    console.log('组件停用')
    // 暂停操作、保存状态等
  })
}
```

## 典型使用场景

### 恢复滚动位置

```javascript
setup() {
  const scrollTop = ref(0)
  const containerRef = ref(null)
  
  onActivated(() => {
    // 恢复滚动位置
    containerRef.value.scrollTop = scrollTop.value
  })
  
  onDeactivated(() => {
    // 保存滚动位置
    scrollTop.value = containerRef.value.scrollTop
  })
  
  return { containerRef }
}
```

### 暂停/恢复视频

```javascript
setup() {
  const videoRef = ref(null)
  
  onActivated(() => {
    videoRef.value?.play()
  })
  
  onDeactivated(() => {
    videoRef.value?.pause()
  })
  
  return { videoRef }
}
```

### 暂停定时轮询

```javascript
setup() {
  let timer = null
  
  function startPolling() {
    timer = setInterval(fetchData, 5000)
  }
  
  function stopPolling() {
    clearInterval(timer)
    timer = null
  }
  
  onMounted(startPolling)
  onActivated(startPolling)
  onDeactivated(stopPolling)
  onUnmounted(stopPolling)
}
```

### 刷新数据

```javascript
setup() {
  const data = ref(null)
  
  async function refresh() {
    data.value = await fetchData()
  }
  
  onMounted(refresh)
  
  onActivated(() => {
    // 每次激活时检查是否需要刷新
    if (shouldRefresh()) {
      refresh()
    }
  })
}
```

## 与 mounted/unmounted 的关系

首次进入时两个都会触发：

```javascript
setup() {
  onMounted(() => console.log('mounted'))
  onActivated(() => console.log('activated'))
}

// 首次进入：
// mounted
// activated

// 再次激活（从缓存）：
// activated（不会触发 mounted）
```

## 子组件的钩子

子组件也会收到这些钩子：

```html
<!-- Parent（被 KeepAlive 缓存） -->
<template>
  <Child />
</template>

<script setup>
onActivated(() => console.log('Parent activated'))
</script>

<!-- Child -->
<script setup>
onActivated(() => console.log('Child activated'))
</script>
```

激活时：
```
Parent activated
Child activated
```

## isDeactivated 标记

组件实例上的状态标记：

```typescript
// deactivate 后
instance.isDeactivated = true

// activate 后
instance.isDeactivated = false
```

可用于检查组件状态：

```javascript
setup() {
  const instance = getCurrentInstance()
  
  async function fetchData() {
    const data = await api.getData()
    
    // 检查是否已停用
    if (!instance.isDeactivated) {
      state.value = data
    }
  }
}
```

## KeepAlive 的 include/exclude

只有匹配的组件才会被缓存：

```html
<KeepAlive include="Home,About">
  <component :is="currentComponent" />
</KeepAlive>
```

不匹配的组件走正常的 mount/unmount 流程。

## max 限制

超出缓存数量时，最旧的组件被销毁：

```html
<KeepAlive :max="5">
  <component :is="currentComponent" />
</KeepAlive>
```

被清除的组件会触发 onUnmounted。

## 注册方式

```typescript
export const onActivated = (
  hook: Function,
  target?: ComponentInternalInstance | null
) => {
  registerKeepAliveHook(hook, LifecycleHooks.ACTIVATED, target)
}

export const onDeactivated = (
  hook: Function,
  target?: ComponentInternalInstance | null
) => {
  registerKeepAliveHook(hook, LifecycleHooks.DEACTIVATED, target)
}
```

使用专门的注册函数，确保在 KeepAlive 上下文中正确工作。

## 递归激活

嵌套组件需要递归激活：

```typescript
// 激活时递归调用子组件的 activated 钩子
function queueActivatedHook(component: ComponentInternalInstance) {
  if (component.a) {
    invokeArrayFns(component.a)
  }
  
  // 递归子组件
  if (component.subTree) {
    queueActivatedHook(component.subTree.component!)
  }
}
```

## 小结

activated/deactivated 钩子的要点：

| 特性 | onActivated | onDeactivated |
|------|-------------|---------------|
| 触发时机 | 从缓存恢复 | 被缓存（移出 DOM） |
| 首次渲染 | 触发 | 不触发 |
| 同步/异步 | 异步 | 异步 |
| 使用场景 | 恢复状态、刷新数据 | 保存状态、暂停任务 |

这两个钩子是 KeepAlive 优化用户体验的关键，让缓存的组件能正确管理自己的状态。

下一章将分析 watch effect 的清理机制。
