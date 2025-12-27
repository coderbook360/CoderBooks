# YAGNI 原则

> "You Aren't Gonna Need It" — 你不会需要它

**YAGNI** 是对抗过度设计的核心原则。

## 什么是 YAGNI

YAGNI 原则的核心是：**不要为假想的未来需求写代码**。

```typescript
// ❌ 违反 YAGNI：为了"以后可能需要"而添加的功能
interface UserService {
  create(user: User): User;
  update(user: User): User;
  delete(id: string): void;
  
  // "以后可能需要批量操作"
  batchCreate(users: User[]): User[];
  batchUpdate(users: User[]): User[];
  batchDelete(ids: string[]): void;
  
  // "以后可能需要软删除"
  softDelete(id: string): void;
  restore(id: string): void;
  
  // "以后可能需要导入导出"
  import(file: File): User[];
  export(format: 'csv' | 'json'): Blob;
}

// ✅ 遵循 YAGNI：只实现当前需要的
interface UserService {
  create(user: User): User;
  update(user: User): User;
  delete(id: string): void;
}
```

## 为什么 YAGNI 很重要

### 1. 浪费开发时间

为假想需求写代码 = 写了可能永远不用的代码。

```typescript
// 花了 2 天写的通用缓存系统
class AdvancedCache<T> {
  private storage: Map<string, CacheEntry<T>> = new Map();
  private maxSize: number;
  private ttl: number;
  private evictionPolicy: 'lru' | 'lfu' | 'fifo';
  
  // 200 行代码...
}

// 实际只需要：
const cache = new Map<string, User>();
```

### 2. 增加维护成本

未使用的代码也需要维护、测试、更新。

```typescript
// 这个 "以后可能用" 的函数
// - 需要测试
// - 依赖更新时需要检查
// - 重构时需要考虑
// - 新人需要理解
function exportToMultipleFormats(
  data: any[],
  formats: ('csv' | 'json' | 'xml' | 'yaml')[]
): Record<string, Blob> {
  // 从未被调用过...
}
```

### 3. 预测往往是错的

你以为的未来需求，经常不是真正的需求。

```typescript
// 预测："用户以后肯定需要多种主题"
const themes = {
  light: { /* ... */ },
  dark: { /* ... */ },
  blue: { /* ... */ },
  green: { /* ... */ },
  custom: { /* ... */ }
};

// 现实：只用了 light 和 dark
```

## YAGNI 的典型违反场景

### 1. 过度通用化

```typescript
// ❌ "以后可能需要支持其他数据库"
interface DatabaseAdapter {
  connect(): Promise<void>;
  query<T>(sql: string): Promise<T[]>;
  execute(sql: string): Promise<void>;
}

class MySQLAdapter implements DatabaseAdapter { /* ... */ }
class PostgresAdapter implements DatabaseAdapter { /* ... */ }
class SQLiteAdapter implements DatabaseAdapter { /* ... */ }

// ✅ 只用 PostgreSQL？直接用 PostgreSQL
import { Pool } from 'pg';
const db = new Pool(config);
```

### 2. 配置化一切

```typescript
// ❌ "以后可能需要配置这些"
interface ButtonConfig {
  size: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant: 'solid' | 'outline' | 'ghost' | 'link';
  colorScheme: string;
  leftIcon?: IconType;
  rightIcon?: IconType;
  isLoading?: boolean;
  loadingText?: string;
  spinner?: ReactElement;
  spinnerPlacement?: 'start' | 'end';
  // ... 还有 20 个配置项
}

// ✅ 满足当前需求
interface ButtonProps {
  variant?: 'primary' | 'secondary';
  disabled?: boolean;
  onClick: () => void;
}
```

### 3. 预留扩展点

```typescript
// ❌ "以后可能需要插件系统"
class App {
  private plugins: Plugin[] = [];
  
  registerPlugin(plugin: Plugin) { /* ... */ }
  unregisterPlugin(plugin: Plugin) { /* ... */ }
  
  // 3 年后，一个插件都没有
}

// ✅ 等真正需要时再加
class App {
  // 专注核心功能
}
```

### 4. 过度参数化

```typescript
// ❌ "以后可能需要这些参数"
function fetchData(
  url: string,
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE',
  headers?: Record<string, string>,
  body?: any,
  timeout?: number,
  retries?: number,
  cache?: boolean,
  credentials?: 'include' | 'omit' | 'same-origin'
) { /* ... */ }

// ✅ 只暴露需要的
function fetchData(url: string) {
  return fetch(url).then(r => r.json());
}
```

## YAGNI 实践指南

### 1. 问"现在需要吗？"

每次想添加功能时，问自己：

- 这是当前需求吗？
- 有用户在等这个功能吗？
- 没有它，产品能工作吗？

### 2. 等待需求明确

```typescript
// 第一版：最简单实现
function sendNotification(userId: string, message: string) {
  sendEmail(userId, message);
}

// 第二版：当真正需要多渠道时
function sendNotification(
  userId: string, 
  message: string, 
  channel: 'email' | 'sms' = 'email'
) {
  switch (channel) {
    case 'email': return sendEmail(userId, message);
    case 'sms': return sendSMS(userId, message);
  }
}
```

### 3. 保持代码易于扩展

YAGNI 不意味着写死。保持代码简单但易于修改。

```typescript
// ✅ 简单，但易于扩展
function formatPrice(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

// 当需要多币种时，可以轻松修改
function formatPrice(amount: number, currency = 'USD'): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency
  }).format(amount);
}
```

### 4. 删除死代码

```typescript
// 定期清理：
// - 注释掉的代码
// - 从未调用的函数
// - 未使用的变量和导入
// - 永远不会执行的分支
```

## YAGNI vs 良好设计

YAGNI 不是反对良好设计。

**YAGNI 反对的是**：
- 为假想需求写代码
- 过度通用化
- 提前优化

**YAGNI 支持的是**：
- 满足当前需求的简洁代码
- 易于理解和修改的结构
- 合理的抽象层次

```typescript
// ✅ 好设计 + YAGNI
class UserRepository {
  // 清晰的接口，满足当前需求
  async findById(id: string): Promise<User | null> {
    return this.db.users.findOne({ id });
  }
  
  async save(user: User): Promise<User> {
    return this.db.users.save(user);
  }
}

// 没有预留"批量操作"、"缓存层"、"事件发布"
// 等真正需要时再添加
```

## 总结

**YAGNI 的核心**：
- 不要为假想的未来写代码
- 专注于当前需求
- 等待需求明确

**实践要点**：
- 每个功能问"现在需要吗？"
- 从最简单的实现开始
- 保持代码易于扩展而非过度设计
- 定期清理死代码

**记住**：代码最好的状态是不存在。每一行代码都是负债。
