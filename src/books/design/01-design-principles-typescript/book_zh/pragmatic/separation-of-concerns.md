# 关注点分离

**关注点分离（Separation of Concerns, SoC）** 是软件设计的基础原则之一。

每个模块应该只关注**一个明确的职责**，不同的职责应该分开处理。

## 什么是关注点

**关注点（Concern）** 是程序中一个特定的功能或责任。

常见的关注点：
- 数据访问
- 业务逻辑
- 用户界面
- 日志记录
- 错误处理
- 认证授权
- 缓存

## 为什么要分离

### 1. 降低复杂度

```typescript
// ❌ 混合关注点：一个函数做太多事
async function createUserAndSendEmail(data: UserData) {
  // 验证
  if (!data.email.includes('@')) throw new Error('Invalid email');
  if (data.password.length < 8) throw new Error('Password too short');
  
  // 加密
  const hashedPassword = await bcrypt.hash(data.password, 10);
  
  // 保存
  const user = await db.users.create({
    ...data,
    password: hashedPassword
  });
  
  // 发送邮件
  const template = fs.readFileSync('welcome.html', 'utf-8');
  const html = template.replace('{{name}}', user.name);
  await smtp.send({ to: user.email, html });
  
  // 日志
  console.log(`User created: ${user.id}`);
  
  return user;
}

// ✅ 分离关注点
class UserValidator {
  validate(data: UserData): ValidationResult { /* ... */ }
}

class PasswordService {
  async hash(password: string): Promise<string> { /* ... */ }
}

class UserRepository {
  async create(data: CreateUserData): Promise<User> { /* ... */ }
}

class EmailService {
  async sendWelcome(user: User): Promise<void> { /* ... */ }
}

class UserService {
  constructor(
    private validator: UserValidator,
    private passwordService: PasswordService,
    private userRepo: UserRepository,
    private emailService: EmailService
  ) {}
  
  async createUser(data: UserData): Promise<User> {
    this.validator.validate(data);
    const hashedPassword = await this.passwordService.hash(data.password);
    const user = await this.userRepo.create({ ...data, password: hashedPassword });
    await this.emailService.sendWelcome(user);
    return user;
  }
}
```

### 2. 易于修改

分离后，修改一个关注点不会影响其他部分。

```typescript
// 更换邮件服务：只需修改 EmailService
// 更换数据库：只需修改 UserRepository
// 更换密码加密：只需修改 PasswordService
```

### 3. 易于测试

```typescript
// 可以独立测试每个关注点
test('UserValidator', () => { /* ... */ });
test('PasswordService', () => { /* ... */ });
test('UserRepository', () => { /* ... */ });
test('EmailService', () => { /* ... */ });
```

### 4. 易于复用

```typescript
// PasswordService 可以在其他地方复用
class PasswordResetService {
  constructor(private passwordService: PasswordService) {}
  
  async reset(userId: string, newPassword: string) {
    const hashed = await this.passwordService.hash(newPassword);
    // ...
  }
}
```

## 常见的分层架构

### MVC 模式

```
┌──────────────────────────────────────────┐
│                  View                     │
│        (UI 展示，用户交互)                 │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│               Controller                  │
│        (处理请求，协调逻辑)                │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│                 Model                     │
│        (数据和业务逻辑)                   │
└──────────────────────────────────────────┘
```

### 三层架构

```
┌──────────────────────────────────────────┐
│           Presentation Layer              │
│        (UI 组件，路由，控制器)             │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│            Business Layer                 │
│        (业务逻辑，服务，用例)              │
└──────────────────────────────────────────┘
                    ↕
┌──────────────────────────────────────────┐
│              Data Layer                   │
│        (数据访问，仓储，ORM)               │
└──────────────────────────────────────────┘
```

## 前端的关注点分离

### React 组件

```typescript
// ❌ 混合关注点
function UserProfile() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(setUser)
      .finally(() => setLoading(false));
  }, []);
  
  if (loading) return <Spinner />;
  if (!user) return <Error message="No user" />;
  
  return (
    <div className="profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// ✅ 分离关注点
// 1. 数据获取（Hook）
function useUser() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  
  useEffect(() => {
    fetch('/api/user')
      .then(r => r.json())
      .then(setUser)
      .catch(setError)
      .finally(() => setLoading(false));
  }, []);
  
  return { user, loading, error };
}

// 2. 展示组件（纯 UI）
function UserProfileView({ user }: { user: User }) {
  return (
    <div className="profile">
      <h1>{user.name}</h1>
      <p>{user.email}</p>
    </div>
  );
}

// 3. 容器组件（组合）
function UserProfile() {
  const { user, loading, error } = useUser();
  
  if (loading) return <Spinner />;
  if (error) return <Error message={error.message} />;
  if (!user) return <Error message="No user" />;
  
  return <UserProfileView user={user} />;
}
```

### 样式分离

```typescript
// ❌ 样式混在组件里
function Button() {
  return (
    <button style={{
      padding: '8px 16px',
      backgroundColor: '#007bff',
      color: 'white',
      border: 'none',
      borderRadius: '4px'
    }}>
      Click me
    </button>
  );
}

// ✅ 样式分离
// Button.module.css
// .button { padding: 8px 16px; ... }

// Button.tsx
import styles from './Button.module.css';

function Button() {
  return <button className={styles.button}>Click me</button>;
}
```

## 后端的关注点分离

```typescript
// 目录结构示例
src/
├── controllers/     # 处理 HTTP 请求
│   └── UserController.ts
├── services/        # 业务逻辑
│   └── UserService.ts
├── repositories/    # 数据访问
│   └── UserRepository.ts
├── validators/      # 输入验证
│   └── UserValidator.ts
├── models/          # 数据模型
│   └── User.ts
└── middleware/      # 横切关注点
    ├── auth.ts
    ├── logging.ts
    └── errorHandler.ts
```

## 横切关注点

某些关注点会**横跨**多个模块，如日志、认证、事务。

### 处理方式：装饰器 / 中间件

```typescript
// 日志：使用装饰器
function Log(target: any, key: string, descriptor: PropertyDescriptor) {
  const original = descriptor.value;
  descriptor.value = function (...args: any[]) {
    console.log(`Calling ${key} with`, args);
    const result = original.apply(this, args);
    console.log(`${key} returned`, result);
    return result;
  };
}

class UserService {
  @Log
  createUser(data: UserData) { /* ... */ }
}

// 认证：使用中间件
app.use('/api', authMiddleware);
app.get('/api/users', userController.list);
```

## 分离的边界

### 不要过度分离

```typescript
// ❌ 过度分离：每个小功能都独立类
class UsernameValidator { }
class EmailValidator { }
class PasswordValidator { }
class AgeValidator { }

// ✅ 合理分离：相关功能放一起
class UserValidator {
  validateUsername(name: string): boolean { /* ... */ }
  validateEmail(email: string): boolean { /* ... */ }
  validatePassword(password: string): boolean { /* ... */ }
}
```

### 保持实用

```typescript
// 简单场景不需要复杂分层
// 一个小工具函数直接写就好
function formatDate(date: Date): string {
  return date.toISOString().split('T')[0];
}
```

## 总结

**关注点分离的好处**：
- 降低复杂度
- 易于修改
- 易于测试
- 易于复用

**常见分离方式**：
- 分层架构（MVC、三层架构）
- 组件化（容器/展示组件）
- 中间件（横切关注点）

**实践要点**：
- 每个模块只做一件事
- 相关功能放在一起
- 不相关功能分开
- 不要过度分离

**记住**：分离是为了简化，不是为了增加复杂度。
