# Mini Vue Router: Vue Router 4 源码深度解析

从零实现一个 Mini Vue Router，深入理解路由系统的核心原理与设计思想。

- [序言](preface.md)

---

### 第一部分：路由基础与架构概览

1. [前端路由的前世今生](foundations/routing-history.md)
2. [Vue Router 4 架构设计解析](foundations/architecture-overview.md)
3. [核心概念与术语定义](foundations/core-concepts.md)
4. [搭建 Mini Vue Router 开发环境](foundations/dev-environment.md)

---

### 第二部分：History 模式实现

5. [History API 深度剖析](history/history-api-deep-dive.md)
6. [createWebHistory 实现](history/create-web-history.md)
7. [createWebHashHistory 实现](history/create-web-hash-history.md)
8. [createMemoryHistory 实现](history/create-memory-history.md)
9. [History 抽象层设计](history/history-abstraction.md)

---

### 第三部分：路由匹配器

10. [路由匹配原理与算法](matcher/matching-algorithm.md)
11. [路径解析与参数提取](matcher/path-parsing.md)
12. [动态路由与正则匹配](matcher/dynamic-routes.md)
13. [嵌套路由与路由树](matcher/nested-routes.md)
14. [路由优先级与权重计算](matcher/route-ranking.md)
15. [createRouterMatcher 实现](matcher/create-router-matcher.md)

---

### 第四部分：导航守卫系统

16. [导航守卫设计思想](guards/guards-design.md)
17. [全局守卫实现](guards/global-guards.md)
18. [路由独享守卫实现](guards/route-guards.md)
19. [组件内守卫实现](guards/component-guards.md)
20. [守卫执行队列与流程控制](guards/guard-queue.md)
21. [异步守卫与错误处理](guards/async-guards.md)

---

### 第五部分：核心 Router 实例

22. [createRouter 函数实现](router/create-router.md)
23. [路由状态管理](router/router-state.md)
24. [push 与 replace 导航](router/navigation-methods.md)
25. [go、back、forward 实现](router/history-navigation.md)
26. [路由解析与 resolve 方法](router/resolve-method.md)
27. [addRoute 与 removeRoute 动态路由](router/dynamic-routes-api.md)

---

### 第六部分：Vue 集成与组件

28. [Router 插件机制与 install](integration/router-plugin.md)
29. [依赖注入与 provide/inject](integration/dependency-injection.md)
30. [RouterLink 组件实现](integration/router-link.md)
31. [RouterView 组件实现](integration/router-view.md)
32. [Composition API 集成](integration/composition-api.md)
33. [useRouter 与 useRoute 实现](integration/use-router-hooks.md)

---

### 第七部分：高级特性

34. [滚动行为控制](advanced/scroll-behavior.md)
35. [路由元信息与权限控制](advanced/route-meta.md)
36. [命名视图与多视图渲染](advanced/named-views.md)
37. [重定向与别名](advanced/redirect-alias.md)

---

### 第八部分：错误处理

38. [错误类型与错误边界](debugging/error-types.md)
39. [导航失败处理](debugging/navigation-failures.md)

---

### 第九部分：完整实现与总结

40. [Mini Vue Router 完整实现](final/complete-implementation.md)
41. [与官方实现对比](final/comparison.md)
42. [总结与展望](final/conclusion.md)
