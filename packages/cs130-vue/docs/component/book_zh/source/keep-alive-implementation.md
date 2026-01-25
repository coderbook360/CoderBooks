# KeepAlive 组件实现

KeepAlive 是 Vue 的内置组件，用于缓存动态组件的实例。它通过保留组件的 DOM 和状态，避免重复创建和销毁，提升性能和用户体验。

## 基本用法

```vue
<template>
  <KeepAlive>
    <component :is="currentComponent" />
  </KeepAlive>
</template>
```

切换组件时，旧组件被缓存而非销毁，新组件优先从缓存恢复。

## 组件定义

```typescript
const KeepAliveImpl: ComponentOptions = {
  name: `KeepAlive`,

  // 标记为 KeepAlive 组件
  __isKeepAlive: true,

  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },

  setup(props: KeepAliveProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    const sharedContext = instance.ctx as KeepAliveContext

    // 缓存 Map
    const cache: Cache = new Map()
    const keys: Keys = new Set()

    // 当前组件
    let current: VNode | null = null

    // 获取渲染器方法
    const parentSuspense = instance.suspense
    const {
      renderer: {
        p: patch,
        m: move,
        um: _unmount,
        o: { createElement }
      }
    } = sharedContext

    // 隐藏容器
    const storageContainer = createElement('div')

    // 激活和停用方法
    sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
      const instance = vnode.component!
      move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
      // props 可能变化，需要 patch
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
      queuePostRenderEffect(() => {
        instance.isDeactivated = false
        if (instance.a) {
          invokeArrayFns(instance.a)
        }
      }, parentSuspense)
    }

    sharedContext.deactivate = (vnode: VNode) => {
      const instance = vnode.component!
      move(vnode, storageContainer, null, MoveType.LEAVE, parentSuspense)
      queuePostRenderEffect(() => {
        if (instance.da) {
          invokeArrayFns(instance.da)
        }
        instance.isDeactivated = true
      }, parentSuspense)
    }

    // 缓存修剪
    function pruneCache(filter?: (name: string) => boolean) {
      cache.forEach((vnode, key) => {
        const name = getComponentName(vnode.type as ConcreteComponent)
        if (name && (!filter || !filter(name))) {
          pruneCacheEntry(key)
        }
      })
    }

    function pruneCacheEntry(key: CacheKey) {
      const cached = cache.get(key) as VNode
      if (!current || cached.type !== current.type) {
        unmount(cached)
      } else if (current) {
        resetShapeFlag(current)
      }
      cache.delete(key)
      keys.delete(key)
    }

    // 监听 include/exclude 变化
    watch(
      () => [props.include, props.exclude],
      ([include, exclude]) => {
        include && pruneCache(name => matches(include, name))
        exclude && pruneCache(name => !matches(exclude, name))
      },
      { flush: 'post', deep: true }
    )

    // 卸载时清理所有缓存
    onBeforeUnmount(() => {
      cache.forEach(cached => {
        const { subTree, suspense } = instance
        const vnode = getInnerChild(subTree)
        if (cached.type === vnode.type) {
          resetShapeFlag(vnode)
          const da = vnode.component!.da
          da && queuePostRenderEffect(da, suspense)
          return
        }
        unmount(cached)
      })
    })

    // 渲染函数
    return () => {
      if (!slots.default) {
        return null
      }

      const children = slots.default()
      const rawVNode = children[0]
      
      if (children.length > 1) {
        current = null
        return children
      }

      if (
        !isVNode(rawVNode) ||
        (!(rawVNode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) &&
          !(rawVNode.shapeFlag & ShapeFlags.SUSPENSE))
      ) {
        current = null
        return rawVNode
      }

      let vnode = getInnerChild(rawVNode)
      const comp = vnode.type as ConcreteComponent

      const name = getComponentName(comp)

      const { include, exclude, max } = props

      // 检查是否应该缓存
      if (
        (include && (!name || !matches(include, name))) ||
        (exclude && name && matches(exclude, name))
      ) {
        current = vnode
        return rawVNode
      }

      const key = vnode.key == null ? comp : vnode.key
      const cachedVNode = cache.get(key)

      if (cachedVNode) {
        // 有缓存，复用
        vnode.el = cachedVNode.el
        vnode.component = cachedVNode.component
        
        // 标记为 COMPONENT_KEPT_ALIVE
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        
        // 更新 LRU 顺序
        keys.delete(key)
        keys.add(key)
      } else {
        // 无缓存，添加
        keys.add(key)
        // 超出 max，删除最旧的
        if (max && keys.size > parseInt(max as string, 10)) {
          pruneCacheEntry(keys.values().next().value)
        }
      }

      // 标记为 COMPONENT_SHOULD_KEEP_ALIVE
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

      current = vnode
      return isSuspense(rawVNode.type) ? rawVNode : vnode
    }
  }
}
```

## 核心数据结构

```typescript
// 缓存 Map：key -> VNode
const cache: Cache = new Map()

// 键集合（用于 LRU）
const keys: Keys = new Set()
```

## 缓存策略

使用 LRU（最近最少使用）策略：

```typescript
// 有缓存时，更新访问顺序
keys.delete(key)
keys.add(key)

// 超出限制，删除最旧的
if (max && keys.size > parseInt(max as string, 10)) {
  pruneCacheEntry(keys.values().next().value)
}
```

Set 保持插入顺序，最旧的在最前面。

## 激活流程

```typescript
sharedContext.activate = (vnode, container, anchor) => {
  const instance = vnode.component!
  
  // 1. 从隐藏容器移回真实 DOM
  move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
  
  // 2. 更新 props（可能变化了）
  patch(instance.vnode, vnode, container, anchor, instance, ...)
  
  // 3. 调用 activated 钩子
  queuePostRenderEffect(() => {
    instance.isDeactivated = false
    if (instance.a) {
      invokeArrayFns(instance.a)
    }
  }, parentSuspense)
}
```

## 停用流程

```typescript
sharedContext.deactivate = (vnode: VNode) => {
  const instance = vnode.component!
  
  // 1. 移到隐藏容器
  move(vnode, storageContainer, null, MoveType.LEAVE, parentSuspense)
  
  // 2. 调用 deactivated 钩子
  queuePostRenderEffect(() => {
    if (instance.da) {
      invokeArrayFns(instance.da)
    }
    instance.isDeactivated = true
  }, parentSuspense)
}
```

## 隐藏容器

```typescript
const storageContainer = createElement('div')
```

一个脱离文档的 div，用于存放被缓存的 DOM。

## shapeFlag 标记

```typescript
// 应该被缓存（新组件）
vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

// 已缓存（从缓存恢复）
vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
```

渲染器通过这些标记决定是创建/激活还是销毁/停用。

## include/exclude

匹配逻辑：

```typescript
function matches(pattern: MatchPattern, name: string): boolean {
  if (isArray(pattern)) {
    return pattern.some((p: string | RegExp) => matches(p, name))
  } else if (isString(pattern)) {
    return pattern.split(',').includes(name)
  } else if (pattern.test) {
    return pattern.test(name)
  }
  return false
}
```

支持：
- 字符串：`"Home,About"`
- 正则：`/^Home/`
- 数组：`['Home', /^About/]`

## 动态 include/exclude

```typescript
watch(
  () => [props.include, props.exclude],
  ([include, exclude]) => {
    include && pruneCache(name => matches(include, name))
    exclude && pruneCache(name => !matches(exclude, name))
  },
  { flush: 'post', deep: true }
)
```

include/exclude 变化时，清理不再匹配的缓存。

## 渲染器集成

在 `processComponent` 中：

```typescript
function processComponent(n1, n2, container, ...) {
  if (n1 == null) {
    // 挂载
    if (n2.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
      // 从缓存激活
      ;(parentComponent!.ctx as KeepAliveContext).activate(
        n2, container, anchor, isSVG, optimized
      )
    } else {
      mountComponent(n2, container, ...)
    }
  } else {
    updateComponent(n1, n2, ...)
  }
}
```

在 `unmount` 中：

```typescript
function unmount(vnode, ...) {
  // ...
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    // 停用而非卸载
    ;(parentComponent!.ctx as KeepAliveContext).deactivate(vnode)
    return
  }
  // 正常卸载...
}
```

## 小结

KeepAlive 的实现要点：

1. **缓存管理**：Map 存储 VNode，Set 维护 LRU 顺序
2. **隐藏容器**：脱离文档的 DOM 容器
3. **ShapeFlag 标记**：指示渲染器激活/停用
4. **钩子调用**：activated/deactivated
5. **动态过滤**：响应 include/exclude 变化

KeepAlive 在框架层面实现了组件缓存，对开发者完全透明。

下一章将分析 Teleport 的实现。
