# 实现组件激活

本章实现组件级别的 hydration，包括实例创建、状态恢复和生命周期处理。

## 组件激活流程

```typescript
// src/runtime/hydrate-component.ts

/**
 * 激活组件
 */
export function hydrateComponent(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions = {}
): Node | null {
  const Component = vnode.type as any
  
  // 函数组件
  if (typeof Component === 'function' && !Component.prototype?.render) {
    return hydrateFunctionalComponent(node, vnode, parentComponent, options)
  }
  
  // 有状态组件
  return hydrateStatefulComponent(node, vnode, parentComponent, options)
}

/**
 * 激活函数组件
 */
function hydrateFunctionalComponent(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions
): Node | null {
  const Component = vnode.type as Function
  const { props, children } = vnode
  
  // 准备上下文
  const slots = normalizeSlots(children)
  const [componentProps, attrs] = resolveProps(Component, props || {})
  
  // 调用函数组件
  const subTree = Component(componentProps, {
    slots,
    attrs,
    emit: createEmitFn(parentComponent)
  })
  
  if (!subTree) {
    return node
  }
  
  // 保存子树
  vnode.component = {
    subTree,
    props: componentProps,
    slots
  } as any
  
  // 激活子树
  return hydrateNode(node, subTree, parentComponent, options)
}
```

## 有状态组件激活

```typescript
/**
 * 激活有状态组件
 */
function hydrateStatefulComponent(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions
): Node | null {
  const Component = vnode.type as any
  
  // 创建组件实例
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 设置当前实例
  const prevInstance = currentInstance
  setCurrentInstance(instance)
  
  try {
    // 初始化 props
    initProps(instance, Component, vnode.props)
    
    // 初始化 slots
    initSlots(instance, vnode.children)
    
    // 恢复 SSR 状态
    restoreSSRState(instance, Component)
    
    // 执行 setup
    setupComponent(instance, Component)
    
    // 获取渲染函数
    const render = instance.render || Component.render
    if (!render) {
      console.warn(`Component ${Component.name} has no render function`)
      return node.nextSibling
    }
    
    // 渲染子树
    const subTree = render.call(instance.proxy)
    instance.subTree = subTree
    
    // 激活子树
    const nextNode = hydrateNode(node, subTree, instance, options)
    
    // 从子树获取根元素
    vnode.el = subTree.el
    
    // 标记为已挂载
    instance.isMounted = true
    
    // 调度生命周期钩子
    scheduleHydrationHooks(instance, Component)
    
    return nextNode
  } catch (error) {
    handleHydrationError(error, vnode, options)
    return node.nextSibling
  } finally {
    setCurrentInstance(prevInstance)
  }
}
```

## SSR 状态恢复

```typescript
/**
 * 恢复 SSR 状态
 */
function restoreSSRState(
  instance: ComponentInstance,
  Component: any
): void {
  // 获取 SSR 状态
  const ssrState = getSSRState()
  if (!ssrState) return
  
  const componentName = Component.name || 'Anonymous'
  const stateKey = `${componentName}-${instance.uid}`
  
  // 组件级状态
  const componentState = ssrState.components?.[stateKey]
  if (componentState) {
    instance.__ssrState = componentState
  }
  
  // Pinia 状态由 Pinia 自己恢复
}

/**
 * 应用恢复的状态
 */
function applyRestoredState(instance: ComponentInstance): void {
  const ssrState = instance.__ssrState
  if (!ssrState) return
  
  const setupState = instance.setupState
  if (!setupState) return
  
  for (const key in ssrState) {
    const savedValue = ssrState[key]
    
    if (!(key in setupState)) continue
    
    const currentValue = setupState[key]
    
    // 处理 ref
    if (isRef(currentValue)) {
      currentValue.value = savedValue
      continue
    }
    
    // 处理 reactive
    if (isReactive(currentValue) && typeof savedValue === 'object') {
      Object.assign(currentValue, savedValue)
      continue
    }
    
    // 普通值
    setupState[key] = savedValue
  }
}
```

## 生命周期处理

```typescript
/**
 * 调度 hydration 生命周期钩子
 */
function scheduleHydrationHooks(
  instance: ComponentInstance,
  Component: any
): void {
  // mounted 钩子
  if (Component.mounted || instance.m) {
    queuePostFlushCb(() => {
      callHook(instance, 'mounted', Component.mounted)
      
      // Composition API 的 onMounted
      if (instance.m) {
        invokeArrayFns(instance.m)
      }
    })
  }
  
  // 其他 hydration 特定钩子
  if (instance.ho) {
    // onHydrated
    queuePostFlushCb(() => {
      invokeArrayFns(instance.ho)
    })
  }
}

/**
 * 调用生命周期钩子
 */
function callHook(
  instance: ComponentInstance,
  name: string,
  hook: Function | undefined
): void {
  if (!hook) return
  
  setCurrentInstance(instance)
  try {
    hook.call(instance.proxy)
  } catch (error) {
    handleError(error, instance, `${name} hook`)
  } finally {
    setCurrentInstance(null)
  }
}

/**
 * 调用函数数组
 */
function invokeArrayFns(fns: Function[]): void {
  for (const fn of fns) {
    try {
      fn()
    } catch (error) {
      console.error('Error in hook:', error)
    }
  }
}
```

## 异步组件激活

```typescript
/**
 * 激活异步组件
 */
async function hydrateAsyncComponent(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions
): Promise<Node | null> {
  const AsyncComponent = vnode.type as any
  
  // 检查是否已解析
  if (AsyncComponent.__asyncResolved) {
    return hydrateComponent(
      node,
      { ...vnode, type: AsyncComponent.__asyncResolved },
      parentComponent,
      options
    )
  }
  
  // 获取加载配置
  const { loader, loadingComponent, errorComponent, delay, timeout } = AsyncComponent
  
  // 创建占位实例
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 标记为异步
  instance.asyncDep = loader()
  
  try {
    // 等待加载
    const resolvedComp = await instance.asyncDep
    AsyncComponent.__asyncResolved = resolvedComp
    instance.asyncResolved = true
    
    // 激活解析后的组件
    return hydrateComponent(
      node,
      { ...vnode, type: resolvedComp },
      parentComponent,
      options
    )
  } catch (error) {
    // 处理加载错误
    if (errorComponent) {
      return hydrateComponent(
        node,
        { ...vnode, type: errorComponent },
        parentComponent,
        options
      )
    }
    
    handleHydrationError(error, vnode, options)
    return node.nextSibling
  }
}
```

## Suspense 组件激活

```typescript
/**
 * 激活 Suspense 组件
 */
function hydrateSuspense(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions
): Node | null {
  const { props, children } = vnode
  const slots = normalizeSlots(children)
  
  // 创建 Suspense 边界
  const suspense: SuspenseBoundary = {
    vnode,
    parent: parentComponent?.suspense || null,
    deps: 0,
    pendingId: 0,
    timeout: props?.timeout ?? -1,
    isHydrating: true,
    
    // 回调
    resolve: () => {},
    fallback: () => {},
    
    // 缓存的子树
    activeBranch: null,
    pendingBranch: null
  }
  
  vnode.suspense = suspense
  
  // 尝试激活默认内容
  const defaultSlot = slots.default
  
  if (defaultSlot) {
    const defaultVNodes = defaultSlot()
    
    if (defaultVNodes.length > 0) {
      const subTree = defaultVNodes.length === 1
        ? defaultVNodes[0]
        : h(Fragment, null, defaultVNodes)
      
      suspense.activeBranch = subTree
      
      // 激活内容
      return hydrateNode(node, subTree, parentComponent, options)
    }
  }
  
  return node.nextSibling
}
```

## KeepAlive 组件激活

```typescript
/**
 * 激活 KeepAlive 组件
 */
function hydrateKeepAlive(
  node: Node,
  vnode: VNode,
  parentComponent: ComponentInstance | null,
  options: HydrateOptions
): Node | null {
  // 创建 KeepAlive 实例
  const instance = createComponentInstance(vnode, parentComponent)
  vnode.component = instance
  
  // 初始化缓存
  const cache = new Map<string | number, VNode>()
  const keys = new Set<string | number>()
  
  instance.ctx.cache = cache
  instance.ctx.keys = keys
  
  // 获取默认插槽
  const slots = normalizeSlots(vnode.children)
  const defaultSlot = slots.default
  
  if (!defaultSlot) {
    return node.nextSibling
  }
  
  const children = defaultSlot()
  
  if (children.length === 0) {
    return node.nextSibling
  }
  
  // 只处理第一个子组件
  const child = children[0]
  
  if (!(child.shapeFlag & ShapeFlags.COMPONENT)) {
    console.warn('KeepAlive child must be a component')
    return hydrateNode(node, child, instance, options)
  }
  
  // 缓存当前组件
  const key = child.key ?? child.type
  cache.set(key, child)
  keys.add(key)
  
  // 激活子组件
  return hydrateNode(node, child, instance, options)
}
```

## 错误处理

```typescript
/**
 * 处理 hydration 错误
 */
function handleHydrationError(
  error: unknown,
  vnode: VNode,
  options: HydrateOptions
): void {
  const Component = vnode.type as any
  const componentName = Component.name || 'Anonymous'
  
  console.error(
    `Error during hydration of component <${componentName}>:`,
    error
  )
  
  // 记录错误
  if (options.onMismatch) {
    options.onMismatch({
      type: 'error',
      expected: null,
      actual: error,
      node: null as any
    })
  }
  
  // 尝试错误边界处理
  const parent = vnode.component?.parent
  if (parent) {
    handleErrorInParent(error, parent, vnode)
  }
}

/**
 * 在父组件中处理错误
 */
function handleErrorInParent(
  error: unknown,
  parent: ComponentInstance,
  vnode: VNode
): void {
  let current = parent
  
  while (current) {
    const hooks = current.ec // errorCaptured hooks
    
    if (hooks) {
      for (const hook of hooks) {
        if (hook(error as Error, vnode.component, 'hydration')) {
          // 错误被处理
          return
        }
      }
    }
    
    current = current.parent
  }
}
```

## 使用示例

```typescript
// 定义组件
const Counter = {
  name: 'Counter',
  props: {
    initial: { type: Number, default: 0 }
  },
  setup(props: { initial: number }) {
    const count = ref(props.initial)
    
    const increment = () => count.value++
    
    onMounted(() => {
      console.log('Counter mounted')
    })
    
    return { count, increment }
  },
  render() {
    return h('div', { class: 'counter' }, [
      h('span', null, `Count: ${this.count}`),
      h('button', { onClick: this.increment }, '+')
    ])
  }
}

// 激活组件
const vnode = h(Counter, { initial: 10 })
const container = document.getElementById('app')!

hydrateComponent(
  container.firstChild!,
  vnode,
  null,
  {
    strict: true,
    onMismatch: (info) => {
      console.log('Mismatch:', info)
    }
  }
)

// 验证激活结果
const instance = vnode.component!
console.log('Is mounted:', instance.isMounted) // true
console.log('Count:', instance.setupState.count.value) // 10
```

## 小结

本章实现了组件级别的激活：

1. **函数组件**：简单调用并激活子树
2. **有状态组件**：创建实例、恢复状态
3. **SSR 状态恢复**：从 window 获取并应用
4. **生命周期**：调度 mounted 等钩子
5. **异步组件**：等待加载后激活
6. **Suspense**：处理异步边界
7. **KeepAlive**：初始化缓存
8. **错误处理**：错误边界支持

组件激活是 hydration 最复杂的部分，正确处理状态和生命周期是关键。
