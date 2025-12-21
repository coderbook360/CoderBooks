# Mini Vue Router 完整实现

经过前面 40 章的学习，我们已经逐一实现了 Vue Router 的各个核心模块。现在，是时候将它们整合成一个完整的、可运行的路由库了。

**首先要问一个问题**：整合的关键是什么？

答案是**入口文件的设计**。一个好的入口文件需要：
- 统一导出所有公开 API
- 隐藏内部实现细节
- 提供清晰的类型定义

## 项目结构回顾

在开始整合之前，让我们回顾完整的项目结构：

```
mini-vue-router/
├── src/
│   ├── history/                 # History 模块
│   │   ├── common.ts            # 公共类型和工具
│   │   ├── html5.ts             # createWebHistory 实现
│   │   ├── hash.ts              # createWebHashHistory 实现
│   │   └── memory.ts            # createMemoryHistory 实现
│   │
│   ├── matcher/                 # 路由匹配器模块
│   │   ├── index.ts             # createRouterMatcher 入口
│   │   ├── pathParser.ts        # 路径解析（path → tokens）
│   │   ├── pathMatcher.ts       # 路径匹配（tokens → regex）
│   │   └── pathRanker.ts        # 优先级排序
│   │
│   ├── guards/                  # 导航守卫模块
│   │   ├── guardRunner.ts       # 守卫队列执行器
│   │   └── extractGuards.ts     # 组件守卫提取
│   │
│   ├── components/              # Vue 组件
│   │   ├── RouterView.ts        # 路由视图组件
│   │   └── RouterLink.ts        # 路由链接组件
│   │
│   ├── composables/             # Composition API
│   │   ├── useRouter.ts         # useRouter 钩子
│   │   └── useRoute.ts          # useRoute 钩子
│   │
│   ├── router.ts                # createRouter 核心实现
│   ├── types.ts                 # 类型定义
│   ├── errors.ts                # 错误类型定义
│   ├── injectionSymbols.ts      # 注入 key
│   └── index.ts                 # 入口文件
│
├── package.json
├── tsconfig.json
└── README.md
```

## 入口文件设计

入口文件 `index.ts` 是整个库的门面，需要精心设计导出内容：

```typescript
// src/index.ts

// ============ 核心 API ============

// 创建 Router 实例
export { createRouter } from './router';

// 创建 History 实例
export { createWebHistory } from './history/html5';
export { createWebHashHistory } from './history/hash';
export { createMemoryHistory } from './history/memory';

// ============ 组件 ============

export { RouterLink } from './components/RouterLink';
export { RouterView } from './components/RouterView';

// ============ Composition API ============

export { useRouter } from './composables/useRouter';
export { useRoute } from './composables/useRoute';

// ============ 类型导出 ============

export type {
  // Router 相关
  Router,
  RouterOptions,
  RouterHistory,
  
  // Route 相关
  RouteRecord,
  RouteRecordRaw,
  RouteLocation,
  RouteLocationRaw,
  RouteLocationNormalized,
  
  // 守卫相关
  NavigationGuard,
  NavigationGuardNext,
  NavigationHookAfter,
  
  // 其他
  RouteParams,
  RouteMeta,
  ScrollBehavior
} from './types';

// ============ 错误类型 ============

export {
  NavigationFailureType,
  isNavigationFailure
} from './errors';
```

**为什么这样组织？**

- **分组导出**：按功能分组，便于理解和使用
- **类型单独导出**：使用 `export type` 确保类型只在编译时存在
- **隐藏内部**：不导出 `createRouterMatcher` 等内部模块

## 核心模块整合

### types.ts：完整类型定义

类型是整个项目的骨架，我们需要一个完整的类型定义文件：

```typescript
// src/types.ts

import type { Component, Ref } from 'vue';

// ============ History 相关类型 ============

export interface RouterHistory {
  readonly location: string;
  readonly state: HistoryState;
  
  push(to: string, data?: HistoryState): void;
  replace(to: string, data?: HistoryState): void;
  go(delta: number): void;
  listen(callback: NavigationCallback): () => void;
  destroy(): void;
}

export interface HistoryState {
  back: string | null;
  current: string;
  forward: string | null;
  position: number;
  replaced: boolean;
  scroll: ScrollPosition | null;
}

export interface ScrollPosition {
  left: number;
  top: number;
}

export type NavigationCallback = (
  to: string,
  from: string,
  info: NavigationInfo
) => void;

export interface NavigationInfo {
  type: NavigationType;
  direction: NavigationDirection;
  delta: number;
}

export enum NavigationType {
  push = 'push',
  replace = 'replace',
  pop = 'pop'
}

export enum NavigationDirection {
  forward = 'forward',
  back = 'back',
  unknown = 'unknown'
}

// ============ Route 相关类型 ============

export interface RouteRecordRaw {
  path: string;
  name?: string | symbol;
  component?: Component;
  components?: Record<string, Component>;
  children?: RouteRecordRaw[];
  redirect?: string | RouteLocationRaw;
  alias?: string | string[];
  meta?: RouteMeta;
  beforeEnter?: NavigationGuard | NavigationGuard[];
  props?: boolean | Record<string, any> | ((to: RouteLocationNormalized) => Record<string, any>);
}

export interface RouteRecord {
  path: string;
  name?: string | symbol;
  components: Record<string, Component>;
  children: RouteRecord[];
  parent?: RouteRecord;
  meta: RouteMeta;
  beforeEnter?: NavigationGuard[];
  props: Record<string, boolean | Function>;
  regex: RegExp;
  keys: PathParserKey[];
  score: number[][];
}

export interface PathParserKey {
  name: string;
  optional: boolean;
  repeatable: boolean;
}

export type RouteLocationRaw = string | RouteLocationPathRaw | RouteLocationNamedRaw;

export interface RouteLocationPathRaw {
  path: string;
  query?: Record<string, string | string[]>;
  hash?: string;
}

export interface RouteLocationNamedRaw {
  name: string | symbol;
  params?: RouteParams;
  query?: Record<string, string | string[]>;
  hash?: string;
}

export interface RouteLocationNormalized {
  path: string;
  name: string | symbol | undefined;
  params: RouteParams;
  query: Record<string, string | string[]>;
  hash: string;
  fullPath: string;
  matched: RouteRecord[];
  meta: RouteMeta;
  redirectedFrom: RouteLocationNormalized | undefined;
}

export type RouteParams = Record<string, string | string[]>;
export type RouteMeta = Record<string, any>;

// ============ Router 相关类型 ============

export interface RouterOptions {
  history: RouterHistory;
  routes: RouteRecordRaw[];
  scrollBehavior?: ScrollBehavior;
  linkActiveClass?: string;
  linkExactActiveClass?: string;
}

export type ScrollBehavior = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  savedPosition: ScrollPosition | null
) => ScrollPosition | { el: string; top?: number; left?: number } | false | void | Promise<any>;

export interface Router {
  readonly currentRoute: Ref<RouteLocationNormalized>;
  readonly options: RouterOptions;
  
  push(to: RouteLocationRaw): Promise<void>;
  replace(to: RouteLocationRaw): Promise<void>;
  go(delta: number): void;
  back(): void;
  forward(): void;
  
  beforeEach(guard: NavigationGuard): () => void;
  beforeResolve(guard: NavigationGuard): () => void;
  afterEach(hook: NavigationHookAfter): () => void;
  
  addRoute(parentName: string | symbol, route: RouteRecordRaw): () => void;
  addRoute(route: RouteRecordRaw): () => void;
  removeRoute(name: string | symbol): void;
  hasRoute(name: string | symbol): boolean;
  getRoutes(): RouteRecord[];
  
  resolve(to: RouteLocationRaw, from?: RouteLocationNormalized): RouteLocationNormalized;
  
  install(app: any): void;
}

// ============ 守卫相关类型 ============

export type NavigationGuardReturn = 
  | void 
  | boolean 
  | string 
  | RouteLocationRaw 
  | Error;

export type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => NavigationGuardReturn | Promise<NavigationGuardReturn>;

export type NavigationHookAfter = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => void;
```

### errors.ts：错误处理

```typescript
// src/errors.ts

export enum NavigationFailureType {
  aborted = 1,      // 导航被守卫中断
  cancelled = 2,    // 被新导航取消
  duplicated = 3    // 已经在目标路由
}

export interface NavigationFailure extends Error {
  type: NavigationFailureType;
  from: RouteLocationNormalized;
  to: RouteLocationNormalized;
}

export function createNavigationFailure(
  type: NavigationFailureType,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): NavigationFailure {
  const messages = {
    [NavigationFailureType.aborted]: 'Navigation aborted',
    [NavigationFailureType.cancelled]: 'Navigation cancelled',
    [NavigationFailureType.duplicated]: 'Navigation duplicated'
  };
  
  const error = new Error(messages[type]) as NavigationFailure;
  error.type = type;
  error.from = from;
  error.to = to;
  
  return error;
}

export function isNavigationFailure(
  error: any,
  type?: NavigationFailureType
): error is NavigationFailure {
  if (!(error instanceof Error)) return false;
  if (!('type' in error)) return false;
  
  if (type !== undefined) {
    return (error as NavigationFailure).type === type;
  }
  
  return true;
}
```

## 完整使用示例

整合完成后，使用方式与官方 Vue Router 几乎一致：

```typescript
// main.ts
import { createApp } from 'vue';
import { 
  createRouter, 
  createWebHistory,
  type RouteRecordRaw
} from 'mini-vue-router';
import App from './App.vue';

// 1. 定义路由配置
const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: () => import('./views/Home.vue'),
    meta: { title: '首页' }
  },
  {
    path: '/user/:id',
    name: 'User',
    component: () => import('./views/User.vue'),
    children: [
      {
        path: 'profile',
        name: 'UserProfile',
        component: () => import('./views/UserProfile.vue')
      },
      {
        path: 'posts',
        name: 'UserPosts',
        component: () => import('./views/UserPosts.vue')
      }
    ],
    beforeEnter: (to) => {
      // 路由独享守卫
      const userId = to.params.id;
      if (userId === 'admin') {
        return { name: 'Forbidden' };
      }
    }
  },
  {
    path: '/admin',
    name: 'Admin',
    component: () => import('./views/Admin.vue'),
    meta: { requiresAuth: true, role: 'admin' }
  },
  {
    path: '/login',
    name: 'Login',
    component: () => import('./views/Login.vue')
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: () => import('./views/NotFound.vue')
  }
];

// 2. 创建 Router 实例
const router = createRouter({
  history: createWebHistory('/'),
  routes,
  scrollBehavior(to, from, savedPosition) {
    // 处理锚点
    if (to.hash) {
      return { el: to.hash, behavior: 'smooth' };
    }
    // 浏览器后退时恢复位置
    if (savedPosition) {
      return savedPosition;
    }
    // 新导航滚动到顶部
    return { left: 0, top: 0 };
  }
});

// 3. 注册全局守卫
router.beforeEach(async (to, from) => {
  // 更新页面标题
  document.title = (to.meta.title as string) || 'Mini Vue Router';
  
  // 权限检查
  if (to.meta.requiresAuth) {
    const isAuthenticated = await checkAuth();
    if (!isAuthenticated) {
      return {
        name: 'Login',
        query: { redirect: to.fullPath }
      };
    }
  }
});

router.afterEach((to, from) => {
  // 记录页面访问
  console.log(`[Analytics] ${from.path} → ${to.path}`);
});

// 4. 挂载应用
const app = createApp(App);
app.use(router);
app.mount('#app');

// 辅助函数
async function checkAuth(): Promise<boolean> {
  // 实际项目中这里会检查 token 等
  return localStorage.getItem('token') !== null;
}
```

### 在组件中使用

```vue
<!-- views/User.vue -->
<script setup lang="ts">
import { useRouter, useRoute } from 'mini-vue-router';
import { computed, watch } from 'vue';

const router = useRouter();
const route = useRoute();

// 响应式获取路由参数
const userId = computed(() => route.params.id as string);

// 监听路由变化
watch(
  () => route.params.id,
  (newId, oldId) => {
    console.log(`用户 ID 从 ${oldId} 变为 ${newId}`);
    // 重新加载用户数据
    loadUserData(newId as string);
  }
);

// 导航方法
function goToProfile() {
  router.push({ name: 'UserProfile' });
}

function goBack() {
  router.back();
}

async function loadUserData(id: string) {
  // 加载用户数据...
}
</script>

<template>
  <div class="user-page">
    <h1>用户 {{ userId }}</h1>
    
    <!-- 嵌套路由导航 -->
    <nav>
      <router-link :to="{ name: 'UserProfile' }">个人资料</router-link>
      <router-link :to="{ name: 'UserPosts' }">文章列表</router-link>
    </nav>
    
    <!-- 嵌套路由出口 -->
    <router-view />
    
    <button @click="goBack">返回</button>
  </div>
</template>
```

## 核心模块回顾与联系

经过完整实现，让我们回顾各模块之间的关系：

**数据流向**：

```
用户操作 (点击链接 / 调用 push)
         ↓
    ┌─────────────────────────────────────┐
    │           createRouter              │
    │  ┌─────────────────────────────────┐│
    │  │  1. 标准化目标位置               ││
    │  │     normalizeLocation(to)       ││
    │  └────────────┬────────────────────┘│
    │               ↓                     │
    │  ┌─────────────────────────────────┐│
    │  │  2. 解析路由                     ││
    │  │     matcher.resolve(path)        ││
    │  │     → 匹配路由记录              ││
    │  │     → 提取参数                   ││
    │  └────────────┬────────────────────┘│
    │               ↓                     │
    │  ┌─────────────────────────────────┐│
    │  │  3. 执行守卫队列                 ││
    │  │     beforeEach → beforeEnter    ││
    │  │     → beforeResolve             ││
    │  └────────────┬────────────────────┘│
    │               ↓                     │
    │  ┌─────────────────────────────────┐│
    │  │  4. 更新 URL                     ││
    │  │     history.push(path)          ││
    │  └────────────┬────────────────────┘│
    │               ↓                     │
    │  ┌─────────────────────────────────┐│
    │  │  5. 更新响应式状态               ││
    │  │     currentRoute.value = ...    ││
    │  └────────────┬────────────────────┘│
    │               ↓                     │
    │  ┌─────────────────────────────────┐│
    │  │  6. 触发滚动行为                 ││
    │  │     scrollBehavior(to, from)    ││
    │  └────────────┬────────────────────┘│
    │               ↓                     │
    │  ┌─────────────────────────────────┐│
    │  │  7. 执行后置钩子                 ││
    │  │     afterEach(to, from)         ││
    │  └─────────────────────────────────┘│
    └─────────────────────────────────────┘
         ↓
    Vue 响应式系统自动触发 RouterView 重新渲染
```

## 代码统计与分析

**按模块统计**：

- **History 模块**：约 300 行
  - html5.ts: 120 行
  - hash.ts: 80 行
  - memory.ts: 60 行
  - common.ts: 40 行

- **Matcher 模块**：约 500 行
  - pathParser.ts: 150 行
  - pathMatcher.ts: 200 行
  - pathRanker.ts: 100 行
  - index.ts: 50 行

- **Guards 模块**：约 200 行
  - guardRunner.ts: 120 行
  - extractGuards.ts: 80 行

- **Router 核心**：约 400 行
  - router.ts: 400 行

- **组件**：约 300 行
  - RouterView.ts: 150 行
  - RouterLink.ts: 150 行

- **Composables**：约 100 行
  - useRouter.ts: 30 行
  - useRoute.ts: 70 行

- **类型与工具**：约 200 行
  - types.ts: 150 行
  - errors.ts: 50 行

**总计：约 2000 行**

**关键洞察**：

1. **Matcher 最复杂**：占 25% 的代码量，处理路径解析和匹配
2. **Router 是核心**：协调所有模块，约 20% 的代码量
3. **类型很重要**：200+ 行类型定义，提供完整的类型安全

## 运行测试

创建一个简单的测试用例验证实现：

```typescript
// test/router.test.ts
import { describe, it, expect, vi } from 'vitest';
import { createRouter, createMemoryHistory } from '../src';

describe('Mini Vue Router', () => {
  it('should navigate to a route', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/about', component: { template: '<div>About</div>' } }
      ]
    });
    
    expect(router.currentRoute.value.path).toBe('/');
    
    await router.push('/about');
    
    expect(router.currentRoute.value.path).toBe('/about');
  });
  
  it('should extract route params', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/user/:id', component: { template: '<div>User</div>' } }
      ]
    });
    
    await router.push('/user/123');
    
    expect(router.currentRoute.value.params.id).toBe('123');
  });
  
  it('should execute beforeEach guards', async () => {
    const guard = vi.fn();
    
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/protected', component: { template: '<div>Protected</div>' } }
      ]
    });
    
    router.beforeEach(guard);
    await router.push('/protected');
    
    expect(guard).toHaveBeenCalled();
    expect(guard.mock.calls[0][0].path).toBe('/protected');
  });
  
  it('should cancel navigation when guard returns false', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        { path: '/', component: { template: '<div>Home</div>' } },
        { path: '/protected', component: { template: '<div>Protected</div>' } }
      ]
    });
    
    router.beforeEach(() => false);
    await router.push('/protected');
    
    // 导航被取消，仍在首页
    expect(router.currentRoute.value.path).toBe('/');
  });
});
```

## 本章小结

完成 Mini Vue Router 的整合后，我们实现了一个功能完整的前端路由库：

**核心功能**：
- ✅ 三种 History 模式
- ✅ 动态路由与参数提取
- ✅ 嵌套路由支持
- ✅ 导航守卫系统
- ✅ Vue 组件集成
- ✅ Composition API

**设计原则**：
- **模块化**：每个模块职责单一，易于测试和维护
- **可扩展**：通过接口抽象，支持不同的实现
- **类型安全**：完整的 TypeScript 支持
- **与 Vue 解耦**：核心逻辑不依赖 Vue，组件层负责集成

下一章我们将对比官方实现，分析 Mini Vue Router 与 Vue Router 4 的差异。
