# 依赖注入与 provide/inject

依赖注入是现代框架的核心设计模式。本章深入理解 Vue 3 的 provide/inject，以及 Router 如何利用它实现优雅的依赖管理。

## 依赖注入的动机

首先要问一个问题：**为什么需要依赖注入？**

### 传统方案：全局导入

```typescript
// router/index.ts
export const router = createRouter({ /* ... */ });

// MyComponent.vue
import { router } from '@/router';

export default {
  setup() {
    router.push('/home');  // 直接使用全局 router
  }
}
```

**问题**：
- **紧耦合**：组件直接依赖具体的 router 实例
- **难以测试**：无法注入 mock router
- **不支持多实例**：多个 Vue 应用无法使用不同 router
- **循环依赖风险**：router 可能依赖组件，组件又导入 router

### 依赖注入方案

```typescript
// MyComponent.vue
import { useRouter } from 'vue-router';

export default {
  setup() {
    const router = useRouter();  // 从上下文获取
    router.push('/home');
  }
}
```

**优势**：
- **解耦**：组件不知道 router 从哪来
- **可测试**：可以注入 mock
- **支持多实例**：每个应用有自己的 router
- **符合依赖反转原则**

## Vue 3 的 provide/inject 机制

现在我要问第二个问题：**provide/inject 是如何工作的？**

### 基本使用

```typescript
import { provide, inject, InjectionKey } from 'vue';

// 1. 定义类型安全的 key
const CountKey: InjectionKey<number> = Symbol('count');

// 2. 祖先组件提供
provide(CountKey, 42);

// 3. 后代组件注入
const count = inject(CountKey);  // count: number | undefined
```

### 工作原理

Vue 3 在内部维护一个**provides 树**，每个组件实例有自己的 provides 对象：

```typescript
// 简化的内部实现
interface ComponentInternalInstance {
  provides: Record<string | symbol, any>;
  parent: ComponentInternalInstance | null;
}

function provide(key, value) {
  const instance = getCurrentInstance();
  instance.provides[key] = value;
}

function inject(key, defaultValue?) {
  let instance = getCurrentInstance();
  
  // 向上查找
  while (instance) {
    if (key in instance.provides) {
      return instance.provides[key];
    }
    instance = instance.parent;
  }
  
  return defaultValue;
}
```

**关键机制**：
- **向上查找**：从当前组件开始，沿着父链向上查找
- **就近原则**：返回最近的提供者
- **原型链优化**：实际实现使用原型链而非循环查找

## InjectionKey 的作用

**为什么需要 `InjectionKey<T>`？**

### 方案1：字符串 key（❌ 不推荐）

```typescript
// 提供
provide('router', router);

// 注入
const router = inject('router');  // router: unknown
```

**问题**：
- 类型丢失，需要手动断言
- 容易拼写错误
- 命名冲突风险

### 方案2：Symbol key（✓ 推荐）

```typescript
const routerKey = Symbol('router');

provide(routerKey, router);
const router = inject(routerKey);  // router: unknown
```

**改进**：
- 避免命名冲突
- 但类型仍然丢失

### 方案3：InjectionKey（✓✓ 最佳实践）

```typescript
import { InjectionKey } from 'vue';

const routerKey: InjectionKey<Router> = Symbol('router');

provide(routerKey, router);
const router = inject(routerKey);  // router: Router | undefined
```

**优势**：
- **类型安全**：TypeScript 可以推导出正确类型
- **避免冲突**：Symbol 的唯一性
- **自文档化**：类型即文档

**InjectionKey 的定义**：

```typescript
// vue/packages/runtime-core/src/apiInject.ts
export interface InjectionKey<T> extends Symbol {}
```

它只是一个带泛型的 Symbol，用于类型推导。

## Router 的依赖注入实现

### 定义 Injection Keys

```typescript
// src/injectionSymbols.ts

import { InjectionKey } from 'vue';
import type { Router, RouteLocationNormalizedLoaded } from './types';

/**
 * Router 实例的注入 key
 * 用于 useRouter() 获取 router
 */
export const routerKey: InjectionKey<Router> = Symbol(
  __DEV__ ? 'router' : ''
);

/**
 * 当前路由的注入 key
 * 用于 useRoute() 获取当前路由
 */
export const routeKey: InjectionKey<RouteLocationNormalizedLoaded> = Symbol(
  __DEV__ ? 'route' : ''
);

/**
 * RouterView 深度的注入 key
 * 用于嵌套 RouterView 计算深度
 */
export const routerViewDepthKey: InjectionKey<number> = Symbol(
  __DEV__ ? 'routerViewDepth' : ''
);
```

**为什么 Symbol 描述在生产环境是空字符串？**

```typescript
Symbol(__DEV__ ? 'router' : '')
```

**原因**：
- 开发环境：方便调试，Symbol 描述显示为 `Symbol(router)`
- 生产环境：减少包体积，描述被移除

### 在 install 中提供

```typescript
// src/router.ts

import { routerKey, routeKey } from './injectionSymbols';

export function install(this: Router, app: App) {
  const router = this;
  
  // 提供 router 和 route
  app.provide(routerKey, router);
  app.provide(routeKey, router.currentRoute);
  
  // ...其他注册
}
```

**思考：为什么提供 `router.currentRoute` 而不是 `router.currentRoute.value`？**

```typescript
// ❌ 错误
app.provide(routeKey, router.currentRoute.value);

// ✅ 正确
app.provide(routeKey, router.currentRoute);
```

**原因**：
- `currentRoute` 是 `Ref<RouteLocation>`
- 提供 Ref 本身，注入者可以响应式地访问 `.value`
- 如果提供 `.value`，只是快照，路由变化时不会更新

### 实现 useRouter 和 useRoute

```typescript
// src/useApi.ts

import { inject } from 'vue';
import { routerKey, routeKey } from './injectionSymbols';
import type { Router, RouteLocationNormalizedLoaded } from './types';

/**
 * 获取 Router 实例
 * 必须在 setup() 或组件生命周期中调用
 */
export function useRouter(): Router {
  const router = inject(routerKey);
  
  if (!router) {
    throw new Error(
      'useRouter() is called without provider. ' +
      'Make sure to call app.use(router) before using useRouter().'
    );
  }
  
  return router;
}

/**
 * 获取当前路由（响应式）
 * 必须在 setup() 或组件生命周期中调用
 */
export function useRoute(): RouteLocationNormalizedLoaded {
  const route = inject(routeKey);
  
  if (!route) {
    throw new Error(
      'useRoute() is called without provider. ' +
      'Make sure to call app.use(router) before using useRoute().'
    );
  }
  
  return route;
}
```

**为什么要抛出错误而不是返回 undefined？**

```typescript
// ❌ 返回 undefined
export function useRouter(): Router | undefined {
  return inject(routerKey);
}

// ✅ 抛出错误
export function useRouter(): Router {
  const router = inject(routerKey);
  if (!router) throw new Error('...');
  return router;
}
```

**原因**：
- **fail-fast 原则**：尽早发现错误
- **类型安全**：返回类型是 `Router` 而不是 `Router | undefined`
- **友好提示**：告诉开发者如何修复

## 依赖注入的高级用法

### 用法1：默认值

```typescript
export function useRouter(): Router {
  return inject(routerKey) ?? createDefaultRouter();
}
```

**适用场景**：
- 测试环境自动提供 mock
- 渐进式采用，非 Router 应用也能工作

**权衡**：
- 隐藏了配置错误
- 可能导致难以调试的问题

### 用法2：应用级 provide

```typescript
// 全局提供
app.provide(configKey, { theme: 'dark' });

// 任何组件都可以注入
const config = inject(configKey);
```

### 用法3：组件级 provide

```typescript
// Parent.vue
export default {
  setup() {
    provide(userKey, currentUser);
  }
}

// Child.vue
export default {
  setup() {
    const user = inject(userKey);  // 只能注入父组件提供的
  }
}
```

## 权衡与设计决策

### 1. provide/inject vs props

```typescript
// ❌ 使用 props 传递 router
<MyComponent :router="router" />

// ✅ 使用 inject
const router = useRouter();
```

**inject 的优势**：
- 不需要在每层组件传递 props
- 中间组件不需要知道 router 的存在
- 避免 props drilling 问题

**props 的优势**：
- 更明确，依赖关系一目了然
- 更容易追踪数据流

**选择**：
- 框架级依赖（router、i18n）：用 inject
- 业务数据：优先用 props

### 2. Symbol vs 字符串

```typescript
// ❌ 字符串
const key = 'router';

// ✅ Symbol
const key = Symbol('router');
```

**Symbol 的优势**：
- 唯一性，不会冲突
- 无法被意外覆盖
- 配合 InjectionKey 有完美类型推导

### 3. 应用级 vs 组件级 provide

```typescript
// 应用级
app.provide(routerKey, router);

// 组件级
provide(routerKey, router);
```

**应用级的适用场景**：
- 全局单例（router、store）
- 应用配置

**组件级的适用场景**：
- 局部状态
- 组件树的上下文

## 实战场景

### 场景1：单元测试注入 Mock

```typescript
import { mount } from '@vue/test-utils';
import { routerKey } from 'vue-router';
import { vi } from 'vitest';

describe('MyComponent', () => {
  it('navigates on click', async () => {
    const mockRouter = {
      push: vi.fn()
    };
    
    const wrapper = mount(MyComponent, {
      global: {
        provide: {
          [routerKey]: mockRouter  // 注入 mock
        }
      }
    });
    
    await wrapper.find('button').trigger('click');
    
    expect(mockRouter.push).toHaveBeenCalledWith('/home');
  });
});
```

### 场景2：多应用实例隔离

```typescript
// 微前端场景：主应用
const mainApp = createApp(MainApp);
const mainRouter = createRouter({ /* ... */ });
mainApp.use(mainRouter);

// 微前端场景：子应用
const subApp = createApp(SubApp);
const subRouter = createRouter({ /* ... */ });
subApp.use(subRouter);

// 两个 router 完全隔离，不会互相影响
```

### 场景3：条件注入

```typescript
export function useRouter(): Router | null {
  // 不抛出错误，允许组件在非 Router 环境工作
  return inject(routerKey, null);
}

// 使用
const router = useRouter();
if (router) {
  router.push('/home');  // 只在 Router 环境执行
}
```

## 常见陷阱

### 陷阱1：在 setup 外调用 inject

```typescript
// ❌ 错误
const router = useRouter();

export default {
  setup() {
    // router 已经在模块作用域获取，可能为 undefined
  }
}

// ✅ 正确
export default {
  setup() {
    const router = useRouter();  // 在 setup 内调用
  }
}
```

### 陷阱2：provide 非响应式的 .value

```typescript
// ❌ 错误
app.provide(routeKey, router.currentRoute.value);

// ✅ 正确
app.provide(routeKey, router.currentRoute);
```

### 陷阱3：忘记类型标注

```typescript
// ❌ 类型丢失
const routerKey = Symbol('router');
const router = inject(routerKey);  // unknown

// ✅ 类型安全
const routerKey: InjectionKey<Router> = Symbol('router');
const router = inject(routerKey);  // Router | undefined
```

## 小结

本章深入理解了依赖注入与 provide/inject：

**核心概念**：
- **依赖注入**：解耦组件与依赖，提高可测试性和灵活性
- **provide/inject**：Vue 3 的依赖注入机制，支持向上查找
- **InjectionKey**：类型安全的注入 key，避免类型丢失

**Router 的实现**：
1. 定义 `routerKey` 和 `routeKey`
2. 在 `install` 中 `app.provide`
3. 提供 `useRouter()` 和 `useRoute()` API

**设计权衡**：
- inject 优于全局导入（解耦、可测试）
- Symbol 优于字符串（唯一性、类型安全）
- 抛出错误优于返回 undefined（fail-fast）
- provide Ref 优于 .value（响应式）

**实战价值**：
- 理解依赖注入的动机和优势
- 掌握 Vue 3 provide/inject 的原理
- 学会设计类型安全的注入系统
- 知道如何在测试中注入 mock

下一章实现 RouterLink 组件，利用依赖注入获取 router 实例。
