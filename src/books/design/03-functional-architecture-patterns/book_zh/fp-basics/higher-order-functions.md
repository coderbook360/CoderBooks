# 高阶函数：函数的抽象与复用

> 高阶函数是函数式编程的核心概念——它是接受函数作为参数或返回函数的函数，是代码抽象和复用的强大工具。

## 什么是高阶函数？

高阶函数（Higher-Order Function）满足以下条件之一：

1. **接受函数作为参数**
2. **返回一个函数**

```typescript
// 1. 接受函数作为参数
function map<T, U>(arr: T[], fn: (item: T) => U): U[] {
  const result: U[] = [];
  for (const item of arr) {
    result.push(fn(item));
  }
  return result;
}

// 使用
const numbers = [1, 2, 3];
const doubled = map(numbers, x => x * 2); // [2, 4, 6]

// 2. 返回一个函数
function multiply(factor: number) {
  return function(x: number): number {
    return x * factor;
  };
}

const double = multiply(2);
const triple = multiply(3);

console.log(double(5));  // 10
console.log(triple(5));  // 15
```

## 为什么高阶函数重要？

高阶函数让我们能够：

### 1. 抽象通用逻辑

```typescript
// ❌ 重复的循环逻辑
function sumArray(arr: number[]): number {
  let result = 0;
  for (const n of arr) {
    result += n;
  }
  return result;
}

function productArray(arr: number[]): number {
  let result = 1;
  for (const n of arr) {
    result *= n;
  }
  return result;
}

// ✅ 使用高阶函数抽象
function reduce<T, R>(
  arr: T[],
  fn: (acc: R, item: T) => R,
  initial: R
): R {
  let result = initial;
  for (const item of arr) {
    result = fn(result, item);
  }
  return result;
}

const sum = reduce([1, 2, 3], (acc, n) => acc + n, 0);
const product = reduce([1, 2, 3], (acc, n) => acc * n, 1);
```

### 2. 组合行为

```typescript
// 函数组合
function compose<A, B, C>(
  f: (b: B) => C,
  g: (a: A) => B
): (a: A) => C {
  return (a: A) => f(g(a));
}

const addOne = (x: number) => x + 1;
const square = (x: number) => x * x;

const addThenSquare = compose(square, addOne);
console.log(addThenSquare(2)); // (2 + 1)² = 9
```

### 3. 延迟执行

```typescript
// 创建延迟执行的函数
function lazy<T>(fn: () => T): () => T {
  let cached: T | undefined;
  let computed = false;
  
  return () => {
    if (!computed) {
      cached = fn();
      computed = true;
    }
    return cached!;
  };
}

const expensiveValue = lazy(() => {
  console.log('Computing...');
  return heavyComputation();
});

// 只有调用时才会计算
expensiveValue(); // Computing... (首次计算)
expensiveValue(); // 使用缓存值
```

## 常见高阶函数模式

### 1. 数组方法

```typescript
const users = [
  { name: 'Alice', age: 25 },
  { name: 'Bob', age: 30 },
  { name: 'Charlie', age: 35 },
];

// map: 转换每个元素
const names = users.map(user => user.name);
// ['Alice', 'Bob', 'Charlie']

// filter: 过滤元素
const adults = users.filter(user => user.age >= 30);
// [{ name: 'Bob', age: 30 }, { name: 'Charlie', age: 35 }]

// reduce: 归约为单一值
const totalAge = users.reduce((sum, user) => sum + user.age, 0);
// 90

// 链式调用
const avgAdultAge = users
  .filter(u => u.age >= 30)
  .map(u => u.age)
  .reduce((sum, age, _, arr) => sum + age / arr.length, 0);
// 32.5
```

### 2. 柯里化（Currying）

```typescript
// 普通函数
function add(a: number, b: number, c: number): number {
  return a + b + c;
}

// 柯里化版本
function curriedAdd(a: number) {
  return function(b: number) {
    return function(c: number): number {
      return a + b + c;
    };
  };
}

// 使用
curriedAdd(1)(2)(3); // 6

// 部分应用
const add1 = curriedAdd(1);
const add1And2 = add1(2);
add1And2(3); // 6

// 通用柯里化函数
function curry<T extends unknown[], R>(
  fn: (...args: T) => R
): (...args: Partial<T>) => any {
  return function curried(...args: unknown[]) {
    if (args.length >= fn.length) {
      return fn(...args as T);
    }
    return (...moreArgs: unknown[]) => curried(...args, ...moreArgs);
  };
}
```

### 3. 函数装饰器

```typescript
// 日志装饰器
function withLogging<T extends unknown[], R>(
  fn: (...args: T) => R,
  name: string
): (...args: T) => R {
  return (...args: T) => {
    console.log(`[${name}] Called with:`, args);
    const result = fn(...args);
    console.log(`[${name}] Returned:`, result);
    return result;
  };
}

// 缓存装饰器
function memoize<T extends unknown[], R>(
  fn: (...args: T) => R
): (...args: T) => R {
  const cache = new Map<string, R>();
  
  return (...args: T) => {
    const key = JSON.stringify(args);
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    const result = fn(...args);
    cache.set(key, result);
    return result;
  };
}

// 使用
const fibonacci = memoize((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});
```

### 4. 事件处理

```typescript
// 防抖
function debounce<T extends unknown[]>(
  fn: (...args: T) => void,
  delay: number
): (...args: T) => void {
  let timeoutId: NodeJS.Timeout;
  
  return (...args: T) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

// 节流
function throttle<T extends unknown[]>(
  fn: (...args: T) => void,
  limit: number
): (...args: T) => void {
  let inThrottle = false;
  
  return (...args: T) => {
    if (!inThrottle) {
      fn(...args);
      inThrottle = true;
      setTimeout(() => (inThrottle = false), limit);
    }
  };
}

// 使用
const handleSearch = debounce((query: string) => {
  fetchResults(query);
}, 300);
```

## 总结

高阶函数的核心价值：

1. **抽象能力**：将通用逻辑抽象为可复用的函数
2. **组合能力**：小函数组合成复杂功能
3. **声明式代码**：描述"做什么"而非"怎么做"
4. **延迟计算**：控制函数执行时机

常见高阶函数模式：

| 模式 | 用途 | 示例 |
|------|------|------|
| map/filter/reduce | 数据转换 | 数组处理 |
| 柯里化 | 部分应用 | 配置函数 |
| 装饰器 | 增强功能 | 日志、缓存 |
| 组合 | 函数组合 | 管道处理 |