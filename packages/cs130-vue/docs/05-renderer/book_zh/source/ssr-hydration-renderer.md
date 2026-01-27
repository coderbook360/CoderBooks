# SSR Hydration 与渲染器协作

服务端渲染（SSR）生成的 HTML 需要在客户端"激活"成可交互的 Vue 应用。这个过程称为 hydration（水合），它是渲染器的一个关键工作模式。

## Hydration 的核心挑战

服务端已经生成了完整的 DOM 结构，客户端需要：
1. 复用这些 DOM 节点（而非重新创建）
2. 为它们绑定事件监听器
3. 建立 Vue 的响应式关联
4. 检测潜在的不匹配问题

## createHydrationFunctions

Vue 将 hydration 逻辑封装在单独的函数族中：

```typescript
export function createHydrationFunctions(
  rendererInternals: RendererInternals<Node, Element>
) {
  const {
    mt: mountComponent,
    p: patch,
    o: { patchProp, nextSibling, parentNode, remove, insert, createComment }
  } = rendererInternals
  
  const hydrate: RootHydrateFn = (vnode, container) => {
    hydrateNode(container.firstChild!, vnode, null, null, null)
  }
  
  const hydrateNode: HydrateNodeFn = (node, vnode, /* ... */) => {
    // 根据 VNode 类型选择处理方式
  }
  
  return [hydrate, hydrateNode] as const
}
```

hydrateNode 是核心函数，它遍历 VNode 树并与 DOM 节点配对。

## hydrateNode 实现

根据 VNode 类型分发到不同处理分支：

```typescript
const hydrateNode: HydrateNodeFn = (
  node,
  vnode,
  parentComponent,
  parentSuspense,
  slotScopeIds,
  optimized
) => {
  const isFragmentStart = isComment(node) && node.data === '['
  const { type, shapeFlag } = vnode
  
  // 保存真实 DOM 引用
  vnode.el = node
  
  let nextNode: Node | null = null
  
  switch (type) {
    case Text:
      nextNode = hydrateText(node, vnode)
      break
    case Comment:
      nextNode = hydrateComment(node, vnode)
      break
    case Static:
      nextNode = hydrateStatic(node, vnode)
      break
    case Fragment:
      nextNode = hydrateFragment(node, vnode, /* ... */)
      break
    default:
      if (shapeFlag & ShapeFlags.ELEMENT) {
        nextNode = hydrateElement(node, vnode, /* ... */)
      } else if (shapeFlag & ShapeFlags.COMPONENT) {
        nextNode = hydrateComponent(vnode, /* ... */)
      } else if (shapeFlag & ShapeFlags.TELEPORT) {
        nextNode = hydrateTeleport(node, vnode, /* ... */)
      } else if (shapeFlag & ShapeFlags.SUSPENSE) {
        nextNode = hydrateSuspense(node, vnode, /* ... */)
      }
  }
  
  return nextNode
}
```

每个 hydrate 函数返回"下一个兄弟节点"，用于继续遍历。

## 元素的 Hydration

hydrateElement 是最常用的：

```typescript
const hydrateElement = (
  el: Element,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  const { props, patchFlag, shapeFlag, dirs } = vnode
  
  // 1. 处理 props（主要是事件绑定）
  if (props) {
    if (
      patchFlag & PatchFlags.FULL_PROPS ||
      patchFlag & PatchFlags.HYDRATE_EVENTS ||
      !optimized
    ) {
      for (const key in props) {
        if (isOn(key)) {
          // 绑定事件监听器
          patchProp(el, key, null, props[key], false, undefined, parentComponent)
        } else if (
          !isReservedProp(key) &&
          (!optimized || patchFlag === PatchFlags.FULL_PROPS)
        ) {
          // 校验属性匹配
          const actual = getPropValue(el, key)
          if (actual !== props[key]) {
            __DEV__ && hydrationMismatch(el, key, props[key], actual)
          }
        }
      }
    }
  }
  
  // 2. 处理指令
  if (dirs) {
    invokeDirectiveHook(vnode, null, parentComponent, 'created')
  }
  
  // 3. 处理子节点
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    hydrateChildren(
      el.firstChild,
      vnode.children as VNode[],
      el,
      /* ... */
    )
  } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点校验
    if (el.textContent !== vnode.children) {
      __DEV__ && hydrationMismatch(el, 'textContent', vnode.children, el.textContent)
      el.textContent = vnode.children as string
    }
  }
  
  return nextSibling(el)
}
```

关键点是：不创建新元素，而是绑定事件和校验属性。

## 子节点的 Hydration

hydrateChildren 遍历子 VNode 列表：

```typescript
const hydrateChildren = (
  node: Node | null,
  children: VNode[],
  container: Element,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
): Node | null => {
  for (let i = 0; i < children.length; i++) {
    const vnode = children[i]
    
    if (node) {
      node = hydrateNode(node, vnode, /* ... */)
    } else {
      // DOM 节点不够，需要挂载
      if (__DEV__) {
        warn('Hydration children mismatch')
      }
      patch(null, vnode, container, null, /* ... */)
    }
  }
  
  return node
}
```

如果 DOM 节点数量与 VNode 不匹配，会报警告并补充缺失的节点。

## 组件的 Hydration

组件 hydration 复用正常的挂载流程，但传入 hydrate 模式：

```typescript
const hydrateComponent = (
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  const container = parentNode(vnode.el!)!
  
  // 挂载组件，传入 initialVNode（含 el）
  mountComponent(
    vnode,
    container,
    null,  // anchor
    parentComponent,
    parentSuspense,
    isSVGContainer(container),
    optimized
  )
  
  // 组件占据的 DOM 范围取决于其渲染结果
  return hydrateSubTree(vnode.component!)
}
```

## Mismatch 检测

Hydration 时会检测服务端和客户端渲染结果是否一致：

```typescript
function hydrationMismatch(
  el: Element,
  key: string,
  expected: any,
  actual: any
) {
  warn(
    `Hydration mismatch on element <${el.tagName.toLowerCase()}>:\n` +
    `- Expected: ${key}="${expected}"\n` +
    `- Actual: ${key}="${actual}"`
  )
}
```

常见的 mismatch 原因：
- 时间相关内容（new Date()）
- 随机数
- 浏览器特定的 API（window.innerWidth）
- 第三方脚本修改 DOM

## Fragment 的 Hydration

Fragment 使用注释节点作为边界：

```typescript
const hydrateFragment = (
  node: Comment,  // <!--[-->
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  const fragmentStartAnchor = (vnode.el = node)
  let fragmentEndAnchor = node
  let next = node.nextSibling
  
  // 找到结束注释 <!--]-->
  let depth = 1
  while (next) {
    if (isComment(next)) {
      if (next.data === '[') depth++
      if (next.data === ']') {
        depth--
        if (depth === 0) {
          fragmentEndAnchor = next
          break
        }
      }
    }
    next = next.nextSibling
  }
  
  vnode.anchor = fragmentEndAnchor
  
  // hydrate 内部节点
  hydrateChildren(
    node.nextSibling,
    vnode.children as VNode[],
    parentNode(node)!,
    /* ... */
  )
  
  return nextSibling(fragmentEndAnchor)
}
```

SSR 输出的 `<!--[-->...<!--]-->` 注释对帮助定位 Fragment 范围。

## Teleport 的 Hydration

Teleport 需要同时处理原位置和目标位置：

```typescript
const hydrateTeleport = (
  node: Node,
  vnode: TeleportVNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  const target = resolveTarget(vnode.props, document.querySelector)
  
  if (target) {
    // hydrate 目标位置的内容
    hydrateChildren(
      target.firstChild,
      vnode.children as VNode[],
      target,
      /* ... */
    )
  }
  
  // 返回原位置的下一个节点
  return skipTeleportPlaceholder(node)
}
```

## Suspense 的 Hydration

Suspense 可能在服务端已经 resolve，也可能还在 pending：

```typescript
const hydrateSuspense = (
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null,
  parentSuspense: SuspenseBoundary | null,
  isSVG: boolean,
  slotScopeIds: string[] | null,
  optimized: boolean
) => {
  const suspense = (vnode.suspense = createSuspenseBoundary(/* ... */))
  
  // SSR 时 Suspense 内容已经 resolve
  // 直接 hydrate default slot
  const result = hydrateNode(
    node,
    (suspense.pendingBranch = vnode.ssContent!),
    /* ... */
  )
  
  if (suspense.deps === 0) {
    suspense.resolve()
  }
  
  return result
}
```

## 强制 Hydration

某些情况需要跳过 mismatch 检测，强制使用客户端内容：

```html
<template>
  <div>
    <ClientOnly>
      <BrowserOnlyComponent />
    </ClientOnly>
  </div>
</template>
```

或使用 `data-force-hydration` 属性标记。

## Partial Hydration

Vue 3.5+ 支持懒 hydration：

```typescript
const LazyComponent = defineAsyncComponent({
  loader: () => import('./Heavy.vue'),
  hydrate: hydrateOnVisible()  // 可见时才 hydrate
})
```

这允许延迟非关键组件的 hydration，提升首屏交互速度。

## 小结

SSR Hydration 是渲染器的特殊工作模式。它遍历服务端生成的 DOM，与客户端的 VNode 树配对，复用 DOM 节点而非重新创建，同时绑定事件和建立响应式关联。hydrationMismatch 检测确保服务端和客户端一致性，Fragment 和 Teleport 等特殊类型通过注释边界来定位范围。这个过程让 SSR 应用能够"无缝"激活为完整的客户端应用。
