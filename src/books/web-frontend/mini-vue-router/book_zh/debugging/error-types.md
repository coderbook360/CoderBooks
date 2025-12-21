# 错误类型与错误边界

健壮的错误处理是路由系统的基础。本章设计完整的错误类型体系和处理机制。

## 错误类型设计

首先要问一个问题：**路由系统中有哪些错误类型？**

### 错误分类

1. **导航错误**：
   - 路由未找到
   - 导航被取消
   - 导航被中止
   - 重复导航

2. **守卫错误**：
   - 守卫拒绝
   - 守卫重定向
   - 守卫抛错

3. **系统错误**：
   - 配置错误
   - 匹配器错误
   - 组件加载错误

## 错误类型定义

### 错误类型枚举

```typescript
// src/errors/errorTypes.ts

export enum ErrorTypes {
  // 导航错误
  MATCHER_NOT_FOUND = 0,      // 路由未找到
  NAVIGATION_CANCELLED = 1,    // 导航被取消
  NAVIGATION_ABORTED = 2,      // 导航被中止
  NAVIGATION_DUPLICATED = 3,   // 重复导航
  
  // 守卫错误
  NAVIGATION_GUARD_REDIRECT = 4, // 守卫重定向
  NAVIGATION_GUARD_ERROR = 5,    // 守卫抛错
  
  // 系统错误
  INVALID_ROUTE_CONFIG = 6,    // 非法路由配置
  INVALID_MATCHER = 7,         // 非法匹配器
  COMPONENT_LOAD_ERROR = 8     // 组件加载失败
}
```

### 基础错误类

```typescript
// src/errors/RouterError.ts

export class RouterError extends Error {
  constructor(
    message: string,
    public readonly type: ErrorTypes
  ) {
    super(message);
    this.name = 'RouterError';
    
    // 保持正确的堆栈跟踪
    if (Error.captureStackTrace) {
      Error.captureStackTrace(this, RouterError);
    }
  }
}
```

### 导航失败类

```typescript
// src/errors/NavigationFailure.ts

import { RouterError } from './RouterError';
import type { RouteLocationNormalized } from '../types';

export class NavigationFailure extends RouterError {
  constructor(
    public readonly from: RouteLocationNormalized,
    public readonly to: RouteLocationNormalized,
    type: ErrorTypes,
    message?: string
  ) {
    super(
      message || `Navigation failed from ${from.path} to ${to.path}`,
      type
    );
    this.name = 'NavigationFailure';
  }
}

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

## 错误创建函数

```typescript
// src/errors/errorFactory.ts

import { NavigationFailure } from './NavigationFailure';
import { ErrorTypes } from './errorTypes';

/**
 * 创建路由未找到错误
 */
export function createRouterNotFoundError(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): NavigationFailure {
  return new NavigationFailure(
    from,
    to,
    ErrorTypes.MATCHER_NOT_FOUND,
    `No match found for location with path "${to.path}"`
  );
}

/**
 * 创建导航取消错误
 */
export function createNavigationCancelledError(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): NavigationFailure {
  return new NavigationFailure(
    from,
    to,
    ErrorTypes.NAVIGATION_CANCELLED,
    `Navigation cancelled from "${from.path}" to "${to.path}"`
  );
}

/**
 * 创建导航中止错误
 */
export function createNavigationAbortedError(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized,
  reason?: string
): NavigationFailure {
  return new NavigationFailure(
    from,
    to,
    ErrorTypes.NAVIGATION_ABORTED,
    reason || `Navigation aborted from "${from.path}" to "${to.path}"`
  );
}

/**
 * 创建重复导航错误
 */
export function createNavigationDuplicatedError(
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
): NavigationFailure {
  return new NavigationFailure(
    from,
    to,
    ErrorTypes.NAVIGATION_DUPLICATED,
    `Avoided redundant navigation to current location: "${to.fullPath}"`
  );
}
```

## 在导航中使用

```typescript
// src/router.ts

async function push(to: RouteLocationRaw): Promise<void> {
  const targetLocation = router.resolve(to);
  const currentRoute = router.currentRoute.value;
  
  try {
    // 1. 检查重复导航
    if (isSameRoute(targetLocation, currentRoute)) {
      throw createNavigationDuplicatedError(targetLocation, currentRoute);
    }
    
    // 2. 运行守卫
    await runGuards(targetLocation, currentRoute);
    
    // 3. 更新路由
    updateRoute(targetLocation);
    
  } catch (error) {
    // 处理错误
    handleNavigationError(error, targetLocation, currentRoute);
  }
}

function handleNavigationError(
  error: any,
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) {
  if (isNavigationFailure(error, ErrorTypes.NAVIGATION_CANCELLED)) {
    // 导航取消：静默失败
    return;
  }
  
  if (isNavigationFailure(error, ErrorTypes.NAVIGATION_DUPLICATED)) {
    // 重复导航：静默失败
    return;
  }
  
  if (isNavigationFailure(error, ErrorTypes.NAVIGATION_GUARD_REDIRECT)) {
    // 守卫重定向：执行新导航
    return push(error.to);
  }
  
  // 其他错误：触发错误回调
  triggerError(error);
}
```

## 错误边界处理

```typescript
// src/errorHandler.ts

type ErrorHandler = (error: any) => void;

const errorHandlers: ErrorHandler[] = [];

/**
 * 注册错误处理器
 */
export function onError(handler: ErrorHandler): () => void {
  errorHandlers.push(handler);
  
  // 返回取消函数
  return () => {
    const index = errorHandlers.indexOf(handler);
    if (index > -1) {
      errorHandlers.splice(index, 1);
    }
  };
}

/**
 * 触发错误处理
 */
export function triggerError(error: any): void {
  for (const handler of errorHandlers) {
    try {
      handler(error);
    } catch (e) {
      console.error('Error in error handler:', e);
    }
  }
}

/**
 * 全局错误边界
 */
export function setupGlobalErrorBoundary(router: Router) {
  // 捕获未处理的 Promise 错误
  window.addEventListener('unhandledrejection', (event) => {
    if (event.reason instanceof RouterError) {
      event.preventDefault();
      triggerError(event.reason);
    }
  });
}
```

## 实战场景

### 场景1：全局错误处理

```typescript
// main.ts

import { createRouter } from './router';
import { onError, isNavigationFailure, ErrorTypes } from 'vue-router';

const router = createRouter({ /* ... */ });

// 注册全局错误处理器
router.onError((error) => {
  if (isNavigationFailure(error, ErrorTypes.MATCHER_NOT_FOUND)) {
    // 404 错误
    console.error('404:', error.to.path);
    router.push('/404');
  } else if (isNavigationFailure(error, ErrorTypes.NAVIGATION_GUARD_ERROR)) {
    // 守卫错误
    console.error('Guard error:', error);
    router.push('/error');
  } else {
    // 其他错误
    console.error('Router error:', error);
  }
});
```

### 场景2：组件中处理错误

```vue-html
<script setup>
import { useRouter } from 'vue-router';
import { isNavigationFailure, ErrorTypes } from 'vue-router';

const router = useRouter();

async function navigate() {
  try {
    await router.push('/user/123');
  } catch (error) {
    if (isNavigationFailure(error, ErrorTypes.NAVIGATION_CANCELLED)) {
      console.log('导航被取消');
    } else if (isNavigationFailure(error, ErrorTypes.MATCHER_NOT_FOUND)) {
      console.error('路由未找到');
    } else {
      console.error('导航错误:', error);
    }
  }
}
</script>
```

### 场景3：守卫中抛出错误

```typescript
router.beforeEach(async (to, from) => {
  try {
    await checkPermission(to);
  } catch (error) {
    // 抛出自定义错误
    throw new NavigationFailure(
      from,
      to,
      ErrorTypes.NAVIGATION_GUARD_ERROR,
      '权限检查失败'
    );
  }
});
```

### 场景4：错误日志上报

```typescript
router.onError((error) => {
  // 上报到监控系统
  if (error instanceof NavigationFailure) {
    reportError({
      type: 'navigation_failure',
      errorType: error.type,
      from: error.from.path,
      to: error.to.path,
      message: error.message
    });
  } else {
    reportError({
      type: 'router_error',
      message: error.message,
      stack: error.stack
    });
  }
});
```

## 常见陷阱

### 陷阱1：忘记判断错误类型

```typescript
// ❌ 错误
router.onError((error) => {
  console.error(error);  // 没有区分错误类型
});

// ✅ 正确
router.onError((error) => {
  if (isNavigationFailure(error, ErrorTypes.MATCHER_NOT_FOUND)) {
    // 404 处理
  } else if (isNavigationFailure(error)) {
    // 其他导航失败
  } else {
    // 普通错误
  }
});
```

### 陷阱2：重复导航被当作错误

```typescript
// ❌ 错误：重复导航也报错
try {
  await router.push('/home');
  await router.push('/home');  // 抛错
} catch (error) {
  console.error(error);  // 不应该报错
}

// ✅ 正确：忽略重复导航
try {
  await router.push('/home');
} catch (error) {
  if (!isNavigationFailure(error, ErrorTypes.NAVIGATION_DUPLICATED)) {
    console.error(error);
  }
}
```

### 陷阱3：错误处理器中再次抛错

```typescript
// ❌ 错误
router.onError((error) => {
  throw error;  // 会导致无限循环
});

// ✅ 正确
router.onError((error) => {
  console.error(error);  // 记录日志即可
});
```

## 小结

本章实现了完整的错误类型系统：

**错误分类**：
- 导航错误（未找到、取消、中止、重复）
- 守卫错误（重定向、抛错）
- 系统错误（配置、匹配器、组件加载）

**错误处理**：
- 统一的错误基类
- 类型安全的判断函数
- 全局错误边界
- 错误回调机制

**实战价值**：
- 健壮的错误处理
- 精确的错误分类
- 友好的错误信息
- 完善的调试体验

下一章实现导航失败的完整处理机制。
} catch (error) {
  if (isNavigationFailure(error, ErrorTypes.NAVIGATION_CANCELLED)) {
    console.log('导航被取消');
  }
}
```

下一章实现导航失败处理。
