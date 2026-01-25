# KeepAlive 设计

KeepAlive 是 Vue 的内置组件，用于缓存动态组件，避免重复创建和销毁带来的性能开销。它在切换组件时保留状态和 DOM。

## 问题场景

考虑一个标签页切换：

```vue
<template>
  <component :is="currentTab" />
</template>
```

每次切换，旧组件被销毁、新组件被创建。如果组件有复杂状态或已获取的数据，切换回来时会丢失。

用 KeepAlive 包裹：

```vue
<template>
  <KeepAlive>
    <component :is="currentTab" />
  </KeepAlive>
</template>
```

组件切走时不销毁，只是"停用"；切回来时"激活"，状态完整保留。

## 缓存策略

KeepAlive 维护一个缓存 Map：

```javascript
const cache = new Map()  // key -> vnode
const keys = new Set()   // 缓存的 key 集合
```

key 默认是组件的 type（构造函数或选项对象），也可以通过 `key` prop 指定。

```javascript
function getComponentKey(vnode) {
  return vnode.key ?? vnode.type
}
```

## 挂载与激活

KeepAlive 的子组件有两种"挂载"方式：

**首次渲染**：正常挂载，然后加入缓存。

**再次渲染**：从缓存取出，执行"激活"而非挂载。

```javascript
function mountKeepAlive(vnode, container, anchor) {
  const { children } = vnode
  const child = children[0]
  const key = getComponentKey(child)
  
  const cachedVNode = cache.get(key)
  
  if (cachedVNode) {
    // 缓存命中，激活
    child.el = cachedVNode.el
    child.component = cachedVNode.component
    // 标记需要激活而非挂载
    child.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
    activate(child, container, anchor)
  } else {
    // 首次渲染，正常挂载
    mount(child, container, anchor)
    cache.set(key, child)
    keys.add(key)
  }
}
```

## 停用与卸载

切换组件时，旧组件不真正卸载，而是"停用"——移出 DOM 但保留在内存：

```javascript
function deactivate(vnode) {
  // 将 DOM 移动到隐藏容器
  move(vnode, hiddenContainer)
  
  // 调用 deactivated 生命周期
  const instance = vnode.component
  if (instance.deactivated) {
    instance.deactivated()
  }
}
```

隐藏容器是一个不在文档中的 DOM 元素，组件的 DOM 保留在那里。

## 激活

重新激活时：

```javascript
function activate(vnode, container, anchor) {
  // 从隐藏容器移回真实容器
  move(vnode, container, anchor)
  
  // 调用 activated 生命周期
  const instance = vnode.component
  if (instance.activated) {
    instance.activated()
  }
}
```

## 生命周期钩子

KeepAlive 引入两个新的生命周期：

```javascript
// 组件激活时
onActivated(() => {
  console.log('组件被激活')
})

// 组件停用时
onDeactivated(() => {
  console.log('组件被停用')
})
```

这两个钩子替代了被缓存组件的 mounted/unmounted：

- 首次渲染：mounted + activated
- 切走：deactivated（不调用 unmounted）
- 切回：activated（不调用 mounted）

## include 和 exclude

可以指定哪些组件需要缓存：

```vue
<KeepAlive :include="['TabA', 'TabB']">
  <component :is="currentTab" />
</KeepAlive>
```

```javascript
function shouldCache(vnode, include, exclude) {
  const name = getComponentName(vnode)
  
  if (exclude && matches(exclude, name)) {
    return false
  }
  if (include && !matches(include, name)) {
    return false
  }
  return true
}

function matches(pattern, name) {
  if (Array.isArray(pattern)) {
    return pattern.includes(name)
  }
  if (typeof pattern === 'string') {
    return pattern.split(',').includes(name)
  }
  if (pattern instanceof RegExp) {
    return pattern.test(name)
  }
  return false
}
```

## max 属性

限制缓存数量：

```vue
<KeepAlive :max="10">
  <component :is="currentTab" />
</KeepAlive>
```

超过限制时使用 LRU（Least Recently Used）策略淘汰：

```javascript
function pruneCacheEntry(key) {
  const cached = cache.get(key)
  if (cached) {
    // 真正卸载组件
    unmount(cached)
    cache.delete(key)
    keys.delete(key)
  }
}

function cacheVNode(key, vnode) {
  cache.set(key, vnode)
  keys.add(key)
  
  // 检查是否超过限制
  if (max && keys.size > max) {
    // 淘汰最久未使用的
    const oldestKey = keys.values().next().value
    pruneCacheEntry(oldestKey)
  }
}
```

为实现 LRU，每次访问缓存时需要更新顺序：

```javascript
function updateKeyOrder(key) {
  keys.delete(key)
  keys.add(key)  // 移动到末尾
}
```

## 与渲染器协作

KeepAlive 需要特殊处理，不能用普通的 mount/unmount。渲染器提供 activate/deactivate 接口：

```javascript
const sharedContext = {
  activate(vnode, container, anchor) {
    // 移动 DOM
    const el = vnode.el
    container.insertBefore(el, anchor)
    
    // 触发生命周期
    queuePostFlushCb(() => {
      const instance = vnode.component
      callHook(instance, 'activated')
    })
  },
  
  deactivate(vnode) {
    // 移动到隐藏容器
    hiddenContainer.appendChild(vnode.el)
    
    // 触发生命周期
    queuePostFlushCb(() => {
      const instance = vnode.component
      callHook(instance, 'deactivated')
    })
  }
}
```

## 实现要点

**只缓存一个子组件**：

```javascript
function getFirstValidChild(children) {
  for (const child of children) {
    if (isVNode(child)) {
      return child
    }
  }
  return null
}
```

KeepAlive 只能有一个子组件，多个子组件会警告。

**处理 v-if 变化**：

```vue
<KeepAlive>
  <TabA v-if="showA" />
  <TabB v-else />
</KeepAlive>
```

每次渲染只有一个子组件存在，KeepAlive 需要判断是切换还是相同组件更新。

**缓存清理**：

当 include/exclude 变化导致某个已缓存组件不再需要时，应该清除缓存并卸载：

```javascript
watch(
  () => [props.include, props.exclude],
  ([include, exclude]) => {
    cache.forEach((vnode, key) => {
      const name = getComponentName(vnode)
      if (!shouldCache(name, include, exclude)) {
        pruneCacheEntry(key)
      }
    })
  }
)
```

## 简化实现

```javascript
const KeepAlive = {
  __isKeepAlive: true,
  
  props: {
    include: [String, Array, RegExp],
    exclude: [String, Array, RegExp],
    max: Number
  },
  
  setup(props, { slots }) {
    const cache = new Map()
    const keys = new Set()
    
    const { activate, deactivate } = getCurrentInstance().ctx
    
    return () => {
      const children = slots.default()
      const vnode = children[0]
      
      if (!vnode || !vnode.type) {
        return vnode
      }
      
      const name = vnode.type.name
      
      // 检查是否应该缓存
      if (
        (props.exclude && matches(props.exclude, name)) ||
        (props.include && !matches(props.include, name))
      ) {
        return vnode
      }
      
      const key = vnode.key ?? vnode.type
      const cached = cache.get(key)
      
      if (cached) {
        // 复用缓存
        vnode.el = cached.el
        vnode.component = cached.component
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        
        // 更新 LRU 顺序
        keys.delete(key)
        keys.add(key)
      } else {
        // 加入缓存
        cache.set(key, vnode)
        keys.add(key)
        
        // 检查 max
        if (props.max && keys.size > props.max) {
          const oldest = keys.values().next().value
          cache.delete(oldest)
          keys.delete(oldest)
        }
      }
      
      // 标记不应被卸载
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      
      return vnode
    }
  }
}
```

## 使用场景

1. **标签页切换**：保留每个标签的滚动位置和表单状态
2. **列表-详情导航**：返回列表时保留滚动位置
3. **多步骤表单**：在步骤间切换保留输入
4. **路由缓存**：配合 vue-router 缓存路由组件

## 注意事项

1. **内存占用**：缓存的组件占用内存，合理设置 max
2. **状态同步**：缓存的组件可能持有过期数据，需要在 activated 中刷新
3. **事件监听**：全局事件监听需要在 deactivated 时移除
4. **定时器**：需要在 deactivated 时清理

## 小结

KeepAlive 通过缓存组件实例和 DOM，避免重复创建销毁的开销。它的核心是将"卸载"变为"停用"，将"挂载"变为"激活"。理解这个转换，就理解了 KeepAlive 的工作原理。
