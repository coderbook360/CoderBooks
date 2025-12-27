# 里氏替换原则 (LSP)

> "子类型必须能够替换掉它们的基类型。" —— Barbara Liskov

## 什么是里氏替换原则？

**里氏替换原则（Liskov Substitution Principle，LSP）** 是关于继承的正确使用方式。

**核心思想**：如果 S 是 T 的子类型，那么程序中使用 T 的地方都可以用 S 来替换，而不会改变程序的正确性。

听起来很抽象？让我们看一个经典的反例。

## 经典反例：正方形 vs 矩形

数学上，正方形是特殊的矩形（边长相等的矩形）。那在代码中，让 `Square` 继承 `Rectangle` 是否合理？

```typescript
// 矩形类
class Rectangle {
  protected _width: number;
  protected _height: number;

  constructor(width: number, height: number) {
    this._width = width;
    this._height = height;
  }

  get width(): number {
    return this._width;
  }

  set width(value: number) {
    this._width = value;
  }

  get height(): number {
    return this._height;
  }

  set height(value: number) {
    this._height = value;
  }

  area(): number {
    return this._width * this._height;
  }
}

// 正方形继承矩形 —— 看起来合理？
class Square extends Rectangle {
  constructor(size: number) {
    super(size, size);
  }

  // 问题来了：正方形的宽和高必须相等
  set width(value: number) {
    this._width = value;
    this._height = value;  // 必须同时修改高度
  }

  set height(value: number) {
    this._width = value;   // 必须同时修改宽度
    this._height = value;
  }
}
```

**思考**：这段代码有什么问题？

让我们写一个使用矩形的函数：

```typescript
function increaseRectangleWidth(rect: Rectangle): void {
  const originalHeight = rect.height;
  rect.width = rect.width + 10;
  
  // 预期：高度不变
  console.assert(
    rect.height === originalHeight,
    'Height should not change when setting width'
  );
}

const rectangle = new Rectangle(10, 20);
increaseRectangleWidth(rectangle);  // ✅ 通过

const square = new Square(10);
increaseRectangleWidth(square);  // ❌ 断言失败！
```

**这就是违反 LSP**：子类（Square）不能安全地替换父类（Rectangle）。

客户端代码期望设置宽度不会影响高度，但正方形打破了这个期望。

## LSP 的正式定义

Barbara Liskov 给出的正式定义涉及几个条件：

### 1. 前置条件不能加强

子类方法的输入条件不能比父类更严格。

```typescript
// ❌ 违反 LSP
class Bird {
  fly(altitude: number): void {
    // 可以飞任意高度
  }
}

class Penguin extends Bird {
  fly(altitude: number): void {
    if (altitude > 0) {
      throw new Error("Penguins can't fly!");
    }
    // 企鹅不能飞，但父类说所有鸟都能飞
  }
}

// 客户端代码
function makeBirdFly(bird: Bird): void {
  bird.fly(100);  // Penguin 会抛出异常！
}
```

### 2. 后置条件不能削弱

子类方法的输出保证不能比父类更弱。

```typescript
// ❌ 违反 LSP
class DatabaseConnection {
  query(sql: string): Result[] {
    // 保证返回结果数组
    return this.executeQuery(sql);
  }
}

class CachedConnection extends DatabaseConnection {
  query(sql: string): Result[] | null {
    const cached = this.cache.get(sql);
    if (cached) return cached;
    
    // 可能返回 null（父类保证返回数组）
    if (this.isConnectionLost) return null;
    
    return super.query(sql);
  }
}
```

### 3. 不变量必须保持

父类定义的业务规则，子类不能破坏。

```typescript
// ❌ 违反 LSP：破坏了"余额不能为负"的不变量
class BankAccount {
  protected balance: number = 0;

  withdraw(amount: number): void {
    if (amount > this.balance) {
      throw new Error('Insufficient funds');
    }
    this.balance -= amount;
  }

  getBalance(): number {
    return this.balance;
  }
}

class OverdraftAccount extends BankAccount {
  withdraw(amount: number): void {
    // 允许透支，破坏了余额>=0的不变量
    this.balance -= amount;
  }
}

// 客户端代码
function processPayment(account: BankAccount): void {
  account.withdraw(100);
  // 期望 account.getBalance() >= 0
  // 但 OverdraftAccount 可能返回负数
}
```

## 正确的设计方式

### 方案一：使用组合代替继承

```typescript
// ✅ 正方形和矩形不是继承关系
interface Shape {
  area(): number;
}

class Rectangle implements Shape {
  constructor(
    private width: number,
    private height: number
  ) {}

  area(): number {
    return this.width * this.height;
  }

  setWidth(value: number): void {
    this.width = value;
  }

  setHeight(value: number): void {
    this.height = value;
  }
}

class Square implements Shape {
  constructor(private size: number) {}

  area(): number {
    return this.size ** 2;
  }

  setSize(value: number): void {
    this.size = value;
  }
}
```

### 方案二：重新设计继承层次

```typescript
// ✅ 鸟类的正确继承设计
interface Bird {
  eat(): void;
  sleep(): void;
}

interface FlyingBird extends Bird {
  fly(altitude: number): void;
}

interface SwimmingBird extends Bird {
  swim(depth: number): void;
}

class Eagle implements FlyingBird {
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
  fly(altitude: number): void {
    console.log(`Flying at ${altitude} meters`);
  }
}

class Penguin implements SwimmingBird {
  eat(): void { /* ... */ }
  sleep(): void { /* ... */ }
  swim(depth: number): void {
    console.log(`Swimming at ${depth} meters deep`);
  }
}

// 客户端代码
function makeFly(bird: FlyingBird): void {
  bird.fly(100);  // ✅ 类型系统保证这是会飞的鸟
}

makeFly(new Eagle());   // ✅ 正确
// makeFly(new Penguin()); // ❌ 编译错误！
```

### 方案三：使用抽象类定义契约

```typescript
// ✅ 明确定义不变量和契约
abstract class Account {
  protected _balance: number = 0;

  // 模板方法：定义通用流程
  withdraw(amount: number): boolean {
    if (!this.canWithdraw(amount)) {
      return false;
    }
    this._balance -= amount;
    this.onWithdraw(amount);
    return true;
  }

  // 子类实现：定义特定规则
  protected abstract canWithdraw(amount: number): boolean;

  // 钩子方法：可选的扩展点
  protected onWithdraw(amount: number): void {}

  getBalance(): number {
    return this._balance;
  }
}

class SavingsAccount extends Account {
  protected canWithdraw(amount: number): boolean {
    return amount <= this._balance;
  }
}

class OverdraftAccount extends Account {
  constructor(private overdraftLimit: number) {
    super();
  }

  protected canWithdraw(amount: number): boolean {
    return amount <= this._balance + this.overdraftLimit;
  }
}

// 客户端代码
function processRefund(account: Account, amount: number): void {
  const success = account.withdraw(amount);
  // 两种账户都遵循相同的接口契约
  console.log(success ? 'Refund processed' : 'Refund failed');
}
```

## TypeScript 实战示例

### 集合类的 LSP 设计

```typescript
// 定义只读集合接口
interface ReadonlyCollection<T> {
  get(index: number): T | undefined;
  size(): number;
  includes(item: T): boolean;
  forEach(callback: (item: T) => void): void;
}

// 可变集合继承只读集合
interface MutableCollection<T> extends ReadonlyCollection<T> {
  add(item: T): void;
  remove(item: T): boolean;
  clear(): void;
}

// 实现
class ArrayList<T> implements MutableCollection<T> {
  private items: T[] = [];

  get(index: number): T | undefined {
    return this.items[index];
  }

  size(): number {
    return this.items.length;
  }

  includes(item: T): boolean {
    return this.items.includes(item);
  }

  forEach(callback: (item: T) => void): void {
    this.items.forEach(callback);
  }

  add(item: T): void {
    this.items.push(item);
  }

  remove(item: T): boolean {
    const index = this.items.indexOf(item);
    if (index >= 0) {
      this.items.splice(index, 1);
      return true;
    }
    return false;
  }

  clear(): void {
    this.items = [];
  }
}

// 不可变列表：只实现只读接口
class ImmutableList<T> implements ReadonlyCollection<T> {
  constructor(private items: readonly T[]) {}

  get(index: number): T | undefined {
    return this.items[index];
  }

  size(): number {
    return this.items.length;
  }

  includes(item: T): boolean {
    return this.items.includes(item);
  }

  forEach(callback: (item: T) => void): void {
    this.items.forEach(callback);
  }

  // 返回新的不可变列表
  with(item: T): ImmutableList<T> {
    return new ImmutableList([...this.items, item]);
  }
}

// 函数可以安全地接受只读集合
function printCollection<T>(collection: ReadonlyCollection<T>): void {
  collection.forEach(item => console.log(item));
}

const mutable = new ArrayList<number>();
mutable.add(1);
mutable.add(2);
printCollection(mutable);  // ✅ MutableCollection 是 ReadonlyCollection 的子类型

const immutable = new ImmutableList([1, 2, 3]);
printCollection(immutable);  // ✅ 同样有效
```

## 检测 LSP 违规

### 警示信号

1. **子类重写方法抛出异常**：父类不抛的异常，子类抛了
2. **子类重写方法什么都不做**：空实现
3. **类型检查**：代码中出现 `instanceof` 检查子类型
4. **文档说明**："此方法在 XXX 子类中行为不同"

```typescript
// ❌ instanceof 检查是 LSP 违规的信号
function handleShape(shape: Shape): void {
  if (shape instanceof Square) {
    // 特殊处理正方形
  } else if (shape instanceof Rectangle) {
    // 处理矩形
  }
  // 这说明 Shape 层次结构设计有问题
}
```

### 契约测试

为父类编写测试，然后对所有子类运行相同的测试：

```typescript
function testAccountContract(account: Account): void {
  // 测试不变量
  expect(account.getBalance()).toBeGreaterThanOrEqual(-account.overdraftLimit ?? 0);

  // 测试前置条件
  const initialBalance = account.getBalance();
  account.withdraw(initialBalance + 1000);
  // 不应该崩溃，可以返回 false

  // 测试后置条件
  account.deposit(100);
  expect(account.getBalance()).toBe(initialBalance + 100);
}

// 对所有子类运行
testAccountContract(new SavingsAccount());
testAccountContract(new OverdraftAccount(500));
testAccountContract(new PremiumAccount());
```

## 与其他原则的关系

- **OCP**：LSP 是实现 OCP 的基础，只有遵循 LSP 的子类才能安全替换父类
- **ISP**：接口隔离可以帮助避免 LSP 违规（如把 FlyingBird 分离出来）
- **DIP**：依赖抽象时，必须确保所有实现都遵循 LSP

## 总结

**里氏替换原则的核心**：

1. 子类型必须能够完全替换父类型
2. 子类不能加强前置条件
3. 子类不能削弱后置条件
4. 子类必须保持父类的不变量
5. "Is-a" 关系在行为上也必须成立，不仅是数据结构

**快速检查清单**：
- [ ] 子类方法是否接受所有父类方法接受的输入？
- [ ] 子类方法是否返回父类方法承诺的输出？
- [ ] 子类是否保持了父类定义的业务规则？
- [ ] 用子类替换父类后，现有代码是否仍然正确运行？
