# 源码阅读总结

通过对 Vue Router 源码的分析，我们深入理解了其设计思想和实现细节。本章总结核心模块和关键概念。

## 架构概览

Vue Router 由几个核心模块组成：

```
createRouter
    ├── History (createWebHistory/createWebHashHistory/createMemoryHistory)
    ├── Matcher (createRouterMatcher)
    ├── Navigation (pushWithRedirect/navigate)
    ├── Guards (beforeGuards/afterGuards)
    └── Components (RouterView/RouterLink)
```

## History 模块

**三种模式**：

- **createWebHistory**：HTML5 History API，URL 干净
- **createWebHashHistory**：使用 hash，兼容性好
- **createMemoryHistory**：内存模式，用于 SSR 和测试

**核心接口**：

```typescript
interface RouterHistory {
  location: string
  state: HistoryState
  push(to: string, state?: HistoryState): void
  replace(to: string, state?: HistoryState): void
  go(delta: number, triggerListeners?: boolean): void
  listen(callback: NavigationCallback): () => void
}
```

**关键实现**：
- `useHistoryStateNavigation`：封装 pushState/replaceState
- `useHistoryListeners`：管理 popstate 监听

## Matcher 模块

**职责**：将路径模式编译为正则表达式，匹配 URL 并提取参数。

**核心流程**：

```
路径模式 → tokenize → tokensToParser → 正则 + parse/stringify
```

**关键函数**：
- `createRouterMatcher`：创建匹配器实例
- `addRoute/removeRoute`：动态路由管理
- `resolve`：路由匹配

**匹配器排序**：静态路径 > 动态参数 > 通配符

## Navigation 模块

**导航流程**：

```
push(to)
    ↓
resolve(to)           // 解析目标
    ↓
handleRedirectRecord  // 处理重定向
    ↓
navigate()            // 执行守卫队列
    ↓
finalizeNavigation()  // 更新 URL 和状态
    ↓
triggerAfterEach()    // 触发后置守卫
```

**守卫执行顺序**：

1. beforeRouteLeave（组件）
2. beforeEach（全局）
3. beforeRouteUpdate（组件）
4. beforeEnter（路由）
5. 解析异步组件
6. beforeRouteEnter（组件）
7. beforeResolve（全局）
8. afterEach（全局）

**关键机制**：
- `pendingLocation`：处理快速连续导航
- `NavigationFailure`：表示预期内的导航结果

## 组件模块

**RouterView**：
- 深度匹配：通过 `viewDepthKey` 确定渲染层级
- 命名视图：支持多个命名的 RouterView
- enterCallbacks：执行 beforeRouteEnter 回调

**RouterLink**：
- 路由解析：使用 `router.resolve`
- 活动状态：`isActive` 和 `isExactActive`
- 事件处理：`guardEvent` 处理修饰键

## Composition API

```typescript
// 核心函数
useRouter()  // 获取路由实例
useRoute()   // 获取响应式当前路由
useLink()    // 封装 RouterLink 逻辑

// 组件守卫
onBeforeRouteLeave()
onBeforeRouteUpdate()
```

## 设计亮点

**响应式集成**：
- `currentRoute` 是 shallowRef
- 组件自动响应路由变化
- RouterLink 活动状态自动更新

**错误处理**：
- NavigationFailure 区分预期结果
- onError 处理真正的错误
- 完善的类型定义

**扩展性**：
- 动态路由 API
- 灵活的守卫系统
- 作用域插槽暴露内部数据

**性能优化**：
- 路由匹配器按优先级排序
- 懒加载组件支持
- 滚动位置缓存

## 调试技巧

**查看当前路由**：

```typescript
console.log(router.currentRoute.value)
```

**查看匹配器**：

```typescript
console.log(router.getRoutes())
```

**追踪导航**：

```typescript
router.beforeEach((to, from) => {
  console.log(`[beforeEach] ${from.path} → ${to.path}`)
})

router.afterEach((to, from, failure) => {
  console.log(`[afterEach] ${from.path} → ${to.path}`, failure?.type)
})
```

## 常见问题

**组件不更新**：同一组件的参数变化不触发重新创建

```vue
<!-- 使用 key 强制重新创建 -->
<RouterView :key="$route.fullPath" />
```

**守卫不触发**：检查守卫类型是否正确

```typescript
// beforeRouteEnter 不在参数变化时触发
// 使用 beforeRouteUpdate 或 watch
```

**动态路由不生效**：添加后可能需要重新导航

```typescript
router.addRoute(route)
router.replace(router.currentRoute.value.fullPath)
```

## 延伸阅读

掌握源码后，可以进一步探索：

1. **自定义 History**：实现特殊的导航模式
2. **插件开发**：利用路由钩子实现功能
3. **SSR 集成**：理解服务端渲染的路由处理
4. **状态管理集成**：路由与 Pinia/Vuex 的配合

Vue Router 的源码设计清晰，是学习 Vue 生态优秀实践的好材料。理解其原理，能更好地使用路由功能，也能在遇到问题时快速定位原因。
