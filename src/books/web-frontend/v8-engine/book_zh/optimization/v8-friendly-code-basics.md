# V8友好代码：基础优化原则

经过前面章节的学习，我们深入了解了V8的内联缓存、隐藏类、TurboFan优化等核心机制。现在是时候将这些知识转化为实际的编码技巧了。

本章将聚焦**基础优化原则**：对象形状一致性、属性访问优化、数组优化。这些是编写高性能JavaScript代码的基石。

## 原则一：对象形状一致性

**为什么重要？**

回顾之前学到的知识：
- V8使用**隐藏类（Hidden Class）**跟踪对象结构
- **内联缓存（IC）**依赖对象形状的稳定性
- 形状不一致会导致IC从**单态→多态→超态**，性能逐级下降

### 问题：形状不一致

让我们看一个真实场景：

```javascript
// 用户注册函数
function registerUser(name, email, phone) {
  const user = { name };
  
  if (email) {
    user.email = email;  // 有些对象有email
  }
  
  if (phone) {
    user.phone = phone;  // 有些对象有phone
  }
  
  return user;
}

// 创建用户
const users = [
  registerUser('Alice', 'alice@example.com', '123456'),  // 形状1：{name, email, phone}
  registerUser('Bob', 'bob@example.com'),                 // 形状2：{name, email}
  registerUser('Charlie')                                 // 形状3：{name}
];

// 访问用户名
function getUserNames(users) {
  const names = [];
  for (const user of users) {
    names.push(user.name);  // IC变成多态！
  }
  return names;
}
```

**问题分析**：

```
第1次调用：user1 → 形状1 → IC记录：形状1的name偏移量
第2次调用：user2 → 形状2 → IC添加：形状2的name偏移量（多态）
第3次调用：user3 → 形状3 → IC添加：形状3的name偏移量（多态）

结果：
- IC包含3个不同的形状记录
- 每次访问user.name都要检查对象形状
- 无法内联，无法优化
```

### 解决方案1：始终初始化所有属性

```javascript
// 改进：确保所有对象有相同的属性集合
function registerUser(name, email = null, phone = null) {
  return {
    name,
    email,   // 即使没提供，也设为null
    phone    // 即使没提供，也设为null
  };
}

const users = [
  registerUser('Alice', 'alice@example.com', '123456'),
  registerUser('Bob', 'bob@example.com'),
  registerUser('Charlie')
];

// 现在所有user对象都是：{name, email, phone}
// IC变成单态，性能提升！
```

**效果**：

```
所有user对象 → 同一个隐藏类
访问user.name → IC单态 → TurboFan内联 → 直接内存访问

性能提升：2-3倍（在属性访问密集的场景中）
```

### 解决方案2：使用类

类天然保证形状一致：

```javascript
class User {
  constructor(name, email = null, phone = null) {
    // 总是以相同顺序初始化所有属性
    this.name = name;
    this.email = email;
    this.phone = phone;
  }
  
  hasContact() {
    return this.email !== null || this.phone !== null;
  }
}

const users = [
  new User('Alice', 'alice@example.com', '123456'),
  new User('Bob', 'bob@example.com'),
  new User('Charlie')
];

// 所有User实例共享同一个隐藏类
```

**为什么类更好？**

- 构造函数确保属性初始化顺序一致
- 方法存储在原型上，不影响实例形状
- V8对类有特殊优化路径

### 解决方案3：工厂函数

工厂函数可以提供更灵活的对象创建，同时保证形状一致：

```javascript
function createUser(data) {
  // 定义完整的属性结构
  return {
    name: data.name ?? '',
    email: data.email ?? null,
    phone: data.phone ?? null,
    role: data.role ?? 'user',
    createdAt: Date.now()  // 自动添加时间戳
  };
}

const users = [
  createUser({ name: 'Alice', email: 'alice@example.com' }),
  createUser({ name: 'Bob', role: 'admin' }),
  createUser({ name: 'Charlie' })
];

// 所有对象形状一致：{name, email, phone, role, createdAt}
```

### 性能对比：形状一致 vs 不一致

让我们用实验验证性能差异：

```javascript
// 实验1：不一致形状
const inconsistentUsers = [];
for (let i = 0; i < 10000; i++) {
  const user = { name: `user${i}` };
  if (i % 2 === 0) user.email = 'test@example.com';
  if (i % 3 === 0) user.phone = '123456';
  inconsistentUsers.push(user);
}

// 实验2：一致形状
const consistentUsers = [];
for (let i = 0; i < 10000; i++) {
  consistentUsers.push({
    name: `user${i}`,
    email: i % 2 === 0 ? 'test@example.com' : null,
    phone: i % 3 === 0 ? '123456' : null
  });
}

// 测试：访问name属性
function sumNameLengths(users) {
  let sum = 0;
  for (const user of users) {
    sum += user.name.length;
  }
  return sum;
}

// 运行测试（Node.js）
const iterations = 1000;

console.time('不一致形状');
for (let i = 0; i < iterations; i++) {
  sumNameLengths(inconsistentUsers);
}
console.timeEnd('不一致形状');

console.time('一致形状');
for (let i = 0; i < iterations; i++) {
  sumNameLengths(consistentUsers);
}
console.timeEnd('一致形状');

// 典型结果：
// 不一致形状: 120ms
// 一致形状: 45ms
// 性能提升：2.7倍
```

## 原则二：属性初始化顺序

**关键规则**：以相同顺序初始化属性。

### 问题：顺序不一致

```javascript
// 对象1
const point1 = {};
point1.x = 1;
point1.y = 2;

// 对象2
const point2 = {};
point2.y = 2;  // 先y
point2.x = 1;  // 后x

// point1和point2有不同的隐藏类！
```

**为什么？**

隐藏类转换依赖于属性添加顺序：

```
point1的转换链：
{} 
  → 添加x → {x} 
  → 添加y → {x, y}

point2的转换链：
{} 
  → 添加y → {y} 
  → 添加x → {y, x}

最终形状不同：
point1: 内存布局 [x的值, y的值]
point2: 内存布局 [y的值, x的值]
```

### 解决方案：固定顺序

**方案1：对象字面量**

```javascript
const point1 = { x: 1, y: 2 };
const point2 = { x: 3, y: 4 };

// 相同的形状
```

**方案2：构造函数**

```javascript
class Point {
  constructor(x, y) {
    this.x = x;  // 总是先x
    this.y = y;  // 再y
  }
}

const points = [
  new Point(1, 2),
  new Point(3, 4),
  new Point(5, 6)
];

// 所有实例共享同一个隐藏类
```

**方案3：工厂函数**

```javascript
function createPoint(data) {
  // 按固定顺序返回属性
  return {
    x: data.x,
    y: data.y
  };
}

const points = [
  createPoint({ y: 2, x: 1 }),  // 输入顺序不重要
  createPoint({ x: 3, y: 4 })
];

// 输出顺序一致，形状相同
```

## 原则三：避免动态属性

**问题**：运行时添加或删除属性。

```javascript
// ❌ 不好
const config = {};

function setConfig(key, value) {
  config[key] = value;  // 动态添加
}

setConfig('timeout', 3000);
setConfig('retries', 3);
setConfig('url', 'https://api.example.com');

// 每次添加属性都改变形状
// IC无法优化对config的访问
```

**解决方案**：

```javascript
// ✅ 好
const config = {
  timeout: null,
  retries: null,
  url: null
};

function setConfig(key, value) {
  if (key in config) {
    config[key] = value;  // 只修改值，不改变形状
  } else {
    throw new Error(`Unknown config key: ${key}`);
  }
}

setConfig('timeout', 3000);
setConfig('retries', 3);
setConfig('url', 'https://api.example.com');

// 形状始终不变，性能稳定
```

**更好的方案**：使用Map

```javascript
// ✅ 更好：专门存储动态键值
const config = new Map();

config.set('timeout', 3000);
config.set('retries', 3);
config.set('url', 'https://api.example.com');

// Map专门为动态键值优化
// 不影响对象形状
```

## 原则四：类型稳定性

**关键规则**：保持变量和参数的类型稳定。

### 问题：混合类型

```javascript
function add(a, b) {
  return a + b;
}

// 混合类型调用
add(1, 2);              // Smi + Smi
add(1.5, 2.5);          // HeapNumber + HeapNumber
add('hello', 'world');  // String + String
```

**问题分析**：

```
第1次调用：IC记录 Smi加法
第2次调用：IC添加 HeapNumber加法（多态）
第3次调用：IC添加 String拼接（多态）

结果：
- IC变成多态或超态
- TurboFan无法生成优化的机器码
- 每次调用都要做类型检查
```

### 解决方案：分离函数

```javascript
// ✅ 专门的数字加法
function addNumbers(a, b) {
  return a + b;
}

// ✅ 专门的字符串拼接
function concatStrings(a, b) {
  return a + b;
}

// 使用
const numResult = addNumbers(1, 2);      // 单态，快
const strResult = concatStrings('a', 'b'); // 单态，快
```

**效果**：

- 每个函数只处理一种类型
- IC保持单态
- TurboFan可以内联和优化

### 类型强制转换

如果必须接受混合类型，提前转换：

```javascript
function addNumbers(a, b) {
  // 确保是数字
  a = Number(a);
  b = Number(b);
  
  // 后续代码只处理数字
  return a + b;
}

addNumbers(1, 2);       // 数字
addNumbers('3', '4');   // 字符串 → 转为数字
```

**权衡**：

- ✅ 后续代码类型稳定
- ⚠️ 增加了类型转换开销
- ⚠️ 适合转换后有大量计算的场景

## 原则五：数组Elements Kind一致性

V8将数组分为不同的Elements Kind，混合类型会导致转换。

### 数组类型系统

```javascript
// PACKED_SMI_ELEMENTS：紧密的小整数数组
const smiArray = [1, 2, 3, 4, 5];

// PACKED_DOUBLE_ELEMENTS：紧密的浮点数数组
const doubleArray = [1.5, 2.5, 3.5];

// PACKED_ELEMENTS：紧密的对象数组
const objArray = [{ a: 1 }, { b: 2 }];

// HOLEY_SMI_ELEMENTS：有空洞的小整数数组
const holeyArray = [1, 2, , 4, 5];  // 注意第3个元素是空洞
```

### 问题：类型降级

```javascript
// 开始是PACKED_SMI_ELEMENTS
const arr = [1, 2, 3, 4, 5];

// 添加浮点数 → 降级为PACKED_DOUBLE_ELEMENTS
arr.push(1.5);

// 添加字符串 → 降级为PACKED_ELEMENTS
arr.push('hello');

// 删除元素 → 降级为HOLEY_ELEMENTS
delete arr[0];

// 最终：HOLEY_ELEMENTS（最慢的类型）
```

**性能影响**：

```
访问arr[i]的成本：
PACKED_SMI_ELEMENTS    → 1x （最快）
PACKED_DOUBLE_ELEMENTS → 1.2x
PACKED_ELEMENTS        → 1.5x
HOLEY_ELEMENTS         → 3x （最慢，需要检查空洞）
```

### 解决方案：保持数组纯净

**规则1：不混合类型**

```javascript
// ❌ 不好
const mixed = [1, 'two', 3, 'four'];

// ✅ 好
const numbers = [1, 2, 3, 4];
const strings = ['one', 'two', 'three', 'four'];
```

**规则2：避免空洞**

```javascript
// ❌ 不好
const arr = [1, 2, 3];
delete arr[1];  // 创建空洞

// ✅ 好
const arr = [1, 2, 3];
arr.splice(1, 1);  // 删除并移动元素，保持紧密
```

**规则3：预分配空间**

```javascript
// ❌ 不好
const arr = [];
arr[1000] = 1;  // 创建大量空洞

// ✅ 好
const arr = new Array(1001);
arr.fill(0);  // 填充，避免空洞
arr[1000] = 1;
```

**规则4：初始化时确定类型**

```javascript
// ❌ 不好
const arr = [];  // 类型未知
arr.push(1);     // → PACKED_SMI_ELEMENTS
arr.push(1.5);   // → PACKED_DOUBLE_ELEMENTS

// ✅ 好
const arr = [1.0];  // 明确是浮点数组
arr.push(2.0);
arr.push(3.0);
// 保持PACKED_DOUBLE_ELEMENTS
```

## 实战：优化数据处理函数

让我们应用这些原则，优化一个真实的数据处理场景：

```javascript
// 场景：处理用户数据列表

// ❌ 原始版本
function processUsers(data) {
  const users = [];
  
  for (const item of data) {
    const user = {};
    user.id = item.id;
    
    if (item.name) user.name = item.name;
    if (item.email) user.email = item.email;
    
    users.push(user);
  }
  
  return users;
}

// 问题：
// 1. 对象形状不一致
// 2. 数组可能混合类型
// 3. 动态属性添加

// ✅ 优化版本
function processUsers(data) {
  const users = new Array(data.length);  // 预分配
  
  for (let i = 0; i < data.length; i++) {
    const item = data[i];
    
    // 确保形状一致
    users[i] = {
      id: item.id,
      name: item.name ?? '',
      email: item.email ?? ''
    };
  }
  
  return users;
}

// 优化效果：
// 1. 所有user对象形状一致
// 2. 数组预分配，无空洞
// 3. 类型稳定（都是对象）
```

## 本章小结

1. **对象形状一致性**：始终初始化所有属性，使用类或工厂函数

2. **属性初始化顺序**：以固定顺序添加属性，使用对象字面量或构造函数

3. **避免动态属性**：不在运行时添加删除属性，动态键值用Map

4. **类型稳定性**：分离不同类型的函数，避免混合类型调用

5. **数组Elements Kind**：不混合类型，避免空洞，预分配空间

这些原则是编写高性能JavaScript代码的基础。在下一章中，我们将探讨更高级的优化技巧：函数优化、作用域管理、内存优化等。
