# createMemoryHistory 实现

Memory 模式将历史记录存储在内存中，不操作浏览器 URL。主要用于 **SSR（服务端渲染）** 和 **单元测试**。

## 为什么需要 Memory 模式

思考一下：在 Node.js 环境中，没有 `window.location` 和 `history` 对象，如何实现路由？

**Memory 模式** 用纯 JavaScript 数组模拟历史栈：

```typescript
const historyStack = ['/home', '/user', '/profile'];
let currentIndex = 2;  // 当前在 '/profile'
```

## 实现 createMemoryHistory

创建 `src/history/memory.ts`：

```typescript
import type { RouterHistory, NavigationCallback, StateEntry } from '../types';

export function createMemoryHistory(base = ''): RouterHistory {
  // 历史栈
  const historyStack: string[] = ['/'];
  
  // 当前位置索引
  let currentIndex = 0;
  
  // 监听器列表
  const listeners: NavigationCallback[] = [];
  
  function push(to: string, data?: StateEntry) {
    // 删除当前位置之后的所有记录
    historyStack.splice(currentIndex + 1);
    
    // 添加新记录
    historyStack.push(to);
    currentIndex++;
    
    // 通知监听器
    notifyListeners(to, historyStack[currentIndex - 1], {
      type: 'push',
      direction: 'forward',
      delta: 1
    });
  }
  
  function replace(to: string, data?: StateEntry) {
    // 替换当前记录
    historyStack[currentIndex] = to;
  }
  
  function go(delta: number) {
    const newIndex = currentIndex + delta;
    
    // 边界检查
    if (newIndex < 0 || newIndex >= historyStack.length) {
      return;
    }
    
    const to = historyStack[newIndex];
    const from = historyStack[currentIndex];
    
    currentIndex = newIndex;
    
    notifyListeners(to, from, {
      type: 'pop',
      direction: delta > 0 ? 'forward' : 'back',
      delta
    });
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
  
  function destroy() {
    listeners.length = 0;
  }
  
  return {
    get location() {
      return historyStack[currentIndex];
    },
    get state() {
      return {
        back: currentIndex > 0 ? historyStack[currentIndex - 1] : null,
        current: historyStack[currentIndex],
        forward: currentIndex < historyStack.length - 1 ? historyStack[currentIndex + 1] : null,
        position: currentIndex,
        replaced: false,
        scroll: null
      };
    },
    push,
    replace,
    go,
    listen,
    destroy
  };
}
```

## 使用场景

### 1. SSR（服务端渲染）

```javascript
// server.js
import { createMemoryHistory, createRouter } from 'mini-vue-router';

app.get('*', async (req, res) => {
  const history = createMemoryHistory();
  const router = createRouter({ history, routes });
  
  // 设置当前路径
  await router.push(req.url);
  
  // 渲染应用
  const html = await renderToString(app);
  res.send(html);
});
```

### 2. 单元测试

```javascript
import { createMemoryHistory, createRouter } from 'mini-vue-router';
import { describe, it, expect } from 'vitest';

describe('Router', () => {
  it('should navigate correctly', async () => {
    const history = createMemoryHistory();
    const router = createRouter({ history, routes });
    
    await router.push('/user');
    expect(router.currentRoute.path).toBe('/user');
    
    router.back();
    expect(router.currentRoute.path).toBe('/');
  });
});
```

## 总结

Memory 模式的特点：

**纯内存实现**：不依赖浏览器 API。

**完全可控**：历史记录完全由代码控制。

**适用场景**：SSR、单元测试、非浏览器环境。

**实现简单**：用数组模拟历史栈。

至此，三种 History 模式全部实现完成。下一章总结 History 抽象层的设计思想。
