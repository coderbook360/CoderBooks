# 单例模式：全局唯一实例的管理

## 为什么需要单例模式？

首先要问一个问题：**什么情况下我们需要一个类只有一个实例？**

想象这样的场景：你的应用需要一个全局配置管理器，如果每次使用都创建新实例，就会导致：
- **配置不一致**：实例A的配置是dev，实例B的配置是prod
- **资源浪费**：配置对象被重复创建，占用额外内存
- **状态混乱**：无法确定哪个实例持有最新的配置

**现在我要问第二个问题：如何保证一个类只能创建一个实例？**

关键在于：**私有构造函数 + 静态实例 + 延迟初始化**。

## 经典单例实现

### 错误示例：普通类

```typescript
class AppConfig {
  constructor(public env: string) {}
}

const config1 = new AppConfig('dev');
const config2 = new AppConfig('prod');

console.log(config1 === config2); // false，两个不同的实例！
```

**问题**：无法阻止创建多个实例，导致状态不一致。

### 正确实现：单例模式

```typescript
class AppConfig {
  private static instance: AppConfig;
  private env: string;

  // 私有构造函数，防止外部new
  private constructor(env: string) {
    this.env = env;
  }

  static getInstance(env?: string): AppConfig {
    if (!AppConfig.instance) {
      if (!env) {
        throw new Error('首次初始化必须提供env参数');
      }
      AppConfig.instance = new AppConfig(env);
    }
    return AppConfig.instance;
  }

  getEnv(): string {
    return this.env;
  }

  setEnv(env: string): void {
    this.env = env;
  }
}

// 使用
const config1 = AppConfig.getInstance('dev');
const config2 = AppConfig.getInstance(); // 不传参数，返回已存在的实例

console.log(config1 === config2); // true，同一个实例
console.log(config2.getEnv()); // 'dev'

// new AppConfig('prod'); // ❌ 编译错误：构造函数是私有的
```

**关键点**：
1. **私有构造函数**：禁止外部通过`new`创建实例
2. **静态实例变量**：存储唯一实例
3. **静态获取方法**：提供全局访问点
4. **延迟初始化**：首次调用时才创建实例

## 前端常见单例场景

### 场景一：全局事件总线

```typescript
class EventBus {
  private static instance: EventBus;
  private events: Map<string, Array<(data: any) => void>> = new Map();

  private constructor() {}

  static getInstance(): EventBus {
    if (!EventBus.instance) {
      EventBus.instance = new EventBus();
    }
    return EventBus.instance;
  }

  on(event: string, callback: (data: any) => void): void {
    if (!this.events.has(event)) {
      this.events.set(event, []);
    }
    this.events.get(event)!.push(callback);
  }

  emit(event: string, data: any): void {
    const callbacks = this.events.get(event);
    if (callbacks) {
      callbacks.forEach(callback => callback(data));
    }
  }

  off(event: string, callback?: (data: any) => void): void {
    if (!callback) {
      this.events.delete(event);
    } else {
      const callbacks = this.events.get(event);
      if (callbacks) {
        this.events.set(
          event,
          callbacks.filter(cb => cb !== callback)
        );
      }
    }
  }
}

// 使用：全局只有一个事件总线
const bus1 = EventBus.getInstance();
const bus2 = EventBus.getInstance();

bus1.on('user:login', (user) => {
  console.log('用户登录:', user);
});

bus2.emit('user:login', { name: 'Alice' }); // bus1和bus2是同一个实例，事件可以触发
```

### 场景二：请求缓存管理器

```typescript
interface CacheEntry {
  data: any;
  timestamp: number;
}

class RequestCache {
  private static instance: RequestCache;
  private cache: Map<string, CacheEntry> = new Map();
  private maxAge: number = 5 * 60 * 1000; // 5分钟缓存

  private constructor() {}

  static getInstance(): RequestCache {
    if (!RequestCache.instance) {
      RequestCache.instance = new RequestCache();
    }
    return RequestCache.instance;
  }

  get(key: string): any | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // 检查是否过期
    if (Date.now() - entry.timestamp > this.maxAge) {
      this.cache.delete(key);
      return null;
    }

    return entry.data;
  }

  set(key: string, data: any): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
  }

  clear(): void {
    this.cache.clear();
  }
}

// 使用
async function fetchUser(id: string) {
  const cache = RequestCache.getInstance();
  const cacheKey = `user:${id}`;

  // 先查缓存
  let user = cache.get(cacheKey);
  if (user) {
    console.log('从缓存返回');
    return user;
  }

  // 缓存未命中，发起请求
  const response = await fetch(`/api/users/${id}`);
  user = await response.json();

  // 写入缓存
  cache.set(cacheKey, user);
  return user;
}
```

### 场景三：WebSocket连接管理

```typescript
class WebSocketManager {
  private static instance: WebSocketManager;
  private socket: WebSocket | null = null;
  private messageHandlers: Set<(data: any) => void> = new Set();

  private constructor() {}

  static getInstance(): WebSocketManager {
    if (!WebSocketManager.instance) {
      WebSocketManager.instance = new WebSocketManager();
    }
    return WebSocketManager.instance;
  }

  connect(url: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      console.log('WebSocket已连接');
      return;
    }

    this.socket = new WebSocket(url);

    this.socket.onmessage = (event) => {
      const data = JSON.parse(event.data);
      this.messageHandlers.forEach(handler => handler(data));
    };

    this.socket.onclose = () => {
      console.log('WebSocket连接关闭，5秒后重连...');
      setTimeout(() => this.connect(url), 5000);
    };
  }

  send(data: any): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(JSON.stringify(data));
    } else {
      console.error('WebSocket未连接');
    }
  }

  onMessage(handler: (data: any) => void): () => void {
    this.messageHandlers.add(handler);
    return () => this.messageHandlers.delete(handler);
  }
}

// 使用：全局共享同一个WebSocket连接
const ws1 = WebSocketManager.getInstance();
ws1.connect('ws://localhost:8080');

const ws2 = WebSocketManager.getInstance();
ws2.send({ type: 'ping' }); // 使用相同的连接
```

## 单例模式的陷阱

### 陷阱一：过度使用导致全局状态泛滥

```typescript
// ❌ 不好的例子：所有东西都做成单例
class UserService {
  private static instance: UserService;
  // ...
}

class OrderService {
  private static instance: OrderService;
  // ...
}

class CartService {
  private static instance: CartService;
  // ...
}
```

**问题**：单例本质上是全局变量，过度使用会导致模块间强耦合，难以测试。

**原则**：只有真正需要全局唯一的资源才用单例（配置、缓存、连接池）。

### 陷阱二：单例在测试中的问题

```typescript
class Logger {
  private static instance: Logger;
  private logs: string[] = [];

  private constructor() {}

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(message: string): void {
    this.logs.push(message);
  }

  getLogs(): string[] {
    return this.logs;
  }
}

// 测试代码
describe('Logger', () => {
  it('should log messages', () => {
    const logger = Logger.getInstance();
    logger.log('test message');
    expect(logger.getLogs()).toContain('test message');
  });

  it('should start with empty logs', () => {
    const logger = Logger.getInstance();
    // ❌ 失败！上个测试的日志还在
    expect(logger.getLogs().length).toBe(0);
  });
});
```

**解决方案**：提供重置方法或依赖注入：

```typescript
class Logger {
  // ...现有代码

  // 仅用于测试
  static resetInstance(): void {
    Logger.instance = null as any;
  }
}

// 测试代码
afterEach(() => {
  Logger.resetInstance();
});
```

## ES6 模块天然单例

在现代JavaScript中，ES6模块本身就是单例：

```typescript
// config.ts
class Config {
  public env: string = 'dev';

  setEnv(env: string): void {
    this.env = env;
  }

  getEnv(): string {
    return this.env;
  }
}

export const config = new Config();
```

```typescript
// app.ts
import { config } from './config';

config.setEnv('prod');
```

```typescript
// service.ts
import { config } from './config';

console.log(config.getEnv()); // 'prod'
```

**优势**：
- 代码更简洁
- 模块系统保证唯一性
- 易于测试（可以mock模块）

**适用场景**：大多数前端单例场景都可以用ES6模块代替，只有需要延迟初始化或复杂控制逻辑时才用经典单例模式。

## 总结

单例模式的核心在于：**控制实例数量，提供全局访问点**。

| 场景 | 是否适用单例 | 理由 |
|------|------------|------|
| 全局配置 | ✅ 是 | 配置应该唯一且全局访问 |
| 事件总线 | ✅ 是 | 全局通信中心 |
| WebSocket连接 | ✅ 是 | 连接应该复用 |
| 缓存管理器 | ✅ 是 | 缓存应该全局共享 |
| 业务Service | ❌ 否 | 应该支持依赖注入，方便测试 |
| 工具函数 | ❌ 否 | 直接用纯函数或ES6模块 |

**关键原则**：
1. **克制使用**：单例是全局状态，过度使用导致耦合
2. **优先ES6模块**：简单场景用模块导出即可
3. **考虑测试**：单例难以测试，提供重置方法或依赖注入
4. **明确职责**：只有真正需要全局唯一的资源才用单例

记住：**单例模式解决的是"如何保证只有一个实例"，而不是"如何创建全局变量"。**
