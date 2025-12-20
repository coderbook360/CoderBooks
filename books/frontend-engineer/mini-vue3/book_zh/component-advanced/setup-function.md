# setup 函数深入解析

setup 是组合式 API 的入口，所有响应式状态、计算属性、方法都在这里定义。**但你真的理解 setup 是如何工作的吗？**

本章将深入分析 setup 的执行时机、参数处理和返回值机制。**理解这些，能帮你更好地设计组合式函数、避免常见坑点。**

## setup 的执行时机

首先要问一个问题：setup 在组件生命周期的什么位置执行？

答案：**在 props 和 slots 初始化之后，渲染之前**。

```javascript
// 组件初始化流程
function mountComponent(initialVNode, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(initialVNode)
  
  // 2. 设置组件（调用 setup）
  setupComponent(instance)
  
  // 3. 设置渲染 effect
  setupRenderEffect(instance, container)
}

function setupComponent(instance) {
  const { props, children } = instance.vnode
  
  // 先初始化 props 和 slots
  initProps(instance, props)
  initSlots(instance, children)
  
  // 再处理有状态组件（调用 setup）
  setupStatefulComponent(instance)
}
```

关键时序：
1. 创建实例
2. 初始化 props
3. 初始化 slots
4. **执行 setup**
5. 设置渲染 effect

setup 执行时，props 和 slots 已可用，但 DOM 尚未存在。

## setupStatefulComponent 实现

```javascript
function setupStatefulComponent(instance) {
  const Component = instance.type
  
  // 创建渲染代理
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  
  const { setup } = Component
  
  if (setup) {
    // 设置当前实例（关键！）
    setCurrentInstance(instance)
    
    // 准备 setup 上下文
    const setupContext = createSetupContext(instance)
    
    // 调用 setup
    const setupResult = callWithErrorHandling(
      setup,
      instance,
      [instance.props, setupContext]
    )
    
    // 清除当前实例
    unsetCurrentInstance()
    
    // 处理返回值
    handleSetupResult(instance, setupResult)
  } else {
    // 无 setup，直接完成设置
    finishComponentSetup(instance)
  }
}
```

核心步骤：
1. 设置 `currentInstance`——这就是 `onMounted` 等钩子能找到正确组件的原因
2. 创建 SetupContext
3. 调用 setup
4. 清除 `currentInstance`
5. 处理返回值

## props 参数

setup 的第一个参数是 props：

```javascript
const MyComponent = {
  props: {
    title: String,
    count: { type: Number, default: 0 }
  },
  
  setup(props) {
    // props 是响应式的（shallowReactive）
    console.log(props.title)
    console.log(props.count)
    
    // 可以 watch
    watch(() => props.title, (newVal) => {
      console.log('title changed:', newVal)
    })
    
    return {}
  }
}
```

props 的特点：
- 是 shallowReactive 包装的响应式对象
- 只读，不能修改
- 访问会触发依赖收集

**常见错误**：解构 props 会丢失响应性。

```javascript
setup(props) {
  // ❌ 错误：解构后失去响应性
  const { title } = props
  
  // ✅ 正确：使用 toRefs
  const { title } = toRefs(props)
  
  // ✅ 正确：使用 toRef
  const title = toRef(props, 'title')
}
```

## SetupContext 参数

setup 的第二个参数是 context：

```javascript
interface SetupContext {
  attrs: Data          // 非 props 的属性
  slots: Slots         // 插槽
  emit: EmitFn         // 触发事件
  expose: ExposeFn     // 暴露公共属性
}
```

创建过程：

```javascript
function createSetupContext(instance) {
  return {
    get attrs() {
      return instance.attrs
    },
    get slots() {
      return instance.slots
    },
    get emit() {
      return instance.emit
    },
    expose: (exposed) => {
      instance.exposed = exposed || {}
    }
  }
}
```

使用示例：

```javascript
setup(props, { attrs, slots, emit, expose }) {
  // attrs：透传属性
  console.log(attrs.class, attrs.style)
  
  // slots：插槽
  const defaultSlot = slots.default?.()
  
  // emit：触发事件
  const handleClick = () => emit('click')
  
  // expose：暴露给父组件
  expose({
    focus: () => inputRef.value?.focus()
  })
}
```

## 返回值处理

setup 可以返回两种类型的值：

**返回对象**：暴露给模板使用

```javascript
setup() {
  const count = ref(0)
  const increment = () => count.value++
  
  return { count, increment }
}
```

**返回函数**：作为 render 函数

```javascript
setup() {
  const count = ref(0)
  
  return () => h('div', count.value)
}
```

处理逻辑：

```javascript
function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    // 返回函数作为 render
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    // 返回对象暴露给模板
    // proxyRefs 实现自动解包
    instance.setupState = proxyRefs(setupResult)
  }
  
  finishComponentSetup(instance)
}
```

关键点：`proxyRefs` 实现了 ref 的自动解包，模板中可以直接使用 `count` 而非 `count.value`。

## proxyRefs 自动解包

```javascript
function proxyRefs(objectWithRefs) {
  return new Proxy(objectWithRefs, {
    get(target, key) {
      // 自动解包 ref
      return unref(target[key])
    },
    set(target, key, value) {
      const oldValue = target[key]
      
      if (isRef(oldValue) && !isRef(value)) {
        // 如果目标是 ref，设置其 value
        oldValue.value = value
        return true
      }
      
      target[key] = value
      return true
    }
  })
}
```

效果：

```javascript
const state = proxyRefs({ count: ref(0) })

// 读取自动解包
console.log(state.count)  // 0，不是 { value: 0 }

// 赋值自动设置 .value
state.count = 1  // 等价于 count.value = 1
```

## currentInstance 机制

setup 执行期间，`currentInstance` 指向当前组件：

```javascript
let currentInstance = null

function setCurrentInstance(instance) {
  currentInstance = instance
}

function unsetCurrentInstance() {
  currentInstance = null
}

function getCurrentInstance() {
  return currentInstance
}
```

这就是 `onMounted` 等钩子能工作的原因：

```javascript
function onMounted(hook) {
  // 获取当前正在执行 setup 的组件
  const target = getCurrentInstance()
  
  if (target) {
    ;(target.m || (target.m = [])).push(hook)
  }
}
```

必须在 setup 内部调用，因为那是 `currentInstance` 有值的唯一时机。

## 异步 setup

setup 可以是异步函数：

```javascript
async setup() {
  const data = await fetchData()
  return { data }
}
```

处理方式：

```javascript
function setupStatefulComponent(instance) {
  const setupResult = callWithErrorHandling(setup, instance, [props, context])
  
  if (isPromise(setupResult)) {
    // 异步 setup
    setupResult.then(
      (result) => handleSetupResult(instance, result),
      (err) => handleError(err, instance, 'setup function')
    )
  } else {
    handleSetupResult(instance, setupResult)
  }
}
```

但是，异步 setup 需要配合 `Suspense` 使用，否则组件会在数据加载前就渲染。

## 与选项式 API 的关系

setup 优先于选项式 API 执行：

```javascript
export default {
  data() {
    return { fromData: 'data' }
  },
  
  setup() {
    const fromSetup = ref('setup')
    return { fromSetup }
  },
  
  created() {
    // 两者都可访问
    console.log(this.fromData)   // 'data'
    console.log(this.fromSetup)  // 'setup'
  }
}
```

如果 setup 和 data 返回同名属性，setup 优先：

```javascript
data() { return { count: 1 } },
setup() { return { count: ref(2) } }
// 最终 this.count === 2
```

## 本章小结

本章深入分析了 setup 函数：

- **执行时机**：props/slots 初始化后，渲染前
- **props 参数**：shallowReactive 包装，只读响应式
- **context 参数**：attrs、slots、emit、expose
- **返回对象**：暴露给模板，通过 proxyRefs 自动解包
- **返回函数**：作为 render 函数
- **currentInstance**：setup 执行期间指向当前组件

setup 是组合式 API 的核心入口。理解其工作原理，才能正确使用 `onMounted`、`provide`、`inject` 等 API。

下一章，我们将分析生命周期钩子的注册机制。
