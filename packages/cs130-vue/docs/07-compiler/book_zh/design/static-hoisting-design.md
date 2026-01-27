# 静态提升设计

静态提升（Static Hoisting）是 Vue 3 编译器最直观也最有效的优化之一。它将永远不变的 VNode 提取到渲染函数外部，避免每次渲染时重复创建相同的对象。

## 问题的根源

在 Vue 2 和其他虚拟 DOM 框架中，渲染函数每次执行都会创建新的 VNode 对象：

```javascript
function render() {
  return h('div', [
    h('span', 'Static Text'),  // 每次创建新对象
    h('span', this.dynamicText)
  ])
}
```

即使 "Static Text" 永远不会变，每次渲染都要：分配新对象的内存、填充对象属性、最后让垃圾回收器清理旧对象。对于大型模板，这种开销积少成多相当可观。

## 静态提升的解决方案

编译器识别出静态 VNode，将其创建提升到渲染函数外部：

```javascript
// 提升到模块作用域
const _hoisted_1 = h('span', 'Static Text')

function render() {
  return h('div', [
    _hoisted_1,  // 复用同一个对象
    h('span', this.dynamicText)
  ])
}
```

现在静态 VNode 只创建一次。后续渲染直接引用它，无需重新创建。这既减少了内存分配，也减少了 GC 压力。

## 识别可提升的节点

什么样的节点可以被提升？核心判断标准是"内容完全静态"。

纯文本节点如果不包含插值表达式就是静态的。元素节点如果标签名静态、所有属性静态、所有子节点静态，整个节点就是静态的。

```html
<template>
  <div class="wrapper">
    <h1>Welcome</h1>               <!-- 可提升 -->
    <p>Static paragraph</p>        <!-- 可提升 -->
    <span>{{ message }}</span>     <!-- 不可提升 -->
    <img :src="imageSrc" />        <!-- 不可提升 -->
  </div>
</template>
```

h1 和 p 完全静态，可以提升。span 有动态插值，img 有动态属性，都不能提升。

## 提升粒度

提升可以在不同粒度进行：

单个节点提升是最基本的。把一个静态元素的 createVNode 调用提升出去。

整个子树提升更激进。如果一个元素及其所有后代都是静态的，整棵子树作为一个单元提升：

```javascript
const _hoisted_1 = h('div', { class: 'static' }, [
  h('h1', 'Title'),
  h('p', 'Description'),
  h('ul', [
    h('li', 'Item 1'),
    h('li', 'Item 2')
  ])
])
```

这样一次提升就覆盖了多个节点，效果更好。

## 静态属性提升

即使节点整体不能提升，静态属性也可以单独提升：

```html
<div :class="dynamicClass" data-testid="container">
  {{ content }}
</div>
```

data-testid 是静态属性，可以被提升：

```javascript
const _hoisted_attrs = { 'data-testid': 'container' }

function render() {
  return h('div', 
    { class: this.dynamicClass, ..._hoisted_attrs },
    this.content
  )
}
```

这种细粒度提升减少了属性对象的创建开销。

## 静态内容序列化

Vue 3.1 引入了更激进的优化：将大块静态内容序列化为 HTML 字符串。

当检测到连续多个静态节点时，编译器可以将它们合并为一个静态块：

```javascript
const _hoisted_1 = /*#__PURE__*/ _createStaticVNode(
  '<div class="container"><h1>Title</h1><p>Description</p></div>',
  1  // 子节点数量
)
```

首次挂载时直接 innerHTML 设置，比逐个创建 VNode 快得多。这对于内容较多的静态区域特别有效。

## 提升的限制

并非所有静态内容都应该提升。

v-pre 指令内的节点虽然静态，但语义上应该保持原样，不做额外处理。

带有 key 的节点通常不提升，因为 key 可能用于触发重新渲染。

ref 绑定的节点需要在每次渲染时被引用，提升会破坏这种机制。

某些指令（如 v-memo）有特殊的行为，影响提升决策。

## 提升与 Diff 算法

静态提升对 diff 算法有利。当新旧 VNode 是同一个对象时（n1 === n2），diff 可以直接跳过：

```javascript
function patch(n1, n2) {
  if (n1 === n2) {
    return  // 完全相同，无需处理
  }
  // ...正常的 diff 逻辑
}
```

这是最快的"diff"——根本不做任何比较，直接返回。静态提升让大量节点可以走这条快速路径。

## 提升的代价

静态提升也有代价。

首先是增加了模块作用域的变量数量。每个提升的节点都是一个模块级变量，大量提升可能使生成的代码变长。

其次是静态节点在内存中常驻。正常情况下，渲染后的 VNode 会在下次渲染时被回收。提升的节点则一直存在。对于大多数应用这不是问题，但在极端情况下（巨大的静态内容，内存敏感的环境）需要注意。

最后是调试复杂度略增。提升的节点定义位置和使用位置分离，跟踪代码流程需要额外注意。

## 编译选项

Vue 编译器提供选项控制提升行为：

```javascript
compile(template, {
  hoistStatic: true,  // 默认开启
  // ...
})
```

生产环境建议保持开启。开发环境也通常开启，因为它不影响调试体验（有 source map 支持）。

某些测试场景可能需要关闭提升，以获得更可预测的渲染行为。

## 小结

静态提升是一个简单而有效的优化策略。通过识别永远不变的内容并将其创建提升到渲染函数外部，Vue 避免了重复创建 VNode 的开销，减少了内存分配和垃圾回收压力。更重要的是，提升的节点让 diff 算法可以快速跳过静态部分，专注于真正可能变化的内容。这种"一次创建，永远复用"的理念贯穿了 Vue 3 的优化策略。
