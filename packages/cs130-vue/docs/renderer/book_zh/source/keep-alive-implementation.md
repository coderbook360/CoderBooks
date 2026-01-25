# KeepAlive 源码解析

KeepAlive 是 Vue 的内置组件，用于缓存动态组件实例以避免重复创建和销毁。它在需要频繁切换的场景下能显著提升性能，同时保留组件的内部状态。与 Teleport 和 Suspense 类似，KeepAlive 在渲染器中有专门的处理逻辑。

## 组件定义

KeepAlive 的实现基于普通组件机制，但带有特殊的 `__isKeepAlive` 标记：

```typescript
const KeepAliveImpl: ComponentOptions = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  
  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },
  
  setup(props: KeepAliveProps, { slots }: SetupContext) {
    // 获取当前渲染实例
    const instance = getCurrentInstance()!
    const sharedContext = instance.ctx as KeepAliveContext
    
    // 缓存相关数据结构
    const cache: Cache = new Map()
    const keys: Keys = new Set()
    let current: VNode | null = null
    
    // 注册 activated 和 deactivated 的实现
    sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
      // activate 实现
    }
    
    sharedContext.deactivate = (vnode) => {
      // deactivate 实现
    }
    
    // setup 返回渲染函数
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

组件通过 props 接收三个配置：include 指定要缓存的组件、exclude 指定不缓存的组件、max 限制缓存的最大数量。setup 函数中创建了缓存 Map 和键集合，以及 activate 和 deactivate 两个核心方法。

## 缓存机制

KeepAlive 使用 Map 存储缓存的组件 VNode，使用 Set 维护 LRU 顺序：

```typescript
type CacheKey = string | number | symbol | ConcreteComponent
type Cache = Map<CacheKey, VNode>
type Keys = Set<CacheKey>

const cache: Cache = new Map()
const keys: Keys = new Set()

// 获取组件的缓存 key
function getComponentKey(vnode: VNode): CacheKey {
  const { type, key } = vnode
  return key == null ? type : key
}
```

缓存键的设计很巧妙：如果组件有 key 属性就用 key，否则用组件类型本身。这意味着同一个组件的不同实例（通过不同 key 区分）可以分别缓存。

LRU 策略通过 Set 的插入顺序实现——每次访问时先删除再添加，最近使用的就在 Set 末尾，超出 max 时移除 Set 开头的元素。

## 渲染逻辑

setup 返回的渲染函数负责处理子组件的渲染和缓存：

```typescript
return () => {
  pendingCacheKey = null
  
  if (!slots.default) {
    return null
  }
  
  // 获取 default 插槽的子节点
  const children = slots.default()
  const rawVNode = children[0]
  
  // 只能有一个子组件
  if (children.length > 1) {
    if (__DEV__) {
      warn('KeepAlive should contain exactly one component child.')
    }
    current = null
    return children
  }
  
  // 子节点必须是组件
  if (
    !isVNode(rawVNode) ||
    (!(rawVNode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT) &&
      !(rawVNode.shapeFlag & ShapeFlags.SUSPENSE))
  ) {
    current = null
    return rawVNode
  }
  
  // 获取实际的组件 VNode（处理 Suspense 包装的情况）
  let vnode = getInnerChild(rawVNode)
  const comp = vnode.type as ConcreteComponent
  
  // 获取组件名称用于 include/exclude 匹配
  const name = getComponentName(
    isAsyncWrapper(vnode)
      ? (vnode.type as ComponentOptions).__asyncResolved || {}
      : comp
  )
  
  const { include, exclude, max } = props
  
  // 检查是否应该缓存
  if (
    (include && (!name || !matches(include, name))) ||
    (exclude && name && matches(exclude, name))
  ) {
    // 不缓存
    current = vnode
    return rawVNode
  }
  
  const key = getComponentKey(vnode)
  const cachedVNode = cache.get(key)
  
  // 克隆 vnode，避免被后续操作污染
  if (vnode.el) {
    vnode = cloneVNode(vnode)
    if (rawVNode.shapeFlag & ShapeFlags.SUSPENSE) {
      rawVNode.ssContent = vnode
    }
  }
  
  // 记录待缓存的 key
  pendingCacheKey = key
  
  if (cachedVNode) {
    // 命中缓存，复用组件实例
    vnode.el = cachedVNode.el
    vnode.component = cachedVNode.component
    
    // 标记为 COMPONENT_KEPT_ALIVE
    vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
    
    // LRU 更新：删除再添加
    keys.delete(key)
    keys.add(key)
  } else {
    // 未命中缓存，添加到缓存
    keys.add(key)
    
    // 检查是否超过 max
    if (max && keys.size > parseInt(max as string, 10)) {
      // 移除最久未使用的
      pruneCacheEntry(keys.values().next().value)
    }
  }
  
  // 标记为需要保活
  vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
  
  current = vnode
  return isSuspense(rawVNode.type) ? rawVNode : vnode
}
```

渲染逻辑首先验证子节点的有效性，然后检查是否符合 include/exclude 规则。命中缓存时复用组件实例和 DOM 元素，同时更新 LRU 顺序；未命中时将键添加到集合，并在超过 max 时清理最老的缓存。

两个 ShapeFlag 标记很关键：`COMPONENT_KEPT_ALIVE` 告诉渲染器这是复用的组件，需要走 activate 流程而非挂载；`COMPONENT_SHOULD_KEEP_ALIVE` 告诉渲染器卸载时走 deactivate 而非销毁。

## activate 实现

当缓存的组件需要重新显示时，调用 activate 将其移回 DOM：

```typescript
sharedContext.activate = (vnode, container, anchor, isSVG, optimized) => {
  const instance = vnode.component!
  
  // 将组件的 DOM 移动到目标位置
  move(vnode, container, anchor, MoveType.ENTER, parentSuspense)
  
  // 可能需要更新 props
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
  
  // 异步调用 activated 生命周期
  queuePostRenderEffect(() => {
    instance.isDeactivated = false
    
    if (instance.a) {
      // 调用 activated 钩子
      invokeArrayFns(instance.a)
    }
    
    const vnodeHook = vnode.props && vnode.props.onVnodeMounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
  }, parentSuspense)
  
  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentAdded(instance)
  }
}
```

activate 首先将组件的 DOM 子树移动到容器中，然后执行一次 patch 以同步可能变化的 props。最后在 post 队列中调用 activated 生命周期钩子。移动而非重新渲染是 KeepAlive 性能优势的核心所在。

## deactivate 实现

当组件切换出去时，deactivate 将其移入隐藏容器而非销毁：

```typescript
sharedContext.deactivate = (vnode: VNode) => {
  const instance = vnode.component!
  
  // 移动到隐藏容器
  move(vnode, storageContainer, null, MoveType.LEAVE, parentSuspense)
  
  // 异步调用 deactivated 生命周期
  queuePostRenderEffect(() => {
    if (instance.da) {
      // 调用 deactivated 钩子
      invokeArrayFns(instance.da)
    }
    
    const vnodeHook = vnode.props && vnode.props.onVnodeUnmounted
    if (vnodeHook) {
      invokeVNodeHook(vnodeHook, instance.parent, vnode)
    }
    
    instance.isDeactivated = true
  }, parentSuspense)
  
  if (__DEV__ || __FEATURE_PROD_DEVTOOLS__) {
    devtoolsComponentRemoved(instance)
  }
}

// storageContainer 是一个离屏的隐藏容器
const storageContainer = createElement('div')
```

storageContainer 是一个永不插入 DOM 树的 div，被停用的组件移动到这里保持存活但不可见。deactivated 钩子在移动后异步调用，让开发者有机会执行清理逻辑（如暂停定时器）。

## 缓存清理

pruneCacheEntry 负责从缓存中移除条目并销毁组件：

```typescript
function pruneCacheEntry(key: CacheKey) {
  const cached = cache.get(key) as VNode
  
  if (!current || cached.type !== current.type) {
    // 不是当前显示的组件，直接卸载
    unmount(cached)
  } else if (current) {
    // 是当前组件，重置 keep-alive 标记
    resetShapeFlag(current)
  }
  
  cache.delete(key)
  keys.delete(key)
}

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

清理时需要区分被清理的是否是当前显示的组件。如果不是，直接卸载销毁；如果是当前组件，不能销毁它，只需移除 keep-alive 标记，让它后续按正常流程处理。

## include/exclude 匹配

matches 函数处理各种形式的匹配规则：

```typescript
function matches(pattern: MatchPattern, name: string): boolean {
  if (isArray(pattern)) {
    // 数组：任一匹配即可
    return pattern.some((p: string | RegExp) => matches(p, name))
  } else if (isString(pattern)) {
    // 字符串：逗号分隔的名称列表
    return pattern.split(',').includes(name)
  } else if (pattern.test) {
    // 正则表达式
    return pattern.test(name)
  }
  return false
}
```

支持三种形式：字符串（`"ComponentA,ComponentB"`）、正则（`/^Component/`）、数组（可混合前两种）。这种灵活的 API 让开发者可以精确控制缓存策略。

## 响应 include/exclude 变化

KeepAlive 监听 include 和 exclude 的变化，动态清理不再符合条件的缓存：

```typescript
// 在 setup 中
watch(
  () => [props.include, props.exclude],
  ([include, exclude]) => {
    include && pruneCache(name => matches(include, name))
    exclude && pruneCache(name => !matches(exclude, name))
  },
  { flush: 'post', deep: true }
)

function pruneCache(filter?: (name: string) => boolean) {
  cache.forEach((vnode, key) => {
    const name = getComponentName(vnode.type as ConcreteComponent)
    if (name && (!filter || !filter(name))) {
      pruneCacheEntry(key)
    }
  })
}
```

当 include 或 exclude 变化时，遍历缓存并清理不再符合条件的组件。使用 `flush: 'post'` 确保在 DOM 更新后执行，避免时序问题。

## 卸载时清理

KeepAlive 组件自身卸载时需要清理所有缓存：

```typescript
onBeforeUnmount(() => {
  cache.forEach(cached => {
    const { subTree, suspense } = instance
    const vnode = getInnerChild(subTree)
    
    if (cached.type === vnode.type) {
      // 当前显示的组件需要重置标记
      resetShapeFlag(vnode)
      
      const da = vnode.component!.da
      da && queuePostRenderEffect(da, suspense)
      return
    }
    
    // 销毁缓存的组件
    unmount(cached)
  })
})
```

遍历所有缓存：如果是当前显示的组件，重置标记让它正常卸载并触发 deactivated；其他的直接销毁。这确保了 KeepAlive 被移除时不会留下游离的组件实例。

## 小结

KeepAlive 通过缓存组件 VNode 和 DOM 实现实例复用。activate 和 deactivate 方法控制组件在可见和隐藏状态之间的切换，配合 ShapeFlag 标记让渲染器知道该走哪条路径。LRU 策略配合 max 限制防止内存泄漏，include/exclude 提供细粒度的缓存控制。这套机制将复杂的缓存逻辑封装成简洁的声明式 API。
