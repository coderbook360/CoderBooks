# 运行时与编译时：性能优化的关键抉择

React、Vue、Svelte 都是前端框架，都能用来构建用户界面。但它们的内部架构差异巨大：React 几乎没有编译器，Svelte 几乎没有运行时，Vue 两者兼备。

**这不是偶然的实现差异，而是框架设计的根本性选择。** 这个选择决定了框架的性能天花板、开发体验和适用场景。理解它，是理解 Vue 3 架构的关键。

## 纯运行时：完全的灵活性

先想象一个最简单的框架设计：没有任何编译步骤，用户直接提供数据，框架把数据渲染成 DOM。

```javascript
// 用户提供虚拟 DOM 对象
const vnode = {
  tag: 'div',
  children: [
    { tag: 'span', children: 'hello' }
  ]
}

// 框架的 render 函数将其渲染为真实 DOM
function render(vnode, container) {
  // 根据 tag 创建 DOM 元素
  const el = document.createElement(vnode.tag)
  
  // 处理子节点：可能是文本，也可能是子元素数组
  if (typeof vnode.children === 'string') {
    // 文本节点：直接设置 textContent
    el.textContent = vnode.children
  } else if (Array.isArray(vnode.children)) {
    // 子元素：递归渲染
    vnode.children.forEach(child => render(child, el))
  }
  
  // 将元素插入容器
  container.appendChild(el)
}

render(vnode, document.body)

// 这个 render 函数就是一个"纯运行时"框架的核心
// 它不知道也不关心 vnode 是怎么来的
// 可以是手写的，也可以是某种方式生成的
```

这就是**纯运行时**架构。用户手写虚拟 DOM 对象，框架负责将其转换为真实 DOM。

### 优势

**零构建步骤**：代码写完直接运行，不需要任何编译过程。

**完全灵活**：用户可以用任何 JavaScript 表达式来构造虚拟 DOM，没有语法限制。

**调试友好**：出了问题，直接在浏览器中 debug，不需要 source map。

### 问题

**开发体验差**：手写虚拟 DOM 对象很繁琐。谁愿意这样写代码：

```javascript
const vnode = {
  tag: 'div',
  props: { class: 'container' },
  children: [
    { tag: 'h1', children: title },
    { tag: 'p', children: content },
    // ... 几十层嵌套
  ]
}
```

**无法优化**：框架在运行时拿到的就是一个普通的 JavaScript 对象，完全不知道哪些部分是静态的、哪些是动态的。每次更新都需要完整地 Diff 整个树。

## 纯编译时：极致的性能

另一个极端是**纯编译时**架构。代表框架是 Svelte。

用户写的是一种特殊的模板语法，编译器将其**直接转换为命令式的 DOM 操作代码**。运行时几乎为零。

```svelte
<!-- Svelte 模板 -->
<script>
  let count = 0
</script>

<button on:click={() => count++}>
  Clicked {count} times
</button>
```

编译后（简化）：

```javascript
// Svelte 编译器的输出：直接的 DOM 操作代码
function create_fragment(ctx) {
  // 这些变量持有 DOM 元素的引用
  let button
  let t0  // 静态文本 "Clicked "
  let t1  // 动态文本 count
  
  return {
    // create: 创建所有 DOM 元素
    create() {
      button = document.createElement('button')
      t0 = document.createTextNode('Clicked ')
      t1 = document.createTextNode(ctx.count)  // 初始值
      // 注意：这里没有虚拟 DOM，直接操作真实 DOM
    },
    
    // mount: 将元素插入文档
    mount(target) {
      target.appendChild(button)
      button.appendChild(t0)
      button.appendChild(t1)
    },
    
    // update: 精确更新变化的部分
    update(ctx, dirty) {
      // dirty 是一个位掩码，标记哪些状态变了
      // dirty & 1 检查第 0 位（count）是否变化
      if (dirty & 1) {
        // 直接更新文本节点，不需要 Diff
        t1.data = ctx.count
      }
      // 如果有其他状态，会有 if (dirty & 2) 等检查
    }
  }
}

// 关键洞察：编译器在编译时就知道：
// 1. count 变化只影响 t1 这个文本节点
// 2. 不需要比较整个 DOM 树
// 3. 生成的代码就是最优的 DOM 操作
```

### 优势

**性能接近手写**：编译器生成的代码就是直接的 DOM 操作，没有虚拟 DOM、没有 Diff，性能天花板极高。

**产物极小**：不需要打包一个运行时框架，只有应用代码。对于小型应用，体积优势明显。

**精确更新**：编译器知道 `count` 变化只影响哪个文本节点，生成的更新代码是靶向的。

### 问题

**必须编译**：没有编译就无法运行。不能在浏览器中直接执行 `.svelte` 文件。

**灵活性受限**：某些动态场景难以处理。比如"根据配置动态渲染组件"，如果编译器不知道会渲染什么组件，就无法生成代码。

**动态模板不支持**：无法在运行时传入一个模板字符串让框架渲染。

## Vue 3 的选择：编译时 + 运行时

Vue 3 选择了第三条路：**编译时辅助，运行时执行**。

用户写模板，编译器将其转换为渲染函数，但渲染函数返回的是虚拟 DOM，最终由运行时的渲染器来处理。

```vue-html
<!-- 用户写的模板 -->
<template>
  <div>
    <p>静态内容</p>
    <p>{{ message }}</p>
  </div>
</template>
```

编译后：

```javascript
import { createVNode, createBlock } from 'vue'

// 静态节点被"提升"到模块作用域（函数外部）
// 整个应用生命周期只执行一次
const _hoisted_1 = createVNode('p', null, '静态内容')

export function render(ctx) {
  // createBlock 创建一个 "Block"，它会追踪内部的动态节点
  return createBlock('div', null, [
    _hoisted_1,  // 直接复用，不重新创建 VNode
    // 第 4 个参数 1 就是 PatchFlag，表示 TEXT（只有文本是动态的）
    createVNode('p', null, ctx.message, 1 /* TEXT */)
  ])
}

// Vue 3 的策略：
// 1. 编译器分析模板，提取优化信息
// 2. 生成带有优化提示的渲染函数
// 3. 运行时利用这些提示，跳过不必要的工作
```

关键点在于：编译器做了大量优化工作，但最终产物仍然是**声明式的虚拟 DOM 描述**，由运行时来消费。

### 编译器提供的优化信息

**静态提升 (Static Hoisting)**：静态内容（不含任何动态绑定）只创建一次，之后每次渲染复用同一个 VNode 对象。

```javascript
// 编译前
<div>
  <span>永不变化</span>
  <span>{{ mayChange }}</span>
</div>

// 编译后
const _hoisted_1 = createVNode('span', null, '永不变化')

function render(ctx) {
  return createBlock('div', null, [
    _hoisted_1,  // 每次 render 都复用这个对象
    createVNode('span', null, ctx.mayChange, 1)
  ])
}
```

**PatchFlags**：编译器分析每个动态节点，标记它的"动态类型"。运行时 Diff 时只检查标记的部分。

```javascript
createVNode('p', null, ctx.text, 1 /* TEXT */)
// PatchFlag = 1 表示只有文本是动态的

createVNode('p', { class: ctx.cls }, 'static', 2 /* CLASS */)
// PatchFlag = 2 表示只有 class 是动态的
```

**Block Tree**：对于结构稳定的区域，编译器生成 `createBlock` 而不是 `createVNode`。Block 会追踪其内部的所有动态节点，Diff 时可以跳过子树遍历，直接对比动态节点数组。

### 为什么 Vue 不选择纯编译时

Vue 需要支持一些纯编译时无法处理的场景：

**动态组件**：`<component :is="currentComponent" />`，在运行时才知道渲染什么组件。

**运行时模板编译**：某些场景需要在浏览器中编译模板字符串。

**渲染函数**：用户可以直接写 JavaScript 渲染函数，跳过模板。

**第三方生态**：很多库依赖运行时 API。

### 为什么 Vue 不选择纯运行时

**模板语法更友好**：对于大多数 UI 代码，模板比渲染函数可读性更好。

**编译优化的巨大收益**：没有编译器，就无法实现静态提升、PatchFlags、Block Tree 这些优化。

**更好的 IDE 支持**：模板可以被静态分析，提供更好的自动补全和错误提示。

## 三种架构的权衡

每种架构都是权衡的结果：

**纯运行时**
- 优点：灵活、无构建
- 缺点：开发体验差、无法优化
- 代表：早期的一些库

**纯编译时**
- 优点：性能极致、产物小
- 缺点：必须编译、灵活性受限
- 代表：Svelte

**编译时 + 运行时**
- 优点：兼顾灵活性和性能
- 缺点：复杂度较高
- 代表：Vue 3

Vue 3 的定位是：**在保持完全灵活性的前提下，通过编译器尽可能地逼近纯编译时的性能**。

这意味着：

- 如果你不用模板、只用渲染函数，Vue 3 的行为接近纯运行时
- 如果你用模板，编译器会自动应用所有优化
- 你可以在同一个项目中混用两种方式

## 实际效果

Vue 3 的编译优化效果有多大？看一个对比：

```html
<!-- 模板 -->
<div>
  <p>Title</p>
  <p>{{ desc }}</p>
  <p>Footer</p>
</div>
```

**Vue 2 的 Diff**：每次更新，比较整个树，包括两个静态的 `<p>`。

**Vue 3 的 Diff**：
1. 静态节点被提升，根本不参与 Diff
2. Block 追踪动态节点数组 `[<p>{{ desc }}</p>]`
3. 只比较这一个动态节点
4. PatchFlag 标记只需要比较文本

对于一个有 1000 个静态节点、10 个动态节点的模板，Vue 3 的 Diff 工作量是 Vue 2 的 1%。

## 本章小结

前端框架的架构可以分为三类：

- **纯运行时**：无编译，用户手写虚拟 DOM
- **纯编译时**：编译器直接生成 DOM 操作代码
- **编译时 + 运行时**：编译器生成优化信息，运行时消费

Vue 3 选择"编译时 + 运行时"架构，理由是：

- 需要支持动态场景和渲染函数
- 编译器可以提取大量优化信息
- 保持 API 的灵活性

下一章，我们将看看 Vue 3 的整体模块划分，了解响应式、渲染器、编译器这些核心模块是如何协作的。

---

## 练习与思考

1. 找一个 Vue 3 单文件组件，在 Vue SFC Playground（https://play.vuejs.org/）中查看编译输出。观察编译器生成的 `_hoisted` 变量和 PatchFlags。

2. 思考：React 也有 JSX 编译，为什么说 React 是"纯运行时"而不是"编译时 + 运行时"？

3. Svelte 的纯编译时策略在什么场景下会遇到困难？尝试举例说明。
