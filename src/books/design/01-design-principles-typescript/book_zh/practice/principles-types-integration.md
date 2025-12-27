# 总结：设计原则与类型系统融合

本书的核心：**设计原则**与 **TypeScript 类型系统**相互加强。

设计原则指导**架构思想**，类型系统提供**技术保障**。

## 回顾：设计原则

### SOLID 原则

| 原则 | 核心思想 | TypeScript 加强 |
|------|---------|-----------------|
| **S** - 单一职责 | 一个类只做一件事 | 接口分离，类型约束 |
| **O** - 开闭原则 | 扩展开放，修改关闭 | 泛型、条件类型 |
| **L** - 里氏替换 | 子类可替代父类 | 类型兼容性检查 |
| **I** - 接口隔离 | 接口小而精 | 接口组合、Pick/Omit |
| **D** - 依赖倒置 | 依赖抽象而非具体 | 接口类型、依赖注入 |

### 实用原则

| 原则 | 核心思想 | TypeScript 加强 |
|------|---------|-----------------|
| DRY | 不重复 | 泛型复用、工具类型 |
| KISS | 保持简单 | 类型推断减少冗余 |
| YAGNI | 不过度设计 | 按需定义类型 |
| 高内聚低耦合 | 相关放一起 | 模块类型隔离 |
| 迪米特法则 | 最少知识 | 接口隐藏实现 |

## 回顾：TypeScript 类型系统

### 基础类型

```typescript
// 原始类型
type Primitive = string | number | boolean | null | undefined | symbol | bigint;

// 字面量类型
type Status = 'pending' | 'active' | 'done';

// 元组
type Point = [number, number];

// 函数类型
type Handler = (event: Event) => void;
```

### 高级类型

```typescript
// 泛型
function identity<T>(value: T): T { return value; }

// 条件类型
type IsString<T> = T extends string ? true : false;

// 映射类型
type Readonly<T> = { readonly [K in keyof T]: T[K] };

// 模板字面量
type EventName = `on${Capitalize<string>}`;

// infer 推断
type ReturnType<T> = T extends (...args: any[]) => infer R ? R : never;
```

### 类型安全模式

```typescript
// 可辨识联合
type Result<T> = 
  | { success: true; data: T }
  | { success: false; error: Error };

// Branded Types
type UserId = string & { readonly brand: unique symbol };

// Schema 即类型
const UserSchema = z.object({ name: z.string() });
type User = z.infer<typeof UserSchema>;
```

## 融合：原则 + 类型

### 1. 单一职责 + 接口

```typescript
// ❌ 违反 SRP：一个接口太多职责
interface User {
  // 数据
  id: string;
  name: string;
  // 行为
  save(): Promise<void>;
  sendEmail(content: string): Promise<void>;
  generateReport(): string;
}

// ✅ 遵守 SRP：职责分离
interface UserData {
  id: string;
  name: string;
}

interface UserRepository {
  save(user: UserData): Promise<void>;
}

interface EmailService {
  send(to: string, content: string): Promise<void>;
}

interface ReportGenerator {
  generate(user: UserData): string;
}
```

### 2. 开闭原则 + 泛型

```typescript
// ✅ 通过泛型扩展而非修改
interface Repository<T, ID> {
  find(id: ID): Promise<T | null>;
  findAll(): Promise<T[]>;
  save(entity: T): Promise<T>;
  delete(id: ID): Promise<void>;
}

// 扩展：添加查询能力
interface QueryableRepository<T, ID, Q> extends Repository<T, ID> {
  query(criteria: Q): Promise<T[]>;
}

// 使用
class UserRepository implements QueryableRepository<User, string, UserQuery> {
  // 实现
}
```

### 3. 依赖倒置 + 接口类型

```typescript
// ✅ 依赖接口而非实现
interface Logger {
  info(message: string): void;
  error(message: string, error?: Error): void;
}

interface Database {
  query<T>(sql: string): Promise<T[]>;
}

class UserService {
  constructor(
    private logger: Logger,    // 接口
    private db: Database       // 接口
  ) {}
}

// 测试时可以注入 mock
const mockLogger: Logger = { info: jest.fn(), error: jest.fn() };
```

### 4. 高内聚 + 模块类型

```typescript
// ✅ 相关类型放在一起
// user/types.ts
export interface User {
  id: string;
  name: string;
}

export interface CreateUserDTO {
  name: string;
  email: string;
}

export interface UserRepository {
  create(dto: CreateUserDTO): Promise<User>;
  findById(id: string): Promise<User | null>;
}

// user/index.ts
export * from './types';
export { UserService } from './service';
export { UserController } from './controller';
```

### 5. 迪米特法则 + 接口隔离

```typescript
// ❌ 违反：暴露太多内部结构
function processOrder(order: Order) {
  const city = order.customer.address.city;
  const email = order.customer.contact.email;
}

// ✅ 遵守：只依赖需要的接口
interface OrderContext {
  shippingCity: string;
  customerEmail: string;
}

function processOrder(context: OrderContext) {
  const { shippingCity, customerEmail } = context;
}

// Order 类提供转换方法
class Order {
  toContext(): OrderContext {
    return {
      shippingCity: this.customer.address.city,
      customerEmail: this.customer.contact.email
    };
  }
}
```

## 实践检查清单

### 设计检查

- [ ] 每个类/模块只有一个职责吗？
- [ ] 新功能能通过扩展而非修改实现吗？
- [ ] 高层模块依赖接口而非具体实现吗？
- [ ] 接口是否足够小，没有臃肿方法？
- [ ] 模块之间的耦合是否最小化？

### 类型检查

- [ ] 使用了 strict 模式吗？
- [ ] 避免了 any 类型吗？
- [ ] 外部数据有运行时验证吗？
- [ ] 使用了可辨识联合处理多状态吗？
- [ ] 泛型是否被充分利用？

### 代码质量

- [ ] 类型与验证使用同一 Schema？
- [ ] 错误处理使用了 Result 类型？
- [ ] 配置有类型约束和验证？
- [ ] API 调用是类型安全的？

## 持续改进

### 渐进式严格化

```json
// 逐步开启严格选项
{
  "compilerOptions": {
    // 第一阶段
    "strict": true,
    
    // 第二阶段
    "noUncheckedIndexedAccess": true,
    
    // 第三阶段
    "noImplicitReturns": true,
    "noFallthroughCasesInSwitch": true
  }
}
```

### 重构节奏

1. **识别问题**：发现违反原则的代码
2. **编写测试**：确保行为不变
3. **小步重构**：每次只改一点
4. **类型引导**：让编译器帮你发现问题

### 团队协作

- 定义共享的类型库
- 建立类型规范文档
- Code Review 关注类型设计
- 使用 ESLint + TypeScript 插件

## 核心理念

**类型是设计的体现**：
- 好的类型设计反映好的架构设计
- 类型约束让原则落地
- 编译器是最勤勉的 Code Reviewer

**原则是类型的指导**：
- 原则告诉你「应该怎么设计」
- 类型帮你「强制执行」
- 两者结合 = 高质量代码

## 结语

设计原则和类型系统是**相辅相成**的：

- **设计原则**提供思想指导
- **TypeScript**提供技术保障
- **两者融合**产生高质量代码

掌握这两者，你将写出：
- 更易维护的代码
- 更少 bug 的代码
- 更易协作的代码

**记住**：好的代码不是写出来的，是设计出来的。而类型系统，是你设计的最佳伙伴。
