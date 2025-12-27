# 接口隔离原则 (ISP)

> "客户端不应该被迫依赖它不使用的接口。" —— Robert C. Martin

## 什么是接口隔离原则？

**接口隔离原则（Interface Segregation Principle，ISP）** 的核心是：**宁可有多个专门的小接口，也不要一个臃肿的大接口**。

**思考**：如果一个接口有 20 个方法，但你的类只需要其中 3 个，会有什么问题？

1. 你需要实现 17 个用不到的方法（即使是空实现）
2. 接口变化时，可能被迫修改（即使变化的方法你不用）
3. 代码阅读者不知道哪些方法是真正用到的

## 臃肿接口的问题

### 反例：万能机器接口

```typescript
// ❌ 违反 ISP：一个接口做太多事
interface SmartDevice {
  // 打印功能
  print(document: Document): void;
  scan(): Image;
  fax(document: Document, number: string): void;
  
  // 网络功能
  connectWifi(ssid: string, password: string): void;
  getIpAddress(): string;
  
  // 存储功能
  saveToCloud(data: any): void;
  loadFromCloud(id: string): any;
  
  // 电源功能
  getBatteryLevel(): number;
  enterSleepMode(): void;
}

// 问题：简单的打印机需要实现所有方法
class SimplePrinter implements SmartDevice {
  print(document: Document): void {
    // 真正需要的功能
  }

  scan(): Image {
    throw new Error('Not supported');  // ❌ 被迫实现
  }

  fax(document: Document, number: string): void {
    throw new Error('Not supported');  // ❌ 被迫实现
  }

  connectWifi(ssid: string, password: string): void {
    throw new Error('Not supported');  // ❌ 被迫实现
  }

  getIpAddress(): string {
    throw new Error('Not supported');  // ❌ 被迫实现
  }

  saveToCloud(data: any): void {
    throw new Error('Not supported');  // ❌ 被迫实现
  }

  loadFromCloud(id: string): any {
    throw new Error('Not supported');  // ❌ 被迫实现
  }

  getBatteryLevel(): number {
    return 100;  // 有线打印机没有电池
  }

  enterSleepMode(): void {
    // 空实现
  }
}
```

这个设计有什么问题？

1. `SimplePrinter` 被迫实现 7 个它不需要的方法
2. 抛出 `'Not supported'` 异常违反了 LSP
3. 接口使用者不知道哪些方法真的可用

## 解决方案：接口分离

```typescript
// ✅ 遵循 ISP：接口按职责分离

// 打印相关
interface Printer {
  print(document: Document): void;
}

interface Scanner {
  scan(): Image;
}

interface Fax {
  fax(document: Document, number: string): void;
}

// 网络相关
interface NetworkConnectable {
  connectWifi(ssid: string, password: string): void;
  getIpAddress(): string;
}

// 云存储相关
interface CloudStorage {
  saveToCloud(data: any): void;
  loadFromCloud(id: string): any;
}

// 电源相关
interface PowerManaged {
  getBatteryLevel(): number;
  enterSleepMode(): void;
}

// 简单打印机只实现它需要的接口
class SimplePrinter implements Printer {
  print(document: Document): void {
    console.log('Printing...');
  }
}

// 多功能一体机实现多个接口
class MultiFunctionPrinter implements Printer, Scanner, Fax, NetworkConnectable {
  print(document: Document): void {
    console.log('Printing...');
  }

  scan(): Image {
    console.log('Scanning...');
    return new Image();
  }

  fax(document: Document, number: string): void {
    console.log(`Faxing to ${number}...`);
  }

  connectWifi(ssid: string, password: string): void {
    console.log(`Connecting to ${ssid}...`);
  }

  getIpAddress(): string {
    return '192.168.1.100';
  }
}
```

## ISP 的实际意义

### 减少不必要的依赖

```typescript
// ❌ 依赖臃肿接口
function printReport(device: SmartDevice, report: Report): void {
  // 只需要打印功能，但依赖了整个 SmartDevice
  device.print(report);
}

// ✅ 只依赖需要的接口
function printReport(printer: Printer, report: Report): void {
  // 只依赖 Printer 接口
  printer.print(report);
}
```

### 提高代码可测试性

```typescript
// 使用小接口更容易创建测试替身
class MockPrinter implements Printer {
  printedDocuments: Document[] = [];

  print(document: Document): void {
    this.printedDocuments.push(document);
  }
}

// 测试只需要 mock 一个方法
const mockPrinter = new MockPrinter();
printReport(mockPrinter, testReport);
expect(mockPrinter.printedDocuments).toContain(testReport);
```

## TypeScript 实战示例

### 用户仓库接口

```typescript
// ❌ 违反 ISP：一个大接口
interface UserRepository {
  // 基本 CRUD
  create(user: CreateUserDTO): Promise<User>;
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
  
  // 批量操作
  findAll(filter?: UserFilter): Promise<User[]>;
  createMany(users: CreateUserDTO[]): Promise<User[]>;
  deleteMany(ids: string[]): Promise<void>;
  
  // 统计
  count(filter?: UserFilter): Promise<number>;
  countByRole(role: string): Promise<number>;
  
  // 特殊查询
  findActiveUsers(): Promise<User[]>;
  findInactiveUsers(days: number): Promise<User[]>;
  searchByName(name: string): Promise<User[]>;
}

// ✅ 遵循 ISP：按使用场景分离

// 基本读取操作
interface UserReader {
  findById(id: string): Promise<User | null>;
  findByEmail(email: string): Promise<User | null>;
}

// 基本写入操作
interface UserWriter {
  create(user: CreateUserDTO): Promise<User>;
  update(id: string, data: UpdateUserDTO): Promise<User>;
  delete(id: string): Promise<void>;
}

// 批量操作
interface UserBatchOperations {
  findAll(filter?: UserFilter): Promise<User[]>;
  createMany(users: CreateUserDTO[]): Promise<User[]>;
  deleteMany(ids: string[]): Promise<void>;
}

// 统计查询
interface UserStatistics {
  count(filter?: UserFilter): Promise<number>;
  countByRole(role: string): Promise<number>;
}

// 特殊查询
interface UserSearch {
  findActiveUsers(): Promise<User[]>;
  findInactiveUsers(days: number): Promise<User[]>;
  searchByName(name: string): Promise<User[]>;
}

// 完整的仓库组合多个接口
interface UserRepository extends
  UserReader,
  UserWriter,
  UserBatchOperations,
  UserStatistics,
  UserSearch {}

// 只读服务只需要 UserReader
class UserProfileService {
  constructor(private userReader: UserReader) {}

  async getProfile(userId: string): Promise<UserProfile> {
    const user = await this.userReader.findById(userId);
    if (!user) throw new NotFoundError('User not found');
    return this.toProfile(user);
  }
}

// 管理服务需要更多接口
class UserAdminService {
  constructor(
    private userWriter: UserWriter,
    private userBatch: UserBatchOperations,
    private userStats: UserStatistics
  ) {}

  async getDashboardStats(): Promise<DashboardStats> {
    const totalUsers = await this.userStats.count();
    const adminCount = await this.userStats.countByRole('admin');
    return { totalUsers, adminCount };
  }
}
```

### React 组件 Props 设计

```typescript
// ❌ 违反 ISP：组件接收太多 props
interface ButtonProps {
  // 基本属性
  label: string;
  onClick: () => void;
  disabled?: boolean;
  
  // 样式相关
  variant: 'primary' | 'secondary' | 'danger';
  size: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
  
  // 图标相关
  icon?: IconType;
  iconPosition?: 'left' | 'right';
  
  // 加载状态
  loading?: boolean;
  loadingText?: string;
  
  // 链接行为
  href?: string;
  target?: '_blank' | '_self';
  
  // 高级功能
  tooltip?: string;
  hotkey?: string;
  analyticsEvent?: string;
}

// ✅ 遵循 ISP：使用组合接口

// 基础按钮属性
interface BaseButtonProps {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
}

// 样式属性
interface ButtonStyleProps {
  variant?: 'primary' | 'secondary' | 'danger';
  size?: 'small' | 'medium' | 'large';
  fullWidth?: boolean;
}

// 图标属性
interface IconButtonProps {
  icon?: IconType;
  iconPosition?: 'left' | 'right';
}

// 加载状态
interface LoadingProps {
  loading?: boolean;
  loadingText?: string;
}

// 链接行为
interface LinkProps {
  href?: string;
  target?: '_blank' | '_self';
}

// 组合使用
type ButtonProps = BaseButtonProps & ButtonStyleProps;
type IconButtonProps = ButtonProps & IconButtonProps;
type LoadingButtonProps = ButtonProps & LoadingProps;
type LinkButtonProps = BaseButtonProps & ButtonStyleProps & LinkProps;

// 组件只使用需要的接口
function SimpleButton({ label, onClick, disabled }: BaseButtonProps) {
  return (
    <button onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}

function LoadingButton({ label, onClick, loading, loadingText }: LoadingButtonProps) {
  return (
    <button onClick={onClick} disabled={loading}>
      {loading ? loadingText ?? 'Loading...' : label}
    </button>
  );
}
```

## ISP 设计技巧

### 1. 角色接口

按照客户端角色定义接口：

```typescript
// 不同角色看到不同的接口
interface ArticleForReader {
  getTitle(): string;
  getContent(): string;
  getAuthor(): string;
}

interface ArticleForEditor extends ArticleForReader {
  updateContent(content: string): void;
  publish(): void;
  unpublish(): void;
}

interface ArticleForAdmin extends ArticleForEditor {
  delete(): void;
  transferOwnership(newAuthor: string): void;
}
```

### 2. 命令查询分离

```typescript
// 查询接口：只读操作
interface ProductQueries {
  findById(id: string): Promise<Product | null>;
  findAll(filter?: ProductFilter): Promise<Product[]>;
  search(query: string): Promise<Product[]>;
}

// 命令接口：写操作
interface ProductCommands {
  create(data: CreateProductDTO): Promise<Product>;
  update(id: string, data: UpdateProductDTO): Promise<Product>;
  delete(id: string): Promise<void>;
  adjustInventory(id: string, quantity: number): Promise<void>;
}
```

### 3. 适配器模式

当必须实现一个臃肿接口时，使用适配器：

```typescript
// 第三方库的臃肿接口
interface ThirdPartyLogger {
  debug(msg: string): void;
  info(msg: string): void;
  warn(msg: string): void;
  error(msg: string): void;
  fatal(msg: string): void;
  setLevel(level: string): void;
  addHandler(handler: Handler): void;
  // ... 更多方法
}

// 我们只需要的接口
interface SimpleLogger {
  info(msg: string): void;
  error(msg: string): void;
}

// 适配器
class LoggerAdapter implements SimpleLogger {
  constructor(private logger: ThirdPartyLogger) {}

  info(msg: string): void {
    this.logger.info(msg);
  }

  error(msg: string): void {
    this.logger.error(msg);
  }
}
```

## 与其他原则的关系

- **SRP**：ISP 是 SRP 在接口层面的应用
- **LSP**：小接口更容易满足 LSP，因为契约更简单
- **DIP**：ISP 产生的小接口更适合作为依赖抽象

## 总结

**接口隔离原则的核心**：

1. 不要强迫客户端依赖它们不使用的方法
2. 大接口应该拆分成多个小的、专注的接口
3. 一个类可以实现多个小接口
4. 客户端只依赖它需要的接口

**快速检查清单**：
- [ ] 实现接口时，是否有空方法或抛异常的方法？
- [ ] 接口方法是否都是相关的？
- [ ] 不同的客户端是否使用接口的不同子集？
- [ ] 接口变化是否会影响不相关的客户端？
