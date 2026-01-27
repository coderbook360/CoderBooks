# 组件与渲染器的协作

在 Vue 的架构中，组件系统和渲染器是两个相对独立的模块，但它们之间存在着紧密的协作关系。组件负责管理状态和定义视图结构，渲染器负责将这些结构转换为真实的 DOM 操作。理解这两者之间的协作机制，是深入掌握 Vue 内部工作原理的关键。

## 组件如何被渲染

当我们在模板中使用一个组件时，Vue 会经历一系列步骤将其转换为屏幕上的像素。这个过程从模板编译开始，经过虚拟 DOM 创建，最终由渲染器完成真实 DOM 的操作。

首先，让我们理解组件在虚拟 DOM 层面是如何表示的。当编译器处理模板时，组件标签会被转换为特殊类型的 VNode：

```javascript
// 模板
// <MyComponent :prop="value" @click="handler">
//   <span>内容</span>
// </MyComponent>

// 编译后的渲染函数（简化）
import { h, resolveComponent } from 'vue'

function render() {
  const MyComponent = resolveComponent('MyComponent')
  
  return h(MyComponent, {
    prop: value,
    onClick: handler
  }, {
    default: () => h('span', '内容')
  })
}
```

与普通元素的 VNode 不同，组件 VNode 的 `type` 属性是一个组件定义对象，而不是字符串标签名。渲染器通过检查 VNode 的类型来决定如何处理：

```javascript
// 渲染器内部的简化逻辑
function patch(n1, n2, container) {
  const { type } = n2
  
  if (typeof type === 'string') {
    // 普通元素
    processElement(n1, n2, container)
  } else if (typeof type === 'object') {
    // 组件
    processComponent(n1, n2, container)
  }
  // ... 其他类型
}
```

当渲染器遇到组件 VNode 时，会进入组件处理流程。如果是首次渲染（挂载），渲染器会创建组件实例并执行初始化：

```javascript
function mountComponent(vnode, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(vnode)
  
  // 2. 设置组件（解析 props、slots、执行 setup 等）
  setupComponent(instance)
  
  // 3. 设置渲染效果
  setupRenderEffect(instance, container)
}

function setupRenderEffect(instance, container) {
  // 创建响应式效果
  instance.update = effect(() => {
    if (!instance.isMounted) {
      // 首次渲染
      const subTree = instance.render.call(instance.proxy)
      patch(null, subTree, container)
      instance.subTree = subTree
      instance.isMounted = true
      
      // 触发 mounted 钩子
      if (instance.m) {
        invokeArrayFns(instance.m)
      }
    } else {
      // 更新渲染
      const nextTree = instance.render.call(instance.proxy)
      const prevTree = instance.subTree
      patch(prevTree, nextTree, container)
      instance.subTree = nextTree
    }
  }, {
    scheduler: queueJob  // 使用调度器批量处理更新
  })
}
```

这段代码揭示了组件与渲染器协作的核心机制：组件实例持有一个 `update` 函数，这个函数被包装在响应式 `effect` 中。当组件的响应式状态发生变化时，`effect` 会被重新执行，触发组件的重新渲染。

## 更新流程

组件的更新流程涉及多个层次的协调。当响应式状态变化时，更新并不是立即发生的，而是被调度到下一个「tick」中执行。这种设计避免了同一个更新周期内的多次状态变化导致多次渲染。

```javascript
// 简化的调度器实现
const queue = []
let isFlushing = false

function queueJob(job) {
  if (!queue.includes(job)) {
    queue.push(job)
    if (!isFlushing) {
      isFlushing = true
      Promise.resolve().then(flushJobs)
    }
  }
}

function flushJobs() {
  // 排序确保父组件先于子组件更新
  queue.sort((a, b) => a.id - b.id)
  
  for (const job of queue) {
    job()
  }
  
  queue.length = 0
  isFlushing = false
}
```

当父组件更新时，它可能会传递新的 props 给子组件。渲染器需要判断子组件是否需要更新。这个判断基于 props 的比较：

```javascript
function updateComponent(n1, n2) {
  const instance = (n2.component = n1.component)
  
  // 检查是否需要更新
  if (shouldUpdateComponent(n1, n2)) {
    instance.next = n2
    instance.update()
  } else {
    // 不需要更新，复用旧的组件实例
    n2.el = n1.el
    instance.vnode = n2
  }
}

function shouldUpdateComponent(prevVNode, nextVNode) {
  const { props: prevProps, children: prevChildren } = prevVNode
  const { props: nextProps, children: nextChildren } = nextVNode
  
  // 如果有插槽内容，总是需要更新
  if (prevChildren || nextChildren) {
    return true
  }
  
  // 比较 props
  if (prevProps === nextProps) {
    return false
  }
  
  if (!prevProps) {
    return !!nextProps
  }
  
  if (!nextProps) {
    return true
  }
  
  return hasPropsChanged(prevProps, nextProps)
}
```

更新流程的另一个重要方面是生命周期钩子的触发。渲染器在适当的时机调用组件的生命周期方法：

```javascript
function updateComponentPreRender(instance, nextVNode) {
  // 触发 beforeUpdate 钩子
  if (instance.bu) {
    invokeArrayFns(instance.bu)
  }
  
  // 更新 props 和 slots
  instance.vnode = nextVNode
  instance.props = nextVNode.props
  updateSlots(instance, nextVNode.children)
}

// 更新完成后
function postUpdateEffect(instance) {
  // 触发 updated 钩子
  if (instance.u) {
    queuePostFlushCb(instance.u)
  }
}
```

## 职责边界

组件系统和渲染器各有其明确的职责边界，这种分离使得 Vue 能够支持不同的渲染目标（DOM、Canvas、Native 等）。

组件系统的职责包括：

- 管理组件的生命周期状态
- 处理 props 和 emits
- 维护组件实例和上下文
- 执行 setup 函数和渲染函数
- 管理 provide/inject 依赖注入

渲染器的职责包括：

- 创建、更新和删除真实节点
- 执行 VNode 的 diff 算法
- 处理 DOM 属性和事件
- 管理节点的挂载和卸载
- 执行过渡动画

这种职责分离体现在代码组织上。在 Vue 3 的源码中，组件相关的逻辑在 `@vue/runtime-core` 包中，而 DOM 渲染器在 `@vue/runtime-dom` 包中。`runtime-core` 提供了一个 `createRenderer` 工厂函数，允许创建针对不同平台的渲染器：

```javascript
// runtime-core 提供的渲染器工厂
function createRenderer(options) {
  const {
    insert,
    remove,
    patchProp,
    createElement,
    createText,
    setText,
    setElementText,
    parentNode,
    nextSibling,
    // ...
  } = options
  
  // 返回平台无关的渲染逻辑
  function render(vnode, container) { /* ... */ }
  function patch(n1, n2, container) { /* ... */ }
  // ...
  
  return { render }
}

// runtime-dom 提供 DOM 特定的操作
const renderer = createRenderer({
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },
  remove: (child) => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  createElement: (tag) => document.createElement(tag),
  // ...
})
```

这种设计的好处是显而易见的。当 Vue 需要支持新的渲染目标时，只需要提供一套新的「节点操作」实现，而无需修改组件系统或 diff 算法。Vue 3 的服务端渲染、测试渲染器、以及社区的各种自定义渲染器都得益于这种架构。

在日常开发中，理解组件与渲染器的协作有助于我们写出更高效的代码。例如，知道 props 变化会触发子组件的 `shouldUpdateComponent` 检查，我们就会注意避免传递不稳定的引用类型：

```vue
<!-- ❌ 每次父组件渲染都会创建新对象，导致子组件不必要的更新 -->
<ChildComponent :options="{ color: 'red' }" />

<!-- ✅ 使用稳定的引用 -->
<script setup>
const options = { color: 'red' }
</script>
<template>
  <ChildComponent :options="options" />
</template>
```

同样，理解渲染器的更新调度机制，我们就知道多次同步修改状态只会触发一次渲染：

```javascript
const count = ref(0)
const name = ref('Alice')

function updateBoth() {
  count.value++
  name.value = 'Bob'
  // 只会触发一次组件更新
}
```

组件与渲染器的协作是 Vue 架构设计的精华所在。通过清晰的职责划分和精心设计的接口，Vue 实现了一个既高效又灵活的渲染系统。深入理解这种协作机制，不仅有助于我们更好地使用 Vue，也为我们理解其他前端框架的设计提供了有价值的视角。
