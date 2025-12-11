# 元素的挂载流程：mountElement

**首先要问的是**：给定一个元素 VNode，如何将它变成真实的 DOM 元素并插入到页面中？

这就是 `mountElement` 的职责。**理解这个流程是理解整个渲染器的基础。**

## 基本流程

```javascript
function mountElement(vnode, container, anchor) {
  // 1. 创建元素
  const el = vnode.el = createElement(vnode.type)
  
  // 2. 处理子节点
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    setElementText(el, vnode.children)
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode.children, el)
  }
  
  // 3. 处理属性
  if (vnode.props) {
    for (const key in vnode.props) {
      patchProp(el, key, null, vnode.props[key])
    }
  }
  
  // 4. 插入到容器
  insert(el, container, anchor)
}
```

## 创建元素

### 普通 HTML 元素

```javascript
const el = document.createElement(vnode.type)
```

### SVG 元素

SVG 元素需要使用命名空间：

```javascript
const isSVG = vnode.type === 'svg' || parentIsSVG

if (isSVG) {
  const el = document.createElementNS(
    'http://www.w3.org/2000/svg',
    vnode.type
  )
}
```

### 自定义元素（Web Components）

```javascript
const isCustomElement = vnode.type.includes('-')

if (isCustomElement) {
  const el = document.createElement(
    vnode.type,
    { is: vnode.props?.is }
  )
}
```

## 处理文本子节点

```javascript
if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
  setElementText(el, vnode.children)
  // 等价于 el.textContent = vnode.children
}
```

## 处理数组子节点

```javascript
function mountChildren(children, container, anchor = null) {
  for (let i = 0; i < children.length; i++) {
    // 规范化子节点
    const child = normalizeVNode(children[i])
    // 递归挂载
    patch(null, child, container, anchor)
  }
}
```

在 `mountElement` 中调用：

```javascript
if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
  mountChildren(vnode.children, el)
}
```

## 处理属性

```javascript
if (vnode.props) {
  for (const key in vnode.props) {
    const value = vnode.props[key]
    
    // 跳过保留属性
    if (key === 'key' || key === 'ref') continue
    
    patchProp(el, key, null, value)
  }
}
```

`patchProp` 会根据属性类型分别处理（class、style、事件、普通属性），下一章详细讲解。

## 插入到 DOM

```javascript
function insert(child, parent, anchor) {
  parent.insertBefore(child, anchor)
}
```

`anchor` 是参照节点：

- 如果 `anchor` 为 `null`，`insertBefore` 等价于 `appendChild`
- 如果 `anchor` 有值，插入到 `anchor` 之前

为什么需要 `anchor`？在列表更新时，需要精确控制插入位置。

## SVG 的特殊处理

SVG 内部的元素也需要使用 SVG 命名空间：

```javascript
function mountElement(vnode, container, anchor, isSVG) {
  // 判断是否进入 SVG 命名空间
  isSVG = isSVG || vnode.type === 'svg'
  
  const el = isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', vnode.type)
    : document.createElement(vnode.type)
  
  // 子元素也需要传递 isSVG
  if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(vnode.children, el, null, isSVG)
  }
}
```

但 `foreignObject` 内部需要退出 SVG 命名空间：

```javascript
if (vnode.type === 'foreignObject') {
  isSVG = false
}
```

## 处理 ref

`ref` 用于获取 DOM 元素的引用：

```javascript
if (vnode.ref) {
  setRef(vnode.ref, null, vnode)
}

function setRef(rawRef, oldRawRef, vnode) {
  const value = vnode.el
  
  if (typeof rawRef === 'function') {
    rawRef(value)
  } else if (isRef(rawRef)) {
    rawRef.value = value
  }
}
```

## 与 Transition 的集成

挂载元素时需要处理过渡效果：

```javascript
function mountElement(vnode, container, anchor) {
  const el = vnode.el = createElement(vnode.type)
  
  // ... 处理子节点和属性
  
  // 获取 transition
  const { transition } = vnode
  
  if (transition && !transition.persisted) {
    // 进入前的准备
    transition.beforeEnter(el)
  }
  
  // 插入 DOM
  insert(el, container, anchor)
  
  if (transition && !transition.persisted) {
    // 触发进入动画
    transition.enter(el)
  }
}
```

## 指令的 created 和 mounted 钩子

```javascript
function mountElement(vnode, container, anchor) {
  const el = vnode.el = createElement(vnode.type)
  const { dirs } = vnode
  
  // ... 处理子节点和属性
  
  // 指令的 created 钩子
  if (dirs) {
    invokeDirectiveHook(vnode, null, 'created')
  }
  
  // 插入 DOM
  insert(el, container, anchor)
  
  // 指令的 mounted 钩子（在 PostFlush 中执行）
  if (dirs) {
    queuePostFlushCb(() => {
      invokeDirectiveHook(vnode, null, 'mounted')
    })
  }
}
```

## 完整实现

```javascript
function mountElement(
  vnode,
  container,
  anchor,
  isSVG
) {
  let el
  const { type, props, shapeFlag, children, dirs, transition } = vnode
  
  // 1. 创建元素
  isSVG = isSVG || type === 'svg'
  el = vnode.el = isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', type)
    : document.createElement(type)
  
  // 2. 处理子节点（先于属性）
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    el.textContent = children
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    mountChildren(
      children,
      el,
      null,
      isSVG && type !== 'foreignObject'
    )
  }
  
  // 3. 指令 created 钩子
  if (dirs) {
    invokeDirectiveHook(vnode, null, 'created')
  }
  
  // 4. 处理属性
  if (props) {
    for (const key in props) {
      if (key !== 'key' && key !== 'ref') {
        patchProp(el, key, null, props[key], isSVG)
      }
    }
  }
  
  // 5. 处理 ref
  if (vnode.ref) {
    setRef(vnode.ref, null, vnode)
  }
  
  // 6. Transition beforeEnter
  if (transition && !transition.persisted) {
    transition.beforeEnter(el)
  }
  
  // 7. 插入 DOM
  container.insertBefore(el, anchor)
  
  // 8. 后续钩子
  if (transition && !transition.persisted) {
    transition.enter(el)
  }
  
  if (dirs) {
    queuePostFlushCb(() => {
      invokeDirectiveHook(vnode, null, 'mounted')
    })
  }
}
```

## 为什么先处理子节点再处理属性？

某些属性（如 `value`、`checked`）的行为依赖于子内容。例如 `<select>` 的 `value` 需要在 `<option>` 渲染后才能正确设置。

## 本章小结

`mountElement` 的流程：

1. **创建元素**：根据类型（HTML/SVG/Custom）创建 DOM 元素
2. **处理子节点**：文本直接设置，数组递归挂载
3. **处理属性**：调用 `patchProp` 设置各类属性
4. **插入 DOM**：使用 `insertBefore` 精确控制位置

特殊处理：

- SVG 需要命名空间
- Transition 需要在插入前后调用钩子
- 指令需要调用 created/mounted 钩子

---

## 练习与思考

1. 实现一个简化版的 `mountElement`。

2. 为什么 `insert` 使用 `insertBefore` 而不是 `appendChild`？

3. 思考：如果 `vnode.props` 中有 `innerHTML`，应该如何处理子节点？
