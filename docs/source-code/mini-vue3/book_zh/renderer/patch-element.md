# 元素的更新流程：patchElement

**首先要问的是**：元素已经挂载了，现在数据变化需要更新，应该怎么高效地更新 DOM？

这就是 `patchElement` 的职责。**核心原则只有一个：复用，而不是重建。**

## 基本流程

```javascript
function patchElement(n1, n2, parentComponent) {
  // 复用 DOM 元素
  const el = n2.el = n1.el
  
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  
  // 1. 更新子节点
  patchChildren(n1, n2, el, parentComponent)
  
  // 2. 更新属性
  patchProps(el, n2, oldProps, newProps)
}
```

核心思想：**复用 DOM 元素，只更新变化的部分**。

## 更新属性

```javascript
function patchProps(el, vnode, oldProps, newProps) {
  if (oldProps !== newProps) {
    // 更新或新增属性
    for (const key in newProps) {
      const prev = oldProps[key]
      const next = newProps[key]
      if (prev !== next) {
        patchProp(el, key, prev, next)
      }
    }
    
    // 移除旧属性
    for (const key in oldProps) {
      if (!(key in newProps)) {
        patchProp(el, key, oldProps[key], null)
      }
    }
  }
}
```

## 更新子节点：patchChildren

子节点有三种类型：文本、数组、空。更新时有 9 种组合情况：

| 旧 \ 新 | 文本 | 数组 | 空 |
|---------|------|------|-----|
| **文本** | 更新文本 | 清空 + 挂载 | 清空 |
| **数组** | 卸载 + 设置 | **Diff** | 卸载 |
| **空** | 设置 | 挂载 | 无操作 |

```javascript
function patchChildren(n1, n2, container, parentComponent) {
  const c1 = n1.children
  const c2 = n2.children
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  
  // 新子节点是文本
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      // 旧是数组：卸载
      unmountChildren(c1)
    }
    if (c2 !== c1) {
      // 设置新文本
      container.textContent = c2
    }
  } else {
    // 新子节点是数组或空
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 都是数组：Diff 算法
        patchKeyedChildren(c1, c2, container, parentComponent)
      } else {
        // 新的是空：卸载
        unmountChildren(c1)
      }
    } else {
      // 旧是文本或空
      if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
        container.textContent = ''
      }
      if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
        // 挂载新数组
        mountChildren(c2, container)
      }
    }
  }
}
```

## 编译优化：PatchFlag

Vue 编译器会为 VNode 添加 `patchFlag`，告诉渲染器需要更新什么：

```javascript
const PatchFlags = {
  TEXT: 1,              // 动态文本
  CLASS: 1 << 1,        // 动态 class
  STYLE: 1 << 2,        // 动态 style
  PROPS: 1 << 3,        // 动态属性（非 class/style）
  FULL_PROPS: 1 << 4,   // key 是动态的，需要完整 diff
  HYDRATE_EVENTS: 1 << 5,
  STABLE_FRAGMENT: 1 << 6,
  KEYED_FRAGMENT: 1 << 7,
  UNKEYED_FRAGMENT: 1 << 8,
  NEED_PATCH: 1 << 9,
  DYNAMIC_SLOTS: 1 << 10,
  HOISTED: -1,          // 静态提升
  BAIL: -2              // 跳过优化
}
```

例如：

```html
<div :class="cls">{{ text }}</div>
```

编译后：

```javascript
createVNode('div', { class: cls }, text, PatchFlags.CLASS | PatchFlags.TEXT)
```

## 基于 PatchFlag 的优化更新

```javascript
function patchElement(n1, n2, parentComponent) {
  const el = n2.el = n1.el
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  
  let { patchFlag, dynamicProps } = n2
  
  // 有 patchFlag，使用优化路径
  if (patchFlag > 0) {
    if (patchFlag & PatchFlags.FULL_PROPS) {
      // 完整 diff
      patchProps(el, n2, oldProps, newProps)
    } else {
      // 只更新有变化的部分
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          patchProp(el, 'class', null, newProps.class)
        }
      }
      
      if (patchFlag & PatchFlags.STYLE) {
        patchProp(el, 'style', oldProps.style, newProps.style)
      }
      
      if (patchFlag & PatchFlags.PROPS) {
        // 只更新 dynamicProps 中的属性
        for (const key of dynamicProps) {
          const prev = oldProps[key]
          const next = newProps[key]
          if (prev !== next) {
            patchProp(el, key, prev, next)
          }
        }
      }
    }
    
    if (patchFlag & PatchFlags.TEXT) {
      if (n1.children !== n2.children) {
        el.textContent = n2.children
      }
    }
  } else {
    // 没有 patchFlag，完整 diff
    patchProps(el, n2, oldProps, newProps)
  }
  
  // 处理子节点
  patchChildren(n1, n2, el, parentComponent)
}
```

## dynamicChildren 和 Block

编译器会收集动态节点形成 Block：

```javascript
const _hoisted_1 = { class: 'static' }

function render() {
  return (openBlock(), createBlock('div', null, [
    createVNode('p', _hoisted_1, 'Static'),        // 静态
    createVNode('span', null, ctx.text, 1 /* TEXT */)  // 动态
  ]))
}
```

Block 的 `dynamicChildren` 只包含动态节点。更新时只需要 patch 这些节点，跳过静态节点：

```javascript
function patchBlockChildren(oldChildren, newChildren, container) {
  for (let i = 0; i < newChildren.length; i++) {
    const oldVNode = oldChildren[i]
    const newVNode = newChildren[i]
    patch(oldVNode, newVNode, container)
  }
}
```

## 指令的更新钩子

```javascript
function patchElement(n1, n2, parentComponent) {
  const el = n2.el = n1.el
  const { dirs } = n2
  
  // 指令的 beforeUpdate 钩子
  if (dirs) {
    invokeDirectiveHook(n2, n1, parentComponent, 'beforeUpdate')
  }
  
  // 更新属性和子节点...
  
  // 指令的 updated 钩子（在 PostFlush 中执行）
  if (dirs) {
    queuePostFlushCb(() => {
      invokeDirectiveHook(n2, n1, parentComponent, 'updated')
    })
  }
}
```

## 完整实现

```javascript
function patchElement(n1, n2, parentComponent) {
  const el = n2.el = n1.el
  const oldProps = n1.props || {}
  const newProps = n2.props || {}
  const { patchFlag, dynamicChildren } = n2
  
  // 更新属性
  if (patchFlag > 0) {
    // 有优化标记
    if (patchFlag & PatchFlags.FULL_PROPS) {
      patchProps(el, oldProps, newProps)
    } else {
      if (patchFlag & PatchFlags.CLASS) {
        if (oldProps.class !== newProps.class) {
          el.className = newProps.class || ''
        }
      }
      if (patchFlag & PatchFlags.STYLE) {
        patchStyle(el, oldProps.style, newProps.style)
      }
      if (patchFlag & PatchFlags.PROPS) {
        for (const key of n2.dynamicProps) {
          if (oldProps[key] !== newProps[key]) {
            patchProp(el, key, oldProps[key], newProps[key])
          }
        }
      }
      if (patchFlag & PatchFlags.TEXT) {
        if (n1.children !== n2.children) {
          el.textContent = n2.children
        }
      }
    }
  } else {
    // 无优化标记，完整 diff
    patchProps(el, oldProps, newProps)
  }
  
  // 更新子节点
  if (dynamicChildren) {
    patchBlockChildren(n1.dynamicChildren, dynamicChildren, el)
  } else {
    patchChildren(n1, n2, el, parentComponent)
  }
}

function patchProps(el, oldProps, newProps) {
  for (const key in newProps) {
    if (newProps[key] !== oldProps[key]) {
      patchProp(el, key, oldProps[key], newProps[key])
    }
  }
  for (const key in oldProps) {
    if (!(key in newProps)) {
      patchProp(el, key, oldProps[key], null)
    }
  }
}

function patchChildren(n1, n2, container, parentComponent) {
  const prevShapeFlag = n1.shapeFlag
  const shapeFlag = n2.shapeFlag
  const c1 = n1.children
  const c2 = n2.children
  
  if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1)
    }
    if (c1 !== c2) {
      container.textContent = c2
    }
  } else if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      patchKeyedChildren(c1, c2, container, parentComponent)
    } else {
      container.textContent = ''
      mountChildren(c2, container)
    }
  } else {
    if (prevShapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      unmountChildren(c1)
    } else if (prevShapeFlag & ShapeFlags.TEXT_CHILDREN) {
      container.textContent = ''
    }
  }
}
```

## 本章小结

`patchElement` 的核心流程：

1. **复用 el**：`n2.el = n1.el`
2. **更新属性**：对比新旧 props，只更新变化的
3. **更新子节点**：根据类型选择不同策略

优化手段：

- **PatchFlag**：编译器标记，跳过不需要检查的部分
- **dynamicChildren**：只 patch 动态节点，跳过静态节点

子节点更新的 9 种情况需要逐一处理。

---

## 练习与思考

1. 实现完整的 `patchElement` 和 `patchChildren`。

2. PatchFlag 是如何减少更新工作量的？画出有无 PatchFlag 的对比图。

3. 思考：为什么要先处理子节点，再处理属性？（提示：考虑 `innerHTML`）
