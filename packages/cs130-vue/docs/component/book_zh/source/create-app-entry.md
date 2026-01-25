# createApp 入口分析

`createApp` 是使用 Vue 的第一步。这个函数创建应用实例，配置全局上下文，最终通过 `mount` 将应用渲染到页面上。理解这个入口，是理解整个组件系统的起点。

## 基本用法

最简单的用法只需几行代码：

```javascript
import { createApp } from 'vue'
import App from './App.vue'

const app = createApp(App)
app.mount('#app')
```

`createApp` 接收根组件，返回应用实例。应用实例提供了一系列方法来配置应用，最终通过 `mount` 启动渲染。

## 源码位置

`createApp` 定义在 `packages/runtime-dom/src/index.ts`：

```typescript
export const createApp = ((...args) => {
  // 使用 ensureRenderer 获取渲染器
  const app = ensureRenderer().createApp(...args)
  
  // 保存原始的 mount 方法
  const { mount } = app
  
  // 重写 mount 方法，增加 DOM 特定的处理
  app.mount = (containerOrSelector: Element | ShadowRoot | string): any => {
    // 规范化容器
    const container = normalizeContainer(containerOrSelector)
    if (!container) return
    
    const component = app._component
    
    // 如果没有 render 和 template，使用容器的 innerHTML 作为模板
    if (!isFunction(component) && !component.render && !component.template) {
      component.template = container.innerHTML
    }
    
    // 清空容器
    container.innerHTML = ''
    
    // 调用原始 mount
    const proxy = mount(container, false, container instanceof SVGElement)
    
    // 设置自定义属性
    if (container instanceof Element) {
      container.removeAttribute('v-cloak')
      container.setAttribute('data-v-app', '')
    }
    
    return proxy
  }
  
  return app
}) as CreateAppFunction<Element>
```

这段代码展示了一个重要的设计：runtime-dom 在 runtime-core 的基础上增加了 Web 平台特定的处理。core 层提供平台无关的逻辑，dom 层处理 DOM 相关的细节。

## ensureRenderer

`ensureRenderer` 使用懒加载模式创建渲染器：

```typescript
let renderer: Renderer<Element | ShadowRoot> | null

function ensureRenderer() {
  return (
    renderer ||
    (renderer = createRenderer<Node, Element | ShadowRoot>(rendererOptions))
  )
}
```

`rendererOptions` 包含了 DOM 操作的具体实现：

```typescript
const rendererOptions = {
  patchProp,       // 处理属性
  insert,          // 插入节点
  remove,          // 删除节点
  createElement,   // 创建元素
  createText,      // 创建文本
  setText,         // 设置文本
  // ... 更多 DOM 操作
}
```

这种设计让 Vue 可以运行在不同平台——只需提供不同的 rendererOptions。

## runtime-core 中的 createApp

核心的 `createApp` 逻辑在 `packages/runtime-core/src/apiCreateApp.ts`：

```typescript
export function createAppAPI<HostElement>(
  render: RootRenderFunction<HostElement>,
  hydrate?: RootHydrateFunction
): CreateAppFunction<HostElement> {
  return function createApp(rootComponent, rootProps = null) {
    // 创建应用上下文
    const context = createAppContext()
    
    // 已安装的插件集合
    const installedPlugins = new Set()
    
    // 是否已挂载
    let isMounted = false
    
    // 创建应用实例
    const app: App = {
      _uid: uid++,
      _component: rootComponent,
      _props: rootProps,
      _container: null,
      _context: context,
      _instance: null,
      
      version,
      
      get config() {
        return context.config
      },
      
      set config(v) {
        // 警告：config 是只读的
      },
      
      use(plugin, ...options) { /* 插件安装 */ },
      
      mixin(mixin) { /* 全局 mixin */ },
      
      component(name, component?) { /* 全局组件注册 */ },
      
      directive(name, directive?) { /* 全局指令注册 */ },
      
      mount(rootContainer, isHydrate?, isSVG?) { /* 挂载 */ },
      
      unmount() { /* 卸载 */ },
      
      provide(key, value) { /* 全局 provide */ },
    }
    
    return app
  }
}
```

`createApp` 返回的应用实例是一个包含多个方法的对象。这些方法可以链式调用：

```javascript
createApp(App)
  .use(router)
  .use(store)
  .component('GlobalButton', Button)
  .directive('focus', focusDirective)
  .mount('#app')
```

## 应用上下文

`createAppContext` 创建了应用级别的共享上下文：

```typescript
export function createAppContext(): AppContext {
  return {
    app: null as any,
    config: {
      isNativeTag: NO,
      performance: false,
      globalProperties: {},
      optionMergeStrategies: {},
      errorHandler: undefined,
      warnHandler: undefined,
      compilerOptions: {}
    },
    mixins: [],
    components: {},
    directives: {},
    provides: Object.create(null),
    optionsCache: new WeakMap(),
    propsCache: new WeakMap(),
    emitsCache: new WeakMap()
  }
}
```

这个上下文被所有组件共享。当在组件中使用 `inject` 时，如果组件链上没有对应的 `provide`，会查找 `context.provides`。

## mount 方法

`mount` 方法是应用启动的关键：

```typescript
mount(
  rootContainer: HostElement,
  isHydrate?: boolean,
  isSVG?: boolean
): any {
  if (!isMounted) {
    // 创建根组件的 VNode
    const vnode = createVNode(rootComponent, rootProps)
    
    // 将应用上下文存储在根 VNode 上
    vnode.appContext = context
    
    if (isHydrate && hydrate) {
      // SSR 水合
      hydrate(vnode as VNode<Node, Element>, rootContainer as any)
    } else {
      // 正常渲染
      render(vnode, rootContainer, isSVG)
    }
    
    isMounted = true
    app._container = rootContainer
    
    // 返回根组件的代理
    return getExposeProxy(vnode.component!) || vnode.component!.proxy
  }
}
```

`mount` 做了三件事：
1. 为根组件创建 VNode
2. 调用 `render` 函数将 VNode 渲染为真实 DOM
3. 返回根组件的公开实例

## render 函数

`render` 函数是渲染器的入口，在 `renderer.ts` 中定义：

```typescript
const render: RootRenderFunction = (vnode, container, isSVG) => {
  if (vnode == null) {
    // vnode 为空，卸载
    if (container._vnode) {
      unmount(container._vnode, null, null, true)
    }
  } else {
    // 正常渲染或更新
    patch(container._vnode || null, vnode, container, null, null, null, isSVG)
  }
  
  // 刷新任务队列
  flushPreFlushCbs()
  flushPostFlushCbs()
  
  // 保存当前 vnode
  container._vnode = vnode
}
```

`patch` 是渲染器的核心，负责对比新旧 VNode 并更新 DOM。首次渲染时，旧 VNode 为 null，执行挂载；后续渲染时，对比新旧 VNode，执行更新。

## 应用配置

应用实例的 `config` 属性提供了全局配置：

```javascript
const app = createApp(App)

// 错误处理
app.config.errorHandler = (err, instance, info) => {
  console.error('Vue error:', err)
}

// 全局属性
app.config.globalProperties.$http = axios

// 编译选项（运行时编译需要）
app.config.compilerOptions.isCustomElement = tag => tag.startsWith('my-')
```

这些配置存储在 `context.config` 中，可以在任何组件中通过 `this.$xxx` 访问 `globalProperties`。

## 多应用实例

每次调用 `createApp` 都创建一个独立的应用实例：

```javascript
const app1 = createApp(App1)
const app2 = createApp(App2)

app1.mount('#app1')
app2.mount('#app2')
```

两个应用完全独立，有各自的上下文、全局组件、全局状态。这在微前端等场景下很有用。

## 类型定义

`createApp` 的类型签名：

```typescript
export type CreateAppFunction<HostElement> = (
  rootComponent: Component,
  rootProps?: Data | null
) => App<HostElement>

export interface App<HostElement = any> {
  version: string
  config: AppConfig
  
  use<Options extends unknown[]>(
    plugin: Plugin<Options>,
    ...options: Options
  ): this
  
  mixin(mixin: ComponentOptions): this
  component(name: string): Component | undefined
  component(name: string, component: Component): this
  directive(name: string): Directive | undefined
  directive(name: string, directive: Directive): this
  
  mount(
    rootContainer: HostElement | string,
    isHydrate?: boolean,
    isSVG?: boolean
  ): ComponentPublicInstance
  
  unmount(): void
  provide<T>(key: InjectionKey<T> | string, value: T): this
}
```

类型定义清晰地展示了 App 的所有能力。

## 小结

`createApp` 是 Vue 应用的入口。它创建应用实例，配置上下文，最终通过 `mount` 启动渲染。

应用实例提供了丰富的配置方法——插件、全局组件、全局指令、全局 provide。这些配置存储在应用上下文中，被所有组件共享。

runtime-dom 在 runtime-core 的基础上增加了 Web 平台特定的处理，这种分层让 Vue 可以运行在不同平台。

在下一章中，我们将深入 `createAppContext`，看看应用上下文的结构和作用。
