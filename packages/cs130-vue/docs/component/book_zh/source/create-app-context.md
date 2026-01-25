# createAppContext 上下文创建

应用上下文是 Vue 应用的"共享内存"。全局组件、全局指令、插件配置、错误处理器——这些在整个应用范围内共享的数据都存储在上下文中。每个组件实例都可以访问这个上下文。

## 上下文的作用

当你调用 `app.component('Button', Button)` 注册全局组件时，Button 被存储在上下文的 `components` 对象中。当组件模板中使用 `<Button />` 时，渲染器会在上下文中查找这个组件。

类似地，全局指令、全局 provide、错误处理器都通过上下文共享。上下文是连接应用配置和组件运行的桥梁。

## 源码分析

`createAppContext` 在 `packages/runtime-core/src/apiCreateApp.ts` 中定义：

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

这个函数返回一个普通对象，包含了应用级别的所有共享状态。让我们逐一分析每个属性。

## config 配置对象

`config` 包含应用的全局配置：

```typescript
interface AppConfig {
  // 判断标签是否是原生标签（由编译器使用）
  isNativeTag: (tag: string) => boolean
  
  // 是否开启性能追踪
  performance: boolean
  
  // 全局属性，挂载到每个组件实例上
  globalProperties: Record<string, any>
  
  // 选项合并策略
  optionMergeStrategies: Record<string, OptionMergeFunction>
  
  // 全局错误处理器
  errorHandler?: (
    err: unknown,
    instance: ComponentPublicInstance | null,
    info: string
  ) => void
  
  // 全局警告处理器（开发环境）
  warnHandler?: (
    msg: string,
    instance: ComponentPublicInstance | null,
    trace: string
  ) => void
  
  // 运行时编译器选项
  compilerOptions: RuntimeCompilerOptions
}
```

**globalProperties** 是实用的功能。添加到这里的属性可以在任何组件中通过 `this` 访问：

```javascript
app.config.globalProperties.$api = api

// 在组件中
export default {
  mounted() {
    this.$api.fetch('/data')
  }
}
```

**errorHandler** 让你可以统一处理应用中的错误：

```javascript
app.config.errorHandler = (err, instance, info) => {
  // 记录错误日志
  logToServer(err, info)
  // 显示用户友好的错误提示
  showErrorNotification('操作失败，请重试')
}
```

## components 和 directives

全局组件和指令存储在这两个对象中：

```typescript
// 注册全局组件
app.component('MyButton', {
  template: '<button><slot /></button>'
})

// 实际存储
context.components['MyButton'] = { template: '<button><slot /></button>' }
```

组件解析时的查找顺序是：先在当前组件的局部注册中查找，找不到再查找全局注册：

```typescript
function resolveComponent(name: string, instance: ComponentInternalInstance) {
  // 先查局部
  const localComponent = instance.type.components?.[name]
  if (localComponent) return localComponent
  
  // 再查全局
  return instance.appContext.components[name]
}
```

## provides

全局 provide 让你可以在应用级别提供数据，任何组件都可以 inject：

```javascript
app.provide('theme', reactive({ mode: 'dark' }))

// 任何组件中
const theme = inject('theme')
```

`provides` 使用 `Object.create(null)` 创建，没有原型链，避免原型上的属性干扰查找。

## 缓存对象

上下文包含三个 WeakMap 缓存：

```typescript
optionsCache: new WeakMap(),   // 组件选项的规范化缓存
propsCache: new WeakMap(),     // Props 选项的规范化缓存
emitsCache: new WeakMap()      // Emits 选项的规范化缓存
```

这些缓存用于存储规范化后的选项，避免重复解析。以 Props 为例：

```typescript
function normalizePropsOptions(comp, appContext) {
  // 先检查缓存
  const cache = appContext.propsCache
  const cached = cache.get(comp)
  if (cached) {
    return cached
  }
  
  // 规范化处理...
  const normalized = /* ... */
  
  // 存入缓存
  cache.set(comp, normalized)
  return normalized
}
```

使用 WeakMap 的好处是，当组件被销毁且没有其他引用时，缓存会自动清理，不会造成内存泄漏。

## mixins

全局 mixins 存储在 `mixins` 数组中：

```javascript
app.mixin({
  created() {
    console.log('Component created')
  }
})

// 存储
context.mixins.push({ created() { /* ... */ } })
```

全局 mixin 会合并到每个组件的选项中。这是一个强大但需要谨慎使用的功能——过多的全局 mixin 会让组件行为难以追踪。

## 上下文的传递

上下文如何传递给每个组件？通过组件 VNode 和组件实例：

```typescript
// createApp 中的 mount 方法
mount(rootContainer) {
  const vnode = createVNode(rootComponent, rootProps)
  // 将上下文附加到根 VNode
  vnode.appContext = context
  render(vnode, rootContainer)
}

// 创建组件实例时
function createComponentInstance(vnode, parent) {
  // 从 VNode 或父组件获取上下文
  const appContext = 
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext
  
  const instance = {
    // ...
    appContext,
    // ...
  }
  return instance
}
```

根组件从 VNode 获取上下文，子组件从父组件继承。这样，整个组件树共享同一个上下文。

## 多应用隔离

每个应用有独立的上下文：

```javascript
const app1 = createApp(App1)
const app2 = createApp(App2)

app1.component('Button', BlueButton)
app2.component('Button', RedButton)

app1.mount('#app1')
app2.mount('#app2')
```

app1 中使用 `<Button />` 会渲染 BlueButton，app2 中会渲染 RedButton。它们的上下文完全隔离。

这对微前端场景很有用——不同团队开发的子应用可以有各自的全局配置，互不干扰。

## 类型定义

完整的 AppContext 类型：

```typescript
export interface AppContext {
  app: App
  config: AppConfig
  mixins: ComponentOptions[]
  components: Record<string, Component>
  directives: Record<string, Directive>
  provides: Record<string | symbol, any>
  
  // 内部缓存
  optionsCache: WeakMap<ComponentOptions, MergedComponentOptions>
  propsCache: WeakMap<ConcreteComponent, NormalizedPropsOptions>
  emitsCache: WeakMap<ConcreteComponent, ObjectEmitsOptions | null>
  
  // 仅用于 devtools
  reload?: () => void
  
  // HMR 相关
  __hmr?: {
    reload: (opts: ComponentOptions) => void
    remove: () => void
  }
}
```

开发工具和热更新相关的属性只在开发环境使用。

## 实际应用

理解上下文有助于正确使用全局功能：

```javascript
// 应用初始化
const app = createApp(App)

// 配置错误处理
app.config.errorHandler = handleError

// 添加全局属性
app.config.globalProperties.$dayjs = dayjs

// 注册全局组件
app.component('Icon', IconComponent)

// 注册全局指令
app.directive('tooltip', tooltipDirective)

// 全局 provide
app.provide('api', api)

// 挂载
app.mount('#app')
```

所有这些配置都存储在上下文中，对整个应用生效。

## 小结

应用上下文是 Vue 应用的共享状态中心。它存储全局配置、全局组件、全局指令、全局 provide 等。

上下文通过 VNode 和组件实例在组件树中传递，让每个组件都能访问应用级别的配置。每个应用有独立的上下文，实现了多应用隔离。

缓存对象（optionsCache、propsCache、emitsCache）优化了选项解析的性能，避免重复计算。

在下一章中，我们将看看 `app.use` 是如何安装插件的。
