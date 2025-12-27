# 好代码的标准：可读性、可维护性与可扩展性

**思考一个问题**：什么是"好代码"？

每个开发者可能有不同的答案。有人说"能运行就是好代码"，有人说"没有 Bug 就是好代码"。但这些标准过于模糊，无法指导日常开发决策。

我们需要更精确的定义。

## 好代码的三大支柱

### 1. 可读性：代码是写给人看的

> "任何傻瓜都能写出计算机能理解的代码，优秀的程序员写出人能理解的代码。" — Martin Fowler

**为什么可读性如此重要？**

代码被阅读的次数远超过被编写的次数。一段代码可能只写一次，但会被阅读数十次、数百次：

- 代码审查时阅读
- Debug 时阅读
- 添加新功能时阅读
- 其他团队成员接手时阅读

**可读性的具体标准**：

```typescript
// ❌ 难以理解
function p(d: number[], t: number): number[] {
  return d.filter(x => x > t).map(x => x * 1.1);
}

// ✅ 清晰明了
function filterAndApplyPremiumRate(
  prices: number[], 
  threshold: number
): number[] {
  const premiumRate = 1.1;
  const aboveThreshold = prices.filter(price => price > threshold);
  return aboveThreshold.map(price => price * premiumRate);
}
```

**可读性检查清单**：

- **命名**：变量、函数、类的名称是否表达了意图？
- **结构**：代码流程是否清晰？嵌套是否过深？
- **注释**：复杂逻辑是否有解释？注释是否与代码一致？
- **一致性**：风格是否统一？

### 2. 可维护性：修改时的代价

**问一个问题**：如果需要修改一个功能，你需要改动多少文件？

可维护性衡量的是修改现有代码的难度和风险。

**可维护性差的症状**：

- 修改一处，多处出错（"霰弹枪式修改"）
- 添加功能需要大量理解上下文
- 害怕重构，选择"打补丁"
- 测试困难，不敢轻易改动

**可维护性的具体标准**：

```typescript
// ❌ 低可维护性 — 紧耦合
class OrderService {
  processOrder(order: Order) {
    // 直接依赖具体实现
    const user = new UserService().getUser(order.userId);
    const inventory = new InventoryService().check(order.items);
    new EmailService().send(user.email, 'Order confirmed');
    new LogService().log('Order processed');
    // 如果要换邮件服务，需要修改这个类
  }
}

// ✅ 高可维护性 — 松耦合
class OrderService {
  constructor(
    private userService: UserService,
    private inventoryService: InventoryService,
    private notificationService: NotificationService,
    private logger: Logger
  ) {}
  
  processOrder(order: Order) {
    const user = this.userService.getUser(order.userId);
    const inventory = this.inventoryService.check(order.items);
    this.notificationService.notify(user, 'Order confirmed');
    this.logger.log('Order processed');
    // 替换任何服务只需要在注入时更改
  }
}
```

**可维护性检查清单**：

- **单一职责**：每个模块是否只做一件事？
- **低耦合**：模块之间的依赖是否最小化？
- **高内聚**：相关功能是否放在一起？
- **可测试性**：能否独立测试每个模块？

### 3. 可扩展性：应对未来变化

**思考一个场景**：

产品经理说："我们要支持新的支付方式。"

可扩展性好的代码：添加一个新类，实现支付接口，注册到系统。
可扩展性差的代码：修改核心支付逻辑，添加大量 if-else，祈祷不会出错。

**可扩展性的具体标准**：

```typescript
// ❌ 低可扩展性 — 每加一种支付方式都要修改这个函数
function processPayment(type: string, amount: number) {
  if (type === 'creditCard') {
    // 信用卡逻辑
  } else if (type === 'paypal') {
    // PayPal 逻辑
  } else if (type === 'wechat') {
    // 微信支付逻辑
  }
  // 添加新支付方式？继续加 if-else...
}

// ✅ 高可扩展性 — 开闭原则
interface PaymentProcessor {
  process(amount: number): Promise<PaymentResult>;
}

class CreditCardProcessor implements PaymentProcessor {
  async process(amount: number) { /* ... */ }
}

class PayPalProcessor implements PaymentProcessor {
  async process(amount: number) { /* ... */ }
}

// 添加新支付方式？只需新增一个类
class WeChatProcessor implements PaymentProcessor {
  async process(amount: number) { /* ... */ }
}
```

**可扩展性检查清单**：

- **开闭原则**：能否不修改现有代码就添加新功能？
- **抽象层次**：是否依赖于抽象而非具体实现？
- **扩展点**：是否预留了合理的扩展机制？

## 三者之间的权衡

**重要的认知**：这三个标准之间存在张力。

| 追求 | 可能牺牲 | 例子 |
|------|---------|------|
| 极致可读性 | 可扩展性 | 过于具体的命名限制了复用 |
| 极致可维护性 | 可读性 | 过多抽象层增加理解成本 |
| 极致可扩展性 | 可读性 | 过度设计让简单问题变复杂 |

**平衡的艺术**：

- **YAGNI**（You Aren't Gonna Need It）：不要过度设计
- **Rule of Three**：代码重复三次再考虑抽象
- **渐进式重构**：随着需求演进逐步优化

## 实践建议

1. **先让代码工作**（Make it work）
2. **再让代码正确**（Make it right）
3. **最后让代码快**（Make it fast）

可读性、可维护性、可扩展性，主要体现在第二步。

## 总结

- **可读性**：代码应该易于理解，命名清晰，结构简洁
- **可维护性**：修改代码的代价应该尽可能低
- **可扩展性**：添加新功能不应该需要修改现有代码
- **权衡意识**：三者之间需要平衡，避免过度优化任何一个
- **渐进优化**：先工作，再正确，最后优化

接下来，我们将深入探讨软件复杂度的本质——这是影响代码质量的根本因素。
