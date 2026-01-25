# DOM 操作封装

Vue 渲染器将 DOM 操作抽象为一组平台无关的接口，通过 rendererOptions 注入具体实现。这种设计让渲染器核心逻辑与平台解耦，既支持浏览器 DOM，也能适配其他渲染目标如 Canvas、Native 等。

## 接口定义

RendererOptions 定义了渲染器需要的所有平台操作：

```typescript
export interface RendererOptions<
  HostNode = RendererNode,
  HostElement = RendererElement
> {
  // 属性更新
  patchProp(
    el: HostElement,
    key: string,
    prevValue: any,
    nextValue: any,
    isSVG?: boolean,
    prevChildren?: VNode<HostNode, HostElement>[],
    parentComponent?: ComponentInternalInstance | null,
    parentSuspense?: SuspenseBoundary | null,
    unmountChildren?: UnmountChildrenFn
  ): void

  // 元素操作
  insert(el: HostNode, parent: HostElement, anchor?: HostNode | null): void
  remove(el: HostNode): void
  createElement(
    type: string,
    isSVG?: boolean,
    isCustomizedBuiltIn?: string,
    vnodeProps?: (VNodeProps & { [key: string]: any }) | null
  ): HostElement
  createText(text: string): HostNode
  createComment(text: string): HostNode
  setText(node: HostNode, text: string): void
  setElementText(node: HostElement, text: string): void
  parentNode(node: HostNode): HostElement | null
  nextSibling(node: HostNode): HostNode | null

  // 可选操作
  querySelector?(selector: string): HostElement | null
  setScopeId?(el: HostElement, id: string): void
  cloneNode?(node: HostNode): HostNode
  insertStaticContent?(
    content: string,
    parent: HostElement,
    anchor: HostNode | null,
    isSVG: boolean,
    start?: HostNode | null,
    end?: HostNode | null
  ): [HostNode, HostNode]
}
```

这个接口涵盖了渲染所需的所有 DOM 操作：创建节点、插入、删除、更新文本、遍历 DOM 树等。

## 浏览器 DOM 实现

runtime-dom 包提供了浏览器环境的实现：

```typescript
export const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
  insert: (child, parent, anchor) => {
    parent.insertBefore(child, anchor || null)
  },

  remove: child => {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },

  createElement: (tag, isSVG, is, props): Element => {
    const el = isSVG
      ? document.createElementNS(svgNS, tag)
      : document.createElement(tag, is ? { is } : undefined)
    
    // 处理 select 元素的 multiple 属性
    if (tag === 'select' && props && props.multiple != null) {
      ;(el as HTMLSelectElement).setAttribute('multiple', props.multiple)
    }
    
    return el
  },

  createText: text => document.createTextNode(text),

  createComment: text => document.createComment(text),

  setText: (node, text) => {
    node.nodeValue = text
  },

  setElementText: (el, text) => {
    el.textContent = text
  },

  parentNode: node => node.parentNode as Element | null,

  nextSibling: node => node.nextSibling,

  querySelector: selector => document.querySelector(selector),

  setScopeId(el, id) {
    el.setAttribute(id, '')
  },

  cloneNode(el) {
    const cloned = el.cloneNode(true)
    // 处理模板中的 v-if 注释
    if (`_value` in el) {
      ;(cloned as any)._value = (el as any)._value
    }
    return cloned
  },

  insertStaticContent(content, parent, anchor, isSVG, start, end) {
    // 使用 insertAdjacentHTML 高效插入静态内容
    const before = anchor ? anchor.previousSibling : parent.lastChild
    
    if (start && (start === end || start.nextSibling)) {
      // 缓存的静态节点，直接克隆
      while (true) {
        parent.insertBefore(start!.cloneNode(true), anchor)
        if (start === end || !(start = start!.nextSibling)) break
      }
    } else {
      // 首次渲染，解析 HTML
      parent.insertAdjacentHTML(
        'beforeend',
        isSVG ? `<svg>${content}</svg>` : content
      )
    }
    
    return [
      before ? before.nextSibling : parent.firstChild,
      anchor ? anchor.previousSibling : parent.lastChild
    ]
  }
}
```

每个方法都是对原生 DOM API 的直接封装。注意一些细节处理：SVG 元素需要使用 createElementNS，select 的 multiple 属性需要在创建时设置，静态内容使用 insertAdjacentHTML 提升性能。

## insert 操作

insert 是最常用的操作，将节点插入到指定位置：

```typescript
insert: (child, parent, anchor) => {
  parent.insertBefore(child, anchor || null)
}
```

使用 insertBefore 而非 appendChild 是关键——它支持在任意位置插入，而非仅追加到末尾。当 anchor 为 null 时，insertBefore 的行为等同于 appendChild。

渲染器中的使用：

```typescript
const mountElement = (vnode, container, anchor) => {
  const el = hostCreateElement(vnode.type)
  // ... 处理子节点和属性 ...
  hostInsert(el, container, anchor)
}
```

## remove 操作

remove 通过 parentNode 获取父元素后调用 removeChild：

```typescript
remove: child => {
  const parent = child.parentNode
  if (parent) {
    parent.removeChild(child)
  }
}
```

检查 parent 是否存在是必要的——节点可能已被移除或从未挂载。

## createElement

元素创建需要区分普通元素和 SVG：

```typescript
createElement: (tag, isSVG, is, props) => {
  const el = isSVG
    ? document.createElementNS(svgNS, tag)
    : document.createElement(tag, is ? { is } : undefined)
  return el
}

const svgNS = 'http://www.w3.org/2000/svg'
```

SVG 元素必须使用 createElementNS 并指定命名空间，否则无法正确渲染。is 参数用于自定义内置元素（Custom Elements v1）。

## setText 与 setElementText

这两个方法更新文本内容：

```typescript
setText: (node, text) => {
  node.nodeValue = text
},

setElementText: (el, text) => {
  el.textContent = text
}
```

setText 用于文本节点，直接修改 nodeValue。setElementText 用于元素，设置 textContent 会清除所有子节点并替换为纯文本，比操作 innerHTML 更安全。

## 树遍历

parentNode 和 nextSibling 用于遍历 DOM 树：

```typescript
parentNode: node => node.parentNode as Element | null,
nextSibling: node => node.nextSibling
```

这些方法在移动节点、确定插入位置时使用：

```typescript
// 获取下一个兄弟节点作为锚点
const anchor = hostNextSibling(prevChild.el)
hostInsert(el, container, anchor)
```

## 静态内容优化

insertStaticContent 处理编译时提取的静态 HTML：

```typescript
insertStaticContent(content, parent, anchor, isSVG, start, end) {
  const before = anchor ? anchor.previousSibling : parent.lastChild
  
  if (start && (start === end || start.nextSibling)) {
    // 有缓存，克隆节点
    while (true) {
      parent.insertBefore(start!.cloneNode(true), anchor)
      if (start === end || !(start = start!.nextSibling)) break
    }
  } else {
    // 无缓存，解析 HTML
    parent.insertAdjacentHTML(
      'beforeend',
      isSVG ? `<svg>${content}</svg>` : content
    )
  }
  
  return [
    before ? before.nextSibling : parent.firstChild,
    anchor ? anchor.previousSibling : parent.lastChild
  ]
}
```

首次渲染使用 insertAdjacentHTML 直接解析 HTML 字符串，比逐个创建节点高效得多。后续渲染使用缓存的节点直接克隆，避免重复解析。

## 渲染器使用

baseCreateRenderer 接收 options 并解构为内部使用的函数：

```typescript
function baseCreateRenderer(
  options: RendererOptions,
  createHydrationFns?: typeof createHydrationFunctions
) {
  const {
    insert: hostInsert,
    remove: hostRemove,
    patchProp: hostPatchProp,
    createElement: hostCreateElement,
    createText: hostCreateText,
    createComment: hostCreateComment,
    setText: hostSetText,
    setElementText: hostSetElementText,
    parentNode: hostParentNode,
    nextSibling: hostNextSibling,
    setScopeId: hostSetScopeId = NOOP,
    cloneNode: hostCloneNode,
    insertStaticContent: hostInsertStaticContent
  } = options

  // 内部使用 host* 前缀的函数
  const mountElement = (vnode, container, anchor) => {
    const el = hostCreateElement(vnode.type)
    hostInsert(el, container, anchor)
  }
}
```

host 前缀表示这些是"宿主"平台的实现，与渲染器核心逻辑区分开。

## 自定义渲染器

通过提供不同的 nodeOps，可以创建非 DOM 渲染器：

```typescript
// Canvas 渲染器示例
const canvasNodeOps = {
  insert(child, parent) {
    parent.children.push(child)
    parent.dirty = true
  },
  
  remove(child) {
    const parent = child.parent
    parent.children = parent.children.filter(c => c !== child)
    parent.dirty = true
  },
  
  createElement(type) {
    return { type, children: [], dirty: false }
  },
  
  // ... 其他方法
}

const { createApp } = createRenderer(canvasNodeOps)
```

这就是 Vue 能够支持各种渲染目标（小程序、Native、WebGL）的基础。

## 小结

DOM 操作封装通过 RendererOptions 接口抽象平台差异，runtime-dom 提供浏览器实现。每个方法对应一个原子操作，渲染器核心通过 host* 函数调用它们。这种设计既简化了渲染器实现，又为跨平台渲染提供了可能。
