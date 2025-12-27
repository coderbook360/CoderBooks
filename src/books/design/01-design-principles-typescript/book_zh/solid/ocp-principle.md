# 开闭原则 (OCP)

> "软件实体（类、模块、函数等）应该对扩展开放，对修改关闭。" —— Bertrand Meyer

## 什么是开闭原则？

**开闭原则（Open-Closed Principle，OCP）** 听起来很矛盾：既要开放，又要关闭？让我们用一个问题来理解：

**思考**：如果每次添加新功能都要修改现有代码，会有什么问题？

1. 可能引入新的 Bug
2. 需要重新测试所有相关功能
3. 修改可能影响其他依赖该代码的模块

OCP 的目标就是：**不修改现有代码就能添加新功能**。

## 一个糟糕的设计

假设我们要实现一个图形面积计算器：

```typescript
// ❌ 违反 OCP 的设计
class AreaCalculator {
  calculateArea(shape: any): number {
    if (shape.type === 'rectangle') {
      return shape.width * shape.height;
    } else if (shape.type === 'circle') {
      return Math.PI * shape.radius ** 2;
    } else if (shape.type === 'triangle') {
      return (shape.base * shape.height) / 2;
    }
    // 每添加一种新图形，都要修改这个方法
    throw new Error('Unknown shape');
  }
}
```

**问题在哪里？**

每次添加新的图形类型（比如椭圆、菱形），都必须：
1. 修改 `calculateArea` 方法
2. 添加新的 `if-else` 分支
3. 重新测试整个方法

这就是**对修改开放**——我们的代码需要不断被修改。

## 解决方案：多态

使用多态实现 OCP：

```typescript
// ✅ 遵循 OCP 的设计

// 定义抽象接口
interface Shape {
  calculateArea(): number;
}

// 实现具体图形
class Rectangle implements Shape {
  constructor(
    private width: number,
    private height: number
  ) {}

  calculateArea(): number {
    return this.width * this.height;
  }
}

class Circle implements Shape {
  constructor(private radius: number) {}

  calculateArea(): number {
    return Math.PI * this.radius ** 2;
  }
}

class Triangle implements Shape {
  constructor(
    private base: number,
    private height: number
  ) {}

  calculateArea(): number {
    return (this.base * this.height) / 2;
  }
}

// 面积计算器不再需要知道具体图形类型
class AreaCalculator {
  calculateTotal(shapes: Shape[]): number {
    return shapes.reduce((sum, shape) => sum + shape.calculateArea(), 0);
  }
}
```

现在添加新图形只需要：

```typescript
// 添加椭圆 —— 不需要修改任何现有代码！
class Ellipse implements Shape {
  constructor(
    private a: number,  // 长半轴
    private b: number   // 短半轴
  ) {}

  calculateArea(): number {
    return Math.PI * this.a * this.b;
  }
}

// 直接使用
const shapes: Shape[] = [
  new Rectangle(10, 5),
  new Circle(3),
  new Ellipse(4, 2)  // 新增
];

const calculator = new AreaCalculator();
console.log(calculator.calculateTotal(shapes));
```

**这就是对扩展开放、对修改关闭**——我们扩展了功能，但没有修改任何现有代码。

## 实现 OCP 的策略

### 策略一：抽象与多态

这是最常见的方式，如上面的例子所示。关键是：
1. 定义抽象接口
2. 让具体实现继承接口
3. 客户端依赖抽象而非具体实现

### 策略二：策略模式

```typescript
// 支付处理示例
interface PaymentStrategy {
  pay(amount: number): Promise<PaymentResult>;
}

class CreditCardPayment implements PaymentStrategy {
  async pay(amount: number): Promise<PaymentResult> {
    // 信用卡支付逻辑
    return { success: true, transactionId: 'cc_xxx' };
  }
}

class PayPalPayment implements PaymentStrategy {
  async pay(amount: number): Promise<PaymentResult> {
    // PayPal 支付逻辑
    return { success: true, transactionId: 'pp_xxx' };
  }
}

class WeChatPayment implements PaymentStrategy {
  async pay(amount: number): Promise<PaymentResult> {
    // 微信支付逻辑
    return { success: true, transactionId: 'wc_xxx' };
  }
}

// 支付服务对修改关闭
class PaymentService {
  async processPayment(
    strategy: PaymentStrategy,
    amount: number
  ): Promise<PaymentResult> {
    // 可以添加通用的前置/后置处理
    console.log(`Processing payment of $${amount}`);
    const result = await strategy.pay(amount);
    console.log(`Payment result: ${result.success}`);
    return result;
  }
}
```

### 策略三：装饰器模式

```typescript
// 日志记录示例
interface Logger {
  log(message: string): void;
}

class ConsoleLogger implements Logger {
  log(message: string): void {
    console.log(message);
  }
}

// 装饰器：添加时间戳
class TimestampLogger implements Logger {
  constructor(private wrapped: Logger) {}

  log(message: string): void {
    const timestamp = new Date().toISOString();
    this.wrapped.log(`[${timestamp}] ${message}`);
  }
}

// 装饰器：添加日志级别
class LevelLogger implements Logger {
  constructor(
    private wrapped: Logger,
    private level: string
  ) {}

  log(message: string): void {
    this.wrapped.log(`[${this.level}] ${message}`);
  }
}

// 组合使用 —— 不修改原有类，通过组合扩展功能
const logger = new TimestampLogger(
  new LevelLogger(
    new ConsoleLogger(),
    'INFO'
  )
);

logger.log('Hello World');
// 输出: [2025-01-01T00:00:00.000Z] [INFO] Hello World
```

### 策略四：插件架构

```typescript
// 事件系统示例
type EventHandler<T = any> = (data: T) => void;

class EventEmitter {
  private handlers = new Map<string, EventHandler[]>();

  // 对扩展开放：可以注册任意事件处理器
  on<T>(event: string, handler: EventHandler<T>): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, []);
    }
    this.handlers.get(event)!.push(handler);
  }

  // 对修改关闭：核心逻辑不需要改变
  emit<T>(event: string, data: T): void {
    const handlers = this.handlers.get(event) || [];
    handlers.forEach(handler => handler(data));
  }
}

// 使用：添加新功能不需要修改 EventEmitter
const emitter = new EventEmitter();

emitter.on('user:created', (user) => {
  console.log('Send welcome email to', user.email);
});

emitter.on('user:created', (user) => {
  console.log('Create default settings for', user.id);
});

emitter.on('user:created', (user) => {
  console.log('Track analytics for new user');
});
```

## TypeScript 实战：可扩展的验证系统

```typescript
// 定义验证规则接口
interface ValidationRule<T> {
  validate(value: T): ValidationResult;
}

interface ValidationResult {
  valid: boolean;
  errors: string[];
}

// 具体验证规则
class RequiredRule implements ValidationRule<any> {
  validate(value: any): ValidationResult {
    const valid = value !== null && value !== undefined && value !== '';
    return {
      valid,
      errors: valid ? [] : ['This field is required']
    };
  }
}

class MinLengthRule implements ValidationRule<string> {
  constructor(private minLength: number) {}

  validate(value: string): ValidationResult {
    const valid = value.length >= this.minLength;
    return {
      valid,
      errors: valid ? [] : [`Minimum length is ${this.minLength}`]
    };
  }
}

class EmailRule implements ValidationRule<string> {
  validate(value: string): ValidationResult {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value);
    return {
      valid,
      errors: valid ? [] : ['Invalid email format']
    };
  }
}

class PatternRule implements ValidationRule<string> {
  constructor(
    private pattern: RegExp,
    private message: string
  ) {}

  validate(value: string): ValidationResult {
    const valid = this.pattern.test(value);
    return {
      valid,
      errors: valid ? [] : [this.message]
    };
  }
}

// 验证器：对修改关闭
class Validator<T> {
  private rules: ValidationRule<T>[] = [];

  // 对扩展开放：可以添加任意规则
  addRule(rule: ValidationRule<T>): this {
    this.rules.push(rule);
    return this;
  }

  validate(value: T): ValidationResult {
    const allErrors: string[] = [];

    for (const rule of this.rules) {
      const result = rule.validate(value);
      if (!result.valid) {
        allErrors.push(...result.errors);
      }
    }

    return {
      valid: allErrors.length === 0,
      errors: allErrors
    };
  }
}

// 使用示例
const emailValidator = new Validator<string>()
  .addRule(new RequiredRule())
  .addRule(new EmailRule());

const passwordValidator = new Validator<string>()
  .addRule(new RequiredRule())
  .addRule(new MinLengthRule(8))
  .addRule(new PatternRule(
    /[A-Z]/,
    'Must contain at least one uppercase letter'
  ))
  .addRule(new PatternRule(
    /[0-9]/,
    'Must contain at least one number'
  ));

// 添加新规则不需要修改 Validator 类
class NoWhitespaceRule implements ValidationRule<string> {
  validate(value: string): ValidationResult {
    const valid = !/\s/.test(value);
    return {
      valid,
      errors: valid ? [] : ['Must not contain whitespace']
    };
  }
}

passwordValidator.addRule(new NoWhitespaceRule());
```

## OCP 的权衡

### 不是所有代码都需要 OCP

OCP 增加了抽象层，这意味着：
- 更多的代码
- 更高的复杂度
- 需要预见未来的变化点

**实用主义原则**：

1. **第一次**：直接写简单实现
2. **第二次**：如果需要修改，考虑是否有模式
3. **第三次**：重构为符合 OCP 的设计

```typescript
// 第一次：简单实现
function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

// 第二次：需要支持多币种，开始看到模式
function formatPrice(price: number, currency: string): string {
  switch (currency) {
    case 'USD': return `$${price.toFixed(2)}`;
    case 'EUR': return `€${price.toFixed(2)}`;
    default: return `${price.toFixed(2)} ${currency}`;
  }
}

// 第三次：重构为 OCP
interface CurrencyFormatter {
  format(price: number): string;
}

class USDFormatter implements CurrencyFormatter {
  format(price: number): string {
    return `$${price.toFixed(2)}`;
  }
}

class EURFormatter implements CurrencyFormatter {
  format(price: number): string {
    return `€${price.toFixed(2)}`;
  }
}
```

## 与其他原则的关系

- **SRP**：职责单一的类更容易做到 OCP
- **LSP**：子类型替换是多态实现 OCP 的基础
- **DIP**：依赖抽象而非具体，是 OCP 的前提

## 总结

**开闭原则的核心**：

1. 对扩展开放：添加新功能应该通过新增代码实现
2. 对修改关闭：不应该修改已有的、正常工作的代码
3. 关键技术：抽象、多态、策略模式、装饰器模式
4. 权衡：不要过早抽象，等到看到变化模式再重构

**快速检查清单**：
- [ ] 添加新功能是否需要修改现有代码？
- [ ] 是否可以通过添加新类来扩展功能？
- [ ] 是否定义了合适的抽象接口？
- [ ] 客户端是否依赖抽象而非具体实现？
