# setupComponent 组件初始化

`setupComponent` 是组件初始化的核心函数。它负责处理 props、slots，调用 setup 函数，完成组件实例的设置。理解这个函数是理解组件工作机制的关键。

## 调用时机

在 `mountComponent` 中，创建组件实例后立即调用 `setupComponent`：

```typescript
const mountComponent = (initialVNode, container, ...) => {
  // 1. 创建组件实例
  const instance = createComponentInstance(initialVNode, parentComponent, parentSuspense)
  
  // 2. 设置组件
  setupComponent(instance)
  
  // 3. 设置渲染副作用
  setupRenderEffect(instance, initialVNode, container, ...)
}
```

## 源码分析

`setupComponent` 在 `runtime-core/src/component.ts`：

```typescript
export function setupComponent(
  instance: ComponentInternalInstance,
  isSSR = false
) {
  isInSSRComponentSetup = isSSR
  
  const { props, children } = instance.vnode
  const isStateful = isStatefulComponent(instance)
  
  // 1. 初始化 props
  initProps(instance, props, isStateful, isSSR)
  
  // 2. 初始化 slots
  initSlots(instance, children)
  
  // 3. 设置有状态组件
  const setupResult = isStateful
    ? setupStatefulComponent(instance, isSSR)
    : undefined
  
  isInSSRComponentSetup = false
  return setupResult
}
```

三个核心步骤：初始化 props → 初始化 slots → 设置有状态组件。

## isStatefulComponent

判断组件是否有状态：

```typescript
function isStatefulComponent(instance: ComponentInternalInstance) {
  return instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
}
```

有状态组件（对象定义）和函数式组件的处理不同。函数式组件没有实例，不需要复杂的设置过程。

## initProps

初始化 props，验证并设置响应式：

```typescript
export function initProps(
  instance: ComponentInternalInstance,
  rawProps: Data | null,
  isStateful: number,
  isSSR = false
) {
  const props: Data = {}
  const attrs: Data = {}
  
  // 标记 attrs 为内部对象
  def(attrs, InternalObjectKey, 1)
  
  // 规范化和设置 props
  instance.propsDefaults = Object.create(null)
  setFullProps(instance, rawProps, props, attrs)
  
  // 确保声明的 props 都有值（即使是 undefined）
  for (const key in instance.propsOptions[0]) {
    if (!(key in props)) {
      props[key] = undefined
    }
  }
  
  // 设置到实例
  if (isStateful) {
    // 有状态组件使用 shallowReactive
    instance.props = isSSR ? props : shallowReactive(props)
  } else {
    // 函数式组件
    if (!instance.type.props) {
      instance.props = attrs
    } else {
      instance.props = props
    }
  }
  instance.attrs = attrs
}
```

注意 props 使用 `shallowReactive` 而不是 `reactive`。这是因为 props 的值可能已经是响应式的，不需要深度转换。

## initSlots

初始化插槽：

```typescript
export const initSlots = (
  instance: ComponentInternalInstance,
  children: VNodeNormalizedChildren
) => {
  if (instance.vnode.shapeFlag & ShapeFlags.SLOTS_CHILDREN) {
    // 对象形式的插槽
    const type = (children as RawSlots)._
    if (type) {
      instance.slots = toRaw(children as InternalSlots)
      def(children as InternalSlots, '_', type)
    } else {
      normalizeObjectSlots(children as RawSlots, (instance.slots = {}))
    }
  } else {
    instance.slots = {}
    if (children) {
      normalizeVNodeSlots(instance, children)
    }
  }
  def(instance.slots, InternalObjectKey, 1)
}
```

插槽可以是对象形式（具名插槽）或直接的子节点（默认插槽）。

## setupStatefulComponent

设置有状态组件：

```typescript
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean
) {
  const Component = instance.type as ComponentOptions
  
  // 1. 开发环境验证
  if (__DEV__) {
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config)
    }
    if (Component.components) {
      // 验证局部组件名
    }
    if (Component.directives) {
      // 验证局部指令名
    }
  }
  
  // 2. 创建渲染上下文代理
  instance.accessCache = Object.create(null)
  instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))
  
  // 3. 调用 setup
  const { setup } = Component
  if (setup) {
    // 设置当前实例（setup 中 getCurrentInstance 需要）
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)
    
    setCurrentInstance(instance)
    pauseTracking()
    
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
    )
    
    resetTracking()
    unsetCurrentInstance()
    
    // 处理 setup 返回值
    if (isPromise(setupResult)) {
      // 异步 setup
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
      if (isSSR) {
        return setupResult.then((resolvedResult: unknown) => {
          handleSetupResult(instance, resolvedResult, isSSR)
        })
      } else {
        instance.asyncDep = setupResult
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR)
    }
  } else {
    // 没有 setup，直接完成设置
    finishComponentSetup(instance, isSSR)
  }
}
```

## PublicInstanceProxyHandlers

渲染上下文代理的处理器：

```typescript
export const PublicInstanceProxyHandlers: ProxyHandler<any> = {
  get({ _: instance }: ComponentRenderContext, key: string) {
    const { ctx, setupState, data, props, accessCache, type, appContext } = instance
    
    // 检查缓存
    let normalizedProps
    if (key[0] !== '$') {
      const n = accessCache![key]
      if (n !== undefined) {
        switch (n) {
          case AccessTypes.SETUP:
            return setupState[key]
          case AccessTypes.DATA:
            return data[key]
          case AccessTypes.CONTEXT:
            return ctx[key]
          case AccessTypes.PROPS:
            return props![key]
        }
      } else if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
        accessCache![key] = AccessTypes.SETUP
        return setupState[key]
      } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
        accessCache![key] = AccessTypes.DATA
        return data[key]
      } else if (
        (normalizedProps = instance.propsOptions[0]) &&
        hasOwn(normalizedProps, key)
      ) {
        accessCache![key] = AccessTypes.PROPS
        return props![key]
      } else if (ctx !== EMPTY_OBJ && hasOwn(ctx, key)) {
        accessCache![key] = AccessTypes.CONTEXT
        return ctx[key]
      }
    }
    
    // $ 开头的特殊属性
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      return publicGetter(instance)
    }
    
    // 全局属性
    if (hasOwn(appContext.config.globalProperties, key)) {
      return appContext.config.globalProperties[key]
    }
  },
  
  set({ _: instance }: ComponentRenderContext, key: string, value: any) {
    const { data, setupState, ctx } = instance
    
    if (setupState !== EMPTY_OBJ && hasOwn(setupState, key)) {
      setupState[key] = value
      return true
    } else if (data !== EMPTY_OBJ && hasOwn(data, key)) {
      data[key] = value
      return true
    } else if (hasOwn(instance.props, key)) {
      __DEV__ && warn(`Attempting to mutate prop "${key}".`)
      return false
    }
    // ...
  }
}
```

这个代理实现了统一的属性访问：
- 先查 `setupState`（setup 返回值）
- 再查 `data`（Options API）
- 然后查 `props`
- 最后查全局属性

`accessCache` 缓存了属性的来源，避免每次都查找。

## setup 的调用

setup 函数的调用过程：

```typescript
const setupResult = callWithErrorHandling(
  setup,
  instance,
  ErrorCodes.SETUP_FUNCTION,
  [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
)
```

`callWithErrorHandling` 包装了错误处理，确保 setup 中的错误能被正确捕获和报告。

开发环境中，props 被 `shallowReadonly` 包装，防止意外修改。

## handleSetupResult

处理 setup 的返回值：

```typescript
export function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown,
  isSSR: boolean
) {
  if (isFunction(setupResult)) {
    // 返回渲染函数
    if (__SSR__ && (instance.type as ComponentOptions).__ssrInlineRender) {
      instance.ssrRender = setupResult
    } else {
      instance.render = setupResult as InternalRenderFunction
    }
  } else if (isObject(setupResult)) {
    // 返回状态对象
    instance.setupState = proxyRefs(setupResult)
  }
  
  finishComponentSetup(instance, isSSR)
}
```

setup 可以返回两种东西：
- 函数：作为渲染函数
- 对象：暴露给模板的状态

`proxyRefs` 自动解包 ref，让模板中可以直接访问 `.value`。

## finishComponentSetup

完成组件设置：

```typescript
export function finishComponentSetup(
  instance: ComponentInternalInstance,
  isSSR: boolean,
  skipOptions?: boolean
) {
  const Component = instance.type as ComponentOptions
  
  // 设置渲染函数
  if (!instance.render) {
    if (!isSSR && compile && !Component.render) {
      const template = Component.template
      if (template) {
        // 运行时编译
        Component.render = compile(template, { /* options */ })
      }
    }
    instance.render = (Component.render || NOOP) as InternalRenderFunction
  }
  
  // 处理 Options API
  if (__FEATURE_OPTIONS_API__ && !skipOptions) {
    setCurrentInstance(instance)
    pauseTracking()
    applyOptions(instance)
    resetTracking()
    unsetCurrentInstance()
  }
}
```

如果组件有 template 但没有 render，会尝试运行时编译。`applyOptions` 处理 Options API（data、computed、methods 等）。

## 流程总结

```
setupComponent(instance)
  │
  ├── initProps(instance, props)
  │     └── 设置 instance.props 和 instance.attrs
  │
  ├── initSlots(instance, children)
  │     └── 设置 instance.slots
  │
  └── setupStatefulComponent(instance)
        │
        ├── 创建 instance.proxy
        │
        ├── 调用 setup(props, context)
        │
        ├── handleSetupResult(instance, result)
        │     └── 设置 instance.setupState 或 instance.render
        │
        └── finishComponentSetup(instance)
              ├── 设置 instance.render
              └── applyOptions(instance)  // Options API
```

## 小结

`setupComponent` 是组件初始化的核心。它完成了：

1. **initProps**：验证和设置 props，创建响应式代理
2. **initSlots**：规范化和设置插槽
3. **setupStatefulComponent**：创建渲染上下文代理，调用 setup 函数
4. **finishComponentSetup**：设置渲染函数，处理 Options API

渲染上下文代理（`instance.proxy`）统一了对 setupState、data、props 的访问。这让模板和 Options API 中的 `this` 访问能正确工作。

在下一章中，我们将详细分析 `createComponentInstance`——组件实例是如何创建的。
