# 实现 createRouter

createRouter 是路由器的工厂函数，它组装了 History、Matcher、守卫等模块，创建出完整的路由器实例。

## 基础结构

```typescript
// router/index.ts
import { ref, shallowRef, computed, App, InjectionKey, Ref } from 'vue'
import type { 
  Router, 
  RouterOptions, 
  RouteLocation, 
  RouteLocationRaw,
  NavigationGuard,
  NavigationHookAfter,
  NavigationFailure,
  NavigationFailureType
} from '../types'
import { createRouterMatcher } from '../matcher'
import { RouterView } from '../components/RouterView'
import { RouterLink } from '../components/RouterLink'

// 注入键
export const routerKey: InjectionKey<Router> = Symbol('router')
export const routeKey: InjectionKey<Ref<RouteLocation>> = Symbol('route')

export function createRouter(options: RouterOptions): Router {
  const { history, routes, scrollBehavior } = options
  
  // 创建匹配器
  const matcher = createRouterMatcher(routes)
  
  // 当前路由（响应式）
  const currentRoute = shallowRef<RouteLocation>(
    matcher.resolve(history.location, START_LOCATION)
  )
  
  // 守卫列表
  const beforeGuards: NavigationGuard[] = []
  const beforeResolveGuards: NavigationGuard[] = []
  const afterHooks: NavigationHookAfter[] = []
  
  // 错误处理
  const errorHandlers: ((error: Error) => void)[] = []
  
  // 就绪状态
  let ready = false
  const readyResolvers: (() => void)[] = []
  
  // 导航状态
  let pendingLocation: RouteLocation | null = null
  
  // ... 方法实现
}

// 初始位置
const START_LOCATION: RouteLocation = {
  path: '/',
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {}
}
```

createRouter 的核心是组装各个模块：History 管理 URL，Matcher 处理匹配，currentRoute 是响应式的当前路由状态，守卫列表存储注册的拦截器。

## 导航方法

push 和 replace 是最常用的导航方法：

```typescript
function push(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return navigate(to, false)
}

function replace(to: RouteLocationRaw): Promise<NavigationFailure | void> {
  return navigate(to, true)
}

async function navigate(
  to: RouteLocationRaw, 
  replace: boolean
): Promise<NavigationFailure | void> {
  // 解析目标路由
  const targetLocation = matcher.resolve(to, currentRoute.value)
  
  // 检查是否重复导航
  if (isSameRoute(targetLocation, currentRoute.value)) {
    return createNavigationFailure(
      'duplicated' as NavigationFailureType,
      currentRoute.value,
      targetLocation
    )
  }
  
  // 记录 pending 位置
  pendingLocation = targetLocation
  
  const from = currentRoute.value
  
  try {
    // 执行守卫
    await runGuards(beforeGuards, targetLocation, from)
    
    // 检查是否被新导航覆盖
    if (pendingLocation !== targetLocation) {
      return createNavigationFailure(
        'cancelled' as NavigationFailureType,
        from,
        targetLocation
      )
    }
    
    // 执行组件内守卫（简化版跳过）
    
    // 执行 beforeResolve 守卫
    await runGuards(beforeResolveGuards, targetLocation, from)
    
    if (pendingLocation !== targetLocation) {
      return createNavigationFailure(
        'cancelled' as NavigationFailureType,
        from,
        targetLocation
      )
    }
    
    // 更新 URL
    if (replace) {
      history.replace(targetLocation.fullPath)
    } else {
      history.push(targetLocation.fullPath)
    }
    
    // 更新当前路由
    currentRoute.value = targetLocation
    
    // 执行后置钩子
    afterHooks.forEach(hook => {
      hook(targetLocation, from)
    })
    
    // 标记就绪
    if (!ready) {
      ready = true
      readyResolvers.forEach(resolve => resolve())
    }
    
    // 处理滚动
    if (scrollBehavior) {
      const scrollPosition = await scrollBehavior(
        targetLocation,
        from,
        null // savedPosition 需要更多实现
      )
      if (scrollPosition) {
        window.scrollTo(scrollPosition)
      }
    }
    
  } catch (error) {
    if (isNavigationFailure(error)) {
      return error
    }
    
    // 调用错误处理器
    errorHandlers.forEach(handler => handler(error as Error))
    throw error
  } finally {
    if (pendingLocation === targetLocation) {
      pendingLocation = null
    }
  }
}
```

navigate 函数是导航的核心实现。它按顺序执行守卫、更新 URL、更新响应式状态、执行后置钩子、处理滚动。任何一步失败都会终止后续流程。

## 守卫执行

```typescript
async function runGuards(
  guards: NavigationGuard[],
  to: RouteLocation,
  from: RouteLocation
): Promise<void> {
  for (const guard of guards) {
    const result = await runGuard(guard, to, from)
    
    if (result === false) {
      throw createNavigationFailure('aborted' as NavigationFailureType, from, to)
    }
    
    if (isRouteLocation(result)) {
      // 重定向
      throw result
    }
    
    if (result instanceof Error) {
      throw result
    }
  }
}

async function runGuard(
  guard: NavigationGuard,
  to: RouteLocation,
  from: RouteLocation
): Promise<void | boolean | RouteLocationRaw | Error> {
  return new Promise((resolve, reject) => {
    // 创建 next 函数
    const next = (arg?: any) => {
      if (arg === undefined || arg === true) {
        resolve()
      } else if (arg === false) {
        resolve(false)
      } else if (typeof arg === 'object' || typeof arg === 'string') {
        resolve(arg)
      } else if (arg instanceof Error) {
        reject(arg)
      }
    }
    
    // 调用守卫
    const result = guard(to, from, next)
    
    // 支持 Promise 返回值
    if (result instanceof Promise) {
      result.then(resolve).catch(reject)
    } else if (result !== undefined) {
      resolve(result)
    }
  })
}

function isRouteLocation(val: any): val is RouteLocationRaw {
  return typeof val === 'string' || (typeof val === 'object' && (val.path || val.name))
}
```

守卫可以通过三种方式控制导航：调用 next 函数、返回值、抛出异常。runGuard 函数统一处理这三种情况。

## History 监听

监听浏览器的前进后退：

```typescript
// 在 createRouter 内部
history.listen((to, from, info) => {
  // 解析新位置
  const targetLocation = matcher.resolve(to, currentRoute.value)
  const fromLocation = currentRoute.value
  
  // 前进后退时直接更新，不执行守卫（简化版）
  // 完整版需要执行守卫
  currentRoute.value = targetLocation
  
  // 后置钩子
  afterHooks.forEach(hook => {
    hook(targetLocation, fromLocation)
  })
})
```

## 守卫注册

```typescript
function beforeEach(guard: NavigationGuard): () => void {
  beforeGuards.push(guard)
  return () => {
    const index = beforeGuards.indexOf(guard)
    if (index > -1) beforeGuards.splice(index, 1)
  }
}

function beforeResolve(guard: NavigationGuard): () => void {
  beforeResolveGuards.push(guard)
  return () => {
    const index = beforeResolveGuards.indexOf(guard)
    if (index > -1) beforeResolveGuards.splice(index, 1)
  }
}

function afterEach(hook: NavigationHookAfter): () => void {
  afterHooks.push(hook)
  return () => {
    const index = afterHooks.indexOf(hook)
    if (index > -1) afterHooks.splice(index, 1)
  }
}

function onError(handler: (error: Error) => void): () => void {
  errorHandlers.push(handler)
  return () => {
    const index = errorHandlers.indexOf(handler)
    if (index > -1) errorHandlers.splice(index, 1)
  }
}
```

每个注册方法都返回取消函数，这是一种常见的资源管理模式。

## 路由操作方法

```typescript
function go(delta: number): void {
  history.go(delta)
}

function back(): void {
  go(-1)
}

function forward(): void {
  go(1)
}

function resolve(to: RouteLocationRaw): RouteLocation {
  return matcher.resolve(to, currentRoute.value)
}

function hasRoute(name: string): boolean {
  return !!matcher.getRecordMatcher(name)
}

function getRoutes() {
  return matcher.getRoutes()
}

function addRoute(
  parentOrRoute: string | RouteRecordRaw,
  route?: RouteRecordRaw
): () => void {
  if (typeof parentOrRoute === 'string') {
    return matcher.addRoute(route!, parentOrRoute)
  }
  return matcher.addRoute(parentOrRoute)
}

function removeRoute(name: string): void {
  matcher.removeRoute(name)
}

function isReady(): Promise<void> {
  if (ready) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    readyResolvers.push(resolve)
  })
}
```

## Vue 插件安装

```typescript
function install(app: App): void {
  // 注册全局组件
  app.component('RouterView', RouterView)
  app.component('RouterLink', RouterLink)
  
  // 提供依赖注入
  app.provide(routerKey, router)
  app.provide(routeKey, currentRoute)
  
  // 全局属性
  app.config.globalProperties.$router = router
  app.config.globalProperties.$route = currentRoute
  
  // 初始导航
  const initialLocation = matcher.resolve(
    history.location, 
    START_LOCATION
  )
  currentRoute.value = initialLocation
}
```

install 方法注册全局组件、提供依赖注入、设置全局属性。这样应用中任何地方都可以访问路由器。

## 完整实现

```typescript
// router/index.ts
import { shallowRef, App, InjectionKey, Ref } from 'vue'
import type { 
  Router, RouterOptions, RouteLocation, RouteLocationRaw,
  RouteRecordRaw, NavigationGuard, NavigationHookAfter,
  NavigationFailure, NavigationFailureType
} from '../types'
import { createRouterMatcher } from '../matcher'
import { RouterView } from '../components/RouterView'
import { RouterLink } from '../components/RouterLink'

export const routerKey: InjectionKey<Router> = Symbol('router')
export const routeKey: InjectionKey<Ref<RouteLocation>> = Symbol('route')

const START_LOCATION: RouteLocation = {
  path: '/',
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {}
}

function createNavigationFailure(
  type: NavigationFailureType,
  from: RouteLocation,
  to: RouteLocation
): NavigationFailure {
  return { type, from, to, message: `Navigation ${type}` } as NavigationFailure
}

function isNavigationFailure(val: any): val is NavigationFailure {
  return val && val.type && val.from && val.to
}

function isSameRoute(a: RouteLocation, b: RouteLocation): boolean {
  return a.path === b.path && 
    JSON.stringify(a.query) === JSON.stringify(b.query) &&
    a.hash === b.hash
}

export function createRouter(options: RouterOptions): Router {
  const { history, routes, scrollBehavior } = options
  
  const matcher = createRouterMatcher(routes)
  const currentRoute = shallowRef<RouteLocation>(
    matcher.resolve(history.location, START_LOCATION)
  )
  
  const beforeGuards: NavigationGuard[] = []
  const beforeResolveGuards: NavigationGuard[] = []
  const afterHooks: NavigationHookAfter[] = []
  const errorHandlers: ((error: Error) => void)[] = []
  
  let ready = false
  const readyResolvers: (() => void)[] = []
  let pendingLocation: RouteLocation | null = null
  
  // 监听 history 变化
  history.listen((to, from, info) => {
    const targetLocation = matcher.resolve(to, currentRoute.value)
    currentRoute.value = targetLocation
    afterHooks.forEach(hook => hook(targetLocation, currentRoute.value))
  })
  
  async function navigate(to: RouteLocationRaw, replace: boolean) {
    const targetLocation = matcher.resolve(to, currentRoute.value)
    
    if (isSameRoute(targetLocation, currentRoute.value)) {
      return createNavigationFailure('duplicated' as any, currentRoute.value, targetLocation)
    }
    
    pendingLocation = targetLocation
    const from = currentRoute.value
    
    try {
      for (const guard of beforeGuards) {
        const result = await guard(targetLocation, from, () => {})
        if (result === false) {
          throw createNavigationFailure('aborted' as any, from, targetLocation)
        }
      }
      
      if (pendingLocation !== targetLocation) {
        return createNavigationFailure('cancelled' as any, from, targetLocation)
      }
      
      for (const guard of beforeResolveGuards) {
        await guard(targetLocation, from, () => {})
      }
      
      if (replace) {
        history.replace(targetLocation.fullPath)
      } else {
        history.push(targetLocation.fullPath)
      }
      
      currentRoute.value = targetLocation
      afterHooks.forEach(hook => hook(targetLocation, from))
      
      if (!ready) {
        ready = true
        readyResolvers.forEach(r => r())
      }
      
      if (scrollBehavior) {
        const pos = await scrollBehavior(targetLocation, from, null)
        if (pos) window.scrollTo(pos)
      }
    } catch (error) {
      if (isNavigationFailure(error)) return error
      errorHandlers.forEach(h => h(error as Error))
      throw error
    } finally {
      if (pendingLocation === targetLocation) pendingLocation = null
    }
  }
  
  const router: Router = {
    currentRoute,
    options,
    
    push: (to) => navigate(to, false),
    replace: (to) => navigate(to, true),
    go: (d) => history.go(d),
    back: () => history.go(-1),
    forward: () => history.go(1),
    
    resolve: (to) => matcher.resolve(to, currentRoute.value),
    hasRoute: (n) => !!matcher.getRecordMatcher(n),
    getRoutes: () => matcher.getRoutes(),
    addRoute: (p, r) => typeof p === 'string' ? matcher.addRoute(r!, p) : matcher.addRoute(p),
    removeRoute: (n) => matcher.removeRoute(n),
    
    beforeEach: (g) => { beforeGuards.push(g); return () => beforeGuards.splice(beforeGuards.indexOf(g), 1) },
    beforeResolve: (g) => { beforeResolveGuards.push(g); return () => beforeResolveGuards.splice(beforeResolveGuards.indexOf(g), 1) },
    afterEach: (h) => { afterHooks.push(h); return () => afterHooks.splice(afterHooks.indexOf(h), 1) },
    onError: (h) => { errorHandlers.push(h); return () => errorHandlers.splice(errorHandlers.indexOf(h), 1) },
    
    isReady: () => ready ? Promise.resolve() : new Promise(r => readyResolvers.push(r)),
    
    install(app: App) {
      app.component('RouterView', RouterView)
      app.component('RouterLink', RouterLink)
      app.provide(routerKey, router)
      app.provide(routeKey, currentRoute)
      app.config.globalProperties.$router = router
      app.config.globalProperties.$route = currentRoute
    }
  }
  
  return router
}
```

## 本章小结

createRouter 是所有模块的组装点：

1. **初始化**：创建 Matcher，设置初始路由
2. **导航**：push/replace 执行完整的导航流程
3. **守卫**：按顺序执行注册的守卫
4. **监听**：响应 History 的变化
5. **安装**：注册组件和依赖注入

这个实现虽然简化了很多细节，但核心流程与 Vue Router 源码一致。下一章我们实现 push 和 replace 的更多细节。
