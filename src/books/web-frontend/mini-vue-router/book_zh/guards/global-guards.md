# 全局守卫实现

> "守卫不是障碍，而是保护。"

全局守卫是 Vue Router 中最常用的守卫类型，它们在每次路由跳转时都会执行。本章我们将从零实现完整的全局守卫系统：`beforeEach`、`beforeResolve` 和 `afterEach`。

## 设计目标

在开始编码之前，让我们明确全局守卫系统需要满足的需求：

1. **注册与注销**：可以动态添加和移除守卫
2. **顺序执行**：按注册顺序依次执行
3. **异步支持**：守卫可以返回 Promise
4. **中断机制**：任何守卫返回取消/重定向，立即停止后续执行
5. **返回值处理**：正确解析 `false`、字符串、对象等返回值

## 从最简单的版本开始

**首先要问一个问题**：最简单的守卫管理器是什么样的？

```typescript
// 版本 1：最简实现
class GuardManager {
  private guards: Function[] = [];
  
  // 添加守卫
  add(guard: Function) {
    this.guards.push(guard);
  }
  
  // 执行所有守卫
  run(to, from) {
    for (const guard of this.guards) {
      guard(to, from);
    }
  }
}
```

这个版本有几个问题：
1. ❌ 没有移除守卫的方法
2. ❌ 不支持异步
3. ❌ 没有中断机制
4. ❌ 没有处理返回值

让我们逐步解决这些问题。

## 第一步：支持守卫注销

**思考一下**：`router.beforeEach()` 返回什么？

答案是返回一个**取消函数**：

```typescript
const removeGuard = router.beforeEach(() => {});
// 稍后移除
removeGuard();
```

这是一个非常优雅的设计模式，让我们实现它：

```typescript
// 版本 2：支持注销
class GuardManager {
  private guards: Function[] = [];
  
  add(guard: Function): () => void {  // 返回取消函数
    this.guards.push(guard);
    
    // 返回一个函数，调用时移除守卫
    return () => {
      const index = this.guards.indexOf(guard);
      if (index > -1) {
        this.guards.splice(index, 1);
      }
    };
  }
}
```

**为什么用闭包而不是 `removeGuard(guard)` 方法？**

1. **使用更简单**：不需要保存对 guard 函数的引用
2. **防止误删**：每个取消函数只能删除对应的守卫
3. **符合习惯**：与 `addEventListener`/`removeEventListener` 模式一致

## 第二步：支持异步执行

**现在我要问第二个问题**：如何按顺序执行异步守卫？

```typescript
// 版本 3：支持异步
class GuardManager {
  private guards: NavigationGuard[] = [];
  
  add(guard: NavigationGuard): () => void {
    this.guards.push(guard);
    return () => {
      const index = this.guards.indexOf(guard);
      if (index > -1) this.guards.splice(index, 1);
    };
  }
  
  // 使用 async/await 顺序执行
  async run(to: RouteLocation, from: RouteLocation): Promise<void> {
    for (const guard of this.guards) {
      await guard(to, from);  // 等待每个守卫完成
    }
  }
}
```

现在可以这样使用：

```typescript
manager.add(async (to, from) => {
  const user = await fetchCurrentUser();
  console.log('当前用户:', user.name);
});

await manager.run(to, from);  // 等待所有守卫执行完成
```

## 第三步：处理返回值

**这是最关键的问题**：如何根据返回值决定导航行为？

根据 Vue Router 的设计，守卫的返回值有以下含义：

| 返回值 | 含义 |
|--------|------|
| `undefined` / `void` | 继续导航 |
| `true` | 继续导航 |
| `false` | 取消导航 |
| 字符串（如 `'/login'`） | 重定向到该路径 |
| 对象（如 `{ name: 'Login' }`） | 重定向到该位置 |
| `Error` | 抛出错误 |

```typescript
// 版本 4：处理返回值
type NavigationGuardReturn = 
  | void 
  | boolean 
  | string 
  | RouteLocationRaw 
  | Error;

async run(to, from): Promise<NavigationGuardReturn> {
  for (const guard of this.guards) {
    const result = await guard(to, from);
    
    // undefined 或 true，继续执行下一个守卫
    if (result === undefined || result === true) {
      continue;
    }
    
    // 其他任何值，立即返回（中断执行）
    return result;
  }
  
  // 所有守卫都通过，返回 undefined
  return undefined;
}
```

## 完整的守卫管理器

现在让我们整合所有功能，实现完整的 `GuardManager`：

```typescript
import { RouteLocationNormalized, RouteLocationRaw } from './types';

// 守卫函数类型
type NavigationGuard = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => NavigationGuardReturn | Promise<NavigationGuardReturn>;

type NavigationGuardReturn = 
  | void 
  | boolean 
  | string 
  | RouteLocationRaw 
  | Error;

// 后置钩子类型（不能返回值）
type NavigationHookAfter = (
  to: RouteLocationNormalized,
  from: RouteLocationNormalized
) => void;

export class GuardManager {
  // 三种守卫分开存储
  private beforeEachGuards: NavigationGuard[] = [];
  private beforeResolveGuards: NavigationGuard[] = [];
  private afterEachGuards: NavigationHookAfter[] = [];
  
  /**
   * 注册全局前置守卫
   */
  beforeEach(guard: NavigationGuard): () => void {
    return this.addGuard(this.beforeEachGuards, guard);
  }
  
  /**
   * 注册全局解析守卫
   */
  beforeResolve(guard: NavigationGuard): () => void {
    return this.addGuard(this.beforeResolveGuards, guard);
  }
  
  /**
   * 注册全局后置钩子
   */
  afterEach(guard: NavigationHookAfter): () => void {
    return this.addGuard(this.afterEachGuards, guard);
  }
  
  /**
   * 执行 beforeEach 守卫队列
   */
  async runBeforeEach(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): Promise<NavigationGuardReturn> {
    return this.runGuardQueue(this.beforeEachGuards, to, from);
  }
  
  /**
   * 执行 beforeResolve 守卫队列
   */
  async runBeforeResolve(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): Promise<NavigationGuardReturn> {
    return this.runGuardQueue(this.beforeResolveGuards, to, from);
  }
  
  /**
   * 执行 afterEach 钩子（不能阻止导航，不等待结果）
   */
  runAfterEach(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): void {
    // 后置钩子：同步执行，不处理返回值
    for (const hook of this.afterEachGuards) {
      try {
        hook(to, from);
      } catch (error) {
        // 后置钩子的错误不应该影响导航
        console.error('[Router] afterEach hook error:', error);
      }
    }
  }
  
  /**
   * 通用：添加守卫并返回取消函数
   */
  private addGuard<T extends Function>(guards: T[], guard: T): () => void {
    guards.push(guard);
    
    return () => {
      const index = guards.indexOf(guard);
      if (index > -1) {
        guards.splice(index, 1);
      }
    };
  }
  
  /**
   * 通用：执行守卫队列
   */
  private async runGuardQueue(
    guards: NavigationGuard[],
    to: RouteLocationNormalized,
    from: RouteLocationNormalized
  ): Promise<NavigationGuardReturn> {
    // 创建副本，防止执行过程中数组被修改
    const guardsCopy = guards.slice();
    
    for (const guard of guardsCopy) {
      try {
        const result = await guard(to, from);
        
        // undefined 或 true，继续
        if (result === undefined || result === true) {
          continue;
        }
        
        // 其他值，中断并返回
        return result;
        
      } catch (error) {
        // 守卫抛出异常，视为取消导航
        if (error instanceof Error) {
          return error;
        }
        return new Error(String(error));
      }
    }
    
    // 所有守卫都通过
    return undefined;
  }
}
```

## 关键设计决策

### 1. 为什么创建数组副本？

```typescript
const guardsCopy = guards.slice();
```

考虑这个场景：

```typescript
const remove = router.beforeEach((to, from) => {
  // 在守卫中移除自己
  remove();
  return true;
});
```

如果直接遍历原数组，在遍历过程中修改数组会导致不可预测的行为。创建副本可以避免这个问题。

### 2. 为什么 afterEach 不等待异步？

```typescript
runAfterEach(to, from): void {  // 注意：没有返回 Promise
  for (const hook of this.afterEachGuards) {
    hook(to, from);  // 不 await
  }
}
```

因为 `afterEach` 的设计目的是**记录日志、更新 UI**，不应该阻塞后续逻辑。如果需要等待异步操作，应该使用 `beforeResolve`。

### 3. 为什么捕获后置钩子的错误？

```typescript
try {
  hook(to, from);
} catch (error) {
  console.error('[Router] afterEach hook error:', error);
}
```

后置钩子在导航**已经完成**后执行，它的错误不应该影响已经成功的导航。

## 与 Router 集成

现在让我们看看如何在 Router 中使用 `GuardManager`：

```typescript
class Router {
  private guardManager = new GuardManager();
  
  // 暴露公共 API
  beforeEach = this.guardManager.beforeEach.bind(this.guardManager);
  beforeResolve = this.guardManager.beforeResolve.bind(this.guardManager);
  afterEach = this.guardManager.afterEach.bind(this.guardManager);
  
  async navigate(to: RouteLocationRaw): Promise<void> {
    const from = this.currentRoute;
    const resolved = this.resolve(to);
    
    // 1. 执行 beforeEach
    const beforeEachResult = await this.guardManager.runBeforeEach(
      resolved, 
      from
    );
    if (beforeEachResult !== undefined) {
      return this.handleGuardResult(beforeEachResult);
    }
    
    // 2. 执行路由独享守卫（下一章实现）
    // ...
    
    // 3. 执行组件守卫（下一章实现）
    // ...
    
    // 4. 执行 beforeResolve
    const beforeResolveResult = await this.guardManager.runBeforeResolve(
      resolved,
      from
    );
    if (beforeResolveResult !== undefined) {
      return this.handleGuardResult(beforeResolveResult);
    }
    
    // 5. 确认导航
    this.currentRoute = resolved;
    this.history.push(resolved.path);
    
    // 6. 执行 afterEach
    this.guardManager.runAfterEach(resolved, from);
  }
  
  private handleGuardResult(result: NavigationGuardReturn): void {
    if (result === false) {
      throw new NavigationAborted();
    }
    if (typeof result === 'string') {
      this.navigate(result);  // 重定向
    }
    if (typeof result === 'object' && !(result instanceof Error)) {
      this.navigate(result);  // 重定向
    }
    if (result instanceof Error) {
      throw result;
    }
  }
}
```

## 实战示例

### 登录验证

```typescript
router.beforeEach((to, from) => {
  // 检查目标路由是否需要认证
  if (to.meta.requiresAuth) {
    const isLoggedIn = !!localStorage.getItem('token');
    
    if (!isLoggedIn) {
      // 重定向到登录页，并记录原始目标
      return {
        path: '/login',
        query: { redirect: to.fullPath }
      };
    }
  }
  // 不需要认证，或已登录，继续
});
```

### 页面访问日志

```typescript
router.afterEach((to, from) => {
  // 发送页面访问统计
  analytics.track('pageview', {
    path: to.path,
    referrer: from.path
  });
});
```

### 进度条控制

```typescript
import NProgress from 'nprogress';

router.beforeEach(() => {
  NProgress.start();
});

router.afterEach(() => {
  NProgress.done();
});
```

### 动态权限检查

```typescript
router.beforeEach(async (to) => {
  if (to.meta.requiredPermissions) {
    const permissions = await fetchUserPermissions();
    const required = to.meta.requiredPermissions as string[];
    
    const hasPermission = required.every(p => permissions.includes(p));
    if (!hasPermission) {
      return { name: 'Forbidden' };
    }
  }
});
```

## 小结

本章我们实现了完整的全局守卫系统：

1. **三种守卫**：`beforeEach`（前置）、`beforeResolve`（解析）、`afterEach`（后置）
2. **注册与注销**：返回取消函数，支持动态管理
3. **顺序执行**：使用 `async/await` 确保按顺序执行
4. **返回值处理**：`false` 取消，字符串/对象重定向
5. **短路机制**：任何守卫中断，后续守卫不再执行
6. **错误处理**：守卫异常不会导致整个应用崩溃

下一章，我们将实现路由独享守卫。
