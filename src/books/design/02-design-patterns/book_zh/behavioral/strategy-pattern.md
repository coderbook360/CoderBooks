# 策略模式：算法的封装与切换

## 问题的起源

假设你正在开发一个电商系统，需要实现商品价格计算。不同的会员等级享受不同的折扣：

```typescript
function calculatePrice(price: number, userType: string): number {
  if (userType === 'normal') {
    return price;
  } else if (userType === 'vip') {
    return price * 0.9;
  } else if (userType === 'svip') {
    return price * 0.8;
  } else if (userType === 'enterprise') {
    return price * 0.7;
  }
  return price;
}
```

这段代码有什么问题？

**问题一：条件分支膨胀**。每增加一种会员类型，就要添加一个 `else if`。

**问题二：违反开闭原则**。修改折扣规则必须修改这个函数。

**问题三：难以测试**。所有逻辑耦合在一起，无法单独测试某种折扣策略。

## 策略模式的核心思想

策略模式的核心思想是：**定义一系列算法，将每个算法封装起来，并使它们可以互相替换**。

策略模式让算法的变化独立于使用它的客户端。换句话说，你可以在运行时动态切换算法，而不需要修改使用算法的代码。

## 基础实现

用 TypeScript 实现策略模式：

```typescript
// 策略接口
interface PricingStrategy {
  calculate(price: number): number;
}

// 普通用户策略
class NormalPricing implements PricingStrategy {
  calculate(price: number): number {
    return price;
  }
}

// VIP 用户策略
class VipPricing implements PricingStrategy {
  calculate(price: number): number {
    return price * 0.9;
  }
}

// SVIP 用户策略
class SvipPricing implements PricingStrategy {
  calculate(price: number): number {
    return price * 0.8;
  }
}

// 企业用户策略
class EnterprisePricing implements PricingStrategy {
  calculate(price: number): number {
    return price * 0.7;
  }
}
```

定义上下文类来使用策略：

```typescript
// 上下文
class PriceCalculator {
  private strategy: PricingStrategy;

  constructor(strategy: PricingStrategy) {
    this.strategy = strategy;
  }

  setStrategy(strategy: PricingStrategy): void {
    this.strategy = strategy;
  }

  calculate(price: number): number {
    return this.strategy.calculate(price);
  }
}

// 使用
const calculator = new PriceCalculator(new NormalPricing());
console.log(calculator.calculate(100)); // 100

calculator.setStrategy(new VipPricing());
console.log(calculator.calculate(100)); // 90
```

## 函数式策略模式

在 JavaScript/TypeScript 中，函数是一等公民，我们可以用更简洁的方式实现策略模式：

```typescript
// 策略就是函数
type PricingStrategy = (price: number) => number;

const normalPricing: PricingStrategy = (price) => price;
const vipPricing: PricingStrategy = (price) => price * 0.9;
const svipPricing: PricingStrategy = (price) => price * 0.8;
const enterprisePricing: PricingStrategy = (price) => price * 0.7;

// 策略映射
const strategies: Record<string, PricingStrategy> = {
  normal: normalPricing,
  vip: vipPricing,
  svip: svipPricing,
  enterprise: enterprisePricing,
};

// 使用
function calculatePrice(price: number, userType: string): number {
  const strategy = strategies[userType] ?? normalPricing;
  return strategy(price);
}
```

这种方式消除了大量的类定义，代码更加简洁。

## 策略工厂

当策略较多时，可以结合工厂模式：

```typescript
class PricingStrategyFactory {
  private static strategies = new Map<string, PricingStrategy>();

  static register(type: string, strategy: PricingStrategy): void {
    this.strategies.set(type, strategy);
  }

  static get(type: string): PricingStrategy {
    const strategy = this.strategies.get(type);
    if (!strategy) {
      throw new Error(`Unknown pricing strategy: ${type}`);
    }
    return strategy;
  }
}

// 注册策略
PricingStrategyFactory.register('normal', normalPricing);
PricingStrategyFactory.register('vip', vipPricing);
PricingStrategyFactory.register('svip', svipPricing);

// 使用
const strategy = PricingStrategyFactory.get('vip');
console.log(strategy(100)); // 90
```

## 带参数的策略

策略可以接受参数来增加灵活性：

```typescript
// 可配置的折扣策略
function createDiscountStrategy(discount: number): PricingStrategy {
  return (price: number) => price * (1 - discount);
}

// 满减策略
function createThresholdStrategy(threshold: number, reduction: number): PricingStrategy {
  return (price: number) => (price >= threshold ? price - reduction : price);
}

// 组合策略
function composeStrategies(...strategies: PricingStrategy[]): PricingStrategy {
  return (price: number) => strategies.reduce((p, s) => s(p), price);
}

// 使用
const vipWithCoupon = composeStrategies(
  createDiscountStrategy(0.1),     // 9折
  createThresholdStrategy(100, 10) // 满100减10
);

console.log(vipWithCoupon(200)); // (200 * 0.9) - 10 = 170
```

## 实际应用：表单验证

策略模式非常适合表单验证场景：

```typescript
// 验证策略接口
interface ValidationStrategy {
  validate(value: string): { valid: boolean; message?: string };
}

// 必填验证
const required: ValidationStrategy = {
  validate(value: string) {
    return value.trim()
      ? { valid: true }
      : { valid: false, message: '此字段为必填项' };
  },
};

// 邮箱验证
const email: ValidationStrategy = {
  validate(value: string) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(value)
      ? { valid: true }
      : { valid: false, message: '请输入有效的邮箱地址' };
  },
};

// 长度验证
function minLength(min: number): ValidationStrategy {
  return {
    validate(value: string) {
      return value.length >= min
        ? { valid: true }
        : { valid: false, message: `最少需要 ${min} 个字符` };
    },
  };
}

// 验证器
class Validator {
  private strategies: ValidationStrategy[] = [];

  use(strategy: ValidationStrategy): this {
    this.strategies.push(strategy);
    return this;
  }

  validate(value: string): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    for (const strategy of this.strategies) {
      const result = strategy.validate(value);
      if (!result.valid && result.message) {
        errors.push(result.message);
      }
    }
    
    return { valid: errors.length === 0, errors };
  }
}

// 使用
const emailValidator = new Validator()
  .use(required)
  .use(email);

console.log(emailValidator.validate('')); 
// { valid: false, errors: ['此字段为必填项', '请输入有效的邮箱地址'] }

console.log(emailValidator.validate('test@example.com')); 
// { valid: true, errors: [] }
```

## 策略模式 vs 状态模式

策略模式和状态模式的结构非常相似，但意图不同：

| 特性 | 策略模式 | 状态模式 |
|------|---------|---------|
| 目的 | 封装可互换的算法 | 封装基于状态的行为 |
| 切换时机 | 客户端主动切换 | 状态内部自动切换 |
| 状态感知 | 策略不知道其他策略 | 状态可能知道其他状态 |
| 典型场景 | 算法选择、验证规则 | 状态机、流程控制 |

## 策略模式的优缺点

**优点**：
- **消除条件语句**：避免大量的 if-else 或 switch-case
- **开闭原则**：添加新策略无需修改现有代码
- **单一职责**：每个策略类只负责一个算法
- **运行时切换**：可以动态改变对象的行为

**缺点**：
- **类数量增加**：每个策略都需要一个类（函数式实现可缓解）
- **客户端必须了解策略**：需要知道有哪些策略可选
- **策略间无法通信**：策略之间是独立的

## 应用场景

1. **价格计算**：不同的折扣策略、促销策略
2. **表单验证**：不同的验证规则
3. **排序算法**：不同的排序策略
4. **日志处理**：不同的日志格式化策略
5. **支付方式**：不同的支付处理策略
6. **压缩算法**：不同的压缩策略

## 总结

策略模式通过将算法封装成独立的策略对象，实现了算法的解耦和动态切换。在 JavaScript/TypeScript 中，由于函数是一等公民，策略模式可以用函数来实现，更加简洁灵活。

关键要点：
1. 策略模式的核心是**封装算法**，使其可互换
2. 函数式实现比类实现更简洁
3. 策略工厂可以管理大量策略
4. 策略可以组合使用
5. 策略模式和状态模式结构相似，但意图不同
