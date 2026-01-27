# RouterOptions 配置选项

创建路由器时传入的配置对象决定了路由器的行为。理解每个选项的作用和实现，能帮助我们做出正确的配置决策。

## 类型定义

```typescript
interface RouterOptions {
  history: RouterHistory
  routes: Readonly<RouteRecordRaw[]>
  
  // 可选配置
  linkActiveClass?: string
  linkExactActiveClass?: string
  parseQuery?: typeof originalParseQuery
  stringifyQuery?: typeof originalStringifyQuery
  scrollBehavior?: RouterScrollBehavior
  sensitive?: boolean
  strict?: boolean
  end?: boolean
}
```

让我们逐一分析这些选项。

## history（必需）

```typescript
history: RouterHistory
```

这是唯一和 `routes` 一样必需的选项。它决定了路由器如何与浏览器 URL 交互。

Vue Router 提供三个工厂函数来创建 history：

```typescript
import { createWebHistory, createWebHashHistory, createMemoryHistory } from 'vue-router'

// 使用 HTML5 History API
createRouter({ history: createWebHistory() })

// 使用 hash 模式
createRouter({ history: createWebHashHistory() })

// 使用内存模式（SSR 或测试）
createRouter({ history: createMemoryHistory() })
```

这些函数都接受一个可选的 `base` 参数：

```typescript
createWebHistory('/app/')  // 应用部署在 /app/ 路径下
```

在 createRouter 内部，history 被直接使用，没有额外处理：

```typescript
const routerHistory = options.history
```

导航时通过 `routerHistory.push()`、`routerHistory.replace()` 操作 URL，通过 `routerHistory.listen()` 监听 URL 变化。

## routes（必需）

```typescript
routes: Readonly<RouteRecordRaw[]>
```

路由配置数组，定义了 URL 到组件的映射。

在 createRouter 中，routes 被传给 matcher：

```typescript
const matcher = createRouterMatcher(options.routes, options)
```

matcher 会遍历 routes，为每个路由创建匹配器。Readonly 类型提示这个数组不应该被直接修改——要动态添加路由应该使用 `router.addRoute()`。

## linkActiveClass 和 linkExactActiveClass

```typescript
linkActiveClass?: string      // 默认 'router-link-active'
linkExactActiveClass?: string // 默认 'router-link-exact-active'
```

这两个选项控制 RouterLink 组件的激活状态类名。

```typescript
// 使用
<router-link to="/users" active-class="active">Users</router-link>

// 全局配置
createRouter({
  linkActiveClass: 'is-active',
  linkExactActiveClass: 'is-exact-active'
})
```

在 RouterLink 组件中的处理：

```typescript
const activeClass = computed(
  () => props.activeClass ?? options.linkActiveClass ?? 'router-link-active'
)

const exactActiveClass = computed(
  () => props.exactActiveClass ?? options.linkExactActiveClass ?? 'router-link-exact-active'
)
```

优先级是：组件 prop > 全局配置 > 默认值。

## parseQuery 和 stringifyQuery

```typescript
parseQuery?: (search: string) => LocationQuery
stringifyQuery?: (query: LocationQuery) => string
```

自定义查询字符串的解析和序列化。默认使用内置的简单实现。

```typescript
// 使用 qs 库处理嵌套查询
import qs from 'qs'

createRouter({
  parseQuery: qs.parse,
  stringifyQuery: qs.stringify
})
```

在 createRouter 中：

```typescript
const parseQuery = options.parseQuery || originalParseQuery
const stringifyQuery = options.stringifyQuery || originalStringifyQuery
```

这两个函数在多处使用：解析浏览器 URL 时、构建导航目标时、生成 href 时。

## scrollBehavior

```typescript
scrollBehavior?: RouterScrollBehavior

type RouterScrollBehavior = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalizedLoaded,
  savedPosition: ScrollPositionCoordinates | null
) => Awaitable<ScrollPosition | false | void>
```

控制导航时的滚动行为。

```typescript
createRouter({
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      return { el: to.hash }
    }
    return { top: 0 }
  }
})
```

在导航完成后调用：

```typescript
// router.ts 中的 navigate 函数内
if (scrollBehavior) {
  const scrollPosition = await scrollBehavior(toLocation, from, savedPosition)
  if (scrollPosition) {
    triggerScroll(scrollPosition)
  }
}
```

注意这是个异步函数，可以返回 Promise。这对于等待过渡动画完成后再滚动很有用。

## sensitive、strict、end

这三个选项控制路径匹配的行为：

```typescript
sensitive?: boolean  // 大小写敏感，默认 false
strict?: boolean     // 严格模式，默认 false
end?: boolean        // 是否匹配路径结尾，默认 true
```

**sensitive**：

```typescript
// sensitive: false（默认）
// /Users 和 /users 匹配相同路由

// sensitive: true
// /Users 和 /users 是不同的路径
```

**strict**：

```typescript
// strict: false（默认）
// /users 和 /users/ 匹配相同路由

// strict: true
// /users 和 /users/ 是不同的路径
```

**end**：

```typescript
// end: true（默认）
// /users 只匹配 /users

// end: false
// /users 匹配 /users、/users/1、/users/1/profile
```

这些选项传递给 matcher，影响路径正则的生成：

```typescript
// matcher/pathParserRanker.ts
const pattern = `^${regexp}${options.end ? '$' : '(?:/|$)'}`
const re = new RegExp(
  pattern,
  options.sensitive ? '' : 'i'
)
```

可以在全局配置，也可以在单个路由上覆盖：

```typescript
createRouter({
  routes: [
    { 
      path: '/users', 
      component: Users,
      sensitive: true,  // 只对这个路由生效
      strict: true
    }
  ],
  sensitive: false  // 全局默认
})
```

## 其他内部选项

除了公开的选项，createRouter 内部还处理一些状态：

```typescript
// 是否已启动初始导航
let started = false

// 待完成的导航
let pendingLocation: RouteLocation = START_LOCATION

// 是否就绪的 Promise
let readyPromise: Promise<void>
let readyResolve: () => void
```

`isReady()` 方法返回一个 Promise，在初始导航完成后 resolve：

```typescript
function isReady(): Promise<void> {
  if (started && currentRoute.value !== START_LOCATION_NORMALIZED) {
    return Promise.resolve()
  }
  return new Promise(resolve => {
    readyResolve = resolve
  })
}
```

这在 SSR 场景下很重要——需要等待路由就绪后再渲染。

## 配置验证

Vue Router 在开发模式下会验证配置：

```typescript
if (__DEV__) {
  if (!options.history) {
    throw new Error('Provide the "history" option when calling "createRouter()"')
  }
}
```

生产环境下这些检查被移除，减少包体积。

常见的配置错误包括：

1. 忘记传 history
2. routes 不是数组
3. 路由配置中的 component 写成了字符串

## 配置的响应式

注意配置本身不是响应式的。创建路由器后修改 `options.routes` 不会生效。要动态修改路由，使用 `addRoute()` 和 `removeRoute()`：

```typescript
const router = createRouter({ routes: [] })

// 动态添加
router.addRoute({ path: '/new', component: NewPage })

// 直接修改 options 无效
router.options.routes.push({ path: '/broken', component: Broken })  // 不会生效
```

## 本章小结

RouterOptions 定义了路由器的行为：

- `history`：必需，决定 URL 操作方式
- `routes`：必需，定义路由映射
- `linkActiveClass`/`linkExactActiveClass`：RouterLink 激活类名
- `parseQuery`/`stringifyQuery`：自定义查询字符串处理
- `scrollBehavior`：控制导航滚动
- `sensitive`/`strict`/`end`：路径匹配规则

这些配置在 createRouter 中被解析，分发给对应的模块使用。配置本身不是响应式的，动态修改路由应该使用专门的 API。
