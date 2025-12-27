# 工厂方法：可扩展的对象创建

## 简单工厂的问题

首先要问一个问题：**简单工厂看起来很方便，为什么还需要工厂方法模式？**

回顾简单工厂的问题：

```typescript
class PaymentFactory {
  static createPayment(method: string): Payment {
    switch (method) {
      case 'alipay':
        return new AlipayPayment();
      case 'wechat':
        return new WechatPayment();
      // 每次新增支付方式都要修改这里
      case 'paypal':
        return new PayPalPayment();
      default:
        throw new Error(`不支持的支付方式: ${method}`);
    }
  }
}
```

**问题**：
- **违反开闭原则**：新增类型需要修改工厂代码
- **职责过重**：工厂需要知道所有产品类
- **难以扩展**：第三方无法扩展新类型

**现在我要问第二个问题：如何做到新增类型时不修改原有代码？**

答案是：**把创建逻辑延迟到子类，让子类决定实例化哪个类。**

## 工厂方法模式

### 核心思想

不再用一个工厂类创建所有产品，而是：
1. **定义工厂接口**：声明创建产品的方法
2. **子类实现工厂**：每个子类创建特定产品
3. **客户端使用工厂接口**：不依赖具体工厂

### 完整实现

```typescript
// 1. 产品接口
interface Payment {
  pay(amount: number): void;
}

// 2. 具体产品
class AlipayPayment implements Payment {
  pay(amount: number): void {
    console.log(`支付宝支付 ${amount} 元`);
  }
}

class WechatPayment implements Payment {
  pay(amount: number): void {
    console.log(`微信支付 ${amount} 元`);
  }
}

// 3. 工厂接口（核心）
interface PaymentFactory {
  createPayment(): Payment;
}

// 4. 具体工厂
class AlipayFactory implements PaymentFactory {
  createPayment(): Payment {
    return new AlipayPayment();
  }
}

class WechatFactory implements PaymentFactory {
  createPayment(): Payment {
    return new WechatPayment();
  }
}

// 5. 客户端代码：依赖工厂接口
class PaymentService {
  constructor(private factory: PaymentFactory) {}

  processPayment(amount: number): void {
    const payment = this.factory.createPayment();
    payment.pay(amount);
  }
}

// 使用
const alipayService = new PaymentService(new AlipayFactory());
alipayService.processPayment(100); // 支付宝支付 100 元

const wechatService = new PaymentService(new WechatFactory());
wechatService.processPayment(200); // 微信支付 200 元
```

**关键点**：
- **开闭原则**：新增PayPal，只需添加PayPalFactory，无需修改原有代码
- **依赖倒置**：PaymentService依赖工厂接口，不依赖具体工厂
- **单一职责**：每个工厂只负责创建一种产品

### 扩展：新增PayPal

```typescript
// 新增产品
class PayPalPayment implements Payment {
  pay(amount: number): void {
    console.log(`PayPal支付 ${amount} 元`);
  }
}

// 新增工厂
class PayPalFactory implements PaymentFactory {
  createPayment(): Payment {
    return new PayPalPayment();
  }
}

// 使用：无需修改PaymentService
const paypalService = new PaymentService(new PayPalFactory());
paypalService.processPayment(300); // PayPal支付 300 元
```

**收益**：完全符合开闭原则，扩展新类型不影响原有代码。

## 前端常见场景

### 场景一：日志记录器

```typescript
// 产品接口
interface Logger {
  log(message: string): void;
  error(message: string): void;
}

// 具体产品
class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(`[LOG] ${message}`);
  }

  error(message: string): void {
    console.error(`[ERROR] ${message}`);
  }
}

class FileLogger implements Logger {
  log(message: string): void {
    // 写入文件
    console.log(`[FILE] ${message}`);
  }

  error(message: string): void {
    console.error(`[FILE ERROR] ${message}`);
  }
}

class RemoteLogger implements Logger {
  log(message: string): void {
    // 发送到远程服务器
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ level: 'log', message })
    });
  }

  error(message: string): void {
    fetch('/api/logs', {
      method: 'POST',
      body: JSON.stringify({ level: 'error', message })
    });
  }
}

// 工厂接口
interface LoggerFactory {
  createLogger(): Logger;
}

// 具体工厂
class ConsoleLoggerFactory implements LoggerFactory {
  createLogger(): Logger {
    return new ConsoleLogger();
  }
}

class FileLoggerFactory implements LoggerFactory {
  createLogger(): Logger {
    return new FileLogger();
  }
}

class RemoteLoggerFactory implements LoggerFactory {
  createLogger(): Logger {
    return new RemoteLogger();
  }
}

// 使用：根据环境选择不同工厂
function getLoggerFactory(): LoggerFactory {
  const env = process.env.NODE_ENV;
  
  if (env === 'development') {
    return new ConsoleLoggerFactory();
  } else if (env === 'test') {
    return new FileLoggerFactory();
  } else {
    return new RemoteLoggerFactory();
  }
}

const loggerFactory = getLoggerFactory();
const logger = loggerFactory.createLogger();

logger.log('应用启动'); // 根据环境输出到不同位置
logger.error('发生错误');
```

### 场景二：HTTP适配器

```typescript
// 产品接口
interface HttpClient {
  request(config: RequestConfig): Promise<any>;
}

interface RequestConfig {
  url: string;
  method: string;
  data?: any;
  headers?: Record<string, string>;
}

// 具体产品
class FetchClient implements HttpClient {
  async request(config: RequestConfig): Promise<any> {
    const response = await fetch(config.url, {
      method: config.method,
      headers: config.headers,
      body: JSON.stringify(config.data)
    });
    return response.json();
  }
}

class XHRClient implements HttpClient {
  async request(config: RequestConfig): Promise<any> {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open(config.method, config.url);
      
      Object.keys(config.headers || {}).forEach(key => {
        xhr.setRequestHeader(key, config.headers![key]);
      });

      xhr.onload = () => resolve(JSON.parse(xhr.responseText));
      xhr.onerror = () => reject(new Error('Request failed'));
      
      xhr.send(JSON.stringify(config.data));
    });
  }
}

class MockClient implements HttpClient {
  async request(config: RequestConfig): Promise<any> {
    // 返回模拟数据
    return { success: true, data: {} };
  }
}

// 工厂接口
interface HttpClientFactory {
  createClient(): HttpClient;
}

// 具体工厂
class FetchClientFactory implements HttpClientFactory {
  createClient(): HttpClient {
    return new FetchClient();
  }
}

class XHRClientFactory implements HttpClientFactory {
  createClient(): HttpClient {
    return new XHRClient();
  }
}

class MockClientFactory implements HttpClientFactory {
  createClient(): HttpClient {
    return new MockClient();
  }
}

// API服务
class ApiService {
  private client: HttpClient;

  constructor(factory: HttpClientFactory) {
    this.client = factory.createClient();
  }

  async getUsers(): Promise<any> {
    return this.client.request({
      url: '/api/users',
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
  }

  async createUser(data: any): Promise<any> {
    return this.client.request({
      url: '/api/users',
      method: 'POST',
      data,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}

// 使用：根据环境自动选择
function getHttpClientFactory(): HttpClientFactory {
  if (process.env.NODE_ENV === 'test') {
    return new MockClientFactory();
  } else if (typeof fetch !== 'undefined') {
    return new FetchClientFactory();
  } else {
    return new XHRClientFactory();
  }
}

const apiService = new ApiService(getHttpClientFactory());
const users = await apiService.getUsers();
```

### 场景三：通知系统

```typescript
// 产品接口
interface Notification {
  send(message: string): void;
}

// 具体产品
class EmailNotification implements Notification {
  send(message: string): void {
    console.log(`发送邮件: ${message}`);
    // 实际发送邮件逻辑
  }
}

class SMSNotification implements Notification {
  send(message: string): void {
    console.log(`发送短信: ${message}`);
    // 实际发送短信逻辑
  }
}

class PushNotification implements Notification {
  send(message: string): void {
    console.log(`推送通知: ${message}`);
    // 实际推送逻辑
  }
}

// 工厂接口
interface NotificationFactory {
  createNotification(): Notification;
}

// 具体工厂
class EmailNotificationFactory implements NotificationFactory {
  createNotification(): Notification {
    return new EmailNotification();
  }
}

class SMSNotificationFactory implements NotificationFactory {
  createNotification(): Notification {
    return new SMSNotification();
  }
}

class PushNotificationFactory implements NotificationFactory {
  createNotification(): Notification {
    return new PushNotification();
  }
}

// 通知服务
class NotificationService {
  constructor(private factory: NotificationFactory) {}

  notify(message: string): void {
    const notification = this.factory.createNotification();
    notification.send(message);
  }
}

// 使用：根据用户偏好选择通知方式
function getNotificationFactory(userPreference: string): NotificationFactory {
  switch (userPreference) {
    case 'email':
      return new EmailNotificationFactory();
    case 'sms':
      return new SMSNotificationFactory();
    case 'push':
      return new PushNotificationFactory();
    default:
      return new PushNotificationFactory();
  }
}

const userPreference = 'email';
const factory = getNotificationFactory(userPreference);
const service = new NotificationService(factory);

service.notify('您有新消息'); // 发送邮件: 您有新消息
```

## 工厂方法 vs 简单工厂

| 对比维度 | 简单工厂 | 工厂方法 |
|---------|---------|---------|
| 工厂数量 | 1个工厂类 | 多个工厂类（每个产品一个） |
| 扩展性 | 新增产品需修改工厂 | 新增产品只需添加新工厂 |
| 开闭原则 | 违反 | 符合 |
| 代码复杂度 | 简单 | 相对复杂（类更多） |
| 适用场景 | 产品种类少且稳定 | 产品种类多或频繁扩展 |

## 什么时候用工厂方法？

| 场景 | 是否推荐 | 理由 |
|------|---------|------|
| 产品种类固定，不会扩展 | ❌ 否 | 简单工厂即可 |
| 产品种类频繁新增 | ✅ 是 | 符合开闭原则 |
| 需要第三方扩展 | ✅ 是 | 插件化架构 |
| 产品创建逻辑复杂 | ✅ 是 | 每个工厂职责单一 |
| 代码简洁优先 | ❌ 否 | 工厂方法类更多 |

## 总结

工厂方法模式的核心在于：**定义创建接口，延迟实例化到子类。**

**关键原则**：
1. **开闭原则**：新增产品不修改原有代码
2. **依赖倒置**：依赖工厂接口，不依赖具体工厂
3. **单一职责**：每个工厂只创建一种产品
4. **适度使用**：产品种类少时不要过度设计

**典型场景**：
- ✅ 产品种类多且可能扩展
- ✅ 需要支持第三方扩展
- ✅ 不同环境使用不同实现（dev/test/prod）
- ❌ 产品种类固定且简单（用简单工厂）
- ❌ 只有一个产品类（不需要工厂）

记住：**工厂方法不是为了复杂而复杂，而是为了在扩展性和复杂度之间找到平衡。**
