# 虚拟 DOM 概述：为什么需要 VNode

**首先要问的是**：直接操作 DOM 有什么问题？为什么 Vue、React 都要搞一个"虚拟 DOM"？

**别急着翻答案，先思考一下**：如果让你实现一个列表渲染，你会怎么做？

## 直接操作 DOM 的问题

### 方式 1：innerHTML

```javascript
div.innerHTML = `
  <ul>
    ${items.map(item => `<li>${item.name}</li>`).join('')}
  </ul>
`
```

**思考一下**：这段代码有什么问题？

答案是**三个问题**：

1. **销毁重建**：每次都销毁并重建所有 DOM 节点——即使只有一个 item 变化
2. **状态丢失**：输入框的内容、滚动位置、焦点都会丢失
3. **性能开销**：频繁触发重排重绘

### 方式 2：手动 DOM 操作

```javascript
items.forEach(item => {
  const li = document.createElement('li')
  li.textContent = item.name
  ul.appendChild(li)
})
```

**这样更好吗？** 也有问题：

1. **代码复杂**：大量命令式代码，难以维护
2. **更新困难**：items 变化后，如何知道哪些 li 需要更新、哪些需要删除、哪些需要新增？

**这就是虚拟 DOM 要解决的问题**。

## 虚拟 DOM 的核心思想

**核心思路很简单**：用 JavaScript 对象来描述 DOM 结构！

```javascript
// 真实 DOM
<div class="container">
  <p>Hello</p>
</div>

// 对应的虚拟 DOM（就是一个普通的 JS 对象）
const vnode = {
  type: 'div',
  props: { class: 'container' },
  children: [
    {
      type: 'p',
      props: null,
      children: 'Hello'
    }
  ]
}
```

**为什么要这样做？** 这带来三个巨大的好处：

1. **高效对比**：JS 对象操作比 DOM 操作快得多，可以在内存中进行 diff
2. **最小更新**：通过比较新旧 VNode，计算出**最小的 DOM 操作**，减少重排重绘
3. **跨平台**：同样的 VNode 可以渲染到不同目标（DOM、Canvas、Native、SSR）

**有没有发现**：这其实就是"多一层抽象"——在 DOM 之上增加一层 JavaScript 对象，让我们能更灵活地处理更新逻辑。**这是理解所有现代前端框架的关键洞察！**

## 渲染流程

```
模板/JSX → 编译器 → render 函数 → VNode → 渲染器 → DOM
```

具体来说：

1. **模板编译**：`<template>` 被编译为 `render` 函数
2. **生成 VNode**：`render` 函数执行，返回 VNode 树
3. **渲染/更新**：渲染器将 VNode 转换为真实 DOM

## VNode 的基本结构

```javascript
const vnode = {
  // 核心属性
  type: 'div',           // 节点类型
  props: { ... },        // 属性
  children: [...],       // 子节点
  key: null,             // diff 用的唯一标识
  
  // 内部属性
  el: null,              // 对应的真实 DOM
  shapeFlag: 1,          // 节点类型标记
  patchFlag: 0,          // 更新类型标记（编译优化）
}
```

## VNode 的类型

### 1. 元素节点

```javascript
const elementVNode = {
  type: 'div',
  props: { class: 'container' },
  children: [...]
}
```

### 2. 文本节点

```javascript
const Text = Symbol('Text')

const textVNode = {
  type: Text,
  children: 'Hello World'
}
```

### 3. 注释节点

```javascript
const Comment = Symbol('Comment')

const commentVNode = {
  type: Comment,
  children: 'This is a comment'
}
```

### 4. Fragment（多根节点）

```javascript
const Fragment = Symbol('Fragment')

const fragmentVNode = {
  type: Fragment,
  children: [vnode1, vnode2, vnode3]
}
```

### 5. 组件节点

```javascript
const componentVNode = {
  type: MyComponent,  // 组件对象
  props: { msg: 'hello' }
}
```

## h 函数：创建 VNode

`h` 是 `hyperscript` 的缩写，意思是"生成 HTML 的脚本"：

```javascript
function h(type, props, children) {
  return {
    type,
    props,
    children,
    el: null,
    key: props?.key ?? null
  }
}

// 使用
const vnode = h('div', { class: 'container' }, [
  h('p', null, 'Hello'),
  h('span', null, 'World')
])
```

## 虚拟 DOM 的性能真相

**这里要打破一个误区**：虚拟 DOM 不一定比直接 DOM 操作快！

### 首次渲染

- **innerHTML**：解析 HTML → 创建 DOM
- **虚拟 DOM**：创建 VNode → 遍历 → 创建 DOM

**innerHTML 可能更快**！因为浏览器对 HTML 解析高度优化。

### 更新

- **innerHTML**：销毁所有 → 重建所有
- **虚拟 DOM**：diff → 最小化更新

**虚拟 DOM 明显更快**！尤其是只有少量变化时。

### 真正的价值

**思考一下**：如果虐拟 DOM 不是"最快的"，为什么 Vue、React 都选择它？

答案是：虐拟 DOM 的价值**不是"最快"，而是"足够快 + 开发体验好"**——这是一个经典的工程权衡：

| 价值 | 说明 |
|------|------|
| **声明式编程** | 描述"是什么"，而不是"怎么做" |
| **可接受的性能** | 在大多数场景下足够快 |
| **开发体验** | 代码更简洁、更易维护 |
| **跨平台** | 同一套代码可以渲染到不同目标 |

**权衡在于**：我们用一点点性能损耗，换来了巨大的开发效率提升。对于大多数应用来说，这是值得的。

## Vue 3 的虚拟 DOM 优化

Vue 3 在编译时做了大量优化：

### 静态提升

```javascript
// 静态节点被提升到 render 函数外部
const _hoisted_1 = h('div', { class: 'static' }, 'Static Content')

function render() {
  return h('div', null, [
    _hoisted_1,  // 静态节点，不参与 diff
    h('span', null, dynamicText.value)  // 只有动态节点需要 diff
  ])
}
```

### PatchFlag 标记

```javascript
const vnode = h('div', null, dynamicText.value)
vnode.patchFlag = 1  // TEXT，只需要更新文本

// 更新时，渲染器知道只需要更新文本，不需要比较其他属性
```

### Block Tree

```javascript
// 编译器会收集动态节点，形成 Block
// 更新时只需要遍历动态节点，跳过静态节点
```

## 最简实现

```javascript
// 创建 VNode
function h(type, props, children) {
  return { type, props, children, el: null }
}

// 渲染 VNode 到 DOM
function render(vnode, container) {
  const el = document.createElement(vnode.type)
  
  // 处理属性
  if (vnode.props) {
    for (const key in vnode.props) {
      el.setAttribute(key, vnode.props[key])
    }
  }
  
  // 处理子节点
  if (typeof vnode.children === 'string') {
    el.textContent = vnode.children
  } else if (Array.isArray(vnode.children)) {
    vnode.children.forEach(child => render(child, el))
  }
  
  container.appendChild(el)
  vnode.el = el
}

// 使用
const vnode = h('div', { class: 'app' }, [
  h('h1', null, 'Hello'),
  h('p', null, 'World')
])

render(vnode, document.body)
```

## 本章小结

虚拟 DOM 的核心价值：

- **描述结构**：用 JS 对象描述 DOM
- **高效对比**：在内存中 diff，计算最小更新
- **声明式编程**：开发者描述目标状态，框架处理更新

VNode 的基本结构：

- **type**：节点类型
- **props**：属性
- **children**：子节点
- **el**：对应的真实 DOM

下一章我们深入 VNode 的类型系统和创建函数。

---

## 练习与思考

1. 实现一个简单的 `h` 函数和 `render` 函数。

2. 思考：为什么 React 和 Vue 都选择虚拟 DOM？有没有不用虚拟 DOM 的方案？

3. 对比 innerHTML 和虚拟 DOM 在不同场景下的性能表现。
