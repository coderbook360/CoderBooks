# 对象的内存结构：属性存储与快慢属性

在前面章节中，我们了解了基本类型的存储方式。现在让我们深入 JavaScript 中最重要的复合类型：**对象**（Object）。

对象是 JavaScript 的核心，几乎所有复杂数据都以对象形式存在。但你是否想过：

```javascript
let obj = { x: 1, y: 2 };
obj.z = 3;
delete obj.y;
obj['a' + 'b'] = 4;
```

V8 如何在内存中存储这些属性？为什么有时属性访问很快，有时却很慢？

答案在于 V8 的**快慢属性**（Fast/Slow Properties）机制和**隐藏类**（Hidden Class）系统。本章我们先聚焦对象的内存结构。

## 对象的基本内存布局

### JSObject 的结构

V8 中的 JavaScript 对象是 **JSObject** 类的实例。一个 JSObject 在内存中的基本布局：

```
JSObject 内存布局：

┌─────────────────────┐  ← 对象起始地址
│   Map Pointer       │  指向 Map（隐藏类）（8 字节）
├─────────────────────┤
│   Properties        │  指向属性存储（8 字节）
├─────────────────────┤
│   Elements          │  指向元素存储（数组索引）（8 字节）
├─────────────────────┤
│   In-object Props   │  内联属性（可变大小）
│   ...               │
└─────────────────────┘
```

**核心字段**：

1. **Map Pointer**：指向描述对象结构的 Map 对象（下一章详细讲解）
2. **Properties**：指向命名属性的存储（慢属性或空）
3. **Elements**：指向数组索引属性的存储
4. **In-object Properties**：直接存储在对象内的属性（快属性）

## 快属性（Fast Properties）

### 什么是快属性？

**快属性**是指直接存储在对象内存布局中的属性，访问时只需一次内存读取。

```javascript
let obj = { x: 1, y: 2, z: 3 };
// x, y, z 是快属性
```

**内存布局**：

```
快属性对象：

┌─────────────────────┐
│   Map Pointer       │
├─────────────────────┤
│   Properties        │  NULL（未使用）
├─────────────────────┤
│   Elements          │  空数组
├─────────────────────┤
│   In-object: x = 1  │  直接存储属性值
├─────────────────────┤
│   In-object: y = 2  │
├─────────────────────┤
│   In-object: z = 3  │
└─────────────────────┘
```

### 快属性的优势

**1. 访问速度快**

属性值直接内联在对象中，访问只需一次指针偏移：

```cpp
// V8 内部（简化）
Value GetProperty(JSObject* obj, String* key) {
  int offset = obj->map->GetOffset(key);
  return obj->GetFieldAt(offset);  // 直接读取
}
```

**2. 内存紧凑**

属性值紧密排列，缓存友好。

### 快属性的限制

**1. 数量限制**

对象内联属性有数量上限（通常 10-20 个，取决于对象类型）。超出后会转为慢属性。

```javascript
let obj = {};
for (let i = 0; i < 100; i++) {
  obj['prop' + i] = i;  // 超过阈值后转为慢属性
}
```

**2. 结构固定**

快属性依赖隐藏类（Map），对象结构变化可能导致性能下降。

## 慢属性（Slow Properties）

### 什么是慢属性？

当对象属性过多或结构不稳定时，V8 会将属性存储切换为**字典模式**（Dictionary Mode），也称**慢属性**。

### 字典模式的实现

慢属性使用**哈希表**存储属性：

```
慢属性对象：

┌─────────────────────┐
│   Map Pointer       │  指向字典模式的 Map
├─────────────────────┤
│   Properties        │  指向 NameDictionary（哈希表）
├─────────────────────┤
│   Elements          │
└─────────────────────┘

NameDictionary（哈希表）：

┌──────┬────────┬───────┐
│ Key  │ Value  │ Attr  │
├──────┼────────┼───────┤
│ "x"  │   1    │  ...  │
│ "y"  │   2    │  ...  │
│ ...  │  ...   │  ...  │
└──────┴────────┴───────┘
```

**字段说明**：

- **Key**：属性名（字符串）
- **Value**：属性值
- **Attr**：属性特性（可写、可枚举、可配置）

### 慢属性的特征

**优势**：
- 支持任意数量的属性
- 支持属性的动态添加和删除
- 支持属性特性（writable, enumerable, configurable）

**劣势**：
- 访问速度慢（哈希查找）
- 内存占用大（哈希表开销）
- 不利于 JIT 优化

### 快属性 → 慢属性的转换

V8 在以下情况会将对象转为慢属性：

**1. 属性过多**

```javascript
let obj = {};
for (let i = 0; i < 1000; i++) {
  obj['key' + i] = i;  // 触发转换
}
```

**2. 删除属性**

```javascript
let obj = { a: 1, b: 2, c: 3 };
delete obj.b;  // 可能触发转换（取决于实现）
```

**3. 添加非标准属性特性**

```javascript
let obj = { a: 1 };
Object.defineProperty(obj, 'b', {
  value: 2,
  writable: false,  // 非标准特性
  enumerable: false
});
// 可能转为慢属性
```

**4. 添加数组索引属性（到普通对象）**

```javascript
let obj = { name: "Alice" };
obj[0] = "first";  // 可能影响属性模式
```

## Elements：数组索引属性

### Elements 的特殊处理

数组索引（如 `obj[0]`、`obj[1]`）单独存储在 **Elements** 中，不占用命名属性空间。

```javascript
let obj = { name: "Alice" };
obj[0] = "first";
obj[1] = "second";
```

**内存布局**：

```
┌─────────────────────┐
│   Map Pointer       │
├─────────────────────┤
│   Properties        │
├─────────────────────┤
│   Elements          │  指向 FixedArray
├─────────────────────┤
│   In-object: name   │  "Alice"
└─────────────────────┘

Elements (FixedArray)：

┌────────┬────────┬────────┐
│ Length │   [0]  │   [1]  │
├────────┼────────┼────────┤
│   2    │"first" │"second"│
└────────┴────────┴────────┘
```

### Elements Kind

V8 对数组元素进行了高度优化，根据元素类型使用不同的存储方式（**Elements Kind**）：

- `PACKED_SMI_ELEMENTS`：只包含 Smi 的连续数组
- `PACKED_DOUBLE_ELEMENTS`：只包含数字的连续数组
- `PACKED_ELEMENTS`：包含任意值的连续数组
- `HOLEY_SMI_ELEMENTS`：有空洞的 Smi 数组
- `HOLEY_DOUBLE_ELEMENTS`：有空洞的数字数组
- `HOLEY_ELEMENTS`：有空洞的通用数组
- `DICTIONARY_ELEMENTS`：字典模式数组（稀疏数组）

```javascript
let arr1 = [1, 2, 3];          // PACKED_SMI_ELEMENTS
let arr2 = [1.1, 2.2, 3.3];    // PACKED_DOUBLE_ELEMENTS
let arr3 = [1, "a", {}];       // PACKED_ELEMENTS
let arr4 = [1, , 3];           // HOLEY_SMI_ELEMENTS（有空洞）
let arr5 = [];
arr5[1000] = 1;                // DICTIONARY_ELEMENTS（稀疏）
```

Elements Kind 的转换是**单向**的，只能从优化向通用转换，不能反向：

```
PACKED_SMI_ELEMENTS → PACKED_DOUBLE_ELEMENTS → PACKED_ELEMENTS
       ↓                        ↓                      ↓
HOLEY_SMI_ELEMENTS  → HOLEY_DOUBLE_ELEMENTS → HOLEY_ELEMENTS
       ↓                        ↓                      ↓
              DICTIONARY_ELEMENTS
```

一旦转换为更通用的类型，就无法回退。

## 属性访问的性能

### 快属性访问

```javascript
let obj = { x: 1, y: 2 };
let value = obj.x;  // 快速：直接偏移读取
```

**访问步骤**：
1. 读取对象的 Map 指针
2. 从 Map 查找属性 `x` 的偏移量
3. 直接从对象内存读取值

**时间复杂度**：O(1)，通常 1-2 个内存访问

### 慢属性访问

```javascript
// 假设 obj 已转为慢属性
let value = obj.x;  // 慢：哈希表查找
```

**访问步骤**：
1. 读取对象的 Properties 指针
2. 在哈希表中查找键 `"x"`
3. 返回对应的值

**时间复杂度**：O(1) 平均，但常数因子大

### 性能对比

```javascript
// 测试快属性 vs 慢属性
function testFast() {
  let obj = { a: 1, b: 2, c: 3 };
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += obj.a + obj.b + obj.c;
  }
  return sum;
}

function testSlow() {
  let obj = {};
  for (let i = 0; i < 100; i++) {
    obj['key' + i] = i;  // 转为慢属性
  }
  let sum = 0;
  for (let i = 0; i < 1000000; i++) {
    sum += obj.key0 + obj.key1 + obj.key2;
  }
  return sum;
}

console.time("Fast");
testFast();
console.timeEnd("Fast");

console.time("Slow");
testSlow();
console.timeEnd("Slow");
```

快属性通常比慢属性快 **2-10 倍**。

## 性能优化建议

### 1. 保持对象形状稳定

```javascript
// ✅ 好：相同形状的对象
function createPerson(name, age) {
  return { name, age };
}
let p1 = createPerson("Alice", 30);
let p2 = createPerson("Bob", 25);

// ❌ 坏：不同形状
let p3 = { name: "Charlie" };  // 缺少 age
let p4 = { name: "David", age: 28, city: "NYC" };  // 多了 city
```

### 2. 避免删除属性

```javascript
// ❌ 坏：删除属性
let obj = { a: 1, b: 2, c: 3 };
delete obj.b;

// ✅ 好：设置为 null 或 undefined
let obj = { a: 1, b: 2, c: 3 };
obj.b = null;
```

### 3. 限制属性数量

如果对象属性很多，考虑使用 **Map**：

```javascript
// ❌ 坏：大量属性的对象
let cache = {};
for (let i = 0; i < 10000; i++) {
  cache['key' + i] = i;
}

// ✅ 好：使用 Map
let cache = new Map();
for (let i = 0; i < 10000; i++) {
  cache.set('key' + i, i);
}
```

### 4. 使用构造函数或类

```javascript
// ✅ 好：使用构造函数
function Point(x, y) {
  this.x = x;
  this.y = y;
}
let p1 = new Point(1, 2);
let p2 = new Point(3, 4);
// p1 和 p2 共享隐藏类，快属性访问
```

### 5. 避免稀疏数组

```javascript
// ❌ 坏：稀疏数组
let arr = [];
arr[1000] = 1;  // 转为 DICTIONARY_ELEMENTS

// ✅ 好：连续数组
let arr = new Array(1001).fill(0);
arr[1000] = 1;  // 保持 PACKED_SMI_ELEMENTS
```

## 本章小结

本章我们深入理解了 V8 如何存储对象属性。核心要点：

1. **JSObject 结构**：Map、Properties、Elements、In-object Properties
2. **快属性**：内联存储，访问快速，适合属性少且结构稳定的对象
3. **慢属性**：哈希表存储，支持任意数量属性，但访问较慢
4. **Elements**：数组索引单独存储，有多种优化的 Elements Kind
5. **性能优化**：保持对象形状稳定、避免删除属性、限制属性数量

理解对象的内存结构是优化 JavaScript 性能的关键。在下一章中，我们将深入**隐藏类**（Hidden Class）系统，探讨 V8 如何通过 Map 对象优化属性访问。

---

**思考题**：

1. 为什么 V8 要区分快属性和慢属性，而不是统一使用哈希表？
2. 删除属性为什么可能导致性能下降？
3. 如果你要设计一个对象存储系统，你会如何权衡内存和速度？
