# 编写对 V8 友好的代码：性能优化实践

经过前面章节的学习，我们已经深入了解了V8的内联缓存、TurboFan优化、去优化机制和函数内联等核心技术。本章将综合运用这些知识，系统地总结编写高性能JavaScript代码的实践方法。这不是一份教条式的规则清单，而是基于V8工作原理的实用指南。

掌握这些实践，你就能写出V8容易优化的代码，在不牺牲代码质量的前提下获得更好的运行性能。

## 对象形状一致性

保持对象形状（隐藏类）一致是最重要的优化原则：

```javascript
// 对象形状一致性
class ObjectShapeConsistency {
  static demonstrateProblem() {
    console.log('=== 对象形状不一致的问题 ===\n');
    
    console.log('❌ 问题代码：');
    console.log(`
    function createUser(name, email, phone) {
      const user = {};
      user.name = name;
      if (email) user.email = email;
      if (phone) user.phone = phone;
      return user;
    }
    
    const users = [
      createUser('Alice', 'alice@example.com', '123'),
      createUser('Bob', 'bob@example.com'),  // 无phone
      createUser('Charlie')                  // 无email和phone
    ];
    `);
    
    console.log('问题分析：');
    console.log('  • 三个对象有不同的形状（隐藏类）');
    console.log('  • 访问user.name时IC变成多态');
    console.log('  • 性能下降\n');
  }
  
  static demonstrateSolution() {
    console.log('=== 保持形状一致 ===\n');
    
    console.log('✅ 改进方案1：始终初始化所有属性');
    console.log(`
    function createUser(name, email = null, phone = null) {
      return {
        name,
        email,
        phone
      };
    }
    `);
    
    console.log('✅ 改进方案2：使用类');
    console.log(`
    class User {
      constructor(name, email = null, phone = null) {
        this.name = name;
        this.email = email;
        this.phone = phone;
      }
    }
    `);
    
    console.log('✅ 改进方案3：工厂函数确保形状');
    console.log(`
    function createUser(data) {
      return {
        name: data.name ?? '',
        email: data.email ?? null,
        phone: data.phone ?? null,
        createdAt: Date.now()
      };
    }
    `);
  }
  
  static demonstrateBenchmark() {
    console.log('=== 性能对比 ===\n');
    
    // 不一致形状
    function createInconsistent(name, hasEmail, hasPhone) {
      const user = { name };
      if (hasEmail) user.email = 'test@example.com';
      if (hasPhone) user.phone = '123456';
      return user;
    }
    
    // 一致形状
    function createConsistent(name, email, phone) {
      return {
        name,
        email: email ?? null,
        phone: phone ?? null
      };
    }
    
    // 创建测试数据
    const inconsistentUsers = [];
    const consistentUsers = [];
    
    for (let i = 0; i < 10000; i++) {
      inconsistentUsers.push(
        createInconsistent(`user${i}`, i % 2 === 0, i % 3 === 0)
      );
      consistentUsers.push(
        createConsistent(
          `user${i}`,
          i % 2 === 0 ? 'test@example.com' : null,
          i % 3 === 0 ? '123456' : null
        )
      );
    }
    
    // 访问测试
    function sumNameLengths(users) {
      let sum = 0;
      for (const user of users) {
        sum += user.name.length;
      }
      return sum;
    }
    
    // 预热
    sumNameLengths(inconsistentUsers);
    sumNameLengths(consistentUsers);
    
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
    console.log('');
  }
  
  static runAll() {
    this.demonstrateProblem();
    this.demonstrateSolution();
    this.demonstrateBenchmark();
  }
}

ObjectShapeConsistency.runAll();
```

## 属性初始化顺序

属性添加顺序影响隐藏类：

```javascript
// 属性初始化顺序
class PropertyInitializationOrder {
  static demonstrate() {
    console.log('=== 属性初始化顺序 ===\n');
    
    console.log('❌ 问题代码：');
    console.log(`
    // 不同的初始化顺序导致不同的隐藏类
    const obj1 = {};
    obj1.x = 1;
    obj1.y = 2;
    
    const obj2 = {};
    obj2.y = 2;  // 先设置y
    obj2.x = 1;  // 再设置x
    
    // obj1和obj2有不同的隐藏类！
    `);
    
    console.log('原因：');
    console.log('  • 隐藏类转换取决于属性添加顺序');
    console.log('  • obj1: {} → {x} → {x,y}');
    console.log('  • obj2: {} → {y} → {y,x}');
    console.log('  • 最终形状不同\n');
  }
  
  static demonstrateSolution() {
    console.log('=== 解决方案 ===\n');
    
    console.log('✅ 方案1：对象字面量一次性定义');
    console.log(`
    const obj1 = { x: 1, y: 2 };
    const obj2 = { x: 1, y: 2 };
    // 相同的形状
    `);
    
    console.log('✅ 方案2：构造函数按固定顺序初始化');
    console.log(`
    class Point {
      constructor(x, y) {
        this.x = x;  // 始终先x
        this.y = y;  // 再y
      }
    }
    `);
    
    console.log('✅ 方案3：工厂函数确保顺序');
    console.log(`
    function createPoint(data) {
      return {
        x: data.x,
        y: data.y
      };
    }
    `);
  }
  
  static runAll() {
    this.demonstrate();
    this.demonstrateSolution();
  }
}

PropertyInitializationOrder.runAll();
```

## 类型稳定性

保持变量和参数的类型稳定：

```javascript
// 类型稳定性
class TypeStability {
  static demonstrateProblem() {
    console.log('=== 类型不稳定的问题 ===\n');
    
    console.log('❌ 问题代码：');
    console.log(`
    function add(a, b) {
      return a + b;
    }
    
    // 混合类型调用
    add(1, 2);           // 整数加法
    add(1.5, 2.5);       // 浮点加法
    add("hello", "world"); // 字符串拼接
    `);
    
    console.log('问题分析：');
    console.log('  • 首次调用：IC记录Smi加法');
    console.log('  • 浮点调用：IC转为多态，添加HeapNumber');
    console.log('  • 字符串调用：可能变超态');
    console.log('  • 无法被TurboFan有效优化\n');
  }
  
  static demonstrateSolution() {
    console.log('=== 保持类型稳定 ===\n');
    
    console.log('✅ 方案1：分离不同类型的函数');
    console.log(`
    function addNumbers(a, b) {
      return a + b;  // 只用于数字
    }
    
    function concatStrings(a, b) {
      return a + b;  // 只用于字符串
    }
    `);
    
    console.log('✅ 方案2：类型检查和转换');
    console.log(`
    function addNumbers(a, b) {
      // 确保是数字
      a = Number(a);
      b = Number(b);
      return a + b;
    }
    `);
    
    console.log('✅ 方案3：使用TypeScript');
    console.log(`
    function add(a: number, b: number): number {
      return a + b;
    }
    `);
  }
  
  static demonstrateBenchmark() {
    console.log('=== 类型稳定性基准测试 ===\n');
    
    // 单态函数
    function addMonomorphic(a, b) {
      return a + b;
    }
    
    // 多态函数
    function addPolymorphic(a, b) {
      return a + b;
    }
    
    // 预热单态版本（只用整数）
    for (let i = 0; i < 10000; i++) {
      addMonomorphic(i, i + 1);
    }
    
    // 预热多态版本（混合类型）
    for (let i = 0; i < 10000; i++) {
      if (i % 3 === 0) {
        addPolymorphic(i, i + 1);
      } else if (i % 3 === 1) {
        addPolymorphic(i + 0.5, i + 0.5);
      } else {
        addPolymorphic(String(i), String(i + 1));
      }
    }
    
    const iterations = 1000000;
    
    console.time('单态（整数）');
    let sum1 = 0;
    for (let i = 0; i < iterations; i++) {
      sum1 += addMonomorphic(i, i + 1);
    }
    console.timeEnd('单态（整数）');
    
    console.time('多态（混合）');
    let sum2 = 0;
    for (let i = 0; i < iterations; i++) {
      sum2 += addPolymorphic(i, i + 1);
    }
    console.timeEnd('多态（混合）');
    console.log('');
  }
  
  static runAll() {
    this.demonstrateProblem();
    this.demonstrateSolution();
    this.demonstrateBenchmark();
  }
}

TypeStability.runAll();
```

## 数组类型优化

保持数组元素类型一致：

```javascript
// 数组类型优化
class ArrayOptimization {
  static demonstrateElementsKind() {
    console.log('=== Elements Kind优化 ===\n');
    
    console.log('V8的数组内部类型：');
    console.log('  • PACKED_SMI_ELEMENTS：紧凑的小整数');
    console.log('  • PACKED_DOUBLE_ELEMENTS：紧凑的浮点数');
    console.log('  • PACKED_ELEMENTS：紧凑的任意元素');
    console.log('  • HOLEY_*：有空洞的版本');
    console.log('  • DICTIONARY_ELEMENTS：字典模式\n');
    
    console.log('类型转换是单向的：');
    console.log('  SMI → DOUBLE → ELEMENTS');
    console.log('  PACKED → HOLEY');
    console.log('  一旦降级，无法恢复\n');
  }
  
  static demonstrateProblem() {
    console.log('=== 数组类型问题 ===\n');
    
    console.log('❌ 问题代码：');
    console.log(`
    const arr = [1, 2, 3];  // PACKED_SMI_ELEMENTS
    arr.push(1.5);          // 降级为PACKED_DOUBLE_ELEMENTS
    arr.push('hello');      // 降级为PACKED_ELEMENTS
    arr[100] = 1;           // 变成HOLEY（有空洞）
    `);
    
    console.log('问题：');
    console.log('  • 每次降级都影响性能');
    console.log('  • 无法恢复到更高效的类型\n');
  }
  
  static demonstrateSolution() {
    console.log('=== 数组优化方案 ===\n');
    
    console.log('✅ 技巧1：预先确定元素类型');
    console.log(`
    // 整数数组
    const intArr = new Int32Array(100);
    
    // 浮点数组
    const floatArr = new Float64Array(100);
    
    // 普通数组保持类型一致
    const nums = [1, 2, 3, 4, 5];  // 都是整数
    `);
    
    console.log('✅ 技巧2：避免创建空洞');
    console.log(`
    // 不好：创建空洞
    const arr = [];
    arr[99] = 1;  // 0-98都是空洞
    
    // 好：顺序填充
    const arr = [];
    for (let i = 0; i < 100; i++) {
      arr.push(i);
    }
    `);
    
    console.log('✅ 技巧3：预分配大小');
    console.log(`
    // 知道大小时预分配
    const arr = new Array(100).fill(0);
    
    // 或使用TypedArray
    const arr = new Int32Array(100);
    `);
  }
  
  static demonstrateBenchmark() {
    console.log('=== 数组性能测试 ===\n');
    
    const size = 100000;
    
    // 紧凑整数数组
    const packedSmi = [];
    for (let i = 0; i < size; i++) {
      packedSmi.push(i);
    }
    
    // 带空洞的数组
    const holey = [];
    holey[size - 1] = 0;  // 创建空洞
    for (let i = 0; i < size; i++) {
      holey[i] = i;
    }
    
    // TypedArray
    const typed = new Int32Array(size);
    for (let i = 0; i < size; i++) {
      typed[i] = i;
    }
    
    function sumArray(arr) {
      let sum = 0;
      for (let i = 0; i < arr.length; i++) {
        sum += arr[i];
      }
      return sum;
    }
    
    // 预热
    sumArray(packedSmi);
    sumArray(holey);
    sumArray(typed);
    
    const iterations = 1000;
    
    console.time('PACKED_SMI');
    for (let i = 0; i < iterations; i++) {
      sumArray(packedSmi);
    }
    console.timeEnd('PACKED_SMI');
    
    console.time('HOLEY');
    for (let i = 0; i < iterations; i++) {
      sumArray(holey);
    }
    console.timeEnd('HOLEY');
    
    console.time('TypedArray');
    for (let i = 0; i < iterations; i++) {
      sumArray(typed);
    }
    console.timeEnd('TypedArray');
    console.log('');
  }
  
  static runAll() {
    this.demonstrateElementsKind();
    this.demonstrateProblem();
    this.demonstrateSolution();
    this.demonstrateBenchmark();
  }
}

ArrayOptimization.runAll();
```

## 避免去优化触发

减少去优化的发生：

```javascript
// 避免去优化
class AvoidDeoptimization {
  static demonstrateCommonTriggers() {
    console.log('=== 常见去优化触发点 ===\n');
    
    console.log('1. 类型变化');
    console.log(`
    function process(x) {
      return x * 2;  // 假设是数字
    }
    
    process(10);      // OK
    process("10");    // 去优化！
    `);
    
    console.log('2. 对象形状变化');
    console.log(`
    function getX(obj) {
      return obj.x;  // 优化为特定形状
    }
    
    const p1 = { x: 1, y: 2 };
    getX(p1);  // OK
    
    const p2 = { y: 2, x: 1 };  // 不同形状
    getX(p2);  // 去优化！
    `);
    
    console.log('3. 数组越界');
    console.log(`
    function getElement(arr, i) {
      return arr[i];  // 优化假设i在范围内
    }
    
    const arr = [1, 2, 3];
    getElement(arr, 0);   // OK
    getElement(arr, 100); // 去优化！
    `);
    
    console.log('4. 原型链修改');
    console.log(`
    function callMethod(obj) {
      return obj.method();  // 优化为直接调用
    }
    
    // 修改原型
    Object.prototype.method = function() {};  // 触发去优化
    `);
  }
  
  static demonstrateSolutions() {
    console.log('\n=== 避免去优化的方法 ===\n');
    
    console.log('✅ 1. 保持类型一致');
    console.log(`
    // 使用类型检查
    function process(x) {
      if (typeof x !== 'number') {
        throw new TypeError('Expected number');
      }
      return x * 2;
    }
    `);
    
    console.log('✅ 2. 使用类确保形状');
    console.log(`
    class Point {
      constructor(x, y) {
        this.x = x;
        this.y = y;
      }
    }
    
    // 所有Point实例形状相同
    `);
    
    console.log('✅ 3. 边界检查');
    console.log(`
    function getElement(arr, i) {
      if (i < 0 || i >= arr.length) {
        return undefined;
      }
      return arr[i];
    }
    `);
    
    console.log('✅ 4. 避免修改原型');
    console.log(`
    // 在初始化时定义所有原型方法
    class MyClass {
      method1() {}
      method2() {}
    }
    // 之后不再修改MyClass.prototype
    `);
  }
  
  static runAll() {
    this.demonstrateCommonTriggers();
    this.demonstrateSolutions();
  }
}

AvoidDeoptimization.runAll();
```

## 函数优化技巧

编写容易被优化的函数：

```javascript
// 函数优化技巧
class FunctionOptimization {
  static demonstrateSmallFunctions() {
    console.log('=== 保持函数小巧 ===\n');
    
    console.log('✅ 小函数容易被内联：');
    console.log(`
    // 好：单一职责，容易内联
    const double = x => x * 2;
    const square = x => x * x;
    const add = (a, b) => a + b;
    `);
    
    console.log('❌ 大函数难以优化：');
    console.log(`
    function doEverything(data) {
      // 验证...（20行）
      // 转换...（30行）
      // 处理...（50行）
      // 输出...（10行）
    }
    `);
    
    console.log('改进：拆分为小函数');
    console.log(`
    function validate(data) { /* ... */ }
    function transform(data) { /* ... */ }
    function process(data) { /* ... */ }
    function output(data) { /* ... */ }
    
    function doEverything(data) {
      validate(data);
      const transformed = transform(data);
      const processed = process(transformed);
      return output(processed);
    }
    `);
  }
  
  static demonstrateMonomorphicCalls() {
    console.log('=== 保持单态调用 ===\n');
    
    console.log('❌ 多态调用难以优化：');
    console.log(`
    function process(handler) {
      return handler.run();  // handler类型多变
    }
    
    process(new TypeA());
    process(new TypeB());
    process(new TypeC());
    `);
    
    console.log('✅ 单态调用容易优化：');
    console.log(`
    function processTypeA(handler) {
      return handler.run();  // 只处理TypeA
    }
    
    function processTypeB(handler) {
      return handler.run();  // 只处理TypeB
    }
    `);
  }
  
  static demonstrateAvoidDynamicFeatures() {
    console.log('=== 避免动态特性 ===\n');
    
    console.log('❌ 避免使用：');
    console.log(`
    // eval阻止优化
    function calc(expr) {
      return eval(expr);
    }
    
    // with阻止优化
    with (obj) {
      return prop;
    }
    
    // arguments泄露阻止优化
    function foo() {
      return Array.from(arguments);
    }
    `);
    
    console.log('✅ 推荐替代：');
    console.log(`
    // 使用映射而非eval
    const ops = { '+': (a,b) => a+b, '-': (a,b) => a-b };
    function calc(op, a, b) {
      return ops[op](a, b);
    }
    
    // 使用剩余参数
    function foo(...args) {
      return args;
    }
    `);
  }
  
  static runAll() {
    this.demonstrateSmallFunctions();
    this.demonstrateMonomorphicCalls();
    this.demonstrateAvoidDynamicFeatures();
  }
}

FunctionOptimization.runAll();
```

## 集合类型选择

选择合适的数据结构：

```javascript
// 集合类型选择
class CollectionChoice {
  static demonstrateObjectVsMap() {
    console.log('=== Object vs Map ===\n');
    
    console.log('使用Object的场景：');
    console.log('  • 属性名固定且已知');
    console.log('  • 属性数量较少');
    console.log('  • 需要JSON序列化');
    console.log('  • 作为记录/结构体使用\n');
    
    console.log('使用Map的场景：');
    console.log('  • 键是动态的');
    console.log('  • 频繁添加/删除');
    console.log('  • 需要键的顺序');
    console.log('  • 键不是字符串\n');
  }
  
  static demonstrateBenchmark() {
    console.log('=== Object vs Map 性能测试 ===\n');
    
    const keys = [];
    for (let i = 0; i < 10000; i++) {
      keys.push(`key${i}`);
    }
    
    // Object测试
    const obj = {};
    console.time('Object set');
    for (const key of keys) {
      obj[key] = 1;
    }
    console.timeEnd('Object set');
    
    console.time('Object get');
    let sum1 = 0;
    for (const key of keys) {
      sum1 += obj[key];
    }
    console.timeEnd('Object get');
    
    console.time('Object delete');
    for (const key of keys) {
      delete obj[key];
    }
    console.timeEnd('Object delete');
    
    // Map测试
    const map = new Map();
    console.time('Map set');
    for (const key of keys) {
      map.set(key, 1);
    }
    console.timeEnd('Map set');
    
    console.time('Map get');
    let sum2 = 0;
    for (const key of keys) {
      sum2 += map.get(key);
    }
    console.timeEnd('Map get');
    
    console.time('Map delete');
    for (const key of keys) {
      map.delete(key);
    }
    console.timeEnd('Map delete');
    
    console.log('\n结论：');
    console.log('  • 频繁删除操作时Map更快');
    console.log('  • 固定结构访问时Object更快\n');
  }
  
  static demonstrateArrayVsSet() {
    console.log('=== Array vs Set ===\n');
    
    console.log('使用Array的场景：');
    console.log('  • 需要顺序访问');
    console.log('  • 需要索引访问');
    console.log('  • 允许重复元素');
    console.log('  • 小规模数据\n');
    
    console.log('使用Set的场景：');
    console.log('  • 需要去重');
    console.log('  • 频繁检查存在性');
    console.log('  • 频繁添加/删除');
    console.log('  • 大规模数据\n');
    
    // 存在性检查测试
    const size = 10000;
    const arr = Array.from({ length: size }, (_, i) => i);
    const set = new Set(arr);
    
    const iterations = 10000;
    
    console.time('Array includes');
    for (let i = 0; i < iterations; i++) {
      arr.includes(Math.floor(Math.random() * size));
    }
    console.timeEnd('Array includes');
    
    console.time('Set has');
    for (let i = 0; i < iterations; i++) {
      set.has(Math.floor(Math.random() * size));
    }
    console.timeEnd('Set has');
    console.log('');
  }
  
  static runAll() {
    this.demonstrateObjectVsMap();
    this.demonstrateBenchmark();
    this.demonstrateArrayVsSet();
  }
}

CollectionChoice.runAll();
```

## 性能检测工具

使用工具验证优化效果：

```javascript
// 性能检测工具
class PerformanceTools {
  static demonstrateV8Flags() {
    console.log('=== V8调试标志 ===\n');
    
    console.log('常用Node.js/V8标志：\n');
    
    console.log('优化跟踪：');
    console.log('  --trace-opt: 跟踪函数优化');
    console.log('  --trace-deopt: 跟踪去优化');
    console.log('  --trace-turbo-inlining: 跟踪内联决策\n');
    
    console.log('IC跟踪：');
    console.log('  --trace-ic: 跟踪内联缓存状态变化\n');
    
    console.log('代码输出：');
    console.log('  --print-opt-code: 打印优化后的代码');
    console.log('  --print-bytecode: 打印字节码\n');
    
    console.log('使用示例：');
    console.log('  node --trace-opt --trace-deopt script.js\n');
  }
  
  static demonstrateConsoleTime() {
    console.log('=== console.time 基准测试 ===\n');
    
    console.log('简单的性能测量：');
    console.log(`
    console.time('操作名称');
    // 执行操作...
    console.timeEnd('操作名称');
    `);
    
    console.log('多次测量取平均：');
    console.log(`
    function benchmark(fn, iterations = 1000) {
      // 预热
      for (let i = 0; i < 100; i++) fn();
      
      const start = performance.now();
      for (let i = 0; i < iterations; i++) fn();
      const end = performance.now();
      
      return (end - start) / iterations;
    }
    `);
  }
  
  static demonstrateDevTools() {
    console.log('=== Chrome DevTools ===\n');
    
    console.log('Performance面板：');
    console.log('  • 录制性能分析');
    console.log('  • 查看函数调用耗时');
    console.log('  • 识别热点函数');
    console.log('  • 查看GC暂停\n');
    
    console.log('Memory面板：');
    console.log('  • 堆快照分析');
    console.log('  • 分配时间线');
    console.log('  • 检测内存泄漏\n');
    
    console.log('关键指标：');
    console.log('  • Script执行时间');
    console.log('  • GC时间');
    console.log('  • 内存使用趋势\n');
  }
  
  static runAll() {
    this.demonstrateV8Flags();
    this.demonstrateConsoleTime();
    this.demonstrateDevTools();
  }
}

PerformanceTools.runAll();
```

## 最佳实践检查清单

```javascript
// 最佳实践检查清单
class BestPracticesChecklist {
  static summary() {
    console.log('=== V8友好代码检查清单 ===\n');
    
    console.log('【对象优化】');
    console.log('  □ 对象属性在构造时全部初始化');
    console.log('  □ 同类对象属性初始化顺序一致');
    console.log('  □ 避免运行时添加/删除属性');
    console.log('  □ 使用类或工厂函数创建对象\n');
    
    console.log('【类型稳定】');
    console.log('  □ 变量类型保持一致');
    console.log('  □ 函数参数类型一致');
    console.log('  □ 避免混合类型操作');
    console.log('  □ 分离不同类型的处理逻辑\n');
    
    console.log('【数组优化】');
    console.log('  □ 数组元素类型一致');
    console.log('  □ 避免创建稀疏数组');
    console.log('  □ 大数据量使用TypedArray');
    console.log('  □ 预分配数组大小\n');
    
    console.log('【函数优化】');
    console.log('  □ 函数保持小巧');
    console.log('  □ 调用点保持单态');
    console.log('  □ 避免eval和with');
    console.log('  □ 使用剩余参数代替arguments\n');
    
    console.log('【避免去优化】');
    console.log('  □ 不修改对象的原型');
    console.log('  □ 不越界访问数组');
    console.log('  □ 不改变变量类型');
    console.log('  □ 不在热点代码中捕获异常\n');
    
    console.log('【数据结构选择】');
    console.log('  □ 固定结构用Object');
    console.log('  □ 动态键值用Map');
    console.log('  □ 去重和查找用Set');
    console.log('  □ 数值计算用TypedArray\n');
  }
  
  static priorities() {
    console.log('=== 优化优先级 ===\n');
    
    console.log('高优先级（影响显著）：');
    console.log('  1. 对象形状一致性');
    console.log('  2. 类型稳定性');
    console.log('  3. 避免去优化触发\n');
    
    console.log('中优先级：');
    console.log('  4. 数组类型优化');
    console.log('  5. 函数内联友好');
    console.log('  6. 正确的数据结构选择\n');
    
    console.log('低优先级（微优化）：');
    console.log('  7. 循环展开');
    console.log('  8. 位运算替代');
    console.log('  9. 其他微优化\n');
    
    console.log('原则：');
    console.log('  • 先测量，后优化');
    console.log('  • 关注热点代码');
    console.log('  • 可读性优先于微优化');
    console.log('  • 使用工具验证效果\n');
  }
  
  static runAll() {
    this.summary();
    this.priorities();
  }
}

BestPracticesChecklist.runAll();
```

## 本章小结

本章综合总结了编写对V8友好代码的实践方法。核心要点包括：

1. **对象形状一致性**：始终初始化所有属性，保持属性顺序一致，使用类或工厂函数。

2. **类型稳定性**：保持变量和参数类型一致，分离不同类型的处理逻辑。

3. **数组优化**：保持元素类型一致，避免稀疏数组，大数据量使用TypedArray。

4. **避免去优化**：不修改原型，不越界访问，不改变变量类型。

5. **函数优化**：保持函数小巧，维持单态调用，避免动态特性。

6. **数据结构选择**：根据使用场景选择Object、Map、Set或TypedArray。

7. **性能验证**：使用V8标志和DevTools验证优化效果。

这些实践不是教条，而是基于V8工作原理的指导。在实际开发中，应该先测量性能，找出瓶颈，然后有针对性地应用这些优化技巧。记住：代码的可读性和可维护性同样重要，不要为了微小的性能提升而牺牲代码质量。
