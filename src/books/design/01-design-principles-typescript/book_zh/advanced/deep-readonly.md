# 类型体操：深度 Readonly

TypeScript 内置的 `Readonly<T>` 只处理**浅层**属性。

本节实现**深度只读**类型，让嵌套对象的所有层级都变成只读。

## 问题：浅层 Readonly

```typescript
// 内置 Readonly 只处理第一层
type Readonly<T> = {
  readonly [K in keyof T]: T[K]
};

interface User {
  name: string;
  address: {
    city: string;
    zip: string;
  };
}

type ReadonlyUser = Readonly<User>;

const user: ReadonlyUser = {
  name: 'John',
  address: { city: 'NYC', zip: '10001' }
};

user.name = 'Jane';           // ❌ 错误：readonly
user.address.city = 'LA';     // ✅ 可以修改！嵌套对象不受保护
```

## 解决方案：递归 Readonly

```typescript
type DeepReadonly<T> = {
  readonly [K in keyof T]: T[K] extends object
    ? DeepReadonly<T[K]>  // 递归处理对象
    : T[K]
};

type DeepReadonlyUser = DeepReadonly<User>;

const user: DeepReadonlyUser = {
  name: 'John',
  address: { city: 'NYC', zip: '10001' }
};

user.name = 'Jane';          // ❌ 错误
user.address.city = 'LA';    // ❌ 错误：嵌套属性也只读了
```

## 处理特殊情况

### 排除函数

函数也是 object，但我们通常不想递归处理：

```typescript
type DeepReadonly<T> = T extends Function
  ? T  // 函数保持原样
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

### 排除数组

数组需要特殊处理：

```typescript
type DeepReadonly<T> = T extends Function
  ? T
  : T extends readonly any[]
    ? readonly [...{ [K in keyof T]: DeepReadonly<T[K]> }]
    : T extends object
      ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
      : T;

// 或更简洁的方式
type DeepReadonly<T> = T extends (infer U)[]
  ? readonly DeepReadonly<U>[]
  : T extends object
    ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
    : T;
```

### 排除原始包装类型

```typescript
type Primitive = string | number | boolean | bigint | symbol | null | undefined;

type DeepReadonly<T> = T extends Primitive
  ? T
  : T extends Function
    ? T
    : T extends Map<infer K, infer V>
      ? ReadonlyMap<DeepReadonly<K>, DeepReadonly<V>>
    : T extends Set<infer U>
      ? ReadonlySet<DeepReadonly<U>>
    : T extends readonly any[]
      ? readonly DeepReadonly<T[number]>[]
    : { readonly [K in keyof T]: DeepReadonly<T[K]> };
```

## 完整实现

```typescript
type DeepReadonly<T> = 
  // 原始类型直接返回
  T extends string | number | boolean | null | undefined | symbol | bigint
    ? T
  // 函数保持原样
  : T extends Function
    ? T
  // 数组转只读数组
  : T extends (infer U)[]
    ? readonly DeepReadonly<U>[]
  // Map 转 ReadonlyMap
  : T extends Map<infer K, infer V>
    ? ReadonlyMap<K, DeepReadonly<V>>
  // Set 转 ReadonlySet
  : T extends Set<infer U>
    ? ReadonlySet<DeepReadonly<U>>
  // 对象递归处理
  : { readonly [K in keyof T]: DeepReadonly<T[K]> };
```

## 使用示例

```typescript
interface AppState {
  user: {
    name: string;
    preferences: {
      theme: 'light' | 'dark';
      notifications: boolean;
    };
  };
  posts: Array<{
    id: number;
    title: string;
    tags: string[];
  }>;
}

type ImmutableState = DeepReadonly<AppState>;

const state: ImmutableState = {
  user: {
    name: 'John',
    preferences: {
      theme: 'dark',
      notifications: true
    }
  },
  posts: [
    { id: 1, title: 'Hello', tags: ['intro'] }
  ]
};

// 所有层级都不可修改
state.user.name = 'Jane';                    // ❌
state.user.preferences.theme = 'light';       // ❌
state.posts[0].title = 'World';              // ❌
state.posts[0].tags.push('new');             // ❌ 数组也是只读
```

## 实战应用

### Redux Store

```typescript
interface RootState {
  counter: {
    value: number;
    history: number[];
  };
  todos: Array<{
    id: string;
    text: string;
    completed: boolean;
  }>;
}

// Store 状态应该是深度只读的
type AppState = DeepReadonly<RootState>;

function reducer(state: AppState, action: Action): AppState {
  // 必须返回新对象，不能修改原状态
  return {
    ...state,
    counter: {
      ...state.counter,
      value: state.counter.value + 1
    }
  };
}
```

### 配置对象

```typescript
interface Config {
  api: {
    baseUrl: string;
    timeout: number;
  };
  features: {
    darkMode: boolean;
    beta: string[];
  };
}

function loadConfig(): DeepReadonly<Config> {
  return {
    api: {
      baseUrl: 'https://api.example.com',
      timeout: 5000
    },
    features: {
      darkMode: true,
      beta: ['feature-a', 'feature-b']
    }
  };
}

const config = loadConfig();
config.api.baseUrl = 'xxx';  // ❌ 配置不可修改
```

## 变体：可变版本

有时需要反向操作——移除所有 readonly：

```typescript
type DeepMutable<T> = 
  T extends string | number | boolean | null | undefined | symbol | bigint
    ? T
  : T extends Function
    ? T
  : T extends readonly (infer U)[]
    ? DeepMutable<U>[]
  : T extends ReadonlyMap<infer K, infer V>
    ? Map<K, DeepMutable<V>>
  : T extends ReadonlySet<infer U>
    ? Set<DeepMutable<U>>
  : { -readonly [K in keyof T]: DeepMutable<T[K]> };

// 使用
type Editable = DeepMutable<ImmutableState>;
```

## 性能注意

递归类型可能导致编译变慢：

```typescript
// 对于极深的嵌套，可以限制递归深度
type DeepReadonlyLimited<T, Depth extends number = 5> = 
  Depth extends 0 
    ? T 
    : T extends object 
      ? { readonly [K in keyof T]: DeepReadonlyLimited<T[K], Prev<Depth]> }
      : T;

// Prev 实现略
```

## 总结

**DeepReadonly 核心**：
- 递归遍历所有层级
- 为每个属性添加 readonly
- 特殊处理函数、数组、Map、Set

**使用场景**：
- Redux 状态
- 配置对象
- API 响应数据
- 任何需要不可变的数据结构

**注意事项**：
- 处理特殊类型（函数、数组、Map）
- 避免过深递归
- 考虑编译性能

**记住**：深度只读是实现不可变数据的类型层保障。
