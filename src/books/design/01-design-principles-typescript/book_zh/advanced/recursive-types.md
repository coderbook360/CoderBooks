# 递归类型

**递归类型（Recursive Types）** 是指在类型定义中引用自身的类型。

常用于描述树形结构、嵌套数据、链表等。

## 基本语法

```typescript
// 类型别名引用自身
type TreeNode<T> = {
  value: T;
  children: TreeNode<T>[];  // 递归引用
};

// 使用
const tree: TreeNode<string> = {
  value: 'root',
  children: [
    { value: 'child1', children: [] },
    { value: 'child2', children: [
      { value: 'grandchild', children: [] }
    ]}
  ]
};
```

## 常见递归结构

### 链表

```typescript
type ListNode<T> = {
  value: T;
  next: ListNode<T> | null;
};

const list: ListNode<number> = {
  value: 1,
  next: {
    value: 2,
    next: {
      value: 3,
      next: null
    }
  }
};
```

### JSON 值

```typescript
type JSONValue = 
  | string 
  | number 
  | boolean 
  | null 
  | JSONValue[]           // 递归：数组
  | { [key: string]: JSONValue };  // 递归：对象

const data: JSONValue = {
  name: 'John',
  age: 30,
  tags: ['dev', 'test'],
  nested: {
    deep: {
      value: true
    }
  }
};
```

### 嵌套菜单

```typescript
type MenuItem = {
  label: string;
  href?: string;
  children?: MenuItem[];  // 递归
};

const menu: MenuItem[] = [
  { label: 'Home', href: '/' },
  { 
    label: 'Products',
    children: [
      { label: 'Category A', href: '/products/a' },
      { label: 'Category B', href: '/products/b' }
    ]
  }
];
```

## 递归条件类型

条件类型也可以递归：

### 深度只读

```typescript
type DeepReadonly<T> = T extends object
  ? { readonly [K in keyof T]: DeepReadonly<T[K]> }
  : T;

interface Nested {
  a: {
    b: {
      c: number;
    };
  };
}

type ReadonlyNested = DeepReadonly<Nested>;
// { readonly a: { readonly b: { readonly c: number } } }
```

### 深度可选

```typescript
type DeepPartial<T> = T extends object
  ? { [K in keyof T]?: DeepPartial<T[K]> }
  : T;

interface Config {
  database: {
    host: string;
    port: number;
  };
}

type PartialConfig = DeepPartial<Config>;
// { database?: { host?: string; port?: number } }
```

### 展开 Promise

```typescript
type Awaited<T> = T extends Promise<infer U>
  ? Awaited<U>  // 递归展开嵌套 Promise
  : T;

type A = Awaited<Promise<string>>;            // string
type B = Awaited<Promise<Promise<number>>>;  // number
```

## 递归限制

TypeScript 对递归深度有限制（通常 50 层）：

```typescript
// 可能触发深度限制的类型
type Flatten<T> = T extends Array<infer U> ? Flatten<U> : T;

// 对于非常深的嵌套可能报错
type Deep = [[[[[[[[[[1]]]]]]]]]];
type Flattened = Flatten<Deep>;  // 可能触发限制
```

### 处理策略

```typescript
// 添加深度计数器
type FlattenWithDepth<T, D extends number = 10> = 
  D extends 0 
    ? T 
    : T extends Array<infer U> 
      ? FlattenWithDepth<U, Decrement<D>> 
      : T;

// 简化版：限制到固定深度
type Flatten1<T> = T extends Array<infer U> ? U : T;
type Flatten2<T> = Flatten1<Flatten1<T>>;
type Flatten3<T> = Flatten1<Flatten2<T>>;
```

## 实战示例

### 路径类型

```typescript
// 获取对象所有路径
type Path<T, K extends keyof T = keyof T> = K extends string
  ? T[K] extends object
    ? K | `${K}.${Path<T[K]>}`
    : K
  : never;

interface User {
  name: string;
  address: {
    city: string;
    zip: string;
  };
}

type UserPaths = Path<User>;
// 'name' | 'address' | 'address.city' | 'address.zip'
```

### 深度获取

```typescript
// 根据路径获取类型
type Get<T, P extends string> = 
  P extends `${infer K}.${infer Rest}`
    ? K extends keyof T
      ? Get<T[K], Rest>
      : never
    : P extends keyof T
      ? T[P]
      : never;

type City = Get<User, 'address.city'>;  // string
type Zip = Get<User, 'address.zip'>;    // string
```

### 深度合并

```typescript
type DeepMerge<T, U> = {
  [K in keyof T | keyof U]: 
    K extends keyof U
      ? K extends keyof T
        ? T[K] extends object
          ? U[K] extends object
            ? DeepMerge<T[K], U[K]>
            : U[K]
          : U[K]
        : U[K]
      : K extends keyof T
        ? T[K]
        : never
};

interface A {
  x: { a: number };
  y: string;
}

interface B {
  x: { b: number };
  z: boolean;
}

type Merged = DeepMerge<A, B>;
// { x: { a: number; b: number }; y: string; z: boolean }
```

### 递归数组扁平化

```typescript
type FlatArray<T, Depth extends number> = {
  done: T;
  recur: T extends ReadonlyArray<infer Inner>
    ? FlatArray<Inner, [-1, 0, 1, 2, 3, 4, 5][Depth]>
    : T;
}[Depth extends -1 ? 'done' : 'recur'];

type Nested = [1, [2, [3, [4]]]];
type Flat1 = FlatArray<Nested, 1>;  // 1 | [2, [3, [4]]] | 2 | [3, [4]]
```

## 注意事项

### 1. 避免无限递归

```typescript
// ❌ 危险：可能无限递归
type Infinite<T> = T extends any ? Infinite<T> : never;

// ✅ 安全：有终止条件
type Safe<T> = T extends object ? { [K in keyof T]: Safe<T[K]> } : T;
```

### 2. 性能考虑

```typescript
// 复杂递归类型可能导致编译变慢
// 尽量简化或限制深度
type DeepReadonlyLimited<T, D extends number = 5> = 
  D extends 0 ? T :
  T extends object ? { readonly [K in keyof T]: DeepReadonlyLimited<T[K], Prev<D>> } : T;
```

### 3. 处理循环引用

```typescript
// 对象可能有循环引用，类型系统会处理
interface Node {
  value: number;
  parent?: Node;  // 合法的递归引用
}
```

## 总结

**递归类型用途**：
- 树形结构（目录、菜单）
- 嵌套数据（JSON）
- 链表
- 深度操作（DeepReadonly、DeepPartial）

**关键技巧**：
- 必须有终止条件
- 注意递归深度限制
- 复杂递归可能影响编译性能

**常见模式**：
- `T extends object ? 递归 : 终止`
- `T extends Array<infer U> ? 递归 : T`
- 使用深度计数器限制递归

**记住**：递归类型很强大，但要谨慎使用，确保有明确的终止条件。
