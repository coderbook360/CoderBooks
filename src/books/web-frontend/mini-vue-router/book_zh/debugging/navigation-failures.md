# 导航失败处理

导航失败是路由系统中常见的情况。本章实现完整的失败检测和处理机制。

## 导航失败的场景

首先要问一个问题：**什么情况下会导航失败？**

### 常见场景

1. **用户取消**：
```typescript
router.beforeEach((to, from) => {
  const confirmed = window.confirm('确定离开？');
  if (!confirmed) {
    return false;  // 取消导航
  }
});
```

2. **权限不足**：
```typescript
router.beforeEach((to, from) => {
  if (to.meta.requiresAuth && !isLoggedIn()) {
    return '/login';  // 重定向
  }
});
```

3. **重复导航**：
```typescript
await router.push('/home');
await router.push('/home');  // 已在目标路由
```

4. **路由未找到**：
```typescript
await router.push('/non-existent');  // 404
```

## 失败检测实现

### 版本 1：基础检测

```typescript
// src/navigationFailures.ts

import { NavigationFailure } from './errors/NavigationFailure';
import { ErrorTypes } from './errors/errorTypes';

/**
 * 判断是否为导航失败
 */
export function isNavigationFailure(
  error: any,
  type?: ErrorTypes
): error is NavigationFailure {
  return (
    error instanceof NavigationFailure &&
    (type === undefined || error.type === type)
  );
}
```

### 版本 2：失败回调

```typescript
// src/router.ts

type NavigationFailureHandler = (failure: NavigationFailure) => void;

const failureHandlers: NavigationFailureHandler[] = [];

/**
 * 注册导航失败处理器
 */
export function onNavigationFailure(
  handler: NavigationFailureHandler
): () => void {
  failureHandlers.push(handler);
  
  return () => {
    const index = failureHandlers.indexOf(handler);
    if (index > -1) {
      failureHandlers.splice(index, 1);
    }
  };
}

/**
 * 触发失败处理
 */
function triggerNavigationFailure(failure: NavigationFailure) {
  for (const handler of failureHandlers) {
    handler(failure);
  }
}
```

### 版本 3：在导航中集成

```typescript
async function push(to: RouteLocationRaw): Promise<void> {
  const targetLocation = router.resolve(to);
  const currentRoute = router.currentRoute.value;
  
  try {
    // 检查重复导航
    if (isSameRoute(targetLocation, currentRoute)) {
      const failure = createNavigationDuplicatedError(targetLocation, currentRoute);
      triggerNavigationFailure(failure);  // 触发失败回调
      throw failure;
    }
    
    // 运行守卫
    await runGuards(targetLocation, currentRoute);
    
    // 更新路由
    updateRoute(targetLocation);
    
  } catch (error) {
    // 处理失败
    if (isNavigationFailure(error)) {
      triggerNavigationFailure(error);
    }
    throw error;
  }
}
```

## 处理策略

### 策略 1：静默失败

```typescript
router.onNavigationFailure((failure) => {
  if (failure.type === ErrorTypes.NAVIGATION_CANCELLED) {
    // 用户取消，不做处理
    return;
  }
  
  if (failure.type === ErrorTypes.NAVIGATION_DUPLICATED) {
    // 重复导航，不做处理
    return;
  }
});
```

### 策略 2：重试机制

```typescript
const MAX_RETRY = 3;
const retryCount = new Map<string, number>();

router.onNavigationFailure(async (failure) => {
  if (failure.type === ErrorTypes.COMPONENT_LOAD_ERROR) {
    const key = failure.to.fullPath;
    const count = retryCount.get(key) || 0;
    
    if (count < MAX_RETRY) {
      retryCount.set(key, count + 1);
      console.log(`重试加载组件 (${count + 1}/${MAX_RETRY})`);
      await router.push(failure.to);
    } else {
      console.error('组件加载失败，超过最大重试次数');
      router.push('/error');
    }
  }
});
```

### 策略 3：错误页面

```typescript
router.onNavigationFailure((failure) => {
  if (failure.type === ErrorTypes.MATCHER_NOT_FOUND) {
    // 404 错误
    router.push('/404');
  } else if (failure.type === ErrorTypes.NAVIGATION_GUARD_ERROR) {
    // 守卫错误
    router.push('/error');
  }
});
```

### 策略 4：用户提示

```typescript
import { ElMessage } from 'element-plus';

router.onNavigationFailure((failure) => {
  if (failure.type === ErrorTypes.NAVIGATION_GUARD_REDIRECT) {
    ElMessage.warning('没有访问权限，已重定向');
  } else if (failure.type === ErrorTypes.NAVIGATION_ABORTED) {
    ElMessage.error('导航被中止');
  }
});
```

## 完整实现

```typescript
// src/navigationFailures.ts

import { NavigationFailure } from './errors/NavigationFailure';
import { ErrorTypes } from './errors/errorTypes';
import type { RouteLocationNormalized } from './types';

export { ErrorTypes };

/**
 * 判断是否为导航失败
 */
export function isNavigationFailure(
  error: any,
  type?: ErrorTypes
): error is NavigationFailure {
  return (
    error instanceof NavigationFailure &&
    (type === undefined || error.type === type)
  );
}

/**
 * 判断是否为特定类型的失败
 */
export function isNavigationFailureType(
  error: any,
  ...types: ErrorTypes[]
): boolean {
  return (
    error instanceof NavigationFailure &&
    types.includes(error.type)
  );
}

/**
 * 获取失败详情
 */
export function getNavigationFailureDetails(
  failure: NavigationFailure
): {
  type: ErrorTypes;
  typeName: string;
  from: RouteLocationNormalized;
  to: RouteLocationNormalized;
  message: string;
} {
  return {
    type: failure.type,
    typeName: ErrorTypes[failure.type],
    from: failure.from,
    to: failure.to,
    message: failure.message
  };
}
```

## 实战场景

### 场景1：全局失败处理

```typescript
// main.ts

import { createApp } from 'vue';
import { createRouter } from './router';
import { isNavigationFailure, ErrorTypes } from 'vue-router';

const router = createRouter({ /* ... */ });

// 全局失败处理
router.onNavigationFailure((failure) => {
  console.log('导航失败:', getNavigationFailureDetails(failure));
  
  switch (failure.type) {
    case ErrorTypes.MATCHER_NOT_FOUND:
      router.push('/404');
      break;
    case ErrorTypes.NAVIGATION_GUARD_REDIRECT:
      // 已经重定向，不需处理
      break;
    case ErrorTypes.NAVIGATION_CANCELLED:
      // 用户取消，不需处理
      break;
    default:
      console.error('未处理的失败类型:', failure);
  }
});

const app = createApp(App);
app.use(router);
app.mount('#app');
```

### 场景2：组件中处理

```vue
<script setup>
import { useRouter } from 'vue-router';
import { isNavigationFailure, ErrorTypes } from 'vue-router';

const router = useRouter();

async function handleNavigation() {
  try {
    await router.push('/user/123');
    console.log('导航成功');
  } catch (error) {
    if (isNavigationFailure(error, ErrorTypes.NAVIGATION_CANCELLED)) {
      console.log('用户取消了导航');
    } else if (isNavigationFailure(error, ErrorTypes.MATCHER_NOT_FOUND)) {
      console.error('路由不存在');
    } else if (isNavigationFailure(error)) {
      console.warn('导航失败:', error.message);
    } else {
      console.error('未知错误:', error);
    }
  }
}
</script>
```

### 场景3：失败统计

```typescript
const failureStats = new Map<ErrorTypes, number>();

router.onNavigationFailure((failure) => {
  const count = failureStats.get(failure.type) || 0;
  failureStats.set(failure.type, count + 1);
  
  // 每 100 次失败上报一次
  const total = Array.from(failureStats.values()).reduce((a, b) => a + b, 0);
  if (total % 100 === 0) {
    reportFailureStats({
      total,
      breakdown: Object.fromEntries(failureStats)
    });
  }
});
```

### 场景4：失败日志

```typescript
router.onNavigationFailure((failure) => {
  const details = getNavigationFailureDetails(failure);
  
  console.group('🚫 导航失败');
  console.log('类型:', details.typeName);
  console.log('从:', details.from.path);
  console.log('到:', details.to.path);
  console.log('原因:', details.message);
  console.groupEnd();
});
```

## 常见陷阱

### 陷阱1：忘记检查失败类型

```typescript
// ❌ 错误
try {
  await router.push('/home');
} catch (error) {
  console.error(error);  // 所有失败都报错
}

// ✅ 正确
try {
  await router.push('/home');
} catch (error) {
  if (!isNavigationFailure(error, ErrorTypes.NAVIGATION_DUPLICATED)) {
    console.error(error);  // 只处理非重复导航错误
  }
}
```

### 陷阱2：失败处理器中再次导航

```typescript
// ❌ 错误：可能导致无限循环
router.onNavigationFailure((failure) => {
  router.push('/error');  // 如果 /error 也失败呢？
});

// ✅ 正确：添加保护
router.onNavigationFailure((failure) => {
  if (failure.to.path !== '/error') {
    router.push('/error');
  }
});
```

### 陷阱3：没有清理失败处理器

```typescript
// ❌ 错误：内存泄漏
const unregister = router.onNavigationFailure(handler);
// 忘记调用 unregister()

// ✅ 正确：组件销毁时清理
onUnmounted(() => {
  unregister();
});
```

## 小结

本章实现了完整的导航失败处理机制：

**失败检测**：
- `isNavigationFailure()` 判断失败类型
- `isNavigationFailureType()` 检查多种类型
- `getNavigationFailureDetails()` 获取详情

**处理策略**：
- 静默失败（取消、重复）
- 重试机制（组件加载失败）
- 错误页面（404、权限错误）
- 用户提示（友好提示）

**实战价值**：
- 精确的失败处理
- 健墮的错误恢复
- 完善的日志统计
- 优雅的用户体验

至此，错误处理（第38-39章）全部完成！下一部分开始增强 Guards 部分（第16-21章）。
});
```

至此，错误处理（第38-39章）完成。最后三章（第40-42章）进行总结。
