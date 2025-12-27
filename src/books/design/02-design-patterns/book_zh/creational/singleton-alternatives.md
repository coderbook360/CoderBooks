# 单例模式的问题与替代方案

## 单例模式的三大问题

首先要问一个问题：**单例模式看起来很方便，为什么很多架构师反对过度使用？**

### 问题一：隐藏的依赖关系

看看这段代码：

```typescript
class OrderService {
  createOrder(userId: string, items: any[]): void {
    const logger = Logger.getInstance();
    const config = AppConfig.getInstance();
    const db = Database.getInstance();

    logger.log(`Creating order for user ${userId}`);
    
    if (config.getEnv() === 'prod') {
      db.insert('orders', { userId, items });
    }
  }
}
```

**问题**：这个类依赖了Logger、AppConfig、Database，但从构造函数看不出来！依赖关系被隐藏了，导致：
- **测试困难**：无法替换Logger为MockLogger
- **理解困难**：不看代码不知道有哪些依赖
- **维护困难**：依赖变化时难以追踪影响范围

### 问题二：全局状态污染

```typescript
class UserCache {
  private static instance: UserCache;
  private cache: Map<string, any> = new Map();

  static getInstance(): UserCache {
    if (!UserCache.instance) {
      UserCache.instance = new UserCache();
    }
    return UserCache.instance;
  }

  set(key: string, value: any): void {
    this.cache.set(key, value);
  }

  get(key: string): any {
    return this.cache.get(key);
  }
}

// 测试1
test('should cache user data', () => {
  const cache = UserCache.getInstance();
  cache.set('user1', { name: 'Alice' });
  expect(cache.get('user1')).toEqual({ name: 'Alice' });
});

// 测试2
test('should return undefined for non-existent key', () => {
  const cache = UserCache.getInstance();
  // ❌ 失败！测试1的数据还在
  expect(cache.get('user1')).toBeUndefined();
});
```

**问题**：单例的状态在整个应用生命周期持续存在，导致测试间相互干扰。

### 问题三：违反单一职责原则

```typescript
class AppConfig {
  private static instance: AppConfig;
  private config: any;

  private constructor() {
    this.config = this.loadConfig();
  }

  static getInstance(): AppConfig {
    if (!AppConfig.instance) {
      AppConfig.instance = new AppConfig();
    }
    return AppConfig.instance;
  }

  private loadConfig(): any {
    // 从文件/环境变量/远程服务器加载配置
    return {};
  }

  get(key: string): any {
    return this.config[key];
  }
}
```

**问题**：这个类承担了两个职责：
1. **控制实例数量**（单例逻辑）
2. **管理配置数据**（业务逻辑）

这违反了单一职责原则，导致类难以扩展和测试。

## 替代方案

### 方案一：依赖注入（推荐）

**核心思想**：不要自己去获取依赖，而是由外部注入。

```typescript
// 错误：类内部获取单例
class OrderService {
  createOrder(userId: string): void {
    const logger = Logger.getInstance(); // ❌ 隐藏依赖
    logger.log(`Creating order for ${userId}`);
  }
}
```

```typescript
// 正确：通过构造函数注入依赖
interface ILogger {
  log(message: string): void;
}

class OrderService {
  constructor(private logger: ILogger) {} // ✅ 显式依赖

  createOrder(userId: string): void {
    this.logger.log(`Creating order for ${userId}`);
  }
}

// 使用
const logger = new ConsoleLogger();
const orderService = new OrderService(logger);

// 测试
const mockLogger = new MockLogger();
const testService = new OrderService(mockLogger);
```

**收益**：
- **依赖清晰**：从构造函数看出所有依赖
- **易于测试**：可以注入Mock对象
- **灵活替换**：不同环境使用不同实现

### 方案二：ES6模块单例

**适用场景**：无需延迟初始化，无需复杂控制逻辑。

```typescript
// config.ts
class Config {
  private env: string = process.env.NODE_ENV || 'dev';

  getEnv(): string {
    return this.env;
  }

  setEnv(env: string): void {
    this.env = env;
  }
}

// 直接导出实例
export const config = new Config();
```

```typescript
// app.ts
import { config } from './config';

console.log(config.getEnv()); // 'dev'
```

**收益**：
- **代码简洁**：无需写单例模板代码
- **模块系统保证唯一性**：ES6模块天然单例
- **易于测试**：可以用模块Mock工具替换

### 方案三：工厂函数 + 依赖注入容器

**适用场景**：大型应用，需要管理复杂的依赖关系。

```typescript
// 定义依赖注入容器
class Container {
  private services = new Map<string, any>();

  register(name: string, factory: () => any, singleton = false): void {
    if (singleton) {
      let instance: any = null;
      this.services.set(name, () => {
        if (!instance) {
          instance = factory();
        }
        return instance;
      });
    } else {
      this.services.set(name, factory);
    }
  }

  resolve<T>(name: string): T {
    const factory = this.services.get(name);
    if (!factory) {
      throw new Error(`Service ${name} not found`);
    }
    return factory();
  }
}

// 注册服务
const container = new Container();

container.register('logger', () => new ConsoleLogger(), true); // 单例
container.register('config', () => new AppConfig(), true); // 单例
container.register('orderService', () => {
  const logger = container.resolve<ILogger>('logger');
  const config = container.resolve<AppConfig>('config');
  return new OrderService(logger, config);
}, false); // 每次创建新实例

// 使用
const orderService = container.resolve<OrderService>('orderService');
```

**收益**：
- **集中管理**：所有依赖关系在一处配置
- **灵活控制**：可以控制每个服务是单例还是瞬态
- **易于测试**：测试时替换整个容器

### 方案四：函数式编程

**核心思想**：用纯函数代替有状态的单例。

```typescript
// ❌ 单例版本：有状态
class Logger {
  private static instance: Logger;
  private logs: string[] = [];

  static getInstance(): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger();
    }
    return Logger.instance;
  }

  log(message: string): void {
    this.logs.push(message);
    console.log(message);
  }

  getLogs(): string[] {
    return this.logs;
  }
}

const logger = Logger.getInstance();
logger.log('Hello');
logger.log('World');
console.log(logger.getLogs()); // ['Hello', 'World']
```

```typescript
// ✅ 函数式版本：无状态
type LogEntry = { message: string; timestamp: number };

function createLogger() {
  let logs: LogEntry[] = [];

  return {
    log(message: string): void {
      const entry = { message, timestamp: Date.now() };
      logs.push(entry);
      console.log(message);
    },
    getLogs(): LogEntry[] {
      return [...logs]; // 返回副本，防止外部修改
    },
    clearLogs(): void {
      logs = [];
    }
  };
}

// 使用
const logger = createLogger();
logger.log('Hello');
logger.log('World');
console.log(logger.getLogs()); // [{ message: 'Hello', ... }, { message: 'World', ... }]
```

**收益**：
- **无全局状态**：每次调用createLogger创建独立实例
- **易于测试**：每个测试使用独立logger
- **函数式风格**：更容易推理和组合

## 实际案例：重构单例

### 重构前：全局单例

```typescript
class ApiClient {
  private static instance: ApiClient;
  private baseURL: string = 'https://api.example.com';
  private token: string | null = null;

  private constructor() {}

  static getInstance(): ApiClient {
    if (!ApiClient.instance) {
      ApiClient.instance = new ApiClient();
    }
    return ApiClient.instance;
  }

  setToken(token: string): void {
    this.token = token;
  }

  async get(path: string): Promise<any> {
    const response = await fetch(`${this.baseURL}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
    return response.json();
  }
}

// 使用
const api = ApiClient.getInstance();
api.setToken('xxx');
const users = await api.get('/users');
```

**问题**：
- 全局状态（token）导致测试困难
- 无法同时使用多个token
- 隐藏依赖关系

### 重构后：依赖注入

```typescript
interface IApiClient {
  get(path: string): Promise<any>;
  post(path: string, data: any): Promise<any>;
}

class ApiClient implements IApiClient {
  constructor(
    private baseURL: string,
    private token: string
  ) {}

  async get(path: string): Promise<any> {
    const response = await fetch(`${this.baseURL}${path}`, {
      headers: {
        Authorization: `Bearer ${this.token}`
      }
    });
    return response.json();
  }

  async post(path: string, data: any): Promise<any> {
    const response = await fetch(`${this.baseURL}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${this.token}`
      },
      body: JSON.stringify(data)
    });
    return response.json();
  }
}

class UserService {
  constructor(private api: IApiClient) {}

  async getUsers(): Promise<any> {
    return this.api.get('/users');
  }
}

// 使用
const api = new ApiClient('https://api.example.com', 'xxx');
const userService = new UserService(api);

// 测试
class MockApiClient implements IApiClient {
  async get(path: string): Promise<any> {
    return { users: [] };
  }
  async post(path: string, data: any): Promise<any> {
    return { success: true };
  }
}

const mockApi = new MockApiClient();
const testService = new UserService(mockApi);
```

**收益**：
- 依赖关系清晰
- 易于测试
- 可以同时使用多个ApiClient实例
- 无全局状态

## 决策指南

| 场景 | 推荐方案 | 理由 |
|------|---------|------|
| 业务Service | 依赖注入 | 需要测试和替换依赖 |
| 简单工具类 | ES6模块 | 代码简洁，无需单例模板 |
| 大型应用 | DI容器 | 集中管理依赖 |
| 无状态工具 | 纯函数 | 最简单，易测试 |
| 数据库连接池 | 单例 | 确实需要全局唯一资源 |
| WebSocket连接 | 单例 | 需要复用连接 |

## 总结

单例模式不是万能的，过度使用会导致：
1. **隐藏依赖**：难以理解和测试
2. **全局状态**：导致测试污染
3. **违反单一职责**：混合了实例控制和业务逻辑

**替代方案优先级**：
1. **依赖注入**：大多数场景的最佳选择
2. **ES6模块**：简单场景的首选
3. **DI容器**：大型应用的选择
4. **纯函数**：无状态场景的选择
5. **单例**：真正需要全局唯一资源时使用

记住：**不要因为单例方便就滥用，要根据实际需求选择最合适的方案。**
