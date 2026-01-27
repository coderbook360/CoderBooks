# 客户端水合

Hydration 是客户端激活服务端渲染 HTML 的过程。不同于普通挂载需要创建 DOM，hydration 复用已有 DOM，只需建立 VNode 与 DOM 的关联并绑定事件。

## Hydration 原理

```typescript
// 普通挂载 vs Hydration
// 
// 普通挂载：VNode → 创建 DOM → 插入文档
// Hydration：VNode + 已有 DOM → 建立关联 → 绑定事件
//
// Hydration 的优势：
// 1. 避免 DOM 创建开销
// 2. 避免页面闪烁
// 3. 保持滚动位置
// 4. 更快的 TTI (Time to Interactive)
```

## hydrate 入口

```typescript
// src/runtime/hydrate.ts

export function hydrate(vnode: VNode, container: Element) {
  // 获取第一个子节点
  const firstChild = container.firstChild
  
  if (firstChild) {
    // 开始 hydration
    hydrateNode(firstChild, vnode)
  }
  
  // 标记完成
  container.removeAttribute('data-server-rendered')
  container._vnode = vnode
}
```

## 节点 Hydration

```typescript
function hydrateNode(
  node: Node,
  vnode: VNode
): Node | null {
  const { type, shapeFlag } = vnode
  
  // 将 DOM 节点关联到 VNode
  vnode.el = node
  
  let nextNode: Node | null = null
  
  switch (type) {
    case 'Text':
      nextNode = hydrateText(node as Text, vnode)
      break
    case 'Comment':
      nextNode = hydrateComment(node as Comment, vnode)
      break
    case 'Fragment':
      nextNode = hydrateFragment(node, vnode)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        nextNode = hydrateElement(node as Element, vnode)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        nextNode = hydrateComponent(node, vnode)
      }
  }
  
  return nextNode
}
```

## 元素 Hydration

```typescript
function hydrateElement(
  el: Element,
  vnode: VNode
): Node | null {
  // 验证标签名
  const tag = (vnode.type as string).toLowerCase()
  if (el.tagName.toLowerCase() !== tag) {
    console.warn(
      `Hydration mismatch: expected <${tag}> but got <${el.tagName.toLowerCase()}>`
    )
    // 可以选择重新创建或继续
  }
  
  // 处理属性和事件
  if (vnode.props) {
    hydrateProps(el, vnode.props)
  }
  
  // 处理子节点
  if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    hydrateChildren(
      el.firstChild,
      vnode.children as VNode[],
      el
    )
  } else if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 验证文本内容
    const text = vnode.children as string
    if (el.textContent !== text) {
      console.warn('Text content mismatch')
      el.textContent = text
    }
  }
  
  return el.nextSibling
}

function hydrateProps(el: Element, props: Record<string, any>) {
  for (const key in props) {
    const value = props[key]
    
    if (isEvent(key)) {
      // 绑定事件监听器
      patchEvent(el, key, null, value)
    } else if (key === 'ref') {
      // 处理 ref
      if (typeof value === 'function') {
        value(el)
      } else if (value && typeof value === 'object') {
        value.value = el
      }
    }
    // 其他属性已由 SSR 渲染，无需处理
  }
}
```

## 子节点 Hydration

```typescript
function hydrateChildren(
  node: Node | null,
  vnodes: VNode[],
  container: Element
) {
  for (let i = 0; i < vnodes.length; i++) {
    const vnode = vnodes[i]
    
    if (!node) {
      // 服务端渲染的节点不足，需要创建
      console.warn('Missing node during hydration')
      mountNode(vnode, container, null)
      continue
    }
    
    // Hydrate 当前节点
    node = hydrateNode(node, vnode)
  }
  
  // 检查多余的 DOM 节点
  if (node) {
    console.warn('Extra nodes found during hydration')
    // 可选：移除多余节点
    while (node) {
      const next = node.nextSibling
      container.removeChild(node)
      node = next
    }
  }
}
```

## 文本节点 Hydration

```typescript
function hydrateText(
  node: Text,
  vnode: VNode
): Node | null {
  const text = vnode.children as string
  
  // 验证文本内容
  if (node.textContent !== text) {
    console.warn(
      `Text mismatch: expected "${text}" but got "${node.textContent}"`
    )
    // 修正文本内容
    node.textContent = text
  }
  
  return node.nextSibling
}

function hydrateComment(
  node: Comment,
  vnode: VNode
): Node | null {
  // 注释节点不需要特殊处理
  return node.nextSibling
}
```

## Fragment Hydration

```typescript
function hydrateFragment(
  node: Node,
  vnode: VNode
): Node | null {
  const children = vnode.children as VNode[]
  let currentNode: Node | null = node
  
  for (const child of children) {
    if (!currentNode) {
      console.warn('Missing nodes for fragment')
      break
    }
    currentNode = hydrateNode(currentNode, child)
  }
  
  return currentNode
}
```

## 组件 Hydration

```typescript
function hydrateComponent(
  node: Node,
  vnode: VNode
): Node | null {
  const component = vnode.type as Component
  
  // 创建组件实例
  const instance: ComponentInstance = {
    vnode,
    type: component,
    props: {},
    slots: {},
    setupState: null,
    subTree: null,
    isMounted: false,
    update: null!
  }
  
  vnode.component = instance
  
  // 解析 props
  instance.props = resolveProps(component.props, vnode.props).props
  
  // 创建 slots
  instance.slots = createSlots(vnode.children)
  
  // 执行 setup
  if (component.setup) {
    const setupResult = component.setup(instance.props, {
      emit: createEmit(instance),
      slots: instance.slots,
      attrs: {}
    })
    
    if (typeof setupResult === 'function') {
      instance.render = setupResult
    } else {
      instance.setupState = setupResult
      instance.render = component.render
    }
  } else {
    instance.render = component.render
  }
  
  // 渲染子树
  const subTree = instance.render!(instance.props, {
    slots: instance.slots,
    emit: createEmit(instance)
  })
  
  instance.subTree = subTree
  
  // Hydrate 子树
  const nextNode = hydrateNode(node, subTree)
  
  // 设置响应式更新
  setupHydrateRenderEffect(instance)
  
  instance.isMounted = true
  
  return nextNode
}

function setupHydrateRenderEffect(instance: ComponentInstance) {
  const update = () => {
    const prevTree = instance.subTree!
    const nextTree = instance.render!(instance.props, {
      slots: instance.slots,
      emit: createEmit(instance)
    })
    
    // 更新时使用 patch
    patch(prevTree, nextTree, prevTree.el!.parentElement!)
    
    instance.subTree = nextTree
  }
  
  instance.update = effect(update)
}
```

## 事件绑定

```typescript
// Hydration 的核心工作之一是绑定事件
function hydrateEvents(el: Element, props: Record<string, any>) {
  for (const key in props) {
    if (isEvent(key)) {
      const eventName = key.slice(2).toLowerCase()
      const handler = props[key]
      
      // 创建 invoker
      const invoker = createInvoker(handler)
      
      // 存储 invoker
      const invokers = el._vei || (el._vei = {})
      invokers[key] = invoker
      
      // 添加事件监听
      el.addEventListener(eventName, invoker)
    }
  }
}

// 事件委托优化
function setupEventDelegation(root: Element) {
  const events = ['click', 'input', 'change', 'submit', 'keydown', 'keyup']
  
  for (const event of events) {
    root.addEventListener(event, (e) => {
      let target = e.target as Element | null
      
      while (target && target !== root) {
        const handler = target._vei?.[`on${capitalize(event)}`]
        if (handler) {
          handler(e)
          if (e.cancelBubble) break
        }
        target = target.parentElement
      }
    })
  }
}

function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1)
}
```

## Mismatch 处理

```typescript
interface HydrationMismatch {
  type: 'tag' | 'text' | 'children' | 'attrs'
  expected: any
  actual: any
  node: Node
}

const mismatches: HydrationMismatch[] = []

function reportMismatch(mismatch: HydrationMismatch) {
  mismatches.push(mismatch)
  
  if (process.env.NODE_ENV === 'development') {
    console.warn(
      `Hydration mismatch (${mismatch.type}):`,
      `Expected: ${mismatch.expected}`,
      `Actual: ${mismatch.actual}`
    )
  }
}

// 严格模式：mismatch 时抛出错误
function hydrateStrict(vnode: VNode, container: Element) {
  try {
    hydrate(vnode, container)
    
    if (mismatches.length > 0) {
      throw new Error(
        `Hydration failed with ${mismatches.length} mismatches`
      )
    }
  } finally {
    mismatches.length = 0
  }
}
```

## 异步组件 Hydration

```typescript
interface AsyncComponent {
  __asyncLoader: () => Promise<Component>
  __asyncResolved?: Component
}

function hydrateAsyncComponent(
  node: Node,
  vnode: VNode
): Node | null {
  const asyncComp = vnode.type as AsyncComponent
  
  if (asyncComp.__asyncResolved) {
    // 已加载，直接 hydrate
    const resolvedVNode = {
      ...vnode,
      type: asyncComp.__asyncResolved
    }
    return hydrateComponent(node, resolvedVNode)
  }
  
  // 加载组件
  asyncComp.__asyncLoader().then(comp => {
    asyncComp.__asyncResolved = comp
    
    // 重新渲染
    const resolvedVNode = {
      ...vnode,
      type: comp
    }
    
    // 找到占位节点并替换
    const parent = node.parentElement
    if (parent) {
      patch(null, resolvedVNode, parent, node as Element)
      parent.removeChild(node)
    }
  })
  
  // 返回下一个兄弟节点
  return node.nextSibling
}
```

## Suspense Hydration

```typescript
function hydrateSuspense(
  node: Node,
  vnode: VNode
): Node | null {
  // 查找 Suspense 边界标记
  const startComment = node as Comment
  
  if (startComment.nodeType !== Node.COMMENT_NODE ||
      startComment.textContent !== 'suspense-start') {
    console.warn('Invalid Suspense boundary')
    return node.nextSibling
  }
  
  // 查找结束标记
  let endNode: Node | null = startComment.nextSibling
  let contentNode: Node | null = null
  
  while (endNode) {
    if (endNode.nodeType === Node.COMMENT_NODE &&
        (endNode as Comment).textContent === 'suspense-end') {
      break
    }
    if (!contentNode) {
      contentNode = endNode
    }
    endNode = endNode.nextSibling
  }
  
  // Hydrate Suspense 内容
  if (contentNode) {
    hydrateNode(contentNode, vnode.children[0])
  }
  
  return endNode?.nextSibling || null
}
```

## 完整 Hydration 示例

```typescript
// 服务端渲染的 HTML
const serverHTML = `
<div id="app" data-server-rendered="true">
  <header class="header">
    <h1>My App</h1>
    <button>Click me</button>
  </header>
  <main>
    <p>Hello World</p>
  </main>
</div>
`

// 客户端组件
const App: Component = {
  setup() {
    const handleClick = () => {
      console.log('Button clicked!')
    }
    
    return () => h('div', null, [
      h('header', { class: 'header' }, [
        h('h1', null, 'My App'),
        h('button', { onClick: handleClick }, 'Click me')
      ]),
      h('main', null, [
        h('p', null, 'Hello World')
      ])
    ])
  }
}

// Hydration
document.getElementById('app')!.innerHTML = serverHTML
const app = createSSRApp(App)
app.mount('#app')

// 现在 button 有了事件监听器
```

## 性能优化

```typescript
// 1. 跳过静态内容
function hydrateStatic(node: Node, vnode: VNode): Node | null {
  if (vnode.patchFlag === PatchFlags.STATIC) {
    // 静态节点只需要关联，不需要深度遍历
    vnode.el = node
    return node.nextSibling
  }
  return hydrateNode(node, vnode)
}

// 2. 批量事件绑定
function batchHydrateEvents(
  nodes: Array<{ el: Element; props: Record<string, any> }>
) {
  requestIdleCallback(() => {
    for (const { el, props } of nodes) {
      hydrateEvents(el, props)
    }
  })
}

// 3. 渐进式 Hydration
async function progressiveHydrate(
  vnode: VNode,
  container: Element
) {
  const chunks = splitVNodeTree(vnode)
  
  for (const chunk of chunks) {
    await new Promise(resolve => requestIdleCallback(resolve))
    hydrateChunk(chunk, container)
  }
}
```

## 小结

Hydration 的核心步骤：

1. **遍历 VNode 树**：与 DOM 节点一一对应
2. **建立关联**：将 DOM 节点赋值给 vnode.el
3. **验证一致性**：检测标签、文本、子节点数量
4. **绑定事件**：为交互元素添加事件监听
5. **处理组件**：执行 setup，建立响应式

Hydration 让 SSR 应用在客户端快速变为可交互状态。
