# createRouter 入口分析

`createRouter` 是 Vue Router 的入口函数，所有路由器实例都从这里创建。理解这个函数的结构，就掌握了 Vue Router 的整体脉络。

## 函数签名

```typescript
function createRouter(options: RouterOptions): Router
```

接收配置对象，返回路由器实例。这个实例会被传给 `app.use()` 注册为 Vue 插件。

## 核心结构

`createRouter` 的实现可以分为几个阶段：初始化、定义方法、返回实例。让我们逐步拆解。

首先是状态初始化。路由器需要维护几个核心状态：

```typescript
// 创建匹配器，用于路由匹配
const matcher = createRouterMatcher(options.routes, options)

// 解析 history 模式相关配置
const parseQuery = options.parseQuery || originalParseQuery
const stringifyQuery = options.stringifyQuery || originalStringifyQuery
const routerHistory = options.history

// 当前路由状态，使用 shallowRef 实现响应式
const currentRoute = shallowRef<RouteLocationNormalizedLoaded>(START_LOCATION_NORMALIZED)

// 待执行的导航
let pendingLocation: RouteLocation = START_LOCATION

// 注册的导航守卫
const beforeGuards = useCallbacks<NavigationGuardWithThis<undefined>>()
const beforeResolveGuards = useCallbacks<NavigationGuardWithThis<undefined>>()
const afterGuards = useCallbacks<NavigationHookAfter>()
```

`currentRoute` 是整个系统的核心状态。使用 `shallowRef` 而不是 `ref`，因为路由对象可能包含复杂的嵌套结构，浅响应式足够触发更新，又避免了深度代理的性能开销。

`pendingLocation` 追踪正在进行的导航。当新的导航开始时，如果之前的导航还未完成，可以用它来判断是否应该取消旧导航。

## 守卫注册

`useCallbacks` 是一个简单的工具，返回一个可以添加和移除回调的对象：

```typescript
function useCallbacks<T>() {
  let handlers: T[] = []
  
  function add(handler: T): () => void {
    handlers.push(handler)
    return () => {
      const i = handlers.indexOf(handler)
      if (i > -1) handlers.splice(i, 1)
    }
  }
  
  function list(): T[] {
    return handlers
  }
  
  return { add, list }
}
```

`beforeGuards.add()` 返回一个移除函数，所以 `router.beforeEach()` 的返回值可以用来取消守卫注册：

```typescript
const remove = router.beforeEach((to, from) => { /* ... */ })
// 后续可以调用 remove() 取消这个守卫
```

## 核心方法定义

接下来是路由器方法的定义。这些方法形成了路由器的公共 API：

```typescript
function addRoute(
  parentOrRoute: RouteRecordName | RouteRecordRaw,
  route?: RouteRecordRaw
) {
  // 委托给 matcher
  let parent: Parameters<typeof matcher.addRoute>[1] | undefined
  let record: RouteRecordRaw
  
  if (isRouteName(parentOrRoute)) {
    parent = matcher.getRecordMatcher(parentOrRoute)
    record = route!
  } else {
    record = parentOrRoute
  }
  
  return matcher.addRoute(record, parent)
}

function removeRoute(name: RouteRecordName) {
  // 委托给 matcher
  const recordMatcher = matcher.getRecordMatcher(name)
  if (recordMatcher) {
    matcher.removeRoute(recordMatcher)
  }
}

function getRoutes() {
  return matcher.getRoutes().map(routeMatcher => routeMatcher.record)
}

function hasRoute(name: RouteRecordName): boolean {
  return !!matcher.getRecordMatcher(name)
}
```

这些方法都是对 matcher 的包装。createRouter 作为门面（Facade），将 matcher 的能力暴露出去。

## resolve 方法

`resolve` 将位置描述转换为完整的路由对象：

```typescript
function resolve(
  rawLocation: RouteLocationRaw,
  currentLocation?: RouteLocationNormalizedLoaded
): RouteLocation & { href: string } {
  // 使用当前路由作为基准
  currentLocation = currentLocation || currentRoute.value
  
  // 解析位置描述
  const matchedRoute = matcher.resolve(rawLocation, currentLocation)
  
  // 构建完整的 href
  const href = routerHistory.createHref(matchedRoute.fullPath)
  
  return {
    ...matchedRoute,
    href
  }
}
```

这个方法在多个场景使用：`RouterLink` 需要它来生成 `href` 属性，编程式导航需要它来解析目标路由。

## push 和 replace

这两个是最常用的导航方法：

```typescript
function push(to: RouteLocationRaw) {
  return pushWithRedirect(to)
}

function replace(to: RouteLocationRaw) {
  return push({ ...resolveLocation(to), replace: true })
}
```

`replace` 本质上是 `push` 加一个标志。两者最终都调用 `pushWithRedirect`，这是导航的核心入口。

`pushWithRedirect` 的实现相当复杂，因为它需要处理：

1. 解析目标位置
2. 检查是否有重定向
3. 执行导航守卫
4. 处理异步组件
5. 更新 URL 和状态
6. 处理滚动行为

我们会在后续章节详细分析这个函数。

## 安装为 Vue 插件

`createRouter` 返回的对象包含 `install` 方法，让它可以作为 Vue 插件使用：

```typescript
const router: Router = {
  // ... 其他属性和方法
  
  install(app: App) {
    const router = this
    
    // 注册全局组件
    app.component('RouterLink', RouterLink)
    app.component('RouterView', RouterView)
    
    // 设置全局属性（Options API 使用）
    app.config.globalProperties.$router = router
    Object.defineProperty(app.config.globalProperties, '$route', {
      enumerable: true,
      get: () => unref(currentRoute)
    })
    
    // Composition API 使用的 provide
    app.provide(routerKey, router)
    app.provide(routeLocationKey, reactive(currentRoute))
    app.provide(routerViewLocationKey, currentRoute)
    
    // 启动初始导航
    if (!started && currentRoute.value === START_LOCATION_NORMALIZED) {
      started = true
      push(routerHistory.location).catch(err => {
        // 忽略初始导航的错误
      })
    }
  }
}
```

安装过程做了几件重要的事：

**注册全局组件**：`RouterLink` 和 `RouterView` 被注册为全局组件，模板中可以直接使用。

**设置全局属性**：为 Options API 提供 `this.$router` 和 `this.$route`。注意 `$route` 使用 getter，每次访问都获取最新值。

**provide 注入**：为 Composition API 提供依赖注入。`useRouter()` 和 `useRoute()` 内部使用 `inject` 获取这些值。

**启动初始导航**：如果这是第一次安装（`started` 为 false），并且当前还是初始位置，就根据浏览器 URL 执行一次导航。这确保了应用启动时渲染正确的页面。

## 返回的 Router 对象

最终返回的 router 对象包含这些成员：

```typescript
const router: Router = {
  // 状态
  currentRoute,
  options,
  
  // 导航方法
  push,
  replace,
  go: (delta) => routerHistory.go(delta),
  back: () => go(-1),
  forward: () => go(1),
  
  // 守卫注册
  beforeEach: beforeGuards.add,
  beforeResolve: beforeResolveGuards.add,
  afterEach: afterGuards.add,
  onError: errorHandlers.add,
  
  // 路由管理
  addRoute,
  removeRoute,
  hasRoute,
  getRoutes,
  resolve,
  
  // 内部方法
  install,
  isReady,
  
  // 提供给 RouterLink 使用
  ...
}
```

这是一个相当扁平的 API 设计——所有方法都挂在 router 对象上，没有深层嵌套。这让使用变得简单，但也意味着 router 对象承担了较多职责。

## 生命周期

理解 router 的生命周期有助于调试：

1. **创建**：调用 `createRouter()`，初始化 matcher 和状态
2. **安装**：调用 `app.use(router)`，注册组件和 provide
3. **初始导航**：安装时触发一次导航，渲染初始页面
4. **运行**：响应用户导航，执行守卫，更新状态
5. **销毁**：通常不会显式销毁，随应用一起结束

如果需要在 SSR 等场景控制导航时机，可以手动调用 `router.push()`，而不是依赖安装时的自动导航。

## 本章小结

`createRouter` 是 Vue Router 的入口，它：

1. 创建 matcher 处理路由匹配
2. 初始化响应式的 currentRoute
3. 定义导航方法（push、replace、go）
4. 提供守卫注册能力
5. 实现 Vue 插件接口

返回的 router 对象是一个门面，将内部模块的能力统一暴露。`install` 方法将路由器与 Vue 应用集成，注册组件、设置全局属性、启动初始导航。

后续章节会深入各个组成部分的具体实现。现在你应该对 createRouter 的整体结构有了清晰的认识。
