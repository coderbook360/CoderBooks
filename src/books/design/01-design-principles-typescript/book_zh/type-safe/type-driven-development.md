# 类型驱动开发

**类型驱动开发（Type-Driven Development, TDD）** 是一种以类型为核心的开发方法。

核心思想：**先定义类型，再实现代码**。

## 传统开发 vs 类型驱动

### 传统开发流程

```typescript
// 1. 先写实现
function processOrder(order) {
  // 边写边想需要什么字段
  const total = order.items.reduce((sum, item) => 
    sum + item.price * item.quantity, 0
  );
  return { ...order, total };
}

// 2. 后补类型（或不补）
interface Order {
  items: { price: number; quantity: number }[];
}
```

### 类型驱动流程

```typescript
// 1. 先设计类型（思考数据结构）
interface OrderItem {
  productId: string;
  name: string;
  price: number;
  quantity: number;
}

interface Order {
  id: string;
  customerId: string;
  items: OrderItem[];
  status: 'pending' | 'paid' | 'shipped' | 'delivered';
}

interface ProcessedOrder extends Order {
  subtotal: number;
  tax: number;
  total: number;
}

// 2. 再实现（类型约束代码）
function processOrder(order: Order): ProcessedOrder {
  const subtotal = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity, 
    0
  );
  const tax = subtotal * 0.1;
  return {
    ...order,
    subtotal,
    tax,
    total: subtotal + tax
  };
}
```

## 类型驱动的好处

### 1. 提前发现设计问题

```typescript
// 设计类型时就能发现问题
interface PaymentResult {
  status: 'success' | 'failed';
  // 问题：成功时需要 transactionId，失败时需要 error
  // 设计类型时就能发现这个问题
}

// 改进：使用可辨识联合
type PaymentResult = 
  | { status: 'success'; transactionId: string }
  | { status: 'failed'; error: string };
```

### 2. 类型即文档

```typescript
// 类型清晰地描述了数据结构
interface User {
  id: string;
  email: string;
  name: string;
  createdAt: Date;
  role: 'admin' | 'user' | 'guest';
  preferences: {
    theme: 'light' | 'dark';
    notifications: boolean;
  };
}

// 无需额外文档，类型即说明
```

### 3. 编译器辅助重构

```typescript
// 修改类型，编译器会指出所有需要修改的地方
interface User {
  name: string;
  // 新增字段
  displayName: string;  // 添加后，编译器报错所有未处理的地方
}
```

### 4. 更少的运行时错误

```typescript
// 类型保证了数据完整性
function sendEmail(user: User) {
  // user.email 一定存在，无需检查
  mailer.send(user.email, 'Hello');
}
```

## 类型驱动设计流程

### 步骤 1：领域建模

从业务需求出发，定义核心类型：

```typescript
// 电商领域模型
interface Product {
  id: string;
  name: string;
  price: number;
  stock: number;
}

interface CartItem {
  product: Product;
  quantity: number;
}

interface Cart {
  id: string;
  userId: string;
  items: CartItem[];
}

interface Order {
  id: string;
  userId: string;
  items: OrderItem[];
  status: OrderStatus;
  payment: PaymentInfo;
}

type OrderStatus = 
  | 'pending' 
  | 'paid' 
  | 'processing' 
  | 'shipped' 
  | 'delivered' 
  | 'cancelled';
```

### 步骤 2：定义操作接口

```typescript
interface CartService {
  getCart(userId: string): Promise<Cart>;
  addItem(cartId: string, product: Product, quantity: number): Promise<Cart>;
  removeItem(cartId: string, productId: string): Promise<Cart>;
  checkout(cart: Cart): Promise<Order>;
}

interface OrderService {
  getOrder(orderId: string): Promise<Order>;
  updateStatus(orderId: string, status: OrderStatus): Promise<Order>;
  cancel(orderId: string): Promise<Order>;
}
```

### 步骤 3：考虑边界情况

```typescript
// 使用 Result 类型处理失败情况
type Result<T, E = Error> = 
  | { success: true; data: T }
  | { success: false; error: E };

interface CartService {
  addItem(
    cartId: string, 
    product: Product, 
    quantity: number
  ): Promise<Result<Cart, 'OUT_OF_STOCK' | 'INVALID_QUANTITY'>>;
}
```

### 步骤 4：实现代码

```typescript
class CartServiceImpl implements CartService {
  async addItem(
    cartId: string,
    product: Product,
    quantity: number
  ): Promise<Result<Cart, 'OUT_OF_STOCK' | 'INVALID_QUANTITY'>> {
    if (quantity <= 0) {
      return { success: false, error: 'INVALID_QUANTITY' };
    }
    if (product.stock < quantity) {
      return { success: false, error: 'OUT_OF_STOCK' };
    }
    
    const cart = await this.getCart(cartId);
    // ... 添加商品逻辑
    return { success: true, data: updatedCart };
  }
}
```

## 类型驱动技巧

### 使用 branded types

```typescript
// 防止混淆不同用途的 string
type UserId = string & { readonly brand: unique symbol };
type OrderId = string & { readonly brand: unique symbol };

function createUserId(id: string): UserId {
  return id as UserId;
}

function getOrder(orderId: OrderId): Order { /* ... */ }

const userId = createUserId('user-123');
// getOrder(userId);  // ❌ 类型错误：不能用 UserId 当 OrderId
```

### 使用 const assertions

```typescript
// 类型更精确
const config = {
  api: 'https://api.example.com',
  timeout: 5000
} as const;

// config.api 的类型是 'https://api.example.com'，不是 string
```

### 使用可辨识联合

```typescript
type AsyncState<T> = 
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: Error };

function render<T>(state: AsyncState<T>): string {
  switch (state.status) {
    case 'idle': return 'Ready';
    case 'loading': return 'Loading...';
    case 'success': return `Data: ${state.data}`;
    case 'error': return `Error: ${state.error.message}`;
  }
}
```

## 总结

**类型驱动开发核心**：
- 先设计类型，再写实现
- 类型即文档，类型即约束
- 让编译器帮你发现问题

**开发流程**：
1. 领域建模：定义核心类型
2. 接口设计：定义操作接口
3. 边界处理：考虑错误情况
4. 代码实现：受类型约束的实现

**关键技巧**：
- Branded types 防止类型混淆
- Const assertions 保留字面量类型
- 可辨识联合处理多种状态

**记住**：好的类型设计会让代码自然变得正确。
