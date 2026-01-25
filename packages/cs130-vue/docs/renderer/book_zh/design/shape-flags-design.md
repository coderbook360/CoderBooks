# ShapeFlags 类型标记设计

ShapeFlags 是 Vue 3 用于标记 VNode 类型的位掩码系统。这一章分析其设计思想和实现细节。

## 为什么需要类型标记

渲染器处理 VNode 时，需要频繁判断节点类型：是元素还是组件？子节点是文本还是数组？如果每次都通过 `typeof` 或 `Array.isArray` 判断，会有性能开销。

ShapeFlags 用一个数字的位来编码多种类型信息，判断只需一次位运算，效率极高。

```javascript
// 传统方式：多次类型判断
if (typeof type === 'string') { /* 元素 */ }
if (Array.isArray(children)) { /* 数组子节点 */ }

// ShapeFlags：一次位运算
if (shapeFlag & ShapeFlags.ELEMENT) { /* 元素 */ }
if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) { /* 数组子节点 */ }
```

## 位运算基础

ShapeFlags 使用位运算，这里简单回顾相关概念。

每个 flag 占用一个二进制位。使用左移运算符 `<<` 定义：

```javascript
const ELEMENT = 1           // 0001
const COMPONENT = 1 << 1    // 0010
const TEXT = 1 << 2         // 0100
const ARRAY = 1 << 3        // 1000
```

使用按位或 `|` 组合多个 flag：

```javascript
const combined = ELEMENT | ARRAY  // 1001
```

使用按位与 `&` 检测某个 flag：

```javascript
if (combined & ELEMENT) { /* 是元素 */ }
if (combined & ARRAY) { /* 有数组子节点 */ }
```

这种方式一个 32 位数字可以表示 32 个布尔标记，内存效率极高。

## Vue 3 ShapeFlags 定义

Vue 3 定义了以下 ShapeFlags：

```typescript
export const enum ShapeFlags {
  ELEMENT = 1,                        // 1: 普通 DOM 元素
  FUNCTIONAL_COMPONENT = 1 << 1,      // 2: 函数式组件
  STATEFUL_COMPONENT = 1 << 2,        // 4: 有状态组件
  TEXT_CHILDREN = 1 << 3,             // 8: 子节点是文本
  ARRAY_CHILDREN = 1 << 4,            // 16: 子节点是数组
  SLOTS_CHILDREN = 1 << 5,            // 32: 子节点是插槽
  TELEPORT = 1 << 6,                  // 64: Teleport 组件
  SUSPENSE = 1 << 7,                  // 128: Suspense 组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,  // 256
  COMPONENT_KEPT_ALIVE = 1 << 9,      // 512
  COMPONENT = STATEFUL_COMPONENT | FUNCTIONAL_COMPONENT  // 6
}
```

注意 `COMPONENT` 是组合值，可以一次性判断是否为任意类型的组件。

## 在 VNode 创建时设置

创建 VNode 时，根据 type 和 children 设置 shapeFlag：

```typescript
function createVNode(type, props, children) {
  // 根据 type 确定基础 shapeFlag
  const shapeFlag = typeof type === 'string'
    ? ShapeFlags.ELEMENT
    : typeof type === 'object'
    ? ShapeFlags.STATEFUL_COMPONENT
    : typeof type === 'function'
    ? ShapeFlags.FUNCTIONAL_COMPONENT
    : 0
  
  const vnode = {
    type,
    props,
    children,
    shapeFlag,
    // ...
  }
  
  // 规范化子节点并更新 shapeFlag
  normalizeChildren(vnode, children)
  
  return vnode
}

function normalizeChildren(vnode, children) {
  let type = 0
  
  if (children == null) {
    children = null
  } else if (Array.isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'string' || typeof children === 'number') {
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  } else if (typeof children === 'object') {
    type = ShapeFlags.SLOTS_CHILDREN
  }
  
  vnode.children = children
  // 使用 |= 添加子节点类型标记
  vnode.shapeFlag |= type
}
```

## 在渲染器中使用

渲染器的 patch 函数使用 shapeFlag 分发到不同处理逻辑：

```typescript
function patch(n1, n2, container) {
  const { shapeFlag, type } = n2
  
  // 根据 type 的特殊值分支
  switch (type) {
    case Text:
      processText(n1, n2, container)
      break
    case Comment:
      processComment(n1, n2, container)
      break
    case Fragment:
      processFragment(n1, n2, container)
      break
    default:
      // 根据 shapeFlag 分支
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container)
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        // 调用 Teleport 的 process 方法
        type.process(n1, n2, container, internals)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        type.process(n1, n2, container, internals)
      }
  }
}
```

这种模式让渲染器逻辑清晰，且判断效率高。

## 处理子节点

mountChildren 和 patchChildren 根据 shapeFlag 处理子节点：

```typescript
function mountElement(vnode, container) {
  const el = document.createElement(vnode.type)
  
  // 根据 shapeFlag 处理子节点
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = vnode.children
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode.children, el)
  }
  
  container.appendChild(el)
}
```

更新时同样依赖 shapeFlag：

```typescript
function patchChildren(n1, n2, container) {
  const c1 = n1.children
  const c2 = n2.children
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  
  // 新子节点是文本
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1)
    }
    if (c1 !== c2) {
      container.textContent = c2
    }
  } else {
    // 新子节点是数组或空
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 都是数组，进行 Diff
        patchKeyedChildren(c1, c2, container)
      } else {
        // 新的没有子节点
        unmountChildren(c1)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = ''
      }
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(c2, container)
      }
    }
  }
}
```

## 组合标记的应用

ShapeFlags 支持多个标记组合。例如一个有数组子节点的元素：

```javascript
// 创建时
vnode.shapeFlag = ShapeFlags.ELEMENT  // 1

// 规范化子节点后
vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN  // 1 | 16 = 17
```

渲染器可以同时判断多个标记：

```javascript
// 判断是元素且有数组子节点
if ((shapeFlag & ShapeFlags.ELEMENT) && 
    (shapeFlag & ShapeFlags.ARRAY_CHILDREN)) {
  // ...
}

// 或者用组合值
const ELEMENT_WITH_ARRAY = ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN
if ((shapeFlag & ELEMENT_WITH_ARRAY) === ELEMENT_WITH_ARRAY) {
  // ...
}
```

## 性能考量

位运算在 JavaScript 引擎中被高度优化，比对象属性访问或函数调用快得多。在频繁执行的 patch 路径中，这种优化积少成多。

```javascript
// 高效：一次位运算
if (shapeFlag & ShapeFlags.COMPONENT) { }

// 低效：属性访问 + 逻辑运算
if (vnode.isStateful || vnode.isFunctional) { }
```

这种设计体现了 Vue 3 渲染器对性能的极致追求。
