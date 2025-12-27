# 类型安全的事件系统

事件系统是应用解耦的重要手段。类型安全的事件系统可以防止事件名拼错、参数传错。

## 问题：不安全的事件

```typescript
// ❌ 字符串事件名，容易拼错
emitter.on('user:logIn', (data) => {
  console.log(data.userId);  // data 是 any
});

emitter.emit('user:login', { userId: '123' });  // 拼写不一致，不报错
```

## 定义事件类型

```typescript
// ✅ 定义事件映射
interface EventMap {
  'user:login': { userId: string; timestamp: Date };
  'user:logout': { userId: string };
  'order:created': { orderId: string; items: OrderItem[] };
  'order:paid': { orderId: string; amount: number };
  'notification:show': { message: string; type: 'info' | 'error' | 'success' };
}
```

## 类型安全的 EventEmitter

```typescript
class TypedEventEmitter<Events extends Record<string, any>> {
  private listeners: {
    [K in keyof Events]?: Array<(data: Events[K]) => void>
  } = {};

  on<K extends keyof Events>(
    event: K,
    listener: (data: Events[K]) => void
  ): void {
    if (!this.listeners[event]) {
      this.listeners[event] = [];
    }
    this.listeners[event]!.push(listener);
  }

  off<K extends keyof Events>(
    event: K,
    listener: (data: Events[K]) => void
  ): void {
    const listeners = this.listeners[event];
    if (listeners) {
      const index = listeners.indexOf(listener);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  emit<K extends keyof Events>(event: K, data: Events[K]): void {
    const listeners = this.listeners[event];
    if (listeners) {
      listeners.forEach(listener => listener(data));
    }
  }

  once<K extends keyof Events>(
    event: K,
    listener: (data: Events[K]) => void
  ): void {
    const onceListener = (data: Events[K]) => {
      this.off(event, onceListener);
      listener(data);
    };
    this.on(event, onceListener);
  }
}
```

## 使用类型安全的事件

```typescript
const emitter = new TypedEventEmitter<EventMap>();

// ✅ 事件名和参数都有类型提示
emitter.on('user:login', (data) => {
  console.log(data.userId);     // string
  console.log(data.timestamp);  // Date
});

emitter.emit('user:login', {
  userId: '123',
  timestamp: new Date()
});

// ❌ 类型错误：事件名拼错
// emitter.emit('user:logIn', { userId: '123' });

// ❌ 类型错误：缺少必要参数
// emitter.emit('user:login', { userId: '123' });  // 缺少 timestamp
```

## 命名空间事件

```typescript
// 使用模板字面量类型实现命名空间
type NamespacedEvents = {
  [K in keyof EventMap as `app:${string & K}`]: EventMap[K];
};

// 或者更结构化的方式
interface AppEvents {
  user: {
    login: { userId: string };
    logout: { userId: string };
  };
  order: {
    created: { orderId: string };
    paid: { orderId: string; amount: number };
  };
}

// 展开为扁平结构
type FlattenEvents<T, Prefix extends string = ''> = {
  [K in keyof T]: K extends string
    ? T[K] extends Record<string, any>
      ? T[K] extends { [key: string]: any }
        ? keyof T[K] extends string
          ? FlattenEvents<T[K], `${Prefix}${K}:`>
          : never
        : { [P in `${Prefix}${K}`]: T[K] }
      : { [P in `${Prefix}${K}`]: T[K] }
    : never
}[keyof T];
```

## 事件过滤

```typescript
class TypedEventEmitter<Events extends Record<string, any>> {
  // ... 前面的方法

  // 只监听特定条件的事件
  onWhen<K extends keyof Events>(
    event: K,
    predicate: (data: Events[K]) => boolean,
    listener: (data: Events[K]) => void
  ): void {
    this.on(event, (data) => {
      if (predicate(data)) {
        listener(data);
      }
    });
  }
}

// 使用
emitter.onWhen(
  'notification:show',
  (data) => data.type === 'error',
  (data) => console.error(data.message)
);
```

## React Hooks 集成

```typescript
function useEvent<K extends keyof EventMap>(
  event: K,
  handler: (data: EventMap[K]) => void
) {
  const handlerRef = useRef(handler);
  handlerRef.current = handler;

  useEffect(() => {
    const listener = (data: EventMap[K]) => handlerRef.current(data);
    emitter.on(event, listener);
    return () => emitter.off(event, listener);
  }, [event]);
}

// 使用
function NotificationDisplay() {
  useEvent('notification:show', (data) => {
    toast[data.type](data.message);
  });
  
  return null;
}
```

## 事件总线模式

```typescript
// 全局事件总线
const eventBus = new TypedEventEmitter<EventMap>();

// 模块 A：发送事件
function login(userId: string) {
  // ... 登录逻辑
  eventBus.emit('user:login', { 
    userId, 
    timestamp: new Date() 
  });
}

// 模块 B：监听事件
eventBus.on('user:login', (data) => {
  analytics.track('login', { userId: data.userId });
});

// 模块 C：监听同一事件
eventBus.on('user:login', (data) => {
  logger.info(`User ${data.userId} logged in at ${data.timestamp}`);
});
```

## 异步事件处理

```typescript
class AsyncEventEmitter<Events extends Record<string, any>> {
  private listeners: {
    [K in keyof Events]?: Array<(data: Events[K]) => Promise<void> | void>
  } = {};

  on<K extends keyof Events>(
    event: K,
    listener: (data: Events[K]) => Promise<void> | void
  ): void {
    // ... 同前
  }

  async emit<K extends keyof Events>(
    event: K,
    data: Events[K]
  ): Promise<void> {
    const listeners = this.listeners[event];
    if (listeners) {
      await Promise.all(listeners.map(l => l(data)));
    }
  }

  // 串行执行
  async emitSerial<K extends keyof Events>(
    event: K,
    data: Events[K]
  ): Promise<void> {
    const listeners = this.listeners[event];
    if (listeners) {
      for (const listener of listeners) {
        await listener(data);
      }
    }
  }
}
```

## 事件验证

```typescript
import { z } from 'zod';

// 使用 Zod 定义事件 Schema
const EventSchemas = {
  'user:login': z.object({
    userId: z.string(),
    timestamp: z.date()
  }),
  'order:created': z.object({
    orderId: z.string(),
    items: z.array(z.object({
      productId: z.string(),
      quantity: z.number()
    }))
  })
} as const;

// 运行时验证
function safeEmit<K extends keyof typeof EventSchemas>(
  event: K,
  data: z.infer<typeof EventSchemas[K]>
): void {
  const result = EventSchemas[event].safeParse(data);
  if (!result.success) {
    console.error('Invalid event data:', result.error);
    return;
  }
  emitter.emit(event, result.data);
}
```

## 总结

**类型安全事件系统要点**：

- **定义 EventMap**：所有事件及其参数类型
- **泛型 EventEmitter**：基于 EventMap 约束
- **模板字面量**：支持命名空间事件
- **Hooks 集成**：React 中类型安全使用

**好处**：
- 事件名自动补全
- 参数类型检查
- 重构时自动更新
- 减少拼写错误

**记住**：类型化的事件系统让模块间通信更可靠。
