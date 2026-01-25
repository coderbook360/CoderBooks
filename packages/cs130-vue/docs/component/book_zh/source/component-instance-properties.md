# 组件实例属性详解

组件实例包含了组件运行时的所有信息。理解每个属性的作用和用途，有助于在调试和开发中更好地把握组件的状态。本章详细解析组件实例的核心属性。

## 标识与结构

### uid

```typescript
uid: number
```

全局唯一标识符，每个组件实例都有不同的值。主要用于调试和内部标识。

### type

```typescript
type: ConcreteComponent
```

组件的选项对象或函数（对于函数式组件）。就是你传给 `defineComponent` 或直接导出的组件配置：

```javascript
const instance = getCurrentInstance()
console.log(instance.type.name)   // 组件名
console.log(instance.type.props)  // props 定义
```

### parent 与 root

```typescript
parent: ComponentInternalInstance | null
root: ComponentInternalInstance
```

`parent` 是父组件实例，根组件的 `parent` 是 null。`root` 是根组件实例，通过它可以访问应用的任何全局状态：

```javascript
const instance = getCurrentInstance()
instance.root.appContext  // 应用上下文
```

## VNode 相关

### vnode

```typescript
vnode: VNode
```

当前组件对应的 VNode。包含 props、key、ref 等信息：

```javascript
const instance = getCurrentInstance()
console.log(instance.vnode.props)  // 传入的属性
console.log(instance.vnode.key)    // key 值
```

### next

```typescript
next: VNode | null
```

待更新的 VNode。当父组件传入新的 props 时，新的 VNode 会存储在 `next` 中，在更新时使用：

```javascript
// 更新流程中
if (instance.next) {
  // 有待处理的更新
  updateComponentPreRender(instance, instance.next)
}
```

### subTree

```typescript
subTree: VNode
```

组件渲染的结果。`render` 函数返回的 VNode 树：

```javascript
// 组件
const MyComponent = {
  render() {
    return h('div', [
      h('span', 'Hello'),
      h('span', 'World')
    ])
  }
}

// subTree 就是 render 返回的 VNode
```

## 渲染与响应式

### render

```typescript
render: InternalRenderFunction | null
```

组件的渲染函数。可以来自：
- 组件选项的 `render` 函数
- 模板编译的结果
- `setup` 返回的函数

### effect

```typescript
effect: ReactiveEffect
```

组件渲染的响应式副作用。当依赖的响应式数据变化时，它会被重新执行：

```javascript
// 简化的理解
instance.effect = new ReactiveEffect(() => {
  const subTree = instance.render.call(instance.proxy)
  patch(instance.subTree, subTree, container)
  instance.subTree = subTree
})
```

### update

```typescript
update: SchedulerJob
```

组件的更新函数。调用它会触发组件重新渲染：

```javascript
// 强制更新
instance.update()
```

这就是 `$forceUpdate` 的底层实现。

### scope

```typescript
scope: EffectScope
```

组件的副作用作用域。组件内的所有响应式副作用（watch、computed、effect）都在这个作用域内：

```javascript
// 组件内
watchEffect(() => { ... })  // 注册到 instance.scope
const doubled = computed(() => count.value * 2)  // 注册到 instance.scope

// 组件卸载时
instance.scope.stop()  // 自动清理所有副作用
```

## 状态属性

### props

```typescript
props: Data
```

解析后的 props 值。使用 `shallowReactive` 包装，支持响应式但不深度转换：

```javascript
const instance = getCurrentInstance()
console.log(instance.props.title)  // 访问 prop
```

### attrs

```typescript
attrs: Data
```

非 prop 的属性。传入但未在 `props` 中声明的属性会出现在这里：

```javascript
// 组件定义
props: ['title']

// 使用
<MyComponent title="Hello" class="container" id="main" />

// instance.props = { title: 'Hello' }
// instance.attrs = { class: 'container', id: 'main' }
```

### slots

```typescript
slots: InternalSlots
```

插槽内容。是一个对象，键是插槽名，值是返回 VNode 的函数：

```javascript
// 使用
<MyComponent>
  <template #header>Header</template>
  <template #default>Content</template>
</MyComponent>

// instance.slots = {
//   header: () => [VNode],
//   default: () => [VNode]
// }
```

### setupState

```typescript
setupState: Data
```

`setup` 函数返回的对象。会被 `proxyRefs` 处理，自动解包 ref：

```javascript
setup() {
  const count = ref(0)
  const name = 'Vue'
  return { count, name }
}

// instance.setupState = { count: Ref, name: 'Vue' }
// 访问时自动解包：instance.setupState.count 返回 0 而不是 Ref
```

### data

```typescript
data: Data
```

Options API 的 `data()` 返回值。使用 `reactive` 包装：

```javascript
data() {
  return { count: 0 }
}

// instance.data = reactive({ count: 0 })
```

### ctx

```typescript
ctx: Data
```

组件的上下文对象。存储内部状态和方法：

```javascript
// 开发环境下有特殊的 getter
instance.ctx._  // 返回 instance 本身
instance.ctx.$el  // 返回 DOM 元素
```

## 代理

### proxy

```typescript
proxy: ComponentPublicInstance | null
```

渲染上下文的代理。模板和 Options API 中的 `this` 就是这个代理：

```javascript
// 模板中
{{ count }}  // 等于 this.count，实际是 proxy.count

// Options API
methods: {
  increment() {
    this.count++  // this 是 proxy
  }
}
```

代理会按顺序查找 `setupState` → `data` → `props` → `ctx`。

### exposed

```typescript
exposed: Record<string, any> | null
```

通过 `expose()` 暴露的内容。父组件通过 ref 只能访问这些：

```javascript
setup(props, { expose }) {
  const publicMethod = () => { ... }
  const internalState = ref(0)
  
  expose({ publicMethod })
  
  return { internalState }
}

// 父组件
const childRef = ref()
childRef.value.publicMethod()    // 可以访问
childRef.value.internalState     // undefined，无法访问
```

### exposeProxy

```typescript
exposeProxy: Record<string, any> | null
```

`exposed` 的代理版本，用于 ref 访问时。

## 生命周期状态

### isMounted

```typescript
isMounted: boolean
```

组件是否已挂载。用于区分首次渲染和更新：

```javascript
if (!instance.isMounted) {
  // 首次挂载
  patch(null, subTree, container)
  instance.isMounted = true
} else {
  // 更新
  patch(instance.subTree, subTree, container)
}
```

### isUnmounted

```typescript
isUnmounted: boolean
```

组件是否已卸载。防止在卸载后执行操作：

```javascript
// 异步操作完成时检查
if (instance.isUnmounted) return  // 已卸载，忽略

// 执行操作
```

### isDeactivated

```typescript
isDeactivated: boolean
```

KeepAlive 组件是否处于非活跃状态。

## 生命周期钩子

每个生命周期钩子是数组（可以有多个处理器）或 null：

```typescript
bc: LifecycleHook          // beforeCreate
c: LifecycleHook           // created
bm: LifecycleHook          // beforeMount
m: LifecycleHook           // mounted
bu: LifecycleHook          // beforeUpdate
u: LifecycleHook           // updated
bum: LifecycleHook         // beforeUnmount
um: LifecycleHook          // unmounted
a: LifecycleHook           // activated (KeepAlive)
da: LifecycleHook          // deactivated (KeepAlive)
ec: LifecycleHook          // errorCaptured
rtc: LifecycleHook         // renderTracked (dev)
rtg: LifecycleHook         // renderTriggered (dev)
sp: LifecycleHook          // serverPrefetch (SSR)
```

使用数组是因为可以多次调用 `onMounted` 等：

```javascript
onMounted(() => console.log('first'))
onMounted(() => console.log('second'))

// instance.m = [fn1, fn2]
```

## Provide/Inject

### provides

```typescript
provides: Data
```

组件提供的数据。通过原型链实现继承：

```javascript
// 父组件
provide('theme', 'dark')
// parent.provides = { theme: 'dark' }

// 子组件
// child.provides = Object.create(parent.provides)
// 子组件的 provides 原型是父组件的 provides
```

## 事件

### emit

```typescript
emit: EmitFn
```

触发事件的函数：

```javascript
// 使用
emit('update', newValue)

// 等于
instance.emit('update', newValue)
```

### emitted

```typescript
emitted: Record<string, boolean> | null
```

记录已触发的事件，用于去重（某些场景）。

## Props 与 Emits 配置

### propsOptions

```typescript
propsOptions: NormalizedPropsOptions
```

规范化后的 props 配置。包含类型信息、默认值、验证函数等：

```javascript
props: {
  title: { type: String, required: true },
  count: { type: Number, default: 0 }
}

// 规范化后
// instance.propsOptions = [
//   { title: { type: String, required: true }, count: { type: Number, default: 0 } },
//   ['title', 'count']  // key 列表
// ]
```

### emitsOptions

```typescript
emitsOptions: ObjectEmitsOptions | null
```

规范化后的 emits 配置：

```javascript
emits: ['update', 'delete']
// 或
emits: {
  update: (value) => typeof value === 'string',
  delete: null
}
```

## 小结

组件实例是一个复杂的对象，包含了组件运行时的所有信息。主要分类：

- **标识**：`uid`、`type`、`parent`、`root`
- **VNode**：`vnode`、`next`、`subTree`
- **渲染**：`render`、`effect`、`update`、`scope`
- **状态**：`props`、`attrs`、`slots`、`setupState`、`data`
- **代理**：`proxy`、`exposed`
- **生命周期**：`isMounted`、`isUnmounted` 和各种钩子
- **依赖注入**：`provides`
- **事件**：`emit`、`emitsOptions`

理解这些属性有助于调试和高级使用场景。在下一章中，我们将详细分析 `initProps`——props 是如何初始化的。
