# 中介者模式：组件通信的集中管理

## 问题的起源

假设你正在开发一个聊天室应用，用户之间需要相互发送消息。最直观的实现是让用户直接持有其他用户的引用：

```typescript
class User {
  private name: string;
  private contacts: User[] = [];

  constructor(name: string) {
    this.name = name;
  }

  addContact(user: User): void {
    this.contacts.push(user);
  }

  send(message: string): void {
    for (const contact of this.contacts) {
      contact.receive(message, this.name);
    }
  }

  receive(message: string, from: string): void {
    console.log(`${this.name} 收到来自 ${from} 的消息: ${message}`);
  }
}

// 使用
const alice = new User('Alice');
const bob = new User('Bob');
const charlie = new User('Charlie');

alice.addContact(bob);
alice.addContact(charlie);
bob.addContact(alice);
bob.addContact(charlie);
// ... 每个用户都需要添加其他用户
```

这段代码有什么问题？

**问题一：紧耦合**。每个用户都需要知道其他用户的存在，形成了网状依赖。

**问题二：难以扩展**。添加新功能（如群聊、私聊、消息过滤）需要修改所有用户类。

**问题三：难以维护**。当用户数量增加时，管理这些相互引用会变得非常复杂。

## 中介者模式的核心思想

中介者模式的核心思想是：**用一个中介对象来封装一系列对象之间的交互**。中介者使各对象不需要显式地相互引用，从而使其耦合松散。

中介者模式将网状结构转换为星型结构，所有通信都通过中介者进行。

## 基础实现

用 TypeScript 实现中介者模式：

```typescript
// 中介者接口
interface ChatMediator {
  register(user: ChatUser): void;
  send(message: string, from: ChatUser): void;
  sendTo(message: string, from: ChatUser, to: string): void;
}

// 用户接口
interface ChatUser {
  name: string;
  receive(message: string, from: string): void;
}

// 聊天室中介者
class ChatRoom implements ChatMediator {
  private users: Map<string, ChatUser> = new Map();

  register(user: ChatUser): void {
    this.users.set(user.name, user);
    console.log(`${user.name} 加入了聊天室`);
  }

  send(message: string, from: ChatUser): void {
    // 广播消息给所有人（除了发送者）
    for (const [name, user] of this.users) {
      if (name !== from.name) {
        user.receive(message, from.name);
      }
    }
  }

  sendTo(message: string, from: ChatUser, to: string): void {
    const target = this.users.get(to);
    if (target) {
      target.receive(message, from.name);
    } else {
      console.log(`用户 ${to} 不存在`);
    }
  }
}
```

用户类：

```typescript
class User implements ChatUser {
  name: string;
  private mediator: ChatMediator;

  constructor(name: string, mediator: ChatMediator) {
    this.name = name;
    this.mediator = mediator;
    mediator.register(this);
  }

  send(message: string): void {
    console.log(`${this.name} 发送: ${message}`);
    this.mediator.send(message, this);
  }

  sendTo(message: string, to: string): void {
    console.log(`${this.name} 私信给 ${to}: ${message}`);
    this.mediator.sendTo(message, this, to);
  }

  receive(message: string, from: string): void {
    console.log(`${this.name} 收到来自 ${from} 的消息: ${message}`);
  }
}
```

使用方式：

```typescript
const chatRoom = new ChatRoom();

const alice = new User('Alice', chatRoom);
const bob = new User('Bob', chatRoom);
const charlie = new User('Charlie', chatRoom);

alice.send('大家好！');
// Bob 收到来自 Alice 的消息: 大家好！
// Charlie 收到来自 Alice 的消息: 大家好！

bob.sendTo('嗨，Alice！', 'Alice');
// Alice 收到来自 Bob 的消息: 嗨，Alice！
```

## 事件驱动的中介者

在前端开发中，事件总线是中介者模式的常见实现：

```typescript
type EventHandler = (...args: unknown[]) => void;

class EventBus {
  private handlers: Map<string, Set<EventHandler>> = new Map();

  on(event: string, handler: EventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  off(event: string, handler: EventHandler): void {
    this.handlers.get(event)?.delete(handler);
  }

  emit(event: string, ...args: unknown[]): void {
    this.handlers.get(event)?.forEach((handler) => {
      handler(...args);
    });
  }
}

// 使用
const bus = new EventBus();

// 组件 A
bus.on('user:login', (user) => {
  console.log('Header 组件: 更新用户信息', user);
});

// 组件 B
bus.on('user:login', (user) => {
  console.log('Sidebar 组件: 显示用户菜单', user);
});

// 登录组件触发事件
bus.emit('user:login', { name: 'Alice', role: 'admin' });
```

## 类型安全的事件中介者

使用 TypeScript 增强类型安全：

```typescript
interface EventMap {
  'user:login': { userId: string; name: string };
  'user:logout': { userId: string };
  'cart:update': { items: string[]; total: number };
}

class TypedEventBus<Events extends Record<string, unknown>> {
  private handlers = new Map<keyof Events, Set<(data: unknown) => void>>();

  on<K extends keyof Events>(
    event: K,
    handler: (data: Events[K]) => void
  ): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler as (data: unknown) => void);

    return () => this.off(event, handler);
  }

  off<K extends keyof Events>(
    event: K,
    handler: (data: Events[K]) => void
  ): void {
    this.handlers.get(event)?.delete(handler as (data: unknown) => void);
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    this.handlers.get(event)?.forEach((handler) => handler(data));
  }
}

// 使用
const appBus = new TypedEventBus<EventMap>();

appBus.on('user:login', (data) => {
  // data 的类型是 { userId: string; name: string }
  console.log(`用户 ${data.name} 登录了`);
});

appBus.emit('user:login', { userId: '1', name: 'Alice' });
```

## 表单中介者示例

表单组件之间的联动是中介者模式的典型应用场景：

```typescript
interface FormField {
  name: string;
  getValue(): unknown;
  setValue(value: unknown): void;
  setDisabled(disabled: boolean): void;
}

class FormMediator {
  private fields: Map<string, FormField> = new Map();
  private rules: Array<(fields: Map<string, FormField>) => void> = [];

  register(field: FormField): void {
    this.fields.set(field.name, field);
  }

  addRule(rule: (fields: Map<string, FormField>) => void): void {
    this.rules.push(rule);
  }

  notify(changedField: string): void {
    // 执行所有联动规则
    for (const rule of this.rules) {
      rule(this.fields);
    }
  }
}

// 使用示例
const formMediator = new FormMediator();

// 添加规则：当国家改变时，更新城市选项
formMediator.addRule((fields) => {
  const country = fields.get('country');
  const city = fields.get('city');
  
  if (country && city) {
    const countryValue = country.getValue() as string;
    if (countryValue === 'china') {
      // 更新城市选项
      console.log('更新中国城市列表');
    }
  }
});

// 添加规则：当支付方式是货到付款时，隐藏信用卡字段
formMediator.addRule((fields) => {
  const paymentMethod = fields.get('paymentMethod');
  const creditCard = fields.get('creditCard');
  
  if (paymentMethod && creditCard) {
    const method = paymentMethod.getValue() as string;
    creditCard.setDisabled(method === 'cod');
  }
});
```

## 中介者模式的优缺点

**优点**：
- **解耦**：将多对多关系转为一对多关系
- **集中控制**：交互逻辑集中在中介者中
- **易于扩展**：添加新的同事类无需修改现有类
- **简化通信**：对象不需要知道其他对象的存在

**缺点**：
- **中介者膨胀**：可能变成"上帝对象"
- **单点故障**：中介者出问题会影响整个系统

## 应用场景

1. **聊天室**：用户之间的消息传递
2. **事件总线**：组件之间的事件通信
3. **表单联动**：字段之间的联动关系
4. **MVC 架构**：Controller 作为 View 和 Model 的中介者

## 总结

中介者模式通过引入一个中介对象来协调多个对象之间的交互，将网状的多对多关系转换为星型的一对多关系。这降低了系统的耦合度，使对象之间的通信更加清晰可控。

关键要点：
1. 中介者封装了对象之间的交互逻辑
2. 对象只需要知道中介者，不需要知道其他对象
3. 事件总线是中介者模式的常见实现
4. 注意防止中介者变得过于庞大
