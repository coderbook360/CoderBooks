# 架构总览

在深入源码之前，让我们从整体视角审视 Vue Router 的架构。理解各个模块如何协作，能帮助我们在阅读具体实现时不迷失方向。

## 核心职责分解

Vue Router 的核心职责可以分解为几个独立但相互协作的部分：

**URL 管理**：监听和操作浏览器地址栏。这部分抽象为 History 接口，有三种实现——HTML5 History、Hash、Memory。它们向上提供统一的 API，屏蔽了底层差异。

**路由匹配**：将 URL 路径转换为路由记录。输入是路径字符串，输出是匹配的路由配置及提取的参数。这涉及路径解析、正则匹配、参数提取等操作。

**导航控制**：管理从一个路由到另一个路由的过程。这包括触发导航、执行守卫链、处理异步组件加载、确认或中止导航。

**状态暴露**：将路由状态以响应式的方式暴露给 Vue 组件。组件通过 `useRoute()` 和 `useRouter()` 访问当前路由和路由器实例。

**视图渲染**：`RouterView` 组件根据当前匹配的路由渲染对应的组件，`RouterLink` 组件提供声明式导航。

## 模块结构

从代码组织角度，Vue Router 的源码大致分为这些部分：

```
vue-router/src/
├── history/          # History 实现
│   ├── common.ts     # 公共工具
│   ├── html5.ts      # createWebHistory
│   ├── hash.ts       # createWebHashHistory
│   └── memory.ts     # createMemoryHistory
├── matcher/          # 路由匹配
│   ├── index.ts      # Matcher 主逻辑
│   └── pathMatcher.ts # 路径匹配器
├── navigationGuards.ts # 守卫执行
├── router.ts         # Router 主类
├── RouterView.ts     # RouterView 组件
├── RouterLink.ts     # RouterLink 组件
├── useApi.ts         # Composition API
└── types/            # 类型定义
```

这种分离让每个模块可以独立理解和测试。

## 数据流

一次导航的完整数据流如下：

1. **触发**：用户点击链接、调用 `router.push()`、或浏览器前进后退
2. **解析**：将目标位置解析为标准化的路由对象
3. **匹配**：使用 Matcher 找到匹配的路由记录
4. **守卫**：按顺序执行所有导航守卫
5. **确认**：如果所有守卫通过，确认导航
6. **更新**：更新 History 状态和响应式的 `currentRoute`
7. **渲染**：RouterView 响应状态变化，渲染新组件

如果任何一步失败（如守卫返回 `false`），流程中止，导航不会完成。

## History 抽象层

History 是 Vue Router 与浏览器 URL 交互的抽象层。它定义了一组接口：

```typescript
interface RouterHistory {
  readonly location: string      // 当前路径
  readonly state: HistoryState   // 当前状态
  
  push(to: string, state?: HistoryState): void
  replace(to: string, state?: HistoryState): void
  go(delta: number): void
  
  listen(callback: NavigationCallback): () => void
  destroy(): void
}
```

三种 History 实现都遵循这个接口：

`createWebHistory()` 使用 `history.pushState()` 和 `popstate` 事件
`createWebHashHistory()` 使用 `location.hash` 和 `hashchange` 事件
`createMemoryHistory()` 使用内存数组，不操作真实 URL

这种抽象让 Router 的核心逻辑与具体的 URL 操作解耦。切换 History 模式只需要替换实现，不需要修改其他代码。

## Matcher 系统

Matcher 负责路由匹配，是 Vue Router 的核心算法部分。

创建路由器时，每个路由配置被编译成一个 RouteRecordMatcher：

```typescript
interface RouteRecordMatcher {
  record: RouteRecord          // 原始配置
  re: RegExp                   // 路径正则
  keys: PathParserKey[]        // 参数键
  score: number[]              // 匹配优先级
  parent?: RouteRecordMatcher  // 父路由（嵌套时）
  children: RouteRecordMatcher[]
}
```

路径被编译成正则表达式。`/users/:id` 变成类似 `/^\/users\/([^\/]+)\/?$/` 的正则。`:id` 被提取为参数键，用于后续从 URL 提取实际值。

匹配时，Matcher 遍历所有 RouteRecordMatcher，找到第一个正则匹配成功的。如果有多个匹配，使用 score 决定优先级——更具体的路径优先于通配符。

## 导航守卫链

导航守卫的执行是一个有序的异步过程。Vue Router 内部维护一个守卫队列：

```
1. 触发离开守卫（beforeRouteLeave）
2. 全局 beforeEach
3. 路由 beforeEnter
4. 解析异步组件
5. 组件 beforeRouteEnter
6. 全局 beforeResolve
7. 确认导航
8. 全局 afterEach
9. 触发 DOM 更新
10. 调用 beforeRouteEnter 的 next 回调
```

守卫的执行使用 Promise 链或类似机制来保证顺序。每个守卫可以：

- 返回 `undefined` 或 `true`：继续下一个守卫
- 返回 `false`：中止导航
- 返回路由位置：重定向
- 抛出错误：中止并触发错误处理

这种设计让守卫可以是同步的也可以是异步的，统一用 Promise 处理。

## 响应式集成

Vue Router 需要与 Vue 的响应式系统集成，让组件能够响应路由变化。

核心是 `currentRoute`，一个响应式的路由对象：

```typescript
const currentRoute = shallowRef<RouteLocationNormalizedLoaded>(START_LOCATION)
```

使用 `shallowRef` 而不是 `ref`，因为路由对象可能很大，深度响应式会有性能问题。路由变化时整个对象被替换，触发依赖它的组件更新。

`useRoute()` 返回的是这个 ref 的 reactive 包装：

```typescript
function useRoute() {
  return reactive(currentRoute.value)
}
```

这样组件中可以直接访问属性（`route.path`），而不需要 `.value`。

## RouterView 的渲染逻辑

RouterView 是一个函数式组件，它的渲染逻辑大致是：

1. 从 inject 获取当前匹配的路由记录数组
2. 根据自己的深度（嵌套层级）选择对应的记录
3. 从记录中获取组件
4. 使用 `h()` 渲染组件，传递 route 作为 prop

嵌套的 RouterView 通过 provide/inject 传递深度信息。第一层 RouterView 渲染 `matched[0]` 的组件，第二层渲染 `matched[1]`，以此类推。

## 插件安装

Vue Router 作为 Vue 插件安装：

```typescript
app.use(router)
```

安装过程做了几件事：

1. 注册全局组件 `RouterView` 和 `RouterLink`
2. 设置全局属性 `$router` 和 `$route`
3. 使用 provide 注入路由器实例和当前路由
4. 启动初始导航

provide/inject 是组件访问路由的主要方式。`useRouter()` 和 `useRoute()` 内部使用 inject 获取这些值。

## 错误处理

Vue Router 定义了几类导航失败：

```typescript
enum NavigationFailureType {
  aborted = 1,      // 守卫中止
  cancelled = 2,    // 新导航覆盖
  duplicated = 3    // 已在目标位置
}
```

`router.push()` 返回一个 Promise，导航失败时不会 reject，而是 resolve 一个 NavigationFailure 对象。这是设计选择——大多数导航失败是正常的流程控制，不应该作为异常处理。

如果需要捕获这些情况：

```javascript
const failure = await router.push('/admin')
if (failure) {
  if (isNavigationFailure(failure, NavigationFailureType.aborted)) {
    // 被守卫中止
  }
}
```

## 与前代的演进

Vue Router 4 相比 Vue Router 3 有几个重要的架构变化：

**Composition API 优先**：`useRouter()` 和 `useRoute()` 成为主要 API，Options API 的 `this.$router` 仍然支持但不再是重点。

**更好的类型支持**：使用 TypeScript 重写，提供完整的类型定义。

**History 抽象重构**：History 实现更清晰，Memory 模式成为一等公民。

**动态路由 API 变化**：`addRoute()` 和 `removeRoute()` 取代了 `addRoutes()`，提供更细粒度的控制。

**导航守卫返回值**：不再使用 `next()` 回调，而是通过返回值控制导航。

## 本章小结

Vue Router 的架构围绕几个核心模块展开：History 管理 URL，Matcher 处理匹配，Router 协调导航，RouterView/RouterLink 处理渲染。

数据流是单向的：用户行为触发导航，导航经过解析、匹配、守卫、确认，最终更新响应式状态，驱动视图更新。

这种分层架构让每个部分可以独立理解。在后续的源码分析中，我们会深入每个模块的具体实现，但始终可以回到这个架构图来定位自己的位置。

理解架构不是为了记忆，而是为了在遇到问题时知道去哪里找答案。
