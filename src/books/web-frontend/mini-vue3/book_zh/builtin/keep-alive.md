# KeepAlive：组件缓存与 LRU 策略

在 Tab 切换场景下，每次切换都会销毁旧组件、创建新组件。用户填写的表单数据、滚动位置、输入状态——全部丢失。

**KeepAlive 的作用就是缓存组件实例，避免重复渲染。** 它是 Vue 的内置组件，理解它的实现原理，能帮你更好地优化应用性能。

## 缓存 vs 销毁

普通组件切换：

```
Tab A → Tab B
    ↓
卸载组件 A → 创建组件 B
    ↓
A 的状态丢失
```

使用 KeepAlive：

```
Tab A → Tab B
    ↓
移动 A 到隐藏容器 → 创建/激活组件 B
    ↓
A 的状态保留在内存中
    ↓
Tab B → Tab A
    ↓
移动 A 回显示容器（激活）
```

关键区别：**不是销毁，而是移动到隐藏容器**。

## 基本用法

```vue-html
<template>
  <KeepAlive>
    <component :is="currentTab" />
  </KeepAlive>
</template>
```

### include 和 exclude

控制哪些组件需要缓存：

```vue-html
<!-- 字符串：逗号分隔的组件名 -->
<KeepAlive include="ComponentA,ComponentB">
  <component :is="view" />
</KeepAlive>

<!-- 正则表达式 -->
<KeepAlive :include="/^Tab/">
  <component :is="view" />
</KeepAlive>

<!-- 数组 -->
<KeepAlive :include="['ComponentA', 'ComponentB']">
  <component :is="view" />
</KeepAlive>
```

### max：限制缓存数量

```vue-html
<KeepAlive :max="10">
  <router-view />
</KeepAlive>
```

当缓存数量超过 `max` 时，会淘汰最久未使用的组件——这就是 LRU 策略。

## activated 和 deactivated

KeepAlive 缓存的组件有两个特殊的生命周期钩子：

```javascript
import { onActivated, onDeactivated } from 'vue'

export default {
  setup() {
    onActivated(() => {
      console.log('组件被激活')
      // 重新获取最新数据
      fetchLatestData()
    })
    
    onDeactivated(() => {
      console.log('组件被停用')
      // 暂停定时器、取消请求
      pauseTimer()
    })
  }
}
```

**注意区分**：
- `mounted`/`unmounted`：只在首次挂载和最终卸载时调用
- `activated`/`deactivated`：每次切换都会调用

## KeepAlive 的核心实现

```javascript
const KeepAliveImpl = {
  name: 'KeepAlive',
  __isKeepAlive: true,
  
  props: {
    include: [String, RegExp, Array],
    exclude: [String, RegExp, Array],
    max: [String, Number]
  },
  
  setup(props, { slots }) {
    // 缓存结构
    const cache = new Map()  // key → vnode
    const keys = new Set()   // 有序 key 集合（用于 LRU）
    
    // 获取渲染器方法
    const instance = getCurrentInstance()
    const { move, unmount, createElement } = instance.ctx.renderer
    
    // 隐藏容器：存放被缓存的 DOM
    const storageContainer = createElement('div')
    
    // 停用组件：移动到隐藏容器
    instance.ctx.deactivate = (vnode) => {
      move(vnode, storageContainer, null)
    }
    
    // 激活组件：从隐藏容器移回
    instance.ctx.activate = (vnode, container, anchor) => {
      move(vnode, container, anchor)
    }
    
    return () => {
      // 获取默认插槽内容
      const children = slots.default()
      const vnode = children[0]
      
      // 检查是否应该缓存
      if (!shouldCache(vnode, props)) {
        return vnode
      }
      
      const key = vnode.key || vnode.type
      const cachedVNode = cache.get(key)
      
      if (cachedVNode) {
        // 命中缓存：复用组件实例
        vnode.component = cachedVNode.component
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
        
        // LRU：更新 key 的位置
        keys.delete(key)
        keys.add(key)
      } else {
        // 未命中：添加到缓存
        cache.set(key, vnode)
        keys.add(key)
        
        // 检查是否超过 max
        if (props.max && keys.size > parseInt(props.max)) {
          // 淘汰最久未使用的
          const oldestKey = keys.values().next().value
          pruneCacheEntry(oldestKey)
        }
      }
      
      // 标记为 KeepAlive 组件
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      
      return vnode
    }
  }
}
```

## LRU 缓存策略

LRU（Least Recently Used）淘汰最近最少使用的缓存：

```
缓存容量: max = 3

操作序列: 访问 A → B → C → D

Step 1: 访问 A     缓存: [A]
Step 2: 访问 B     缓存: [A, B]
Step 3: 访问 C     缓存: [A, B, C]  ← 已满
Step 4: 访问 D     缓存: [B, C, D]  ← 淘汰最久未用的 A
```

如果再次访问 B：

```
Step 5: 访问 B     缓存: [C, D, B]  ← B 移到末尾（最新）
```

实现核心：

```javascript
function pruneCacheEntry(key) {
  const cached = cache.get(key)
  if (cached) {
    // 真正销毁组件
    unmount(cached)
  }
  cache.delete(key)
  keys.delete(key)
}
```

## 匹配逻辑

```javascript
function matches(pattern, name) {
  if (Array.isArray(pattern)) {
    return pattern.includes(name)
  } else if (typeof pattern === 'string') {
    return pattern.split(',').includes(name)
  } else if (pattern instanceof RegExp) {
    return pattern.test(name)
  }
  return false
}

function shouldCache(vnode, { include, exclude }) {
  const name = vnode.type.name
  
  if (!name) return false
  
  // 不在白名单
  if (include && !matches(include, name)) {
    return false
  }
  
  // 在黑名单
  if (exclude && matches(exclude, name)) {
    return false
  }
  
  return true
}
```

## 与渲染器的协作

KeepAlive 需要渲染器的特殊支持：

```javascript
// renderer.ts
function unmount(vnode) {
  if (vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    // 不销毁，调用 deactivate 移动到隐藏容器
    parentComponent.ctx.deactivate(vnode)
    return
  }
  // 正常销毁
  // ...
}

function mount(vnode, container) {
  if (vnode.shapeFlag & ShapeFlags.COMPONENT_KEPT_ALIVE) {
    // 不创建，调用 activate 从隐藏容器移回
    parentComponent.ctx.activate(vnode, container, anchor)
    return
  }
  // 正常挂载
  // ...
}
```

关键点：

1. **卸载时不销毁**：移动到隐藏容器
2. **挂载时不创建**：从隐藏容器移回
3. **调用特殊钩子**：`activated`/`deactivated` 而非 `mounted`/`unmounted`

## 生命周期流程

```
首次渲染组件 A:
  beforeCreate → created → beforeMount → mounted → activated
                                                      ↑
                                                  首次也会触发

切换到组件 B:
  A: deactivated（移到隐藏容器）
  B: beforeCreate → created → beforeMount → mounted → activated

切换回组件 A:
  B: deactivated
  A: activated（从隐藏容器移回，不触发 mounted）

组件被销毁（从缓存中移除或 KeepAlive 卸载）:
  beforeUnmount → unmounted
```

## 本章小结

本章分析了 KeepAlive 的实现原理：

- **核心思想**：缓存组件实例，移动而非销毁
- **LRU 策略**：限制缓存数量时淘汰最久未使用的
- **include/exclude**：精确控制缓存范围
- **特殊生命周期**：`activated`/`deactivated`
- **渲染器协作**：需要渲染器支持 move 操作

下一章将分析 Teleport——跨 DOM 层级渲染的实现。
