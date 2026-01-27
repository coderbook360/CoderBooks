# VNode 类型标记 ShapeFlags

ShapeFlags 是一个位掩码枚举，用于标记 VNode 的类型信息。渲染器通过它快速判断如何处理节点。

## 枚举定义

```typescript
export const enum ShapeFlags {
  ELEMENT = 1,                    // 1 << 0  普通 HTML 元素
  FUNCTIONAL_COMPONENT = 1 << 1,  // 2       函数式组件
  STATEFUL_COMPONENT = 1 << 2,    // 4       有状态组件
  TEXT_CHILDREN = 1 << 3,         // 8       子节点是文本
  ARRAY_CHILDREN = 1 << 4,        // 16      子节点是数组
  SLOTS_CHILDREN = 1 << 5,        // 32      子节点是插槽
  TELEPORT = 1 << 6,              // 64      Teleport 组件
  SUSPENSE = 1 << 7,              // 128     Suspense 组件
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,  // 256
  COMPONENT_KEPT_ALIVE = 1 << 9,         // 512
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT  // 6
}
```

## 位运算基础

ShapeFlags 使用位运算实现高效的类型检查和组合。

**设置标记**：

```typescript
let shapeFlag = ShapeFlags.ELEMENT  // 1

// 添加 TEXT_CHILDREN
shapeFlag |= ShapeFlags.TEXT_CHILDREN  // 1 | 8 = 9
```

**检查标记**：

```typescript
// 是否是元素
if (shapeFlag & ShapeFlags.ELEMENT) { /* ... */ }

// 是否有文本子节点
if (shapeFlag & ShapeFlags.TEXT_CHILDREN) { /* ... */ }

// 是否是组件（有状态或函数式）
if (shapeFlag & ShapeFlags.COMPONENT) { /* ... */ }
```

**组合标记**：

```typescript
// 检查元素或组件
if (shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.COMPONENT)) { /* ... */ }
```

## 计算 shapeFlag

在 `createVNode` 中根据 type 计算：

```typescript
const shapeFlag = isString(type)
  ? ShapeFlags.ELEMENT
  : isSuspense(type)
    ? ShapeFlags.SUSPENSE
    : isTeleport(type)
      ? ShapeFlags.TELEPORT
      : isObject(type)
        ? ShapeFlags.STATEFUL_COMPONENT
        : isFunction(type)
          ? ShapeFlags.FUNCTIONAL_COMPONENT
          : 0
```

然后根据 children 类型添加标记：

```typescript
function normalizeChildren(vnode, children) {
  let type = 0
  
  if (children == null) {
    children = null
  } else if (isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    // 插槽对象
    if (vnode.shapeFlag & (ShapeFlags.ELEMENT | ShapeFlags.TELEPORT)) {
      // 元素/Teleport 的 children 应该是数组
      const slot = children.default
      if (slot) {
        normalizeChildren(vnode, slot())
      }
      return
    } else {
      type = ShapeFlags.SLOTS_CHILDREN
    }
  } else if (isFunction(children)) {
    // 函数作为默认插槽
    children = { default: children }
    type = ShapeFlags.SLOTS_CHILDREN
  } else {
    // 字符串或数字
    children = String(children)
    type = ShapeFlags.TEXT_CHILDREN
  }
  
  vnode.children = children
  vnode.shapeFlag |= type
}
```

## 渲染器中的使用

**patch 分发**：

```typescript
function patch(n1, n2, container, anchor) {
  const { shapeFlag, type } = n2
  
  switch (type) {
    case Text:
      processText(n1, n2, container)
      break
    case Comment:
      processComment(n1, n2, container)
      break
    case Fragment:
      processFragment(n1, n2, container, anchor)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor)
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        type.process(n1, n2, container, anchor, internals)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        type.process(n1, n2, container, anchor, internals)
      }
  }
}
```

**处理 children**：

```typescript
function mountElement(vnode, container, anchor) {
  const { shapeFlag, children } = vnode
  const el = createElement(vnode.type)
  
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点
    setElementText(el, children)
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    // 数组子节点
    mountChildren(children, el, null)
  }
  
  insert(el, container, anchor)
}
```

**patchChildren**：

```typescript
function patchChildren(n1, n2, container) {
  const c1 = n1.children
  const c2 = n2.children
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧是数组，新是文本：卸载旧的
      unmountChildren(c1)
    }
    if (c1 !== c2) {
      setElementText(container, c2)
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 都是数组：Diff
        patchKeyedChildren(c1, c2, container)
      } else {
        // 新的没有 children
        unmountChildren(c1)
      }
    } else {
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        setElementText(container, '')
      }
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        mountChildren(c2, container, null)
      }
    }
  }
}
```

## KeepAlive 相关标记

```typescript
ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE  // 组件应该被缓存
ShapeFlags.COMPONENT_KEPT_ALIVE         // 组件已被缓存激活
```

KeepAlive 组件设置这些标记：

```typescript
// 在 KeepAlive 的 render 中
if (cachedVNode) {
  vnode.el = cachedVNode.el
  vnode.component = cachedVNode.component
  vnode.shapeFlag |= ShapeFlags.COMPONENT_KEPT_ALIVE
}
vnode.shapeFlag |= ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE
```

渲染器检查这些标记决定是否正常卸载：

```typescript
function unmount(vnode) {
  if (vnode.shapeFlag & ShapeFlags.COMPONENT_SHOULD_KEEP_ALIVE) {
    // 不卸载，只是停用
    parentComponent.ctx.deactivate(vnode)
  } else {
    // 正常卸载
    unmountComponent(vnode.component)
  }
}
```

## 性能优势

位运算比类型字符串比较快得多：

```typescript
// 快（位运算）
if (shapeFlag & ShapeFlags.ELEMENT) { }

// 慢（字符串比较）
if (type === 'element') { }
```

而且一个数字可以编码多个标记：

```typescript
// 一个 shapeFlag = 9 同时表示：
// - ELEMENT (1)
// - TEXT_CHILDREN (8)
```

## 调试技巧

查看 shapeFlag 的含义：

```typescript
function debugShapeFlag(shapeFlag) {
  const flags = []
  if (shapeFlag & ShapeFlags.ELEMENT) flags.push('ELEMENT')
  if (shapeFlag & ShapeFlags.FUNCTIONAL_COMPONENT) flags.push('FUNCTIONAL_COMPONENT')
  if (shapeFlag & ShapeFlags.STATEFUL_COMPONENT) flags.push('STATEFUL_COMPONENT')
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) flags.push('TEXT_CHILDREN')
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) flags.push('ARRAY_CHILDREN')
  if (shapeFlag & ShapeFlags.SLOTS_CHILDREN) flags.push('SLOTS_CHILDREN')
  if (shapeFlag & ShapeFlags.TELEPORT) flags.push('TELEPORT')
  if (shapeFlag & ShapeFlags.SUSPENSE) flags.push('SUSPENSE')
  console.log(`ShapeFlag ${shapeFlag}:`, flags.join(' | '))
}

debugShapeFlag(17)  // "ShapeFlag 17: ELEMENT | ARRAY_CHILDREN"
```

## 小结

ShapeFlags 通过位掩码高效编码 VNode 的类型信息。渲染器根据这些标记快速判断处理方式，避免了字符串比较的开销。理解 ShapeFlags 有助于理解渲染器的分发逻辑。
