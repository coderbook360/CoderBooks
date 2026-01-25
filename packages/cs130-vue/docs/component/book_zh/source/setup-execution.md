# setup 函数执行

setup 函数是 Composition API 的入口点。它在组件实例创建后、模板编译前执行，是连接响应式系统和组件渲染的桥梁。

## 执行时机

```typescript
function setupStatefulComponent(instance: ComponentInternalInstance, isSSR: boolean) {
  // ... 创建代理
  
  const { setup } = Component
  if (setup) {
    // setup 存在时执行
    setCurrentInstance(instance)
    pauseTracking()
    
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      ErrorCodes.SETUP_FUNCTION,
      [props, setupContext]
    )
    
    resetTracking()
    unsetCurrentInstance()
    
    handleSetupResult(instance, setupResult, isSSR)
  }
}
```

## setup 函数签名

```typescript
interface SetupFunction<Props, RawBindings = object> {
  (
    props: Readonly<Props>,
    ctx: SetupContext
  ): RawBindings | RenderFunction | void
}
```

setup 接收两个参数：响应式的 props 和 setupContext。

## props 参数

```typescript
const setupResult = callWithErrorHandling(
  setup,
  instance,
  ErrorCodes.SETUP_FUNCTION,
  [
    __DEV__ ? shallowReadonly(instance.props) : instance.props,
    setupContext
  ]
)
```

开发环境下 props 被包装为 shallowReadonly，防止意外修改。

## setupContext 创建

```typescript
const setupContext = (instance.setupContext =
  setup.length > 1 ? createSetupContext(instance) : null)
```

只有当 setup 函数声明了第二个参数时才创建 setupContext，这是一种优化。

```typescript
export function createSetupContext(
  instance: ComponentInternalInstance
): SetupContext {
  const expose: SetupContext['expose'] = exposed => {
    if (__DEV__ && instance.exposed) {
      warn(`expose() should be called only once per setup().`)
    }
    instance.exposed = exposed || {}
  }

  if (__DEV__) {
    return Object.freeze({
      get attrs() {
        return getAttrsProxy(instance)
      },
      get slots() {
        return getSlotsProxy(instance)
      },
      get emit() {
        return (event: string, ...args: any[]) => instance.emit(event, ...args)
      },
      expose
    })
  } else {
    return {
      get attrs() {
        return getAttrsProxy(instance)
      },
      slots: instance.slots,
      emit: instance.emit,
      expose
    }
  }
}
```

## setCurrentInstance

```typescript
export let currentInstance: ComponentInternalInstance | null = null

export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  currentInstance = instance
  instance.scope.on()
}

export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off()
  currentInstance = null
}
```

设置当前实例使得 Composition API 函数能够访问组件上下文。

## pauseTracking 的原因

```typescript
pauseTracking()
const setupResult = callWithErrorHandling(setup, ...)
resetTracking()
```

setup 执行期间可能会访问响应式数据，但这些访问不应该被当作依赖收集。只有在 render 函数中的访问才需要追踪。

## setup 的返回值类型

### 返回对象

```typescript
setup() {
  const count = ref(0)
  const increment = () => count.value++
  
  return {
    count,
    increment
  }
}
```

返回的对象会被合并到组件实例的 setupState 中。

### 返回渲染函数

```typescript
setup() {
  const count = ref(0)
  
  return () => h('div', count.value)
}
```

返回函数时被用作组件的 render 函数。

### 返回 undefined

```typescript
setup() {
  // 仅执行副作用
  onMounted(() => {
    console.log('mounted')
  })
}
```

没有返回值时，需要通过 template 或 Options API 的 render 选项提供渲染函数。

## handleSetupResult

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
    // 返回对象
    if (__DEV__ && isVNode(setupResult)) {
      warn(`setup() should not return VNodes directly`)
    }
    instance.setupState = proxyRefs(setupResult)
    if (__DEV__) {
      exposeSetupStateOnRenderContext(instance)
    }
  } else if (__DEV__ && setupResult !== undefined) {
    warn(
      `setup() should return an object. Received: ${
        setupResult === null ? 'null' : typeof setupResult
      }`
    )
  }
  finishComponentSetup(instance, isSSR)
}
```

## proxyRefs 自动解包

```typescript
instance.setupState = proxyRefs(setupResult)
```

proxyRefs 让模板中访问 ref 时不需要 .value：

```typescript
export function proxyRefs<T extends object>(
  objectWithRefs: T
): ShallowUnwrapRef<T> {
  return isReactive(objectWithRefs)
    ? objectWithRefs
    : new Proxy(objectWithRefs, shallowUnwrapHandlers)
}

const shallowUnwrapHandlers: ProxyHandler<any> = {
  get: (target, key, receiver) => unref(Reflect.get(target, key, receiver)),
  set: (target, key, value, receiver) => {
    const oldValue = target[key]
    if (isRef(oldValue) && !isRef(value)) {
      oldValue.value = value
      return true
    } else {
      return Reflect.set(target, key, value, receiver)
    }
  }
}
```

## 异步 setup

```typescript
async setup() {
  const data = await fetchData()
  return { data }
}
```

异步 setup 返回 Promise：

```typescript
if (isPromise(setupResult)) {
  if (isSSR) {
    return setupResult.then((resolvedResult) => {
      handleSetupResult(instance, resolvedResult, isSSR)
    })
  } else if (__FEATURE_SUSPENSE__) {
    instance.asyncDep = setupResult
  }
}
```

需要配合 Suspense 使用。

## 完整执行流程

```
1. setCurrentInstance(instance)
      ↓
2. instance.scope.on() - 激活 effect scope
      ↓
3. pauseTracking() - 暂停依赖追踪
      ↓
4. setup(props, ctx) - 执行 setup 函数
      ↓
5. resetTracking() - 恢复追踪
      ↓
6. unsetCurrentInstance() - 清除当前实例
      ↓
7. handleSetupResult() - 处理返回值
      ↓
8. finishComponentSetup() - 完成设置
```

## effect scope

```typescript
export const setCurrentInstance = (instance: ComponentInternalInstance) => {
  currentInstance = instance
  instance.scope.on()  // 激活 scope
}

export const unsetCurrentInstance = () => {
  currentInstance && currentInstance.scope.off()  // 关闭 scope
  currentInstance = null
}
```

effect scope 收集 setup 中创建的所有 effect，便于组件卸载时统一清理。

## 使用示例

```typescript
import { ref, computed, onMounted, watch } from 'vue'

export default {
  props: ['initialValue'],
  
  setup(props, { emit, expose }) {
    // 响应式状态
    const count = ref(props.initialValue)
    
    // 计算属性
    const doubled = computed(() => count.value * 2)
    
    // 方法
    const increment = () => {
      count.value++
      emit('change', count.value)
    }
    
    // 生命周期
    onMounted(() => {
      console.log('Component mounted')
    })
    
    // 侦听器
    watch(count, (newVal) => {
      console.log('Count changed:', newVal)
    })
    
    // 暴露给父组件
    expose({ increment })
    
    // 返回模板需要的数据
    return {
      count,
      doubled,
      increment
    }
  }
}
```

## 小结

setup 函数执行的关键点：

1. **时机控制**：在 props 初始化后、render 前执行
2. **上下文绑定**：setCurrentInstance 使 API 可用
3. **追踪暂停**：避免误收集依赖
4. **返回值处理**：对象或渲染函数两种模式
5. **自动解包**：proxyRefs 简化模板访问

setup 是连接响应式系统和组件的核心环节。

下一章将分析 setupContext 上下文对象的实现。
