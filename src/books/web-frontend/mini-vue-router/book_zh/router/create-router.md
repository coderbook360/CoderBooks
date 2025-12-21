# createRouter 函数实现

经过前面章节的学习，我们已经实现了 History、Matcher、Guards 等核心模块。现在，是时候将它们整合起来了。

**首先要问一个问题**：`createRouter` 到底需要做什么？

如果你仔细观察 Vue Router 的使用方式，你会发现它本质上是一个**协调者**——接收用户配置，创建各个子模块，然后提供统一的 API 供外部使用。

```typescript
// 用户这样使用
const router = createRouter({
  history: createWebHistory(),
  routes: [...]
});

app.use(router);
router.push('/home');
```

所以 `createRouter` 的职责非常清晰：
- **初始化**：创建 Matcher、GuardManager 等子模块
- **协调**：连接各模块，处理导航流程
- **对外**：提供 push/replace/go 等 API
- **集成**：作为 Vue 插件，注入到应用中

## 渐进式实现

### 版本 1：最小可运行版本

让我们从最简单的版本开始——能跑起来就行：

```typescript
import { ref } from 'vue';
import { createRouterMatcher } from '../matcher';
import type { RouterOptions, Router, RouteLocationNormalized } from '../types';

// 起始位置
const START_LOCATION: RouteLocationNormalized = {
  path: '/',
  name: undefined,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {},
  redirectedFrom: undefined
};

export function createRouter(options: RouterOptions): Router {
  const { history, routes } = options;
  
  // 创建路由匹配器
  const matcher = createRouterMatcher(routes);
  
  // 当前路由（响应式）
  const currentRoute = ref<RouteLocationNormalized>(START_LOCATION);
  
  // 最简单的 push 实现
  function push(to: string) {
    // 1. 解析目标路由
    const resolved = matcher.resolve(to);
    
    // 2. 更新 URL
    history.push(resolved.path);
    
    // 3. 更新当前路由
    currentRoute.value = resolved;
  }
  
  return {
    currentRoute,
    push,
    // ... 其他方法暂时省略
  };
}
```

这个版本能工作吗？能，但问题很多：

- ✗ 没有守卫支持
- ✗ 没有错误处理
- ✗ 不支持 replace
- ✗ 浏览器后退时不响应
- ✗ 没有 Vue 插件机制

让我们逐步完善。

### 版本 2：添加导航守卫支持

**现在我要问第二个问题**：守卫应该在什么时机执行？

回顾导航流程，守卫是在"用户触发导航"和"实际跳转"之间的拦截点：

```
用户调用 push()
    ↓
解析目标路由
    ↓
执行守卫队列 ← 这里可以取消或重定向
    ↓
更新 URL
    ↓
更新当前路由
```

```typescript
export function createRouter(options: RouterOptions): Router {
  const { history, routes } = options;
  
  const matcher = createRouterMatcher(routes);
  const currentRoute = ref<RouteLocationNormalized>(START_LOCATION);
  
  // 新增：守卫列表
  const beforeGuards: NavigationGuard[] = [];
  const afterHooks: NavigationHookAfter[] = [];
  
  // 新增：注册全局前置守卫
  function beforeEach(guard: NavigationGuard) {
    beforeGuards.push(guard);
    // 返回取消函数
    return () => {
      const index = beforeGuards.indexOf(guard);
      if (index > -1) beforeGuards.splice(index, 1);
    };
  }
  
  // 新增：注册全局后置钩子
  function afterEach(hook: NavigationHookAfter) {
    afterHooks.push(hook);
    return () => {
      const index = afterHooks.indexOf(hook);
      if (index > -1) afterHooks.splice(index, 1);
    };
  }
  
  // 修改：push 现在是异步的
  async function push(to: RouteLocationRaw): Promise<void> {
    const from = currentRoute.value;
    const resolved = matcher.resolve(normalizeLocation(to));
    
    // 新增：执行前置守卫
    for (const guard of beforeGuards) {
      const result = await guard(resolved, from);
      
      // 守卫返回 false，取消导航
      if (result === false) {
        return;
      }
      
      // 守卫返回路由，重定向
      if (typeof result === 'string' || typeof result === 'object') {
        return push(result);  // 递归调用
      }
    }
    
    // 守卫都通过，执行导航
    history.push(resolved.path);
    currentRoute.value = resolved;
    
    // 新增：执行后置钩子
    for (const hook of afterHooks) {
      hook(resolved, from);
    }
  }
  
  return {
    currentRoute,
    push,
    beforeEach,  // 新增
    afterEach,   // 新增
  };
}
```

思考一下：这个守卫实现有什么问题？

**问题**：守卫是串行执行的，但如果有多个守卫，且其中一个需要异步操作，我们需要正确地等待每一个。上面的 `for...of + await` 模式是正确的，但我们还需要处理更复杂的场景——比如守卫抛出异常。

### 版本 3：完善错误处理

```typescript
async function push(to: RouteLocationRaw): Promise<void> {
  const from = currentRoute.value;
  
  // 解析目标路由
  const resolved = matcher.resolve(normalizeLocation(to));
  if (!resolved.matched.length) {
    // 没有匹配的路由
    console.warn(`No match for ${JSON.stringify(to)}`);
    return;
  }
  
  try {
    // 执行前置守卫
    for (const guard of beforeGuards) {
      const result = await guard(resolved, from);
      
      if (result === false) {
        // 导航被取消
        return;
      }
      
      if (typeof result === 'string') {
        return push(result);
      }
      
      if (result && typeof result === 'object') {
        return push(result);
      }
      
      // result 为 undefined 或 true，继续下一个守卫
    }
    
    // 执行导航
    history.push(resolved.path);
    currentRoute.value = resolved;
    
    // 执行后置钩子（后置钩子不影响导航）
    afterHooks.forEach(hook => {
      try {
        hook(resolved, from);
      } catch (e) {
        console.error('Error in afterEach hook:', e);
      }
    });
    
  } catch (error) {
    // 守卫抛出异常，取消导航
    console.error('Navigation failed:', error);
    throw error;
  }
}
```

### 版本 4：监听浏览器后退/前进

用户点击浏览器的后退/前进按钮时，我们需要响应这个变化。这通过 History 模块的 `listen` 方法实现：

```typescript
export function createRouter(options: RouterOptions): Router {
  // ... 前面的代码
  
  // 新增：监听 History 变化
  history.listen((to, from, info) => {
    // 浏览器后退/前进触发的导航
    const resolved = matcher.resolve(to);
    
    if (resolved.matched.length) {
      // 注意：这里不执行守卫，因为用户已经"物理"导航了
      // 但官方实现会执行守卫，如果守卫阻止，会再 go 回去
      currentRoute.value = resolved;
    }
  });
  
  // ...
}
```

**这里有个有趣的设计决策**：浏览器后退时，是否执行守卫？

- **不执行**（简化版）：用户已经点了后退，URL 已经变了，只需要更新状态
- **执行**（官方实现）：守卫仍然有效，如果守卫阻止，会调用 `history.go(1)` 回退这次后退

官方实现更完善，但也更复杂。我们先用简化版。

### 版本 5：Vue 插件机制

最后，我们需要实现 `install` 方法，让 Router 成为 Vue 插件：

```typescript
import { App, inject, InjectionKey } from 'vue';
import { RouterView } from './RouterView';
import { RouterLink } from './RouterLink';

// 注入 key
export const routerKey: InjectionKey<Router> = Symbol('router');
export const routeKey: InjectionKey<Ref<RouteLocationNormalized>> = Symbol('route');

export function createRouter(options: RouterOptions): Router {
  // ... 前面的代码
  
  function install(app: App) {
    // 1. 注入 router 实例
    app.provide(routerKey, router);
    
    // 2. 注入响应式的当前路由
    app.provide(routeKey, currentRoute);
    
    // 3. 注册全局组件
    app.component('RouterView', RouterView);
    app.component('RouterLink', RouterLink);
    
    // 4. 添加全局属性（Options API 支持）
    app.config.globalProperties.$router = router;
    app.config.globalProperties.$route = currentRoute;
  }
  
  const router: Router = {
    currentRoute,
    options,
    push,
    replace,  // 类似 push，使用 history.replace
    go: (delta: number) => history.go(delta),
    back: () => history.go(-1),
    forward: () => history.go(1),
    beforeEach,
    afterEach,
    addRoute: matcher.addRoute,
    removeRoute: matcher.removeRoute,
    getRoutes: matcher.getRoutes,
    install
  };
  
  return router;
}
```

**为什么需要 provide/inject？**

Vue 3 推荐使用 Composition API，组件通过 `inject` 获取 router：

```typescript
// useRouter.ts
export function useRouter(): Router {
  const router = inject(routerKey);
  if (!router) {
    throw new Error('useRouter requires router. Did you forget app.use(router)?');
  }
  return router;
}

export function useRoute(): RouteLocationNormalized {
  const route = inject(routeKey);
  if (!route) {
    throw new Error('useRoute requires router. Did you forget app.use(router)?');
  }
  return route.value;
}
```

## 完整实现

经过渐进式演化，这是最终的完整实现：

```typescript
import { ref, App, InjectionKey, Ref } from 'vue';
import { createRouterMatcher } from '../matcher';
import { RouterView } from './RouterView';
import { RouterLink } from './RouterLink';
import type {
  RouterOptions,
  Router,
  RouteLocationNormalized,
  RouteLocationRaw,
  NavigationGuard,
  NavigationHookAfter
} from '../types';

export const routerKey: InjectionKey<Router> = Symbol('router');
export const routeKey: InjectionKey<Ref<RouteLocationNormalized>> = Symbol('route');

const START_LOCATION: RouteLocationNormalized = {
  path: '/',
  name: undefined,
  params: {},
  query: {},
  hash: '',
  fullPath: '/',
  matched: [],
  meta: {},
  redirectedFrom: undefined
};

export function createRouter(options: RouterOptions): Router {
  const { history, routes, scrollBehavior } = options;
  
  // 创建子模块
  const matcher = createRouterMatcher(routes);
  
  // 响应式路由状态
  const currentRoute = ref<RouteLocationNormalized>(START_LOCATION);
  
  // 守卫列表
  const beforeGuards: NavigationGuard[] = [];
  const beforeResolveGuards: NavigationGuard[] = [];
  const afterHooks: NavigationHookAfter[] = [];
  
  // 注册守卫
  function beforeEach(guard: NavigationGuard) {
    beforeGuards.push(guard);
    return () => {
      const i = beforeGuards.indexOf(guard);
      if (i > -1) beforeGuards.splice(i, 1);
    };
  }
  
  function beforeResolve(guard: NavigationGuard) {
    beforeResolveGuards.push(guard);
    return () => {
      const i = beforeResolveGuards.indexOf(guard);
      if (i > -1) beforeResolveGuards.splice(i, 1);
    };
  }
  
  function afterEach(hook: NavigationHookAfter) {
    afterHooks.push(hook);
    return () => {
      const i = afterHooks.indexOf(hook);
      if (i > -1) afterHooks.splice(i, 1);
    };
  }
  
  // 标准化位置
  function normalizeLocation(to: RouteLocationRaw): string {
    return typeof to === 'string' ? to : to.path || '/';
  }
  
  // 核心导航方法
  async function navigate(
    to: RouteLocationRaw,
    type: 'push' | 'replace'
  ): Promise<void> {
    const from = currentRoute.value;
    const resolved = matcher.resolve(normalizeLocation(to));
    
    if (!resolved.matched.length) {
      console.warn(`[Router] No match for: ${JSON.stringify(to)}`);
      return;
    }
    
    try {
      // 执行 beforeEach 守卫
      for (const guard of beforeGuards) {
        const result = await guard(resolved, from);
        if (result === false) return;
        if (result && result !== true) {
          return navigate(result, type);
        }
      }
      
      // 执行 beforeResolve 守卫
      for (const guard of beforeResolveGuards) {
        const result = await guard(resolved, from);
        if (result === false) return;
        if (result && result !== true) {
          return navigate(result, type);
        }
      }
      
      // 更新 URL
      if (type === 'push') {
        history.push(resolved.path);
      } else {
        history.replace(resolved.path);
      }
      
      // 更新当前路由
      currentRoute.value = resolved;
      
      // 处理滚动行为
      if (scrollBehavior) {
        const position = await scrollBehavior(resolved, from, null);
        if (position) {
          window.scrollTo(position);
        }
      }
      
      // 执行 afterEach 钩子
      afterHooks.forEach(hook => {
        try { hook(resolved, from); } catch (e) { console.error(e); }
      });
      
    } catch (error) {
      console.error('[Router] Navigation failed:', error);
      throw error;
    }
  }
  
  // 公开 API
  async function push(to: RouteLocationRaw) {
    return navigate(to, 'push');
  }
  
  async function replace(to: RouteLocationRaw) {
    return navigate(to, 'replace');
  }
  
  // 监听浏览器导航
  history.listen((to, from, info) => {
    const resolved = matcher.resolve(to);
    if (resolved.matched.length) {
      currentRoute.value = resolved;
    }
  });
  
  // Vue 插件安装
  function install(app: App) {
    app.provide(routerKey, router);
    app.provide(routeKey, currentRoute);
    app.component('RouterView', RouterView);
    app.component('RouterLink', RouterLink);
    app.config.globalProperties.$router = router;
    app.config.globalProperties.$route = currentRoute;
  }
  
  const router: Router = {
    currentRoute,
    options,
    push,
    replace,
    go: (n: number) => history.go(n),
    back: () => history.go(-1),
    forward: () => history.go(1),
    addRoute: matcher.addRoute,
    removeRoute: matcher.removeRoute,
    getRoutes: matcher.getRoutes,
    beforeEach,
    beforeResolve,
    afterEach,
    install
  };
  
  return router;
}
```

## 使用示例

```typescript
import { createApp } from 'vue';
import { createRouter, createWebHistory } from 'mini-vue-router';
import App from './App.vue';

const router = createRouter({
  history: createWebHistory(),
  routes: [
    { path: '/', component: () => import('./Home.vue') },
    { path: '/user/:id', component: () => import('./User.vue') }
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) return savedPosition;
    return { left: 0, top: 0 };
  }
});

// 注册全局守卫
router.beforeEach((to, from) => {
  console.log(`导航: ${from.path} → ${to.path}`);
});

const app = createApp(App);
app.use(router);
app.mount('#app');
```

## 核心设计洞察

回顾整个实现，有几个核心设计思想值得记住：

**1. 关注点分离**

`createRouter` 本身不处理 URL 解析、路径匹配、组件渲染——这些都委托给专门的模块。Router 只负责协调。

**2. 响应式驱动**

`currentRoute` 是一个 `ref`，当它变化时，Vue 会自动重新渲染依赖它的组件（如 RouterView）。这就是为什么路由切换时界面会更新。

**3. 插件化设计**

通过 `provide/inject` 和 Vue 插件机制，Router 与 Vue 松耦合。任何组件都可以通过 `useRouter()` 获取路由实例。

**4. 守卫队列**

守卫是串行执行的 Promise 链，任何一个守卫都可以中断链条。这给了开发者强大的控制能力。

下一章我们将实现路由状态管理，深入理解 `currentRoute` 的响应式机制。
