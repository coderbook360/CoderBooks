# 子节点的挂载与更新

**首先要问的是**：一个元素可以有文本子节点、多个子元素、或者没有子节点。渲染器如何统一处理这些不同情况？

**这就是为什么需要 ShapeFlags 来标记子节点类型。**

## 子节点类型与 ShapeFlags

使用位运算标记子节点类型：

```javascript
const ShapeFlags = {
  ELEMENT: 1,
  TEXT_CHILDREN: 1 << 3,     // 8
  ARRAY_CHILDREN: 1 << 4,    // 16
  SLOTS_CHILDREN: 1 << 5,    // 32
}
```

三种子节点类型：

```javascript
// 1. 文本子节点
const textVNode = {
  type: 'p',
  children: 'Hello World',
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.TEXT_CHILDREN
}

// 2. 数组子节点
const arrayVNode = {
  type: 'ul',
  children: [
    { type: 'li', children: 'Item 1' },
    { type: 'li', children: 'Item 2' }
  ],
  shapeFlag: ShapeFlags.ELEMENT | ShapeFlags.ARRAY_CHILDREN
}

// 3. 无子节点
const emptyVNode = {
  type: 'br',
  children: null,
  shapeFlag: ShapeFlags.ELEMENT
}
```

判断类型：

```javascript
if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  // 文本子节点
}
if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  // 数组子节点
}
```

## 规范化子节点

用户传入的 children 可能是各种类型，需要规范化：

```javascript
function normalizeChildren(vnode, children) {
  let type = 0
  
  if (children == null) {
    children = null
  } else if (Array.isArray(children)) {
    type = ShapeFlags.ARRAY_CHILDREN
  } else if (typeof children === 'object') {
    // 插槽
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

## 子节点挂载：mountChildren

```javascript
function mountChildren(children, container, anchor = null) {
  for (let i = 0; i < children.length; i++) {
    // 规范化单个子节点
    const child = normalizeVNode(children[i])
    // 递归挂载
    patch(null, child, container, anchor)
  }
}
```

规范化单个 VNode：

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
    return child.el ? cloneVNode(child) : child
  }
  // 字符串或数字 → 文本节点
  return createVNode(Text, null, String(child))
}
```

## 子节点更新：patchChildren

更新时有 9 种组合情况（3 × 3 矩阵）：

| 旧 \ 新 | 文本 | 数组 | 空 |
|---------|------|------|-----|
| **文本** | 更新文本 | 清空 + 挂载 | 清空 |
| **数组** | 卸载 + 设置 | **Diff** | 卸载 |
| **空** | 设置 | 挂载 | 无操作 |

```javascript
function patchChildren(n1, n2, container) {
  const c1 = n1.children
  const c2 = n2.children
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  
  // 新子节点是文本
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 旧是数组，先卸载
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1)
    }
    // 设置新文本
    if (c2 !== c1) {
      container.textContent = c2
    }
  }
  // 新子节点是数组
  else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 都是数组：Diff 算法
      patchKeyedChildren(c1, c2, container)
    } else {
      // 旧是文本或空
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = ''
      }
      // 挂载新数组
      mountChildren(c2, container)
    }
  }
  // 新子节点为空
  else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 卸载旧数组
      unmountChildren(c1)
    } else if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      // 清空文本
      container.textContent = ''
    }
  }
}
```

## 子节点卸载

```javascript
function unmountChildren(children) {
  for (let i = 0; i < children.length; i++) {
    unmount(children[i])
  }
}

function unmount(vnode) {
  const el = vnode.el
  if (el) {
    el.parentNode.removeChild(el)
  }
}
```

## 完整示例

```javascript
const ShapeFlags = {
  ELEMENT: 1,
  TEXT_CHILDREN: 8,
  ARRAY_CHILDREN: 16
}

function createVNode(type, props, children) {
  const vnode = {
    type,
    props,
    children: null,
    shapeFlag: typeof type === 'string' ? ShapeFlags.ELEMENT : 0,
    el: null
  }
  
  if (typeof children === 'string') {
    vnode.shapeFlag |= ShapeFlags.TEXT_CHILDREN
    vnode.children = children
  } else if (Array.isArray(children)) {
    vnode.shapeFlag |= ShapeFlags.ARRAY_CHILDREN
    vnode.children = children
  }
  
  return vnode
}

function mountElement(vnode, container) {
  const el = vnode.el = document.createElement(vnode.type)
  const { children, shapeFlag } = vnode
  
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    children.forEach(child => patch(null, child, el))
  }
  
  container.appendChild(el)
}

function patchElement(n1, n2) {
  const el = n2.el = n1.el
  patchChildren(n1, n2, el)
}

function patchChildren(n1, n2, container) {
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  const c1 = n1.children
  const c2 = n2.children
  
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      container.innerHTML = ''
    }
    if (c1 !== c2) {
      container.textContent = c2
    }
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 简化版：全部替换
      container.innerHTML = ''
      c2.forEach(child => patch(null, child, container))
    } else {
      container.textContent = ''
      c2.forEach(child => patch(null, child, container))
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      container.innerHTML = ''
    } else if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      container.textContent = ''
    }
  }
}

function patch(n1, n2, container) {
  if (n1 === null) {
    mountElement(n2, container)
  } else {
    patchElement(n1, n2)
  }
}

// 测试
const container = document.getElementById('app')

// 初次渲染：数组子节点
const vnode1 = createVNode('ul', null, [
  createVNode('li', null, 'Item 1'),
  createVNode('li', null, 'Item 2')
])
patch(null, vnode1, container)

// 更新：切换为文本
setTimeout(() => {
  const vnode2 = createVNode('ul', null, '暂无数据')
  patch(vnode1, vnode2, container)
}, 2000)

// 再次更新：切换回数组
setTimeout(() => {
  const vnode3 = createVNode('ul', null, [
    createVNode('li', null, 'New Item 1'),
    createVNode('li', null, 'New Item 2'),
    createVNode('li', null, 'New Item 3')
  ])
  patch(vnode2, vnode3, container)
}, 4000)
```

## 与 Diff 算法的衔接

当新旧子节点都是数组时，进入 Diff 算法。上面的简化实现直接全部替换，真正的 Vue 会使用高效的 Diff 算法（快速 Diff）来最小化 DOM 操作。

下一部分会详细讲解各种 Diff 策略。

## 本章小结

子节点处理的核心：

- **ShapeFlags**：位运算标记子节点类型
- **normalizeChildren**：规范化用户传入的 children
- **mountChildren**：遍历 + 递归 patch
- **patchChildren**：9 种情况的更新策略

关键原则：**最小化 DOM 操作**。

---

## 练习与思考

1. 实现 `mountChildren` 和 `patchChildren`。

2. 填写子节点更新的 9 种情况处理策略表。

3. 思考：为什么要先处理"旧是数组"的情况？
