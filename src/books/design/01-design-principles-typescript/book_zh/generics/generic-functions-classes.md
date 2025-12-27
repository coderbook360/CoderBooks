# 泛型函数与泛型类

泛型最常见的应用场景是**函数**和**类**。掌握它们，就掌握了泛型的核心用法。

## 泛型函数

### 基本形式

```typescript
// 函数声明
function identity<T>(value: T): T {
  return value;
}

// 函数表达式
const identity = function<T>(value: T): T {
  return value;
};

// 箭头函数
const identity = <T>(value: T): T => value;
```

### 多参数泛型

```typescript
function swap<T, U>(tuple: [T, U]): [U, T] {
  return [tuple[1], tuple[0]];
}

const result = swap(['hello', 42]);
// 类型是 [number, string]
```

### 泛型与重载

```typescript
// 泛型可以简化重载
// ❌ 多个重载
function first(arr: string[]): string | undefined;
function first(arr: number[]): number | undefined;
function first(arr: any[]): any {
  return arr[0];
}

// ✅ 一个泛型函数
function first<T>(arr: T[]): T | undefined {
  return arr[0];
}
```

### 回调函数中的泛型

```typescript
function map<T, U>(arr: T[], fn: (item: T, index: number) => U): U[] {
  return arr.map(fn);
}

const numbers = [1, 2, 3];
const strings = map(numbers, n => n.toString());
// strings 类型是 string[]
```

## 泛型类

### 基本语法

```typescript
class Container<T> {
  private value: T;
  
  constructor(value: T) {
    this.value = value;
  }
  
  getValue(): T {
    return this.value;
  }
  
  setValue(value: T): void {
    this.value = value;
  }
}

const stringContainer = new Container<string>('hello');
const numberContainer = new Container(42); // 类型推断
```

### 泛型类的继承

```typescript
class Container<T> {
  constructor(public value: T) {}
}

// 固定类型参数
class StringContainer extends Container<string> {
  toUpperCase(): string {
    return this.value.toUpperCase();
  }
}

// 保留类型参数
class LoggingContainer<T> extends Container<T> {
  getValue(): T {
    console.log('Getting value');
    return this.value;
  }
}
```

### 静态成员不能使用类的泛型

```typescript
class Container<T> {
  // ❌ 静态成员不能使用 T
  // static defaultValue: T;
  
  // ✅ 静态方法可以有自己的泛型
  static create<U>(value: U): Container<U> {
    return new Container(value);
  }
  
  constructor(public value: T) {}
}
```

## 实际应用

### 应用 1：Result 类型

```typescript
class Result<T, E = Error> {
  private constructor(
    private readonly _value: T | null,
    private readonly _error: E | null
  ) {}
  
  static ok<T>(value: T): Result<T, never> {
    return new Result(value, null);
  }
  
  static err<E>(error: E): Result<never, E> {
    return new Result(null, error);
  }
  
  isOk(): boolean {
    return this._error === null;
  }
  
  getValue(): T {
    if (this._error !== null) {
      throw new Error('Cannot get value from error result');
    }
    return this._value as T;
  }
  
  getError(): E {
    if (this._error === null) {
      throw new Error('Cannot get error from success result');
    }
    return this._error;
  }
  
  map<U>(fn: (value: T) => U): Result<U, E> {
    if (this.isOk()) {
      return Result.ok(fn(this._value as T));
    }
    return Result.err(this._error as E);
  }
}

// 使用
function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return Result.err('Division by zero');
  }
  return Result.ok(a / b);
}

const result = divide(10, 2);
if (result.isOk()) {
  console.log(result.getValue()); // 5
}
```

### 应用 2：泛型仓库模式

```typescript
interface Entity {
  id: string;
}

class Repository<T extends Entity> {
  private items: Map<string, T> = new Map();
  
  save(item: T): void {
    this.items.set(item.id, item);
  }
  
  findById(id: string): T | undefined {
    return this.items.get(id);
  }
  
  findAll(): T[] {
    return Array.from(this.items.values());
  }
  
  delete(id: string): boolean {
    return this.items.delete(id);
  }
}

// 使用
interface User extends Entity {
  name: string;
  email: string;
}

const userRepo = new Repository<User>();
userRepo.save({ id: '1', name: 'Alice', email: 'alice@example.com' });

const user = userRepo.findById('1');
console.log(user?.name); // 类型安全
```

### 应用 3：泛型状态管理

```typescript
class Store<S> {
  private state: S;
  private listeners: Set<(state: S) => void> = new Set();
  
  constructor(initialState: S) {
    this.state = initialState;
  }
  
  getState(): S {
    return this.state;
  }
  
  setState(updater: (prev: S) => S): void {
    this.state = updater(this.state);
    this.notify();
  }
  
  subscribe(listener: (state: S) => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }
  
  private notify(): void {
    this.listeners.forEach(listener => listener(this.state));
  }
}

// 使用
interface AppState {
  count: number;
  user: string | null;
}

const store = new Store<AppState>({
  count: 0,
  user: null
});

store.subscribe(state => {
  console.log('Count:', state.count);
});

store.setState(prev => ({ ...prev, count: prev.count + 1 }));
```

### 应用 4：泛型队列

```typescript
class Queue<T> {
  private items: T[] = [];
  
  enqueue(item: T): void {
    this.items.push(item);
  }
  
  dequeue(): T | undefined {
    return this.items.shift();
  }
  
  peek(): T | undefined {
    return this.items[0];
  }
  
  isEmpty(): boolean {
    return this.items.length === 0;
  }
  
  size(): number {
    return this.items.length;
  }
}

const numberQueue = new Queue<number>();
numberQueue.enqueue(1);
numberQueue.enqueue(2);
console.log(numberQueue.dequeue()); // 1
```

## 泛型方法 vs 泛型类

### 什么时候用泛型方法

当只有某个方法需要泛型时：

```typescript
class Utility {
  // 只有这个方法需要泛型
  static parseJSON<T>(json: string): T {
    return JSON.parse(json);
  }
}

const user = Utility.parseJSON<User>('{"name":"Alice"}');
```

### 什么时候用泛型类

当整个类围绕某个类型操作时：

```typescript
class Stack<T> {
  private items: T[] = [];
  
  push(item: T): void { this.items.push(item); }
  pop(): T | undefined { return this.items.pop(); }
  peek(): T | undefined { return this.items[this.items.length - 1]; }
}
```

## 总结

**泛型函数**：
- 适合独立的通用操作
- 类型通常可以自动推断
- 可以有多个类型参数

**泛型类**：
- 适合围绕某类型的一组操作
- 实例化时指定类型
- 静态成员不能使用类的泛型

**设计原则**：
- 从具体类型开始，发现重复时抽象为泛型
- 不要过早泛型化
- 保持泛型参数数量最少

接下来，我们将学习泛型的默认值，简化 API 的使用。
