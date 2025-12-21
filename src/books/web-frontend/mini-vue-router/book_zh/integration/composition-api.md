# Composition API 集成

Composition API 是 Vue 3 的核心特性。本章实现完整的路由 Composition API，包括 `useRouter()`、`useRoute()` 和 `useLink()`。

## Composition API 的优势

首先要问一个问题：**为什么 Composition API 更适合路由？**

### Options API 的局限

```vue
<script>
export default {
  data() {
    return {
      userId: this.$route.params.id
    };
  },
  watch: {
    '$route.params.id'(newId) {
      this.userId = newId;
    }
  },
  methods: {
    goHome() {
      this.$router.push('/');
    }
  }
};
</script>
```

**问题**：
- 逻辑分散在不同选项中
- 无法抽取复用
- 类型推导困难

### Composition API 的改进

```vue
<script setup>
import { computed } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const router = useRouter();
const route = useRoute();

const userId = computed(() => route.params.id);

function goHome() {
  router.push('/');
}
</script>
```

**优势**：
- 逻辑集中，易于理解
- 可以抽取为可复用的 Hook
- 完美的 TypeScript 支持

## 核心 API 实现

### useRouter 实现

```typescript
// src/useApi.ts

import { inject } from 'vue';
import { routerKey } from './injectionSymbols';
import type { Router } from './types';

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
```

**为什么不能在 setup 外调用？**

```typescript
// ❌ 错误
const router = useRouter();  // 模块作用域

export default {
  setup() {
    // ...
  }
};

// ✅ 正确
export default {
  setup() {
    const router = useRouter();  // setup 内
  }
};
```

**原因**：
- `inject()` 依赖当前组件实例
- 只有在 setup 或生命周期中才有组件实例

### useRoute 实现

```typescript
import { inject } from 'vue';
import { routeKey } from './injectionSymbols';
import type { RouteLocationNormalizedLoaded } from './types';

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

**响应式特性**：

```vue
<script setup>
const route = useRoute();

// 自动响应式
watchEffect(() => {
  console.log('当前路径:', route.path);  // 路由变化时自动执行
});

const userId = computed(() => route.params.id);  // 自动响应式
</script>
```

## 高级 Hook：useLink

`useLink` 用于创建自定义导航组件：

```typescript
import { computed } from 'vue';
import type { RouteLocationRaw } from './types';

export interface UseLinkOptions {
  to: RouteLocationRaw;
  replace?: boolean;
}

export function useLink(options: UseLinkOptions) {
  const router = useRouter();
  const route = useRoute();
  
  // 解析目标路由
  const targetLocation = computed(() => {
    return router.resolve(options.to);
  });
  
  // 是否激活
  const isActive = computed(() => {
    const current = route.path;
    const target = targetLocation.value.path;
    return current.startsWith(target);
  });
  
  // 是否精确激活
  const isExactActive = computed(() => {
    return route.fullPath === targetLocation.value.fullPath;
  });
  
  // 导航函数
  const navigate = (e?: MouseEvent) => {
    if (e) {
      // 处理特殊按键
      if (e.metaKey || e.altKey || e.ctrlKey || e.shiftKey || e.button !== 0) {
        return;
      }
      e.preventDefault();
    }
    
    const method = options.replace ? 'replace' : 'push';
    return router[method](options.to);
  };
  
  return {
    href: computed(() => targetLocation.value.fullPath),
    targetLocation,
    isActive,
    isExactActive,
    navigate
  };
}
```

**使用 useLink 创建自定义导航**：

```vue
<script setup>
import { useLink } from 'vue-router';

const props = defineProps<{
  to: string;
}>();

const { href, isActive, navigate } = useLink({ to: props.to });
</script>

<template>
  <button
    @click="navigate"
    :class="{ active: isActive }"
  >
    <slot />
  </button>
</template>
```

## 实战场景

### 场景1：响应式路由参数

```vue
<script setup>
import { watchEffect } from 'vue';
import { useRoute, useRouter } from 'vue-router';

const route = useRoute();
const router = useRouter();

// 监听路由参数变化
watchEffect(async () => {
  const userId = route.params.id;
  if (userId) {
    await loadUserData(userId);
  }
});

async function loadUserData(id) {
  // 加载数据...
}
</script>
```

### 场景2：编程式导航

```vue
<script setup>
import { useRouter } from 'vue-router';

const router = useRouter();

function handleLogin() {
  // 登录成功后跳转
  router.push({ name: 'Dashboard' });
}

function handleLogout() {
  // 登出后替换历史记录
  router.replace('/login');
}
</script>
```

### 场景3：可复用的导航 Hook

```typescript
// composables/useNavigation.ts

import { useRouter } from 'vue-router';

export function useNavigation() {
  const router = useRouter();
  
  function goBack() {
    router.go(-1);
  }
  
  function goHome() {
    router.push('/');
  }
  
  function goToUser(id: string) {
    router.push({ name: 'User', params: { id } });
  }
  
  return {
    goBack,
    goHome,
    goToUser
  };
}
```

```vue
<script setup>
import { useNavigation } from '@/composables/useNavigation';

const { goBack, goHome, goToUser } = useNavigation();
</script>
```

### 场景4：路由守卫 Hook

```typescript
// composables/useRouteGuard.ts

import { onBeforeRouteLeave, onBeforeRouteUpdate } from 'vue-router';
import { ref } from 'vue';

export function useUnsavedChangesGuard() {
  const hasUnsavedChanges = ref(false);
  
  onBeforeRouteLeave((to, from) => {
    if (hasUnsavedChanges.value) {
      const answer = window.confirm('有未保存的更改，确定离开吗？');
      if (!answer) return false;
    }
  });
  
  return { hasUnsavedChanges };
}
```

## 完整 API 导出

```typescript
// src/index.ts

export {
  useRouter,
  useRoute,
  useLink,
  onBeforeRouteLeave,
  onBeforeRouteUpdate
} from './useApi';
```

## 小结

本章实现了完整的 Composition API 集成：

**核心 API**：
- `useRouter()`：获取 router 实例
- `useRoute()`：获取当前路由（响应式）
- `useLink()`：创建自定义导航组件

**设计要点**：
- 必须在 setup 或生命周期中调用
- 通过依赖注入获取实例
- 返回响应式对象
- fail-fast 错误处理

**实战价值**：
- 逻辑集中，易于理解和维护
- 可以抽取为可复用 Hook
- 完美的 TypeScript 支持
- 符合 Vue 3 最佳实践

下一章详细实现 `useRouter()` 和 `useRoute()` 的内部机制。

下一章实现 useRouter 和 useRoute 的详细功能。
