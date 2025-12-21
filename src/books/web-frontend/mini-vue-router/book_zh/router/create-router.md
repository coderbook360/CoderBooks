# createRouter 函数实现

整合所有模块，实现完整的 `createRouter` 函数。

## 完整实现

```typescript
export function createRouter(options: RouterOptions): Router {
  const { history, routes } = options;
  
  // 创建 Matcher
  const matcher = createRouterMatcher(routes);
  
  // 创建守卫管理器
  const guardManager = new GuardManager();
  
  // 当前路由（响应式）
  const currentRoute = ref<RouteLocationNormalized>(START_LOCATION);
  
  // Push 方法
  async function push(to: RouteLocationRaw): Promise<void> {
    return navigate(to, 'push');
  }
  
  // Replace 方法
  async function replace(to: RouteLocationRaw): Promise<void> {
    return navigate(to, 'replace');
  }
  
  // 核心导航方法
  async function navigate(
    to: RouteLocationRaw,
    type: 'push' | 'replace'
  ): Promise<void> {
    const from = currentRoute.value;
    
    // 1. 解析目标路由
    const targetLocation = matcher.resolve(normalizeLocation(to));
    if (!targetLocation) {
      throw new Error(`No match for ${JSON.stringify(to)}`);
    }
    
    try {
      // 2. 执行守卫队列
      await runGuards(targetLocation, from);
      
      // 3. 更新 History
      if (type === 'push') {
        history.push(targetLocation.path);
      } else {
        history.replace(targetLocation.path);
      }
      
      // 4. 更新当前路由
      currentRoute.value = targetLocation;
      
      // 5. 执行后置钩子
      guardManager.runAfterEach(targetLocation, from);
      
    } catch (error) {
      handleNavigationError(error);
    }
  }
  
  // 监听 History 变化
  history.listen((to, from, info) => {
    const targetLocation = matcher.resolve(to);
    if (targetLocation) {
      currentRoute.value = targetLocation;
    }
  });
  
  // 安装到 Vue
  function install(app: App) {
    app.provide(routerKey, router);
    app.provide(routeKey, currentRoute);
    
    app.component('RouterView', RouterView);
    app.component('RouterLink', RouterLink);
  }
  
  const router: Router = {
    currentRoute,
    options,
    push,
    replace,
    go: (n) => history.go(n),
    back: () => history.go(-1),
    forward: () => history.go(1),
    addRoute: matcher.addRoute,
    removeRoute: matcher.removeRoute,
    getRoutes: matcher.getRoutes,
    beforeEach: guardManager.beforeEach,
    beforeResolve: guardManager.beforeResolve,
    afterEach: guardManager.afterEach,
    install
  };
  
  return router;
}
```

## 使用示例

```typescript
const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: Home },
    { path: '/user/:id', component: User }
  ]
});

const app = createApp(App);
app.use(router);
app.mount('#app');
```

下一章实现路由状态管理。
