# KeepAlive 激活与停用

本章分析 KeepAlive 组件的 activate 和 deactivate 逻辑，以及它们与渲染器的协作。

## ShapeFlags 标记

```typescript
export const enum ShapeFlags {
  // ...
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,  // 应该被缓存
  COMPONENT_KEPT_ALIVE = 1 << 9,          // 已被缓存
}

// 渲染时设置标记
vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
if (cachedVNode) {
  vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
}
```

## 渲染器中的处理

```typescript
// renderer.ts
const processComponent = (
  n1: VNode | null,
  n2: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  if (n1 == null) {
    // ⭐ 检查是否是 kept-alive 组件
    if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
      // 激活而不是挂载
      ;(parentComponent!.ctx as KeepAliveContext).activate(
        n2,
        container,
        anchor,
        isSVG,
        optimized
      )
    } else {
      mountComponent(
        n2,
        container,
        anchor,
        parentComponent,
        parentSuspense,
        isSVG,
        optimized
      )
    }
  } else {
    updateComponent(n1, n2, optimized)
  }
}
```

## activate 激活逻辑

```typescript
sharedContext.activate = (
  vnode: VNode,
  container: RendererElement,
  anchor: RendererNode | null,
  isSVG: boolean,
  optimized: boolean
) => {
  const instance = vnode.component!
  
  // ⭐ 从存储容器移动到目标容器
  move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
  
  // ⭐ patch 处理 props 变化
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
  
  // ⭐ 异步执行 activated 钩子
  queuePostRenderEffect(() => {
    instance.isDeactivated = false
    
    // 执行 onActivated 钩子
    if (instance.a) {
      invokeArrayFns(instance.a)
    }
    
    // 执行 vnode 钩子
    const vnodeHook = vnode.props && vnode.props.onVnodeMounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
  }, parentSuspense)
  
  // 开发工具
  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentAdded(instance)
  }
}
```

## deactivate 停用逻辑

```typescript
// 存储容器
const storageContainer = createElement('div')

sharedContext.deactivate = (vnode: VNode) => {
  const instance = vnode.component!
  
  // ⭐ 移动到存储容器（不销毁 DOM）
  move(vnode, storageContainer, null, MoveType.LEAVE, parentSuspense)
  
  // ⭐ 异步执行 deactivated 钩子
  queuePostRenderEffect(() => {
    // 执行 onDeactivated 钩子
    if (instance.da) {
      invokeArrayFns(instance.da)
    }
    
    // 执行 vnode 钩子
    const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
    
    instance.isDeactivated = true
  }, parentSuspense)
  
  // 开发工具
  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentAdded(instance)
  }
}
```

## unmount 中的处理

```typescript
const unmount = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  doRemove: boolean = false,
  optimized: boolean = false
) => {
  const { shapeFlag } = vnode

  // ⭐ 检查是否应该 keep-alive
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    // 停用而不是卸载
    ;(parentComponent!.ctx as KeepAliveContext).deactivate(vnode)
    return
  }

  // 正常卸载逻辑
  // ...
}
```

## 组件实例状态

```typescript
interface ComponentInternalInstance {
  // ...
  isDeactivated: boolean  // 是否处于停用状态
  a: LifecycleHook        // activated 钩子数组
  da: LifecycleHook       // deactivated 钩子数组
}
```

## 激活时的 props 更新

```typescript
// activate 中调用 patch
patch(
  instance.vnode,  // 旧 vnode
  vnode,           // 新 vnode
  container,
  anchor,
  instance,
  parentSuspense,
  isSVG,
  vnode.slotScopeIds,
  optimized
)
```

这确保了激活时 props 的变化能被正确处理。

## 子组件的递归处理

```typescript
// 停用时递归处理子组件
function deactivateRecursive(vnode: VNode) {
  const instance = vnode.component!
  
  // 执行当前组件的 deactivated
  if (instance.da) {
    invokeArrayFns(instance.da)
  }
  
  instance.isDeactivated = true
  
  // 递归处理子组件
  const children = instance.subTree.children
  if (children) {
    for (let i = 0; i < children.length; i++) {
      const child = children[i]
      if (child.component) {
        deactivateRecursive(child)
      }
    }
  }
}
```

## 与 Transition 的配合

```typescript
// 激活时处理 transition
sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
  const instance = vnode.component!
  
  // 如果有 transition，设置钩子
  if (vnode.transition) {
    setTransitionHooks(vnode, vnode.transition!)
  }
  
  move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
  // ...
}
```

## 使用示例

### 基础激活/停用

```html
<template>
  <KeepAlive>
    <component :is="currentView" />
  </KeepAlive>
</template>

<script>
export default {
  activated() {
    console.log('Component activated')
    // 恢复状态，如重新获取数据
  },
  deactivated() {
    console.log('Component deactivated')
    // 暂停操作，如停止定时器
  }
}
</script>
```

### Composition API

```html
<script setup>
import { onActivated, onDeactivated } from 'vue'

onActivated(() => {
  console.log('Activated')
})

onDeactivated(() => {
  console.log('Deactivated')
})
</script>
```

### 配合 Transition

```html
<template>
  <router-view v-slot="{ Component }">
    <Transition name="fade">
      <KeepAlive>
        <component :is="Component" />
      </KeepAlive>
    </Transition>
  </router-view>
</template>
```

## 生命周期顺序

首次渲染：
1. setup
2. onBeforeMount
3. onMounted
4. onActivated

切换离开：
1. onDeactivated

再次激活：
1. onActivated

## 小结

KeepAlive 激活与停用的核心要点：

1. **标记判断**：通过 ShapeFlags 判断处理方式
2. **存储容器**：停用时移到隐藏容器保留 DOM
3. **activate**：移动 DOM + patch props + 执行钩子
4. **deactivate**：移动 DOM + 执行钩子 + 设置状态
5. **异步钩子**：activated/deactivated 在 postFlush 执行

下一章将分析 onActivated/onDeactivated 钩子。
