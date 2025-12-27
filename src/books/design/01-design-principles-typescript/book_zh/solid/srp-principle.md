# 单一职责原则 (SRP)

> "一个类应该只有一个引起它变化的原因。" —— Robert C. Martin

## 什么是单一职责原则？

**单一职责原则（Single Responsibility Principle，SRP）** 是 SOLID 原则的第一个原则，也是最容易被误解的一个。

很多人把它理解为"一个类只做一件事"，但这个理解太过简单。让我们用一个问题来重新思考：

**思考**：一个 `User` 类同时处理用户数据存储和发送欢迎邮件，这违反了 SRP 吗？

答案是：**是的**。因为有两个不同的"人"可能会要求修改这个类：
1. 数据库管理员可能要求修改数据存储方式
2. 市场部可能要求修改欢迎邮件的内容

这就引出了 SRP 的真正含义。

## 职责 = 变化的原因

Bob 大叔（Robert C. Martin）给出的定义更加精确：

> "一个模块应该对一个，且只对一个 Actor（参与者）负责。"

**Actor** 指的是要求修改代码的一类人或角色。不同的 Actor 有不同的需求，如果一个类服务于多个 Actor，那么修改一个 Actor 的需求可能会影响到其他 Actor。

```typescript
// ❌ 违反 SRP：服务于多个 Actor
class Employee {
  name: string;
  salary: number;

  // Actor 1: CFO 关心薪资计算
  calculatePay(): number {
    return this.getRegularHours() * this.hourlyRate;
  }

  // Actor 2: COO 关心工时报告
  reportHours(): string {
    return `${this.name} worked ${this.getRegularHours()} hours`;
  }

  // Actor 3: CTO 关心数据存储
  save(): void {
    // 保存到数据库
  }

  // 共享的私有方法 — 这里埋下了隐患！
  private getRegularHours(): number {
    // 计算常规工时
    return 40;
  }
}
```

**问题在哪里？**

假设 CFO 要求修改加班费的计算方式，开发者修改了 `getRegularHours()` 方法。但这个方法也被 `reportHours()` 使用！结果 COO 的工时报告也被意外改变了。

**这就是 SRP 要避免的问题：一个 Actor 的需求变更影响到其他 Actor。**

## 如何识别职责

### 提问法

问自己这些问题：
1. 这个类为谁服务？
2. 谁会要求修改这个类？
3. 如果修改了一个功能，是否可能影响其他功能？

### 描述法

用一句话描述类的职责，如果需要用"和"来连接，可能就违反了 SRP：

- ❌ "这个类负责用户验证**和**发送邮件"
- ❌ "这个类负责订单处理**和**库存管理"
- ✅ "这个类负责用户身份验证"
- ✅ "这个类负责订单状态管理"

## 解决方案：分离职责

回到前面的 Employee 例子，我们应该这样重构：

```typescript
// ✅ 遵循 SRP：每个类只服务于一个 Actor

// 数据实体类
class Employee {
  constructor(
    public name: string,
    public salary: number,
    public hoursWorked: number
  ) {}
}

// Actor 1: CFO 的需求
class PayCalculator {
  calculatePay(employee: Employee): number {
    const regularHours = this.getRegularHours(employee);
    return regularHours * employee.salary;
  }

  private getRegularHours(employee: Employee): number {
    // CFO 定义的常规工时计算方式
    return Math.min(employee.hoursWorked, 40);
  }
}

// Actor 2: COO 的需求
class HoursReporter {
  reportHours(employee: Employee): string {
    const hours = this.getReportableHours(employee);
    return `${employee.name} worked ${hours} hours`;
  }

  private getReportableHours(employee: Employee): number {
    // COO 定义的工时报告方式
    return employee.hoursWorked;
  }
}

// Actor 3: CTO 的需求
class EmployeeRepository {
  save(employee: Employee): void {
    // 数据存储逻辑
  }

  findById(id: string): Employee | null {
    // 数据查询逻辑
    return null;
  }
}
```

现在每个类都有单一的职责：
- `Employee`：纯数据结构
- `PayCalculator`：薪资计算（服务于 CFO）
- `HoursReporter`：工时报告（服务于 COO）
- `EmployeeRepository`：数据持久化（服务于 CTO）

## TypeScript 实战示例

让我们看一个更贴近前端开发的例子：

### 场景：用户服务

```typescript
// ❌ 违反 SRP 的设计
class UserService {
  async register(email: string, password: string): Promise<User> {
    // 1. 验证输入
    if (!this.isValidEmail(email)) {
      throw new Error('Invalid email');
    }
    if (password.length < 8) {
      throw new Error('Password too short');
    }

    // 2. 密码加密
    const hashedPassword = await bcrypt.hash(password, 10);

    // 3. 保存到数据库
    const user = await this.db.users.create({
      email,
      password: hashedPassword
    });

    // 4. 发送欢迎邮件
    await this.sendWelcomeEmail(user);

    // 5. 记录日志
    console.log(`User ${email} registered`);

    return user;
  }

  private isValidEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  private async sendWelcomeEmail(user: User): Promise<void> {
    // 发送邮件逻辑
  }
}
```

**思考**：这个类有多少个职责？

1. 输入验证
2. 密码加密
3. 数据持久化
4. 邮件发送
5. 日志记录

### 重构：分离职责

```typescript
// ✅ 遵循 SRP 的设计

// 输入验证
class UserValidator {
  validateEmail(email: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  }

  validatePassword(password: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    if (password.length < 8) {
      errors.push('Password must be at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('Password must contain an uppercase letter');
    }
    return { valid: errors.length === 0, errors };
  }
}

// 密码处理
class PasswordHasher {
  async hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  async verify(password: string, hash: string): Promise<boolean> {
    return bcrypt.compare(password, hash);
  }
}

// 数据持久化
class UserRepository {
  constructor(private db: Database) {}

  async create(data: CreateUserDTO): Promise<User> {
    return this.db.users.create(data);
  }

  async findByEmail(email: string): Promise<User | null> {
    return this.db.users.findOne({ email });
  }
}

// 邮件服务
class EmailService {
  async sendWelcomeEmail(user: User): Promise<void> {
    // 邮件发送逻辑
  }
}

// 日志服务
class Logger {
  info(message: string): void {
    console.log(`[INFO] ${new Date().toISOString()}: ${message}`);
  }
}

// 用户服务：组合各个职责
class UserService {
  constructor(
    private validator: UserValidator,
    private hasher: PasswordHasher,
    private repository: UserRepository,
    private emailService: EmailService,
    private logger: Logger
  ) {}

  async register(email: string, password: string): Promise<User> {
    // 验证
    if (!this.validator.validateEmail(email)) {
      throw new Error('Invalid email');
    }
    const passwordValidation = this.validator.validatePassword(password);
    if (!passwordValidation.valid) {
      throw new Error(passwordValidation.errors.join(', '));
    }

    // 创建用户
    const hashedPassword = await this.hasher.hash(password);
    const user = await this.repository.create({
      email,
      password: hashedPassword
    });

    // 副作用
    await this.emailService.sendWelcomeEmail(user);
    this.logger.info(`User ${email} registered`);

    return user;
  }
}
```

## SRP 的权衡

### 过度设计的陷阱

SRP 不是说每个方法都要单独成为一个类。关键是识别**真正不同的 Actor**。

```typescript
// ❌ 过度设计：没有实际的职责分离价值
class EmailValidator { ... }
class PasswordValidator { ... }
class UsernameValidator { ... }

// ✅ 合理：这些验证逻辑服务于同一个 Actor（用户注册流程）
class RegistrationValidator {
  validateEmail(email: string): boolean { ... }
  validatePassword(password: string): ValidationResult { ... }
  validateUsername(username: string): boolean { ... }
}
```

### 实用主义原则

1. **等到有变化时再分离**：如果一个类从未因为不同原因被修改，可能不需要急着分离
2. **关注真实的 Actor**：思考真正会要求修改代码的人是谁
3. **保持合理的粒度**：太细会导致类爆炸，太粗会导致职责混乱

## 与其他原则的关系

SRP 是其他原则的基础：

- **开闭原则（OCP）**：职责单一的类更容易扩展
- **接口隔离原则（ISP）**：职责单一意味着接口更聚焦
- **依赖倒置原则（DIP）**：职责分离促进依赖于抽象

## 总结

**单一职责原则的核心**：

1. 一个类应该只对一个 Actor 负责
2. "职责"是指"变化的原因"，不是"做的事情"
3. 分离职责可以减少修改的副作用
4. 但要避免过度设计，等到真正需要时再分离

**快速检查清单**：
- [ ] 这个类服务于多少个不同的 Actor？
- [ ] 修改一个功能时，是否需要担心影响其他功能？
- [ ] 用一句话描述职责时，是否需要用"和"？
- [ ] 类的修改是否总是因为同一个原因？

如果对以上问题的回答表明职责不单一，考虑重构。
