# 内联缓存与隐藏类

内联缓存（Inline Cache，IC）和隐藏类（Hidden Class）是V8优化属性访问的两个核心机制。理解它们对于编写高性能JavaScript代码至关重要。

## 问题：JavaScript的动态性

JavaScript对象是完全动态的：

```javascript
const obj = {};
obj.x = 1;        // 动态添加属性
obj.y = 2;
delete obj.x;     // 动态删除属性
obj[computedKey] = 3;  // 动态键名
```

这种灵活性给性能优化带来挑战：

```
静态语言（如C++）：
  编译时知道属性偏移量
  obj.x → 直接访问 offset 0

动态语言（如JavaScript）：
  运行时才知道对象结构
  obj.x → 查找属性名 → 找到位置 → 访问
  每次都要查找吗？太慢了！
```

## 隐藏类（Hidden Class）

### 什么是隐藏类

隐藏类（也称为Map或Shape）描述对象的结构：

```javascript
// 创建对象
const obj = { x: 1, y: 2 };

// V8内部创建隐藏类
HiddenClass {
  properties: [
    { name: 'x', offset: 0 },
    { name: 'y', offset: 8 }
  ]
}
```

### 隐藏类的创建

```javascript
// 每一步都可能创建新的隐藏类

const obj = {};      // 创建空对象，使用HiddenClass C0

obj.x = 1;           // 添加x属性
                     // 创建新的HiddenClass C1
                     // C0 --[添加x]--> C1

obj.y = 2;           // 添加y属性
                     // 创建新的HiddenClass C2
                     // C1 --[添加y]--> C2
```

### 隐藏类转换链

```
┌──────────────────────────────────────────────────────────────┐
│                     隐藏类转换链                              │
│                                                              │
│  ┌─────────┐    添加x    ┌─────────┐    添加y    ┌─────────┐│
│  │   C0    │ ─────────→ │   C1    │ ─────────→ │   C2    ││
│  │  空对象  │            │ {x: _}  │            │{x:_, y:_}││
│  └─────────┘            └─────────┘            └─────────┘│
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### 共享隐藏类

相同方式创建的对象共享隐藏类：

```javascript
// 这两个对象共享相同的隐藏类
const obj1 = { x: 1, y: 2 };
const obj2 = { x: 3, y: 4 };

// 它们的属性访问使用相同的优化路径
```

### 隐藏类分裂

不同的属性添加顺序导致不同的隐藏类：

```javascript
// 对象1：先x后y
const obj1 = {};
obj1.x = 1;
obj1.y = 2;
// 转换链：C0 → C1(x) → C2(x,y)

// 对象2：先y后x
const obj2 = {};
obj2.y = 1;
obj2.x = 2;
// 转换链：C0 → C3(y) → C4(y,x)

// obj1和obj2有不同的隐藏类！
// 导致额外的内存使用和更慢的IC
```

## 内联缓存（Inline Cache）

### 什么是内联缓存

内联缓存是一种优化技术，缓存属性访问的查找结果：

```
首次访问 obj.x：
  1. 获取obj的隐藏类
  2. 在隐藏类中查找x
  3. 找到x在offset 0
  4. 缓存：隐藏类 + offset
  5. 返回值

后续访问 obj.x：
  1. 检查obj的隐藏类是否与缓存匹配
  2. 匹配 → 直接使用缓存的offset访问
  3. 不匹配 → 重新查找
```

### IC状态

```
┌──────────────────────────────────────────────────────────────┐
│                      IC状态转换                              │
│                                                              │
│  ┌────────────┐                                             │
│  │ 未初始化   │  还没有类型信息                              │
│  └─────┬──────┘                                             │
│        │ 首次访问                                            │
│        ▼                                                     │
│  ┌────────────┐                                             │
│  │ 单态(Mono) │  只见过一种隐藏类                            │
│  │ ✅ 最快    │                                             │
│  └─────┬──────┘                                             │
│        │ 见到第2种隐藏类                                     │
│        ▼                                                     │
│  ┌────────────┐                                             │
│  │ 多态(Poly) │  见过2-4种隐藏类                            │
│  │ ⚠️ 较快    │                                             │
│  └─────┬──────┘                                             │
│        │ 见到第5种隐藏类                                     │
│        ▼                                                     │
│  ┌────────────┐                                             │
│  │ 巨态(Mega) │  见过太多隐藏类                              │
│  │ ❌ 较慢    │  无法有效缓存                                │
│  └────────────┘                                             │
│                                                              │
└──────────────────────────────────────────────────────────────┘
```

### IC类型

```javascript
// 属性加载IC
obj.x         // LoadIC

// 属性存储IC
obj.x = 1     // StoreIC

// 键控加载IC
obj[key]      // KeyedLoadIC

// 键控存储IC
obj[key] = 1  // KeyedStoreIC

// 调用IC
obj.method()  // CallIC
```

## 优化建议

### 1. 保持对象结构一致

```javascript
// 好：使用构造函数确保结构一致
class Point {
  constructor(x, y) {
    this.x = x;
    this.y = y;
  }
}

const p1 = new Point(1, 2);
const p2 = new Point(3, 4);
// p1和p2共享隐藏类

// 差：动态创建导致结构不一致
function createPoint(hasZ) {
  const p = { x: 0, y: 0 };
  if (hasZ) p.z = 0;  // 可能有或没有z
  return p;
}
// 返回的对象有不同的隐藏类
```

### 2. 按相同顺序初始化属性

```javascript
// 好：始终相同的初始化顺序
function createUser(name, age, email) {
  return {
    name,
    age,
    email
  };
}

// 差：条件性初始化
function createUser(data) {
  const user = {};
  if (data.name) user.name = data.name;
  if (data.age) user.age = data.age;
  if (data.email) user.email = data.email;
  return user;
  // 根据输入，产生不同的隐藏类
}
```

### 3. 避免删除属性

```javascript
// 差：使用delete
const obj = { x: 1, y: 2 };
delete obj.x;  // 改变隐藏类，可能导致去优化

// 好：设为undefined或null
const obj = { x: 1, y: 2 };
obj.x = undefined;  // 保持隐藏类不变
```

### 4. 在构造函数中初始化所有属性

```javascript
// 好：所有属性在构造函数中初始化
class User {
  constructor(name, age) {
    this.name = name;
    this.age = age;
    this.email = null;  // 即使没值也要初始化
    this.phone = null;
  }
}

// 差：稍后添加属性
class User {
  constructor(name) {
    this.name = name;
  }
  
  setAge(age) {
    this.age = age;  // 改变隐藏类
  }
}
```

### 5. 使用相同类型的值

```javascript
// 好：类型一致
const points = [
  { x: 1, y: 2 },
  { x: 3, y: 4 },
  { x: 5, y: 6 }
];

// 差：类型不一致
const points = [
  { x: 1, y: 2 },
  { x: "3", y: "4" },  // 字符串而非数字
  { x: 5, y: 6 }
];
```

## 诊断工具

### 使用V8选项

```bash
# 追踪IC状态变化
node --trace-ic your-script.js

# 追踪隐藏类
node --trace-maps your-script.js

# 追踪去优化
node --trace-deopt your-script.js
```

### 分析IC miss

```javascript
// 使用--trace-ic的输出分析
// 查找模式：
// - 大量的IC miss表示隐藏类不稳定
// - 从Monomorphic到Polymorphic的转换
// - Megamorphic状态表示严重问题
```

## 实际案例

### 案例1：数组中的对象

```javascript
// 差：不一致的对象结构
const items = [];
items.push({ type: 'A', value: 1 });
items.push({ type: 'B', data: 2 });  // 不同的属性名
items.push({ type: 'C', value: 3, extra: 4 });  // 额外属性

// 好：一致的对象结构
const items = [];
items.push({ type: 'A', value: 1, data: null, extra: null });
items.push({ type: 'B', value: null, data: 2, extra: null });
items.push({ type: 'C', value: 3, data: null, extra: 4 });
```

### 案例2：条件属性

```javascript
// 差：条件性添加属性
function createResponse(data, hasError) {
  const response = { data };
  if (hasError) {
    response.error = 'Something went wrong';
  }
  return response;
}

// 好：始终包含所有属性
function createResponse(data, hasError) {
  return {
    data,
    error: hasError ? 'Something went wrong' : null
  };
}
```

### 案例3：类继承

```javascript
// 好：正确使用继承
class Animal {
  constructor(name) {
    this.name = name;
    this.age = 0;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
}

// 所有Dog实例共享隐藏类
```

## 性能对比

```javascript
// 单态访问 vs 巨态访问的性能差异

// 单态：~1-2ns per access
function monoAccess(obj) {
  return obj.x;  // 总是相同的隐藏类
}

// 巨态：~10-50ns per access
function megaAccess(obj) {
  return obj.x;  // 多种不同的隐藏类
}

// 差异可达10-50倍！
```

## 本章小结

- 隐藏类描述对象的结构，相同结构的对象共享隐藏类
- 内联缓存缓存属性访问的查找结果
- 单态IC最快，巨态IC最慢
- 保持对象结构一致是关键优化点
- 避免删除属性、动态添加属性
- 使用构造函数初始化所有属性
- 使用V8选项诊断IC问题

下一章，我们将深入V8的垃圾回收机制，理解内存是如何被管理的。
