# 核心概念与术语定义

在开始编码之前，我们需要建立统一的术语体系。路由系统涉及大量概念，如果不厘清它们的准确含义，后续的代码理解会非常困难。

本章将定义 Vue Router 中的核心概念，这些术语会贯穿整本书。

## Route Location：路由位置

**Route Location** 表示一个路由的位置信息，可以是：

### RouteLocationRaw：原始路由位置

用户传给 `router.push()` 的参数：

```javascript
// 字符串形式
router.push('/user/123');

// 对象形式
router.push({
  path: '/user/123'
});

// 命名路由
router.push({
  name: 'User',
  params: { id: '123' }
});

// 带查询参数和 Hash
router.push({
  path: '/search',
  query: { keyword: 'vue' },
  hash: '#result'
});
```

**类型定义**：

```typescript
type RouteLocationRaw = 
  | string 
  | RouteLocationPathRaw 
  | RouteLocationNamedRaw;

interface RouteLocationPathRaw {
  path: string;
  query?: Record<string, any>;
  hash?: string;
}

interface RouteLocationNamedRaw {
  name: string;
  params?: Record<string, any>;
  query?: Record<string, any>;
  hash?: string;
}
```

### RouteLocation：标准化路由位置

Router 内部处理后的标准格式：

```typescript
interface RouteLocation {
  path: string;              // '/user/123'
  name?: string;             // 'User'
  params: Record<string, string>;  // { id: '123' }
  query: Record<string, string>;   // { tab: 'profile' }
  hash: string;              // '#comments'
  fullPath: string;          // '/user/123?tab=profile#comments'
  matched: RouteRecord[];    // 匹配到的路由记录数组
  redirectedFrom?: RouteLocation;
}
```

### RouteLocationNormalized：完全标准化的路由位置

包含所有必需字段，不包含可选字段：

```typescript
interface RouteLocationNormalized {
  path: string;
  name: string | undefined;
  params: Record<string, string>;
  query: Record<string, string>;
  hash: string;
  fullPath: string;
  matched: RouteRecord[];
  meta: Record<string, any>;
  redirectedFrom: RouteLocationNormalized | undefined;
}
```

**为什么需要三种类型？**

- **RouteLocationRaw**：灵活，方便用户使用
- **RouteLocation**：半标准化，内部处理中间态
- **RouteLocationNormalized**：完全标准化，确保所有字段存在

这是一种**逐步规范化**的设计，平衡了用户便利性和内部一致性。

## Route Record：路由记录

**Route Record** 是路由配置的内部表示。

### RouteRecordRaw：用户定义的路由配置

```javascript
const routes = [
  {
    path: '/user/:id',
    name: 'User',
    component: UserComponent,
    children: [
      {
        path: 'profile',
        component: ProfileComponent
      }
    ],
    meta: { requiresAuth: true },
    beforeEnter: (to, from) => {
      // 路由守卫
    }
  }
];
```

**类型定义**：

```typescript
interface RouteRecordRaw {
  path: string;
  name?: string;
  component?: Component;
  components?: Record<string, Component>;  // 命名视图
  children?: RouteRecordRaw[];
  redirect?: string | RouteLocationRaw;
  alias?: string | string[];
  meta?: Record<string, any>;
  beforeEnter?: NavigationGuard;
  props?: boolean | Record<string, any> | Function;
}
```

### RouteRecord：内部路由记录

Router 内部使用的标准化格式：

```typescript
interface RouteRecord {
  path: string;
  name?: string;
  regex: RegExp;             // 编译后的正则表达式
  components: Record<string, Component>;
  instances: Record<string, ComponentInstance>;
  meta: Record<string, any>;
  beforeEnter?: NavigationGuard;
  props: Record<string, boolean | Function>;
  children: RouteRecord[];
  parent?: RouteRecord;      // 父路由
  // 匹配信息
  keys: PathParserKey[];     // 参数信息
  score: number[][];         // 优先级分数
}
```

**关键转换**：
- `component` → `components`（统一为对象）
- `path` → `regex`（编译为正则）
- 添加 `score`（用于排序）
- 建立 `parent` 关系（嵌套路由）

## Matcher：路由匹配器

**Matcher** 负责：
1. 管理路由表
2. 根据 path 或 name 解析路由
3. 提取参数

```typescript
interface RouterMatcher {
  addRoute(record: RouteRecordRaw, parent?: RouteRecord): () => void;
  removeRoute(name: string): void;
  getRoutes(): RouteRecord[];
  resolve(location: RouteLocationRaw, current: RouteLocation): RouteLocation;
}
```

**使用示例**：

```javascript
const matcher = createRouterMatcher(routes);

// 解析路径
const resolved = matcher.resolve('/user/123');
// 返回：{ path: '/user/123', params: { id: '123' }, matched: [...] }

// 动态添加路由
const removeRoute = matcher.addRoute({
  path: '/admin',
  component: AdminComponent
});

// 删除路由
removeRoute();
```

## History：历史记录管理器

**History** 封装浏览器 URL 操作：

```typescript
interface RouterHistory {
  readonly location: string;  // 当前路径
  readonly state: StateEntry; // 当前状态
  
  push(to: string, data?: StateEntry): void;
  replace(to: string, data?: StateEntry): void;
  go(delta: number, triggerListeners?: boolean): void;
  
  listen(callback: NavigationCallback): () => void;
  destroy(): void;
}
```

**三种实现**：
- `createWebHistory`：使用 `history.pushState`
- `createWebHashHistory`：使用 `location.hash`
- `createMemoryHistory`：内存数组（用于 SSR）

## Navigation Guard：导航守卫

**导航守卫** 在路由跳转过程中执行逻辑。

### 守卫类型

```typescript
// 导航守卫
type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  next: NavigationGuardNext
) => NavigationGuardReturn;

type NavigationGuardReturn = 
  | void 
  | Error 
  | RouteLocationRaw 
  | boolean 
  | Promise<NavigationGuardReturn>;

// next 回调
type NavigationGuardNext = (
  valid?: boolean | RouteLocationRaw | Error
) => void;
```

### 守卫返回值语义

```javascript
// 继续导航
return true;
// 或
next();

// 取消导航
return false;
// 或
next(false);

// 重定向
return '/login';
// 或
next('/login');

// 抛出错误
return new Error('Not authorized');
// 或
next(new Error('Not authorized'));

// 异步守卫
return new Promise((resolve) => {
  setTimeout(() => resolve(true), 1000);
});
```

**为什么既有 return 又有 next？**

- **return**：Vue Router 4 推荐的现代写法
- **next**：兼容 Vue Router 3 的写法

内部实现会将两者统一处理。

### 全局守卫

```javascript
// 前置守卫
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isLoggedIn) {
    return '/login';
  }
});

// 解析守卫
router.beforeResolve((to, from) => {
  // 在导航被确认之前，所有组件内守卫和异步路由组件解析完后调用
});

// 后置钩子
router.afterEach((to, from) => {
  // 没有 next 参数，不能改变导航
  sendAnalytics(to.path);
});
```

### 路由独享守卫

```javascript
const routes = [
  {
    path: '/admin',
    component: AdminComponent,
    beforeEnter: (to, from) => {
      if (!isAdmin()) {
        return false;
      }
    }
  }
];
```

### 组件内守卫

```javascript
export default {
  beforeRouteEnter(to, from) {
    // 在渲染该组件的对应路由被验证前调用
    // 此时组件实例还未创建，不能访问 this
  },
  
  beforeRouteUpdate(to, from) {
    // 在当前路由改变，但该组件被复用时调用
    // 例如：从 /user/1 到 /user/2
  },
  
  beforeRouteLeave(to, from) {
    // 在导航离开渲染该组件的对应路由时调用
    // 可以访问组件实例 this
  }
};
```

## ScrollBehavior：滚动行为

控制路由跳转后的滚动位置：

```typescript
type ScrollBehavior = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null
) => ScrollPositionResult;

interface ScrollPosition {
  left: number;
  top: number;
}

type ScrollPositionResult = 
  | ScrollPosition 
  | { el: string | Element; behavior?: ScrollBehavior }
  | false;
```

**使用示例**：

```javascript
const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 前进/后退时，恢复之前的滚动位置
    if (savedPosition) {
      return savedPosition;
    }
    
    // 如果有 Hash，滚动到对应元素
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    
    // 否则滚动到顶部
    return { left: 0, top: 0 };
  }
});
```

## Meta Fields：元信息

**元信息** 附加在路由上的自定义数据：

```javascript
const routes = [
  {
    path: '/admin',
    component: AdminComponent,
    meta: {
      requiresAuth: true,
      roles: ['admin', 'editor'],
      title: '管理后台'
    }
  }
];

// 在守卫中使用
router.beforeEach((to) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login';
  }
});
```

**嵌套路由的元信息合并**：

```javascript
const routes = [
  {
    path: '/admin',
    meta: { requiresAuth: true },
    children: [
      {
        path: 'users',
        meta: { roles: ['admin'] }
      }
    ]
  }
];

// 访问 /admin/users 时
route.matched.forEach(record => {
  console.log(record.meta);
});
// 输出：
// { requiresAuth: true }
// { roles: ['admin'] }
```

## Lazy Loading：懒加载

**懒加载** 实现代码分割，按需加载组件：

```javascript
const routes = [
  {
    path: '/about',
    component: () => import('./views/About.vue')
  }
];
```

**原理**：
- `import()` 返回 Promise
- Webpack/Vite 会自动分割代码
- 访问路由时才加载对应 chunk

**分组打包**：

```javascript
const routes = [
  {
    path: '/user',
    component: () => import(/* webpackChunkName: "user" */ './User.vue')
  },
  {
    path: '/profile',
    component: () => import(/* webpackChunkName: "user" */ './Profile.vue')
  }
];
```

两个组件会打包到同一个 `user.js` 文件。

## Named Views：命名视图

**命名视图** 在同一级路由中渲染多个视图：

```vue
<template>
  <router-view />              <!-- 默认视图 -->
  <router-view name="sidebar" />
  <router-view name="footer" />
</template>
```

路由配置：

```javascript
const routes = [
  {
    path: '/',
    components: {
      default: Home,
      sidebar: Sidebar,
      footer: Footer
    }
  }
];
```

## Redirect & Alias：重定向与别名

### 重定向

```javascript
const routes = [
  // 简单重定向
  { path: '/home', redirect: '/' },
  
  // 命名路由重定向
  { path: '/home', redirect: { name: 'Index' } },
  
  // 动态重定向
  {
    path: '/search/:keyword',
    redirect: to => {
      return { path: '/search', query: { q: to.params.keyword } };
    }
  }
];
```

### 别名

```javascript
const routes = [
  {
    path: '/users',
    component: Users,
    alias: ['/people', '/u']  // 访问这些路径都会渲染 Users 组件
  }
];
```

**重定向 vs 别名**：
- **重定向**：URL 会变化，`/home` → `/`
- **别名**：URL 不变，`/people` 显示 Users 但 URL 仍是 `/people`

## Navigation Failures：导航失败

导航可能失败，Vue Router 提供了错误类型：

```typescript
enum NavigationFailureType {
  cancelled = 1,   // 导航被取消
  duplicated = 2,  // 导航到相同位置
  aborted = 3      // 守卫返回 false
}
```

**检测导航失败**：

```javascript
const failure = await router.push('/user');

if (failure) {
  if (isNavigationFailure(failure, NavigationFailureType.duplicated)) {
    console.log('已经在该页面');
  }
}
```

## 总结

本章定义了路由系统的核心概念：

**位置相关**：
- `RouteLocationRaw`：用户输入
- `RouteLocation`：标准化位置
- `RouteLocationNormalized`：完全标准化

**路由配置**：
- `RouteRecordRaw`：用户定义
- `RouteRecord`：内部记录

**核心模块**：
- `Matcher`：路由匹配
- `History`：URL 管理
- `NavigationGuard`：守卫系统

**高级特性**：
- 滚动行为、元信息、懒加载
- 命名视图、重定向、别名
- 导航失败处理

理解这些概念，是阅读源码和实现 Mini Vue Router 的基础。下一章，我们将搭建开发环境，准备开始编码。
