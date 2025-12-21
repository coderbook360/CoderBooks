# Router 插件机制与 install

Vue Router 如何与 Vue 应用集成？本章深入理解 Vue 3 插件系统，实现 Router 的 install 函数。

## Vue 插件系统的本质

首先要问一个问题：**为什么 Vue Router 需要通过插件机制集成？**

在 Vue 2 中，我们可以直接 `Vue.prototype.$router = router`。但这种方式有问题：

**全局污染**：
```javascript
// Vue 2 风格
Vue.prototype.$router = router;  // 污染全局原型
Vue.prototype.$route = route;
```

**缺点**：
- 破坏了封装性，所有 Vue 实例都被影响
- 不支持多应用实例
- 难以测试和隔离

**Vue 3 的改进**：引入了插件系统 + 依赖注入。

```typescript
// Vue 3 风格
const app = createApp(App);
app.use(router);  // 通过插件安装
```

**优势**：
- 每个应用实例独立
- 支持依赖注入，按需获取
- 更好的类型推导

## 插件接口设计

现在我要问第二个问题：**Vue 3 插件需要满足什么接口？**

```typescript
interface Plugin {
  install(app: App, ...options: any[]): void;
}

// 或者函数形式
type PluginFunction = (app: App, ...options: any[]) => void;
```

使用时：

```typescript
app.use(plugin, option1, option2);
// 等价于
plugin.install(app, option1, option2);
```

## Router 的 install 需要做什么？

让我们思考一下，Router 集成到 Vue 后，开发者期望：

1. **在模板中使用**：`<router-view />` 和 `<router-link />`
2. **在组合式 API 中使用**：`useRouter()` 和 `useRoute()`
3. **在选项式 API 中使用**：`this.$router` 和 `this.$route`
4. **响应式路由状态**：路由变化时组件自动更新

这意味着 install 需要：
- 全局注册组件
- 提供依赖注入
- 设置全局属性
- 初始化路由

## 从简单到完善：渐进式实现

### 版本 1：最简实现

```typescript
// src/router.ts

import type { App } from 'vue';
import type { Router } from './types';

export function install(app: App) {
  // 什么都不做
}

// 使用
const router: Router = {
  install
  // ...其他方法
};

app.use(router);
```

**问题**：
- ✗ 没有注册组件，`<router-view />` 无法使用
- ✗ 没有依赖注入，`useRouter()` 无法获取实例
- ✗ 没有全局属性，选项式 API 无法使用

### 版本 2：注册组件

```typescript
import { RouterView } from './components/RouterView';
import { RouterLink } from './components/RouterLink';

export function install(this: Router, app: App) {
  // 1. 全局注册组件
  app.component('RouterView', RouterView);  // 新增
  app.component('RouterLink', RouterLink);  // 新增
}
```

**改进**：
- ✓ 现在可以在模板中使用 `<router-view />` 和 `<router-link />`

**还有什么问题？**
- ✗ 组件内部如何获取 router 实例？
- ✗ 如何获取当前路由信息？

### 版本 3：依赖注入

```typescript
import { InjectionKey } from 'vue';

// 定义注入的 key
export const routerKey: InjectionKey<Router> = Symbol('router');
export const routeKey: InjectionKey<RouteLocationNormalizedLoaded> = Symbol('route');

export function install(this: Router, app: App) {
  const router = this;
  
  // 1. 全局注册组件
  app.component('RouterView', RouterView);
  app.component('RouterLink', RouterLink);
  
  // 2. 提供依赖注入  // 新增
  app.provide(routerKey, router);  // 新增
  app.provide(routeKey, router.currentRoute);  // 新增
}
```

**改进**：
- ✓ 组件可以通过 `inject(routerKey)` 获取 router
- ✓ 组件可以通过 `inject(routeKey)` 获取当前路由

**为什么使用 Symbol 而不是字符串？**
```typescript
// ❌ 字符串 key（不推荐）
app.provide('router', router);

// ✅ Symbol key（推荐）
app.provide(routerKey, router);
```

**Symbol 的优势**：
- 避免命名冲突
- 更好的类型推导（通过 `InjectionKey<T>`）
- 无法被外部意外覆盖

### 版本 4：支持选项式 API

```typescript
export function install(this: Router, app: App) {
  const router = this;
  
  app.component('RouterView', RouterView);
  app.component('RouterLink', RouterLink);
  
  app.provide(routerKey, router);
  app.provide(routeKey, router.currentRoute);
  
  // 3. 全局属性（兼容选项式 API）  // 新增
  Object.defineProperty(app.config.globalProperties, '$router', {  // 新增
    get() { return router; }  // 新增
  });  // 新增
  
  Object.defineProperty(app.config.globalProperties, '$route', {  // 新增
    get() { return router.currentRoute.value; }  // 新增
  });  // 新增
}
```

**改进**：
- ✓ 选项式 API 可以使用 `this.$router` 和 `this.$route`

**为什么使用 `Object.defineProperty` 而不是直接赋值？**

```typescript
// ❌ 直接赋值
app.config.globalProperties.$route = router.currentRoute.value;

// ✅ 使用 getter
Object.defineProperty(app.config.globalProperties, '$route', {
  get() { return router.currentRoute.value; }
});
```

**原因**：
- `currentRoute` 是一个 `Ref`，它的 `.value` 会变化
- 直接赋值只会获取一次值，后续路由变化不会更新
- 使用 getter 每次访问时动态获取最新值

### 版本 5：防止重复安装

```typescript
export function install(this: Router, app: App) {
  const router = this;
  
  // 0. 防止重复安装  // 新增
  if (app.config.globalProperties.$router) {  // 新增
    console.warn('Router 已经安装，请勿重复调用 app.use(router)');  // 新增
    return;  // 新增
  }  // 新增
  
  app.component('RouterView', RouterView);
  app.component('RouterLink', RouterLink);
  
  app.provide(routerKey, router);
  app.provide(routeKey, router.currentRoute);
  
  Object.defineProperty(app.config.globalProperties, '$router', {
    get() { return router; }
  });
  
  Object.defineProperty(app.config.globalProperties, '$route', {
    get() { return router.currentRoute.value; }
  });
}
```

**改进**：
- ✓ 避免开发者意外调用两次 `app.use(router)`
- ✓ 提供友好的警告信息

### 版本 6：完整实现（初始导航）

```typescript
export function install(this: Router, app: App) {
  const router = this;
  
  // 防止重复安装
  if (app.config.globalProperties.$router) {
    return;
  }
  
  // 注册组件
  app.component('RouterView', RouterView);
  app.component('RouterLink', RouterLink);
  
  // 依赖注入
  app.provide(routerKey, router);
  app.provide(routeKey, router.currentRoute);
  
  // 全局属性
  Object.defineProperty(app.config.globalProperties, '$router', {
    get() { return router; }
  });
  
  Object.defineProperty(app.config.globalProperties, '$route', {
    get() { return router.currentRoute.value; }
  });
  
  // 4. 初始导航  // 新增
  const initialLocation = router.history.location || '/';  // 新增
  router.push(initialLocation);  // 新增
}
```

**改进**：
- ✓ 应用启动时自动进行首次导航
- ✓ 确保页面加载时路由状态正确

**为什么需要初始导航？**

```typescript
// 浏览器访问 /user/123
// 如果没有初始导航：
router.currentRoute.value.path === '/'  // ❌ 错误

// 有了初始导航：
router.currentRoute.value.path === '/user/123'  // ✅ 正确
```

## 完整代码

```typescript
// src/router.ts

import type { App } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from './types';
import { RouterView } from './components/RouterView';
import { RouterLink } from './components/RouterLink';
import { InjectionKey } from 'vue';

// 依赖注入 key
export const routerKey: InjectionKey<Router> = Symbol('router');
export const routeKey: InjectionKey<RouteLocationNormalizedLoaded> = Symbol('route');

export function install(this: Router, app: App) {
  const router = this;
  
  // 防止重复安装
  if (app.config.globalProperties.$router) {
    console.warn('Router 已经安装，请勿重复调用 app.use(router)');
    return;
  }
  
  // 1. 全局注册组件
  app.component('RouterView', RouterView);
  app.component('RouterLink', RouterLink);
  
  // 2. 提供依赖注入（用于 Composition API）
  app.provide(routerKey, router);
  app.provide(routeKey, router.currentRoute);
  
  // 3. 全局属性（用于 Options API）
  Object.defineProperty(app.config.globalProperties, '$router', {
    get: () => router
  });
  
  Object.defineProperty(app.config.globalProperties, '$route', {
    get: () => router.currentRoute.value
  });
  
  // 4. 初始导航
  if (router.history.location) {
    router.push(router.history.location);
  }
}
```

## 权衡与设计决策

**1. 为什么不在 createRouter 时自动初始化？**

```typescript
// ❌ 自动初始化
export function createRouter(options) {
  const router = { /* ... */ };
  router.push(history.location);  // 太早了
  return router;
}

// ✅ 在 install 时初始化
export function createRouter(options) {
  const router = {
    install(app) {
      router.push(history.location);  // 时机正确
    }
  };
  return router;
}
```

**原因**：
- `createRouter` 时 Vue 应用还未创建，无法渲染组件
- `install` 时 Vue 应用已经创建，可以安全导航

**2. 为什么既支持依赖注入又支持全局属性？**

```typescript
// Composition API
const router = useRouter();  // 使用依赖注入

// Options API
this.$router.push('/home');  // 使用全局属性
```

**原因**：
- 兼容两种 API 风格
- 让用户平滑迁移
- 不同场景选择更方便的方式

**3. 依赖注入 vs 全局状态管理**

```typescript
// ❌ 全局状态
import { globalRouter } from 'vue-router';
const router = globalRouter;

// ✅ 依赖注入
const router = useRouter();
```

**依赖注入的优势**：
- 支持多应用实例
- 更好的测试性（可以注入 mock）
- 避免全局污染
- 符合依赖反转原则

## 实战场景

### 场景1：单元测试中注入 Mock Router

```typescript
import { mount } from '@vue/test-utils';
import { routerKey } from 'vue-router';

const mockRouter = {
  push: vi.fn(),
  currentRoute: ref({ path: '/home' })
};

const wrapper = mount(MyComponent, {
  global: {
    provide: {
      [routerKey]: mockRouter  // 注入 mock
    }
  }
});
```

### 场景2：多个独立应用共存

```typescript
// 应用1
const app1 = createApp(App1);
const router1 = createRouter({ /* ... */ });
app1.use(router1);

// 应用2
const app2 = createApp(App2);
const router2 = createRouter({ /* ... */ });
app2.use(router2);

// 两个 router 完全隔离
```

### 场景3：条件注册组件

```typescript
export function install(this: Router, app: App, options?: InstallOptions) {
  // 可选：不注册全局组件
  if (options?.registerComponents !== false) {
    app.component('RouterView', RouterView);
    app.component('RouterLink', RouterLink);
  }
  
  // 其他注册...
}
```

## 常见陷阱

### 陷阱1：在 createRouter 时访问 app

```typescript
// ❌ 错误
export function createRouter(app: App, options) {
  app.component('RouterView', RouterView);  // app 还不存在
}

// ✅ 正确
export function createRouter(options) {
  return {
    install(app) {
      app.component('RouterView', RouterView);  // app 已存在
    }
  };
}
```

### 陷阱2：忘记 getter 导致路由不更新

```typescript
// ❌ 错误
app.config.globalProperties.$route = router.currentRoute.value;

// ✅ 正确
Object.defineProperty(app.config.globalProperties, '$route', {
  get: () => router.currentRoute.value
});
```

### 陷阱3：重复安装导致内存泄漏

```typescript
// ❌ 错误
app.use(router);
app.use(router);  // 重复安装

// ✅ 在 install 中防御
if (app.config.globalProperties.$router) {
  return;  // 防止重复安装
}
```

## 小结

本章实现了 Router 的 install 函数，核心思想：

**插件系统**：
- Vue 3 插件通过 `install(app)` 方法集成
- 支持依赖注入和全局属性两种方式
- 每个应用实例独立，避免全局污染

**install 的职责**：
1. 注册全局组件（RouterView、RouterLink）
2. 提供依赖注入（useRouter、useRoute）
3. 设置全局属性（this.$router、this.$route）
4. 执行初始导航

**设计权衡**：
- 依赖注入优于全局状态
- getter 确保响应式
- 防御性编程避免重复安装

**实战价值**：
- 理解 Vue 3 插件系统
- 掌握依赖注入模式
- 知道如何测试和 mock

下一章实现依赖注入与 provide/inject 的深入原理。
