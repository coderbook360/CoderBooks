# 依赖倒置原则 (DIP)

> "高层模块不应该依赖低层模块，两者都应该依赖抽象。抽象不应该依赖细节，细节应该依赖抽象。" —— Robert C. Martin

## 什么是依赖倒置原则？

**依赖倒置原则（Dependency Inversion Principle，DIP）** 是 SOLID 原则中最重要的一个，它是实现松耦合架构的关键。

**思考**：如果你的业务逻辑直接调用 MySQL 数据库，想换成 MongoDB 会怎样？

你需要修改所有涉及数据库的代码。这就是**紧耦合**的问题。

DIP 的解决方案是：**让业务逻辑依赖"数据存储"的抽象，而不是具体的 MySQL 或 MongoDB**。

## 传统的依赖方向

在传统的分层架构中，依赖是自上而下的：

```
┌─────────────────┐
│   Controller    │  ──────┐
└─────────────────┘        │
         │                 │  高层依赖低层
         ▼                 │
┌─────────────────┐        │
│    Service      │  ◄─────┘
└─────────────────┘
         │
         ▼
┌─────────────────┐
│   Repository    │  ◄──── 具体实现
└─────────────────┘
         │
         ▼
┌─────────────────┐
│    Database     │
└─────────────────┘
```

**问题**：Service 直接依赖 Repository 的具体实现。

```typescript
// ❌ 违反 DIP：高层模块直接依赖低层模块
class UserService {
  private repository = new MySQLUserRepository();  // 直接创建具体实现

  async createUser(data: CreateUserDTO): Promise<User> {
    // 直接依赖 MySQL 实现
    return this.repository.create(data);
  }
}

class MySQLUserRepository {
  async create(data: CreateUserDTO): Promise<User> {
    // MySQL 特定的实现
    return mysql.query('INSERT INTO users...');
  }
}
```

如果要换成 MongoDB：
1. 需要修改 `UserService` 的代码
2. 需要确保新的 Repository 有相同的方法签名
3. 可能影响所有使用 `UserService` 的代码

## 依赖倒置后的架构

```
┌─────────────────┐
│   Controller    │
└─────────────────┘
         │
         ▼
┌─────────────────┐
│    Service      │ ────────┐
└─────────────────┘         │
         │                  │  都依赖抽象
         ▼                  │
┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐        │
   <<interface>>           │
│  IUserRepository │ ◄──────┘
└ ─ ─ ─ ─ ─ ─ ─ ─ ┘
         ▲
         │ implements
         │
┌─────────────────┐
│MySQLUserRepository│  ◄──── 细节依赖抽象
└─────────────────┘
```

**关键变化**：
- `Service` 依赖 `IUserRepository` 接口（抽象）
- `MySQLUserRepository` 实现 `IUserRepository` 接口
- 依赖方向被"倒置"了

```typescript
// ✅ 遵循 DIP

// 1. 定义抽象接口（由高层模块定义）
interface IUserRepository {
  create(data: CreateUserDTO): Promise<User>;
  findById(id: string): Promise<User | null>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
}

// 2. 高层模块依赖抽象
class UserService {
  constructor(private repository: IUserRepository) {}

  async createUser(data: CreateUserDTO): Promise<User> {
    // 业务逻辑...
    return this.repository.create(data);
  }

  async getUser(id: string): Promise<User> {
    const user = await this.repository.findById(id);
    if (!user) throw new NotFoundError('User not found');
    return user;
  }
}

// 3. 低层模块实现抽象
class MySQLUserRepository implements IUserRepository {
  async create(data: CreateUserDTO): Promise<User> {
    return mysql.query('INSERT INTO users...');
  }

  async findById(id: string): Promise<User | null> {
    return mysql.query('SELECT * FROM users WHERE id = ?', [id]);
  }

  // ... 其他方法
}

class MongoUserRepository implements IUserRepository {
  async create(data: CreateUserDTO): Promise<User> {
    return mongo.collection('users').insertOne(data);
  }

  async findById(id: string): Promise<User | null> {
    return mongo.collection('users').findOne({ _id: id });
  }

  // ... 其他方法
}
```

## 依赖注入 (DI)

DIP 告诉我们"依赖抽象"，但如何在运行时提供具体实现呢？答案是**依赖注入**。

### 构造函数注入（推荐）

```typescript
class UserService {
  constructor(private repository: IUserRepository) {}
}

// 在应用启动时组装
const repository = new MySQLUserRepository();
const userService = new UserService(repository);
```

### 属性注入

```typescript
class UserService {
  repository!: IUserRepository;

  async createUser(data: CreateUserDTO): Promise<User> {
    return this.repository.create(data);
  }
}

const userService = new UserService();
userService.repository = new MySQLUserRepository();
```

### 方法注入

```typescript
class UserService {
  async createUser(
    data: CreateUserDTO,
    repository: IUserRepository
  ): Promise<User> {
    return repository.create(data);
  }
}
```

### 使用 DI 容器

```typescript
import { Container, injectable, inject } from 'inversify';

const TYPES = {
  UserRepository: Symbol.for('UserRepository'),
  UserService: Symbol.for('UserService'),
};

@injectable()
class MySQLUserRepository implements IUserRepository {
  // ...
}

@injectable()
class UserService {
  constructor(
    @inject(TYPES.UserRepository) private repository: IUserRepository
  ) {}
}

// 配置容器
const container = new Container();
container.bind<IUserRepository>(TYPES.UserRepository).to(MySQLUserRepository);
container.bind<UserService>(TYPES.UserService).to(UserService);

// 获取实例
const userService = container.get<UserService>(TYPES.UserService);
```

## TypeScript 实战示例

### 场景：邮件服务

```typescript
// ❌ 紧耦合设计
class NotificationService {
  async notifyUser(userId: string, message: string): Promise<void> {
    const user = await this.db.query(`SELECT email FROM users WHERE id = ?`, [userId]);
    
    // 直接依赖 nodemailer
    const transporter = nodemailer.createTransport({
      host: 'smtp.gmail.com',
      // ...配置
    });
    
    await transporter.sendMail({
      to: user.email,
      subject: 'Notification',
      text: message
    });
    
    // 直接依赖 console.log
    console.log(`Email sent to ${user.email}`);
  }
}
```

**问题**：
1. 无法测试（会真的发邮件）
2. 无法更换邮件服务商
3. 日志方式写死

```typescript
// ✅ 依赖倒置设计

// 定义抽象
interface IEmailSender {
  send(to: string, subject: string, body: string): Promise<void>;
}

interface ILogger {
  info(message: string): void;
  error(message: string, error?: Error): void;
}

interface IUserReader {
  findById(id: string): Promise<{ email: string } | null>;
}

// 高层模块依赖抽象
class NotificationService {
  constructor(
    private userReader: IUserReader,
    private emailSender: IEmailSender,
    private logger: ILogger
  ) {}

  async notifyUser(userId: string, message: string): Promise<void> {
    const user = await this.userReader.findById(userId);
    if (!user) {
      this.logger.error(`User not found: ${userId}`);
      return;
    }

    try {
      await this.emailSender.send(user.email, 'Notification', message);
      this.logger.info(`Email sent to ${user.email}`);
    } catch (error) {
      this.logger.error(`Failed to send email`, error as Error);
      throw error;
    }
  }
}

// 具体实现
class NodemailerEmailSender implements IEmailSender {
  private transporter: nodemailer.Transporter;

  constructor(config: SmtpConfig) {
    this.transporter = nodemailer.createTransport(config);
  }

  async send(to: string, subject: string, body: string): Promise<void> {
    await this.transporter.sendMail({ to, subject, text: body });
  }
}

class SendGridEmailSender implements IEmailSender {
  constructor(private apiKey: string) {}

  async send(to: string, subject: string, body: string): Promise<void> {
    await sendgrid.send({
      to,
      from: 'noreply@example.com',
      subject,
      text: body
    });
  }
}

class ConsoleLogger implements ILogger {
  info(message: string): void {
    console.log(`[INFO] ${message}`);
  }

  error(message: string, error?: Error): void {
    console.error(`[ERROR] ${message}`, error);
  }
}

// 组装
const notificationService = new NotificationService(
  new MySQLUserRepository(),
  new SendGridEmailSender(process.env.SENDGRID_KEY!),
  new ConsoleLogger()
);

// 测试时使用 Mock
class MockEmailSender implements IEmailSender {
  sentEmails: Array<{ to: string; subject: string; body: string }> = [];

  async send(to: string, subject: string, body: string): Promise<void> {
    this.sentEmails.push({ to, subject, body });
  }
}

class MockLogger implements ILogger {
  logs: string[] = [];
  
  info(message: string): void {
    this.logs.push(`INFO: ${message}`);
  }

  error(message: string): void {
    this.logs.push(`ERROR: ${message}`);
  }
}

// 测试
const mockEmail = new MockEmailSender();
const mockLogger = new MockLogger();
const testService = new NotificationService(
  new MockUserReader(),
  mockEmail,
  mockLogger
);

await testService.notifyUser('123', 'Hello');
expect(mockEmail.sentEmails).toHaveLength(1);
```

### 场景：配置系统

```typescript
// 抽象
interface IConfigProvider {
  get<T>(key: string): T | undefined;
  getRequired<T>(key: string): T;
}

// 环境变量实现
class EnvConfigProvider implements IConfigProvider {
  get<T>(key: string): T | undefined {
    const value = process.env[key];
    return value as T | undefined;
  }

  getRequired<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Missing required config: ${key}`);
    }
    return value;
  }
}

// JSON 文件实现
class JsonConfigProvider implements IConfigProvider {
  private config: Record<string, any>;

  constructor(filePath: string) {
    this.config = JSON.parse(fs.readFileSync(filePath, 'utf-8'));
  }

  get<T>(key: string): T | undefined {
    return this.config[key] as T | undefined;
  }

  getRequired<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Missing required config: ${key}`);
    }
    return value;
  }
}

// 组合实现（先查环境变量，再查配置文件）
class CompositeConfigProvider implements IConfigProvider {
  constructor(private providers: IConfigProvider[]) {}

  get<T>(key: string): T | undefined {
    for (const provider of this.providers) {
      const value = provider.get<T>(key);
      if (value !== undefined) return value;
    }
    return undefined;
  }

  getRequired<T>(key: string): T {
    const value = this.get<T>(key);
    if (value === undefined) {
      throw new Error(`Missing required config: ${key}`);
    }
    return value;
  }
}

// 使用
const configProvider = new CompositeConfigProvider([
  new EnvConfigProvider(),
  new JsonConfigProvider('./config.json')
]);

class DatabaseService {
  constructor(private config: IConfigProvider) {}

  connect(): void {
    const host = this.config.getRequired<string>('DB_HOST');
    const port = this.config.get<number>('DB_PORT') ?? 5432;
    // ...
  }
}
```

## 抽象应该由谁定义？

**重要原则**：抽象接口应该由**使用方（高层模块）**定义，而不是实现方（低层模块）。

```
错误的做法：
┌─────────────────┐
│    Service      │ ────────────────┐
└─────────────────┘                 │ depends on
                                    ▼
                          ┌─────────────────┐
                          │ Repository 定义  │  ◄── 接口在低层模块
                          │   的接口         │
                          └─────────────────┘

正确的做法：
┌─────────────────┐
│    Service      │ ◄─── 接口在高层模块旁边
│  定义 IRepository│
└─────────────────┘
         │
         │ depends on interface
         ▼
┌ ─ ─ ─ ─ ─ ─ ─ ─ ┐
    IRepository
└ ─ ─ ─ ─ ─ ─ ─ ─ ┘
         ▲
         │ implements
┌─────────────────┐
│   Repository    │
└─────────────────┘
```

这确保了：
- 接口反映业务需求，而不是技术实现
- 更换实现不会影响接口定义
- 高层模块拥有对接口的控制权

## 与其他原则的关系

- **SRP**：小的、专注的类更容易作为依赖注入
- **OCP**：依赖抽象使得扩展不需要修改高层代码
- **LSP**：实现抽象接口时必须遵循契约
- **ISP**：小接口更容易定义合适的抽象

## 总结

**依赖倒置原则的核心**：

1. 高层模块和低层模块都应该依赖抽象
2. 抽象不应该依赖细节，细节应该依赖抽象
3. 抽象由使用方定义，而不是实现方
4. 通过依赖注入在运行时提供具体实现

**快速检查清单**：
- [ ] 类是否直接 new 它的依赖？
- [ ] 业务逻辑是否依赖具体的框架或库？
- [ ] 更换依赖的实现是否需要修改高层代码？
- [ ] 测试时是否能轻松替换依赖为 Mock？

**何时应用 DIP**：
- 依赖可能变化（如数据库、外部服务）
- 需要单元测试的代码
- 跨越架构边界的依赖
- 多个实现策略的场景
