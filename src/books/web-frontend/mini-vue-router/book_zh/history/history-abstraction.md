# History 抽象层设计

前三章我们实现了三种 History 模式。本章总结 History 抽象层的设计思想，理解为什么要这样设计。

## 抽象的价值

思考一个问题：为什么不直接在 Router 中使用 `history.pushState` 或 `location.hash`？

**答案**：**解耦底层差异，让上层代码保持一致。**

### 没有抽象的代码

```typescript
class Router {
  push(to: string) {
    if (this.mode === 'history') {
      history.pushState(null, '', to);
    } else if (this.mode === 'hash') {
      window.location.hash = to;
    } else if (this.mode === 'memory') {
      this.historyStack.push(to);
    }
    this.updateRoute();
  }
}
```

问题：
- ❌ Router 需要知道所有模式的实现细节
- ❌ 添加新模式需要修改 Router 代码
- ❌ 难以测试和维护

### 使用抽象后的代码

```typescript
class Router {
  constructor(history: RouterHistory) {
    this.history = history;
  }
  
  push(to: string) {
    this.history.push(to);  // 统一接口
    this.updateRoute();
  }
}
```

优点：
- ✅ Router 不关心底层实现
- ✅ 添加新模式无需修改 Router
- ✅ 易于测试（可以 mock History）

这就是**依赖倒置原则**：依赖抽象，不依赖具体实现。

## 统一接口设计

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

### 接口设计原则

**1. 最小必要集**

只包含路由必需的功能：
- 获取当前位置（`location`）
- 修改位置（`push/replace/go`）
- 监听变化（`listen`）
- 清理资源（`destroy`）

**2. 隐藏实现细节**

不暴露底层 API：
- ❌ `history.pushState`
- ❌ `window.location.hash`
- ✅ 统一的 `push` 方法

**3. 行为一致性**

三种模式的行为完全一致：

```typescript
// 无论哪种模式，用法相同
const history = createWebHistory();
// const history = createWebHashHistory();
// const history = createMemoryHistory();

history.push('/user');
history.listen((to, from) => { /* ... */ });
```

## 设计模式应用

### 1. 策略模式（Strategy Pattern）

不同的 History 模式是不同的策略：

```typescript
// 运行时选择策略
const history = useHistoryMode === 'hash'
  ? createWebHashHistory()
  : createWebHistory();

const router = createRouter({ history, routes });
```

### 2. 观察者模式（Observer Pattern）

`listen` 方法实现了观察者模式：

```typescript
const unlisten = history.listen((to, from, info) => {
  console.log(`导航: ${from} -> ${to}`);
});

// 取消订阅
unlisten();
```

### 3. 工厂模式（Factory Pattern）

`createXxxHistory` 函数是工厂函数：

```typescript
export function createWebHistory(base = ''): RouterHistory {
  // 封装复杂的创建逻辑
  // 返回标准接口
}
```

## 扩展性设计

### 如何添加新的 History 模式？

假设我们要添加一个 **Native 模式**（用于移动端）：

**步骤1**：实现接口

```typescript
export function createNativeHistory(): RouterHistory {
  return {
    get location() { /* ... */ },
    get state() { /* ... */ },
    push(to) { /* Native Bridge 调用 */ },
    replace(to) { /* Native Bridge 调用 */ },
    go(delta) { /* Native Bridge 调用 */ },
    listen(callback) { /* 监听 Native 事件 */ },
    destroy() { /* 清理 */ }
  };
}
```

**步骤2**：使用

```typescript
import { createRouter, createNativeHistory } from 'mini-vue-router';

const router = createRouter({
  history: createNativeHistory(),
  routes
});
```

**关键**：Router 代码无需任何修改！

## 对比其他路由库

### React Router

React Router v6 也使用了类似的抽象：

```typescript
interface History {
  readonly location: Location;
  createHref(to: To): string;
  push(to: To, state?: any): void;
  replace(to: To, state?: any): void;
  go(n: number): void;
  listen(listener: Listener): () => void;
}
```

### Angular Router

Angular Router 使用 `LocationStrategy`：

```typescript
abstract class LocationStrategy {
  abstract path(): string;
  abstract pushState(state: any, title: string, url: string): void;
  abstract replaceState(state: any, title: string, url: string): void;
  abstract forward(): void;
  abstract back(): void;
}
```

**共同点**：都通过接口抽象隐藏底层差异。

## 实战权衡

### 抽象的代价

**优点**：
- 代码解耦
- 易于扩展
- 易于测试

**代价**：
- 增加一层间接性
- 需要理解抽象概念
- 可能过度设计（YAGNI）

**权衡**：对于路由库这种需要支持多种模式的场景，抽象是值得的。

### 何时不需要抽象

如果你的应用：
- 只用一种模式
- 不需要测试
- 不会扩展

那么直接使用浏览器 API 可能更简单。

## 总结

History 抽象层的核心价值：

**解耦**：Router 不依赖具体实现。

**一致性**：三种模式使用相同接口。

**扩展性**：添加新模式无需修改 Router。

**可测试性**：可以 mock History 进行测试。

**设计模式**：策略模式 + 观察者模式 + 工厂模式。

**关键思想**：依赖抽象，不依赖实现（依赖倒置原则）。

至此，History 模块全部完成。下一部分我们将实现路由匹配器（Matcher），这是 Vue Router 最复杂的模块。
