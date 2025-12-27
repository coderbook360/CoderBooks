# 观察者模式：事件驱动的核心

## 从一个真实场景说起

假设你正在开发一个电商应用，当用户下单成功后，需要：

1. 发送订单确认邮件
2. 更新库存数量
3. 记录订单日志
4. 通知仓库发货
5. 更新用户积分

最直观的实现可能是这样：

```typescript
class OrderService {
  createOrder(order: Order): void {
    // 保存订单
    this.saveOrder(order);
    
    // 发送邮件
    emailService.sendOrderConfirmation(order);
    
    // 更新库存
    inventoryService.updateStock(order.items);
    
    // 记录日志
    logService.logOrder(order);
    
    // 通知仓库
    warehouseService.notifyShipment(order);
    
    // 更新积分
    pointsService.addPoints(order.user, order.total);
  }
}
```

这段代码有什么问题？

**问题一：高度耦合**。`OrderService` 依赖了 5 个其他服务，任何一个服务变化都可能影响它。

**问题二：违反开闭原则**。如果要添加新的通知逻辑（比如推送通知），必须修改 `createOrder` 方法。

**问题三：难以测试**。测试 `createOrder` 需要 mock 所有依赖的服务。

**问题四：同步阻塞**。所有操作都是同步的，如果邮件发送很慢，整个下单流程都会变慢。

## 观察者模式的核心思想

观察者模式定义了一种**一对多的依赖关系**：当一个对象（主题/Subject）的状态发生变化时，所有依赖它的对象（观察者/Observer）都会自动收到通知。

观察者模式实现了发布者和订阅者之间的解耦。发布者不需要知道有哪些订阅者，订阅者也不需要知道发布者的内部实现。

## 基础实现

用 TypeScript 实现观察者模式：

```typescript
// 观察者接口
interface Observer<T> {
  update(data: T): void;
}

// 主题接口
interface Subject<T> {
  subscribe(observer: Observer<T>): void;
  unsubscribe(observer: Observer<T>): void;
  notify(data: T): void;
}

// 主题实现
class ConcreteSubject<T> implements Subject<T> {
  private observers: Set<Observer<T>> = new Set();

  subscribe(observer: Observer<T>): void {
    this.observers.add(observer);
  }

  unsubscribe(observer: Observer<T>): void {
    this.observers.delete(observer);
  }

  notify(data: T): void {
    this.observers.forEach(observer => observer.update(data));
  }
}
```

重构订单服务：

```typescript
// 订单事件类型
interface OrderEvent {
  type: 'created' | 'paid' | 'shipped' | 'completed';
  order: Order;
}

// 订单主题
class OrderSubject extends ConcreteSubject<OrderEvent> {}

// 邮件观察者
class EmailObserver implements Observer<OrderEvent> {
  update(event: OrderEvent): void {
    if (event.type === 'created') {
      console.log(`发送订单确认邮件: ${event.order.id}`);
    }
  }
}

// 库存观察者
class InventoryObserver implements Observer<OrderEvent> {
  update(event: OrderEvent): void {
    if (event.type === 'created') {
      console.log(`更新库存: ${event.order.items}`);
    }
  }
}

// 积分观察者
class PointsObserver implements Observer<OrderEvent> {
  update(event: OrderEvent): void {
    if (event.type === 'completed') {
      console.log(`增加积分: ${event.order.total}`);
    }
  }
}

// 使用
const orderSubject = new OrderSubject();
orderSubject.subscribe(new EmailObserver());
orderSubject.subscribe(new InventoryObserver());
orderSubject.subscribe(new PointsObserver());

// 创建订单时通知所有观察者
orderSubject.notify({ type: 'created', order: myOrder });
```

## 函数式观察者

在 JavaScript 中，我们可以用函数替代观察者对象：

```typescript
type Listener<T> = (data: T) => void;
type Unsubscribe = () => void;

class EventEmitter<T> {
  private listeners: Set<Listener<T>> = new Set();

  subscribe(listener: Listener<T>): Unsubscribe {
    this.listeners.add(listener);
    // 返回取消订阅函数
    return () => this.listeners.delete(listener);
  }

  emit(data: T): void {
    this.listeners.forEach(listener => listener(data));
  }
}

// 使用
const orderEvents = new EventEmitter<OrderEvent>();

const unsubscribe = orderEvents.subscribe((event) => {
  console.log('收到订单事件:', event.type);
});

orderEvents.emit({ type: 'created', order: myOrder });

// 取消订阅
unsubscribe();
```

## 多事件类型的 EventEmitter

实际应用中，我们通常需要支持多种事件类型：

```typescript
type EventMap = Record<string, unknown>;
type EventCallback<T> = (data: T) => void;

class TypedEventEmitter<Events extends EventMap> {
  private listeners = new Map<keyof Events, Set<EventCallback<unknown>>>();

  on<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    if (!this.listeners.has(event)) {
      this.listeners.set(event, new Set());
    }
    this.listeners.get(event)!.add(callback as EventCallback<unknown>);
    
    return () => this.off(event, callback);
  }

  off<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): void {
    this.listeners.get(event)?.delete(callback as EventCallback<unknown>);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.listeners.get(event)?.forEach(callback => callback(data));
  }

  once<K extends keyof Events>(event: K, callback: EventCallback<Events[K]>): () => void {
    const wrapper = (data: Events[K]) => {
      this.off(event, wrapper);
      callback(data);
    };
    return this.on(event, wrapper);
  }
}

// 定义事件类型
interface AppEvents {
  'order:created': { orderId: string; total: number };
  'order:paid': { orderId: string };
  'user:login': { userId: string; timestamp: Date };
}

// 使用
const emitter = new TypedEventEmitter<AppEvents>();

emitter.on('order:created', (data) => {
  console.log(`新订单: ${data.orderId}, 金额: ${data.total}`);
});

emitter.emit('order:created', { orderId: '123', total: 99.99 });
```

## 观察者模式的变体

### 1. 带优先级的观察者

```typescript
interface PriorityObserver<T> extends Observer<T> {
  priority: number;
}

class PrioritySubject<T> {
  private observers: PriorityObserver<T>[] = [];

  subscribe(observer: PriorityObserver<T>): void {
    this.observers.push(observer);
    // 按优先级排序（数字越小优先级越高）
    this.observers.sort((a, b) => a.priority - b.priority);
  }

  notify(data: T): void {
    for (const observer of this.observers) {
      observer.update(data);
    }
  }
}
```

### 2. 可取消传播的观察者

```typescript
interface CancellableEvent {
  cancelled: boolean;
  cancel(): void;
}

function createEvent<T>(data: T): T & CancellableEvent {
  return {
    ...data,
    cancelled: false,
    cancel() {
      this.cancelled = true;
    },
  };
}

class CancellableSubject<T> {
  private observers: Array<(event: T & CancellableEvent) => void> = [];

  subscribe(observer: (event: T & CancellableEvent) => void): void {
    this.observers.push(observer);
  }

  notify(data: T): boolean {
    const event = createEvent(data);
    for (const observer of this.observers) {
      observer(event);
      if (event.cancelled) {
        return false;
      }
    }
    return true;
  }
}
```

## 与 DOM 事件的关系

DOM 事件系统就是观察者模式的典型应用：

```typescript
// DOM 事件就是观察者模式
button.addEventListener('click', handleClick);  // 订阅
button.removeEventListener('click', handleClick); // 取消订阅
button.dispatchEvent(new Event('click')); // 发布
```

## 观察者模式 vs 发布订阅模式

两者经常被混用，但有细微差别：

| 特性 | 观察者模式 | 发布订阅模式 |
|------|-----------|-------------|
| 耦合度 | 主题知道观察者 | 完全解耦 |
| 中介 | 无 | 有事件通道/消息代理 |
| 过滤 | 观察者接收所有事件 | 可按事件类型订阅 |

## 观察者模式的优缺点

**优点**：
- **解耦**：发布者和订阅者之间松耦合
- **开闭原则**：可以轻松添加新的观察者
- **动态关系**：运行时可以添加或删除观察者
- **广播通信**：一次通知可以到达多个观察者

**缺点**：
- **通知顺序**：观察者的执行顺序可能不确定
- **内存泄漏**：忘记取消订阅可能导致内存泄漏
- **调试困难**：事件流难以追踪
- **性能开销**：大量观察者可能影响性能

## 最佳实践

1. **始终取消订阅**：在组件销毁时取消订阅，避免内存泄漏
2. **使用类型安全的事件**：用 TypeScript 定义事件类型
3. **避免过度使用**：不要让事件流变得过于复杂
4. **考虑异步通知**：对于耗时操作，可以异步通知观察者

## 总结

观察者模式是事件驱动编程的核心，它实现了发布者和订阅者之间的解耦。在前端开发中，DOM 事件、Vue/React 的响应式系统、Redux 的 store 订阅等都使用了观察者模式。

关键要点：
1. 观察者模式定义了一对多的依赖关系
2. 函数式实现更符合 JavaScript 风格
3. 返回取消订阅函数是最佳实践
4. 注意内存泄漏问题
5. 理解观察者模式和发布订阅模式的区别
