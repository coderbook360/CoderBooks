# Vue Router 源码深度解析: 前端路由的设计与实现

- [序言](index.md)

---

### 第一部分：设计思想 (Design Philosophy)

1. [前端路由发展历程](design/routing-history.md)
2. [SPA 与路由的关系](design/spa-and-routing.md)
3. [Hash 模式原理](design/hash-mode-principle.md)
4. [History 模式原理](design/history-mode-principle.md)
5. [Memory 模式与 SSR](design/memory-mode-ssr.md)
6. [Hash vs History 对比](design/hash-vs-history.md)
7. [路由匹配算法设计](design/matching-algorithm-design.md)
8. [动态路由与参数](design/dynamic-routes-params.md)
9. [嵌套路由设计](design/nested-routes-design.md)
10. [命名路由与命名视图](design/named-routes-views.md)
11. [导航守卫设计思想](design/navigation-guards-design.md)
12. [路由元信息设计](design/route-meta-design.md)
13. [滚动行为设计](design/scroll-behavior-design.md)
14. [路由懒加载设计](design/lazy-loading-design.md)
15. [路由过渡动画](design/route-transitions.md)
16. [与状态管理集成](design/state-management-integration.md)
17. [设计权衡与取舍](design/design-tradeoffs.md)
18. [架构总览](design/architecture-overview.md)

---

### 第二部分：源码解析 (Source Code Analysis)

#### 核心入口与配置

19. [源码结构与阅读指南](source/source-structure-guide.md)
20. [createRouter 入口分析](source/create-router-entry.md)
21. [RouterOptions 配置选项](source/router-options.md)

#### History 模式实现

22. [createWebHistory 实现](source/create-web-history.md)
23. [createWebHashHistory 实现](source/create-web-hash-history.md)
24. [createMemoryHistory 实现](source/create-memory-history.md)
25. [useHistoryListeners 监听器](source/use-history-listeners.md)
26. [useHistoryStateNavigation 导航](source/use-history-state-navigation.md)

#### 路由匹配器

27. [createRouterMatcher 匹配器创建](source/create-router-matcher.md)
28. [addRoute 添加路由](source/add-route.md)
29. [removeRoute 移除路由](source/remove-route.md)
30. [getRoutes 获取路由列表](source/get-routes.md)
31. [路径解析与规范化](source/path-parsing.md)
32. [路由正则生成](source/route-regex-generation.md)
33. [路径参数提取](source/path-params-extraction.md)
34. [resolve 路由解析](source/resolve-implementation.md)

#### 导航系统

35. [router.push 导航实现](source/router-push.md)
36. [router.replace 实现](source/router-replace.md)
37. [router.go/back/forward](source/router-go-back-forward.md)
38. [navigate 核心导航](source/navigate-implementation.md)
39. [导航状态与 pending](source/navigation-state.md)
40. [导航失败与重定向](source/navigation-failure-redirect.md)

#### 导航守卫

41. [导航守卫执行流程](source/guards-execution-flow.md)
42. [beforeEach 全局前置守卫](source/before-each-guard.md)
43. [beforeResolve 全局解析守卫](source/before-resolve-guard.md)
44. [afterEach 后置钩子](source/after-each-hook.md)
45. [beforeRouteEnter 组件守卫](source/before-route-enter.md)
46. [beforeRouteUpdate 组件守卫](source/before-route-update.md)
47. [beforeRouteLeave 组件守卫](source/before-route-leave.md)
48. [守卫的 next 函数处理](source/guard-next-handling.md)

#### 内置组件

49. [RouterView 组件源码](source/router-view-source.md)
50. [RouterView 渲染逻辑](source/router-view-render.md)
51. [嵌套 RouterView 处理](source/nested-router-view.md)
52. [RouterLink 组件源码](source/router-link-source.md)
53. [RouterLink 激活状态](source/router-link-active.md)

#### Composition API

54. [useRouter 实现](source/use-router.md)
55. [useRoute 实现](source/use-route.md)
56. [useLink 实现](source/use-link.md)
57. [onBeforeRouteLeave 钩子](source/on-before-route-leave.md)
58. [onBeforeRouteUpdate 钩子](source/on-before-route-update.md)

#### 高级特性

59. [滚动行为实现](source/scroll-behavior-implementation.md)
60. [路由懒加载实现](source/lazy-loading-implementation.md)
61. [路由数据获取](source/route-data-fetching.md)
62. [错误处理机制](source/error-handling.md)
