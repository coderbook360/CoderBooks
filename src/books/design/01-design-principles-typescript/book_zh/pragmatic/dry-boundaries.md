# DRY 的边界

DRY 原则很重要，但**不是所有重复都应该消除**。

理解 DRY 的边界，是成为务实开发者的关键。

## 什么时候不应该 DRY

### 1. 偶然重复 vs 真正重复

**偶然重复**：代码看起来相似，但代表不同的概念。

```typescript
// ❌ 强行 DRY：这两个验证规则碰巧相似，但含义不同
function validateLength(value: string, min: number, max: number): boolean {
  return value.length >= min && value.length <= max;
}

// 用户名：3-20 字符
const isValidUsername = validateLength(username, 3, 20);
// 密码：8-128 字符
const isValidPassword = validateLength(password, 8, 128);

// 问题：如果用户名规则改为"必须以字母开头"，密码规则不变
// 共享的函数会变得复杂

// ✅ 保持独立：不同业务规则，独立演化
function validateUsername(username: string): boolean {
  return username.length >= 3 && 
         username.length <= 20 && 
         /^[a-zA-Z]/.test(username);
}

function validatePassword(password: string): boolean {
  return password.length >= 8 && password.length <= 128;
}
```

### 2. 跨边界的重复

不同模块或服务之间的重复，可能是有意的。

```typescript
// 前端
interface User {
  id: string;
  name: string;
  email: string;
}

// 后端
interface UserEntity {
  id: string;
  name: string;
  email: string;
}

// 这不一定需要消除！
// - 前端可能需要额外字段（displayName, avatar）
// - 后端可能有敏感字段（passwordHash）
// - 两边可能独立演化
```

### 3. 测试代码中的重复

测试代码优先考虑**清晰性**而非 DRY。

```typescript
// ❌ 过度 DRY 的测试
function testUserCreation(userData: Partial<User>, expected: Partial<User>) {
  const user = createUser(userData);
  expect(user).toMatchObject(expected);
}

testUserCreation({ name: 'Alice' }, { name: 'Alice', role: 'user' });
testUserCreation({ name: 'Bob', role: 'admin' }, { name: 'Bob', role: 'admin' });

// ✅ 清晰的测试（允许重复）
it('should create user with default role', () => {
  const user = createUser({ name: 'Alice' });
  expect(user.name).toBe('Alice');
  expect(user.role).toBe('user'); // 默认角色
});

it('should create user with specified role', () => {
  const user = createUser({ name: 'Bob', role: 'admin' });
  expect(user.name).toBe('Bob');
  expect(user.role).toBe('admin');
});
```

### 4. 错误的抽象

**错误的抽象比重复更糟糕。**

```typescript
// ❌ 强行抽象
function processEntity(type: 'user' | 'order' | 'product', data: any) {
  switch (type) {
    case 'user':
      // 用户处理逻辑
      validateUser(data);
      saveUser(data);
      sendWelcomeEmail(data);
      break;
    case 'order':
      // 订单处理逻辑
      validateOrder(data);
      calculateTotal(data);
      saveOrder(data);
      break;
    case 'product':
      // 产品处理逻辑
      validateProduct(data);
      updateInventory(data);
      saveProduct(data);
      break;
  }
}

// ✅ 保持独立：逻辑清晰，独立演化
function processUser(user: User) { /* ... */ }
function processOrder(order: Order) { /* ... */ }
function processProduct(product: Product) { /* ... */ }
```

## 判断标准

问自己这些问题：

### 问题 1：改一个会改另一个吗？

```typescript
// 如果改用户名验证规则，密码验证也要改？
// - 是 → 这是真正的重复，应该消除
// - 否 → 这是偶然重复，保持独立
```

### 问题 2：抽象后更容易理解吗？

```typescript
// ❌ 抽象后更难理解
const result = pipe(
  filter(isActive),
  map(transform),
  reduce(aggregate, initial)
)(data);

// ✅ 直接写更清晰
const activeItems = data.filter(isActive);
const transformed = activeItems.map(transform);
const result = transformed.reduce(aggregate, initial);
```

### 问题 3：这个抽象稳定吗？

```typescript
// 如果抽象需要频繁修改以适应不同场景
// 说明这个抽象是错误的

function sendNotification(
  type: 'email' | 'sms' | 'push' | 'webhook', // 不断增加
  recipient: string | PhoneNumber | DeviceToken, // 不断变化
  content: string | Template | RichContent, // 不断复杂
  options?: NotificationOptions // 膨胀的配置
) { /* 越来越难维护 */ }
```

## Rule of Three

**重复三次再抽象**。

```typescript
// 第一次：直接写
function createUser(data: UserData): User {
  return { ...data, createdAt: new Date() };
}

// 第二次：还是直接写
function createOrder(data: OrderData): Order {
  return { ...data, createdAt: new Date() };
}

// 第三次：现在可以考虑抽象了
function withTimestamp<T>(data: T): T & { createdAt: Date } {
  return { ...data, createdAt: new Date() };
}
```

## WET 原则

**Write Everything Twice**（写两遍）

这是对过度 DRY 的反思：

```typescript
// 允许适度重复，换取：
// 1. 代码更容易理解
// 2. 模块可以独立演化
// 3. 减少不必要的抽象层
```

## 实践建议

### 1. 知识重复 vs 代码重复

消除**知识重复**，容忍**代码重复**。

```typescript
// ❌ 知识重复：应该消除
const MAX_LENGTH = 20;
if (username.length > 20) { /* ... */ } // 魔法数字

// ✅ 代码重复：可以容忍
// ComponentA
const [loading, setLoading] = useState(false);

// ComponentB（相同模式，但是独立状态）
const [loading, setLoading] = useState(false);
```

### 2. 延迟抽象

不确定时，先保持重复。

```typescript
// 先写两份独立的代码
// 观察它们如何演化
// 当模式真正清晰时再抽象
```

### 3. 边界要清晰

跨模块/服务的代码，保持独立。

```typescript
// 前端和后端
// 不同微服务
// 不同业务领域
// 这些边界内的"重复"通常是有意义的
```

## 总结

**应该消除的重复**：
- 同一知识点在多处定义
- 业务规则散落各处
- 真正会一起变化的代码

**可以保留的重复**：
- 偶然相似的代码
- 跨边界的类型定义
- 测试代码中的重复
- 尚未明确模式的代码

**核心原则**：
- 错误的抽象比重复更糟
- Rule of Three
- 优先保持代码清晰

**记住**：DRY 是手段，不是目的。可维护性才是目标。
