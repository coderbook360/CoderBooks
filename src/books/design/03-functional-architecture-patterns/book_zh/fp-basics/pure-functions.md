# 纯函数：可预测的计算基石

> 纯函数是函数式编程的核心——给定相同的输入，永远返回相同的输出，且没有副作用。

## 什么是纯函数？

纯函数必须满足两个条件：

1. **确定性**：相同的输入永远产生相同的输出
2. **无副作用**：不修改外部状态，不依赖外部可变状态

### 纯函数示例

```typescript
// ✅ 纯函数：结果只依赖输入参数
function add(a: number, b: number): number {
  return a + b;
}

// ✅ 纯函数：不修改输入，返回新数组
function double(numbers: number[]): number[] {
  return numbers.map(n => n * 2);
}

// ✅ 纯函数：字符串处理
function formatName(firstName: string, lastName: string): string {
  return `${lastName}, ${firstName}`;
}

// ✅ 纯函数：对象转换
function toUpperCaseKeys<T>(obj: Record<string, T>): Record<string, T> {
  return Object.fromEntries(
    Object.entries(obj).map(([key, value]) => [key.toUpperCase(), value])
  );
}
```

### 非纯函数示例

```typescript
// ❌ 依赖外部变量
let taxRate = 0.1;
function calculateTax(amount: number): number {
  return amount * taxRate;  // 结果依赖外部状态
}

// ❌ 修改外部状态
let total = 0;
function addToTotal(amount: number): void {
  total += amount;  // 副作用：修改外部变量
}

// ❌ 依赖当前时间
function getGreeting(): string {
  const hour = new Date().getHours();  // 每次调用可能返回不同结果
  return hour < 12 ? 'Good morning' : 'Good afternoon';
}

// ❌ 随机数
function getRandomId(): string {
  return Math.random().toString(36).substr(2, 9);  // 不确定性
}

// ❌ 修改输入参数
function sortArray(arr: number[]): number[] {
  return arr.sort();  // 副作用：修改了原数组
}
```

## 为什么纯函数如此重要？

### 1. 可预测性

```typescript
// 纯函数的行为完全可预测
const result1 = add(2, 3);  // 永远是 5
const result2 = add(2, 3);  // 永远是 5

// 非纯函数的行为不可预测
let counter = 0;
function increment() {
  return ++counter;
}
increment();  // 1
increment();  // 2
increment();  // 3
```

### 2. 可测试性

```typescript
// 纯函数极易测试
describe('calculateDiscount', () => {
  it('应该计算10%折扣', () => {
    expect(calculateDiscount(100, 0.1)).toBe(90);
  });
  
  it('应该计算20%折扣', () => {
    expect(calculateDiscount(100, 0.2)).toBe(80);
  });
});

// 非纯函数测试困难
describe('getUserAge', () => {
  it('应该返回正确年龄', () => {
    // 需要 mock Date，否则测试会随时间失败
    jest.useFakeTimers().setSystemTime(new Date('2024-01-01'));
    expect(getUserAge(new Date('2000-01-01'))).toBe(24);
  });
});
```

### 3. 可缓存性（记忆化）

```typescript
// 纯函数可以安全地缓存结果
function memoize<T extends (...args: any[]) => any>(fn: T): T {
  const cache = new Map<string, ReturnType<T>>();
  
  return ((...args: Parameters<T>) => {
    const key = JSON.stringify(args);
    
    if (cache.has(key)) {
      return cache.get(key)!;
    }
    
    const result = fn(...args);
    cache.set(key, result);
    return result;
  }) as T;
}

// 斐波那契数列（纯函数）
const fibonacci = memoize((n: number): number => {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
});

fibonacci(50);  // 使用缓存，瞬间完成
```

### 4. 并发安全

```typescript
// 纯函数可以安全地并行执行
const numbers = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10];

// 这些计算可以并行执行，因为没有共享状态
const squared = numbers.map(n => n * n);
const doubled = numbers.map(n => n * 2);
const filtered = numbers.filter(n => n > 5);
```

### 5. 可组合性

```typescript
// 纯函数可以像乐高积木一样组合
const pipe = <T>(...fns: Array<(arg: T) => T>) => 
  (value: T) => fns.reduce((acc, fn) => fn(acc), value);

const addOne = (x: number) => x + 1;
const double = (x: number) => x * 2;
const square = (x: number) => x * x;

const compute = pipe(addOne, double, square);
console.log(compute(3));  // ((3 + 1) * 2)² = 64
```

## 副作用详解

副作用包括但不限于：

```typescript
// 1. 修改全局变量
let globalState = {};
function updateGlobal() {
  globalState = { updated: true };  // 副作用
}

// 2. 修改输入参数
function addItem(array: string[], item: string) {
  array.push(item);  // 副作用：修改了原数组
}

// 3. DOM 操作
function updateTitle(title: string) {
  document.title = title;  // 副作用
}

// 4. 网络请求
async function fetchUser(id: string) {
  return fetch(`/api/users/${id}`);  // 副作用
}

// 5. 控制台输出
function logMessage(msg: string) {
  console.log(msg);  // 副作用
}

// 6. 文件/存储操作
function saveToStorage(key: string, value: string) {
  localStorage.setItem(key, value);  // 副作用
}

// 7. 抛出异常
function divide(a: number, b: number) {
  if (b === 0) throw new Error('Cannot divide by zero');  // 副作用
  return a / b;
}
```

## 如何编写纯函数

### 技巧 1：避免修改输入

```typescript
// ❌ 修改输入
function addUser(users: User[], newUser: User): User[] {
  users.push(newUser);
  return users;
}

// ✅ 返回新数组
function addUser(users: User[], newUser: User): User[] {
  return [...users, newUser];
}

// ❌ 修改对象
function updateUser(user: User, name: string): User {
  user.name = name;
  return user;
}

// ✅ 返回新对象
function updateUser(user: User, name: string): User {
  return { ...user, name };
}
```

### 技巧 2：依赖注入替代外部依赖

```typescript
// ❌ 依赖外部状态
let config = { taxRate: 0.1 };

function calculateTax(amount: number): number {
  return amount * config.taxRate;
}

// ✅ 通过参数传入依赖
function calculateTax(amount: number, taxRate: number): number {
  return amount * taxRate;
}

// ✅ 或者使用高阶函数
function createTaxCalculator(taxRate: number) {
  return (amount: number): number => amount * taxRate;
}

const calculateTax = createTaxCalculator(0.1);
```

### 技巧 3：将不纯操作推到边界

```typescript
// 不纯的部分（I/O边界）
async function main() {
  // 副作用：读取配置
  const config = await loadConfig();
  
  // 副作用：获取数据
  const users = await fetchUsers();
  
  // 纯函数：业务逻辑
  const activeUsers = filterActiveUsers(users);
  const summary = generateUserSummary(activeUsers);
  const report = formatReport(summary, config);
  
  // 副作用：输出结果
  await saveReport(report);
  console.log('Report generated');
}

// 纯函数：核心业务逻辑
function filterActiveUsers(users: User[]): User[] {
  return users.filter(u => u.isActive);
}

function generateUserSummary(users: User[]): Summary {
  return {
    total: users.length,
    byRole: groupBy(users, 'role'),
    averageAge: average(users.map(u => u.age))
  };
}

function formatReport(summary: Summary, config: Config): Report {
  return {
    title: config.reportTitle,
    generatedAt: config.currentDate,  // 从配置传入，而非使用 new Date()
    content: summary
  };
}
```

### 技巧 4：使用 Either/Result 处理错误

```typescript
// ❌ 抛出异常（副作用）
function divide(a: number, b: number): number {
  if (b === 0) throw new Error('Division by zero');
  return a / b;
}

// ✅ 返回 Result 类型（纯函数）
type Result<T, E> = { ok: true; value: T } | { ok: false; error: E };

function divide(a: number, b: number): Result<number, string> {
  if (b === 0) {
    return { ok: false, error: 'Division by zero' };
  }
  return { ok: true, value: a / b };
}

// 使用
const result = divide(10, 2);
if (result.ok) {
  console.log(result.value);  // 5
} else {
  console.error(result.error);
}
```

## 实战：重构为纯函数

### 重构前

```typescript
// 购物车逻辑（充满副作用）
class ShoppingCart {
  private items: CartItem[] = [];
  
  addItem(product: Product, quantity: number): void {
    const existing = this.items.find(i => i.productId === product.id);
    
    if (existing) {
      existing.quantity += quantity;  // 修改现有对象
    } else {
      this.items.push({              // 修改 items 数组
        productId: product.id,
        name: product.name,
        price: product.price,
        quantity
      });
    }
    
    this.saveToStorage();  // 副作用
    this.updateUI();       // 副作用
  }
}
```

### 重构后

```typescript
// 纯函数：购物车操作
function addItem(
  cart: CartItem[],
  product: Product,
  quantity: number
): CartItem[] {
  const existingIndex = cart.findIndex(i => i.productId === product.id);
  
  if (existingIndex >= 0) {
    // 返回新数组，更新指定项
    return cart.map((item, index) =>
      index === existingIndex
        ? { ...item, quantity: item.quantity + quantity }
        : item
    );
  }
  
  // 返回新数组，添加新项
  return [
    ...cart,
    {
      productId: product.id,
      name: product.name,
      price: product.price,
      quantity
    }
  ];
}

function removeItem(cart: CartItem[], productId: string): CartItem[] {
  return cart.filter(item => item.productId !== productId);
}

function updateQuantity(
  cart: CartItem[],
  productId: string,
  quantity: number
): CartItem[] {
  return cart.map(item =>
    item.productId === productId
      ? { ...item, quantity }
      : item
  );
}

function calculateTotal(cart: CartItem[]): number {
  return cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
}

// 在组件中使用（副作用隔离到边界）
function CartPage() {
  const [cart, setCart] = useState<CartItem[]>([]);
  
  const handleAddItem = (product: Product, quantity: number) => {
    const newCart = addItem(cart, product, quantity);  // 纯函数
    setCart(newCart);                                   // 副作用（但由 React 管理）
    saveToStorage(newCart);                             // 副作用（边界）
  };
  
  const total = calculateTotal(cart);  // 纯函数
  
  return <CartView items={cart} total={total} onAdd={handleAddItem} />;
}
```

## 总结

纯函数是函数式编程的基础：

1. **定义**：相同输入 → 相同输出，无副作用
2. **优点**：可预测、可测试、可缓存、可组合、并发安全
3. **实践**：
   - 不修改输入参数
   - 依赖通过参数传入
   - 将副作用推到边界
   - 使用 Result 类型替代异常
4. **核心思想**：分离纯粹的计算和有副作用的操作

记住：**不是所有函数都必须是纯的，但核心业务逻辑应该尽可能保持纯粹。**
