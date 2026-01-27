# 静态提升的设计动机

静态提升（Static Hoisting）是 Vue3 编译时优化的核心策略之一。它的思想简单却效果显著：将模板中不会变化的部分「提升」到渲染函数之外，避免每次渲染时重复创建。这个优化体现了 Vue3「用编译时间换取运行时性能」的设计哲学。

## 问题的本质

在虚拟 DOM 框架中，每次组件更新都需要执行渲染函数生成新的 VNode 树。对于一个复杂的组件，即使只有一个数据变化，也需要重新创建所有 VNode：

```javascript
// 未优化的渲染函数
function render(ctx) {
  return createVNode('div', { class: 'container' }, [
    createVNode('header', null, [
      createVNode('h1', null, 'Welcome'),
      createVNode('nav', null, [
        createVNode('a', { href: '/' }, 'Home'),
        createVNode('a', { href: '/about' }, 'About')
      ])
    ]),
    createVNode('main', null, [
      createVNode('p', null, ctx.message)  // 只有这里是动态的
    ]),
    createVNode('footer', null, [
      createVNode('p', null, 'Copyright 2024')
    ])
  ])
}
```

这段代码每次执行都会创建 10 个 VNode 对象，其中 9 个是完全静态的。创建对象需要分配内存，增加 GC 压力，而这些静态 VNode 本可以复用。

## 静态提升的实现

静态提升将静态 VNode 的创建移到渲染函数外部：

```javascript
// 提升的静态节点
const _hoisted_1 = createVNode('header', null, [
  createVNode('h1', null, 'Welcome'),
  createVNode('nav', null, [
    createVNode('a', { href: '/' }, 'Home'),
    createVNode('a', { href: '/about' }, 'About')
  ])
])

const _hoisted_2 = createVNode('footer', null, [
  createVNode('p', null, 'Copyright 2024')
])

// 优化后的渲染函数
function render(ctx) {
  return createVNode('div', { class: 'container' }, [
    _hoisted_1,  // 复用
    createVNode('main', null, [
      createVNode('p', null, ctx.message)
    ]),
    _hoisted_2   // 复用
  ])
}
```

现在渲染函数每次只创建 3 个 VNode，静态节点全部复用。

## 静态性的判定

编译器需要准确判定哪些节点是静态的。判定规则包括：

**完全静态**：节点及其子树完全没有动态绑定。

```vue
<!-- 完全静态 -->
<div class="static">
  <span>Fixed Text</span>
</div>
```

**部分静态**：节点本身静态，但子树包含动态内容。

```vue
<!-- 部分静态：div 静态，span 动态 -->
<div class="wrapper">
  <span>{{ message }}</span>
</div>
```

编译器会递归分析 AST，标记每个节点的静态性：

```javascript
function markStatic(node) {
  node.isStatic = isStatic(node)
  
  if (node.type === 'Element') {
    for (const child of node.children) {
      markStatic(child)
      // 子节点非静态，父节点也不能完全静态
      if (!child.isStatic) {
        node.isStatic = false
      }
    }
  }
}

function isStatic(node) {
  if (node.type === 'Interpolation') return false
  if (node.type === 'Text') return true
  if (node.type === 'Element') {
    // 检查是否有动态绑定
    return !node.props.some(p => p.type === 'Directive')
  }
  return false
}
```

## 提升的层级

静态提升有不同的激进程度：

**单节点提升**：只提升叶子节点。

```javascript
// 模板
<div>
  <span>Static</span>
  <span>{{ dynamic }}</span>
</div>

// 单节点提升
const _hoisted_1 = createVNode('span', null, 'Static')

function render(ctx) {
  return createVNode('div', null, [
    _hoisted_1,
    createVNode('span', null, ctx.dynamic, 1)
  ])
}
```

**子树提升**：提升整个静态子树。

```javascript
// 模板
<div>
  <header>
    <h1>Title</h1>
    <nav>...</nav>
  </header>
  <main>{{ content }}</main>
</div>

// 子树提升：整个 header 被提升
const _hoisted_1 = createVNode('header', null, [
  createVNode('h1', null, 'Title'),
  createVNode('nav', null, [...])
])
```

**静态属性提升**：即使节点非完全静态，静态属性也可以提升。

```javascript
// 模板
<div class="container" :id="dynamicId">Content</div>

// 属性对象可以部分提升
const _hoisted_props = { class: 'container' }

function render(ctx) {
  return createVNode('div', 
    { ..._hoisted_props, id: ctx.dynamicId },
    'Content',
    8 /* PROPS */
  )
}
```

## 静态字符串化

对于大段静态内容，Vue3 更进一步——直接输出 HTML 字符串：

```javascript
// 模板中有大量静态内容
<div class="article">
  <header>...</header>
  <nav>...</nav>
  <aside>...</aside>
  <!-- 很多静态 HTML -->
</div>

// 编译为静态 HTML 字符串
const _hoisted_1 = createStaticVNode(
  '<div class="article"><header>...</header><nav>...</nav><aside>...</aside></div>',
  1  // 子节点数量
)
```

`createStaticVNode` 创建一个特殊的 VNode，渲染时直接使用 `innerHTML` 插入。这比创建多个 VNode 对象更高效。

```javascript
// 静态 VNode 的渲染
function mountStaticVNode(vnode, container) {
  const el = document.createElement('div')
  el.innerHTML = vnode.children
  
  // 移动所有子节点到容器
  while (el.firstChild) {
    container.appendChild(el.firstChild)
  }
}
```

静态字符串化有阈值控制，只有静态节点数量超过一定值时才会启用，避免小片段的 innerHTML 开销超过 VNode 创建。

## 与 Diff 的协同

静态提升与 Diff 优化紧密配合。提升的节点会被标记为 `HOISTED`：

```javascript
const _hoisted_1 = createVNode('div', null, 'Static', -1 /* HOISTED */)
```

渲染器在 Diff 时识别这个标记，跳过对静态节点的处理：

```javascript
function patch(n1, n2) {
  // 静态节点，直接复用，无需 diff
  if (n2.patchFlag === PatchFlags.HOISTED) {
    n2.el = n1.el
    return
  }
  
  // 正常 diff 流程
  // ...
}
```

这种设计的巧妙之处在于：编译时决定「什么不需要比较」，运行时通过简单的标记检查实现跳过。

## 缓存的处理

静态提升还需要考虑边界情况。例如，在 v-for 内部的静态节点需要特殊处理：

```javascript
// 模板
<div v-for="item in items">
  <span>Label:</span>
  <span>{{ item.name }}</span>
</div>

// 不能简单提升，因为每个迭代需要独立的 DOM 节点
// 但可以提升 VNode 的创建模板
```

编译器通过分析上下文来决定提升策略，确保正确性优先。

## 性能影响分析

静态提升的性能收益来自几个方面：

**减少对象创建**：静态 VNode 只创建一次，复用无限次。

**减少 GC 压力**：更少的临时对象意味着更少的垃圾回收。

**减少 Diff 工作**：通过 HOISTED 标记跳过静态节点的比较。

**利用引擎优化**：提升的常量可以被 JavaScript 引擎更好地优化。

对于静态内容比例高的页面（如文档类应用），静态提升的效果尤为显著。

## 与 React 的对比

React 没有等价的编译时静态提升。每次渲染都会重新执行 JSX，创建新的对象：

```jsx
// React 中每次渲染都创建新对象
function Component({ dynamic }) {
  return (
    <div>
      <span>Static</span>  {/* 每次新建 */}
      <span>{dynamic}</span>
    </div>
  );
}
```

React 通过 `memo` 和 `useMemo` 让开发者手动优化，但这增加了心智负担。Vue3 的编译时提升是自动的，开发者无需关心。

## 设计权衡

静态提升也有其权衡：

**增加编译复杂度**：编译器需要进行静态分析，增加构建时间。

**增加包体积**：提升的常量占用代码空间，虽然通常可以被压缩抵消。

**内存权衡**：提升的节点常驻内存，在大型应用中需要权衡。

Vue3 的设计选择是：编译时做更多工作，换取运行时的最佳性能。这个权衡对于生产环境是正确的——编译只发生一次，而运行发生无数次。

静态提升是 Vue3 编译优化策略的典型代表，它展示了如何通过静态分析提取信息，然后利用这些信息在运行时做更少的工作。这种「编译时多做，运行时少做」的思想贯穿了 Vue3 的整体设计。
