# 守卫执行队列与流程控制

本章实现完整的守卫执行队列，按正确顺序执行所有守卫。

## 完整执行流程

```typescript
async function navigate(to, from, matched) {
  try {
    // 1. 执行离开守卫
    await runGuards(extractLeaveGuards(from.matched));
    
    // 2. 执行全局 beforeEach
    await guardManager.runBeforeEach(to, from);
    
    // 3. 执行更新守卫（复用组件）
    await runGuards(extractUpdateGuards(matched));
    
    // 4. 执行路由独享守卫
    await runRouteBeforeEnter(matched, to, from);
    
    // 5. 执行进入守卫
    await runGuards(extractEnterGuards(matched));
    
    // 6. 执行全局 beforeResolve
    await guardManager.runBeforeResolve(to, from);
    
    // 7. 导航确认
    updateRoute(to);
    
    // 8. 执行全局 afterEach
    guardManager.runAfterEach(to, from);
    
  } catch (error) {
    handleNavigationError(error);
  }
}
```

## 守卫队列

```typescript
class NavigationQueue {
  private queue: (() => Promise<any>)[] = [];
  
  add(guard: () => Promise<any>) {
    this.queue.push(guard);
  }
  
  async run() {
    for (const task of this.queue) {
      const result = await task();
      if (result !== undefined) {
        return result;
      }
    }
  }
  
  clear() {
    this.queue = [];
  }
}
```

## 错误处理

```typescript
class NavigationError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'NavigationError';
  }
}

class NavigationCancelled extends NavigationError {
  constructor() {
    super('Navigation cancelled');
  }
}

class NavigationRedirect extends NavigationError {
  constructor(public to: RouteLocationRaw) {
    super('Navigation redirected');
  }
}
```

## 总结

实现了完整的守卫执行系统：
- 按顺序执行所有守卫
- 支持异步守卫
- 错误处理和中断机制

下一章实现异步守卫和错误处理的完整逻辑。
