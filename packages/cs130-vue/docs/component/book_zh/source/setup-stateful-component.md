# setupStatefulComponent 状态组件设置

setupStatefulComponent 是有状态组件初始化的核心函数。它负责创建组件代理、执行 setup 函数并处理返回值。

## 函数定义

```typescript
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean
) {
  const Component = instance.type as ComponentOptions

  if (__DEV__) {
    // 开发环境验证
    if (Component.name) {
      validateComponentName(Component.name, instance.appContext.config)
    }
    if (Component.components) {
      const names = Object.keys(Component.components)
      for (let i = 0; i < names.length; i++) {
        validateComponentName(names[i], instance.appContext.config)
      }
    }
    if (Component.directives) {
      const names = Object.keys(Component.directives)
      for (let i = 0; i < names.length; i++) {
        validateDirectiveName(names[i])
      }
    }
    if (Component.compilerOptions && isRuntimeOnly()) {
      warn(
        `"compilerOptions" is only supported when using a build with the compiler.`
      )
    }
  }

  // 创建公共实例代理
  instance.accessCache = Object.create(null)
  instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))

  if (__DEV__) {
    exposePropsOnRenderContext(instance)
  }

  // 执行 setup
  const { setup } = Component
  if (setup) {
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

    if (isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
      if (isSSR) {
        return setupResult
          .then((resolvedResult: unknown) => {
            handleSetupResult(instance, resolvedResult, isSSR)
          })
          .catch(e => {
            handleError(e, instance, ErrorCodes.SETUP_FUNCTION)
          })
      } else if (__FEATURE_SUSPENSE__) {
        instance.asyncDep = setupResult
      }
    } else {
      handleSetupResult(instance, setupResult, isSSR)
    }
  } else {
    finishComponentSetup(instance, isSSR)
  }
}
```

## 代理创建

```typescript
// 创建访问缓存
instance.accessCache = Object.create(null)

// 创建代理对象
instance.proxy = markRaw(new Proxy(instance.ctx, PublicInstanceProxyHandlers))
```

accessCache 用于缓存属性访问的来源，避免重复查找。proxy 是组件的公共实例，用于模板渲染和 this 绑定。

## PublicInstanceProxyHandlers

代理处理器决定了属性访问的行为：

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

    // $ 开头的公共属性
    const publicGetter = publicPropertiesMap[key]
    if (publicGetter) {
      if (key === '$attrs') {
        track(instance, TrackOpTypes.GET, key)
      }
      return publicGetter(instance)
    }
    
    // ...
  },

  set({ _: instance }: ComponentRenderContext, key: string, value: any): boolean {
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
    
    return true
  }
}
```

## 访问优先级

属性查找的优先级：

```typescript
// 1. setupState - setup() 返回的对象
if (setupState !== EMPTY_OBJ && hasOwn(setupState, key))

// 2. data - Options API 的 data
if (data !== EMPTY_OBJ && hasOwn(data, key))

// 3. props - 组件 props
if (normalizedProps && hasOwn(normalizedProps, key))

// 4. ctx - 上下文（methods、computed 等）
if (ctx !== EMPTY_OBJ && hasOwn(ctx, key))
```

## setup 函数执行

```typescript
const { setup } = Component
if (setup) {
  // 创建 setupContext（如果 setup 接受第二个参数）
  const setupContext = (instance.setupContext =
    setup.length > 1 ? createSetupContext(instance) : null)

  // 设置当前实例
  setCurrentInstance(instance)
  // 暂停依赖追踪
  pauseTracking()
  
  // 调用 setup
  const setupResult = callWithErrorHandling(
    setup,
    instance,
    ErrorCodes.SETUP_FUNCTION,
    [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
  )
  
  // 恢复追踪
  resetTracking()
  // 清除当前实例
  unsetCurrentInstance()
}
```

## 异步 setup 处理

```typescript
if (isPromise(setupResult)) {
  setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
  
  if (isSSR) {
    // SSR：等待解析
    return setupResult
      .then((resolvedResult: unknown) => {
        handleSetupResult(instance, resolvedResult, isSSR)
      })
      .catch(e => {
        handleError(e, instance, ErrorCodes.SETUP_FUNCTION)
      })
  } else if (__FEATURE_SUSPENSE__) {
    // 客户端：设置异步依赖
    instance.asyncDep = setupResult
  }
} else {
  // 同步结果
  handleSetupResult(instance, setupResult, isSSR)
}
```

## 开发环境验证

```typescript
if (__DEV__) {
  // 验证组件名称
  if (Component.name) {
    validateComponentName(Component.name, instance.appContext.config)
  }
  
  // 验证局部组件
  if (Component.components) {
    const names = Object.keys(Component.components)
    for (let i = 0; i < names.length; i++) {
      validateComponentName(names[i], instance.appContext.config)
    }
  }
  
  // 验证指令
  if (Component.directives) {
    const names = Object.keys(Component.directives)
    for (let i = 0; i < names.length; i++) {
      validateDirectiveName(names[i])
    }
  }
}
```

## pauseTracking 的作用

```typescript
pauseTracking()
const setupResult = callWithErrorHandling(setup, ...)
resetTracking()
```

暂停追踪避免 setup 执行期间产生不必要的依赖收集。

## 没有 setup 的情况

```typescript
if (setup) {
  // ...
} else {
  // 直接完成设置
  finishComponentSetup(instance, isSSR)
}
```

## 公共属性映射

```typescript
const publicPropertiesMap: PublicPropertiesMap = extend(Object.create(null), {
  $: i => i,
  $el: i => i.vnode.el,
  $data: i => i.data,
  $props: i => (__DEV__ ? shallowReadonly(i.props) : i.props),
  $attrs: i => (__DEV__ ? shallowReadonly(i.attrs) : i.attrs),
  $slots: i => (__DEV__ ? shallowReadonly(i.slots) : i.slots),
  $refs: i => (__DEV__ ? shallowReadonly(i.refs) : i.refs),
  $parent: i => getPublicInstance(i.parent),
  $root: i => getPublicInstance(i.root),
  $emit: i => i.emit,
  $options: i => (__FEATURE_OPTIONS_API__ ? resolveMergedOptions(i) : i.type),
  $forceUpdate: i => () => queueJob(i.update),
  $nextTick: i => nextTick.bind(i.proxy!),
  $watch: i => (__FEATURE_OPTIONS_API__ ? instanceWatch.bind(i) : NOOP)
})
```

## 小结

setupStatefulComponent 的核心职责：

1. **创建代理**：proxy 代理实现属性访问的统一处理
2. **访问缓存**：accessCache 优化属性查找性能
3. **执行 setup**：调用 setup 函数获取返回值
4. **异步处理**：支持 async setup 和 Suspense
5. **开发验证**：组件名、指令名的验证

这是组件初始化流程的核心环节。

下一章将分析 setup 函数执行的详细过程。
