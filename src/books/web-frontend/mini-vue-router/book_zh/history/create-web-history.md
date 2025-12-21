# createWebHistory 实现

上一章我们深入理解了 History API，现在开始实现 `createWebHistory`。这是 Vue Router 中最常用的模式。

## 设计目标

`createWebHistory` 需要实现 `RouterHistory` 接口：

```typescript
interface RouterHistory {
  readonly location: string;
  readonly state: StateEntry;
  push(to: string, data?: StateEntry): void;
  replace(to: string, data?: StateEntry): void;
  go(delta: number): void;
  listen(callback: NavigationCallback): () => void;
  destroy(): void;
}
```

## 状态设计

首先定义状态结构：

```typescript
interface StateEntry {
  back: string | null;      // 上一个路径
  current: string;           // 当前路径
  forward: string | null;    // 下一个路径
  position: number;          // 在历史栈中的位置
  replaced: boolean;         // 是否是 replace 操作
  scroll: ScrollPosition | null;  // 滚动位置
}

interface ScrollPosition {
  left: number;
  top: number;
}
```

为什么需要这些字段？

- `back/current/forward`：追踪导航方向
- `position`：唯一标识历史记录位置
- `replaced`：区分 push 和 replace
- `scroll`：保存滚动位置

## 实现基础框架

创建 `src/history/html5.ts`：

```typescript
import type {
  RouterHistory,
  NavigationCallback,
  StateEntry,
  NavigationType,
  NavigationDirection
} from '../types';

// 生成唯一位置标识
let position = 0;

// 创建初始状态
function buildState(
  back: string | null,
  current: string,
  forward: string | null,
  replaced = false,
  computeScroll = false
): StateEntry {
  return {
    back,
    current,
    forward,
    replaced,
    position: position++,
    scroll: computeScroll ? { left: window.scrollX, top: window.scrollY } : null
  };
}

export function createWebHistory(base = ''): RouterHistory {
  // 当前位置（相对于 base）
  let location = getLocation(base);
  
  // 当前状态
  let currentState: StateEntry = history.state;
  
  // 如果是首次加载，初始化状态
  if (!currentState) {
    currentState = buildState(null, location, null);
    history.replaceState(currentState, '', location);
  }
  
  // 监听器列表
  const listeners: NavigationCallback[] = [];
  
  // Push 方法
  function push(to: string, data?: StateEntry) {
    // 构建新状态
    const state = buildState(
      currentState.current,  // 当前路径成为 back
      to,                     // 新路径
      null,                   // forward 为 null
      false                   // 不是 replace
    );
    
    // 调用 History API
    history.pushState(state, '', to);
    
    // 更新当前状态
    currentState = state;
    
    // 通知监听器
    notifyListeners(to, location, {
      type: NavigationType.push,
      direction: NavigationDirection.forward,
      delta: 1
    });
    
    // 更新 location
    location = to;
  }
  
  // Replace 方法
  function replace(to: string, data?: StateEntry) {
    const state = buildState(
      currentState.back,
      to,
      currentState.forward,
      true  // 标记为 replace
    );
    
    history.replaceState(state, '', to);
    currentState = state;
    location = to;
  }
  
  // Go 方法
  function go(delta: number) {
    history.go(delta);
  }
  
  // Listen 方法
  function listen(callback: NavigationCallback) {
    listeners.push(callback);
    
    // 返回取消函数
    return () => {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    };
  }
  
  // 通知监听器
  function notifyListeners(to: string, from: string, info: any) {
    listeners.forEach(listener => listener(to, from, info));
  }
  
  // 监听 popstate 事件
  function setupListeners() {
    window.addEventListener('popstate', handlePopstate);
  }
  
  function handlePopstate(event: PopStateEvent) {
    const to = getLocation(base);
    const from = location;
    const state: StateEntry = event.state;
    
    // 计算导航方向
    const direction = state.position > currentState.position
      ? NavigationDirection.forward
      : NavigationDirection.back;
    
    const delta = state.position - currentState.position;
    
    // 更新状态
    currentState = state;
    location = to;
    
    // 通知监听器
    notifyListeners(to, from, {
      type: NavigationType.pop,
      direction,
      delta
    });
  }
  
  // Destroy 方法
  function destroy() {
    window.removeEventListener('popstate', handlePopstate);
    listeners.length = 0;
  }
  
  // 启动监听
  setupListeners();
  
  return {
    get location() {
      return location;
    },
    get state() {
      return currentState;
    },
    push,
    replace,
    go,
    listen,
    destroy
  };
}

// 工具函数：获取当前路径
function getLocation(base: string): string {
  let path = window.location.pathname;
  
  // 移除 base 前缀
  if (base && path.startsWith(base)) {
    path = path.slice(base.length) || '/';
  }
  
  return path + window.location.search + window.location.hash;
}
```

## 关键设计解析

### 1. Base 路径处理

`base` 参数用于处理应用部署在子路径的情况：

```javascript
// 应用部署在 https://example.com/app/
const history = createWebHistory('/app');

// 访问 https://example.com/app/user
history.location  // '/user'（自动移除 base）
```

### 2. 状态追踪

每个历史记录都有一个递增的 `position`，用于判断导航方向：

```javascript
// 位置 10
currentState.position = 10;

// 用户点击后退
newState.position = 9;  // 9 < 10，说明是后退

// 用户点击前进
newState.position = 11;  // 11 > 10，说明是前进
```

### 3. 监听器模式

使用发布-订阅模式，Router 可以订阅路由变化：

```javascript
const history = createWebHistory();

const unlisten = history.listen((to, from, info) => {
  console.log(`从 ${from} 到 ${to}`);
  console.log('类型:', info.type);
  console.log('方向:', info.direction);
});

// 取消监听
unlisten();
```

## 完整测试

创建测试文件 `examples/history/index.html`：

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <title>createWebHistory 测试</title>
</head>
<body>
  <div>
    <h1>createWebHistory 测试</h1>
    <button id="push">Push /page1</button>
    <button id="replace">Replace /page2</button>
    <button id="back">Back</button>
    <button id="forward">Forward</button>
    <div id="info"></div>
  </div>
  
  <script type="module">
    import { createWebHistory } from '../../src/history/html5.js';
    
    const history = createWebHistory();
    const info = document.getElementById('info');
    
    // 显示信息
    function showInfo() {
      info.innerHTML = `
        <p>Location: ${history.location}</p>
        <p>Position: ${history.state.position}</p>
        <p>Back: ${history.state.back}</p>
        <p>Forward: ${history.state.forward}</p>
      `;
    }
    
    // 监听变化
    history.listen((to, from, info) => {
      console.log('Navigation:', { to, from, info });
      showInfo();
    });
    
    // 按钮事件
    document.getElementById('push').onclick = () => {
      history.push('/page1');
      showInfo();
    };
    
    document.getElementById('replace').onclick = () => {
      history.replace('/page2');
      showInfo();
    };
    
    document.getElementById('back').onclick = () => {
      history.go(-1);
    };
    
    document.getElementById('forward').onclick = () => {
      history.go(1);
    };
    
    // 初始显示
    showInfo();
  </script>
</body>
</html>
```

运行测试，验证：
- ✅ Push 增加历史记录
- ✅ Replace 替换当前记录
- ✅ 后退/前进正常工作
- ✅ 监听器正确触发

## 优化：滚动位置恢复

扩展 `push` 方法，保存滚动位置：

```typescript
function push(to: string, data?: StateEntry) {
  // 保存当前滚动位置
  const state = buildState(
    currentState.current,
    to,
    null,
    false,
    true  // 计算滚动位置
  );
  
  history.pushState(state, '', to);
  currentState = state;
  location = to;
  
  notifyListeners(to, location, {
    type: NavigationType.push,
    direction: NavigationDirection.forward,
    delta: 1
  });
}
```

在 `popstate` 中恢复滚动：

```typescript
function handlePopstate(event: PopStateEvent) {
  // ...
  
  // 恢复滚动位置
  if (state.scroll) {
    window.scrollTo(state.scroll.left, state.scroll.top);
  }
}
```

## 与官方实现的对比

我们的简化实现省略了：
- ❌ Base 路径的规范化处理
- ❌ 更复杂的状态合并逻辑
- ❌ 边界情况处理（如连续快速点击）
- ❌ 开发环境的警告提示

但核心逻辑完全一致：
- ✅ 封装 `pushState` 和 `replaceState`
- ✅ 监听 `popstate` 事件
- ✅ 维护状态对象
- ✅ 提供统一接口

## 总结

`createWebHistory` 的核心实现：

**状态管理**：每个历史记录都有一个状态对象，记录位置、方向等信息。

**监听器模式**：通过发布-订阅模式，让外部可以监听路由变化。

**Base 路径**：支持应用部署在子路径。

**滚动恢复**：自动保存和恢复滚动位置。

**关键方法**：
- `push`：添加新记录
- `replace`：替换当前记录
- `go`：前进后退
- `listen`：监听变化

下一章，我们将实现 `createWebHashHistory`，看看它与 `createWebHistory` 有何不同。
