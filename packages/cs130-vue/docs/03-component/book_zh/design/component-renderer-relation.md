# 组件与渲染器的关系

组件是 Vue 应用的构建单元，但组件本身不会神奇地出现在页面上。把组件变成真实 DOM 的工作由渲染器完成。理解组件与渲染器的协作关系，有助于理解 Vue 运行时的全貌。

## 渲染器的职责

渲染器负责三件核心工作：

**创建**——把虚拟 DOM 变成真实 DOM。当组件首次挂载时，渲染器遍历 VNode 树，为每个节点创建对应的 DOM 元素。

**更新**——当组件状态变化时，渲染器对比新旧 VNode，只更新变化的部分。这就是 diff 算法的工作。

**销毁**——当组件卸载时，渲染器清理 DOM 并触发必要的清理逻辑。

组件是渲染器处理的对象之一。从渲染器的视角看，组件就是一种特殊的 VNode 类型。

## 组件 VNode

当在模板中使用组件时，编译器生成的是组件 VNode：

```javascript
// 模板
// <MyComponent :title="title" />

// 编译结果
h(MyComponent, { title: title })
```

这个 VNode 的 `type` 不是字符串（如 `'div'`），而是组件对象本身。渲染器通过 `type` 的类型判断如何处理：

```javascript
function patch(n1, n2, container) {
  const { type } = n2
  
  if (typeof type === 'string') {
    // 处理普通元素
    processElement(n1, n2, container)
  } else if (typeof type === 'object') {
    // 处理有状态组件
    processComponent(n1, n2, container)
  } else if (typeof type === 'function') {
    // 处理函数式组件
    processFunctionalComponent(n1, n2, container)
  }
  // ... 其他类型
}
```

## 组件的挂载流程

当渲染器遇到组件 VNode 时，挂载流程如下：

```javascript
function mountComponent(vnode, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(vnode)
  
  // 2. 设置组件（解析 props、slots、调用 setup 等）
  setupComponent(instance)
  
  // 3. 设置渲染副作用
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
  // 创建响应式副作用
  effect(() => {
    if (!instance.isMounted) {
      // 首次渲染
      const subTree = instance.render.call(instance.proxy)
      patch(null, subTree, container)
      instance.subTree = subTree
      instance.isMounted = true
    } else {
      // 更新渲染
      const nextTree = instance.render.call(instance.proxy)
      patch(instance.subTree, nextTree, container)
      instance.subTree = nextTree
    }
  })
}
```

关键点：组件的渲染逻辑被包装在响应式副作用（effect）中。当组件依赖的响应式数据变化时，副作用重新执行，触发组件更新。

## 组件树的渲染

一个组件可以渲染其他组件，形成组件树。渲染器递归处理这棵树：

```javascript
// App 组件
const App = {
  render() {
    return h('div', [
      h(Header),
      h(Main),
      h(Footer)
    ])
  }
}
```

渲染器处理 App 时，发现 subTree 中有三个组件 VNode（Header、Main、Footer）。对每个组件 VNode，渲染器递归执行挂载流程。

这种递归形成了组件树的深度优先遍历。父组件先渲染，然后子组件按顺序渲染。

## 组件更新的触发

组件更新有两种触发方式：

**内部触发**——组件自己的响应式状态变化：

```javascript
const Counter = {
  setup() {
    const count = ref(0)
    const increment = () => count.value++  // 触发组件更新
    return { count, increment }
  }
}
```

当 `count.value` 变化时，effect 重新执行，组件重新渲染。

**外部触发**——父组件传入的 props 变化：

```javascript
// 父组件
const Parent = {
  setup() {
    const title = ref('Hello')
    return () => h(Child, { title: title.value })
  }
}
```

当 `title.value` 变化时，Parent 重新渲染，生成新的 Child VNode。渲染器对比新旧 VNode，发现 props 变化，触发 Child 更新。

## Props 的更新流程

当父组件传入新的 props 时：

```javascript
function updateComponent(n1, n2) {
  const instance = n2.component = n1.component
  
  // 检查 props 是否变化
  if (shouldUpdateComponent(n1, n2)) {
    // 存储新的 VNode
    instance.next = n2
    // 触发组件更新
    instance.update()
  } else {
    // props 没变，只更新 VNode 引用
    n2.component = n1.component
    instance.vnode = n2
  }
}
```

`shouldUpdateComponent` 对比新旧 props，只有真正变化时才触发更新。这是一个优化——如果 props 没变，子组件不需要重新渲染。

## 渲染上下文

组件渲染时需要访问各种数据——setup 返回的状态、props、data、computed 等。渲染器通过代理对象提供统一的访问接口：

```javascript
function setupComponent(instance) {
  // 创建渲染上下文代理
  instance.proxy = new Proxy(instance.ctx, {
    get(target, key) {
      // 按顺序查找：setupState -> data -> props -> ctx
      const { setupState, data, props, ctx } = instance
      if (hasOwn(setupState, key)) {
        return setupState[key]
      } else if (hasOwn(data, key)) {
        return data[key]
      } else if (hasOwn(props, key)) {
        return props[key]
      }
      // ...
    }
  })
}
```

在模板或渲染函数中访问 `this.xxx`，实际上是通过这个代理按优先级查找各个数据源。

## 异步更新

为了性能，Vue 不会同步执行每次更新。当状态变化时，更新被放入队列，在下一个微任务中批量执行：

```javascript
function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
    queueFlush()
  }
}

function queueFlush() {
  if (!isFlushing) {
    isFlushing = true
    Promise.resolve().then(flushJobs)
  }
}

function flushJobs() {
  queue.sort((a, b) => a.id - b.id)  // 按组件层级排序
  for (const job of queue) {
    job()
  }
  queue.length = 0
  isFlushing = false
}
```

这带来两个好处：

**批量处理**——同一时间多次状态变化只触发一次更新。

**父子顺序**——通过排序确保父组件先于子组件更新，避免子组件的重复更新。

## 组件边界

组件是更新的边界。当一个组件更新时，只有这个组件的 subTree 会重新生成和 diff，不会影响兄弟组件：

```javascript
// App
// ├── Header    <- 更新
// ├── Main      <- 不受影响
// └── Footer    <- 不受影响
```

这种边界隔离让更新范围可控。但也有例外——如果 Main 依赖了和 Header 相同的响应式数据，它也会更新。

## 静态提升与缓存

渲染器和编译器配合进行多种优化：

**静态提升**——不变的 VNode 被提升到渲染函数外：

```javascript
// 编译前
const _hoisted_1 = h('p', 'Static text')

function render() {
  return h('div', [
    _hoisted_1,  // 复用
    h('span', this.dynamic)
  ])
}
```

静态节点只创建一次，每次渲染都复用。

**Props 缓存**——没有动态 props 的组件可以跳过更新检查。

**Block Tree**——跟踪动态节点，diff 时跳过静态部分。

这些优化都需要组件和渲染器的紧密配合。

## 自定义渲染器

Vue 的渲染器设计是平台无关的。通过 `createRenderer` 可以创建自定义渲染器：

```javascript
import { createRenderer } from '@vue/runtime-core'

const renderer = createRenderer({
  createElement(type) { /* ... */ },
  insert(child, parent) { /* ... */ },
  patchProp(el, key, prevValue, nextValue) { /* ... */ },
  // ... 其他平台操作
})
```

这让 Vue 可以渲染到不同的平台——Web、Native、Canvas、Terminal 等。组件逻辑保持不变，只需提供不同的平台操作。

## 组件的缓存与复用

KeepAlive 组件体现了组件与渲染器的深度协作：

```javascript
// 简化的 KeepAlive 实现
const KeepAlive = {
  setup(props, { slots }) {
    const cache = new Map()
    
    return () => {
      const vnode = slots.default()[0]
      const key = vnode.key || vnode.type
      
      if (cache.has(key)) {
        // 复用缓存的组件实例
        vnode.component = cache.get(key)
        vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
      } else {
        cache.set(key, vnode.component)
      }
      
      vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
      return vnode
    }
  }
}
```

渲染器识别 `COMPONENT_KEPT_ALIVE` 标记，不销毁组件实例，而是将其移出 DOM 树并保留在内存中。

## 小结

组件与渲染器是 Vue 运行时的两个核心部分。组件定义了"渲染什么"，渲染器决定"如何渲染"。

渲染器负责组件的挂载、更新、卸载。通过响应式副作用，组件状态变化自动触发重新渲染。异步更新队列批量处理变化，按层级顺序执行更新。

组件是更新边界，让 diff 范围可控。编译时优化（静态提升、Block Tree）进一步减少运行时开销。自定义渲染器让 Vue 可以渲染到不同平台。

理解这种协作关系，有助于理解 Vue 的性能特性，也有助于在需要时进行针对性的优化。在下一章中，我们将探讨组件系统设计中的权衡与取舍。
