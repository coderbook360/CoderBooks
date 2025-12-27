# DRY 原则

> "Don't Repeat Yourself" — 不要重复自己

**DRY** 是软件开发中最基础、最重要的原则之一。

## 什么是 DRY

DRY 原则的核心是：**每一个知识点在系统中应该有一个单一、明确、权威的表示**。

注意：DRY 不仅仅是关于代码重复，更是关于**知识重复**。

```typescript
// ❌ 违反 DRY：同一个计算逻辑在多处重复
function calculateOrderTotal(items: OrderItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

function calculateCartTotal(items: CartItem[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// ✅ 遵循 DRY：抽象为通用函数
interface HasPriceAndQuantity {
  price: number;
  quantity: number;
}

function calculateTotal<T extends HasPriceAndQuantity>(items: T[]): number {
  return items.reduce((sum, item) => sum + item.price * item.quantity, 0);
}
```

## DRY 的三种类型

### 1. 代码重复

最明显的重复形式。

```typescript
// ❌ 代码重复
function validateEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

function isValidUserEmail(email: string): boolean {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// ✅ 消除重复
const isValidEmail = (email: string): boolean => {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
};
```

### 2. 逻辑重复

代码不同，但逻辑相同。

```typescript
// ❌ 逻辑重复：两种不同的方式检查成年
function canDrink(user: User): boolean {
  return new Date().getFullYear() - user.birthYear >= 21;
}

function canVote(user: User): boolean {
  const age = new Date().getFullYear() - user.birthYear;
  return age >= 18;
}

// ✅ 抽象共同逻辑
function getAge(user: User): number {
  return new Date().getFullYear() - user.birthYear;
}

function canDrink(user: User): boolean {
  return getAge(user) >= 21;
}

function canVote(user: User): boolean {
  return getAge(user) >= 18;
}
```

### 3. 知识重复

同一业务规则在多处定义。

```typescript
// ❌ 知识重复：最大长度在多处硬编码
function validateUsername(name: string): boolean {
  return name.length <= 20;
}

const usernameInput = <input maxLength={20} />;

const usernameSchema = z.string().max(20);

// ✅ 单一定义
const USERNAME_MAX_LENGTH = 20;

function validateUsername(name: string): boolean {
  return name.length <= USERNAME_MAX_LENGTH;
}

const usernameInput = <input maxLength={USERNAME_MAX_LENGTH} />;
```

## 常见违反 DRY 的场景

### 1. 魔法数字和字符串

```typescript
// ❌ 魔法数字
if (user.role === 1) { /* admin */ }
if (response.status === 200) { /* success */ }

// ✅ 常量定义
const ROLE = { ADMIN: 1, USER: 2 } as const;
const HTTP_STATUS = { OK: 200, NOT_FOUND: 404 } as const;

if (user.role === ROLE.ADMIN) { /* admin */ }
```

### 2. 配置散落

```typescript
// ❌ 配置散落各处
const api1 = fetch('https://api.example.com/v1/users');
const api2 = fetch('https://api.example.com/v1/orders');

// ✅ 集中配置
const config = {
  apiBaseUrl: 'https://api.example.com/v1'
};

const api1 = fetch(`${config.apiBaseUrl}/users`);
const api2 = fetch(`${config.apiBaseUrl}/orders`);
```

### 3. 类型定义重复

```typescript
// ❌ 前后端类型各定义一次
// 前端
interface User { id: number; name: string; email: string; }
// 后端
interface UserEntity { id: number; name: string; email: string; }

// ✅ 共享类型定义（monorepo 或生成工具）
// shared/types.ts
export interface User { id: number; name: string; email: string; }
```

## DRY 的权衡

### 过度 DRY 的危害

**不是所有重复都需要消除。**

```typescript
// ❌ 过度抽象
function processValue<T>(
  value: T,
  validator: (v: T) => boolean,
  transformer: (v: T) => T,
  formatter: (v: T) => string
): string {
  if (!validator(value)) throw new Error('Invalid');
  return formatter(transformer(value));
}

// 使用时反而更复杂
processValue(name, isNotEmpty, trim, capitalize);

// ✅ 有时直接写更清晰
const formattedName = name.trim().charAt(0).toUpperCase() + name.slice(1);
```

### Rule of Three

> 重复两次可以忍，重复三次再抽象。

不要在第一次看到"相似"代码时就急于抽象。等待模式真正出现。

### 错误的抽象比重复更糟

```typescript
// ❌ 强行抽象不相关的逻辑
function processEntity(type: 'user' | 'order', data: any) {
  if (type === 'user') {
    // 用户逻辑
  } else {
    // 订单逻辑
  }
}

// ✅ 保持独立，代码更清晰
function processUser(user: User) { /* ... */ }
function processOrder(order: Order) { /* ... */ }
```

## 实践建议

### 1. 识别真正的重复

问自己：**如果需要修改，这些地方会一起改吗？**

- 会一起改 → 这是真正的重复，应该消除
- 碰巧相似 → 不是真正的重复，保持独立

### 2. 抽象层次要合适

```typescript
// ❌ 抽象层次过低
const add = (a: number, b: number) => a + b;
const total = add(add(price1, price2), price3);

// ✅ 抽象层次合适
const sum = (...numbers: number[]) => numbers.reduce((a, b) => a + b, 0);
const total = sum(price1, price2, price3);
```

### 3. 使用工具消除重复

- **常量**：消除魔法值
- **函数**：消除逻辑重复
- **泛型**：消除类型重复
- **组件**：消除 UI 重复
- **配置**：消除环境差异

## 总结

**DRY 的本质**：
- 不是"不要复制代码"
- 而是"每个知识点只有一个来源"

**何时抽象**：
- 等待重复真正出现（Rule of Three）
- 确认是真正的知识重复
- 抽象后代码更清晰，而非更复杂

**记住**：错误的抽象比重复更糟糕。保持务实。
