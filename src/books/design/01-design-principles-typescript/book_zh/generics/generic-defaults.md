# 泛型默认值

**思考一个问题**：如何让泛型类型在大多数情况下不需要显式指定？

```typescript
// 每次都要指定类型，很繁琐
const store = new Store<string>();
const cache = new Cache<object>();

// 有了默认值，常见情况更简洁
const store = new Store();       // 默认 string
const cache = new Cache();       // 默认 object
const cache = new Cache<User>(); // 需要时仍可指定
```

这就是**泛型默认值**的作用。

## 基本语法

### 函数中的泛型默认值

```typescript
function createArray<T = string>(length: number, value: T): T[] {
  return Array(length).fill(value);
}

// 使用默认值
const strings = createArray(3, 'hello'); // T = string（推断）
const numbers = createArray<number>(3, 0); // T = number（显式）

// 注意：如果传入了参数，推断优先于默认值
const booleans = createArray(3, true); // T = boolean（推断）
```

### 接口中的泛型默认值

```typescript
interface Response<T = any> {
  code: number;
  message: string;
  data: T;
}

// 使用默认值
function handleResponse(res: Response): void {
  console.log(res.data); // any
}

// 显式指定类型
function handleUserResponse(res: Response<User>): void {
  console.log(res.data.name); // 类型安全
}
```

### 类中的泛型默认值

```typescript
class Container<T = string> {
  constructor(public value: T) {}
}

const stringContainer = new Container('hello'); // T = string
const numberContainer = new Container<number>(42); // T = number
```

## 默认值与约束

默认值必须满足约束：

```typescript
// ✅ 正确：string 满足 { length: number } 约束
function getLength<T extends { length: number } = string>(value: T): number {
  return value.length;
}

// ❌ 错误：number 不满足约束
function getLength<T extends { length: number } = number>(value: T): number {
  return value.length;
}
```

## 多参数默认值

### 规则：有默认值的参数必须在后面

```typescript
// ✅ 正确：默认值参数在后
interface KeyValue<K, V = string> {
  key: K;
  value: V;
}

const item: KeyValue<number> = { key: 1, value: 'hello' };
// K = number, V = string（默认）

// ❌ 错误：有默认值的参数不能在没有默认值的参数前面
interface KeyValue<K = string, V> {
  key: K;
  value: V;
}
```

### 多个默认值

```typescript
interface Config<T = string, U = number> {
  name: T;
  value: U;
}

const config1: Config = { name: 'test', value: 42 }; 
// T = string, U = number

const config2: Config<boolean> = { name: true, value: 42 };
// T = boolean, U = number

const config3: Config<boolean, string> = { name: true, value: 'hello' };
// T = boolean, U = string
```

## 实际应用

### 应用 1：API 客户端

```typescript
interface ApiClient<T = any> {
  get(url: string): Promise<T>;
  post(url: string, data: unknown): Promise<T>;
}

// 通用客户端
const api: ApiClient = { /* ... */ };

// 类型安全的客户端
const userApi: ApiClient<User> = { /* ... */ };
```

### 应用 2：事件发射器

```typescript
class EventEmitter<T = Record<string, unknown>> {
  private handlers: Map<keyof T, Set<(payload: any) => void>> = new Map();
  
  on<K extends keyof T>(event: K, handler: (payload: T[K]) => void): void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);
  }
  
  emit<K extends keyof T>(event: K, payload: T[K]): void {
    this.handlers.get(event)?.forEach(handler => handler(payload));
  }
}

// 无类型约束
const emitter1 = new EventEmitter();

// 有类型约束
interface AppEvents {
  login: { userId: string };
  logout: undefined;
  error: { message: string };
}

const emitter2 = new EventEmitter<AppEvents>();
emitter2.on('login', (payload) => {
  console.log(payload.userId); // 类型安全
});
```

### 应用 3：缓存服务

```typescript
class Cache<T = string, K = string> {
  private storage = new Map<K, T>();
  
  set(key: K, value: T): void {
    this.storage.set(key, value);
  }
  
  get(key: K): T | undefined {
    return this.storage.get(key);
  }
}

// 默认：字符串键值对
const stringCache = new Cache();
stringCache.set('key', 'value');

// 自定义类型
const userCache = new Cache<User, number>();
userCache.set(1, { id: 1, name: 'Alice' });
```

### 应用 4：React 组件 Props

```typescript
interface ListProps<T = string> {
  items: T[];
  renderItem: (item: T) => React.ReactNode;
  keyExtractor?: (item: T) => string;
}

function List<T = string>({ items, renderItem, keyExtractor }: ListProps<T>) {
  return (
    <ul>
      {items.map((item, index) => (
        <li key={keyExtractor?.(item) ?? index}>
          {renderItem(item)}
        </li>
      ))}
    </ul>
  );
}

// 使用（推断类型）
<List items={['a', 'b', 'c']} renderItem={item => item} />

// 使用（显式类型）
<List<User> 
  items={users} 
  renderItem={user => user.name}
  keyExtractor={user => user.id}
/>
```

## 默认值 vs 类型推断

**优先级**：显式指定 > 类型推断 > 默认值

```typescript
function wrap<T = string>(value: T): { wrapped: T } {
  return { wrapped: value };
}

// 1. 显式指定（最高优先）
wrap<number>(42);       // T = number

// 2. 类型推断
wrap(42);               // T = number（推断，非默认值）
wrap(true);             // T = boolean（推断）

// 3. 默认值（仅当无法推断时）
wrap<string>('hello');  // 必须显式指定才用到"默认值"场景
```

**关键理解**：默认值主要用于**无法从参数推断**的场景。

## 最佳实践

### 1. 选择合理的默认值

```typescript
// ✅ 好：最常见的使用场景
interface Cache<T = string> { /* ... */ }

// ❌ 差：any 失去类型安全
interface Cache<T = any> { /* ... */ }
```

### 2. 默认值应该向后兼容

```typescript
// 如果已有代码这样用：
const cache = new Cache<string>();

// 添加默认值不会破坏现有代码
class Cache<T = string> { /* ... */ }
```

### 3. 配合约束使用

```typescript
interface Serializable {
  toString(): string;
}

// 默认值满足约束
class Logger<T extends Serializable = string> {
  log(value: T): void {
    console.log(value.toString());
  }
}
```

## 总结

- **泛型默认值**使用 `<T = DefaultType>` 语法
- **优先级**：显式指定 > 推断 > 默认值
- **规则**：有默认值的参数必须在后面
- **约束**：默认值必须满足泛型约束
- **场景**：API 简化、常见类型预设、向后兼容

接下来，我们将学习 TypeScript 内置的工具类型，它们是泛型的经典应用。
