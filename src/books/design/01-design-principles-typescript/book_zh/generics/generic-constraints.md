# 泛型约束

**思考一个问题**：如果泛型可以是任何类型，我们怎么在函数内部使用它的属性？

```typescript
function getLength<T>(value: T): number {
  return value.length; // ❌ 错误：T 上不存在 length 属性
}
```

问题在于：`T` 可能是 `number`，而数字没有 `length` 属性。

解决方案是**泛型约束**——限制 `T` 必须具有某些特征。

## 使用 extends 约束

### 基本语法

```typescript
// T 必须具有 length 属性
function getLength<T extends { length: number }>(value: T): number {
  return value.length; // ✅ 现在可以访问 length
}

getLength('hello');     // ✅ string 有 length
getLength([1, 2, 3]);   // ✅ array 有 length
getLength({ length: 10 }); // ✅ 对象有 length
getLength(42);          // ❌ number 没有 length
```

### 约束的含义

`T extends U` 表示：T 必须是 U 的子类型（或相同类型）。

```typescript
// T 必须是 string 或其子类型
function process<T extends string>(value: T): T {
  return value.toUpperCase() as T;
}

process('hello'); // ✅
process(42);      // ❌ number 不是 string 的子类型
```

## 常见约束模式

### 1. 对象类型约束

```typescript
// T 必须是对象
function clone<T extends object>(obj: T): T {
  return { ...obj };
}

clone({ name: 'Alice' }); // ✅
clone([1, 2, 3]);         // ✅ 数组也是对象
clone('string');          // ❌ 字符串不是对象
```

### 2. keyof 约束

```typescript
// K 必须是 T 的键
function getProperty<T, K extends keyof T>(obj: T, key: K): T[K] {
  return obj[key];
}

const user = { name: 'Alice', age: 25 };

getProperty(user, 'name'); // ✅ 返回 string
getProperty(user, 'age');  // ✅ 返回 number
getProperty(user, 'email'); // ❌ 'email' 不是 user 的键
```

### 3. 接口约束

```typescript
interface Printable {
  print(): void;
}

function printAll<T extends Printable>(items: T[]): void {
  items.forEach(item => item.print());
}

class Document implements Printable {
  print() { console.log('Document'); }
}

printAll([new Document()]); // ✅
printAll([{ print: () => {} }]); // ✅ 鸭子类型
printAll([1, 2, 3]); // ❌ number 没有 print 方法
```

### 4. 联合类型约束

```typescript
function format<T extends string | number>(value: T): string {
  return String(value);
}

format('hello'); // ✅
format(42);      // ✅
format(true);    // ❌ boolean 不在约束范围
```

## 多重约束

使用交叉类型 `&` 组合多个约束：

```typescript
interface HasId {
  id: number;
}

interface HasName {
  name: string;
}

// T 必须同时有 id 和 name
function logEntity<T extends HasId & HasName>(entity: T): void {
  console.log(`${entity.id}: ${entity.name}`);
}

logEntity({ id: 1, name: 'Alice', age: 25 }); // ✅
logEntity({ id: 1 }); // ❌ 缺少 name
```

## 约束与默认值

约束可以和默认类型一起使用：

```typescript
// T 默认是 string，但必须有 length 属性
function getLength<T extends { length: number } = string>(value: T): number {
  return value.length;
}

getLength('hello');  // 使用默认类型 string
getLength([1, 2, 3]); // 显式使用 number[]
```

## 实际应用

### 应用 1：安全的对象合并

```typescript
function merge<T extends object, U extends object>(a: T, b: U): T & U {
  return { ...a, ...b };
}

const result = merge({ name: 'Alice' }, { age: 25 });
// 类型是 { name: string } & { age: number }
console.log(result.name, result.age); // 类型安全
```

### 应用 2：类型安全的事件系统

```typescript
interface EventMap {
  click: { x: number; y: number };
  submit: { data: FormData };
  error: { message: string };
}

function on<K extends keyof EventMap>(
  event: K, 
  handler: (payload: EventMap[K]) => void
): void {
  // 实现略
}

on('click', (payload) => {
  console.log(payload.x, payload.y); // 自动推断类型
});

on('error', (payload) => {
  console.log(payload.message);
});

on('unknown', () => {}); // ❌ 'unknown' 不是 EventMap 的键
```

### 应用 3：确保比较运算

```typescript
// T 必须是可比较的（有 valueOf）
interface Comparable {
  valueOf(): number;
}

function max<T extends Comparable>(a: T, b: T): T {
  return a.valueOf() > b.valueOf() ? a : b;
}

max(1, 2);           // ✅ number 有 valueOf
max(new Date(), new Date()); // ✅ Date 有 valueOf
max('a', 'b');       // ✅ string 有 valueOf
```

## 约束的注意事项

### 约束不会改变返回类型

```typescript
function process<T extends string | number>(value: T): T {
  // 即使约束了 T，这里返回的仍然是 T，不是 string | number
  return value;
}

const result = process('hello' as const);
// result 的类型是 'hello'，不是 string
```

### 过度约束降低灵活性

```typescript
// ❌ 过度约束
function getId<T extends { id: number; name: string; email: string }>(obj: T): number {
  return obj.id;
}

// ✅ 只约束需要的部分
function getId<T extends { id: number }>(obj: T): number {
  return obj.id;
}
```

## 总结

- **泛型约束**使用 `extends` 限制类型参数范围
- **常见约束**：对象类型、keyof、接口、联合类型
- **多重约束**：使用 `&` 组合多个约束
- **约束原则**：只约束真正需要的特征，避免过度约束
- **应用场景**：对象操作、事件系统、类型安全的 API

接下来，我们将学习泛型在函数和类中的具体应用。
