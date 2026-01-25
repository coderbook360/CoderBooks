# createHydrationRenderer 水合渲染器

服务端渲染（SSR）生成 HTML 字符串发送给客户端。客户端需要"水合"（Hydration）这些静态 HTML——附加事件监听器、建立响应式连接，让页面变得可交互。`createHydrationRenderer` 创建支持水合的渲染器。

## 水合的概念

传统客户端渲染：
1. 下载 JS
2. 执行 JS
3. 创建 DOM
4. 用户看到页面

SSR + 水合：
1. 服务端生成 HTML
2. 用户立即看到页面（可能不可交互）
3. 下载 JS
4. 执行水合（复用已有 DOM）
5. 页面可交互

水合的关键是复用服务端生成的 DOM，而非重新创建。

## 函数签名

```typescript
function createHydrationRenderer(
  options: RendererOptions<Node, Element>
): HydrationRenderer
```

返回的渲染器额外包含 hydrate 方法：

```typescript
interface HydrationRenderer extends Renderer<Element> {
  hydrate: (vnode: VNode, container: Element) => void
}
```

## 实现结构

```typescript
function createHydrationRenderer(options) {
  return baseCreateRenderer(options, createHydrationFunctions)
}

function baseCreateRenderer(options, createHydrationFns) {
  // ... 正常渲染器逻辑
  
  let hydrate: HydrateFn | undefined
  
  if (createHydrationFns) {
    [hydrate, hydrateNode] = createHydrationFns(
      mountElement,
      mountComponent,
      patchProp,
      // ... 其他内部方法
    )
  }
  
  return {
    render,
    hydrate,  // 水合方法
    createApp: createAppAPI(render, hydrate)
  }
}
```

## 水合函数

`createHydrationFunctions` 返回水合相关的函数：

```typescript
function createHydrationFunctions(internals) {
  const { 
    mt: mountComponent,
    p: patch,
    o: { patchProp, nextSibling, parentNode, remove }
  } = internals
  
  const hydrate = (vnode, container) => {
    // 从容器的第一个子节点开始水合
    hydrateNode(container.firstChild, vnode, null, null, null)
  }
  
  const hydrateNode = (node, vnode, parentComponent, parentSuspense, slotScopeIds) => {
    // 复用已有 DOM 节点
    vnode.el = node
    
    const { type, shapeFlag } = vnode
    
    switch (type) {
      case Text:
        return hydrateText(node, vnode)
      case Comment:
        return hydrateComment(node, vnode)
      case Fragment:
        return hydrateFragment(node, vnode, parentComponent, parentSuspense)
      default:
        if (shapeFlag & ShapeFlags.ELEMENT) {
          return hydrateElement(node, vnode, parentComponent, parentSuspense, slotScopeIds)
        } else if (shapeFlag & ShapeFlags.COMPONENT) {
          return hydrateComponent(vnode, parentComponent, parentSuspense)
        }
    }
    
    return nextSibling(node)
  }
  
  return [hydrate, hydrateNode]
}
```

## 元素水合

```typescript
function hydrateElement(node, vnode, parentComponent, parentSuspense, slotScopeIds) {
  const el = vnode.el = node
  const { props, shapeFlag } = vnode
  
  // 处理属性（主要是事件，因为 HTML 属性已经存在）
  if (props) {
    for (const key in props) {
      if (isOn(key) && !isReservedProp(key)) {
        // 附加事件监听器
        patchProp(el, key, null, props[key])
      }
    }
  }
  
  // 水合子节点
  if (shapeFlag & ShapeFlags.ARRAY_CHILDREN) {
    let next = hydrateChildren(
      el.firstChild,
      vnode.children,
      el,
      parentComponent,
      parentSuspense,
      slotScopeIds
    )
    // next 指向水合完成后的下一个兄弟
  } else if (shapeFlag & ShapeFlags.TEXT_CHILDREN) {
    // 文本子节点已经正确，无需处理
  }
  
  return nextSibling(el)
}
```

## 组件水合

组件水合时，复用已有 DOM 但执行 setup：

```typescript
function hydrateComponent(vnode, parentComponent, parentSuspense) {
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent, parentSuspense)
  
  // 标记为水合模式
  instance.isHydrating = true
  
  // 设置组件
  setupComponent(instance)
  
  // 设置渲染 effect
  setupRenderEffect(instance, vnode, container, anchor, parentSuspense, isSVG, optimized)
  
  // 水合完成后清除标记
  instance.isHydrating = false
}
```

在 `setupRenderEffect` 中，水合模式下会调用 `hydrateNode` 而非创建新 DOM：

```typescript
const componentUpdateFn = () => {
  if (!instance.isMounted) {
    const subTree = renderComponentRoot(instance)
    
    if (instance.isHydrating) {
      // 水合模式：复用 DOM
      hydrateNode(
        vnode.el,  // 已有的 DOM
        subTree,
        instance,
        parentSuspense
      )
    } else {
      // 正常模式：创建 DOM
      patch(null, subTree, container, anchor, /* ... */)
    }
    
    instance.subTree = subTree
    instance.isMounted = true
  }
}
```

## 不匹配处理

水合时可能发现客户端 VNode 与服务端 HTML 不匹配：

```typescript
function hydrateNode(node, vnode, parentComponent, parentSuspense, slotScopeIds) {
  const isFragmentStart = isComment(node) && node.data === '['
  
  if (!node) {
    // 服务端 HTML 中没有对应节点
    if (__DEV__) {
      warn('Hydration node mismatch')
    }
    // 回退到客户端渲染
    patch(null, vnode, parentNode(vnode.el), nextSibling(vnode.el))
    return
  }
  
  // 类型不匹配
  if (node.nodeType !== expectedNodeType(vnode)) {
    if (__DEV__) {
      warn('Hydration type mismatch')
    }
    // 移除旧节点，创建新节点
    remove(node)
    patch(null, vnode, parentNode(node), nextSibling(node))
    return
  }
  
  // ... 正常水合
}
```

不匹配时会有警告，并回退到客户端渲染。

## Teleport 水合

Teleport 内容在 SSR 时不会渲染到目标位置，而是渲染为注释占位符：

```html
<!--teleport start-->
<div class="modal">内容</div>
<!--teleport end-->
```

水合时需要将内容移动到正确位置：

```typescript
function hydrateTeleport(vnode, parentComponent) {
  const targetSelector = vnode.props.to
  const target = document.querySelector(targetSelector)
  
  // 找到注释标记之间的内容
  const teleportContent = getTeleportContent(vnode.el)
  
  // 移动到目标
  target.appendChild(teleportContent)
  
  // 水合内容
  hydrateNode(teleportContent, vnode.children[0], parentComponent)
}
```

## 性能考量

水合比客户端渲染快，因为：
1. **DOM 复用**：不创建 DOM 节点
2. **跳过静态内容**：静态 HTML 已正确，无需处理
3. **并行化**：HTML 在 JS 下载时已可见

但也有开销：
1. **遍历对比**：需要遍历 VNode 树与 DOM 树对比
2. **事件绑定**：需要附加事件监听器
3. **响应式初始化**：需要建立响应式连接

## 延迟水合

Vue 3.5+ 支持延迟水合，对非关键内容延迟处理：

```vue
<Suspense>
  <template #fallback>加载中...</template>
  <LazyComponent />
</Suspense>
```

结合 `defineAsyncComponent` 可以实现按需水合。

## 使用方式

```typescript
// 服务端
import { renderToString } from '@vue/server-renderer'
const html = await renderToString(app)

// 客户端
import { createSSRApp } from 'vue'
const app = createSSRApp(App)
app.mount('#app')  // 自动水合
```

`createSSRApp` 内部使用 `createHydrationRenderer`，mount 时调用 hydrate 而非 render。

## 小结

`createHydrationRenderer` 为 SSR 场景提供水合能力。它复用服务端生成的 DOM，只附加事件和响应式连接。水合是 SSR 性能优势的关键——用户立即看到内容，同时保持 SPA 的交互能力。
