# Block Tree 设计

Block Tree 是 Vue 3 编译优化的核心产物，它与 PatchFlags 配合，让渲染器跳过静态内容，只对比动态节点。这一章分析 Block Tree 的设计思想和运作原理。

## 传统 Diff 的问题

传统 Virtual DOM Diff 需要递归遍历整棵树：

```html
<div>
  <header>
    <h1>网站标题</h1>
    <nav>
      <a href="/">首页</a>
      <a href="/about">关于</a>
    </nav>
  </header>
  <main>
    <p>{{ message }}</p>
  </main>
  <footer>© 2024</footer>
</div>
```

这个模板中只有 `{{ message }}` 是动态的，但传统 Diff 会遍历所有节点。当组件很大时，这种开销相当可观。

## Block 的概念

Block 是一个特殊的 VNode，它收集了自身及所有后代中的动态节点。Diff 时不再递归整棵树，而是直接遍历 Block 的动态节点列表。

```javascript
const block = {
  type: 'div',
  children: [/* 完整的 VNode 树 */],
  dynamicChildren: [
    // 只包含动态节点
    { type: 'p', children: message, patchFlag: 1 /* TEXT */ }
  ]
}
```

有了 `dynamicChildren`，patch 时可以跳过静态节点：

```javascript
function patchBlock(n1, n2) {
  // 直接对比动态节点
  const oldDynamicChildren = n1.dynamicChildren
  const newDynamicChildren = n2.dynamicChildren
  
  for (let i = 0; i < newDynamicChildren.length; i++) {
    patch(oldDynamicChildren[i], newDynamicChildren[i])
  }
}
```

## 动态节点收集

编译器在生成渲染函数时，会开启一个 Block，然后收集过程中遇到的所有动态节点：

```javascript
// 编译生成的代码示意
function render() {
  return openBlock(), createBlock('div', null, [
    createVNode('header', null, [
      createVNode('h1', null, '网站标题'),
      // 静态内容...
    ]),
    createVNode('main', null, [
      createVNode('p', null, ctx.message, 1 /* TEXT */)
    ]),
    createVNode('footer', null, '© 2024')
  ])
}
```

`openBlock()` 初始化收集容器，`createBlock()` 结束收集并返回 Block VNode。中间的 `createVNode` 如果带有 patchFlag，就会被收集到当前 Block。

```javascript
let currentBlock = null

function openBlock() {
  currentBlock = []
}

function createVNode(type, props, children, patchFlag) {
  const vnode = { type, props, children, patchFlag }
  
  // 有 patchFlag 表示动态节点，收集到当前 Block
  if (patchFlag && currentBlock) {
    currentBlock.push(vnode)
  }
  
  return vnode
}

function createBlock(type, props, children) {
  const vnode = createVNode(type, props, children)
  // Block 自身不需要收集
  vnode.dynamicChildren = currentBlock
  currentBlock = null
  return vnode
}
```

## Block Tree 结构

模板中存在结构性指令（v-if、v-for）时，会形成嵌套的 Block。每个结构性指令创建一个新的 Block，形成 Block Tree：

```html
<div>
  <p>静态段落</p>
  <div v-if="show">
    <span>{{ text }}</span>
  </div>
</div>
```

生成两个 Block：
- 根 Block：包含 v-if 的 Block 节点
- v-if Block：包含动态的 span

```javascript
function render() {
  return openBlock(), createBlock('div', null, [
    createVNode('p', null, '静态段落'),
    show
      ? (openBlock(), createBlock('div', { key: 0 }, [
          createVNode('span', null, ctx.text, 1 /* TEXT */)
        ]))
      : createCommentVNode('v-if')
  ])
}
```

## 为什么需要 Block Tree

如果只有一个根 Block，v-if 的分支变化会导致问题。假设：

```javascript
// show = true 时
dynamicChildren = [span]

// show = false 时
dynamicChildren = []
```

数组结构变了，无法一一对应 patch。

通过让 v-if 创建独立 Block，结构变化被隔离。根 Block 的 dynamicChildren 始终包含 v-if 的 Block（或注释节点），只是 Block 内部内容变化。

## v-for 的 Fragment Block

v-for 生成的多个节点用 Fragment 包裹，也形成 Block：

```html
<div>
  <p v-for="item in list" :key="item.id">
    {{ item.name }}
  </p>
</div>
```

```javascript
function render() {
  return openBlock(), createBlock('div', null, [
    (openBlock(true), createBlock(Fragment, null, 
      list.map(item => 
        createVNode('p', { key: item.id }, item.name, 1 /* TEXT */)
      ),
      128 /* KEYED_FRAGMENT */
    ))
  ])
}
```

注意 `openBlock(true)` 的参数，表示这是一个不稳定的 Block（子节点可能增减）。这种 Block 不会收集动态节点，因为子节点本身就需要完整 Diff。

## 稳定与不稳定 Block

Block 分两类：

**稳定 Block**：结构不变，只有节点内容变化。例如普通的静态模板。可以使用 `dynamicChildren` 优化。

**不稳定 Block**：结构可能变化，例如 v-for。需要回退到传统 Diff。

```javascript
function openBlock(disableTracking = false) {
  if (disableTracking) {
    currentBlock = null  // 不收集动态节点
  } else {
    currentBlock = []
  }
}
```

## Patch 流程

根据是否有 `dynamicChildren` 选择 Diff 策略：

```javascript
function patchElement(n1, n2) {
  const el = n2.el = n1.el
  
  // patch props（根据 patchFlag 优化）
  patchProps(el, n1.props, n2.props, n2.patchFlag)
  
  if (n2.dynamicChildren) {
    // 稳定 Block，只 patch 动态节点
    patchBlockChildren(n1.dynamicChildren, n2.dynamicChildren)
  } else {
    // 不稳定或无优化，完整 Diff
    patchChildren(n1, n2, el)
  }
}

function patchBlockChildren(oldChildren, newChildren) {
  for (let i = 0; i < newChildren.length; i++) {
    patch(oldChildren[i], newChildren[i])
  }
}
```

## 与 PatchFlags 协同

Block 收集动态节点，PatchFlags 标记节点的哪些部分是动态的。两者结合实现精准更新：

```javascript
function patchElement(n1, n2) {
  const el = n2.el = n1.el
  const patchFlag = n2.patchFlag
  
  if (patchFlag) {
    // 根据 PatchFlag 精准更新
    if (patchFlag & PatchFlags.CLASS) {
      if (n1.props.class !== n2.props.class) {
        el.className = n2.props.class
      }
    }
    if (patchFlag & PatchFlags.STYLE) {
      // 更新 style...
    }
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        el.textContent = n2.children
      }
    }
  } else {
    // 无优化标记，完整 diff props
    patchProps(el, n1.props, n2.props)
  }
  
  // 处理 children...
}
```

## 静态提升

与 Block Tree 配合的另一个优化是静态提升（Static Hoisting）。编译器将纯静态节点提取到渲染函数外部，避免重复创建：

```javascript
// 静态节点提升到模块顶层
const _hoisted_1 = createVNode('p', null, '静态段落')
const _hoisted_2 = createVNode('footer', null, '© 2024')

function render() {
  return openBlock(), createBlock('div', null, [
    _hoisted_1,  // 复用已创建的 VNode
    createVNode('main', null, [
      createVNode('p', null, ctx.message, 1)
    ]),
    _hoisted_2
  ])
}
```

静态节点只创建一次，渲染函数每次执行直接复用。

## 性能提升分析

假设一个组件有 100 个节点，其中 5 个是动态的。

**传统 Diff**：每次更新遍历 100 个节点，O(100)

**Block Tree 优化**：每次更新只遍历 5 个动态节点，O(5)

实际场景中，静态内容往往远多于动态内容，优化效果显著。

## 局限性

Block Tree 不是银弹：

1. **运行时成本**：收集动态节点有开销（虽然很小）
2. **不稳定结构**：v-for 场景需要回退完整 Diff
3. **编译依赖**：需要编译器支持，纯运行时 h() 函数无法享受
4. **Fragment 边界**：跨 Block 优化有限

## 小结

Block Tree 是 Vue 3 编译时优化的核心机制。通过在编译阶段收集动态节点，运行时 Diff 可以跳过大量静态内容。

这种优化体现了 Vue 3 的设计哲学：编译器和运行时紧密协作，各自发挥优势，共同提升性能。
