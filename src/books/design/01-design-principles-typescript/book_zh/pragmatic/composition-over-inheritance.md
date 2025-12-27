# 组合优于继承

> "Favor composition over inheritance" — Gang of Four

这是面向对象设计中最重要的原则之一。

## 继承的问题

### 1. 脆弱的基类问题

修改父类可能破坏所有子类。

```typescript
// ❌ 脆弱的继承层次
class Animal {
  move() {
    console.log('Moving...');
  }
}

class Bird extends Animal {
  move() {
    console.log('Flying...');
  }
}

class Penguin extends Bird {
  // 问题：企鹅不会飞！
  // 但继承了 Bird 的 move()
}
```

### 2. 紧耦合

子类与父类紧密绑定，难以独立变化。

```typescript
// ❌ 紧耦合
class BaseComponent {
  protected state: any;
  protected render() { /* ... */ }
  protected update() { /* ... */ }
}

class UserProfile extends BaseComponent {
  // 必须了解 BaseComponent 的全部实现细节
  // 无法轻易替换基类
}
```

### 3. 单继承限制

大多数语言只支持单继承。

```typescript
// 需要同时具有"可序列化"和"可缓存"的能力
// ❌ 无法多重继承
class User extends Serializable { } // 只能选一个
class User extends Cacheable { }    // 无法同时继承两个

// ✅ 组合可以自由组合能力
class User {
  constructor(
    private serializer: Serializer,
    private cache: Cache
  ) {}
}
```

### 4. 继承层次膨胀

```typescript
// ❌ 类爆炸
class Animal { }
class Bird extends Animal { }
class FlyingBird extends Bird { }
class SwimmingBird extends Bird { }
class FlyingSwimmingBird extends ??? // 困境！

class Duck extends FlyingSwimmingBird { }
class Penguin extends SwimmingBird { }
class Ostrich extends ??? // 不会飞不会游的鸟
```

## 组合的优势

### 1. 灵活组合能力

```typescript
// ✅ 组合：能力可以自由组合
interface CanFly {
  fly(): void;
}

interface CanSwim {
  swim(): void;
}

interface CanWalk {
  walk(): void;
}

class Duck implements CanFly, CanSwim, CanWalk {
  constructor(
    private flyer: Flyer,
    private swimmer: Swimmer,
    private walker: Walker
  ) {}
  
  fly() { this.flyer.fly(); }
  swim() { this.swimmer.swim(); }
  walk() { this.walker.walk(); }
}

class Penguin implements CanSwim, CanWalk {
  // 只组合需要的能力
}
```

### 2. 运行时切换

```typescript
// ✅ 组合允许运行时改变行为
class Character {
  constructor(private weapon: Weapon) {}
  
  attack() {
    this.weapon.use();
  }
  
  changeWeapon(weapon: Weapon) {
    this.weapon = weapon;
  }
}

const hero = new Character(new Sword());
hero.attack(); // 使用剑

hero.changeWeapon(new Bow());
hero.attack(); // 使用弓
```

### 3. 易于测试

```typescript
// ✅ 组合便于 mock
class OrderService {
  constructor(
    private paymentGateway: PaymentGateway,
    private emailService: EmailService
  ) {}
}

// 测试时注入 mock
const mockPayment = { charge: jest.fn() };
const mockEmail = { send: jest.fn() };
const service = new OrderService(mockPayment, mockEmail);
```

## 实现组合的方式

### 方式 1：接口 + 依赖注入

```typescript
interface Logger {
  log(message: string): void;
}

interface Storage {
  save(data: any): void;
  load(): any;
}

class UserService {
  constructor(
    private logger: Logger,
    private storage: Storage
  ) {}
  
  saveUser(user: User) {
    this.logger.log(`Saving user: ${user.name}`);
    this.storage.save(user);
  }
}

// 不同组合
const devService = new UserService(new ConsoleLogger(), new MemoryStorage());
const prodService = new UserService(new FileLogger(), new DatabaseStorage());
```

### 方式 2：策略模式

```typescript
interface SortStrategy<T> {
  sort(items: T[]): T[];
}

class QuickSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] { /* ... */ }
}

class MergeSort<T> implements SortStrategy<T> {
  sort(items: T[]): T[] { /* ... */ }
}

class DataProcessor<T> {
  constructor(private sortStrategy: SortStrategy<T>) {}
  
  process(data: T[]): T[] {
    return this.sortStrategy.sort(data);
  }
}
```

### 方式 3：Mixin（TypeScript）

```typescript
// Mixin 函数
function Timestamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    createdAt = new Date();
    updatedAt = new Date();
    
    touch() {
      this.updatedAt = new Date();
    }
  };
}

function Activatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    isActive = false;
    
    activate() { this.isActive = true; }
    deactivate() { this.isActive = false; }
  };
}

// 组合使用
class User { name: string; }

const TimestampedActivatableUser = Timestamped(Activatable(User));
const user = new TimestampedActivatableUser();
user.activate();
user.touch();
```

### 方式 4：函数组合

```typescript
// 纯函数组合
const pipe = <T>(...fns: ((arg: T) => T)[]) => 
  (value: T) => fns.reduce((acc, fn) => fn(acc), value);

const addTax = (price: number) => price * 1.1;
const addShipping = (price: number) => price + 5;
const roundPrice = (price: number) => Math.round(price * 100) / 100;

const calculateTotal = pipe(addTax, addShipping, roundPrice);
console.log(calculateTotal(100)); // 115
```

## 何时使用继承

继承不是完全禁止，在某些场景仍然适用：

### 1. 真正的 "is-a" 关系

```typescript
// ✅ 合理的继承
class Animal { }
class Dog extends Animal { } // 狗确实是动物
```

### 2. 框架要求

```typescript
// ✅ React Class Component
class MyComponent extends React.Component { }

// ✅ Error 类型
class CustomError extends Error { }
```

### 3. 代码复用 + 紧密关系

```typescript
// ✅ 共享核心行为的基类
abstract class BaseRepository<T> {
  abstract find(id: string): T | null;
  abstract save(entity: T): void;
  
  // 共享的工具方法
  protected generateId(): string {
    return uuid();
  }
}
```

## 决策指南

```
需要多态吗？
├── 是 → 使用接口
└── 否 → 继续

是否是真正的 "is-a" 关系？
├── 是 → 可以考虑继承
└── 否 → 使用组合

行为需要运行时切换吗？
├── 是 → 使用组合（策略模式）
└── 否 → 继续

是否需要复用代码？
├── 是 → 优先使用组合，其次考虑继承
└── 否 → 可能不需要任何机制
```

## 总结

**继承的问题**：
- 脆弱的基类
- 紧耦合
- 单继承限制
- 类爆炸

**组合的优势**：
- 灵活组合能力
- 运行时可替换
- 易于测试
- 松耦合

**实现方式**：
- 接口 + 依赖注入
- 策略模式
- Mixin
- 函数组合

**何时用继承**：
- 真正的 is-a 关系
- 框架要求
- 紧密相关的代码复用

**记住**：组合是默认选择，继承是特殊情况。
