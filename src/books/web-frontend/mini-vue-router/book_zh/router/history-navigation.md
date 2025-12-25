# go、back、forward 实现

上一章实现了 `push` 和 `replace` 导航，本章实现历史导航方法：`go`、`back` 和 `forward`。

**首先要问一个问题**：这三个方法和 `push`/`replace` 有什么本质区别？

```
浏览器历史栈：[ /home, /about, /contact, /user ]
                         ↑ 当前位置

push('/profile'):  添加新记录，向前推进
replace('/profile'): 替换当前记录

go(-1):   在历史栈中后退一步 → /home
go(1):    在历史栈中前进一步 → /contact
back():   等同于 go(-1)
forward(): 等同于 go(1)
```

- **push/replace**：创建或修改历史记录
- **go/back/forward**：在已有的历史记录中**导航**

---

## 基础实现

### History API 回顾

浏览器原生提供了这些方法：

```typescript
// 在历史记录中移动
window.history.go(-1);   // 后退一步
window.history.go(1);    // 前进一步
window.history.go(-2);   // 后退两步

// 简写方法
window.history.back();    // 等同于 go(-1)
window.history.forward(); // 等同于 go(1)
```

### 第一版：直接封装

```typescript
// src/router.ts

function go(delta: number): void {
  history.go(delta);
}

function back(): void {
  go(-1);
}

function forward(): void {
  go(1);
}
```

**看起来很简单，对吧？但这里有一个关键问题**：如何知道导航完成？

```typescript
router.go(-1);
console.log(router.currentRoute.value);  // 还是旧路由！
```

`history.go()` 是**异步**的，调用后不会立即更新。我们需要监听 `popstate` 事件。

---

## 监听历史变化

### popstate 事件

当用户点击浏览器前进/后退按钮，或者调用 `go()`/`back()`/`forward()` 时，会触发 `popstate` 事件：

```typescript
window.addEventListener('popstate', (event) => {
  console.log('历史变化:', location.pathname);
  console.log('状态:', event.state);
});
```

### 在 History 抽象层处理

```typescript
// src/history/html5.ts

export function createWebHistory(base: string = ''): RouterHistory {
  const historyNavigation = useHistoryStateNavigation(base);
  const historyListeners = useHistoryListeners(
    base,
    historyNavigation.state,
    historyNavigation.location
  );

  function go(delta: number, triggerListeners = true): void {
    // 标记这次导航的方向
    if (triggerListeners) {
      pendingDelta = delta;
    }
    history.go(delta);
  }

  return {
    ...historyNavigation,
    ...historyListeners,
    go,
  };
}
```

### 处理 popstate 回调

```typescript
// src/history/listeners.ts

function useHistoryListeners(
  base: string,
  state: RouterHistoryState,
  location: { value: string }
) {
  const listeners: NavigationCallback[] = [];
  let teardownCallbacks: Array<() => void> = [];

  const popStateHandler = (event: PopStateEvent) => {
    const to = createCurrentLocation(base, window.location);
    const from = location.value;
    const fromState = state.value;

    // 更新当前位置
    location.value = to;

    // 获取历史状态
    const toState = event.state as RouterHistoryState | null;
    if (toState) {
      state.value = toState;
    }

    // 通知所有监听器
    listeners.forEach(callback => {
      callback(to, from, {
        delta: toState ? toState.position - fromState.position : 0,
        type: NavigationType.pop,
        direction: getNavigationDirection(toState, fromState),
      });
    });
  };

  function listen(callback: NavigationCallback): () => void {
    listeners.push(callback);

    const teardown = () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };

    teardownCallbacks.push(teardown);
    return teardown;
  }

  // 只在第一次添加监听器时绑定
  function setupListeners(): void {
    window.addEventListener('popstate', popStateHandler);
  }

  function destroy(): void {
    window.removeEventListener('popstate', popStateHandler);
    listeners.length = 0;
    teardownCallbacks.forEach(fn => fn());
    teardownCallbacks.length = 0;
  }

  return {
    listen,
    setupListeners,
    destroy,
  };
}
```

---

## 计算导航方向

判断用户是前进还是后退：

```typescript
// src/history/utils.ts

function getNavigationDirection(
  toState: RouterHistoryState | null,
  fromState: RouterHistoryState
): NavigationDirection {
  if (!toState) {
    return NavigationDirection.unknown;
  }

  const delta = toState.position - fromState.position;

  if (delta === 0) {
    return NavigationDirection.unknown;
  }

  return delta > 0 
    ? NavigationDirection.forward 
    : NavigationDirection.back;
}

enum NavigationDirection {
  back = 'back',
  forward = 'forward',
  unknown = '',
}
```

**为什么要记录方向？**

1. **过渡动画**：前进用滑入，后退用滑出
2. **滚动行为**：后退时恢复滚动位置
3. **调试信息**：了解用户的导航意图

---

## 在 Router 中集成

### 注册历史监听

```typescript
// src/router.ts

export function createRouter(options: RouterOptions): Router {
  const matcher = createRouterMatcher(options.routes);
  const history = options.history;
  const currentRoute = shallowRef<RouteLocationNormalized>(START_LOCATION);

  // 监听历史变化
  let removeHistoryListener: (() => void) | undefined;

  function setupListeners(): void {
    if (removeHistoryListener) return;

    removeHistoryListener = history.listen((to, from, info) => {
      const targetLocation = resolve(to);
      const from2 = currentRoute.value;

      navigate(targetLocation, from2, {
        ...info,
        // popstate 不执行 beforeEach 和 beforeResolve
        // 只执行 afterEach
        skipGuards: false,
      }).then(failure => {
        if (failure) {
          // 导航被取消，需要恢复 URL
          if (failure.type === NavigationFailureType.aborted) {
            // 撤销这次历史变化
            history.go(-info.delta, false);
          }
        }
      });
    });
  }

  // install 时设置监听
  function install(app: App): void {
    // ...其他初始化代码
    setupListeners();
  }

  // 暴露 go/back/forward
  function go(delta: number): void {
    history.go(delta);
  }

  function back(): void {
    go(-1);
  }

  function forward(): void {
    go(1);
  }

  return {
    currentRoute: computed(() => currentRoute.value),
    push,
    replace,
    go,
    back,
    forward,
    // ...其他方法
  };
}
```

---

## 守卫与 popstate

### 一个有趣的问题

当用户点击浏览器后退按钮时：

```typescript
// beforeEach 守卫
router.beforeEach((to, from) => {
  if (!isAuthenticated && to.meta.requiresAuth) {
    return '/login';  // 重定向到登录页
  }
});
```

**URL 已经变了，但守卫想阻止导航，怎么办？**

这是 Vue Router 的一个复杂场景。有两种处理方式：

### 方式一：恢复 URL（官方实现）

```typescript
history.listen(async (to, from, info) => {
  const failure = await navigate(to, from);
  
  if (failure) {
    // 导航失败，恢复到之前的 URL
    history.go(-info.delta, false);  // false 表示不触发监听器
  }
});
```

### 方式二：允许导航，在组件层处理

```typescript
// 不阻止 popstate 导航
// 在目标页面的 beforeRouteEnter 中处理
```

Vue Router 4 选择了**方式一**，保证守卫的一致性。

---

## 完整实现

```typescript
// src/router.ts

export function createRouter(options: RouterOptions): Router {
  const history = options.history;
  const matcher = createRouterMatcher(options.routes);
  const currentRoute = shallowRef<RouteLocationNormalized>(START_LOCATION);

  let ready = false;
  let pendingNavigation: Promise<void> | null = null;

  // 导航核心逻辑
  async function navigate(
    to: RouteLocationNormalized,
    from: RouteLocationNormalized,
    info: NavigationInfo
  ): Promise<NavigationFailure | void> {
    // 执行守卫
    try {
      await runGuardQueue(extractGuards(to, from, 'beforeRouteLeave'));
      await runGuardQueue(beforeEachGuards);
      await runGuardQueue(extractGuards(to, from, 'beforeRouteUpdate'));
      await runGuardQueue(extractGuards(to, from, 'beforeRouteEnter'));
      await runGuardQueue(beforeResolveGuards);
    } catch (error) {
      if (isNavigationFailure(error)) {
        return error;
      }
      throw error;
    }

    // 更新路由状态
    currentRoute.value = to;

    // 执行 afterEach
    afterEachGuards.forEach(guard => guard(to, from, failure));

    return undefined;
  }

  // 监听历史变化
  function setupListeners(): void {
    history.listen(async (to, from, info) => {
      const targetLocation = resolve(to);

      // 等待之前的导航完成
      if (pendingNavigation) {
        await pendingNavigation;
      }

      pendingNavigation = navigate(targetLocation, currentRoute.value, info)
        .then(failure => {
          if (failure) {
            // 导航失败，恢复 URL
            if (
              failure.type === NavigationFailureType.aborted ||
              failure.type === NavigationFailureType.cancelled
            ) {
              history.go(-info.delta, false);
            }
          }
        })
        .finally(() => {
          pendingNavigation = null;
        });
    });
  }

  // 历史导航方法
  function go(delta: number): void {
    history.go(delta);
  }

  function back(): void {
    go(-1);
  }

  function forward(): void {
    go(1);
  }

  return {
    currentRoute: computed(() => currentRoute.value),

    // 编程式导航
    push,
    replace,

    // 历史导航
    go,
    back,
    forward,

    // ...其他属性和方法
  };
}
```

---

## 与 push/replace 的对比

| 特性 | push/replace | go/back/forward |
|------|-------------|-----------------|
| 创建历史记录 | ✅ | ❌ |
| 返回 Promise | ✅ | ❌ |
| 触发 popstate | ❌ | ✅ |
| 可以取消 | ✅（守卫拦截） | ✅（但需恢复 URL） |
| 使用场景 | 代码导航 | 模拟浏览器按钮 |

---

## 小结

本章实现了历史导航功能：

1. **go(delta)**：在历史记录中移动
2. **back()**：后退一步，等同于 `go(-1)`
3. **forward()**：前进一步，等同于 `go(1)`

关键点：

- `go()` 是异步的，需要通过 `popstate` 事件获取结果
- 守卫可以拦截 `popstate` 导航，但需要恢复 URL
- 记录导航方向可以用于动画和滚动行为

下一章我们将实现 `resolve` 方法，解析路由地址。
