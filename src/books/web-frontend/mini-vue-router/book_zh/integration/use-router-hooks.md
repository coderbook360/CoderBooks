# useRouter 与 useRoute 实现

深入 `useRouter()` 和 `useRoute()` 的实现细节，理解 Composition API 的内部机制。

## 实现目标

首先要问一个问题：**这两个 Hook 需要实现什么功能？**

**useRouter 目标**：
- 获取 router 实例
- 类型安全
- 错误提示友好
- 只能在组件中调用

**useRoute 目标**：
- 获取当前路由
- 响应式更新
- 类型安全
- 返回只读对象

## useRouter 完整实现

```typescript
// src/useApi.ts

import { inject, getCurrentInstance } from 'vue';
import { routerKey } from './injectionSymbols';
import type { Router } from './types';

/**
 * 获取 Router 实例
 * 
 * @returns Router 实例
 * @throws {Error} 如果在组件外调用或未安装 router
 * 
 * @example
 * ```ts
 * const router = useRouter();
 * router.push('/home');
 * ```
 */
export function useRouter(): Router {
  // 1. 检查是否在组件上下文中
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error(
      'useRouter() must be called inside setup() or a lifecycle hook.'
    );
  }
  
  // 2. 注入 router
  const router = inject(routerKey);
  
  // 3. 检查是否已安装
  if (!router) {
    throw new Error(
      'useRouter() is called without provider. ' +
      'Make sure to call app.use(router) before using useRouter().'
    );
  }
  
  return router;
}
```

**关键点**：

1. **getCurrentInstance() 检查**：
```typescript
const instance = getCurrentInstance();
if (!instance) {
  throw new Error('must be called inside setup()');
}
```

确保只能在组件上下文中调用，避免：
```typescript
// ❌ 错误
const router = useRouter();  // 模块作用域

export default {
  setup() {
    router.push('/');  // router 为 undefined
  }
};
```

2. **inject 获取 router**：
```typescript
const router = inject(routerKey);
```

从组件树向上查找 router。

3. **友好的错误提示**：
```typescript
if (!router) {
  throw new Error('Make sure to call app.use(router)...');
}
```

告诉开发者如何修复问题。

## useRoute 完整实现

```typescript
import { inject, getCurrentInstance, unref } from 'vue';
import { routeKey } from './injectionSymbols';
import type { RouteLocationNormalizedLoaded } from './types';

/**
 * 获取当前路由（响应式）
 * 
 * @returns 当前路由对象（响应式）
 * @throws {Error} 如果在组件外调用或未安装 router
 * 
 * @example
 * ```ts
 * const route = useRoute();
 * console.log(route.path);  // 响应式访问
 * 
 * watchEffect(() => {
 *   console.log('路径变化:', route.path);
 * });
 * ```
 */
export function useRoute(): RouteLocationNormalizedLoaded {
  // 1. 检查组件上下文
  const instance = getCurrentInstance();
  if (!instance) {
    throw new Error(
      'useRoute() must be called inside setup() or a lifecycle hook.'
    );
  }
  
  // 2. 注入 route
  const route = inject(routeKey);
  
  // 3. 检查是否已安装
  if (!route) {
    throw new Error(
      'useRoute() is called without provider. ' +
      'Make sure to call app.use(router) before using useRoute().'
    );
  }
  
  // 4. 返回响应式对象（Ref）
  return route;
}
```

**为什么返回 Ref？**

```typescript
// install 时提供的是 Ref
app.provide(routeKey, router.currentRoute);  // currentRoute 是 Ref<RouteLocation>

// useRoute 返回这个 Ref
const route = useRoute();  // Ref<RouteLocation>

// 可以直接访问 .value 的属性（自动解包）
route.path  // 等价于 route.value.path
```

**响应式原理**：

```typescript
// router 内部
const currentRoute = ref<RouteLocation>({
  path: '/',
  // ...
});

// 导航时更新
function push(to) {
  // ...
  currentRoute.value = newRoute;  // 触发响应式更新
}

// 组件中自动响应
const route = useRoute();
watchEffect(() => {
  console.log(route.path);  // 路由变化时自动执行
});
```

## 类型定义

```typescript
// types.ts

import type { Ref } from 'vue';

/**
 * 当前路由对象（已加载）
 */
export interface RouteLocationNormalizedLoaded {
  readonly path: string;
  readonly fullPath: string;
  readonly name: string | symbol | null | undefined;
  readonly params: Record<string, string | string[]>;
  readonly query: Record<string, string | string[]>;
  readonly hash: string;
  readonly meta: Record<string, any>;
  readonly matched: RouteRecordNormalized[];
}

/**
 * Router 实例类型
 */
export interface Router {
  readonly currentRoute: Ref<RouteLocationNormalizedLoaded>;
  push(to: RouteLocationRaw): Promise<void>;
  replace(to: RouteLocationRaw): Promise<void>;
  go(delta: number): void;
  back(): void;
  forward(): void;
  // ...
}
```

## 实战场景

### 场景1：监听路由变化

```vue-html
<script setup>
import { watchEffect } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// 方式1：watchEffect
watchEffect(() => {
  console.log('当前路径:', route.path);
  console.log('查询参数:', route.query);
});

// 方式2：watch 特定属性
watch(() => route.params.id, (newId, oldId) => {
  console.log(`用户ID从 ${oldId} 变为 ${newId}`);
});
</script>
```

### 场景2：计算属性

```vue-html
<script setup>
import { computed } from 'vue';
import { useRoute } from 'vue-router';

const route = useRoute();

// 基于路由的计算属性
const userId = computed(() => route.params.id);
const isDetailPage = computed(() => route.name === 'UserDetail');
const breadcrumbs = computed(() => {
  return route.matched.map(r => r.meta.title);
});
</script>
```

### 场景3：条件渲染

```vue-html
<template>
  <nav>
    <router-link to="/">首页</router-link>
    <router-link v-if="route.meta.showAdmin" to="/admin">管理</router-link>
  </nav>
</template>

<script setup>
import { useRoute } from 'vue-router';

const route = useRoute();
</script>
```

### 场景4：编程式导航

```vue-html
<script setup>
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

function handleEdit() {
  // 跳转到编辑页，保留当前查询参数
  router.push({
    name: 'UserEdit',
    params: { id: route.params.id },
    query: route.query  // 保留查询参数
  });
}

function handleBack() {
  router.go(-1);
}
</script>
```

### 场景5：组合可复用逻辑

```typescript
// composables/useUserRoute.ts

import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

export function useUserRoute() {
  const route = useRoute();
  const router = useRouter();
  
  const userId = computed(() => route.params.id as string);
  const userIdNumber = computed(() => parseInt(userId.value, 10));
  
  function goToUserProfile() {
    router.push({ name: 'UserProfile', params: { id: userId.value } });
  }
  
  function goToUserPosts() {
    router.push({ name: 'UserPosts', params: { id: userId.value } });
  }
  
  return {
    userId,
    userIdNumber,
    goToUserProfile,
    goToUserPosts
  };
}
```

## 常见陷阱

### 陷阱1：在模块作用域调用

```typescript
// ❌ 错误
const router = useRouter();  // undefined，没有组件上下文

export default {
  setup() {
    router.push('/');  // 报错
  }
};

// ✅ 正确
export default {
  setup() {
    const router = useRouter();  // 在 setup 内调用
    router.push('/');
  }
};
```

### 陷阱2：忘记 .value

```typescript
// ❌ 错误（对于 Ref）
const route = inject(routeKey);
console.log(route.path);  // undefined，应该用 route.value.path

// ✅ 正确（useRoute 自动解包）
const route = useRoute();
console.log(route.path);  // 自动解包，正确
```

### 陷阱3：修改路由对象

```typescript
// ❌ 错误
const route = useRoute();
route.params.id = '123';  // 不应该直接修改

// ✅ 正确
const router = useRouter();
router.push({ params: { id: '123' } });  // 通过 router 导航
```

## 小结

本章详细实现了 `useRouter()` 和 `useRoute()`：

**核心实现**：
- 使用 `getCurrentInstance()` 检查组件上下文
- 使用 `inject()` 从组件树获取实例
- 返回类型安全的对象
- 提供友好的错误提示

**响应式机制**：
- `useRoute()` 返回 Ref
- 路由变化时自动触发更新
- 可以在 computed、watch 中使用

**实战价值**：
- 理解 Composition API 的内部机制
- 掌握依赖注入的最佳实践
- 学会创建可复用的路由逻辑
- 避免常见陷阱

至此，Vue 集成（第28-33章）全部完成！下一部分实现高级特性（第34-37章）：滚动行为、路由元信息、命名视图、重定向与别名。
