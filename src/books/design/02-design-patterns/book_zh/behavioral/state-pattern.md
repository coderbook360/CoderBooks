# 状态模式：状态驱动的行为变化

## 问题的起源

假设你正在开发一个订单系统，订单有多种状态：待支付、已支付、已发货、已完成、已取消。不同状态下，订单可以执行的操作不同：

```typescript
class Order {
  private status: string = 'pending';

  pay(): void {
    if (this.status === 'pending') {
      this.status = 'paid';
      console.log('支付成功');
    } else if (this.status === 'paid') {
      console.log('订单已支付，请勿重复支付');
    } else if (this.status === 'shipped') {
      console.log('订单已发货，无法支付');
    } else if (this.status === 'completed') {
      console.log('订单已完成，无法支付');
    } else if (this.status === 'cancelled') {
      console.log('订单已取消，无法支付');
    }
  }

  ship(): void {
    if (this.status === 'pending') {
      console.log('请先支付');
    } else if (this.status === 'paid') {
      this.status = 'shipped';
      console.log('已发货');
    } else if (this.status === 'shipped') {
      console.log('订单已发货');
    }
    // ... 更多状态判断
  }

  cancel(): void {
    // 类似的条件判断...
  }
}
```

这段代码有什么问题？

**问题一：条件判断爆炸**。每个方法都需要处理所有状态，代码冗长且重复。

**问题二：难以扩展**。添加新状态需要修改所有方法。

**问题三：容易出错**。状态转换逻辑分散在各处，难以保证一致性。

## 状态模式的核心思想

状态模式的核心思想是：**将每个状态封装成独立的类**，每个状态类负责处理该状态下的行为和状态转换。

对象在不同状态下表现出不同的行为，就好像对象的类发生了改变一样。

## 基础实现

用 TypeScript 实现状态模式：

```typescript
// 订单上下文接口（供状态类使用）
interface OrderContext {
  setState(state: OrderState): void;
  getOrderId(): string;
}

// 状态接口
interface OrderState {
  pay(context: OrderContext): void;
  ship(context: OrderContext): void;
  complete(context: OrderContext): void;
  cancel(context: OrderContext): void;
  getStatus(): string;
}
```

定义具体状态类：

```typescript
// 待支付状态
class PendingState implements OrderState {
  pay(context: OrderContext): void {
    console.log('支付成功');
    context.setState(new PaidState());
  }

  ship(context: OrderContext): void {
    console.log('请先支付订单');
  }

  complete(context: OrderContext): void {
    console.log('订单未支付，无法完成');
  }

  cancel(context: OrderContext): void {
    console.log('订单已取消');
    context.setState(new CancelledState());
  }

  getStatus(): string {
    return 'pending';
  }
}

// 已支付状态
class PaidState implements OrderState {
  pay(context: OrderContext): void {
    console.log('订单已支付，请勿重复支付');
  }

  ship(context: OrderContext): void {
    console.log('订单已发货');
    context.setState(new ShippedState());
  }

  complete(context: OrderContext): void {
    console.log('订单未发货，无法完成');
  }

  cancel(context: OrderContext): void {
    console.log('已支付订单取消，将退款');
    context.setState(new CancelledState());
  }

  getStatus(): string {
    return 'paid';
  }
}

// 已发货状态
class ShippedState implements OrderState {
  pay(context: OrderContext): void {
    console.log('订单已支付');
  }

  ship(context: OrderContext): void {
    console.log('订单已发货');
  }

  complete(context: OrderContext): void {
    console.log('订单已完成');
    context.setState(new CompletedState());
  }

  cancel(context: OrderContext): void {
    console.log('订单已发货，无法取消');
  }

  getStatus(): string {
    return 'shipped';
  }
}

// 已完成状态
class CompletedState implements OrderState {
  pay(context: OrderContext): void {
    console.log('订单已完成');
  }

  ship(context: OrderContext): void {
    console.log('订单已完成');
  }

  complete(context: OrderContext): void {
    console.log('订单已完成');
  }

  cancel(context: OrderContext): void {
    console.log('订单已完成，无法取消');
  }

  getStatus(): string {
    return 'completed';
  }
}

// 已取消状态
class CancelledState implements OrderState {
  pay(context: OrderContext): void {
    console.log('订单已取消');
  }

  ship(context: OrderContext): void {
    console.log('订单已取消');
  }

  complete(context: OrderContext): void {
    console.log('订单已取消');
  }

  cancel(context: OrderContext): void {
    console.log('订单已取消');
  }

  getStatus(): string {
    return 'cancelled';
  }
}
```

订单类：

```typescript
class Order implements OrderContext {
  private state: OrderState;
  private orderId: string;

  constructor(orderId: string) {
    this.orderId = orderId;
    this.state = new PendingState();
  }

  setState(state: OrderState): void {
    console.log(`状态变更: ${this.state.getStatus()} -> ${state.getStatus()}`);
    this.state = state;
  }

  getOrderId(): string {
    return this.orderId;
  }

  getStatus(): string {
    return this.state.getStatus();
  }

  pay(): void {
    this.state.pay(this);
  }

  ship(): void {
    this.state.ship(this);
  }

  complete(): void {
    this.state.complete(this);
  }

  cancel(): void {
    this.state.cancel(this);
  }
}
```

使用方式：

```typescript
const order = new Order('ORD-001');

order.pay();      // 支付成功，状态变更: pending -> paid
order.ship();     // 订单已发货，状态变更: paid -> shipped
order.complete(); // 订单已完成，状态变更: shipped -> completed
order.cancel();   // 订单已完成，无法取消
```

## 状态模式 vs 策略模式

状态模式和策略模式的结构非常相似，但目的不同：

| 特性 | 状态模式 | 策略模式 |
|------|---------|---------|
| 目的 | 管理状态转换 | 封装可替换的算法 |
| 状态感知 | 状态对象知道其他状态 | 策略对象相互独立 |
| 切换方式 | 状态内部自动切换 | 客户端主动切换 |
| 上下文 | 状态可以改变上下文状态 | 策略通常不改变上下文 |

## 状态机的表格驱动实现

对于复杂的状态机，可以使用表格驱动的方式：

```typescript
type StateTransition<S extends string, E extends string> = {
  [state in S]?: {
    [event in E]?: {
      target: S;
      action?: () => void;
    };
  };
};

class StateMachine<S extends string, E extends string> {
  private state: S;
  private transitions: StateTransition<S, E>;

  constructor(initialState: S, transitions: StateTransition<S, E>) {
    this.state = initialState;
    this.transitions = transitions;
  }

  getState(): S {
    return this.state;
  }

  send(event: E): boolean {
    const stateTransitions = this.transitions[this.state];
    if (!stateTransitions) return false;

    const transition = stateTransitions[event];
    if (!transition) return false;

    transition.action?.();
    this.state = transition.target;
    return true;
  }
}

// 使用
type OrderStatus = 'pending' | 'paid' | 'shipped' | 'completed' | 'cancelled';
type OrderEvent = 'pay' | 'ship' | 'complete' | 'cancel';

const orderMachine = new StateMachine<OrderStatus, OrderEvent>('pending', {
  pending: {
    pay: { target: 'paid', action: () => console.log('处理支付') },
    cancel: { target: 'cancelled', action: () => console.log('取消订单') },
  },
  paid: {
    ship: { target: 'shipped', action: () => console.log('安排发货') },
    cancel: { target: 'cancelled', action: () => console.log('退款') },
  },
  shipped: {
    complete: { target: 'completed', action: () => console.log('确认收货') },
  },
});

orderMachine.send('pay');     // pending -> paid
orderMachine.send('ship');    // paid -> shipped
orderMachine.send('complete'); // shipped -> completed
```

## 带守卫条件的状态转换

有时状态转换需要满足特定条件：

```typescript
interface Transition<S, E, C> {
  target: S;
  guard?: (context: C) => boolean;
  action?: (context: C) => void;
}

class GuardedStateMachine<S extends string, E extends string, C> {
  private state: S;
  private context: C;
  private transitions: {
    [state in S]?: {
      [event in E]?: Transition<S, E, C>[];
    };
  };

  constructor(
    initialState: S,
    context: C,
    transitions: typeof this.transitions
  ) {
    this.state = initialState;
    this.context = context;
    this.transitions = transitions;
  }

  send(event: E): boolean {
    const stateTransitions = this.transitions[this.state]?.[event];
    if (!stateTransitions) return false;

    // 找到第一个满足守卫条件的转换
    for (const transition of stateTransitions) {
      if (!transition.guard || transition.guard(this.context)) {
        transition.action?.(this.context);
        this.state = transition.target;
        return true;
      }
    }

    return false;
  }
}
```

## 状态模式的优缺点

**优点**：
- **消除条件语句**：避免大量的状态判断
- **单一职责**：每个状态类只负责一个状态的行为
- **开闭原则**：添加新状态无需修改现有代码
- **状态转换明确**：状态转换逻辑集中在状态类中

**缺点**：
- **类数量增加**：每个状态都需要一个类
- **状态依赖**：状态类之间可能存在依赖

## 应用场景

1. **订单状态**：电商订单的状态流转
2. **流程审批**：多级审批流程
3. **游戏角色**：角色的不同状态（行走、奔跑、跳跃）
4. **UI 组件**：组件的加载、成功、失败状态
5. **网络连接**：连接、断开、重连状态

## 总结

状态模式通过将状态封装成独立的类，消除了复杂的条件判断，使状态转换逻辑清晰可维护。对于复杂的状态机，可以使用表格驱动的方式来简化实现。

关键要点：
1. 每个状态封装成独立的类
2. 状态类负责处理当前状态的行为和转换
3. 状态模式和策略模式结构相似，但目的不同
4. 表格驱动适合复杂状态机
5. 守卫条件可以增加转换的灵活性
