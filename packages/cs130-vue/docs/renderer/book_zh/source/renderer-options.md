# 渲染器配置选项

`createRenderer` 接收的配置对象定义了渲染器如何与目标平台交互。这一章详细分析每个配置项的用途和实现要求。

## 必需的配置项

### createElement

创建元素节点：

```typescript
createElement(
  type: string,
  isSVG?: boolean,
  isCustomizedBuiltIn?: string
): HostElement
```

**参数**：
- `type`：标签名，如 `'div'`、`'span'`、`'svg'`
- `isSVG`：是否是 SVG 元素，需要使用 `createElementNS`
- `isCustomizedBuiltIn`：自定义内置元素的 `is` 属性

**DOM 实现**：

```typescript
function createElement(tag, isSVG, is) {
  return isSVG
    ? document.createElementNS('http://www.w3.org/2000/svg', tag)
    : document.createElement(tag, is ? { is } : undefined)
}
```

### createText

创建文本节点：

```typescript
createText(text: string): HostNode
```

**DOM 实现**：

```typescript
function createText(text) {
  return document.createTextNode(text)
}
```

### createComment

创建注释节点，用于 v-if 的 else 分支占位等：

```typescript
createComment(text: string): HostNode
```

**DOM 实现**：

```typescript
function createComment(text) {
  return document.createComment(text)
}
```

### setText

设置文本节点的内容：

```typescript
setText(node: HostNode, text: string): void
```

**DOM 实现**：

```typescript
function setText(node, text) {
  node.nodeValue = text
}
```

### setElementText

设置元素的文本内容：

```typescript
setElementText(el: HostElement, text: string): void
```

**DOM 实现**：

```typescript
function setElementText(el, text) {
  el.textContent = text
}
```

### insert

插入节点到容器：

```typescript
insert(
  el: HostNode,
  parent: HostElement,
  anchor?: HostNode | null
): void
```

**参数**：
- `el`：要插入的节点
- `parent`：父容器
- `anchor`：锚点，插入到它之前；null 表示追加到末尾

**DOM 实现**：

```typescript
function insert(child, parent, anchor) {
  parent.insertBefore(child, anchor || null)
}
```

### remove

从 DOM 中移除节点：

```typescript
remove(el: HostNode): void
```

**DOM 实现**：

```typescript
function remove(child) {
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}
```

### parentNode

获取节点的父节点：

```typescript
parentNode(node: HostNode): HostElement | null
```

**DOM 实现**：

```typescript
function parentNode(node) {
  return node.parentNode
}
```

### nextSibling

获取下一个兄弟节点：

```typescript
nextSibling(node: HostNode): HostNode | null
```

**DOM 实现**：

```typescript
function nextSibling(node) {
  return node.nextSibling
}
```

### patchProp

处理属性的创建和更新：

```typescript
patchProp(
  el: HostElement,
  key: string,
  prevValue: any,
  nextValue: any,
  isSVG?: boolean,
  prevChildren?: VNode[],
  parentComponent?: ComponentInternalInstance | null,
  parentSuspense?: SuspenseBoundary | null,
  unmountChildren?: UnmountChildrenFn
): void
```

这是最复杂的配置项，需要处理：
- 普通属性（attribute）
- DOM 属性（property）
- 事件（on*）
- 样式（style）
- 类名（class）

**DOM 实现结构**：

```typescript
function patchProp(el, key, prevValue, nextValue, isSVG) {
  if (key === 'class') {
    patchClass(el, nextValue, isSVG)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue)
  } else if (shouldSetAsProp(el, key, nextValue, isSVG)) {
    patchDOMProp(el, key, nextValue)
  } else {
    patchAttr(el, key, nextValue, isSVG)
  }
}
```

## 可选的配置项

### querySelector

查询选择器，用于 mount 时解析容器：

```typescript
querySelector?(selector: string): HostElement | null
```

**DOM 实现**：

```typescript
function querySelector(selector) {
  return document.querySelector(selector)
}
```

### setScopeId

设置作用域 ID，用于 scoped CSS：

```typescript
setScopeId?(el: HostElement, id: string): void
```

**DOM 实现**：

```typescript
function setScopeId(el, id) {
  el.setAttribute(id, '')
}
```

### cloneNode

克隆节点，用于静态提升优化：

```typescript
cloneNode?(node: HostNode): HostNode
```

**DOM 实现**：

```typescript
function cloneNode(node) {
  return node.cloneNode(true)
}
```

当静态节点被复用时（如 v-for 中），克隆比重新创建更快。

### insertStaticContent

插入静态 HTML 内容，用于预字符串化优化：

```typescript
insertStaticContent?(
  content: string,
  parent: HostElement,
  anchor: HostNode | null,
  isSVG: boolean
): [HostNode, HostNode]  // 返回首尾节点
```

**DOM 实现**：

```typescript
function insertStaticContent(content, parent, anchor, isSVG) {
  const before = anchor ? anchor.previousSibling : parent.lastChild
  
  if (anchor) {
    // 使用 insertAdjacentHTML
    anchor.insertAdjacentHTML('beforebegin', content)
  } else {
    parent.insertAdjacentHTML('beforeend', content)
  }
  
  // 找出新插入的首尾节点
  const first = before ? before.nextSibling : parent.firstChild
  const last = anchor ? anchor.previousSibling : parent.lastChild
  
  return [first, last]
}
```

## 平台实现示例

### Canvas 渲染器

```typescript
const canvasRendererOptions = {
  createElement(type) {
    return { type, props: {}, children: [] }
  },
  
  createText(text) {
    return { type: 'text', text }
  },
  
  createComment() {
    return { type: 'comment' }
  },
  
  setText(node, text) {
    node.text = text
    scheduleRedraw()
  },
  
  setElementText(el, text) {
    el.text = text
    scheduleRedraw()
  },
  
  insert(child, parent, anchor) {
    const index = anchor 
      ? parent.children.indexOf(anchor)
      : parent.children.length
    parent.children.splice(index, 0, child)
    child.parent = parent
    scheduleRedraw()
  },
  
  remove(child) {
    const parent = child.parent
    if (parent) {
      const index = parent.children.indexOf(child)
      parent.children.splice(index, 1)
      scheduleRedraw()
    }
  },
  
  parentNode(node) {
    return node.parent || null
  },
  
  nextSibling(node) {
    if (!node.parent) return null
    const siblings = node.parent.children
    const index = siblings.indexOf(node)
    return siblings[index + 1] || null
  },
  
  patchProp(el, key, prevValue, nextValue) {
    el.props[key] = nextValue
    scheduleRedraw()
  }
}
```

### 测试渲染器

```typescript
const testRendererOptions = {
  createElement(type) {
    return {
      type,
      props: {},
      children: [],
      parent: null,
      trigger(event, ...args) {
        const handler = this.props[`on${event[0].toUpperCase()}${event.slice(1)}`]
        if (handler) handler(...args)
      }
    }
  },
  
  // ... 其他实现
  
  patchProp(el, key, prevValue, nextValue) {
    el.props[key] = nextValue
  }
}

// 使用测试渲染器
const { createApp } = createRenderer(testRendererOptions)
const root = { type: 'root', props: {}, children: [], parent: null }
const app = createApp(MyComponent)
app.mount(root)

// 断言
expect(root.children[0].type).toBe('button')
root.children[0].trigger('click')
```

## 配置验证

Vue 在开发模式下会验证配置：

```typescript
if (__DEV__) {
  if (!options.insert) {
    warn('insert is required')
  }
  // ...
}
```

## 小结

渲染器配置选项是 Vue 3 平台抽象的关键。通过提供这些基础操作，任何平台都可以获得 Vue 的响应式和组件能力。理解这些配置项，是创建自定义渲染器的基础。
