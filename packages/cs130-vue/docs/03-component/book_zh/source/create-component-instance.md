# createComponentInstance 实例创建

组件实例是组件在运行时的具体存在。它保存了组件的状态、props、slots、渲染函数等所有运行时信息。`createComponentInstance` 是创建这个实例的函数。

## 组件实例的作用

每个组件在渲染时都会创建一个实例。实例是组件运行的上下文：

```javascript
// 组件定义
const MyComponent = {
  props: ['title'],
  setup(props) {
    const count = ref(0)
    return { count }
  }
}

// 使用时
<MyComponent title="Hello" />
<MyComponent title="World" />
```

两个 `<MyComponent>` 会创建两个独立的实例，各自有独立的 `count` 状态。

## 源码分析

`createComponentInstance` 在 `runtime-core/src/component.ts`：

```typescript
export function createComponentInstance(
  vnode: VNode,
  parent: ComponentInternalInstance | null,
  suspense: SuspenseBoundary | null
) {
  const type = vnode.type as ConcreteComponent
  
  // 获取应用上下文
  const appContext =
    (parent ? parent.appContext : vnode.appContext) || emptyAppContext
  
  const instance: ComponentInternalInstance = {
    uid: uid++,
    vnode,
    type,
    parent,
    appContext,
    root: null!,
    next: null,
    subTree: null!,
    effect: null!,
    update: null!,
    scope: new EffectScope(true),
    render: null,
    proxy: null,
    exposed: null,
    exposeProxy: null,
    withProxy: null,
    
    provides: parent ? parent.provides : Object.create(appContext.provides),
    accessCache: null!,
    renderCache: [],
    
    // 本地资源
    components: null,
    directives: null,
    
    // props 相关
    propsOptions: normalizePropsOptions(type, appContext),
    emitsOptions: normalizeEmitsOptions(type, appContext),
    
    // 事件相关
    emit: null!,
    emitted: null,
    
    // props 默认值
    propsDefaults: EMPTY_OBJ,
    
    // 继承的 attrs
    inheritAttrs: type.inheritAttrs,
    
    // 状态
    ctx: EMPTY_OBJ,
    data: EMPTY_OBJ,
    props: EMPTY_OBJ,
    attrs: EMPTY_OBJ,
    slots: EMPTY_OBJ,
    refs: EMPTY_OBJ,
    setupState: EMPTY_OBJ,
    setupContext: null,
    
    // suspense 相关
    suspense,
    suspenseId: suspense ? suspense.pendingId : 0,
    asyncDep: null,
    asyncResolved: false,
    
    // 生命周期标记
    isMounted: false,
    isUnmounted: false,
    isDeactivated: false,
    
    // 生命周期钩子
    bc: null,
    c: null,
    bm: null,
    m: null,
    bu: null,
    u: null,
    um: null,
    bum: null,
    da: null,
    a: null,
    rtg: null,
    rtc: null,
    ec: null,
    sp: null
  }
  
  // 初始化上下文
  instance.ctx = __DEV__ ? createDevRenderContext(instance) : { _: instance }
  
  // 设置根实例
  instance.root = parent ? parent.root : instance
  
  // 绑定 emit
  instance.emit = emit.bind(null, instance)
  
  // 应用自定义元素插件
  if (vnode.ce) {
    vnode.ce(instance)
  }
  
  return instance
}
```

## 关键属性详解

### 基础标识

```typescript
uid: uid++,           // 全局唯一 ID
vnode,                // 当前的组件 VNode
type,                 // 组件选项对象
parent,               // 父组件实例
appContext,           // 应用上下文
root: null!,          // 根组件实例（后面设置）
```

每个实例有唯一的 `uid`，可以用于调试。`parent` 形成了组件树结构。

### 渲染相关

```typescript
subTree: null!,       // 组件渲染的 VNode 树
effect: null!,        // 响应式副作用
update: null!,        // 更新函数
render: null,         // 渲染函数
proxy: null,          // 渲染上下文代理
scope: new EffectScope(true),  // 副作用作用域
```

`subTree` 是组件渲染后的 VNode 结构。`effect` 和 `update` 在 `setupRenderEffect` 中设置。`scope` 管理组件的所有响应式副作用。

### 状态

```typescript
ctx: EMPTY_OBJ,       // 上下文对象
data: EMPTY_OBJ,      // data() 返回值
props: EMPTY_OBJ,     // 解析后的 props
attrs: EMPTY_OBJ,     // 非 prop 的属性
slots: EMPTY_OBJ,     // 插槽内容
refs: EMPTY_OBJ,      // 模板 refs
setupState: EMPTY_OBJ,// setup 返回的状态
```

这些都初始化为 `EMPTY_OBJ`，在 `setupComponent` 中会被实际值替换。

### 生命周期钩子

```typescript
bc: null,   // beforeCreate
c: null,    // created
bm: null,   // beforeMount
m: null,    // mounted
bu: null,   // beforeUpdate
u: null,    // updated
um: null,   // unmounted
bum: null,  // beforeUnmount
da: null,   // deactivated
a: null,    // activated
rtg: null,  // renderTriggered
rtc: null,  // renderTracked
ec: null,   // errorCaptured
sp: null,   // serverPrefetch
```

每个钩子是数组（允许多个处理器）或 null。

### provides 链

```typescript
provides: parent ? parent.provides : Object.create(appContext.provides),
```

这行代码实现了 provide/inject 的链式查找。子组件的 `provides` 继承自父组件，形成原型链：

```
appContext.provides
       ↑ (原型)
parent.provides
       ↑ (原型)
instance.provides
```

`inject` 查找时，会沿着原型链向上查找。

## EMPTY_OBJ

初始状态使用 `EMPTY_OBJ`：

```typescript
export const EMPTY_OBJ: { readonly [key: string]: any } = __DEV__
  ? Object.freeze({})
  : {}
```

开发环境下冻结对象，防止意外修改。生产环境是普通空对象。

使用 `EMPTY_OBJ` 而不是 `{}`：
- 避免每次都创建新对象
- 方便用 `=== EMPTY_OBJ` 检查是否已初始化

## EffectScope

每个组件实例有自己的副作用作用域：

```typescript
scope: new EffectScope(true)
```

`true` 参数表示这是一个分离的作用域。组件卸载时，调用 `scope.stop()` 会停止所有相关的响应式副作用。

```javascript
// 组件内的 watch、computed 等都在这个作用域内
const stop = watchEffect(() => { ... })

// 组件卸载时自动清理
onUnmounted(() => {
  // 不需要手动 stop()，scope.stop() 会处理
})
```

## emit 的绑定

```typescript
instance.emit = emit.bind(null, instance)
```

预绑定了 `instance`，调用时只需传事件名和参数：

```javascript
// 内部实现
emit('update', value)

// 等价于
emit(instance, 'update', value)
```

## DevRenderContext

开发环境的上下文有额外的检查：

```typescript
function createDevRenderContext(instance: ComponentInternalInstance) {
  const target: Record<string, any> = {}
  
  Object.defineProperty(target, '_', {
    configurable: true,
    enumerable: false,
    get: () => instance
  })
  
  // 添加警告的 getter
  Object.keys(publicPropertiesMap).forEach(key => {
    Object.defineProperty(target, key, {
      configurable: true,
      enumerable: false,
      get: () => publicPropertiesMap[key](instance),
      set: NOOP
    })
  })
  
  return target
}
```

开发环境能提供更好的警告和调试信息。

## 实例的生命周期

实例创建后的状态变化：

```
创建 (createComponentInstance)
  │
  ├── isMounted: false
  ├── isUnmounted: false
  │
设置 (setupComponent)
  │
  ├── props, attrs 被填充
  ├── slots 被填充
  ├── setupState 被填充
  ├── render 被设置
  │
挂载 (setupRenderEffect)
  │
  ├── effect, update 被创建
  ├── subTree 被生成
  ├── isMounted: true
  │
更新 (触发 update)
  │
  ├── subTree 被更新
  │
卸载 (unmountComponent)
  │
  ├── isUnmounted: true
  ├── scope.stop() 被调用
```

## 父子关系

父子关系在创建时建立：

```typescript
instance.parent = parent
instance.root = parent ? parent.root : instance
```

根组件的 `root` 指向自己。所有子组件的 `root` 指向根组件。

这个关系用于：
- 错误冒泡
- 全局状态访问
- provide/inject 链

## 类型定义

```typescript
export interface ComponentInternalInstance {
  uid: number
  type: ConcreteComponent
  parent: ComponentInternalInstance | null
  root: ComponentInternalInstance
  appContext: AppContext
  
  vnode: VNode
  next: VNode | null
  subTree: VNode
  
  effect: ReactiveEffect
  update: SchedulerJob
  render: InternalRenderFunction | null
  
  proxy: ComponentPublicInstance | null
  exposed: Record<string, any> | null
  
  provides: Data
  
  // ... 更多属性
}
```

完整的类型定义在 `runtime-core/src/component.ts`。

## 小结

`createComponentInstance` 创建组件实例，初始化所有必要的属性。实例是组件运行的核心数据结构，保存状态、管理生命周期、建立父子关系。

关键属性包括：
- 标识：`uid`、`type`、`parent`、`root`
- 渲染：`subTree`、`effect`、`update`、`render`
- 状态：`props`、`setupState`、`data`、`slots`
- 生命周期：`isMounted`、`isUnmounted` 和各种钩子

`provides` 的原型链实现了 provide/inject 的继承。`scope` 管理组件的所有响应式副作用。

在下一章中，我们将详细分析组件实例的各个属性及其用途。
