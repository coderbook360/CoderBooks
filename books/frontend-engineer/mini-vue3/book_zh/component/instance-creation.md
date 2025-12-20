# 组件实例的创建与初始化

上一章我们了解了组件的本质——一种特殊的 VNode。当渲染器遇到组件 VNode 时，第一步就是创建组件实例。

**组件实例是组件的"运行时分身"——它保存着组件的所有状态、数据和上下文。** 本章将深入分析组件实例的数据结构和创建过程。

## 组件实例的完整结构

首先要问一个问题：组件实例需要包含哪些信息？

让我们从 Vue 3 源码中提取核心结构：

```typescript
interface ComponentInternalInstance {
  // ===== 唯一标识 =====
  uid: number                      // 全局唯一 ID
  type: ConcreteComponent          // 组件描述对象
  
  // ===== 组件树关系 =====
  parent: ComponentInternalInstance | null  // 父组件实例
  root: ComponentInternalInstance  // 根组件实例
  appContext: AppContext           // 应用上下文
  
  // ===== VNode 关系 =====
  vnode: VNode                     // 组件自身的 VNode
  subTree: VNode                   // render 返回的 VNode
  next: VNode | null               // 待更新的新 VNode（被动更新时使用）
  
  // ===== 组件状态 =====
  props: Data                      // 已解析的 props
  attrs: Data                      // 未声明的 attrs（穿透属性）
  slots: InternalSlots             // 插槽
  refs: Data                       // 模板引用
  emit: EmitFn                     // emit 函数
  
  // ===== setup 相关 =====
  setupState: Data                 // setup() 返回的对象
  setupContext: SetupContext | null // 传给 setup 的上下文
  
  // ===== 选项式 API =====
  data: Data                       // data() 返回值
  ctx: Data                        // 公开的 this 代理目标
  proxy: ComponentPublicInstance | null  // this 代理
  
  // ===== 渲染相关 =====
  render: InternalRenderFunction | null
  effect: ReactiveEffect           // 渲染 effect
  update: () => void               // 更新函数
  
  // ===== 生命周期状态 =====
  isMounted: boolean
  isUnmounted: boolean
  
  // ===== 生命周期钩子 =====
  bm: LifecycleHook                // beforeMount
  m: LifecycleHook                 // mounted
  bu: LifecycleHook                // beforeUpdate
  u: LifecycleHook                 // updated
  bum: LifecycleHook               // beforeUnmount
  um: LifecycleHook                // unmounted
  
  // ===== provide/inject =====
  provides: Data
  
  // ===== Suspense =====
  suspense: SuspenseBoundary | null
  asyncDep: Promise<any> | null
}
```

这个结构看起来很复杂，但可以分为几个核心部分：

1. **身份信息**：uid、type、组件树关系
2. **VNode 关系**：自身 VNode 和渲染结果
3. **状态数据**：props、slots、setupState 等
4. **渲染机制**：render、effect、update
5. **生命周期**：状态标记和钩子函数

## createComponentInstance 实现

创建组件实例的核心函数是 `createComponentInstance`：

```javascript
let uid = 0

function createComponentInstance(vnode, parent) {
  const type = vnode.type
  
  // 继承应用上下文
  const appContext = (parent ? parent.appContext : vnode.appContext) || {}
  
  const instance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null,  // 稍后设置
    
    // 子树
    subTree: null,
    next: null,
    
    // 状态
    props: {},
    attrs: {},
    slots: {},
    refs: {},
    emit: null,
    
    // setup
    setupState: {},
    setupContext: null,
    
    // 选项式 API
    data: {},
    ctx: {},
    proxy: null,
    
    // 渲染
    render: null,
    effect: null,
    update: null,
    
    // 生命周期
    isMounted: false,
    isUnmounted: false,
    
    // 钩子数组
    bm: null,
    m: null,
    bu: null,
    u: null,
    bum: null,
    um: null,
    
    // provide
    provides: parent ? parent.provides : Object.create(appContext.provides || null),
  }
  
  // 设置 root
  instance.root = parent ? parent.root : instance
  
  // 创建 emit 函数，绑定 instance
  instance.emit = emit.bind(null, instance)
  
  return instance
}
```

注意几个设计细节：

**1. 全局唯一 ID**

```javascript
uid: uid++
```

每个组件实例都有唯一的 `uid`，用于调试和内部标识。

**2. 应用上下文继承**

```javascript
const appContext = (parent ? parent.appContext : vnode.appContext) || {}
```

子组件继承父组件的应用上下文，确保 `app.config.globalProperties`、全局组件、指令等能被访问。

**3. provides 原型链**

```javascript
provides: parent ? parent.provides : Object.create(appContext.provides || null)
```

使用原型链实现 provide/inject 的继承。子组件的 `provides` 以父组件的 `provides` 为原型，可以向上查找。

**4. emit 绑定**

```javascript
instance.emit = emit.bind(null, instance)
```

将 `emit` 函数绑定到当前实例，方便后续调用。

## setupComponent 初始化流程

创建实例后，需要初始化组件的各项配置：

```javascript
function setupComponent(instance) {
  const { props, children } = instance.vnode
  
  // 1. 初始化 props
  initProps(instance, props)
  
  // 2. 初始化 slots
  initSlots(instance, children)
  
  // 3. 处理有状态组件
  const isStateful = instance.vnode.shapeFlag & ShapeFlags.STATEFUL_COMPONENT
  
  if (isStateful) {
    setupStatefulComponent(instance)
  } else {
    // 函数式组件，直接使用 type 作为 render
    instance.render = instance.type
  }
}
```

这个函数是初始化的入口，分三步：
1. 初始化 props（解析、校验、设置响应式）
2. 初始化 slots（规范化插槽内容）
3. 处理有状态组件或函数式组件

## setupStatefulComponent 详解

有状态组件的处理是核心：

```javascript
function setupStatefulComponent(instance) {
  const Component = instance.type
  
  // 1. 创建代理对象（组件的 this）
  instance.proxy = new Proxy(instance.ctx, PublicInstanceProxyHandlers)
  
  // 2. 执行 setup
  const { setup } = Component
  
  if (setup) {
    // 创建 setup 上下文
    const setupContext = (instance.setupContext = createSetupContext(instance))
    
    // 设置当前实例（让 setup 中的生命周期钩子能找到实例）
    setCurrentInstance(instance)
    
    // 执行 setup
    const setupResult = setup(instance.props, setupContext)
    
    // 重置当前实例
    unsetCurrentInstance()
    
    // 处理 setup 返回值
    handleSetupResult(instance, setupResult)
  } else {
    // 没有 setup，直接完成设置
    finishComponentSetup(instance)
  }
}
```

**currentInstance 机制**

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

这个机制非常关键——它让 setup 中的生命周期钩子能找到当前组件实例：

```javascript
// 在 setup 中
function onMounted(callback) {
  const instance = getCurrentInstance()
  if (instance) {
    // 将回调添加到实例的 m（mounted）数组
    ;(instance.m || (instance.m = [])).push(callback)
  }
}
```

**createSetupContext**

```javascript
function createSetupContext(instance) {
  return {
    attrs: instance.attrs,
    slots: instance.slots,
    emit: instance.emit,
    expose: (exposed) => {
      instance.exposed = exposed
    }
  }
}
```

这就是 setup 的第二个参数 `context`。

## handleSetupResult

setup 可以返回两种类型的值：

```javascript
function handleSetupResult(instance, setupResult) {
  if (isFunction(setupResult)) {
    // 返回函数 → 作为 render 函数
    instance.render = setupResult
  } else if (isObject(setupResult)) {
    // 返回对象 → 作为 setupState
    instance.setupState = proxyRefs(setupResult)
  }
  
  finishComponentSetup(instance)
}
```

**proxyRefs 的作用**

```javascript
// 返回对象中的 ref 自动解包
const count = ref(0)
return { count }

// 在模板中直接使用 count，而不是 count.value
// proxyRefs 实现了这个自动解包
```

## finishComponentSetup

最后完成设置：

```javascript
function finishComponentSetup(instance) {
  const Component = instance.type
  
  // 如果还没有 render 函数
  if (!instance.render) {
    // 尝试从组件选项获取
    if (Component.render) {
      instance.render = Component.render
    }
    // 或者编译 template
    else if (Component.template && compile) {
      instance.render = compile(Component.template)
    }
  }
  
  // 处理选项式 API
  if (Component.data || Component.computed || Component.methods) {
    applyOptions(instance)
  }
}
```

## 完整流程图

让我们把整个流程串起来：

```
mountComponent(vnode, container, anchor, parent)
    │
    ├── 1. createComponentInstance(vnode, parent)
    │       创建实例对象，初始化各种属性
    │
    ├── 2. setupComponent(instance)
    │       │
    │       ├── initProps(instance, props)
    │       │
    │       ├── initSlots(instance, children)
    │       │
    │       └── setupStatefulComponent(instance)
    │               │
    │               ├── 创建 proxy
    │               ├── setCurrentInstance(instance)
    │               ├── 执行 setup()
    │               ├── unsetCurrentInstance()
    │               ├── handleSetupResult()
    │               └── finishComponentSetup()
    │
    └── 3. setupRenderEffect(instance, vnode, container)
            设置渲染副作用，执行首次渲染
```

## 本章小结

本章深入分析了组件实例的创建和初始化：

- **实例结构**：包含身份、VNode、状态、渲染、生命周期等信息
- **createComponentInstance**：创建实例，继承上下文，设置原型链
- **setupComponent**：初始化 props/slots，处理有状态组件
- **setupStatefulComponent**：创建代理，执行 setup，处理返回值
- **currentInstance**：让生命周期钩子能找到当前实例

理解了实例的创建和初始化，下一章我们将分析组件公共实例代理——也就是组件中 `this` 是如何工作的。
