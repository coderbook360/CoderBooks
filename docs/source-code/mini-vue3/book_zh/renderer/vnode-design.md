# VNode 的类型设计与创建函数

VNode 有元素、组件、文本、Fragment 等多种类型。**首先要问的是**：如何高效地判断类型？如何统一创建不同类型的 VNode？

## ShapeFlags：位运算标记

**这是一个经典的底层优化技巧，在很多高性能库中都能看到。** Vue 使用位运算来标记 VNode 的类型：

```javascript
const ShapeFlags = {
  ELEMENT: 1,                    // 0b00000001
  FUNCTIONAL_COMPONENT: 1 << 1,  // 0b00000010
  STATEFUL_COMPONENT: 1 << 2,    // 0b00000100
  TEXT_CHILDREN: 1 << 3,         // 0b00001000
  ARRAY_CHILDREN: 1 << 4,        // 0b00010000
  SLOTS_CHILDREN: 1 << 5,        // 0b00100000
  TELEPORT: 1 << 6,              // 0b01000000
  SUSPENSE: 1 << 7,              // 0b10000000
  COMPONENT: 0b00000110,         // STATEFUL | FUNCTIONAL
}
```

### 为什么用位运算？

1. **判断类型——O(1) 复杂度**：

```javascript
// 判断是否是元素
if (vnode.shapeFlag & ShapeFlags.ELEMENT) {
  // 是元素节点
}

// 判断子节点是否是数组
if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  // 子节点是数组
}
```

2. **组合判断**：

```javascript
// 判断是否是组件（有状态或函数式）
if (vnode.shapeFlag & ShapeFlags.COMPONENT) {
  // 是组件
}
```

3. **多状态存储**：一个数字可以存储多个布尔状态

```javascript
// 这个 vnode 是元素，且子节点是数组
vnode.shapeFlag = ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN
// 0b00000001 | 0b00010000 = 0b00010001
```

## VNode 完整结构

```javascript
const vnode = {
  __v_isVNode: true,           // VNode 标识
  type,                        // 节点类型
  props,                       // 属性
  key,                         // diff 用的 key
  children,                    // 子节点
  
  // 内部属性
  el: null,                    // 对应的真实 DOM
  anchor: null,                // Fragment 的锚点
  
  // 类型标记
  shapeFlag: number,           // 节点类型
  patchFlag: number,           // 编译优化标记
  dynamicProps: null,          // 动态属性列表
  dynamicChildren: null,       // 动态子节点
  
  // 组件相关
  component: null,             // 组件实例
}
```

## 特殊类型 Symbol

```javascript
const Text = Symbol('Text')
const Comment = Symbol('Comment')
const Fragment = Symbol('Fragment')

// 使用 Symbol 作为 type，区分特殊节点
const textVNode = {
  type: Text,
  children: 'Hello'
}
```

## createVNode 实现

```javascript
function createVNode(type, props = null, children = null) {
  // 1. 确定 shapeFlag
  const shapeFlag = typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : typeof type === 'object'
      ? ShapeFlags.STATEFUL_COMPONENT
      : typeof type === 'function'
        ? ShapeFlags.FUNCTIONAL_COMPONENT
        : 0
  
  // 2. 创建 VNode 对象
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children,
    key: props?.key ?? null,
    el: null,
    shapeFlag,
    patchFlag: 0,
    dynamicProps: null,
    dynamicChildren: null,
    component: null
  }
  
  // 3. 规范化子节点
  normalizeChildren(vnode, children)
  
  return vnode
}
```

## normalizeChildren 实现

子节点可能是字符串、数组、插槽对象等，需要规范化：

```javascript
function normalizeChildren(vnode, children) {
  let type = 0
  
  if (children == null) {
    children = null
  } else if (Array.isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    // 插槽对象
    type = ShapeFlags.SLOTS_CHILDREN
  } else if (typeof children === 'function') {
    // 默认插槽函数
    children = { default: children }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    // 字符串或数字
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }
  
  vnode.children = children
  // 使用 |= 合并标记
  vnode.shapeFlag |= type
}
```

## h 函数：用户友好的 API

`h` 是 `createVNode` 的别名，但参数更灵活：

```javascript
function h(type, propsOrChildren, children) {
  const l = arguments.length
  
  if (l === 2) {
    if (typeof propsOrChildren === 'object' && !Array.isArray(propsOrChildren)) {
      // h('div', { class: 'foo' })
      if (isVNode(propsOrChildren)) {
        return createVNode(type, null, [propsOrChildren])
      }
      return createVNode(type, propsOrChildren)
    } else {
      // h('div', 'hello') 或 h('div', [child1, child2])
      return createVNode(type, null, propsOrChildren)
    }
  } else {
    if (l > 3) {
      // h('div', null, child1, child2, child3)
      children = Array.from(arguments).slice(2)
    } else if (l === 3 && isVNode(children)) {
      children = [children]
    }
    return createVNode(type, propsOrChildren, children)
  }
}
```

各种调用方式：

```javascript
h('div')
h('div', { class: 'foo' })
h('div', 'hello')
h('div', [child1, child2])
h('div', { class: 'foo' }, 'hello')
h('div', { class: 'foo' }, [child1, child2])
h('div', null, child1, child2, child3)
```

## isVNode 判断

```javascript
function isVNode(value) {
  return value ? value.__v_isVNode === true : false
}
```

## normalizeVNode 规范化子节点

渲染子节点时，需要将各种类型转为标准 VNode：

```javascript
function normalizeVNode(child) {
  if (child == null || typeof child === 'boolean') {
    // null/undefined/boolean → 注释节点
    return createVNode(Comment)
  }
  
  if (Array.isArray(child)) {
    // 数组 → Fragment
    return createVNode(Fragment, null, child.slice())
  }
  
  if (typeof child === 'object') {
    // 已经是 VNode
    return child.el === null 
      ? child 
      : cloneVNode(child)
  }
  
  // 字符串或数字 → 文本节点
  return createVNode(Text, null, String(child))
}
```

## cloneVNode 克隆节点

有时需要复用 VNode，但要更新部分属性：

```javascript
function cloneVNode(vnode, extraProps) {
  const { props, patchFlag, dynamicProps } = vnode
  
  const mergedProps = extraProps
    ? props 
      ? { ...props, ...extraProps }
      : extraProps
    : props
  
  return {
    __v_isVNode: true,
    type: vnode.type,
    props: mergedProps,
    key: mergedProps?.key ?? vnode.key,
    children: vnode.children,
    shapeFlag: vnode.shapeFlag,
    patchFlag,
    dynamicProps,
    dynamicChildren: vnode.dynamicChildren,
    // 重置 DOM 相关
    el: null,
    component: null
  }
}
```

## 工厂函数

```javascript
function createTextVNode(text = ' ') {
  return createVNode(Text, null, text)
}

function createCommentVNode(text = '') {
  return createVNode(Comment, null, text)
}
```

## 完整实现

```javascript
const Text = Symbol('Text')
const Comment = Symbol('Comment')
const Fragment = Symbol('Fragment')

const ShapeFlags = {
  ELEMENT: 1,
  FUNCTIONAL_COMPONENT: 2,
  STATEFUL_COMPONENT: 4,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16,
  SLOTS_CHILDREN: 32,
  COMPONENT: 6
}

function createVNode(type, props, children) {
  // 确定 shapeFlag
  let shapeFlag
  if (typeof type === 'string') {
    shapeFlag = ShapeFlags.ELEMENT
  } else if (typeof type === 'object') {
    shapeFlag = ShapeFlags.STATEFUL_COMPONENT
  } else if (typeof type === 'function') {
    shapeFlag = ShapeFlags.FUNCTIONAL_COMPONENT
  } else {
    shapeFlag = 0
  }
  
  const vnode = {
    __v_isVNode: true,
    type,
    props,
    children: null,
    key: props?.key ?? null,
    el: null,
    shapeFlag,
    component: null
  }
  
  // 规范化子节点
  if (children != null) {
    if (Array.isArray(children)) {
      vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
      vnode.children = children
    } else if (typeof children === 'object') {
      vnode.shapeFlag |= ShapeFlags.SLOTS_CHILDREN
      vnode.children = children
    } else {
      vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
      vnode.children = String(children)
    }
  }
  
  return vnode
}

function isVNode(value) {
  return value?.__v_isVNode === true
}
```

## 本章小结

VNode 类型系统的核心设计：

- **ShapeFlags**：位运算标记，高效判断类型
- **createVNode**：统一的 VNode 创建函数
- **normalizeChildren**：规范化子节点，合并 shapeFlag
- **h 函数**：用户友好的 API

类型判断模式：

```javascript
if (shapeFlag & ShapeFlags.ELEMENT) { ... }
if (shapeFlag & ShapeFlags.COMPONENT) { ... }
if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { ... }
```

---

## 练习与思考

1. 实现完整的 `createVNode` 和 `h` 函数。

2. 解释以下代码的含义：

```javascript
vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
```

3. 如果需要添加新的 VNode 类型（比如 Portal），应该如何扩展 ShapeFlags？
