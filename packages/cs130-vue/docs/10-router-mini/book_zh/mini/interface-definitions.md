# 接口定义与类型

在动手实现之前，我们需要先定义清晰的类型接口。良好的类型设计是 TypeScript 项目的基础，它不仅提供编译时检查，更是一份活的设计文档。

## 核心类型定义

### 路由记录

RouteRecord 是路由配置的规范化形式。用户传入的配置会被处理成统一的内部格式：

```typescript
// types/index.ts

// 用户配置的路由记录
export interface RouteRecordRaw {
  path: string
  name?: string
  component?: Component
  components?: Record<string, Component>
  redirect?: string | RouteLocationRaw
  children?: RouteRecordRaw[]
  meta?: Record<string, unknown>
  beforeEnter?: NavigationGuard | NavigationGuard[]
  props?: boolean | Record<string, unknown> | ((route: RouteLocation) => Record<string, unknown>)
}

// 规范化后的路由记录
export interface RouteRecord {
  path: string
  name?: string
  components: Record<string, Component>
  redirect?: string | RouteLocationRaw
  children: RouteRecord[]
  meta: Record<string, unknown>
  beforeEnter: NavigationGuard[]
  props: Record<string, boolean | Record<string, unknown> | ((route: RouteLocation) => Record<string, unknown>)>
  // 内部使用
  parent?: RouteRecord
  regex: RegExp
  keys: PathKey[]
}

export interface PathKey {
  name: string
  prefix: string
  suffix: string
  pattern: string
  modifier: string
}
```

RouteRecordRaw 和 RouteRecord 的区别在于：前者是用户友好的配置格式，允许省略某些字段或使用简写；后者是内部处理后的规范格式，所有字段都有明确的值。这种分离让 API 更灵活，同时保证内部逻辑的一致性。

### 路由位置

RouteLocation 表示一个具体的路由状态，包含了当前路由的所有信息：

```typescript
// 路由位置（完整信息）
export interface RouteLocation {
  path: string
  name?: string
  params: Record<string, string>
  query: Record<string, string | string[]>
  hash: string
  fullPath: string
  matched: RouteRecord[]
  meta: Record<string, unknown>
  redirectedFrom?: RouteLocation
}

// 导航目标（用户传入）
export type RouteLocationRaw = 
  | string 
  | {
      path?: string
      name?: string
      params?: Record<string, string>
      query?: Record<string, string | string[]>
      hash?: string
      replace?: boolean
    }
```

RouteLocationRaw 是导航时用户传入的目标，可以是简单的字符串路径，也可以是包含各种参数的对象。RouteLocation 则是解析后的完整路由状态。

### 路由器接口

Router 是路由器的核心接口，定义了所有公开的方法和属性：

```typescript
export interface Router {
  // 只读属性
  readonly currentRoute: Ref<RouteLocation>
  readonly options: RouterOptions
  
  // 导航方法
  push(to: RouteLocationRaw): Promise<NavigationFailure | void>
  replace(to: RouteLocationRaw): Promise<NavigationFailure | void>
  go(delta: number): void
  back(): void
  forward(): void
  
  // 路由操作
  resolve(to: RouteLocationRaw): RouteLocation
  hasRoute(name: string): boolean
  getRoutes(): RouteRecord[]
  addRoute(route: RouteRecordRaw): () => void
  addRoute(parentName: string, route: RouteRecordRaw): () => void
  removeRoute(name: string): void
  
  // 守卫
  beforeEach(guard: NavigationGuard): () => void
  beforeResolve(guard: NavigationGuard): () => void
  afterEach(hook: NavigationHookAfter): () => void
  onError(handler: ErrorHandler): () => void
  
  // 安装
  install(app: App): void
  
  // 状态
  isReady(): Promise<void>
}

export interface RouterOptions {
  history: RouterHistory
  routes: RouteRecordRaw[]
  scrollBehavior?: ScrollBehavior
  parseQuery?: (query: string) => Record<string, string | string[]>
  stringifyQuery?: (query: Record<string, string | string[]>) => string
  linkActiveClass?: string
  linkExactActiveClass?: string
}
```

接口设计遵循了几个原则：currentRoute 是只读的响应式引用，确保状态不会被意外修改；导航方法返回 Promise，支持异步操作；守卫注册方法返回取消函数，便于清理。

### History 接口

RouterHistory 抽象了不同的历史记录模式：

```typescript
export interface RouterHistory {
  readonly location: string
  readonly state: HistoryState
  
  push(to: string, state?: HistoryState): void
  replace(to: string, state?: HistoryState): void
  go(delta: number): void
  
  listen(callback: (to: string, from: string, info: NavigationInfo) => void): () => void
  destroy(): void
}

export interface HistoryState {
  back: string | null
  current: string
  forward: string | null
  position: number
  replaced: boolean
  scroll?: { left: number; top: number }
}

export interface NavigationInfo {
  delta: number
  type: 'pop' | 'push' | 'replace'
  direction: 'back' | 'forward' | ''
}
```

这个接口的核心思想是把浏览器历史操作抽象成统一的接口。无论底层是 HTML5 History API、hash 变化还是内存数组，对上层来说都是一样的 push/replace/go 操作。

### 导航守卫

导航守卫是路由系统的重要扩展点：

```typescript
export interface NavigationGuard {
  (
    to: RouteLocation,
    from: RouteLocation,
    next: NavigationGuardNext
  ): void | Promise<void | boolean | RouteLocationRaw | NavigationGuardReturn>
}

export type NavigationGuardNext = (
  to?: boolean | RouteLocationRaw | ((vm: ComponentPublicInstance) => void)
) => void

export type NavigationGuardReturn = 
  | void 
  | boolean 
  | RouteLocationRaw 
  | Error

export interface NavigationHookAfter {
  (
    to: RouteLocation,
    from: RouteLocation,
    failure?: NavigationFailure
  ): void
}

export type ErrorHandler = (error: Error, to: RouteLocation, from: RouteLocation) => void
```

守卫函数可以返回多种类型的值：undefined/true 表示继续导航；false 表示取消；RouteLocationRaw 表示重定向；Error 表示导航失败。next 函数是为了兼容性保留的，新的 API 推荐直接返回值。

### 导航失败

NavigationFailure 描述了导航失败的原因：

```typescript
export enum NavigationFailureType {
  aborted = 'aborted',
  cancelled = 'cancelled',
  duplicated = 'duplicated'
}

export interface NavigationFailure extends Error {
  type: NavigationFailureType
  from: RouteLocation
  to: RouteLocation
}

export function createNavigationFailure(
  type: NavigationFailureType,
  from: RouteLocation,
  to: RouteLocation
): NavigationFailure {
  const error = new Error() as NavigationFailure
  error.type = type
  error.from = from
  error.to = to
  
  switch (type) {
    case NavigationFailureType.aborted:
      error.message = `Navigation aborted from "${from.fullPath}" to "${to.fullPath}"`
      break
    case NavigationFailureType.cancelled:
      error.message = `Navigation cancelled from "${from.fullPath}" to "${to.fullPath}"`
      break
    case NavigationFailureType.duplicated:
      error.message = `Avoided redundant navigation to current location: "${to.fullPath}"`
      break
  }
  
  return error
}
```

区分不同类型的失败很重要：aborted 是被守卫主动阻止；cancelled 是被新的导航覆盖；duplicated 是重复导航到当前位置。这些信息帮助开发者理解导航没有完成的原因。

### 匹配器接口

Matcher 负责路由的匹配和管理：

```typescript
export interface RouterMatcher {
  resolve(location: RouteLocationRaw, currentLocation: RouteLocation): RouteLocation
  addRoute(record: RouteRecordRaw, parent?: RouteRecord): () => void
  removeRoute(name: string): void
  getRoutes(): RouteRecord[]
  getRecordMatcher(name: string): RouteRecord | undefined
}
```

匹配器是一个相对独立的模块，它只关心路由配置的管理和匹配逻辑，不涉及导航和守卫。这种分离让代码更容易测试和维护。

## 注入键定义

Vue 的依赖注入需要定义注入键：

```typescript
import type { InjectionKey, Ref } from 'vue'

export const routerKey: InjectionKey<Router> = Symbol('router')
export const routeKey: InjectionKey<Ref<RouteLocation>> = Symbol('route')
export const routerViewDepthKey: InjectionKey<Ref<number>> = Symbol('router-view-depth')
export const matchedRouteKey: InjectionKey<Ref<RouteRecord | undefined>> = Symbol('matched-route')
```

使用 Symbol 作为注入键可以避免命名冲突，InjectionKey 泛型提供了类型安全的注入和提取。

## 工具类型

一些辅助类型定义：

```typescript
// 组件类型
export type Component = 
  | ReturnType<typeof defineComponent>
  | (() => Promise<{ default: ReturnType<typeof defineComponent> }>)

// 滚动行为
export type ScrollBehavior = (
  to: RouteLocation,
  from: RouteLocation,
  savedPosition: { left: number; top: number } | null
) => { left?: number; top?: number; el?: string | Element; behavior?: 'smooth' | 'auto' } | void | Promise<any>

// 导出所有类型
export type {
  RouteRecordRaw,
  RouteRecord,
  RouteLocation,
  RouteLocationRaw,
  Router,
  RouterOptions,
  RouterHistory,
  HistoryState,
  NavigationGuard,
  NavigationHookAfter,
  NavigationFailure,
  RouterMatcher
}
```

## 本章小结

类型定义看起来是准备工作，实际上是设计工作。在定义接口的过程中，我们已经在思考系统的边界、模块的职责、数据的流向。这些类型会在后续实现中不断用到，好的类型设计让实现代码更清晰，也让使用者更容易理解 API。

下一章我们开始实现 History 管理模块，这是路由系统的底层基础。
