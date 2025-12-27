# 装饰器模式：动态功能增强

> 装饰器模式允许你在不修改原有对象的情况下，动态地给对象添加新功能。

## 问题的起源

假设你在开发一个消息通知系统。最初只需要发送普通消息：

```typescript
class MessageSender {
  send(message: string): void {
    console.log(`Sending message: ${message}`);
    // 发送消息的逻辑
  }
}
```

随着需求增加，你需要：
- 支持消息加密
- 支持消息压缩
- 支持添加时间戳
- 支持记录日志

**最直接的做法**：通过继承扩展功能

```typescript
// ❌ 继承爆炸
class EncryptedMessageSender extends MessageSender { /* ... */ }
class CompressedMessageSender extends MessageSender { /* ... */ }
class EncryptedCompressedMessageSender extends MessageSender { /* ... */ }
class LoggingEncryptedMessageSender extends MessageSender { /* ... */ }
class TimestampEncryptedCompressedLoggingMessageSender extends MessageSender { /* ... */ }
// 组合数量呈指数增长！
```

**问题**：
1. 类的数量爆炸式增长
2. 无法动态组合功能
3. 违反开闭原则

**装饰器模式的解决方案**：通过组合而非继承，动态包装对象。

## 装饰器模式的核心思想

装饰器模式的核心是：**包装原对象，在调用原方法前后添加额外逻辑**。

```
┌─────────────────────────────────────────┐
│ 装饰器 C                                 │
│ ┌─────────────────────────────────┐     │
│ │ 装饰器 B                         │     │
│ │ ┌─────────────────────────┐     │     │
│ │ │ 装饰器 A                │     │     │
│ │ │ ┌─────────────────┐    │     │     │
│ │ │ │ 原始对象         │    │     │     │
│ │ │ └─────────────────┘    │     │     │
│ │ └─────────────────────────┘     │     │
│ └─────────────────────────────────┘     │
└─────────────────────────────────────────┘
```

## 基础实现

```typescript
// 组件接口
interface MessageSender {
  send(message: string): void;
}

// 具体组件
class BasicMessageSender implements MessageSender {
  send(message: string): void {
    console.log(`📤 Sending: ${message}`);
  }
}

// 装饰器基类
abstract class MessageSenderDecorator implements MessageSender {
  protected wrapped: MessageSender;
  
  constructor(sender: MessageSender) {
    this.wrapped = sender;
  }
  
  send(message: string): void {
    this.wrapped.send(message);
  }
}

// 加密装饰器
class EncryptionDecorator extends MessageSenderDecorator {
  private encrypt(text: string): string {
    // 简化的加密逻辑
    return Buffer.from(text).toString('base64');
  }
  
  send(message: string): void {
    const encrypted = this.encrypt(message);
    console.log('🔐 Encrypting message...');
    super.send(encrypted);
  }
}

// 压缩装饰器
class CompressionDecorator extends MessageSenderDecorator {
  private compress(text: string): string {
    // 简化的压缩逻辑
    return `[compressed:${text.length}]${text.substring(0, 20)}...`;
  }
  
  send(message: string): void {
    const compressed = this.compress(message);
    console.log('📦 Compressing message...');
    super.send(compressed);
  }
}

// 日志装饰器
class LoggingDecorator extends MessageSenderDecorator {
  send(message: string): void {
    const startTime = Date.now();
    console.log(`📝 [${new Date().toISOString()}] Starting to send message`);
    
    super.send(message);
    
    console.log(`📝 Message sent in ${Date.now() - startTime}ms`);
  }
}

// 时间戳装饰器
class TimestampDecorator extends MessageSenderDecorator {
  send(message: string): void {
    const timestamped = `[${Date.now()}] ${message}`;
    super.send(timestamped);
  }
}
```

### 使用示例

```typescript
// 创建基础发送器
let sender: MessageSender = new BasicMessageSender();

// 动态添加装饰器（顺序可以任意组合）
sender = new TimestampDecorator(sender);
sender = new CompressionDecorator(sender);
sender = new EncryptionDecorator(sender);
sender = new LoggingDecorator(sender);

// 发送消息
sender.send('Hello, World!');

// 输出：
// 📝 [2024-01-15T10:30:00.000Z] Starting to send message
// 🔐 Encrypting message...
// 📦 Compressing message...
// 📤 Sending: [compressed:32]W3RpbWVzdGFtcDox...
// 📝 Message sent in 5ms
```

## 函数式装饰器

在 JavaScript/TypeScript 中，我们可以用更简洁的函数式方式实现装饰器：

```typescript
// 函数类型
type SendFunction = (message: string) => void;

// 基础发送函数
const basicSend: SendFunction = (message) => {
  console.log(`📤 Sending: ${message}`);
};

// 装饰器工厂函数
const withEncryption = (send: SendFunction): SendFunction => {
  return (message) => {
    const encrypted = Buffer.from(message).toString('base64');
    console.log('🔐 Encrypting...');
    send(encrypted);
  };
};

const withCompression = (send: SendFunction): SendFunction => {
  return (message) => {
    const compressed = `[compressed:${message.length}]${message.substring(0, 20)}...`;
    console.log('📦 Compressing...');
    send(compressed);
  };
};

const withLogging = (send: SendFunction): SendFunction => {
  return (message) => {
    console.log(`📝 [${new Date().toISOString()}] Starting...`);
    send(message);
    console.log('📝 Done');
  };
};

// 组合装饰器
const enhancedSend = withLogging(
  withEncryption(
    withCompression(basicSend)
  )
);

enhancedSend('Hello, World!');
```

### 使用 compose 函数

```typescript
// 通用的组合函数
function compose<T>(...fns: Array<(arg: T) => T>): (arg: T) => T {
  return (arg) => fns.reduceRight((result, fn) => fn(result), arg);
}

// 更优雅的组合方式
const enhancedSend = compose(
  withLogging,
  withEncryption,
  withCompression
)(basicSend);
```

## 前端实战：API 请求装饰

```typescript
interface RequestConfig {
  url: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
}

interface Response<T> {
  data: T;
  status: number;
}

type RequestFunction = <T>(config: RequestConfig) => Promise<Response<T>>;

// 基础请求函数
const baseRequest: RequestFunction = async (config) => {
  const response = await fetch(config.url, {
    method: config.method,
    headers: config.headers,
    body: config.data ? JSON.stringify(config.data) : undefined,
  });
  
  return {
    data: await response.json(),
    status: response.status,
  };
};

// 认证装饰器
const withAuth = (request: RequestFunction): RequestFunction => {
  return async (config) => {
    const token = localStorage.getItem('token');
    return request({
      ...config,
      headers: {
        ...config.headers,
        Authorization: token ? `Bearer ${token}` : '',
      },
    });
  };
};

// 重试装饰器
const withRetry = (maxRetries: number = 3) => {
  return (request: RequestFunction): RequestFunction => {
    return async (config) => {
      let lastError: Error;
      
      for (let i = 0; i < maxRetries; i++) {
        try {
          return await request(config);
        } catch (error) {
          lastError = error as Error;
          console.log(`Retry ${i + 1}/${maxRetries}...`);
          await new Promise(r => setTimeout(r, 1000 * (i + 1)));
        }
      }
      
      throw lastError!;
    };
  };
};

// 缓存装饰器
const withCache = (ttl: number = 60000) => {
  const cache = new Map<string, { data: any; timestamp: number }>();
  
  return (request: RequestFunction): RequestFunction => {
    return async (config) => {
      // 只缓存 GET 请求
      if (config.method.toUpperCase() !== 'GET') {
        return request(config);
      }
      
      const key = `${config.method}:${config.url}`;
      const cached = cache.get(key);
      
      if (cached && Date.now() - cached.timestamp < ttl) {
        console.log('📦 Cache hit');
        return cached.data;
      }
      
      const response = await request(config);
      cache.set(key, { data: response, timestamp: Date.now() });
      
      return response;
    };
  };
};

// 错误处理装饰器
const withErrorHandler = (request: RequestFunction): RequestFunction => {
  return async (config) => {
    try {
      const response = await request(config);
      
      if (response.status >= 400) {
        throw new Error(`HTTP Error: ${response.status}`);
      }
      
      return response;
    } catch (error) {
      console.error('Request failed:', error);
      
      // 可以在这里显示 Toast 或其他错误提示
      throw error;
    }
  };
};

// 组合所有装饰器
const api = compose(
  withErrorHandler,
  withAuth,
  withRetry(3),
  withCache(60000)
)(baseRequest);

// 使用
const users = await api({ url: '/api/users', method: 'GET' });
```

## TypeScript 装饰器语法

TypeScript 支持装饰器语法（需要开启 experimentalDecorators）：

```typescript
// 方法装饰器
function Log(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;
  
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${propertyKey} with:`, args);
    const result = original.apply(this, args);
    console.log(`Result:`, result);
    return result;
  };
  
  return descriptor;
}

// 性能监控装饰器
function Measure(
  target: any,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const original = descriptor.value;
  
  descriptor.value = async function (...args: any[]) {
    const start = performance.now();
    const result = await original.apply(this, args);
    const duration = performance.now() - start;
    console.log(`${propertyKey} took ${duration.toFixed(2)}ms`);
    return result;
  };
  
  return descriptor;
}

// 节流装饰器
function Throttle(limit: number) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const original = descriptor.value;
    let lastCall = 0;
    
    descriptor.value = function (...args: any[]) {
      const now = Date.now();
      if (now - lastCall >= limit) {
        lastCall = now;
        return original.apply(this, args);
      }
    };
    
    return descriptor;
  };
}

// 使用装饰器
class UserService {
  @Log
  @Measure
  async getUser(id: string) {
    const response = await fetch(`/api/users/${id}`);
    return response.json();
  }
  
  @Throttle(1000)
  handleScroll() {
    console.log('Scroll handled');
  }
}
```

## 装饰器 vs 继承

| 特性 | 装饰器 | 继承 |
|------|--------|------|
| 组合方式 | 运行时动态组合 | 编译时静态定义 |
| 功能叠加 | 可以任意叠加多个 | 只能单继承 |
| 代码复用 | 高，装饰器可复用 | 较低，子类难以复用 |
| 灵活性 | 高，可以动态添加/移除 | 低，结构固定 |

## 最佳实践

1. **保持装饰器单一职责**：每个装饰器只做一件事
2. **注意装饰顺序**：装饰器的顺序会影响最终行为
3. **保持接口一致**：装饰器应该与被装饰对象实现相同接口
4. **使用函数式风格**：在 JavaScript 中，函数式装饰器更简洁

## 总结

装饰器模式是功能扩展的优雅解决方案：

1. **核心思想**：通过包装对象动态添加功能
2. **典型场景**：日志、缓存、认证、重试、性能监控
3. **实现方式**：类装饰器、函数装饰器、TypeScript 装饰器语法
4. **关键优势**：避免继承爆炸，支持动态组合

装饰器模式让我们能够**在不修改原有代码的情况下扩展功能**，是实现 AOP（面向切面编程）的重要工具。
