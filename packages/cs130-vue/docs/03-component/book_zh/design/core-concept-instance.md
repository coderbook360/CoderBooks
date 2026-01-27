# 核心概念：组件实例

如果说组件定义是蓝图，那么组件实例就是根据蓝图建造的房子。每当一个组件被渲染到页面上，Vue 就会创建一个组件实例。理解组件实例的结构，是理解 Vue 组件运行时行为的关键。

## 从定义到实例

当渲染器遇到一个组件 VNode 时，它会调用 `mountComponent` 来挂载这个组件。挂载的第一步就是创建组件实例：

```javascript
// 简化的组件挂载流程
function mountComponent(vnode, container) {
  // 1. 创建组件实例
  const instance = createComponentInstance(vnode)
  
  // 2. 设置组件（初始化 props、slots、执行 setup 等）
  setupComponent(instance)
  
  // 3. 设置渲染副作用（建立响应式更新）
  setupRenderEffect(instance, container)
}
```

`createComponentInstance` 函数创建一个包含组件运行时状态的对象。这个对象的结构相当复杂，包含了组件运行所需的所有信息。让我们逐步了解它的主要属性。

## 实例的核心属性

一个组件实例包含几类重要的属性。

**身份与关系**类属性记录了实例在组件树中的位置：

```typescript
interface ComponentInstance {
  uid: number           // 唯一标识符
  type: Component       // 组件定义
  parent: ComponentInstance | null  // 父组件实例
  root: ComponentInstance           // 根组件实例
  appContext: AppContext            // 应用上下文
}
```

`uid` 是每个实例的唯一编号，用于调试和 DevTools。`type` 指向创建这个实例的组件定义。`parent` 和 `root` 建立了组件树的层级关系，`provide/inject` 依赖注入就是通过遍历 `parent` 链来实现的。`appContext` 包含全局注册的组件、指令、配置等，是应用级的共享上下文。

**输入与输出**类属性管理组件与外界的交互：

```typescript
interface ComponentInstance {
  vnode: VNode              // 组件自身的 VNode
  subTree: VNode | null     // 组件渲染的子 VNode 树
  props: Data               // 解析后的 props
  attrs: Data               // 非 prop 的 attributes
  slots: Slots              // 插槽内容
  emit: EmitFn              // 事件触发函数
}
```

`vnode` 是代表组件自身的虚拟节点，它的 `props` 包含父组件传入的所有属性。但组件实例的 `props` 只包含被声明为 prop 的属性，经过规范化和验证。`attrs` 则包含那些未被声明为 prop 的"透传"属性。`slots` 存储父组件传入的插槽内容。`subTree` 是组件 render 函数返回的 VNode 树，代表组件的渲染输出。

**内部状态**类属性存储组件的运行时状态：

```typescript
interface ComponentInstance {
  setupState: Data          // setup 函数返回的状态
  data: Data                // Options API 的 data
  ctx: Data                 // 渲染上下文（代理对象）
  proxy: ComponentPublicInstance | null  // 公开的组件实例代理
}
```

`setupState` 存储 `setup` 函数返回的对象，是 Composition API 的状态来源。`data` 存储 Options API 中 `data()` 返回的对象。`ctx` 是一个代理对象，模板和 Options API 通过它访问状态。`proxy` 是暴露给用户的组件实例代理，也就是 Options API 中的 `this`。

**生命周期**类属性管理组件的生命周期钩子：

```typescript
interface ComponentInstance {
  isMounted: boolean        // 是否已挂载
  isUnmounted: boolean      // 是否已卸载
  bm: LifecycleHook         // beforeMount 钩子数组
  m: LifecycleHook          // mounted 钩子数组
  bu: LifecycleHook         // beforeUpdate 钩子数组
  u: LifecycleHook          // updated 钩子数组
  bum: LifecycleHook        // beforeUnmount 钩子数组
  um: LifecycleHook         // unmounted 钩子数组
}
```

这些属性使用了简写命名（如 `bm` 代表 beforeMount）来节省内存。每个钩子属性是一个数组，因为同一个生命周期可以注册多个钩子函数。`isMounted` 和 `isUnmounted` 标记实例的当前状态，决定了哪些操作是合法的。

## 实例代理：this 的秘密

在 Options API 中，我们通过 `this` 访问 props、data、methods 等。但这个 `this` 并不是组件实例本身，而是一个精心设计的代理对象。

```javascript
export default {
  props: ['title'],
  data() {
    return { count: 0 }
  },
  computed: {
    double() { return this.count * 2 }
  },
  methods: {
    increment() {
      this.count++           // 访问 data
      console.log(this.title) // 访问 props
      console.log(this.double) // 访问 computed
    }
  }
}
```

在这段代码中，`this.count` 访问的是 data 中的属性，`this.title` 访问的是 props，`this.double` 访问的是计算属性。它们存储在不同的地方，但通过 `this` 可以统一访问。这是通过 Proxy 实现的：

```javascript
// 简化的代理实现
const proxy = new Proxy(instance.ctx, {
  get(target, key) {
    // 按优先级查找属性
    const { setupState, data, props, ctx } = instance
    
    // 1. 先查 setup 返回值
    if (key in setupState) return setupState[key]
    // 2. 再查 data
    if (key in data) return data[key]
    // 3. 再查 props
    if (key in props) return props[key]
    // 4. 再查 computed、methods 等
    // ...
  },
  set(target, key, value) {
    // 只允许修改 data 和 setupState
    if (key in instance.data) {
      instance.data[key] = value
      return true
    }
    if (key in instance.setupState) {
      instance.setupState[key] = value
      return true
    }
    // props 是只读的
    if (key in instance.props) {
      console.warn('Props are readonly')
      return false
    }
  }
})
```

这段代码展示了代理的基本逻辑。`get` 拦截器按照特定的优先级顺序查找属性：setupState 优先于 data，data 优先于 props。这个顺序确保了当存在同名属性时，用户的意图得到正确的解析。`set` 拦截器则确保 props 不会被直接修改，维护单向数据流的原则。

实际的实现比这复杂得多，还需要处理 computed、methods、$data、$props 等特殊属性，以及开发环境的警告提示。但核心思想是一样的：通过代理提供统一的访问接口，隐藏内部的存储细节。

## setup 与实例的关系

Composition API 的 `setup` 函数在组件实例创建后、其他选项处理前执行。这是一个特殊的时间窗口：

```javascript
function setupComponent(instance) {
  // 1. 初始化 props
  initProps(instance, instance.vnode.props)
  
  // 2. 初始化 slots
  initSlots(instance, instance.vnode.children)
  
  // 3. 执行 setup（如果有）
  if (instance.type.setup) {
    // 设置当前实例，让 setup 中的钩子函数能获取到实例
    setCurrentInstance(instance)
    const setupResult = instance.type.setup(instance.props, setupContext)
    setCurrentInstance(null)
    
    // 处理 setup 的返回值
    handleSetupResult(instance, setupResult)
  }
  
  // 4. 处理 Options API 选项
  finishComponentSetup(instance)
}
```

`setCurrentInstance` 是一个关键机制。它将当前正在执行 setup 的实例设置为全局变量，让 `onMounted`、`watch` 等函数能够知道它们属于哪个组件实例：

```javascript
let currentInstance = null

export function setCurrentInstance(instance) {
  currentInstance = instance
}

export function getCurrentInstance() {
  return currentInstance
}

// 生命周期钩子的注册
export function onMounted(hook) {
  if (currentInstance) {
    // 将钩子添加到当前实例的 m（mounted）数组中
    (currentInstance.m || (currentInstance.m = [])).push(hook)
  } else {
    console.warn('onMounted must be called inside setup')
  }
}
```

这就是为什么生命周期钩子必须在 `setup` 函数或其同步调用栈中调用——只有在这个时间窗口内，`currentInstance` 才有值。如果在异步代码中调用，`currentInstance` 已经被清空，钩子无法注册到正确的实例。

## 渲染上下文的构建

组件实例需要一个"渲染上下文"来提供模板需要的所有数据。这个上下文由 `instance.ctx` 表示，在 setup 执行后被填充：

```javascript
// 简化的渲染上下文构建
function finishComponentSetup(instance) {
  // 创建渲染上下文
  instance.ctx = createRenderContext(instance)
  
  // 如果组件没有 render 函数，编译模板
  if (!instance.render) {
    instance.render = compile(instance.type.template)
  }
}

function createRenderContext(instance) {
  return new Proxy(instance, {
    get(target, key) {
      // 提供模板需要的所有数据
      // setupState, data, props, computed, methods...
    }
  })
}
```

模板编译生成的 render 函数会使用这个渲染上下文。当模板中写 `{{ count }}`，实际上是访问 `ctx.count`，代理会从正确的来源返回数据。

## 公开实例与内部实例

Vue 区分了"公开实例"（Public Instance）和"内部实例"（Internal Instance）。

内部实例（`ComponentInternalInstance`）包含了组件运行所需的所有内部状态，是框架内部使用的完整结构。公开实例（`ComponentPublicInstance`）是暴露给用户的接口，只包含用户应该访问的属性：

```javascript
// 用户通过 ref 获取的是公开实例
const childRef = ref()
// childRef.value 是公开实例，不是内部实例

// 公开实例暴露的属性
interface ComponentPublicInstance {
  $el: Element             // 根 DOM 元素
  $data: Data              // data 对象
  $props: Data             // props 对象
  $attrs: Data             // attrs 对象
  $slots: Slots            // slots 对象
  $refs: Record<string, any> // 模板 ref
  $parent: ComponentPublicInstance | null
  $root: ComponentPublicInstance
  $emit: EmitFn
  $forceUpdate: () => void
  $nextTick: (fn: () => void) => Promise<void>
  // ... 以及 setup 返回的属性
}
```

这种分离是有意为之的。内部实例包含很多实现细节（如生命周期钩子数组、更新函数等），用户不应该直接访问它们。通过公开实例这层抽象，Vue 可以自由地修改内部结构而不破坏用户代码。

使用 `expose` 可以进一步限制公开实例暴露的内容：

```javascript
export default {
  setup(props, { expose }) {
    const publicMethod = () => { /* ... */ }
    const privateState = ref(0)
    
    // 只暴露指定的属性，父组件无法访问 privateState
    expose({ publicMethod })
    
    return { publicMethod, privateState }
  }
}
```

这在编写可复用组件库时非常有用——你可以明确控制哪些是公开 API，哪些是内部实现。

## 实例的内存结构考量

组件实例的设计需要考虑内存效率。一个复杂应用可能有数百甚至数千个组件实例同时存在，每个实例节省的内存都会累积。

Vue 采取了几种优化策略。首先是属性的延迟初始化——不是所有实例都需要所有属性，很多属性只在需要时才创建。比如生命周期钩子数组只在注册钩子时才创建。

其次是共享结构——同一个组件定义的多个实例，可以共享规范化后的 props 选项、computed 定义等。这些只需要计算一次，然后缓存起来。

最后是短属性名——如前所述，生命周期钩子使用 `bm`、`m` 这样的短名称，在有大量实例时能节省可观的内存。

## 小结

组件实例是组件定义的运行时实体，包含了组件运行所需的所有状态：身份与关系、输入与输出、内部状态、生命周期等。通过精心设计的代理机制，Vue 提供了统一的访问接口，隐藏了内部的复杂性。

`setup` 函数在特殊的时间窗口执行，通过全局的 `currentInstance` 变量，生命周期钩子等 Composition API 能够正确关联到所属的组件实例。公开实例与内部实例的分离，则提供了清晰的 API 边界。

在下一章中，我们将探讨组件生命周期——组件实例从创建到销毁经历的各个阶段，以及在每个阶段可以做什么。
