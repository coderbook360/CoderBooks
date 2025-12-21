# 组件的本质

我们已经可以渲染元素了，**但如何封装可复用的 UI 单元？** 这就是组件要解决的问题。

组件是 Vue 应用的基本构建单元。一个 Vue 应用可以看作一棵组件树，从根组件开始，层层嵌套。**理解组件的本质，是深入 Vue 内部机制的关键——也是从"使用者"到"理解者"的分水岭。**

## 组件是什么

首先要问一个问题：从渲染器的角度看，组件是什么？

答案是：**组件是一种特殊的 VNode**。

回顾之前学习的 VNode，`type` 字段决定了节点类型：

```javascript
// 普通元素 VNode
const elementVNode = {
  type: 'div',
  props: { class: 'container' },
  children: [...]
}

// 组件 VNode
const componentVNode = {
  type: MyComponent,  // type 是组件描述对象
  props: { msg: 'Hello' },
  children: null
}
```

关键区别：
- `type` 是字符串 → 元素节点
- `type` 是对象或函数 → 组件节点

渲染器在处理 VNode 时，首先检查 `type` 的类型，然后分派到不同的处理逻辑：

```javascript
function patch(n1, n2, container) {
  const { type } = n2
  
  if (typeof type === 'string') {
    // 元素节点
    processElement(n1, n2, container)
  } else if (typeof type === 'object' || typeof type === 'function') {
    // 组件节点
    processComponent(n1, n2, container)
  }
  // ... 其他类型
}
```

## 组件描述对象

现在我要问第二个问题：`type` 指向的"组件描述对象"是什么结构？

Vue 支持多种定义组件的方式：

**选项式 API**

```javascript
const MyComponent = {
  name: 'MyComponent',
  props: ['msg'],
  data() {
    return { count: 0 }
  },
  methods: {
    increment() {
      this.count++
    }
  },
  render() {
    return h('div', [
      h('span', this.msg),
      h('button', { onClick: this.increment }, this.count)
    ])
  }
}
```

**组合式 API (setup)**

```javascript
const MyComponent = {
  props: ['msg'],
  setup(props) {
    const count = ref(0)
    const increment = () => count.value++
    
    return () => h('div', [
      h('span', props.msg),
      h('button', { onClick: increment }, count.value)
    ])
  }
}
```

**函数式组件**

```javascript
function FunctionalComponent(props) {
  return h('div', props.msg)
}
```

无论哪种形式，组件描述对象的核心作用是：**告诉渲染器如何创建和管理组件实例**。

## 有状态组件 vs 函数式组件

Vue 中的组件分为两大类：

**有状态组件 (Stateful Component)**

- 拥有组件实例
- 有自己的响应式状态（data、setup 返回值）
- 支持生命周期钩子
- 支持 provide/inject
- 相对较重（内存和性能开销）

**函数式组件 (Functional Component)**

- 没有组件实例
- 没有自身状态
- 是一个纯渲染函数
- 轻量，性能更好
- 适合纯展示型组件

```javascript
// 有状态组件
const StatefulComponent = {
  setup() {
    const count = ref(0)  // 有状态
    onMounted(() => {})   // 有生命周期
    
    return () => h('div', count.value)
  }
}

// 函数式组件
function FunctionalComponent(props) {
  // 没有状态，没有生命周期
  // 直接返回 VNode
  return h('div', props.msg)
}
```

思考一下：什么场景适合用函数式组件？

当组件只依赖 props，不需要内部状态和生命周期时，函数式组件是更好的选择。比如展示型组件、图标组件、简单的包装组件等。

## 组件实例

有状态组件在运行时会创建**组件实例**——一个包含组件所有运行时信息的对象：

```javascript
// 简化的组件实例结构
const instance = {
  // 核心标识
  uid: 1,
  type: MyComponent,  // 组件描述对象
  
  // 组件树
  parent: null,       // 父组件实例
  root: null,         // 根组件实例
  
  // VNode
  vnode: null,        // 组件自身的 VNode
  subTree: null,      // render 返回的 VNode
  
  // 状态
  props: {},
  attrs: {},
  slots: {},
  
  // setup 返回值
  setupState: {},
  
  // 渲染
  render: null,
  effect: null,
  update: null,
  
  // 生命周期
  isMounted: false,
  isUnmounted: false,
  
  // 生命周期钩子
  bm: null,  // beforeMount
  m: null,   // mounted
  bu: null,  // beforeUpdate
  u: null,   // updated
  bum: null, // beforeUnmount
  um: null,  // unmounted
  
  // provide/inject
  provides: {},
}
```

组件实例是组件的"灵魂"——它承载了组件的所有状态、渲染逻辑和生命周期。渲染器通过操作组件实例来完成挂载、更新和卸载。

## 组件渲染流程概览

当渲染器遇到组件 VNode 时，执行以下流程：

```
1. 创建组件实例
   createComponentInstance(vnode, parent)

2. 初始化组件
   setupComponent(instance)
   - 初始化 props
   - 初始化 slots
   - 执行 setup() 或处理选项式 API
   - 获取 render 函数

3. 设置渲染副作用
   setupRenderEffect(instance)
   - 创建 effect
   - 调用 render 获取 subTree
   - patch subTree

4. 挂载完成
   instance.isMounted = true
   调用 mounted 钩子
```

这个流程与我们之前学习的响应式系统和调度器紧密关联：
- setup() 中创建的响应式状态（ref、reactive）被收集为依赖
- 状态变化触发 effect 重新执行
- 调度器确保更新按正确顺序执行

## ShapeFlags 与组件类型判断

Vue 使用 ShapeFlags 位运算来高效判断节点类型：

```javascript
const ShapeFlags = {
  ELEMENT: 1,                      // 普通元素
  FUNCTIONAL_COMPONENT: 1 << 1,    // 函数式组件
  STATEFUL_COMPONENT: 1 << 2,      // 有状态组件
  TEXT_CHILDREN: 1 << 3,           // 子节点是文本
  ARRAY_CHILDREN: 1 << 4,          // 子节点是数组
  SLOTS_CHILDREN: 1 << 5,          // 子节点是插槽
  // ...
  COMPONENT: (1 << 1) | (1 << 2),  // 组件（函数式 | 有状态）
}
```

判断组件类型：

```javascript
function isComponent(vnode) {
  return vnode.shapeFlag & ShapeFlags.COMPONENT
}

function isStatefulComponent(vnode) {
  return vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}
```

位运算比多个 `typeof` 判断效率更高，这在频繁调用的 patch 函数中尤为重要。

## 本章小结

本章建立了组件系统的宏观认知：

- **组件是特殊的 VNode**：`type` 是对象或函数，而非字符串
- **组件描述对象**：定义组件的配置（选项式或组合式 API）
- **有状态 vs 函数式**：有无实例和状态是核心区别
- **组件实例**：承载组件所有运行时信息的对象
- **渲染流程**：创建实例 → 初始化 → 设置 effect → 渲染

组件系统是 Vue 框架的核心。接下来几章，我们将深入每个环节：实例创建、挂载流程、更新机制、Props/Emit/Slots 的实现。

下一章，我们从组件实例的创建开始，看看 `createComponentInstance` 是如何工作的。
