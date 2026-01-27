# setup 函数执行

`setup` 是 Composition API 的入口点。在组件实例创建后、挂载前，Vue 会调用 `setup` 函数，让开发者在这里组合组件的逻辑。

## setup 的调用时机

```
createComponentInstance  →  setupComponent  →  setupStatefulComponent
                                                      ↓
                                               handleSetupResult
                                                      ↓
                                               finishComponentSetup
```

`setup` 在 `setupStatefulComponent` 中执行，这时 props 和 slots 已经初始化完成。

## setupStatefulComponent

入口函数：

```typescript
function setupStatefulComponent(
  instance: ComponentInternalInstance,
  isSSR: boolean
) {
  const Component = instance.type as ComponentOptions
  
  // 创建代理缓存
  instance.accessCache = Object.create(null)
  
  // 创建公共实例代理
  instance.proxy = markRaw(
    new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  )
  
  // 执行 setup
  const { setup } = Component
  if (setup) {
    // 创建 setup 上下文
    const setupContext = (instance.setupContext =
      setup.length > 1 ? createSetupContext(instance) : null)
    
    // 设置当前实例
    setCurrentInstance(instance)
    pauseTracking()
    
    // 调用 setup
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
    )
    
    resetTracking()
    unsetCurrentInstance()
    
    // 处理结果
    if (isPromise(setupResult)) {
      setupResult.then(unsetCurrentInstance, unsetCurrentInstance)
      
      if (isSSR) {
        return setupResult
          .then((resolved: unknown) => {
            handleSetupResult(instance, resolved, isSSR)
          })
          .catch(e => {
            handleError(e, instance, ErrorCodes.SETUP_FUNCTION)
          })
      } else {
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

## createSetupContext

当 `setup` 接收第二个参数时创建上下文：

```typescript
export function createSetupContext(
  instance: ComponentInternalInstance
): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    instance.exposed = exposed || {}
  }
  
  let attrs: Data
  
  return {
    get attrs() {
      return attrs || (attrs = createAttrsProxy(instance))
    },
    slots: instance.slots,
    emit: instance.emit,
    expose
  }
}
```

上下文包含：
- `attrs`: 非 prop 的属性
- `slots`: 插槽
- `emit`: 事件触发器
- `expose`: 暴露给父组件的引用

## setup 参数

`setup` 接收两个参数：

```typescript
setup(props, context) {
  // props: 响应式 props（开发环境是 shallowReadonly）
  // context: { attrs, slots, emit, expose }
}
```

开发环境中 props 是 `shallowReadonly`，防止意外修改：

```typescript
[__DEV__ ? shallowReadonly(instance.props) : instance.props, setupContext]
```

## 当前实例管理

执行 `setup` 前后需要管理当前实例：

```typescript
// 设置当前实例
setCurrentInstance(instance)

// 暂停依赖追踪（setup 中不应追踪依赖）
pauseTracking()

// ... 执行 setup

// 恢复追踪
resetTracking()

// 清除当前实例
unsetCurrentInstance()
```

`setCurrentInstance` 让 Composition API 函数知道当前在哪个组件中执行。

## setCurrentInstance

管理实例栈：

```typescript
export const currentInstance: ComponentInternalInstance | null = null

export const getCurrentInstance: () => ComponentInternalInstance | null = () =>
  currentInstance || currentRenderingInstance

export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  instance.scope.on()
  currentInstance = instance
}

export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off()
  currentInstance = null
}
```

这就是为什么 `onMounted` 等钩子能知道注册到哪个组件。

## handleSetupResult

处理 `setup` 的返回值：

```typescript
export function handleSetupResult(
  instance: ComponentInternalInstance,
  setupResult: unknown,
  isSSR: boolean
) {
  if (isFunction(setupResult)) {
    // 返回的是渲染函数
    if (__SSR__ && (instance.type as ComponentOptions).__ssrInlineRender) {
      instance.ssrRender = setupResult
    } else {
      instance.render = setupResult as InternalRenderFunction
    }
  } else if (isObject(setupResult)) {
    // 返回的是对象
    instance.setupState = proxyRefs(setupResult)
  }
  
  finishComponentSetup(instance, isSSR)
}
```

返回值有两种形式：
1. **函数**：作为渲染函数
2. **对象**：作为组件状态

## proxyRefs

自动解包 ref：

```typescript
instance.setupState = proxyRefs(setupResult)
```

使得模板中可以直接使用 ref，无需 `.value`：

```javascript
setup() {
  const count = ref(0)
  return { count }
}
// 模板中直接用 {{ count }}，自动解包
```

## 返回渲染函数

`setup` 可以返回渲染函数：

```javascript
setup(props) {
  const count = ref(0)
  
  return () => h('div', [
    h('p', `Count: ${count.value}`),
    h('button', { onClick: () => count.value++ }, '+')
  ])
}
```

这种方式可以完全使用 JavaScript 的表达力。

## 返回状态对象

更常见的是返回状态对象：

```javascript
setup(props) {
  const count = ref(0)
  const double = computed(() => count.value * 2)
  
  function increment() {
    count.value++
  }
  
  return {
    count,
    double,
    increment
  }
}
```

这些属性在模板中可以直接访问。

## finishComponentSetup

完成组件设置：

```typescript
export function finishComponentSetup(
  instance: ComponentInternalInstance,
  isSSR: boolean,
  skipOptions?: boolean
) {
  const Component = instance.type as ComponentOptions
  
  // 处理 render 函数
  if (!instance.render) {
    if (!isSSR && compile && !Component.render) {
      const template =
        (__COMPAT__ &&
          instance.vnode.props &&
          instance.vnode.props['inline-template']) ||
        Component.template
      
      if (template) {
        const { isCustomElement, compilerOptions } = instance.appContext.config
        const { delimiters, compilerOptions: componentCompilerOptions } =
          Component
        
        const finalCompilerOptions: CompilerOptions = extend(
          extend(
            { isCustomElement, delimiters },
            compilerOptions
          ),
          componentCompilerOptions
        )
        
        Component.render = compile(template, finalCompilerOptions)
      }
    }
    
    instance.render = (Component.render || NOOP) as InternalRenderFunction
  }
  
  // 兼容 Options API
  if (__FEATURE_OPTIONS_API__ && !(__COMPAT__ && skipOptions)) {
    setCurrentInstance(instance)
    pauseTracking()
    try {
      applyOptions(instance)
    } finally {
      resetTracking()
      unsetCurrentInstance()
    }
  }
}
```

## 模板编译

如果没有 render 函数但有模板，运行时会编译：

```typescript
if (template) {
  Component.render = compile(template, finalCompilerOptions)
}
```

这是完整版 Vue 的特性，在编译版中模板已预编译。

## applyOptions

应用 Options API 选项：

```typescript
if (__FEATURE_OPTIONS_API__) {
  applyOptions(instance)
}
```

这让 `setup` 可以和 Options API 混用：

```javascript
export default {
  setup() {
    const count = ref(0)
    return { count }
  },
  mounted() {
    console.log('count:', this.count)  // 可以访问 setup 返回的值
  }
}
```

## 异步 setup

`setup` 可以是异步的：

```javascript
async setup() {
  const data = await fetchData()
  return { data }
}
```

需要配合 `Suspense` 使用：

```typescript
if (isPromise(setupResult)) {
  if (isSSR) {
    // SSR 等待结果
    return setupResult.then(...)
  } else {
    // 客户端设置异步依赖
    instance.asyncDep = setupResult
  }
}
```

## 错误处理

`setup` 执行被 `callWithErrorHandling` 包装：

```typescript
const setupResult = callWithErrorHandling(
  setup,
  instance,
  ErrorCodes.SETUP_FUNCTION,
  [props, setupContext]
)
```

错误会被正确捕获和上报。

## expose

控制父组件可以访问什么：

```javascript
setup(props, { expose }) {
  const count = ref(0)
  const privateMethod = () => {}
  const publicMethod = () => {}
  
  // 只暴露 publicMethod
  expose({
    publicMethod
  })
  
  return { count, privateMethod, publicMethod }
}
```

父组件通过 ref 只能访问暴露的内容。

## 开发环境的保护

开发环境中 props 是只读的：

```javascript
setup(props) {
  props.foo = 'bar'  // 警告：props 是只读的
}
```

通过 `shallowReadonly` 包装实现。

## setup 与生命周期

在 `setup` 中可以注册生命周期钩子：

```javascript
setup() {
  onMounted(() => {
    console.log('mounted')
  })
  
  onUnmounted(() => {
    console.log('unmounted')
  })
}
```

这些钩子会注册到当前实例上。

## 小结

`setup` 函数的执行流程：

1. **准备阶段**：创建代理、设置当前实例
2. **执行阶段**：调用 setup，传入 props 和 context
3. **结果处理**：函数作为 render，对象作为 setupState
4. **完成阶段**：编译模板（如需要）、应用 Options API

`setup` 是 Composition API 的核心，提供了组合逻辑的入口点。

下一章将分析 `callWithErrorHandling`——Vue 如何在组件中统一处理错误。
