# KeepAlive 组件源码

KeepAlive 是 Vue 3 的内置组件，用于缓存动态组件实例，避免重复创建和销毁。本章分析其核心实现。

## 组件定义

```typescript
// packages/runtime-core/src/components/KeepAlive.ts
const KeepAliveImpl: ComponentOptions = {
  name: 'KeepAlive',
  __isKeepAlive: true,

  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },

  setup(props: KeepAliveProps, { slots }: SetupContext) {
    const instance = getCurrentInstance()!
    const sharedContext = instance.ctx as KeepAliveContext

    // 缓存相关
    const cache: Cache = new Map()
    const keys: Keys = new Set()
    let current: VNode | null = null

    // 生命周期处理
    let pendingCacheKey: CacheKey | null = null
    
    const cacheSubtree = () => {
      if (pendingCacheKey != null) {
        cache.set(pendingCacheKey, getInnerChild(instance.subTree))
      }
    }
    
    onMounted(cacheSubtree)
    onUpdated(cacheSubtree)

    onBeforeUnmount(() => {
      cache.forEach(cached => {
        // 卸载所有缓存
      })
    })

    return () => {
      // 渲染逻辑
    }
  }
}

export const KeepAlive = KeepAliveImpl as any as {
  __isKeepAlive: true
  new (): {
    $props: VNodeProps & KeepAliveProps
  }
}
```

## KeepAliveProps 定义

```typescript
export interface KeepAliveProps {
  include?: MatchPattern
  exclude?: MatchPattern
  max?: number | string
}

type MatchPattern = string | RegExp | (string | RegExp)[]
type CacheKey = string | number | symbol | ConcreteComponent
type Cache = Map<CacheKey, VNode>
type Keys = Set<CacheKey>
```

## KeepAliveContext 共享上下文

```typescript
export interface KeepAliveContext extends ComponentRenderContext {
  renderer: RendererInternals
  activate: (
    vnode: VNode,
    container: RendererElement,
    anchor: RendererNode | null,
    isSVG: boolean,
    optimized: boolean
  ) => void
  deactivate: (vnode: VNode) => void
}
```

## 渲染逻辑

```typescript
return () => {
  pendingCacheKey = null

  if (!slots.default) {
    return null
  }

  const children = slots.default()
  const rawVNode = children[0]
  
  if (children.length > 1) {
    // ⭐ KeepAlive 只能有一个子节点
    if (__DEV__) {
      warn(`KeepAlive should contain exactly one component child.`)
    }
    current = null
    return children
  }

  // 不是组件类型
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

  // 获取组件名
  const name = getComponentName(
    isAsyncWrapper(vnode)
      ? (vnode.type as AsyncComponentOptions).__asyncResolved || {}
      : comp
  )

  const { include, exclude, max } = props

  // ⭐ 检查 include/exclude
  if (
    (include && (!name || !matches(include, name))) ||
    (exclude && name && matches(exclude, name))
  ) {
    current = vnode
    return rawVNode
  }

  const key = vnode.key == null ? comp : vnode.key
  const cachedVNode = cache.get(key)

  // 打上 KeepAlive 标记
  vnode.el = null
  if (cachedVNode) {
    // ⭐ 命中缓存
    vnode.el = cachedVNode.el
    vnode.component = cachedVNode.component
    
    if (vnode.transition) {
      setTransitionHooks(vnode, vnode.transition!)
    }
    
    // 标记为 kept-alive
    vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
    
    // 更新 keys 顺序 (LRU)
    keys.delete(key)
    keys.add(key)
  } else {
    // ⭐ 新增缓存
    keys.add(key)
    
    // 超出 max 限制，删除最旧的
    if (max && keys.size > parseInt(max as string, 10)) {
      pruneCacheEntry(keys.values().next().value)
    }
  }

  // 标记不应该被卸载
  vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE

  current = vnode
  pendingCacheKey = key
  
  return isSuspense(rawVNode.type) ? rawVNode : vnode
}
```

## matches 匹配函数

```typescript
function matches(pattern: MatchPattern, name: string): boolean {
  if (isArray(pattern)) {
    return pattern.some((p: string | RegExp) => matches(p, name))
  } else if (isString(pattern)) {
    return pattern.split(',').includes(name)
  } else if (isRegExp(pattern)) {
    return pattern.test(name)
  }
  return false
}
```

## pruneCacheEntry 删除缓存

```typescript
function pruneCacheEntry(key: CacheKey) {
  const cached = cache.get(key)!
  
  if (!current || cached.type !== current.type) {
    // 不是当前组件，直接卸载
    unmount(cached)
  } else if (current) {
    // 是当前组件，重置 keep-alive 状态
    resetShapeFlag(current)
  }
  
  cache.delete(key)
  keys.delete(key)
}
```

## resetShapeFlag 重置标记

```typescript
function resetShapeFlag(vnode: VNode) {
  let shapeFlag = vnode.shapeFlag
  
  if (shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
  }
  if (shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
    shapeFlag -= ShapeFlags.COMPONENT_KEPT_ALIVE
  }
  
  vnode.shapeFlag = shapeFlag
}
```

## getInnerChild 获取内部子节点

```typescript
function getInnerChild(vnode: VNode) {
  return vnode.shapeFlag & ShapeFlags.SUSPENSE
    ? vnode.ssContent!
    : vnode
}
```

## 注入 activate/deactivate

```typescript
// 在 renderer.ts 中注入
if (isKeepAlive(parentVNode)) {
  ;(instance.ctx as KeepAliveContext).renderer = internals
}

// KeepAlive 的 activate
const sharedContext = instance.ctx as KeepAliveContext
sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
  const instance = vnode.component!
  move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
  
  // 可能 props 变化了
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
    const vnodeHook = vnode.props && vnode.props.onVnodeMounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
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
    const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
    instance.isDeactivated = true
  }, parentSuspense)
}
```

## ShapeFlags 标记

```typescript
export const enum ShapeFlags {
  // ...
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,  // 256
  COMPONENT_KEPT_ALIVE = 1 << 9,          // 512
}
```

## 使用示例

### 基础用法

```vue
<template>
  <KeepAlive>
    <component :is="currentComponent" />
  </KeepAlive>
</template>
```

### include/exclude

```vue
<template>
  <!-- 字符串 -->
  <KeepAlive include="a,b">
    <component :is="view" />
  </KeepAlive>

  <!-- 正则 -->
  <KeepAlive :include="/a|b/">
    <component :is="view" />
  </KeepAlive>

  <!-- 数组 -->
  <KeepAlive :include="['a', 'b']">
    <component :is="view" />
  </KeepAlive>
</template>
```

### max 限制

```vue
<template>
  <KeepAlive :max="10">
    <component :is="view" />
  </KeepAlive>
</template>
```

## 小结

KeepAlive 组件源码的核心要点：

1. **缓存机制**：Map 存储 VNode，Set 维护 keys
2. **LRU 算法**：超出 max 时删除最旧的
3. **ShapeFlags**：标记 keep-alive 状态
4. **activate/deactivate**：激活和停用逻辑
5. **include/exclude**：控制缓存范围

下一章将分析 KeepAlive 的缓存机制。
