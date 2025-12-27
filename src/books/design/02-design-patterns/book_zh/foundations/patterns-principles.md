# 设计模式与设计原则的关系

## 设计原则是地基，设计模式是房子

首先要问一个问题：**为什么学习设计模式之前要先了解设计原则？**

想象盖房子：
- **设计原则**是建筑规范（承重墙怎么设计、采光如何保证）
- **设计模式**是标准化的房型（三室两厅、复式楼）

如果不懂建筑规范，直接套用房型，可能建出来的房子不稳固、不实用。同样，如果不理解设计原则，生搬硬套设计模式，代码可能更糟糕。

## SOLID 原则概览

SOLID 是五个设计原则的首字母缩写，由 Robert C. Martin (Uncle Bob) 提出：

| 原则 | 英文全称 | 核心思想 |
|------|---------|---------|
| **S**RP | Single Responsibility Principle | 单一职责：一个类只做一件事 |
| **O**CP | Open-Closed Principle | 开闭原则：对扩展开放，对修改关闭 |
| **L**SP | Liskov Substitution Principle | 里氏替换：子类能替换父类 |
| **I**SP | Interface Segregation Principle | 接口隔离：不依赖不需要的接口 |
| **D**IP | Dependency Inversion Principle | 依赖倒置：依赖抽象而非具体实现 |

这些原则的共同目标：**让代码易于维护、易于扩展、易于理解**。

## 设计模式如何体现 SOLID 原则

现在我要问第二个问题：**每个设计模式是如何体现这些原则的？**

### 1. 策略模式 → 开闭原则 (OCP)

**问题场景**：支付系统需要支持多种支付方式（支付宝、微信、银行卡）。

**糟糕的做法**：
```typescript
class PaymentService {
  pay(amount: number, method: string) {
    if (method === 'alipay') {
      // 支付宝支付逻辑
      console.log(`支付宝支付 ${amount} 元`);
    } else if (method === 'wechat') {
      // 微信支付逻辑
      console.log(`微信支付 ${amount} 元`);
    } else if (method === 'bank') {
      // 银行卡支付逻辑
      console.log(`银行卡支付 ${amount} 元`);
    }
    // 每增加一种支付方式都要修改这个类 ❌
  }
}
```

**问题**：违反了开闭原则。每增加一种支付方式都要修改 `PaymentService`，可能引入 bug。

**策略模式改进**：
```typescript
// 定义支付策略接口
interface PaymentStrategy {
  pay(amount: number): void;
}

// 具体策略实现
class AlipayStrategy implements PaymentStrategy {
  pay(amount: number) {
    console.log(`支付宝支付 ${amount} 元`);
  }
}

class WechatStrategy implements PaymentStrategy {
  pay(amount: number) {
    console.log(`微信支付 ${amount} 元`);
  }
}

// 新增 // 新增支付方式无需修改现有代码
class BankCardStrategy implements PaymentStrategy {
  pay(amount: number) {
    console.log(`银行卡支付 ${amount} 元`);
  }
}

// 上下文类
class PaymentService {
  private strategy: PaymentStrategy;

  constructor(strategy: PaymentStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: PaymentStrategy) {
    this.strategy = strategy;
  }

  pay(amount: number) {
    this.strategy.pay(amount); // 委托给具体策略
  }
}

// 使用
const service = new PaymentService(new AlipayStrategy());
service.pay(100);

service.setStrategy(new WechatStrategy());
service.pay(200);
```

**体现原则**：
- ✅ 对扩展开放：新增支付方式只需添加新策略类
- ✅ 对修改关闭：`PaymentService` 无需修改

### 2. 装饰器模式 → 单一职责原则 (SRP)

**问题场景**：给日志系统增加功能（加密、压缩、远程上传）。

**糟糕的做法**：
```typescript
class Logger {
  log(message: string) {
    // 记录日志
    // 加密日志
    // 压缩日志
    // 上传到服务器
    // 一个类承担了太多职责 ❌
  }
}
```

**问题**：违反单一职责原则。Logger 类同时负责日志记录、加密、压缩、上传，职责过多。

**装饰器模式改进**：
```typescript
// 基础接口
interface Logger {
  log(message: string): void;
}

// 基础实现
class SimpleLogger implements Logger {
  log(message: string) {
    console.log(`[LOG] ${message}`);
  }
}

// 加密装饰器
class EncryptedLogger implements Logger {
  constructor(private logger: Logger) {}

  log(message: string) {
    const encrypted = this.encrypt(message);
    this.logger.log(encrypted);
  }

  private encrypt(message: string) {
    return Buffer.from(message).toString('base64');
  }
}

// 压缩装饰器
class CompressedLogger implements Logger {
  constructor(private logger: Logger) {}

  log(message: string) {
    const compressed = this.compress(message);
    this.logger.log(compressed);
  }

  private compress(message: string) {
    return `[COMPRESSED] ${message}`;
  }
}

// 使用：灵活组合功能
let logger: Logger = new SimpleLogger();
logger = new EncryptedLogger(logger);
logger = new CompressedLogger(logger);

logger.log('敏感信息');
// 输出: [LOG] [COMPRESSED] [BASE64加密后的内容]
```

**体现原则**：
- ✅ 每个类只负责一个功能
- ✅ 通过组合而非继承实现功能叠加

### 3. 依赖注入 → 依赖倒置原则 (DIP)

**问题场景**：用户服务依赖数据库。

**糟糕的做法**：
```typescript
class MySQLDatabase {
  save(data: any) {
    console.log('保存到 MySQL');
  }
}

class UserService {
  private db = new MySQLDatabase(); // 直接依赖具体实现 ❌

  createUser(name: string) {
    this.db.save({ name });
  }
}
```

**问题**：违反依赖倒置原则。`UserService` 直接依赖 `MySQLDatabase`，无法切换到其他数据库。

**依赖注入改进**：
```typescript
// 定义抽象接口
interface Database {
  save(data: any): void;
}

// 具体实现
class MySQLDatabase implements Database {
  save(data: any) {
    console.log('保存到 MySQL', data);
  }
}

class MongoDBDatabase implements Database {
  save(data: any) {
    console.log('保存到 MongoDB', data);
  }
}

// 依赖抽象接口
class UserService {
  constructor(private db: Database) {} // 注入依赖

  createUser(name: string) {
    this.db.save({ name });
  }
}

// 使用：灵活切换数据库
const mysqlDB = new MySQLDatabase();
const service1 = new UserService(mysqlDB);
service1.createUser('Alice');

const mongoDB = new MongoDBDatabase();
const service2 = new UserService(mongoDB);
service2.createUser('Bob');
```

**体现原则**：
- ✅ 依赖抽象 `Database` 接口，而非具体实现
- ✅ 高层模块 (`UserService`) 不依赖低层模块 (`MySQLDatabase`)

## 原则与模式的对应关系

| SOLID 原则 | 典型设计模式 | 解决的问题 |
|-----------|------------|----------|
| SRP | 装饰器、代理 | 避免类承担多个职责 |
| OCP | 策略、模板方法、工厂 | 扩展功能无需修改现有代码 |
| LSP | 工厂方法、抽象工厂 | 确保多态性的正确使用 |
| ISP | 适配器、外观 | 避免接口臃肿 |
| DIP | 工厂、依赖注入 | 解耦高层与低层模块 |

## 如何在实践中应用？

### 第一步：识别违反原则的代码

看到以下"坏味道"就要警惕：
- 一个类有多个修改原因 → 违反 SRP
- 每次需求变更都要改很多地方 → 违反 OCP
- 子类无法替换父类 → 违反 LSP
- 接口有很多不相关的方法 → 违反 ISP
- 类直接 `new` 依赖对象 → 违反 DIP

### 第二步：选择合适的设计模式

根据问题选择模式：
- 需要动态切换算法 → **策略模式**
- 需要动态增强功能 → **装饰器模式**
- 需要控制对象创建 → **工厂模式**
- 需要解耦依赖 → **依赖注入**

### 第三步：权衡利弊

设计模式不是银弹，要考虑：
- **复杂度**：是否引入过多抽象？
- **性能**：是否影响运行效率？
- **团队**：团队成员能理解吗？

记住：**简单问题用简单方案，复杂问题才考虑设计模式。**

## 总结

设计原则和设计模式的关系：
- **设计原则是"道"**：告诉你什么样的设计是好的
- **设计模式是"术"**：告诉你如何实现好的设计

理解原则后学习模式，才能真正掌握模式的精髓，而不是死记硬背。下一章，我们将学习如何选择和应用设计模式。
