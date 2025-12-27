# 责任链模式：请求的链式处理

## 从一个真实问题开始

假设你正在开发一个电商系统的订单处理模块。一个订单提交后，需要经过多个检查：

1. 用户是否登录？
2. 库存是否充足？
3. 用户余额是否足够？
4. 是否有优惠券可用？
5. 是否需要风控审核？

最直观的实现可能是这样：

```typescript
function processOrder(order: Order): Result {
  // 检查登录
  if (!order.user.isLoggedIn) {
    return { success: false, error: '请先登录' };
  }
  
  // 检查库存
  if (!checkInventory(order.items)) {
    return { success: false, error: '库存不足' };
  }
  
  // 检查余额
  if (!checkBalance(order.user, order.total)) {
    return { success: false, error: '余额不足' };
  }
  
  // 检查优惠券
  if (order.coupon && !validateCoupon(order.coupon)) {
    return { success: false, error: '优惠券无效' };
  }
  
  // 风控检查
  if (order.total > 10000 && !riskCheck(order)) {
    return { success: false, error: '需要人工审核' };
  }
  
  return { success: true };
}
```

这段代码有什么问题？

**问题一：违反开闭原则**。当需要添加新的检查逻辑时（比如地址验证），必须修改这个函数。

**问题二：职责混杂**。一个函数承担了太多职责，难以测试和维护。

**问题三：无法灵活配置**。不同的订单类型可能需要不同的检查流程，但当前实现是硬编码的。

## 责任链模式的核心思想

责任链模式的核心思想是：**将处理者组织成一条链，请求沿着链传递，直到有处理者处理它**。

每个处理者有两个选择：
1. 处理请求，终止传递
2. 将请求传递给下一个处理者

这与现实中的审批流程非常相似：员工提交报销申请，先由组长审批，组长权限不够则转给经理，经理权限不够则转给总监。

## 基础实现

让我们用 TypeScript 实现责任链模式：

```typescript
// 定义处理者接口
interface Handler<T = unknown> {
  setNext(handler: Handler<T>): Handler<T>;
  handle(request: T): T | null;
}

// 抽象处理者基类
abstract class AbstractHandler<T = unknown> implements Handler<T> {
  private nextHandler: Handler<T> | null = null;

  setNext(handler: Handler<T>): Handler<T> {
    this.nextHandler = handler;
    // 返回传入的处理者，支持链式调用
    return handler;
  }

  handle(request: T): T | null {
    if (this.nextHandler) {
      return this.nextHandler.handle(request);
    }
    return null;
  }
}
```

这里有一个设计技巧：`setNext` 返回传入的处理者而不是 `this`，这样可以支持链式构建：

```typescript
handler1.setNext(handler2).setNext(handler3);
```

## 重构订单处理

用责任链模式重构前面的订单处理：

```typescript
interface OrderRequest {
  order: Order;
  result?: { success: boolean; error?: string };
}

// 登录检查处理者
class LoginCheckHandler extends AbstractHandler<OrderRequest> {
  handle(request: OrderRequest): OrderRequest | null {
    if (!request.order.user.isLoggedIn) {
      request.result = { success: false, error: '请先登录' };
      return request; // 终止链，返回结果
    }
    // 传递给下一个处理者
    return super.handle(request);
  }
}

// 库存检查处理者
class InventoryCheckHandler extends AbstractHandler<OrderRequest> {
  handle(request: OrderRequest): OrderRequest | null {
    if (!this.checkInventory(request.order.items)) {
      request.result = { success: false, error: '库存不足' };
      return request;
    }
    return super.handle(request);
  }

  private checkInventory(items: OrderItem[]): boolean {
    // 实际的库存检查逻辑
    return true;
  }
}

// 余额检查处理者
class BalanceCheckHandler extends AbstractHandler<OrderRequest> {
  handle(request: OrderRequest): OrderRequest | null {
    if (!this.checkBalance(request.order.user, request.order.total)) {
      request.result = { success: false, error: '余额不足' };
      return request;
    }
    return super.handle(request);
  }

  private checkBalance(user: User, amount: number): boolean {
    return user.balance >= amount;
  }
}

// 成功处理者（链的末端）
class SuccessHandler extends AbstractHandler<OrderRequest> {
  handle(request: OrderRequest): OrderRequest | null {
    request.result = { success: true };
    return request;
  }
}
```

使用方式：

```typescript
// 构建责任链
const loginCheck = new LoginCheckHandler();
const inventoryCheck = new InventoryCheckHandler();
const balanceCheck = new BalanceCheckHandler();
const success = new SuccessHandler();

loginCheck
  .setNext(inventoryCheck)
  .setNext(balanceCheck)
  .setNext(success);

// 处理订单
const request: OrderRequest = { order: myOrder };
const result = loginCheck.handle(request);
console.log(result?.result);
```

## 函数式实现

在 JavaScript/TypeScript 中，我们可以用更简洁的函数式方式实现责任链：

```typescript
type Middleware<T> = (request: T, next: () => T | null) => T | null;

function createChain<T>(...middlewares: Middleware<T>[]): (request: T) => T | null {
  return (request: T) => {
    let index = 0;

    const next = (): T | null => {
      if (index >= middlewares.length) {
        return null;
      }
      const middleware = middlewares[index++];
      return middleware(request, next);
    };

    return next();
  };
}

// 使用示例
const loginMiddleware: Middleware<OrderRequest> = (req, next) => {
  if (!req.order.user.isLoggedIn) {
    req.result = { success: false, error: '请先登录' };
    return req;
  }
  return next();
};

const inventoryMiddleware: Middleware<OrderRequest> = (req, next) => {
  // 库存检查逻辑
  return next();
};

const chain = createChain(loginMiddleware, inventoryMiddleware);
const result = chain({ order: myOrder });
```

这种实现方式与 Express/Koa 中间件的工作原理非常相似。

## 责任链的变体

### 1. 纯传递型责任链

每个处理者都处理请求，但不终止链：

```typescript
class LoggingHandler extends AbstractHandler<OrderRequest> {
  handle(request: OrderRequest): OrderRequest | null {
    console.log('Processing order:', request.order.id);
    // 记录日志后继续传递
    return super.handle(request);
  }
}
```

### 2. 收集型责任链

所有处理者的结果被收集起来：

```typescript
interface ValidationResult {
  errors: string[];
}

class ValidationChain {
  private validators: Array<(order: Order) => string | null> = [];

  add(validator: (order: Order) => string | null): this {
    this.validators.push(validator);
    return this;
  }

  validate(order: Order): ValidationResult {
    const errors: string[] = [];
    for (const validator of this.validators) {
      const error = validator(order);
      if (error) {
        errors.push(error);
      }
    }
    return { errors };
  }
}
```

## 责任链的优缺点

**优点**：
- **解耦**：请求发送者不需要知道谁会处理请求
- **灵活**：可以动态地添加、删除、重排处理者
- **单一职责**：每个处理者只关注自己的逻辑

**缺点**：
- **调试困难**：请求可能经过很多处理者，追踪起来比较麻烦
- **性能开销**：长链可能带来性能问题
- **可能无人处理**：如果链配置不当，请求可能落空

## 应用场景

1. **中间件系统**：Express、Koa、Redux 中间件
2. **拦截器**：HTTP 请求/响应拦截器
3. **审批流程**：多级审批、权限检查
4. **事件处理**：DOM 事件冒泡机制
5. **日志处理**：多级日志过滤器

## 与其他模式的关系

- **装饰器模式**：装饰器增强对象功能，责任链传递请求
- **命令模式**：责任链可以用来处理命令
- **组合模式**：责任链可以沿着组合树传递请求

## 总结

责任链模式通过将处理者组织成链，实现了请求处理的解耦和灵活配置。它是前端中间件系统的核心模式，理解它能帮助你更好地理解和使用各种中间件框架。

关键要点：
1. 每个处理者决定是处理请求还是传递请求
2. `setNext` 返回传入的处理者以支持链式构建
3. 函数式实现更符合 JavaScript 的风格
4. 注意责任链可能带来的调试和性能问题
