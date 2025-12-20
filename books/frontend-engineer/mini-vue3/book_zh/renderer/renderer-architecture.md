# 渲染器架构：createRenderer 的设计

**首先要问的是**：Vue 可以渲染到 DOM、Canvas、Native，是如何做到的？

答案是**平台无关的渲染器设计**——这是一个非常经典的架构模式，在很多跨平台框架中都能看到。

## 渲染器的职责

渲染器做三件事：

1. **挂载**：将 VNode 渲染为真实节点
2. **更新**：对比新旧 VNode，更新真实节点
3. **卸载**：移除不需要的节点

```javascript
function render(vnode, container) {
  if (vnode) {
    // 有新 vnode，执行 patch
    patch(container._vnode, vnode, container)
  } else {
    // 没有新 vnode，卸载
    if (container._vnode) {
      unmount(container._vnode)
    }
  }
  // 保存旧 vnode
  container._vnode = vnode
}
```

## 平台无关的设计

问题：渲染器如何支持多平台？

```javascript
// DOM
document.createElement('div')

// Canvas
ctx.fillRect(...)

// Native
NativeModule.createView(...)
```

解决方案：将平台相关操作抽象为选项。

```javascript
const browserOptions = {
  createElement(type) {
    return document.createElement(type)
  },
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor)
  },
  setElementText(el, text) {
    el.textContent = text
  },
  remove(child) {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  }
  // ...
}
```

渲染器内部使用这些函数，而不是直接调用 DOM API。

## createRenderer 设计

```javascript
function createRenderer(options) {
  // 解构平台操作函数
  const {
    createElement,
    insert,
    remove,
    setElementText,
    patchProp,
    createText,
    setText
  } = options
  
  // 渲染器内部函数
  function patch(n1, n2, container, anchor) {
    // ...
  }
  
  function mountElement(vnode, container, anchor) {
    const el = vnode.el = createElement(vnode.type)
    // ...
    insert(el, container, anchor)
  }
  
  function unmount(vnode) {
    remove(vnode.el)
  }
  
  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode || null, vnode, container)
    } else if (container._vnode) {
      unmount(container._vnode)
    }
    container._vnode = vnode
  }
  
  return {
    render,
    createApp: createAppAPI(render)
  }
}
```

## rendererOptions 完整定义

```javascript
const rendererOptions = {
  // 创建元素
  createElement(type, isSVG, isCustom, props) {
    return isSVG 
      ? document.createElementNS('http://www.w3.org/2000/svg', type)
      : document.createElement(type, isCustom ? { is: props.is } : undefined)
  },
  
  // 创建文本节点
  createText(text) {
    return document.createTextNode(text)
  },
  
  // 创建注释节点
  createComment(text) {
    return document.createComment(text)
  },
  
  // 设置文本内容
  setText(node, text) {
    node.nodeValue = text
  },
  
  // 设置元素文本
  setElementText(el, text) {
    el.textContent = text
  },
  
  // 获取父节点
  parentNode(node) {
    return node.parentNode
  },
  
  // 获取下一个兄弟节点
  nextSibling(node) {
    return node.nextSibling
  },
  
  // 插入节点
  insert(child, parent, anchor = null) {
    parent.insertBefore(child, anchor)
  },
  
  // 移除节点
  remove(child) {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  
  // 设置属性
  patchProp(el, key, prevValue, nextValue, isSVG) {
    // 处理 class、style、事件、普通属性等
  }
}
```

## patch 函数设计

`patch` 是渲染器的核心，根据 VNode 类型分发处理：

```javascript
function patch(n1, n2, container, anchor = null) {
  // n1: 旧 VNode
  // n2: 新 VNode
  
  // 类型不同，直接卸载旧的
  if (n1 && n1.type !== n2.type) {
    unmount(n1)
    n1 = null
  }
  
  const { type, shapeFlag } = n2
  
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
      if (shapeFlag & ShapeFlags.ELEMENT) {
        processElement(n1, n2, container, anchor)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        processComponent(n1, n2, container, anchor)
      }
  }
}
```

### processElement

```javascript
function processElement(n1, n2, container, anchor) {
  if (n1 === null) {
    // 挂载
    mountElement(n2, container, anchor)
  } else {
    // 更新
    patchElement(n1, n2)
  }
}
```

### processText

```javascript
function processText(n1, n2, container) {
  if (n1 === null) {
    // 挂载文本节点
    const el = n2.el = createText(n2.children)
    insert(el, container)
  } else {
    // 更新文本内容
    const el = n2.el = n1.el
    if (n2.children !== n1.children) {
      setText(el, n2.children)
    }
  }
}
```

### processFragment

```javascript
function processFragment(n1, n2, container) {
  if (n1 === null) {
    // 挂载 Fragment 的子节点
    mountChildren(n2.children, container)
  } else {
    // 更新子节点
    patchChildren(n1, n2, container)
  }
}
```

## createApp 设计

`createApp` 是用户创建应用的入口：

```javascript
function createAppAPI(render) {
  return function createApp(rootComponent, rootProps = null) {
    const app = {
      _component: rootComponent,
      _props: rootProps,
      _container: null,
      
      mount(containerOrSelector) {
        // 获取容器
        const container = typeof containerOrSelector === 'string'
          ? document.querySelector(containerOrSelector)
          : containerOrSelector
        
        // 创建根组件的 VNode
        const vnode = createVNode(rootComponent, rootProps)
        
        // 渲染
        render(vnode, container)
        
        app._container = container
        
        // 返回组件实例的代理
        return vnode.component?.proxy
      },
      
      unmount() {
        render(null, app._container)
      }
    }
    
    return app
  }
}
```

使用：

```javascript
const { createApp } = createRenderer(rendererOptions)

createApp({
  setup() {
    return () => h('div', 'Hello World')
  }
}).mount('#app')
```

## 默认渲染器

`runtime-dom` 提供默认的 DOM 渲染器：

```javascript
let renderer

function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}

export const render = (...args) => {
  ensureRenderer().render(...args)
}

export const createApp = (...args) => {
  return ensureRenderer().createApp(...args)
}
```

## 自定义渲染器示例

创建一个渲染到 Canvas 的渲染器：

```javascript
const canvasRenderer = createRenderer({
  createElement(type) {
    // 返回一个虚拟节点对象
    return { type, props: {}, children: [] }
  },
  
  insert(child, parent) {
    parent.children.push(child)
  },
  
  setElementText(el, text) {
    el.text = text
  },
  
  patchProp(el, key, prev, next) {
    el.props[key] = next
  },
  
  remove(child) {
    // 从父节点移除
  }
})

// 使用
const app = canvasRenderer.createApp(CanvasApp)
app.mount(virtualContainer)

// 最后遍历虚拟树，绘制到 Canvas
function drawToCanvas(tree, ctx) {
  // ...
}
```

## 完整的 createRenderer

```javascript
function createRenderer(options) {
  const {
    createElement: hostCreateElement,
    insert: hostInsert,
    remove: hostRemove,
    setElementText: hostSetElementText,
    patchProp: hostPatchProp,
    createText: hostCreateText,
    setText: hostSetText
  } = options
  
  function patch(n1, n2, container, anchor = null) {
    if (n1 && n1.type !== n2.type) {
      unmount(n1)
      n1 = null
    }
    
    const { type, shapeFlag } = n2
    
    switch (type) {
      case Text:
        processText(n1, n2, container)
        break
      case Fragment:
        processFragment(n1, n2, container)
        break
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          processElement(n1, n2, container, anchor)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          processComponent(n1, n2, container, anchor)
        }
    }
  }
  
  function processElement(n1, n2, container, anchor) {
    if (n1 === null) {
      mountElement(n2, container, anchor)
    } else {
      patchElement(n1, n2)
    }
  }
  
  function mountElement(vnode, container, anchor) {
    const el = vnode.el = hostCreateElement(vnode.type)
    
    if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
      hostSetElementText(el, vnode.children)
    } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
      mountChildren(vnode.children, el)
    }
    
    if (vnode.props) {
      for (const key in vnode.props) {
        hostPatchProp(el, key, null, vnode.props[key])
      }
    }
    
    hostInsert(el, container, anchor)
  }
  
  function unmount(vnode) {
    hostRemove(vnode.el)
  }
  
  function render(vnode, container) {
    if (vnode) {
      patch(container._vnode || null, vnode, container)
    } else if (container._vnode) {
      unmount(container._vnode)
    }
    container._vnode = vnode
  }
  
  return {
    render,
    createApp: createAppAPI(render)
  }
}
```

## 本章小结

渲染器架构的核心设计：

- **createRenderer**：接收平台选项，返回渲染器
- **rendererOptions**：抽象平台操作（createElement、insert 等）
- **patch**：根据 VNode 类型分发处理
- **createApp**：创建应用实例的工厂函数

这种设计使得 Vue 可以渲染到任何目标平台。

---

## 练习与思考

1. 实现一个简化版的 `createRenderer`。

2. 设计一个渲染到控制台的渲染器（输出 VNode 树的文本表示）。

3. 思考：为什么 Vue 把 `runtime-core` 和 `runtime-dom` 分开？
