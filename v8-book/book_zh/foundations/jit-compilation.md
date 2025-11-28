# 即时编译（JIT）：从解释执行到机器码

在上一章中，我们看到 Ignition 解释器如何执行字节码。解释执行虽然启动快，但执行速度比不上直接运行机器码。那么，V8 如何在保证快速启动的同时，又能达到接近原生代码的执行速度？

答案是 **即时编译**（Just-In-Time Compilation，JIT）。让我们从一个实际场景开始：

```javascript
function fibonacci(n) {
  if (n <= 1) return n;
  return fibonacci(n - 1) + fibonacci(n - 2);
}

// 调用一次
fibonacci(10);

// 循环调用 10000 次
for (let i = 0; i < 10000; i++) {
  fibonacci(10);
}
```

第一次调用时，`fibonacci` 函数由 Ignition 解释执行。但当它被调用了数千次后，V8 会识别出这是"热点代码"，交给 **TurboFan 优化编译器**，将其编译成高度优化的机器码。

这就是 JIT 的核心思想：**在运行时动态地将热点代码编译成机器码**。

## 什么是即时编译（JIT）？

### JIT vs AOT

在理解 JIT 之前，我们需要先了解两种编译方式：

**AOT 编译**（Ahead-Of-Time Compilation）：
- 在程序运行**之前**完成编译
- C、C++、Go 等语言采用这种方式
- 优点：启动即可全速执行
- 缺点：编译耗时，无法利用运行时信息

**JIT 编译**（Just-In-Time Compilation）：
- 在程序运行**过程中**进行编译
- Java、JavaScript、Python（PyPy）等采用这种方式
- 优点：可以利用运行时信息进行优化
- 缺点：需要平衡编译时间和执行速度

### JIT 的优势

JIT 相比纯解释执行的最大优势是**执行速度**。机器码是 CPU 直接执行的指令，不需要解释器的中间层，速度可以提升 **2-100 倍**（取决于代码类型）。

JIT 相比 AOT 的最大优势是**自适应优化**。编译器可以利用运行时收集的信息：

- **类型反馈**：函数参数的实际类型
- **调用频率**：哪些函数是热点
- **执行路径**：哪些分支最常被执行

基于这些信息，JIT 可以进行 **推测性优化**（Speculative Optimization），生成针对特定场景的高效代码。

## V8 的分层编译策略

V8 采用**分层编译**（Tiered Compilation）策略，结合了解释执行和 JIT 编译的优势：

```
            快速启动                峰值性能
                ↓                      ↓
代码 → Ignition（解释执行） → TurboFan（优化编译）
        字节码                    机器码
```

### 第一层：Ignition 解释器

**特点**：
- 快速生成字节码
- 立即开始执行
- 收集类型反馈

**适用场景**：
- 冷代码（很少执行的代码）
- 首次执行的代码
- 启动阶段的代码

### 第二层：TurboFan 优化编译器

**特点**：
- 深度优化编译
- 生成高效机器码
- 执行速度接近 C++

**适用场景**：
- 热点代码（频繁执行的代码）
- 循环体内的代码
- 性能关键路径

## 热点检测：如何识别需要优化的代码？

V8 如何知道哪些代码是"热点"？答案是**计数器**。

### 调用计数器

V8 为每个函数维护一个**调用计数器**。每次函数被调用，计数器就加 1。当计数器达到一定阈值（通常是几千次），函数就会被标记为热点，提交给 TurboFan 优化。

```javascript
function hot() {
  // 这个函数会被调用很多次
  return 42;
}

// 第 1 次调用：Ignition 执行，计数器 = 1
hot();

// 第 2-3000 次调用：Ignition 执行，计数器递增
for (let i = 0; i < 3000; i++) {
  hot();
}

// 计数器达到阈值，TurboFan 开始编译...

// 第 3001+ 次调用：执行优化后的机器码，速度大幅提升
for (let i = 0; i < 10000; i++) {
  hot();
}
```

### 回边计数器

对于包含循环的函数，V8 还使用**回边计数器**（Backedge Counter）。每次循环回到起点，计数器就加 1。

```javascript
function loopIntensive(n) {
  let sum = 0;
  for (let i = 0; i < n; i++) {  // 回边：每次循环回到这里
    sum += i;
  }
  return sum;
}

// 即使函数只调用一次，但循环了 10000 次
// 回边计数器达到阈值，触发优化
loopIntensive(10000);
```

这种机制确保了即使函数本身调用次数不多，但内部有大量循环的代码也能被优化。

## TurboFan 优化编译器

### TurboFan 的工作流程

TurboFan 接收字节码和类型反馈，生成优化的机器码：

```
字节码 + 类型反馈
    ↓
生成中间表示（IR）
    ↓
应用优化（内联、常量折叠等）
    ↓
生成机器码
    ↓
机器码执行
```

### 核心优化技术

**1. 函数内联（Inlining）**

将函数调用替换为函数体，消除调用开销。

```javascript
function add(a, b) {
  return a + b;
}

function calculate(x) {
  return add(x, 10);  // 调用 add
}
```

优化后（概念性）：

```javascript
function calculate(x) {
  return x + 10;  // 直接内联，不再有函数调用
}
```

**2. 类型特化（Type Specialization）**

根据类型反馈，生成针对特定类型的代码。

```javascript
function multiply(a, b) {
  return a * b;
}

// 多次调用，参数都是数字
multiply(2, 3);
multiply(5, 4);
multiply(10, 20);

// TurboFan 生成针对数字的优化代码：
// - 跳过类型检查
// - 使用整数乘法指令
```

如果后来用字符串调用：

```javascript
multiply("hello", "world");  // 触发去优化
```

**3. 常量折叠（Constant Folding）**

在编译时计算常量表达式。

```javascript
function area(radius) {
  return 3.14159 * radius * radius;
}
```

优化后（`3.14159` 作为常量保留）：

```javascript
function area(radius) {
  return 3.14159 * radius * radius;  // 无需每次加载 3.14159
}
```

**4. 逃逸分析（Escape Analysis）**

分析对象是否"逃逸"出函数。如果对象只在函数内使用，可以将其分配在栈上，而不是堆上，避免垃圾回收开销。

```javascript
function createPoint(x, y) {
  const point = { x, y };
  return point.x + point.y;
}

// point 对象没有逃逸（没有返回对象本身）
// TurboFan 可以优化为不创建对象，直接计算 x + y
```

**5. 死代码消除（Dead Code Elimination）**

移除永远不会执行的代码。

```javascript
function test(flag) {
  if (false) {  // 条件永远为 false
    console.log("unreachable");
  }
  return flag ? 1 : 0;
}
```

优化后：

```javascript
function test(flag) {
  return flag ? 1 : 0;
}
```

### TurboFan 的 Sea of Nodes

TurboFan 使用一种特殊的中间表示叫做 **Sea of Nodes**（节点之海）。

在传统的编译器中，中间表示通常是线性的指令序列。但 TurboFan 使用**图**（Graph）来表示代码：

- **节点**：表示操作（如加法、加载、调用）
- **边**：表示数据依赖和控制流

这种表示方式的优势是：
- 更容易进行优化
- 可以自由地重排指令顺序
- 便于识别冗余操作

## 推测性优化与去优化

### 推测性优化

TurboFan 的优化是**推测性的**（Speculative）——它基于运行时观察到的行为做出假设。

**示例**：

```javascript
function add(a, b) {
  return a + b;
}

// 前 5000 次调用，参数都是数字
for (let i = 0; i < 5000; i++) {
  add(i, i + 1);
}

// TurboFan 假设：a 和 b 总是数字
// 生成优化代码：使用整数加法，跳过类型检查
```

优化后的代码**嵌入了假设**：

```
; 伪代码
if (typeof a !== 'number' || typeof b !== 'number') {
  goto DEOPTIMIZE;  // 假设失败，去优化
}
; 整数加法
result = a + b;
```

### 去优化（Deoptimization）

如果假设失败，会触发**去优化**（Deoptimization）：

```javascript
// 前面都是数字...
add(1, 2);
add(3, 4);

// 突然用字符串调用
add("hello", "world");  // 触发去优化！
```

**去优化的过程**：

1. **检测假设失败**：发现参数不是数字
2. **退回解释器**：跳转到 Ignition，用通用方式执行
3. **清理优化代码**：丢弃失效的机器码
4. **重新收集反馈**：为可能的再次优化做准备

去优化是有性能代价的，但它保证了代码的正确性。

### 优化与去优化的循环

某些代码可能经历多次优化和去优化的循环：

```javascript
function process(x) {
  return x + 1;
}

// 阶段 1：用数字调用，优化为整数加法
for (let i = 0; i < 5000; i++) {
  process(i);
}

// 阶段 2：用字符串调用，去优化
for (let i = 0; i < 100; i++) {
  process("value");
}

// 阶段 3：又用数字调用，可能再次优化
for (let i = 0; i < 5000; i++) {
  process(i);
}
```

V8 会追踪去优化的次数。如果某个函数频繁去优化，V8 可能会放弃优化，避免无谓的编译开销。

## JIT 编译的性能影响

### 编译开销

JIT 编译本身需要时间。TurboFan 生成优化代码可能需要 **几毫秒到几十毫秒**。

这就是为什么不是所有代码都会被优化——冷代码（很少执行的代码）优化的成本大于收益。

### 内存占用

优化的机器码占用内存。V8 需要在内存和性能之间权衡。

### 峰值性能的延迟

由于需要收集类型反馈并等待热点检测，代码达到峰值性能需要一定时间（通常是几秒到几十秒）。这被称为 **warmup 时间**。

## 对比：解释执行 vs JIT 编译

|特性|Ignition（解释）|TurboFan（JIT）|
|---|---|---|
|**启动速度**|快（毫秒级）|慢（需要编译）|
|**执行速度**|中等|快（2-100倍提升）|
|**内存占用**|小|大（机器码）|
|**优化程度**|基本优化|深度优化|
|**适用场景**|冷代码、启动阶段|热点代码、循环|

### 实际测试

让我们用一个简单的测试感受差异：

```javascript
// 测试 1：冷代码（只执行一次）
function coldFunction(n) {
  return n * 2;
}
coldFunction(42);  // 解释执行，无优化

// 测试 2：热代码（循环 10万次）
function hotFunction(n) {
  return n * 2;
}
for (let i = 0; i < 100000; i++) {
  hotFunction(i);  // 几千次后被优化，速度大幅提升
}
```

在热代码场景下，优化后的版本可以比解释执行快 **10-50 倍**。

## 写对 V8 友好的代码

理解 JIT 编译，我们可以总结一些编码建议：

### 1. 保持类型一致

```javascript
// ✅ 好：类型一致
function add(a, b) {
  return a + b;
}
add(1, 2);
add(3, 4);

// ❌ 坏：类型变化
add("hello", "world");  // 触发去优化
```

### 2. 避免改变对象形状

```javascript
// ✅ 好：稳定的对象形状
function Point(x, y) {
  this.x = x;
  this.y = y;
}
const p1 = new Point(1, 2);
const p2 = new Point(3, 4);

// ❌ 坏：动态添加属性
const p3 = new Point(5, 6);
p3.z = 7;  // 改变了对象形状
```

### 3. 函数参数数量保持一致

```javascript
// ✅ 好：参数数量一致
function calculate(a, b, c) {
  return a + b + c;
}
calculate(1, 2, 3);
calculate(4, 5, 6);

// ❌ 坏：参数数量不一致
calculate(7, 8);     // 少传参数
calculate(10, 11, 12, 13);  // 多传参数
```

### 4. 避免使用 `arguments` 对象

```javascript
// ❌ 坏：使用 arguments
function sum() {
  let total = 0;
  for (let i = 0; i < arguments.length; i++) {
    total += arguments[i];
  }
  return total;
}

// ✅ 好：使用 rest 参数
function sum(...numbers) {
  let total = 0;
  for (let num of numbers) {
    total += num;
  }
  return total;
}
```

## 本章小结

本章我们深入理解了 V8 的即时编译（JIT）机制。核心要点：

1. **JIT 的本质**：在运行时将热点代码编译成机器码，提升执行速度
2. **分层编译**：Ignition 保证启动速度，TurboFan 提升峰值性能
3. **热点检测**：通过调用计数器和回边计数器识别热点代码
4. **优化技术**：内联、类型特化、常量折叠、逃逸分析等
5. **推测性优化**：基于类型反馈做出假设，假设失败时触发去优化

JIT 编译是 V8 高性能的核心秘密。它让 JavaScript 从一门"慢速脚本语言"变成了可以与 C++ 比肩的高性能语言。

至此，我们完成了 V8 架构与 JavaScript 执行流程的完整探索：

```
源码 → 词法分析 → 语法分析 → AST → 字节码 → 解释执行 → JIT 优化 → 机器码执行
```

在接下来的章节中，我们将深入 V8 的各个子系统：类型系统、内存管理、性能优化、异步机制等。每个主题都将建立在本章建立的基础之上。

---

**思考题**：

1. 为什么 V8 不对所有代码都进行优化编译？
2. 去优化虽然影响性能，但为什么是必要的？
3. 如果你要设计一个 JIT 编译器，你会如何平衡编译时间和执行速度？
