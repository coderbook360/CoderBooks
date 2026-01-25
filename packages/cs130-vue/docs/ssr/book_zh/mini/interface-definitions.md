# 接口定义与类型

类型系统是 Mini SSR 框架的基础。本章定义所有核心接口和类型，为后续实现提供类型安全保障。

## VNode 类型

```typescript
// src/shared/vnode.ts

// VNode 类型
export type VNodeType =
  | string                    // 元素标签
  | Component                 // 组件
  | typeof Text               // 文本节点
  | typeof Comment            // 注释节点
  | typeof Fragment           // Fragment

// 特殊类型标识
export const Text = Symbol('Text')
export const Comment = Symbol('Comment')
export const Fragment = Symbol('Fragment')

// VNode 子节点类型
export type VNodeChildren =
  | string
  | number
  | boolean
  | null
  | undefined
  | VNode
  | VNode[]
  | VNodeChildren[]

// VNode 接口
export interface VNode {
  type: VNodeType
  props: VNodeProps | null
  children: VNodeChildren
  shapeFlag: number
  
  // 运行时属性
  el?: Node | null
  component?: ComponentInstance | null
  key?: string | number
  ref?: Ref<any> | ((el: any) => void)
  
  // 优化标记
  patchFlag?: number
  dynamicProps?: string[]
  dynamicChildren?: VNode[]
  
  // 父节点引用
  parent?: VNode | null
}

// VNode Props
export type VNodeProps = Record<string, any> & {
  key?: string | number
  ref?: Ref<any> | ((el: any) => void)
}
```

## ShapeFlags

```typescript
// 节点类型标志位
export const enum ShapeFlags {
  ELEMENT = 1,                       // 1 << 0
  FUNCTIONAL_COMPONENT = 1 << 1,     // 2
  STATEFUL_COMPONENT = 1 << 2,       // 4
  TEXT_CHILDREN = 1 << 3,            // 8
  ARRAY_CHILDREN = 1 << 4,           // 16
  SLOTS_CHILDREN = 1 << 5,           // 32
  TELEPORT = 1 << 6,                 // 64
  SUSPENSE = 1 << 7,                 // 128
  COMPONENT_SHOULD_KEEP_ALIVE = 1 << 8,
  COMPONENT_KEPT_ALIVE = 1 << 9,
  
  // 组合标志
  COMPONENT = ShapeFlags.STATEFUL_COMPONENT | ShapeFlags.FUNCTIONAL_COMPONENT
}
```

## 组件类型

```typescript
// src/shared/component.ts

// 组件定义
export interface Component {
  name?: string
  props?: PropsDefinition
  emits?: EmitsDefinition
  setup?: SetupFunction
  render?: RenderFunction
  
  // 生命周期（简化版）
  beforeCreate?: () => void
  created?: () => void
  beforeMount?: () => void
  mounted?: () => void
  beforeUpdate?: () => void
  updated?: () => void
  beforeUnmount?: () => void
  unmounted?: () => void
  
  // SSR 相关
  serverPrefetch?: () => Promise<any>
  
  // 配置
  inheritAttrs?: boolean
}

// 函数组件
export type FunctionalComponent<P = {}> = (
  props: P,
  context: FunctionalComponentContext
) => VNode | null

export interface FunctionalComponentContext {
  slots: Slots
  attrs: Record<string, any>
  emit: EmitFn
}

// Props 定义
export type PropsDefinition = Record<string, PropOptions>

export interface PropOptions<T = any> {
  type?: PropType<T> | PropType<T>[]
  required?: boolean
  default?: T | (() => T)
  validator?: (value: T) => boolean
}

export type PropType<T> = new (...args: any[]) => T

// Emits 定义
export type EmitsDefinition = string[] | Record<string, EmitValidator>
export type EmitValidator = (...args: any[]) => boolean
export type EmitFn = (event: string, ...args: any[]) => void

// Setup 函数
export type SetupFunction = (
  props: Record<string, any>,
  context: SetupContext
) => Record<string, any> | RenderFunction | void

export interface SetupContext {
  attrs: Record<string, any>
  slots: Slots
  emit: EmitFn
  expose: (exposed: Record<string, any>) => void
}

// Render 函数
export type RenderFunction = () => VNode | null

// Slots
export type Slots = Record<string, SlotFunction | undefined>
export type SlotFunction = (props?: Record<string, any>) => VNode[]
```

## 组件实例

```typescript
// 组件实例
export interface ComponentInstance {
  uid: number
  type: Component
  vnode: VNode
  parent: ComponentInstance | null
  
  // 状态
  props: Record<string, any>
  attrs: Record<string, any>
  slots: Slots
  setupState: Record<string, any> | null
  data: Record<string, any>
  
  // 渲染
  render: RenderFunction | null
  subTree: VNode | null
  
  // 生命周期
  isMounted: boolean
  isUnmounted: boolean
  
  // 更新
  update: (() => void) | null
  
  // 暴露
  exposed: Record<string, any> | null
  
  // Refs
  refs: Record<string, any>
  
  // 上下文
  ctx: Record<string, any>
  
  // SSR
  asyncDep: Promise<any> | null
  asyncResolved: boolean
}
```

## SSR 上下文

```typescript
// src/server/context.ts

// SSR 渲染上下文
export interface SSRContext {
  // 模块
  modules?: Set<string>
  
  // Teleport
  teleports?: Record<string, string>
  
  // 状态
  state: SSRState
  
  // Head 管理
  head: string[]
  
  // 错误
  errors: Error[]
}

// SSR 状态
export interface SSRState {
  data: Record<string, any>
  components: Map<string, Record<string, any>>
  store: Record<string, any>
}

// 创建 SSR 上下文
export function createSSRContext(): SSRContext {
  return {
    modules: new Set(),
    teleports: {},
    state: {
      data: {},
      components: new Map(),
      store: {}
    },
    head: [],
    errors: []
  }
}
```

## Hydration 类型

```typescript
// src/runtime/hydrate.ts

// Hydration 配置
export interface HydrationConfig {
  // 是否严格模式
  strict?: boolean
  // 错误处理
  onMismatch?: (info: MismatchInfo) => void
  onError?: (error: Error) => void
}

// 不匹配信息
export interface MismatchInfo {
  type: MismatchType
  expected: any
  actual: any
  node: Node
  vnode: VNode
}

export type MismatchType =
  | 'tag'
  | 'text'
  | 'children-count'
  | 'attribute'
  | 'class'
  | 'style'

// Hydration 结果
export interface HydrationResult {
  success: boolean
  mismatches: MismatchInfo[]
  hydratedNodes: number
}
```

## 渲染器类型

```typescript
// src/shared/renderer.ts

// 渲染器选项
export interface RendererOptions {
  // 创建元素
  createElement: (tag: string) => Element
  // 创建文本
  createText: (text: string) => Text
  // 创建注释
  createComment: (text: string) => Comment
  // 设置文本
  setText: (node: Text, text: string) => void
  // 设置元素文本
  setElementText: (el: Element, text: string) => void
  // 插入
  insert: (child: Node, parent: Element, anchor?: Node | null) => void
  // 移除
  remove: (child: Node) => void
  // 父节点
  parentNode: (node: Node) => Element | null
  // 下一个兄弟
  nextSibling: (node: Node) => Node | null
  // 设置属性
  patchProp: (
    el: Element,
    key: string,
    prevValue: any,
    nextValue: any
  ) => void
}

// 服务端渲染器
export interface SSRRenderer {
  renderToString: (vnode: VNode, context?: SSRContext) => Promise<string>
  renderToStream: (vnode: VNode, context?: SSRContext) => ReadableStream<string>
}

// 客户端渲染器
export interface ClientRenderer {
  render: (vnode: VNode, container: Element) => void
  hydrate: (vnode: VNode, container: Element) => void
}
```

## 工具类型

```typescript
// src/shared/types.ts

// Ref 类型
export interface Ref<T = any> {
  value: T
}

// 响应式对象
export type Reactive<T> = T

// 计算属性
export interface ComputedRef<T = any> extends Ref<T> {
  readonly value: T
}

// Watch 选项
export interface WatchOptions {
  immediate?: boolean
  deep?: boolean
  flush?: 'pre' | 'post' | 'sync'
}

// 生命周期钩子
export type LifecycleHook = (() => void) | (() => void)[]

// 插件
export interface Plugin {
  install: (app: App, ...options: any[]) => void
}

// 应用实例
export interface App {
  mount: (container: string | Element) => void
  unmount: () => void
  use: (plugin: Plugin, ...options: any[]) => App
  component: (name: string, component?: Component) => Component | App
  provide: <T>(key: string | symbol, value: T) => App
  config: AppConfig
}

export interface AppConfig {
  errorHandler?: (err: Error, instance: ComponentInstance | null, info: string) => void
  warnHandler?: (msg: string, instance: ComponentInstance | null, trace: string) => void
  performance?: boolean
}
```

## 常量定义

```typescript
// src/shared/constants.ts

// 空对象（共享引用）
export const EMPTY_OBJ: Record<string, any> = Object.freeze({})

// 空数组
export const EMPTY_ARR: any[] = Object.freeze([]) as any

// NOOP 函数
export const NOOP = () => {}

// 永远为 false
export const NO = () => false

// 保留属性
export const isReservedProp = (key: string) =>
  key === 'key' ||
  key === 'ref' ||
  key.startsWith('on') ||
  key.startsWith('v-')

// 事件前缀
export const isOn = (key: string) =>
  key.charCodeAt(0) === 111 && // 'o'
  key.charCodeAt(1) === 110 && // 'n'
  key.charCodeAt(2) > 96       // lowercase letter

// 自闭合标签
export const VOID_TAGS = new Set([
  'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input',
  'link', 'meta', 'param', 'source', 'track', 'wbr'
])

// 布尔属性
export const BOOLEAN_ATTRS = new Set([
  'async', 'autofocus', 'autoplay', 'checked', 'controls',
  'default', 'defer', 'disabled', 'hidden', 'loop', 'multiple',
  'muted', 'open', 'readonly', 'required', 'reversed', 'selected'
])
```

## 导出

```typescript
// src/shared/index.ts

export * from './vnode'
export * from './component'
export * from './types'
export * from './constants'
```

## 小结

本章定义了 Mini SSR 框架的完整类型系统：

1. **VNode 类型**：描述虚拟节点结构
2. **ShapeFlags**：节点类型位标志
3. **组件类型**：组件定义和实例
4. **SSR 上下文**：服务端渲染上下文
5. **Hydration 类型**：客户端激活相关
6. **渲染器类型**：统一渲染接口
7. **工具类型**：通用辅助类型

有了这些类型定义，接下来就可以开始实现具体功能了。
