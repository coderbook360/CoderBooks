# hydrateNode 节点水合

`hydrateNode` 是水合过程的核心函数，它将单个虚拟节点与现有 DOM 节点关联起来。

## 函数签名

```typescript
function hydrateNode(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  optimized?: boolean
): Node | null
```

返回下一个需要处理的兄弟节点。

## 节点类型分发

水合过程需要处理不同类型的节点：

```typescript
function hydrateNode(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  optimized = false
): Node | null {
  const { type, shapeFlag } = vnode
  
  // 关联 DOM 节点
  const domType = node?.nodeType
  
  switch (type) {
    case Text:
      return hydrateTextNode(node, vnode)
    case Comment:
      return hydrateCommentNode(node, vnode)
    case Static:
      return hydrateStaticNode(node, vnode)
    case Fragment:
      return hydrateFragment(node, vnode, parentComponent)
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        return hydrateElement(node, vnode, parentComponent, optimized)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        return hydrateComponent(node, vnode, parentComponent)
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        return hydrateTeleport(node, vnode, parentComponent)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        return hydrateSuspense(node, vnode, parentComponent)
      }
  }
  
  return null
}
```

## 文本节点水合

```typescript
function hydrateTextNode(node: Node | null, vnode: VNode): Node | null {
  if (node === null || node.nodeType !== Node.TEXT_NODE) {
    // 不匹配，需要创建新节点
    return handleMismatch(node, vnode)
  }
  
  // 关联节点
  vnode.el = node
  
  // 检查文本内容
  const text = vnode.children as string
  if (node.textContent !== text) {
    __DEV__ && warnMismatch('text', node.textContent, text)
    node.textContent = text
  }
  
  return node.nextSibling
}
```

## 注释节点水合

注释节点在 SSR 中用作占位符：

```typescript
function hydrateCommentNode(node: Node | null, vnode: VNode): Node | null {
  if (node === null || node.nodeType !== Node.COMMENT_NODE) {
    return handleMismatch(node, vnode)
  }
  
  vnode.el = node
  return node.nextSibling
}
```

v-if 为 false 时会渲染空注释：

```html
<!---->
```

## 静态节点水合

静态节点可以快速跳过：

```typescript
function hydrateStaticNode(node: Node | null, vnode: VNode): Node | null {
  // 静态节点可能包含多个 DOM 节点
  const staticContent = vnode.children as string
  const nodeCount = countNodes(staticContent)
  
  // 跳过所有静态节点
  let current: Node | null = node
  for (let i = 0; i < nodeCount && current; i++) {
    if (i === 0) {
      vnode.el = current
    }
    current = current.nextSibling
  }
  
  return current
}
```

## Fragment 水合

Fragment 没有对应的 DOM 节点：

```typescript
function hydrateFragment(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  // Fragment 的边界用注释标记
  // <!--[-->  开始
  // <!--]-->  结束
  
  const fragmentStartAnchor = node
  const fragmentEndAnchor = locateFragmentEnd(node)
  
  vnode.el = fragmentStartAnchor
  
  // 跳过开始注释
  let nextNode = fragmentStartAnchor?.nextSibling
  
  // 水合子节点
  const children = vnode.children as VNode[]
  for (let i = 0; i < children.length; i++) {
    nextNode = hydrateNode(nextNode, children[i], parentComponent)
  }
  
  // 返回结束注释的下一个节点
  return fragmentEndAnchor?.nextSibling || null
}
```

## 元素节点水合

元素水合是最常见的情况：

```typescript
function hydrateElement(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  optimized: boolean
): Node | null {
  if (node === null || node.nodeType !== Node.ELEMENT_NODE) {
    return handleMismatch(node, vnode)
  }
  
  const el = node as Element
  vnode.el = el
  
  // 验证标签名
  const tag = vnode.type as string
  if (__DEV__ && el.tagName.toLowerCase() !== tag) {
    warnMismatch('tag', el.tagName.toLowerCase(), tag)
  }
  
  // 处理 props
  const { props } = vnode
  if (props) {
    // 附加事件处理器
    for (const key in props) {
      if (isOn(key)) {
        patchProp(el, key, null, props[key])
      }
    }
    
    // 处理 ref
    if (props.ref) {
      setRef(props.ref, el, parentComponent)
    }
  }
  
  // 水合子节点
  if (vnode.shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    const text = vnode.children as string
    if (el.textContent !== text) {
      __DEV__ && warnMismatch('text', el.textContent, text)
      el.textContent = text
    }
  } else if (vnode.shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    hydrateChildren(
      el.firstChild,
      vnode.children as VNode[],
      parentComponent
    )
  }
  
  // 处理指令
  if (vnode.dirs) {
    invokeDirectiveHook(vnode, null, 'mounted')
  }
  
  return el.nextSibling
}
```

## 组件节点水合

```typescript
function hydrateComponent(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 设置组件
  setupComponent(instance)
  
  // 设置响应式渲染效果
  setupRenderEffect(instance, vnode, node)
  
  // 组件的 el 指向子树的第一个元素
  vnode.el = instance.subTree.el
  
  // 返回组件之后的下一个节点
  return getNextSiblingAfterComponent(instance)
}

function setupRenderEffect(
  instance: ComponentInternalInstance,
  vnode: VNode,
  hydratingNode: Node | null
) {
  const effect = new ReactiveEffect(() => {
    if (!instance.isMounted) {
      // 首次渲染（水合模式）
      const subTree = instance.render()
      hydrateNode(hydratingNode, subTree, instance)
      instance.subTree = subTree
      instance.isMounted = true
    } else {
      // 更新
      const prevTree = instance.subTree
      const nextTree = instance.render()
      instance.subTree = nextTree
      patch(prevTree, nextTree)
    }
  })
  
  effect.run()
}
```

## Teleport 水合

Teleport 的内容可能在其他位置：

```typescript
function hydrateTeleport(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  const { target, props } = vnode
  
  // 找到目标元素
  const targetElement = typeof target === 'string'
    ? document.querySelector(target)
    : target
  
  if (targetElement) {
    // 水合 teleport 内容
    // 内容在目标位置，不是当前位置
    const children = vnode.children as VNode[]
    hydrateChildren(
      targetElement.firstChild,
      children,
      parentComponent
    )
  }
  
  // 跳过占位注释
  return node?.nextSibling || null
}
```

## Suspense 水合

```typescript
function hydrateSuspense(
  node: Node | null,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Node | null {
  // 在 SSR 中，Suspense 渲染的是 default 内容
  const { default: defaultSlot } = vnode.children as SuspenseSlots
  
  // 水合 default 内容
  const defaultVNode = defaultSlot()
  return hydrateNode(node, defaultVNode[0], parentComponent)
}
```

## 属性比对

水合时可以检查属性是否匹配：

```typescript
function compareProps(el: Element, props: Record<string, any>): boolean {
  for (const key in props) {
    if (isOn(key)) {
      // 事件不比较
      continue
    }
    
    const expectedValue = props[key]
    const actualValue = el.getAttribute(key)
    
    if (String(expectedValue) !== actualValue) {
      return false
    }
  }
  return true
}
```

## 子节点遍历

```typescript
function hydrateChildren(
  node: Node | null,
  vnodes: VNode[],
  parentComponent: ComponentInternalInstance | null
): void {
  for (let i = 0; i < vnodes.length; i++) {
    const vnode = normalizeVNode(vnodes[i])
    node = hydrateNode(node, vnode, parentComponent)
  }
}
```

## 不匹配处理策略

```typescript
function handleMismatch(node: Node | null, vnode: VNode): Node | null {
  if (__DEV__) {
    console.warn(
      `Hydration mismatch: server rendered DOM doesn't match client vnode`,
      { node, vnode }
    )
  }
  
  // 策略 1: 替换整个节点
  const parent = node?.parentNode
  if (parent) {
    // 创建新节点
    const newNode = createNode(vnode)
    
    if (node) {
      parent.replaceChild(newNode, node)
      return newNode.nextSibling
    } else {
      parent.appendChild(newNode)
      return null
    }
  }
  
  return node?.nextSibling || null
}
```

## 性能优化

**跳过静态树**：

```typescript
if (vnode.patchFlag === PatchFlags.HOISTED) {
  // 提升的静态节点，只关联 el
  vnode.el = node
  return getNextSibling(node, vnode)
}
```

**批量事件附加**：

```typescript
function attachEventListeners(el: Element, props: Record<string, any>) {
  const events: [string, Function][] = []
  
  for (const key in props) {
    if (isOn(key)) {
      events.push([key.slice(2).toLowerCase(), props[key]])
    }
  }
  
  // 使用 DocumentFragment 批量处理
  requestAnimationFrame(() => {
    events.forEach(([event, handler]) => {
      el.addEventListener(event, handler as EventListener)
    })
  })
}
```

## 小结

`hydrateNode` 是水合的核心：

1. 根据 vnode 类型分发到不同处理函数
2. 将 vnode.el 关联到 DOM 节点
3. 递归处理子节点
4. 附加事件处理器和指令
5. 检测并处理不匹配情况

水合让 SSR 应用在客户端变得可交互，是实现同构应用的关键环节。
