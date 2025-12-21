# createWebHashHistory 实现

Hash 模式是前端路由的经典方案，无需服务器配置，兼容性好。本章实现 `createWebHashHistory`。

## Hash 模式原理回顾

Hash 是 URL 中 `#` 后面的部分：

```
https://example.com/#/user/123
                     ^^^^^^^^^
                     这是 Hash
```

**核心特性**：
- 修改 Hash 不触发页面刷新
- 可以通过 `hashchange` 事件监听变化
- 浏览器会记录 Hash 的历史

## 实现 createWebHashHistory

创建 `src/history/hash.ts`：

```typescript
import type { RouterHistory, NavigationCallback, StateEntry } from '../types';

export function createWebHashHistory(base = ''): RouterHistory {
  let location = getLocation();
  let currentState: StateEntry = buildState(null, location, null);
  
  const listeners: NavigationCallback[] = [];
  
  function push(to: string, data?: StateEntry) {
    // Hash 模式使用 location.hash
    window.location.hash = to;
    location = to;
    
    notifyListeners(to, location, {
      type: 'push',
      direction: 'forward',
      delta: 1
    });
  }
  
  function replace(to: string, data?: StateEntry) {
    // 使用 history.replaceState 替换 Hash
    const url = window.location.href.replace(/#.*$/, '') + '#' + to;
    history.replaceState(null, '', url);
    location = to;
  }
  
  function go(delta: number) {
    history.go(delta);
  }
  
  function listen(callback: NavigationCallback) {
    listeners.push(callback);
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) listeners.splice(index, 1);
    };
  }
  
  function notifyListeners(to: string, from: string, info: any) {
    listeners.forEach(listener => listener(to, from, info));
  }
  
  // 监听 hashchange 事件
  function handleHashChange() {
    const to = getLocation();
    const from = location;
    location = to;
    
    notifyListeners(to, from, {
      type: 'pop',
      direction: 'unknown',
      delta: 0
    });
  }
  
  window.addEventListener('hashchange', handleHashChange);
  
  function destroy() {
    window.removeEventListener('hashchange', handleHashChange);
    listeners.length = 0;
  }
  
  return {
    get location() { return location; },
    get state() { return currentState; },
    push,
    replace,
    go,
    listen,
    destroy
  };
}

function getLocation(): string {
  const hash = window.location.hash;
  return hash.slice(1) || '/';  // 移除 #
}

function buildState(back: string | null, current: string, forward: string | null): StateEntry {
  return { back, current, forward, position: 0, replaced: false, scroll: null };
}
```

## 关键差异

### Hash vs History 模式

| 特性 | Hash 模式 | History 模式 |
|------|-----------|--------------|
| 修改 URL | `location.hash = '/user'` | `history.pushState(...)` |
| 监听变化 | `hashchange` 事件 | `popstate` 事件 |
| 服务器配置 | 不需要 | 需要 |
| URL 形式 | `#/user/123` | `/user/123` |

### 实现简化

Hash 模式更简单：
- 不需要 Base 路径处理
- 状态管理可以简化（Hash 本身就是状态）
- 不需要复杂的位置追踪

## 总结

`createWebHashHistory` 的核心：

**使用 `location.hash`**：修改 URL。

**监听 `hashchange`**：捕获变化。

**兼容性好**：支持 IE8+。

**无需服务器配置**：适合静态部署。

下一章实现 `createMemoryHistory`，用于 SSR 和测试环境。
