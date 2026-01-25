# KeepAlive 缓存机制

本章深入分析 KeepAlive 的缓存策略，包括 LRU 算法、缓存命中处理和缓存清理。

## 缓存数据结构

```typescript
// 缓存 Map
const cache: Cache = new Map()
type Cache = Map<CacheKey, VNode>

// 键集合（用于 LRU）
const keys: Keys = new Set()
type Keys = Set<CacheKey>

// 缓存键类型
type CacheKey = string | number | symbol | ConcreteComponent
```

## 缓存键的确定

```typescript
// 优先使用 vnode.key，否则使用组件本身
const key = vnode.key == null ? comp : vnode.key
```

示例：

```vue
<!-- 使用 key -->
<KeepAlive>
  <component :is="view" :key="componentKey" />
</KeepAlive>

<!-- 不使用 key，以组件类型为键 -->
<KeepAlive>
  <component :is="view" />
</KeepAlive>
```

## 缓存命中逻辑

```typescript
const cachedVNode = cache.get(key)

if (cachedVNode) {
  // ⭐ 命中缓存
  
  // 复用 el 和 component
  vnode.el = cachedVNode.el
  vnode.component = cachedVNode.component
  
  // 处理 transition
  if (vnode.transition) {
    setTransitionHooks(vnode, vnode.transition!)
  }
  
  // 标记为 kept-alive（已缓存）
  vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
  
  // ⭐ LRU 更新：移到最新位置
  keys.delete(key)
  keys.add(key)
} else {
  // 新增缓存
  keys.add(key)
  
  // 检查 max 限制
  if (max && keys.size > parseInt(max as string, 10)) {
    pruneCacheEntry(keys.values().next().value)
  }
}
```

## LRU 算法

```typescript
// Set 保持插入顺序
// keys.values().next().value 获取最旧的键

// 更新访问顺序
keys.delete(key)  // 删除旧位置
keys.add(key)     // 添加到末尾（最新）

// 淘汰最旧
if (max && keys.size > parseInt(max as string, 10)) {
  const oldest = keys.values().next().value
  pruneCacheEntry(oldest)
}
```

## 缓存写入时机

```typescript
// pendingCacheKey 标记待缓存的键
let pendingCacheKey: CacheKey | null = null

const cacheSubtree = () => {
  if (pendingCacheKey != null) {
    // ⭐ 在 mounted/updated 时写入缓存
    cache.set(pendingCacheKey, getInnerChild(instance.subTree))
  }
}

onMounted(cacheSubtree)
onUpdated(cacheSubtree)

// 渲染时设置 pendingCacheKey
return () => {
  // ...
  pendingCacheKey = key
  return vnode
}
```

## pruneCacheEntry 删除缓存

```typescript
function pruneCacheEntry(key: CacheKey) {
  const cached = cache.get(key)!
  
  if (!current || cached.type !== current.type) {
    // 不是当前组件，执行卸载
    unmount(cached)
  } else if (current) {
    // 是当前组件，只重置标记
    resetShapeFlag(current)
  }
  
  cache.delete(key)
  keys.delete(key)
}
```

## include/exclude 变化时的缓存清理

```typescript
// watch include/exclude
onMounted(() => {
  watch(
    () => [props.include, props.exclude],
    ([include, exclude]) => {
      include && pruneCache(name => matches(include, name))
      exclude && pruneCache(name => !matches(exclude, name))
    },
    { flush: 'post', deep: true }
  )
})

function pruneCache(filter?: (name: string) => boolean) {
  cache.forEach((vnode, key) => {
    const name = getComponentName(vnode.type as ConcreteComponent)
    if (name && (!filter || !filter(name))) {
      pruneCacheEntry(key)
    }
  })
}
```

## 卸载时清理所有缓存

```typescript
onBeforeUnmount(() => {
  cache.forEach(cached => {
    const { subTree, suspense } = instance
    const vnode = getInnerChild(subTree)
    
    if (cached.type === vnode.type) {
      // 当前显示的组件，重置标记
      resetShapeFlag(vnode)
      return
    }
    
    // 卸载缓存的组件
    unmount(cached)
  })
})
```

## 缓存的 VNode 结构

```typescript
// 缓存中保存的 VNode 包含：
interface CachedVNode {
  el: RendererElement        // DOM 元素
  component: ComponentInternalInstance  // 组件实例
  shapeFlag: number          // 包含 COMPONENT_KEPT_ALIVE 标记
  // ...其他 VNode 属性
}
```

## 存储容器

```typescript
// 在 renderer 中创建的隐藏容器
const storageContainer = createElement('div')

// deactivate 时移动到存储容器
sharedContext.deactivate = (vnode: VNode) => {
  const instance = vnode.component!
  move(vnode, storageContainer, null, MoveType.LEAVE, parentSuspense)
  // ...
}
```

## max 限制的实现

```typescript
if (max && keys.size > parseInt(max as string, 10)) {
  // 获取最旧的键（LRU）
  const oldest = keys.values().next().value
  pruneCacheEntry(oldest)
}
```

## 使用示例

### 理解缓存行为

```vue
<template>
  <KeepAlive :max="3">
    <component :is="views[current]" />
  </KeepAlive>
  <button @click="cycle">Next</button>
</template>

<script setup>
import { ref, shallowRef } from 'vue'
import CompA from './CompA.vue'
import CompB from './CompB.vue'
import CompC from './CompC.vue'
import CompD from './CompD.vue'

const views = [CompA, CompB, CompC, CompD]
const current = ref(0)

const cycle = () => {
  current.value = (current.value + 1) % 4
}
</script>
```

访问顺序：A → B → C → D
- 访问 A：缓存 [A]
- 访问 B：缓存 [A, B]
- 访问 C：缓存 [A, B, C]
- 访问 D：缓存 [B, C, D]（A 被淘汰）

### 动态 key

```vue
<template>
  <KeepAlive>
    <component :is="View" :key="route.path" />
  </KeepAlive>
</template>
```

每个路由有独立的缓存。

## 缓存与响应式

```typescript
// 缓存的组件实例保持响应式状态
// 再次激活时，状态得以保留

// 组件 A
const count = ref(0)
// count.value = 5 后切换走
// 再次激活时 count.value 仍然是 5
```

## 小结

KeepAlive 缓存机制的核心要点：

1. **双数据结构**：Map 存 VNode，Set 维护 LRU 顺序
2. **缓存键**：vnode.key 或组件类型
3. **LRU 淘汰**：超出 max 时删除最旧的
4. **写入时机**：mounted/updated 时写入
5. **动态清理**：include/exclude 变化时清理

下一章将分析 KeepAlive 的激活与停用。
