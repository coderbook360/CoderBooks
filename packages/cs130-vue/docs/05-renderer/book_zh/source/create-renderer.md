# createRenderer 渲染器创建

`createRenderer` 是 Vue 3 渲染器的工厂函数。它接收平台特定的操作配置，返回一个可以在该平台上工作的渲染器。

## 函数签名

```typescript
function createRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>): Renderer<HostElement>
```

泛型参数 `HostNode` 和 `HostElement` 让 TypeScript 能正确推断平台类型。对于 DOM 平台，它们分别是 `Node` 和 `Element`。

## 实现结构

```typescript
export function createRenderer<
  HostNode = RendererNode,
  HostElement = RendererElement
>(options: RendererOptions<HostNode, HostElement>) {
  return baseCreateRenderer<HostNode, HostElement>(options)
}
```

`createRenderer` 本身只是一个薄包装，实际逻辑在 `baseCreateRenderer` 中。这种分离是为了支持 hydration（SSR 水合）场景：

```typescript
export function createHydrationRenderer(
  options: RendererOptions<Node, Element>
) {
  return baseCreateRenderer(options, createHydrationFunctions)
}
```

## RendererOptions 接口

调用者需要提供的平台操作：

```typescript
interface RendererOptions<HostNode, HostElement> {
  // 创建元素
  createElement(
    type: string,
    isSVG?: boolean,
    isCustomizedBuiltIn?: string
  ): HostElement
  
  // 创建文本节点
  createText(text: string): HostNode
  
  // 创建注释节点
  createComment(text: string): HostNode
  
  // 设置文本节点内容
  setText(node: HostNode, text: string): void
  
  // 设置元素的文本内容
  setElementText(node: HostElement, text: string): void
  
  // 插入节点
  insert(
    el: HostNode,
    parent: HostElement,
    anchor?: HostNode | null
  ): void
  
  // 移除节点
  remove(el: HostNode): void
  
  // 获取父节点
  parentNode(node: HostNode): HostElement | null
  
  // 获取下一个兄弟节点
  nextSibling(node: HostNode): HostNode | null
  
  // 查询选择器（可选）
  querySelector?(selector: string): HostElement | null
  
  // 设置作用域 ID（用于 scoped CSS）
  setScopeId?(el: HostElement, id: string): void
  
  // 克隆节点（用于静态提升优化）
  cloneNode?(node: HostNode): HostNode
  
  // 插入静态内容（用于预字符串化优化）
  insertStaticContent?(
    content: string,
    parent: HostElement,
    anchor: HostNode | null,
    isSVG: boolean
  ): [HostNode, HostNode]
  
  // 属性处理
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
}
```

## 返回的 Renderer

`createRenderer` 返回一个对象，包含渲染方法和应用创建方法：

```typescript
interface Renderer<HostElement> {
  render: RootRenderFunction<HostElement>
  createApp: CreateAppFunction<HostElement>
}
```

**render 函数**：

```typescript
type RootRenderFunction<HostElement> = (
  vnode: VNode | null,
  container: HostElement
) => void
```

直接渲染 VNode 到容器，卸载时传入 null。

**createApp 函数**：

```typescript
const createApp = (rootComponent, rootProps = null) => {
  const app = {
    _component: rootComponent,
    _props: rootProps,
    _container: null,
    
    mount(containerOrSelector) {
      const container = normalizeContainer(containerOrSelector)
      const vnode = createVNode(rootComponent, rootProps)
      render(vnode, container)
      app._container = container
      return vnode.component!.proxy
    },
    
    unmount() {
      render(null, app._container!)
    }
  }
  
  return app
}
```

## DOM 平台实现

`@vue/runtime-dom` 提供 DOM 平台的配置：

```typescript
// runtime-dom/src/nodeOps.ts
const nodeOps: Omit<RendererOptions<Node, Element>, 'patchProp'> = {
  createElement(tag, isSVG, is) {
    return isSVG
      ? document.createElementNS(svgNS, tag)
      : document.createElement(tag, is ? { is } : undefined)
  },
  
  createText(text) {
    return document.createTextNode(text)
  },
  
  createComment(text) {
    return document.createComment(text)
  },
  
  setText(node, text) {
    node.nodeValue = text
  },
  
  setElementText(el, text) {
    el.textContent = text
  },
  
  insert(child, parent, anchor) {
    parent.insertBefore(child, anchor || null)
  },
  
  remove(child) {
    const parent = child.parentNode
    if (parent) {
      parent.removeChild(child)
    }
  },
  
  parentNode(node) {
    return node.parentNode as Element | null
  },
  
  nextSibling(node) {
    return node.nextSibling
  },
  
  querySelector(selector) {
    return document.querySelector(selector)
  }
}
```

patchProp 单独定义，处理属性、事件、样式等：

```typescript
// runtime-dom/src/patchProp.ts
export const patchProp: DOMRendererOptions['patchProp'] = (
  el,
  key,
  prevValue,
  nextValue,
  isSVG,
  prevChildren,
  parentComponent,
  parentSuspense,
  unmountChildren
) => {
  if (key === 'class') {
    patchClass(el, nextValue, isSVG)
  } else if (key === 'style') {
    patchStyle(el, prevValue, nextValue)
  } else if (isOn(key)) {
    patchEvent(el, key, prevValue, nextValue, parentComponent)
  } else if (/* ... */) {
    // 其他属性处理
  }
}
```

## 组合创建渲染器

`@vue/runtime-dom` 组合配置创建渲染器：

```typescript
// runtime-dom/src/index.ts
import { createRenderer } from '@vue/runtime-core'
import { nodeOps } from './nodeOps'
import { patchProp } from './patchProp'

const rendererOptions = {
  patchProp,
  ...nodeOps
}

let renderer: Renderer<Element>

function ensureRenderer() {
  return renderer || (renderer = createRenderer(rendererOptions))
}

export const createApp = ((...args) => {
  const app = ensureRenderer().createApp(...args)
  
  // 增强 mount 方法
  const { mount } = app
  app.mount = (containerOrSelector) => {
    const container = normalizeContainer(containerOrSelector)
    if (!container) return
    
    // 清空容器
    container.innerHTML = ''
    
    return mount(container)
  }
  
  return app
}) as CreateAppFunction<Element>
```

## 惰性创建

注意 `ensureRenderer` 的惰性创建模式。渲染器只在首次调用 `createApp` 时创建，这样如果只使用 SSR（服务端渲染），就不会创建客户端渲染器。

## 使用示例

```typescript
import { createApp } from 'vue'
import App from './App.vue'

// createApp 内部调用 createRenderer
const app = createApp(App)

// mount 触发渲染
app.mount('#app')
```

## 小结

`createRenderer` 是 Vue 3 渲染器解耦设计的核心。通过接收平台操作配置，它可以创建适用于任何平台的渲染器。DOM 渲染器只是其中一个实现，开发者可以创建自定义渲染器用于 Canvas、WebGL、终端等场景。
