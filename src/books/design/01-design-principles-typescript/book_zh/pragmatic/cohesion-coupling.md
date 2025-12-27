# 高内聚低耦合

**高内聚低耦合**是模块化设计的核心准则，也是评判代码结构好坏的关键指标。

## 什么是内聚

**内聚（Cohesion）** 衡量的是：一个模块内部各元素之间的关联程度。

**高内聚**：模块内的功能紧密相关，共同完成一个明确的职责。

```typescript
// ✅ 高内聚：所有方法都围绕"用户认证"
class AuthService {
  async login(credentials: Credentials): Promise<User> { /* ... */ }
  async logout(): Promise<void> { /* ... */ }
  async refreshToken(): Promise<string> { /* ... */ }
  isAuthenticated(): boolean { /* ... */ }
}

// ❌ 低内聚：方法之间没有关联
class UtilService {
  formatDate(date: Date): string { /* ... */ }
  sendEmail(to: string, body: string): void { /* ... */ }
  calculateTax(amount: number): number { /* ... */ }
  resizeImage(image: Blob): Blob { /* ... */ }
}
```

## 什么是耦合

**耦合（Coupling）** 衡量的是：模块之间的依赖程度。

**低耦合**：模块之间依赖少，修改一个模块不会影响其他模块。

```typescript
// ❌ 高耦合：OrderService 直接依赖具体实现
class OrderService {
  processOrder(order: Order) {
    const user = new UserService().getUser(order.userId);
    new InventoryService().updateStock(order.items);
    new EmailService().send(user.email, 'Order confirmed');
    new LogService().log('Order processed');
  }
}

// ✅ 低耦合：依赖抽象，通过注入获取
class OrderService {
  constructor(
    private userService: UserService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private logger: Logger
  ) {}
  
  processOrder(order: Order) {
    const user = this.userService.getUser(order.userId);
    this.inventoryService.updateStock(order.items);
    this.notificationService.notify(user, 'Order confirmed');
    this.logger.log('Order processed');
  }
}
```

## 内聚的级别

从低到高排列：

### 1. 偶然内聚（最差）

模块内的元素毫无关联，只是碰巧放在一起。

```typescript
// ❌ 偶然内聚
class Utils {
  static formatDate() { /* ... */ }
  static calculateDistance() { /* ... */ }
  static encryptPassword() { /* ... */ }
}
```

### 2. 逻辑内聚

元素因为逻辑上相似而放在一起，但功能不同。

```typescript
// ❌ 逻辑内聚：都是"导出"，但导出不同的东西
class ExportService {
  exportUsersToCSV() { /* ... */ }
  exportOrdersToJSON() { /* ... */ }
  exportReportsToHTML() { /* ... */ }
}
```

### 3. 时序内聚

元素因为需要在同一时间执行而放在一起。

```typescript
// ⚠️ 时序内聚：初始化时执行的操作
class AppInitializer {
  init() {
    this.loadConfig();
    this.connectDatabase();
    this.startServer();
    this.registerRoutes();
  }
}
```

### 4. 功能内聚（最佳）

所有元素共同完成一个单一、明确的功能。

```typescript
// ✅ 功能内聚：所有方法服务于"用户管理"
class UserRepository {
  findById(id: string): User | null { /* ... */ }
  save(user: User): User { /* ... */ }
  delete(id: string): void { /* ... */ }
  findByEmail(email: string): User | null { /* ... */ }
}
```

## 耦合的类型

从高到低排列：

### 1. 内容耦合（最差）

一个模块直接修改另一个模块的内部状态。

```typescript
// ❌ 内容耦合
class ModuleA {
  process(moduleB: ModuleB) {
    moduleB.internalState = 'modified'; // 直接访问内部状态
  }
}
```

### 2. 公共耦合

多个模块共享全局变量。

```typescript
// ❌ 公共耦合
let globalConfig = {};

class ModuleA {
  process() {
    globalConfig.value = 'A';
  }
}

class ModuleB {
  process() {
    globalConfig.value = 'B'; // 可能覆盖 A 的设置
  }
}
```

### 3. 控制耦合

一个模块通过参数控制另一个模块的行为。

```typescript
// ⚠️ 控制耦合
function process(data: Data, mode: 'create' | 'update' | 'delete') {
  switch (mode) {
    case 'create': return create(data);
    case 'update': return update(data);
    case 'delete': return remove(data);
  }
}
```

### 4. 数据耦合（最佳）

模块之间只通过参数传递简单数据。

```typescript
// ✅ 数据耦合
function calculateTotal(items: { price: number; quantity: number }[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

## 实践指南

### 提高内聚的方法

**1. 单一职责**

```typescript
// ❌ 多职责
class User {
  name: string;
  email: string;
  
  validate() { /* ... */ }
  save() { /* ... */ }
  sendEmail() { /* ... */ }
}

// ✅ 单一职责
class User {
  name: string;
  email: string;
}

class UserValidator {
  validate(user: User): ValidationResult { /* ... */ }
}

class UserRepository {
  save(user: User): User { /* ... */ }
}
```

**2. 按功能组织**

```typescript
// ✅ 功能内聚的目录结构
src/
├── features/
│   ├── auth/
│   │   ├── AuthService.ts
│   │   ├── AuthController.ts
│   │   └── auth.types.ts
│   └── orders/
│       ├── OrderService.ts
│       ├── OrderController.ts
│       └── order.types.ts
```

### 降低耦合的方法

**1. 依赖注入**

```typescript
// ✅ 通过构造函数注入依赖
class OrderService {
  constructor(
    private readonly userRepo: UserRepository,
    private readonly emailService: EmailService
  ) {}
}
```

**2. 依赖抽象而非具体**

```typescript
// ✅ 依赖接口
interface Logger {
  log(message: string): void;
}

class OrderService {
  constructor(private logger: Logger) {}
}

// 可以轻松替换实现
const orderService = new OrderService(new ConsoleLogger());
const orderService = new OrderService(new FileLogger());
```

**3. 事件驱动**

```typescript
// ✅ 解耦：通过事件通信
class OrderService {
  constructor(private eventBus: EventBus) {}
  
  createOrder(order: Order) {
    // 处理订单...
    this.eventBus.emit('order:created', order);
    // 不关心谁会处理这个事件
  }
}

// 其他服务监听事件
eventBus.on('order:created', (order) => emailService.sendConfirmation(order));
eventBus.on('order:created', (order) => analyticsService.trackOrder(order));
```

**4. 最小化接口**

```typescript
// ❌ 暴露过多
class UserService {
  private db: Database;
  private cache: Cache;
  
  getDb() { return this.db; } // 暴露内部实现
}

// ✅ 最小化暴露
class UserService {
  findById(id: string): User | null { /* ... */ }
  save(user: User): User { /* ... */ }
  // 只暴露必要的方法
}
```

## 权衡

### 内聚与粒度

过度追求内聚可能导致类太小：

```typescript
// ❌ 过细粒度
class UserNameValidator { validate(name: string): boolean { /* ... */ } }
class UserEmailValidator { validate(email: string): boolean { /* ... */ } }
class UserAgeValidator { validate(age: number): boolean { /* ... */ } }

// ✅ 合理粒度
class UserValidator {
  validate(user: User): ValidationResult {
    return {
      name: this.validateName(user.name),
      email: this.validateEmail(user.email),
      age: this.validateAge(user.age)
    };
  }
}
```

### 耦合与便利

有时适度耦合可以简化代码：

```typescript
// 为了"低耦合"而过度抽象
const result = serviceLocator
  .get<UserService>('UserService')
  .getRepository()
  .findById(id);

// 直接依赖，更清晰
const result = userRepository.findById(id);
```

## 总结

**高内聚**：
- 模块内的功能紧密相关
- 遵循单一职责原则
- 按功能组织代码

**低耦合**：
- 模块之间依赖最小化
- 依赖抽象而非具体
- 使用依赖注入
- 考虑事件驱动

**记住**：目标是找到平衡点，而非走极端。过度追求任一方向都会带来问题。
