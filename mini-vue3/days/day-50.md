# Day 50: VNode 虚拟 DOM 的设计

> 学习日期: 2026年01月10日  
> 预计用时: 3小时  
> 难度等级: ⭐⭐⭐

## 📋 今日目标

- [ ] 理解虚拟 DOM 的核心概念和优势
- [ ] 掌握 VNode 的数据结构设计
- [ ] 实现 createVNode 函数
- [ ] 理解 VNode 的类型系统
- [ ] 实现 VNode 的标准化处理

## ⏰ 时间规划

- 理论学习: 1小时
- 编码实践: 1.5小时
- 测试调试: 30分钟

---

## 📚 理论知识详解

### 1. 什么是虚拟 DOM？

#### 1.1 核心概念

**虚拟 DOM（Virtual DOM）是真实 DOM 的 JavaScript 对象表示**。

```javascript
// 真实 DOM
<div id="app" class="container">
  <h1>Hello</h1>
  <p>World</p>
</div>

// 虚拟 DOM（VNode）
const vnode = {
  type: 'div',
  props: {
    id: 'app',
    class: 'container'
  },
  children: [
    {
      type: 'h1',
      children: 'Hello'
    },
    {
      type: 'p',
      children: 'World'
    }
  ]
}
```

#### 1.2 为什么需要虚拟 DOM？

##### ① 性能优化

直接操作 DOM 很慢：

```javascript
// ❌ 直接操作 DOM（慢）
for (let i = 0; i < 1000; i++) {
  const div = document.createElement('div')
  div.textContent = `Item ${i}`
  document.body.appendChild(div) // 每次都触发重排/重绘
}

// ✅ 虚拟 DOM（快）
const vnodes = []
for (let i = 0; i < 1000; i++) {
  vnodes.push(createVNode('div', null, `Item ${i}`))
}
// 一次性批量更新 DOM
patch(oldVNode, vnodes)
```

**性能对比**：
- 直接操作 DOM：1000 次重排/重绘
- 虚拟 DOM：1 次 Diff + 1 次批量更新

##### ② 跨平台能力

```javascript
// 同一套 VNode，可以渲染到不同平台
const vnode = createVNode('div', null, 'Hello')

// 浏览器平台
renderToDOM(vnode) // <div>Hello</div>

// 服务端平台
renderToString(vnode) // "<div>Hello</div>"

// 小程序平台
renderToMiniProgram(vnode) // <view>Hello</view>

// 原生平台
renderToNative(vnode) // UIView
```

##### ③ 声明式编程

```javascript
// 命令式（告诉浏览器怎么做）
const div = document.createElement('div')
div.className = 'container'
const h1 = document.createElement('h1')
h1.textContent = 'Hello'
div.appendChild(h1)
document.body.appendChild(div)

// 声明式（告诉 Vue 想要什么）
<div class="container">
  <h1>Hello</h1>
</div>
```

---

### 2. VNode 的数据结构设计

#### 2.1 核心字段

```typescript
interface VNode {
  // 核心字段
  type: string | Component | typeof Text | typeof Comment | typeof Fragment
  props: Record<string, any> | null
  children: VNodeNormalizedChildren
  
  // DOM 相关
  el: Element | null // 真实 DOM 节点
  anchor: Node | null // 插入锚点
  
  // 组件相关
  component: ComponentInstance | null
  suspense: SuspenseBoundary | null
  
  // 优化标记
  key: string | number | symbol | null
  ref: Ref | null
  
  // 类型标记
  shapeFlag: ShapeFlags // 节点类型标识
  patchFlag: PatchFlags // 更新类型标识
  
  // 其他
  dirs: DirectiveBinding[] | null // 指令
  transition: TransitionHooks | null // 过渡动画
}
```

#### 2.2 VNode 的类型

Vue 3 中的 VNode 有多种类型：

```typescript
// 1. 元素节点
const elementVNode = {
  type: 'div',
  props: { class: 'container' },
  children: [...]
}

// 2. 文本节点
const textVNode = {
  type: Text,
  children: 'Hello World'
}

// 3. 注释节点
const commentVNode = {
  type: Comment,
  children: '这是注释'
}

// 4. 组件节点
const componentVNode = {
  type: MyComponent,
  props: { msg: 'hello' }
}

// 5. 片段节点（Fragment）
const fragmentVNode = {
  type: Fragment,
  children: [vnode1, vnode2, vnode3]
}
```

---

### 3. ShapeFlag：VNode 类型标识

#### 3.1 位运算优化

Vue 3 使用**位运算**来标识 VNode 类型，性能极高：

```typescript
export enum ShapeFlags {
  ELEMENT = 1,                  // 0000 0001 = 1  元素
  FUNCTIONAL_COMPONENT = 1 << 1, // 0000 0010 = 2  函数式组件
  STATEFUL_COMPONENT = 1 << 2,   // 0000 0100 = 4  有状态组件
  TEXT_CHILDREN = 1 << 3,        // 0000 1000 = 8  文本子节点
  ARRAY_CHILDREN = 1 << 4,       // 0001 0000 = 16 数组子节点
  SLOTS_CHILDREN = 1 << 5,       // 0010 0000 = 32 插槽子节点
  TELEPORT = 1 << 6,             // 0100 0000 = 64 Teleport
  SUSPENSE = 1 << 7,             // 1000 0000 = 128 Suspense
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,   // 256
  COMPONENT_KEPT_ALIVE = 1 << 9,          // 512
  COMPONENT = STATEFUL_COMPONENT | FUNCTIONAL_COMPONENT // 6
}
```

#### 3.2 位运算的优势

```typescript
// 设置多个标记（使用 | 或运算）
let shapeFlag = ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN
// shapeFlag = 0001 0001 = 17

// 检查是否是元素（使用 & 与运算）
if (shapeFlag & ShapeFlags.ELEMENT) {
  console.log('是元素节点')
}

// 检查是否有数组子节点
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  console.log('有数组子节点')
}

// 添加标记
shapeFlag |= ShapeFlags.TEXT_CHILDREN

// 移除标记
shapeFlag &= ~ShapeFlags.ARRAY_CHILDREN

// 为什么用位运算？
// 1. 性能极高（CPU 直接支持）
// 2. 节省内存（一个数字存储多个状态）
// 3. 判断速度快（一次运算，不需要多个 if）
```

---

### 4. PatchFlag：更新优化标记

#### 4.1 精确追踪变化

```typescript
export enum PatchFlags {
  TEXT = 1,              // 动态文本
  CLASS = 1 << 1,        // 动态 class
  STYLE = 1 << 2,        // 动态 style
  PROPS = 1 << 3,        // 动态属性（除 class/style）
  FULL_PROPS = 1 << 4,   // 有动态 key 的属性
  HYDRATE_EVENTS = 1 << 5, // 事件监听器
  STABLE_FRAGMENT = 1 << 6, // 稳定的 fragment
  KEYED_FRAGMENT = 1 << 7,  // 有 key 的 fragment
  UNKEYED_FRAGMENT = 1 << 8, // 无 key 的 fragment
  NEED_PATCH = 1 << 9,      // 需要 patch
  DYNAMIC_SLOTS = 1 << 10,   // 动态插槽
  HOISTED = -1,              // 静态节点
  BAIL = -2                  // 退出优化
}
```

#### 4.2 编译时优化

```html
<!-- 模板 -->
<div>
  <p>静态文本</p>
  <p>{{ msg }}</p>
  <p :class="dynamicClass">动态 class</p>
</div>
```

```javascript
// 编译后的 render 函数
function render() {
  return createVNode('div', null, [
    // 静态节点，永不更新
    createVNode('p', null, '静态文本', PatchFlags.HOISTED),
    
    // 只有文本是动态的
    createVNode('p', null, msg, PatchFlags.TEXT),
    
    // 只有 class 是动态的
    createVNode('p', { class: dynamicClass }, '动态 class', PatchFlags.CLASS)
  ])
}

// 更新时：
// 1. 跳过静态节点
// 2. 只更新 TEXT 节点的文本
// 3. 只更新 CLASS 节点的 class
```

---

## 💻 实践任务

### 任务目标
实现 VNode 的创建和类型系统。

---

### 步骤1：定义 VNode 类型（20分钟）

```typescript
// src/runtime-core/vnode.ts

/**
 * VNode 类型
 */
export const Text = Symbol('Text')
export const Comment = Symbol('Comment')
export const Fragment = Symbol('Fragment')

/**
 * VNode 形状标记
 */
export enum ShapeFlags {
  ELEMENT = 1,                      // 元素
  FUNCTIONAL_COMPONENT = 1 << 1,    // 函数组件
  STATEFUL_COMPONENT = 1 << 2,      // 有状态组件
  TEXT_CHILDREN = 1 << 3,           // 文本子节点
  ARRAY_CHILDREN = 1 << 4,          // 数组子节点
  SLOTS_CHILDREN = 1 << 5,          // 插槽子节点
  TELEPORT = 1 << 6,                // Teleport
  SUSPENSE = 1 << 7,                // Suspense
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}

/**
 * VNode 接口
 */
export interface VNode {
  __v_isVNode: true
  type: VNodeTypes
  props: VNodeProps | null
  children: VNodeNormalizedChildren
  component: ComponentInstance | null
  el: RendererElement | null
  key: string | number | symbol | null
  ref: VNodeRef | null
  shapeFlag: number
  patchFlag: number
}

export type VNodeTypes = 
  | string 
  | typeof Text 
  | typeof Comment 
  | typeof Fragment
  | Component

export type VNodeProps = Record<string, any> | null

export type VNodeNormalizedChildren = 
  | string 
  | VNode[] 
  | null

export interface VNodeRef {
  // ref 实现
}

export interface ComponentInstance {
  // 组件实例
}
```

---

### 步骤2：实现 createVNode 函数（30分钟）

```typescript
// src/runtime-core/vnode.ts

/**
 * 创建 VNode
 */
export function createVNode(
  type: VNodeTypes,
  props: VNodeProps | null = null,
  children: unknown = null
): VNode {
  // 1. 创建 VNode 对象
  const vnode: VNode = {
    __v_isVNode: true,
    type,
    props,
    children: null,
    component: null,
    el: null,
    key: props?.key ?? null,
    ref: props?.ref ?? null,
    shapeFlag: getShapeFlag(type),
    patchFlag: 0
  }
  
  // 2. 标准化 children
  normalizeChildren(vnode, children)
  
  return vnode
}

/**
 * 获取 shapeFlag
 */
function getShapeFlag(type: VNodeTypes): number {
  return typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : typeof type === 'object'
    ? ShapeFlags.STATEFUL_COMPONENT
    : typeof type === 'function'
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0
}

/**
 * 标准化 children
 */
function normalizeChildren(vnode: VNode, children: unknown) {
  let type = 0
  
  if (children == null) {
    children = null
  } else if (Array.isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    // TODO: 处理 slots
    type = ShapeFlags.SLOTS_CHILDREN
  } else if (typeof children === 'function') {
    // TODO: 处理函数式 children
  } else {
    // 转为字符串
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }
  
  vnode.children = children as VNodeNormalizedChildren
  vnode.shapeFlag |= type // 添加 children 类型标记
}
```

---

### 步骤3：实现辅助函数（20分钟）

```typescript
// src/runtime-core/vnode.ts

/**
 * 创建文本 VNode
 */
export function createTextVNode(text: string): VNode {
  return createVNode(Text, null, text)
}

/**
 * 创建注释 VNode
 */
export function createCommentVNode(text: string): VNode {
  return createVNode(Comment, null, text)
}

/**
 * 判断是否是 VNode
 */
export function isVNode(value: any): value is VNode {
  return value && value.__v_isVNode === true
}

/**
 * 判断是否是相同的 VNode（用于 Diff）
 */
export function isSameVNodeType(n1: VNode, n2: VNode): boolean {
  return n1.type === n2.type && n1.key === n2.key
}

/**
 * 克隆 VNode
 */
export function cloneVNode(vnode: VNode): VNode {
  const cloned = {
    ...vnode,
    props: vnode.props ? { ...vnode.props } : null,
    children: vnode.children
      ? Array.isArray(vnode.children)
        ? vnode.children.map(child =>
            isVNode(child) ? cloneVNode(child) : child
          )
        : vnode.children
      : null
  }
  
  return cloned as VNode
}

/**
 * 标准化 VNode（用于 h 函数）
 */
export function normalizeVNode(child: VNodeChild): VNode {
  if (child == null || typeof child === 'boolean') {
    // 空节点
    return createVNode(Comment, null, '')
  } else if (Array.isArray(child)) {
    // 数组包装成 Fragment
    return createVNode(Fragment, null, child)
  } else if (typeof child === 'object') {
    // 已经是 VNode
    return child as VNode
  } else {
    // 文本节点
    return createVNode(Text, null, String(child))
  }
}

export type VNodeChild =
  | VNode
  | string
  | number
  | boolean
  | null
  | undefined
  | VNodeChild[]
```

---

### 步骤4：实现 h 函数（20分钟）

```typescript
// src/runtime-core/h.ts

import { createVNode, VNode, VNodeProps } from './vnode'

/**
 * h 函数：创建 VNode 的便捷方法
 * 
 * 支持多种调用方式：
 * h('div')
 * h('div', { class: 'red' })
 * h('div', 'hello')
 * h('div', ['hello', 'world'])
 * h('div', { class: 'red' }, 'hello')
 * h('div', { class: 'red' }, ['hello', 'world'])
 */
export function h(
  type: any,
  propsOrChildren?: any,
  children?: any
): VNode {
  const l = arguments.length
  
  // h('div')
  if (l === 1) {
    return createVNode(type)
  }
  
  // h('div', { class: 'red' })
  // h('div', 'hello')
  // h('div', [h('span')])
  if (l === 2) {
    // 如果是数组或 VNode，当作 children
    if (Array.isArray(propsOrChildren) || isVNode(propsOrChildren)) {
      return createVNode(type, null, propsOrChildren)
    }
    
    // 如果是对象，判断是 props 还是 VNode
    if (typeof propsOrChildren === 'object' && !isVNode(propsOrChildren)) {
      return createVNode(type, propsOrChildren)
    }
    
    // 其他情况当作文本 children
    return createVNode(type, null, propsOrChildren)
  }
  
  // h('div', {}, 'hello')
  // h('div', {}, [h('span')])
  if (l === 3) {
    return createVNode(type, propsOrChildren, children)
  }
  
  // h('div', {}, 'a', 'b', 'c')
  // 超过3个参数，后面的都是 children
  return createVNode(
    type,
    propsOrChildren,
    Array.prototype.slice.call(arguments, 2)
  )
}
```

---

### 步骤5：编写测试用例（30分钟）

```typescript
// test/runtime-core/vnode.spec.ts

import { describe, it, expect } from 'vitest'
import { 
  createVNode, 
  createTextVNode,
  isVNode,
  isSameVNodeType,
  cloneVNode,
  Text,
  Comment,
  Fragment,
  ShapeFlags
} from '../../src/runtime-core/vnode'
import { h } from '../../src/runtime-core/h'

describe('VNode', () => {
  describe('createVNode', () => {
    it('应该创建元素 VNode', () => {
      const vnode = createVNode('div', { class: 'test' }, 'hello')
      
      expect(vnode.type).toBe('div')
      expect(vnode.props).toEqual({ class: 'test' })
      expect(vnode.children).toBe('hello')
      expect(vnode.shapeFlag).toBe(
        ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
      )
    })
    
    it('应该创建文本 VNode', () => {
      const vnode = createTextVNode('hello')
      
      expect(vnode.type).toBe(Text)
      expect(vnode.children).toBe('hello')
    })
    
    it('应该正确处理数组 children', () => {
      const vnode = createVNode('div', null, [
        createVNode('span'),
        createVNode('p')
      ])
      
      expect(vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN).toBeTruthy()
      expect(Array.isArray(vnode.children)).toBe(true)
    })
    
    it('应该提取 key', () => {
      const vnode = createVNode('div', { key: 'test' })
      expect(vnode.key).toBe('test')
    })
  })
  
  describe('isVNode', () => {
    it('应该正确判断 VNode', () => {
      expect(isVNode(createVNode('div'))).toBe(true)
      expect(isVNode({})).toBe(false)
      expect(isVNode(null)).toBe(false)
    })
  })
  
  describe('isSameVNodeType', () => {
    it('应该正确判断相同类型的 VNode', () => {
      const n1 = createVNode('div', { key: 'a' })
      const n2 = createVNode('div', { key: 'a' })
      const n3 = createVNode('div', { key: 'b' })
      const n4 = createVNode('span', { key: 'a' })
      
      expect(isSameVNodeType(n1, n2)).toBe(true)
      expect(isSameVNodeType(n1, n3)).toBe(false)
      expect(isSameVNodeType(n1, n4)).toBe(false)
    })
  })
  
  describe('cloneVNode', () => {
    it('应该克隆 VNode', () => {
      const original = createVNode('div', { class: 'test' }, 'hello')
      const cloned = cloneVNode(original)
      
      expect(cloned).not.toBe(original)
      expect(cloned.type).toBe(original.type)
      expect(cloned.props).not.toBe(original.props)
      expect(cloned.props).toEqual(original.props)
    })
  })
  
  describe('h', () => {
    it('h(type)', () => {
      const vnode = h('div')
      expect(vnode.type).toBe('div')
    })
    
    it('h(type, props)', () => {
      const vnode = h('div', { class: 'test' })
      expect(vnode.props).toEqual({ class: 'test' })
    })
    
    it('h(type, children)', () => {
      const vnode = h('div', 'hello')
      expect(vnode.children).toBe('hello')
    })
    
    it('h(type, [children])', () => {
      const vnode = h('div', [h('span'), h('p')])
      expect(Array.isArray(vnode.children)).toBe(true)
      expect(vnode.children).toHaveLength(2)
    })
    
    it('h(type, props, children)', () => {
      const vnode = h('div', { class: 'test' }, 'hello')
      expect(vnode.props).toEqual({ class: 'test' })
      expect(vnode.children).toBe('hello')
    })
    
    it('h(type, props, [children])', () => {
      const vnode = h('div', { class: 'test' }, [h('span'), h('p')])
      expect(vnode.props).toEqual({ class: 'test' })
      expect(Array.isArray(vnode.children)).toBe(true)
    })
  })
})
```

---

## 🤔 思考题

### 问题1: 为什么使用位运算来标识 VNode 类型？

**提示**: 
- 性能
- 内存
- 多标记组合

### 问题2: PatchFlag 如何提升更新性能？

**提示**: 
- 编译时优化
- 跳过静态节点
- 精确更新

### 问题3: h 函数的参数重载如何实现？

**提示**: 参数个数判断、类型检测

---

## 📝 学习总结

完成今天的学习后，请回答：

1. **虚拟 DOM 的三大优势是什么？**

2. **VNode 的核心字段有哪些？**

3. **ShapeFlags 和 PatchFlags 的区别？**

---

## 📖 扩展阅读

- [Vue 3 源码：vnode.ts](https://github.com/vuejs/core/blob/main/packages/runtime-core/src/vnode.ts)
- [虚拟 DOM 的原理与实现](https://github.com/snabbdom/snabbdom)

---

## ⏭️ 明日预告

### Day 51: 实现渲染器 Renderer

明天我们将学习：
- 渲染器的核心概念
- mount 挂载过程
- patch 更新过程

**核心任务**: 将 VNode 渲染成真实 DOM

---

**VNode 是 Vue 的核心数据结构，理解它是掌握运行时的关键！** 🎯
