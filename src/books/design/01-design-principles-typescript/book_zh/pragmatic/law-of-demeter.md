# 最小知识原则（迪米特法则）

**最小知识原则（Law of Demeter, LoD）**，也叫**迪米特法则**。

核心思想：一个对象应该对其他对象有**最少的了解**。

通俗地说：**只和直接朋友交流，不要和陌生人说话**。

## 什么是"朋友"

对于一个对象，它的"朋友"包括：
- 自身（`this`）
- 方法的参数
- 方法内创建的对象
- 自己的成员变量
- 全局对象

## 违反原则的例子

### 火车残骸（Train Wreck）

```typescript
// ❌ 违反迪米特法则：链式调用穿透多层
const city = order.getCustomer().getAddress().getCity();

// 问题：
// - order 需要知道 Customer 有 getAddress 方法
// - order 需要知道 Address 有 getCity 方法
// - 任何一层修改都会影响这行代码
```

### 深度访问

```typescript
// ❌ 违反原则：访问嵌套对象的内部
class OrderService {
  calculateShipping(order: Order): number {
    const country = order.customer.address.country;
    const weight = order.items.reduce((sum, item) => 
      sum + item.product.weight * item.quantity, 0
    );
    return this.getRate(country, weight);
  }
}

// 问题：OrderService 需要知道太多内部结构
// - Order 有 customer 属性
// - Customer 有 address 属性
// - Address 有 country 属性
// - 每个 item 有 product.weight
```

## 遵守原则的改进

### 委托方法

```typescript
// ✅ 让对象自己提供信息
class Order {
  private customer: Customer;
  private items: OrderItem[];
  
  // 委托：Order 自己提供 city
  getShippingCity(): string {
    return this.customer.getCity();
  }
  
  // 委托：Order 自己计算总重量
  getTotalWeight(): number {
    return this.items.reduce((sum, item) => 
      sum + item.getWeight(), 0
    );
  }
}

class Customer {
  private address: Address;
  
  getCity(): string {
    return this.address.city;
  }
}

class OrderItem {
  private product: Product;
  private quantity: number;
  
  getWeight(): number {
    return this.product.weight * this.quantity;
  }
}

// 使用时只需要和 Order 交互
class OrderService {
  calculateShipping(order: Order): number {
    const city = order.getShippingCity();
    const weight = order.getTotalWeight();
    return this.getRate(city, weight);
  }
}
```

### 传递所需数据

```typescript
// ✅ 直接传递需要的数据，而非整个对象
// 不要这样
function sendEmail(user: User) {
  const email = user.contact.email; // 需要知道内部结构
  mailer.send(email, 'Hello!');
}

// 要这样
function sendEmail(email: string) {
  mailer.send(email, 'Hello!');
}

// 调用处
sendEmail(user.getEmail());
```

## 实际应用

### 数据传输对象（DTO）

```typescript
// ✅ 使用 DTO 封装需要的数据
interface ShippingInfo {
  city: string;
  country: string;
  weight: number;
}

class Order {
  getShippingInfo(): ShippingInfo {
    return {
      city: this.customer.getCity(),
      country: this.customer.getCountry(),
      weight: this.getTotalWeight()
    };
  }
}

class ShippingService {
  calculate(info: ShippingInfo): number {
    // 只依赖 ShippingInfo，不需要知道 Order 的结构
    return this.getRate(info.country, info.weight);
  }
}
```

### 接口隔离

```typescript
// ✅ 定义窄接口
interface HasEmail {
  email: string;
}

function sendNotification(recipient: HasEmail) {
  mailer.send(recipient.email, 'Notification');
}

// 可以传任何有 email 的对象
sendNotification(user);
sendNotification(customer);
sendNotification({ email: 'test@example.com' });
```

### Facade 模式

```typescript
// ✅ 用 Facade 隐藏复杂子系统
class OrderFacade {
  constructor(
    private orderRepo: OrderRepository,
    private customerRepo: CustomerRepository,
    private inventoryService: InventoryService,
    private paymentService: PaymentService
  ) {}
  
  // 外部只需调用这一个方法
  async placeOrder(orderId: string): Promise<OrderResult> {
    const order = await this.orderRepo.find(orderId);
    const customer = await this.customerRepo.find(order.customerId);
    await this.inventoryService.reserve(order.items);
    await this.paymentService.charge(customer, order.total);
    return this.orderRepo.complete(orderId);
  }
}

// 客户端代码
const result = await orderFacade.placeOrder(orderId);
// 不需要知道内部有多少个服务
```

## 什么时候可以"违反"

### 数据容器

对于纯数据对象（没有行为），链式访问是可接受的：

```typescript
// 数据对象，无行为
interface Config {
  database: {
    host: string;
    port: number;
  };
  cache: {
    ttl: number;
  };
}

// 这种访问是可以的
const host = config.database.host;
```

### 流式 API

设计为链式调用的 API：

```typescript
// 流式 API，设计如此
const result = array
  .filter(x => x > 0)
  .map(x => x * 2)
  .reduce((a, b) => a + b, 0);

// 这是 API 设计，不是违反迪米特法则
```

### Builder 模式

```typescript
const user = new UserBuilder()
  .name('John')
  .email('john@example.com')
  .age(30)
  .build();

// Builder 的链式调用是设计意图
```

## 权衡与代价

### 优点

- 降低耦合
- 易于修改
- 易于测试
- 隐藏实现细节

### 代价

```typescript
// 可能导致大量的委托方法
class Order {
  getCustomerName() { return this.customer.getName(); }
  getCustomerEmail() { return this.customer.getEmail(); }
  getCustomerPhone() { return this.customer.getPhone(); }
  getShippingCity() { return this.customer.getAddress().getCity(); }
  getShippingCountry() { return this.customer.getAddress().getCountry(); }
  // ... 太多委托方法
}
```

### 平衡

- 只暴露**真正需要**的信息
- 使用 DTO 聚合相关数据
- 不要为了遵守原则而过度设计

## 总结

**迪米特法则的核心**：
- 只和直接朋友交流
- 不要链式调用穿透多层
- 让对象自己提供所需信息

**遵守方法**：
- 使用委托方法
- 传递所需数据而非整个对象
- 使用 DTO 封装数据
- 使用 Facade 隐藏复杂性

**例外情况**：
- 纯数据对象
- 流式 API
- Builder 模式

**记住**：目的是降低耦合，不是制造大量委托方法。找到平衡点。
