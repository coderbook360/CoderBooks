# 异步组件 SSR 处理

本章分析 Vue SSR 中异步组件的处理机制。

## 异步组件概述

异步组件允许延迟加载组件代码，这在 SSR 中需要特殊处理，因为服务端必须等待组件加载完成才能渲染。

```typescript
// packages/runtime-core/src/apiAsyncComponent.ts

/**
 * 定义异步组件
 */
export function defineAsyncComponent<T extends Component>(
  source: AsyncComponentLoader<T> | AsyncComponentOptions<T>
): T {
  if (typeof source === 'function') {
    source = { loader: source }
  }
  
  const {
    loader,
    loadingComponent,
    errorComponent,
    delay = 200,
    timeout,
    suspensible = true,
    onError: userOnError
  } = source
  
  // 返回包装组件
  return defineComponent({
    name: 'AsyncComponentWrapper',
    __asyncLoader: loader,
    
    setup() {
      const instance = currentInstance!
      
      // SSR 模式
      if (instance.vnode.isSSR) {
        return ssrAsyncSetup(loader, instance)
      }
      
      // 客户端模式
      return clientAsyncSetup(loader, loadingComponent, errorComponent, delay, timeout)
    }
  }) as any
}
```

## SSR 异步处理

在 SSR 中，异步组件必须同步渲染，因此需要等待加载完成。

```typescript
/**
 * SSR 异步组件 setup
 */
async function ssrAsyncSetup(
  loader: AsyncComponentLoader,
  instance: ComponentInternalInstance
): Promise<() => VNode> {
  // 同步等待组件加载
  const resolvedComp = await loader()
  
  // 获取实际组件
  const Component = resolvedComp.default || resolvedComp
  
  // 创建实际组件的 setup
  if (Component.setup) {
    const setupResult = await Component.setup(
      instance.props,
      {
        attrs: instance.attrs,
        slots: instance.slots,
        emit: instance.emit,
        expose: () => {}
      }
    )
    
    if (typeof setupResult === 'function') {
      return setupResult
    }
    
    // 如果返回对象，需要与 render 配合
    instance.setupState = setupResult
  }
  
  // 返回渲染函数
  return () => {
    if (Component.render) {
      return Component.render.call(instance.proxy)
    }
    return null
  }
}
```

## 服务端渲染集成

```typescript
// packages/server-renderer/src/render.ts

/**
 * 渲染异步组件 VNode
 */
async function renderAsyncComponentVNode(
  push: PushFn,
  vnode: VNode,
  parentComponent: ComponentInternalInstance,
  context: SSRContext
): Promise<void> {
  const type = vnode.type as any
  
  // 检查是否有异步加载器
  if (type.__asyncLoader) {
    try {
      // 加载组件
      const resolvedComp = await type.__asyncLoader()
      const Component = resolvedComp.default || resolvedComp
      
      // 创建解析后的 VNode
      const resolvedVNode = createVNode(
        Component,
        vnode.props,
        vnode.children
      )
      
      // 渲染解析后的组件
      await renderComponentVNode(push, resolvedVNode, parentComponent, context)
    } catch (error) {
      // 处理加载错误
      if (type.errorComponent) {
        const errorVNode = createVNode(type.errorComponent, { error })
        await renderComponentVNode(push, errorVNode, parentComponent, context)
      } else {
        throw error
      }
    }
  }
}
```

## 超时处理

异步组件加载可能超时，需要提供回退。

```typescript
/**
 * 带超时的异步加载
 */
async function loadWithTimeout<T>(
  loader: () => Promise<T>,
  timeout: number
): Promise<T> {
  return Promise.race([
    loader(),
    new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Async component timed out after ${timeout}ms`))
      }, timeout)
    })
  ])
}

/**
 * SSR 异步组件渲染（带超时）
 */
async function renderAsyncWithTimeout(
  push: PushFn,
  vnode: VNode,
  context: SSRContext,
  timeout: number = 30000
): Promise<void> {
  const type = vnode.type as any
  
  try {
    const resolvedComp = await loadWithTimeout(
      type.__asyncLoader,
      timeout
    )
    
    // 渲染组件
    const Component = resolvedComp.default || resolvedComp
    await renderComponent(push, Component, vnode.props, context)
  } catch (error) {
    if ((error as Error).message.includes('timed out')) {
      // 渲染超时回退
      push(`<!-- async component timeout -->`)
      
      if (type.loadingComponent) {
        await renderComponent(push, type.loadingComponent, {}, context)
      }
    } else {
      throw error
    }
  }
}
```

## 并行加载优化

当页面有多个异步组件时，可以并行加载。

```typescript
/**
 * 预加载异步组件
 */
async function preloadAsyncComponents(
  vnode: VNode,
  context: SSRContext
): Promise<void> {
  const asyncComponents: Array<() => Promise<any>> = []
  
  // 收集所有异步组件
  function collect(node: VNode): void {
    if (!node) return
    
    const type = node.type as any
    
    if (type?.__asyncLoader) {
      asyncComponents.push(type.__asyncLoader)
    }
    
    // 递归收集子节点
    if (Array.isArray(node.children)) {
      for (const child of node.children) {
        if (typeof child === 'object') {
          collect(child as VNode)
        }
      }
    }
  }
  
  collect(vnode)
  
  // 并行加载所有异步组件
  await Promise.all(
    asyncComponents.map(loader => 
      loader().catch(err => {
        // 记录错误但不阻止其他组件
        console.error('Async component preload failed:', err)
      })
    )
  )
}
```

## Hydration 匹配

客户端 hydration 时需要确保异步组件状态一致。

```typescript
/**
 * 异步组件 hydration
 */
async function hydrateAsyncComponent(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInternalInstance | null
): Promise<Node | null> {
  const type = vnode.type as any
  
  // 服务端已渲染的内容在 DOM 中
  // 需要加载组件后进行匹配
  
  try {
    const resolvedComp = await type.__asyncLoader()
    const Component = resolvedComp.default || resolvedComp
    
    // 创建解析后的 VNode
    const resolvedVNode = createVNode(
      Component,
      vnode.props,
      vnode.children
    )
    
    // 继续 hydration
    return hydrateComponent(node, resolvedVNode, parentComponent)
  } catch (error) {
    // 加载失败，显示错误组件
    if (type.errorComponent) {
      const errorVNode = createVNode(type.errorComponent, { error })
      return hydrateComponent(node, errorVNode, parentComponent)
    }
    
    throw error
  }
}
```

## 小结

本章分析了异步组件的 SSR 处理：

1. **同步等待**：服务端必须等待加载完成
2. **超时处理**：防止无限等待
3. **错误处理**：加载失败的回退
4. **并行加载**：优化多组件场景
5. **Hydration 匹配**：确保客户端一致性

正确处理异步组件确保了 SSR 的可靠性和性能。
