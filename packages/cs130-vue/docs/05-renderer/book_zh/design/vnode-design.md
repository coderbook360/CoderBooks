# VNode 节点设计

VNode（Virtual Node）是 Virtual DOM 的基本组成单元。这一章深入分析 Vue 3 的 VNode 设计。

## VNode 的本质

VNode 是一个普通的 JavaScript 对象，用于描述 DOM 节点或组件。它包含了渲染该节点所需的全部信息：节点类型、属性、子节点等。

```typescript
interface VNode {
  type: string | Component | Symbol  // 节点类型
  props: Record<string, any> | null  // 属性
  children: VNode[] | string | null  // 子节点
  key: string | number | null        // 用于 Diff 的唯一标识
  // ... 更多内部属性
}
```

与真实 DOM 节点相比，VNode 的创建和比较成本极低。一个 DOM 节点可能有上百个属性和方法，而 VNode 只包含渲染需要的核心信息。

## Vue 3 VNode 结构

Vue 3 的 VNode 包含以下核心属性：

```typescript
interface VNode {
  __v_isVNode: true           // VNode 标识
  type: VNodeTypes            // 节点类型
  props: VNodeProps | null    // 节点属性
  key: string | number | null // Diff 用的 key
  children: VNodeChildren     // 子节点
  
  // 组件相关
  component: ComponentInstance | null
  
  // DOM 相关
  el: Node | null             // 对应的真实 DOM
  anchor: Node | null         // Fragment 的锚点
  
  // 优化标记
  shapeFlag: number           // 节点类型标记
  patchFlag: number           // 补丁标记
  dynamicChildren: VNode[] | null  // 动态子节点
  dynamicProps: string[] | null    // 动态属性列表
  
  // 其他
  dirs: DirectiveBinding[] | null  // 指令
  transition: TransitionHooks | null
}
```

这个结构既要满足描述 UI 的需求，又要支持高效的 Diff 和更新。

## 节点类型（type）

`type` 字段决定了节点的种类：

**字符串类型**表示原生 DOM 元素：

```javascript
// 原生元素
{ type: 'div', props: { id: 'app' }, children: [] }
```

**对象类型**表示组件：

```javascript
// 组件
{ type: MyComponent, props: { msg: 'hello' }, children: null }
```

**Symbol 类型**表示特殊节点：

```javascript
// Fragment
{ type: Symbol.for('v-fgt'), children: [child1, child2] }

// Text
{ type: Symbol.for('v-txt'), children: 'text content' }

// Comment
{ type: Symbol.for('v-cmt'), children: 'comment' }
```

这种设计让渲染器可以用统一的方式处理不同类型的节点。

## 属性（props）

`props` 包含节点的所有属性，包括 DOM 属性、事件监听器、组件 props 等：

```javascript
{
  type: 'button',
  props: {
    id: 'submit-btn',
    class: 'primary',
    disabled: true,
    onClick: handleClick,
    onMouseenter: handleHover
  }
}
```

Vue 约定以 `on` 开头的属性是事件监听器。渲染器在处理 props 时会区分处理普通属性和事件。

## 子节点（children）

`children` 可以是多种形式：

```javascript
// 文本子节点
{ type: 'span', children: 'Hello' }

// 单个 VNode
{ type: 'div', children: { type: 'span', children: 'child' } }

// VNode 数组
{ type: 'ul', children: [
  { type: 'li', children: 'Item 1' },
  { type: 'li', children: 'Item 2' }
]}

// 插槽函数（组件）
{ type: MyComponent, children: {
  default: () => [h('span', 'slot content')]
}}
```

子节点的多样性是 Vue 灵活性的来源，但也增加了渲染器处理的复杂度。

## Key 的作用

`key` 是 Diff 算法的关键。它帮助渲染器识别节点的身份，决定是复用还是重新创建。

```javascript
// 没有 key 时，渲染器无法识别节点对应关系
[
  { type: 'li', children: 'A' },
  { type: 'li', children: 'B' }
]

// 有 key 时，渲染器可以精确匹配
[
  { type: 'li', key: 1, children: 'A' },
  { type: 'li', key: 2, children: 'B' }
]
```

当列表顺序变化时，有 key 的节点可以被正确移动而非重新创建，大大提升性能。

## ShapeFlag 类型标记

`shapeFlag` 用位运算编码节点的类型信息，让渲染器可以快速判断节点类型：

```typescript
enum ShapeFlags {
  ELEMENT = 1,                    // 普通元素
  FUNCTIONAL_COMPONENT = 1 << 1,  // 函数式组件
  STATEFUL_COMPONENT = 1 << 2,    // 有状态组件
  TEXT_CHILDREN = 1 << 3,         // 文本子节点
  ARRAY_CHILDREN = 1 << 4,        // 数组子节点
  SLOTS_CHILDREN = 1 << 5,        // 插槽子节点
  TELEPORT = 1 << 6,              // Teleport
  SUSPENSE = 1 << 7,              // Suspense
  // ...
}
```

使用位运算可以同时表示多个标记，且判断效率极高：

```javascript
// 判断是否是组件
if (vnode.shapeFlag & ShapeFlags.COMPONENT) { }

// 判断是否有数组子节点
if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) { }
```

## PatchFlag 补丁标记

`patchFlag` 是 Vue 3 的编译时优化核心。它标记节点哪些部分是动态的：

```typescript
enum PatchFlags {
  TEXT = 1,           // 动态文本
  CLASS = 1 << 1,     // 动态 class
  STYLE = 1 << 2,     // 动态 style
  PROPS = 1 << 3,     // 动态 props（需配合 dynamicProps）
  FULL_PROPS = 1 << 4,// 所有 props 都需要比较
  // ...
}
```

Diff 时根据 patchFlag 只比较动态部分：

```javascript
if (patchFlag & PatchFlags.CLASS) {
  // 只更新 class
  patchClass(el, newProps.class)
}
if (patchFlag & PatchFlags.STYLE) {
  // 只更新 style
  patchStyle(el, oldProps.style, newProps.style)
}
```

## VNode 的创建

Vue 提供 `h` 函数和 `createVNode` 函数创建 VNode：

```javascript
import { h, createVNode } from 'vue'

// h 函数是简化的 API
const vnode = h('div', { id: 'app' }, [
  h('span', null, 'Hello')
])

// createVNode 提供完整控制
const vnode = createVNode(
  'div',                    // type
  { id: 'app' },           // props
  children,                 // children
  PatchFlags.CLASS,        // patchFlag
  ['class']                // dynamicProps
)
```

编译器会将模板转换为 `createVNode` 调用，并自动添加优化标记。

## 设计思考

Vue 3 的 VNode 设计体现了几个重要原则：

**信息完备性**。VNode 包含渲染所需的全部信息，渲染器无需额外查询。

**类型编码效率**。使用 shapeFlag 位运算，单个数字表示多个类型信息，判断效率高。

**优化友好**。patchFlag 和 dynamicChildren 等字段专门为编译时优化设计，让运行时可以跳过静态内容。

**扩展性**。预留了 component、transition、dirs 等字段，支持组件、过渡、指令等高级功能。

这种设计让 VNode 既轻量又功能完备，是 Vue 3 渲染器高性能的基础。
