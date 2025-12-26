# V8友好代码：优化检查清单与工具

在前两章中，我们学习了基础优化原则和高级优化技巧。但在实际开发中，如何系统化地检查和优化代码？如何验证优化效果？

本章提供**实用的优化检查清单**和**性能分析工具**，帮助你建立完整的性能优化工作流。

## 优化检查清单

这是一份可操作的清单，用于代码审查和性能优化。

### 一、对象与类型（10项）

#### ✓ 1. 对象形状一致性

**检查点**：所有同类对象是否有相同的属性集合？

```javascript
// ❌ 检查不通过
function createUser(name, email, phone) {
  const user = { name };
  if (email) user.email = email;  // 条件属性
  if (phone) user.phone = phone;  // 条件属性
  return user;
}

// ✅ 检查通过
function createUser(name, email = null, phone = null) {
  return { name, email, phone };  // 所有属性始终存在
}
```

**快速检查**：
- 搜索代码中的条件属性添加（`if (...) obj.prop = ...`）
- 确认所有对象字面量有相同的键
- 类的构造函数是否初始化所有属性

#### ✓ 2. 属性初始化顺序

**检查点**：属性是否以固定顺序初始化？

```javascript
// ❌ 检查不通过
const obj1 = { x: 1, y: 2 };
const obj2 = { y: 2, x: 1 };  // 顺序不同

// ✅ 检查通过
const obj1 = { x: 1, y: 2 };
const obj2 = { x: 3, y: 4 };  // 顺序一致
```

**快速检查**：
- 使用ESLint规则：`sort-keys`
- 类的构造函数是否按固定顺序初始化

#### ✓ 3. 类型稳定性

**检查点**：函数参数和变量是否保持类型一致？

```javascript
// ❌ 检查不通过
function add(a, b) {
  return a + b;
}
add(1, 2);        // 数字
add('a', 'b');    // 字符串

// ✅ 检查通过
function addNumbers(a, b) {
  return a + b;  // 只用于数字
}
function concatStrings(a, b) {
  return a + b;  // 只用于字符串
}
```

**快速检查**：
- 使用TypeScript强制类型
- 搜索混合类型的函数调用
- 单元测试覆盖所有类型组合

#### ✓ 4. 避免动态属性

**检查点**：是否在运行时添加或删除属性？

```javascript
// ❌ 检查不通过
const config = {};
config.timeout = 3000;  // 动态添加
delete config.timeout;   // 动态删除

// ✅ 检查通过
const config = {
  timeout: 3000,
  retries: 3
};
config.timeout = 5000;  // 只修改值
```

**快速检查**：
- 搜索`delete`关键字
- 搜索`obj[dynamicKey] = value`模式
- 考虑用Map替代动态键值

#### ✓ 5. 数组元素类型一致

**检查点**：数组元素是否为同一类型？

```javascript
// ❌ 检查不通过
const mixed = [1, 'two', 3, 'four'];  // PACKED_ELEMENTS

// ✅ 检查通过
const numbers = [1, 2, 3, 4];  // PACKED_SMI_ELEMENTS
const strings = ['one', 'two', 'three'];  // PACKED_ELEMENTS
```

**快速检查**：
- 检查数组初始化是否混合类型
- 检查push/unshift是否混入不同类型

#### ✓ 6. 避免数组空洞

**检查点**：数组是否连续无空洞？

```javascript
// ❌ 检查不通过
const arr = [1, 2, 3];
delete arr[1];  // 创建空洞 → HOLEY_ELEMENTS

// ✅ 检查通过
const arr = [1, 2, 3];
arr.splice(1, 1);  // 删除并移动，保持紧密
```

**快速检查**：
- 搜索`delete arr[i]`
- 搜索`arr[largeIndex] = value`
- 使用`arr.fill(0)`预填充

#### ✓ 7. 避免稀疏数组

**检查点**：创建大数组时是否预填充？

```javascript
// ❌ 检查不通过
const arr = new Array(1000);  // 空洞数组

// ✅ 检查通过
const arr = new Array(1000).fill(0);  // 填充
```

#### ✓ 8. 类型转换显式化

**检查点**：类型转换是否明确？

```javascript
// ❌ 检查不通过
const num = +'123';  // 隐式转换

// ✅ 检查通过
const num = Number('123');  // 显式转换
```

#### ✓ 9. 避免混合Smi和HeapNumber

**检查点**：数字数组是否混合整数和浮点数？

```javascript
// ❌ 检查不通过
const arr = [1, 2, 3];  // PACKED_SMI_ELEMENTS
arr.push(1.5);          // 降级为PACKED_DOUBLE_ELEMENTS

// ✅ 检查通过
const floats = [1.0, 2.0, 3.0, 1.5];  // 一开始就是浮点
```

#### ✓ 10. 避免修改原型

**检查点**：是否修改了内置或自定义类的原型？

```javascript
// ❌ 检查不通过
Array.prototype.last = function() {
  return this[this.length - 1];
};

// ✅ 检查通过
function getLast(arr) {
  return arr[arr.length - 1];
}
```

### 二、函数优化（7项）

#### ✓ 11. 函数大小适中

**检查点**：函数是否小于100行？

```javascript
// ❌ 检查不通过
function doEverything(data) {
  // 200行代码...
}

// ✅ 检查通过
function validate(data) { /* 20行 */ }
function transform(data) { /* 30行 */ }
function process(data) { /* 25行 */ }
```

**快速检查**：
- 使用ESLint规则：`max-lines-per-function`
- 使用复杂度分析工具

#### ✓ 12. 避免eval和with

**检查点**：代码中是否使用了eval或with？

```javascript
// ❌ 检查不通过
function calc(expr) {
  return eval(expr);
}

// ✅ 检查通过
const ops = { '+': (a,b) => a+b };
function calc(op, a, b) {
  return ops[op](a, b);
}
```

**快速检查**：
- 搜索`eval(`和`with (`
- 使用ESLint规则：`no-eval`, `no-with`

#### ✓ 13. 使用剩余参数代替arguments

**检查点**：是否使用剩余参数？

```javascript
// ❌ 检查不通过
function sum() {
  return Array.from(arguments).reduce((a,b) => a+b);
}

// ✅ 检查通过
function sum(...numbers) {
  return numbers.reduce((a,b) => a+b, 0);
}
```

#### ✓ 14. try/catch局部化

**检查点**：try/catch是否只包裹必要的代码？

```javascript
// ❌ 检查不通过
function process(data) {
  try {
    // 100行代码...
  } catch (e) {
    return null;
  }
}

// ✅ 检查通过
function process(data) {
  let parsed;
  try {
    parsed = JSON.parse(data);  // 只包裹可能出错的部分
  } catch (e) {
    return null;
  }
  return transform(parsed);
}
```

#### ✓ 15. 避免多态调用

**检查点**：调用点是否接受多种类型的对象？

```javascript
// ❌ 检查不通过
function process(handler) {
  return handler.run();  // 多种handler类型
}

// ✅ 检查通过
function processA(handler) {
  return handler.run();  // 只处理TypeA
}
function processB(handler) {
  return handler.run();  // 只处理TypeB
}
```

#### ✓ 16. 函数参数数量适中

**检查点**：函数参数是否少于5个？

```javascript
// ❌ 检查不通过
function create(a, b, c, d, e, f, g) { }

// ✅ 检查通过
function create(options) {
  const { a, b, c, d, e, f, g } = options;
}
```

#### ✓ 17. 热路径函数单独优化

**检查点**：性能关键路径的函数是否独立？

```javascript
// ❌ 检查不通过
function process(data, options = {}) {
  const useCache = options.cache ?? true;  // 每次都检查
  // ...
}

// ✅ 检查通过
function processWithCache(data) {
  // 热路径，专门优化
}
function processWithoutCache(data) {
  // 冷路径
}
```

### 三、数据结构选择（5项）

#### ✓ 18. 固定键用Object，动态键用Map

**检查点**：是否正确选择Object或Map？

```javascript
// ❌ 检查不通过
const cache = {};
cache[obj] = 'value';  // obj被转为字符串

// ✅ 检查通过
const cache = new Map();
cache.set(obj, 'value');  // obj作为键
```

#### ✓ 19. 集合去重用Set

**检查点**：是否使用Set进行去重？

```javascript
// ❌ 检查不通过
const unique = arr.filter((v, i, a) => a.indexOf(v) === i);

// ✅ 检查通过
const unique = [...new Set(arr)];
```

#### ✓ 20. DOM元数据用WeakMap

**检查点**：DOM元素关联数据是否用WeakMap？

```javascript
// ❌ 检查不通过
const metadata = new Map();
metadata.set(element, data);  // 强引用，内存泄漏

// ✅ 检查通过
const metadata = new WeakMap();
metadata.set(element, data);  // 弱引用，自动清理
```

#### ✓ 21. 大量查找用Set/Map

**检查点**：频繁的存在性检查是否用Set/Map？

```javascript
// ❌ 检查不通过
const ids = [1, 2, 3, /* 1000个 */];
ids.includes(999);  // O(n)

// ✅ 检查通过
const ids = new Set([1, 2, 3, /* 1000个 */]);
ids.has(999);  // O(1)
```

#### ✓ 22. 有序数据用Array

**检查点**：需要索引访问的数据是否用Array？

```javascript
// ❌ 检查不通过
const list = new Set([1, 2, 3]);
// 无法通过索引访问

// ✅ 检查通过
const list = [1, 2, 3];
console.log(list[0]);  // O(1)索引访问
```

### 四、作用域与闭包（4项）

#### ✓ 23. 避免闭包捕获大对象

**检查点**：闭包是否只捕获必要的数据？

```javascript
// ❌ 检查不通过
function create(largeData) {
  return {
    get() {
      return largeData.summary;  // 捕获整个largeData
    }
  };
}

// ✅ 检查通过
function create(largeData) {
  const summary = largeData.summary;  // 提取需要的
  return {
    get() {
      return summary;  // 只捕获summary
    }
  };
}
```

#### ✓ 24. 减少全局变量

**检查点**：是否最小化全局变量使用？

```javascript
// ❌ 检查不通过
let counter = 0;  // 全局变量

// ✅ 检查通过
const createCounter = () => {
  let counter = 0;
  return {
    increment: () => ++counter,
    get: () => counter
  };
};
```

#### ✓ 25. 避免意外的全局变量

**检查点**：是否存在未声明的变量？

```javascript
// ❌ 检查不通过
function foo() {
  bar = 1;  // 未声明，变成全局变量
}

// ✅ 检查通过
function foo() {
  const bar = 1;  // 局部变量
}
```

#### ✓ 26. 模块作用域隔离

**检查点**：是否使用模块封装？

```javascript
// ❌ 检查不通过
// script1.js
var utils = {};

// script2.js
var utils = {};  // 冲突

// ✅ 检查通过
// utils.js
export const utils = {};
```

### 五、内存管理（4项）

#### ✓ 27. 及时解除引用

**检查点**：大对象是否及时解除引用？

```javascript
// ❌ 检查不通过
class Component {
  constructor(data) {
    this.data = data;  // 持有引用
  }
  // 组件销毁后data仍存在
}

// ✅ 检查通过
class Component {
  constructor(data) {
    this.data = data;
  }
  destroy() {
    this.data = null;  // 解除引用
  }
}
```

#### ✓ 28. 清理事件监听器

**检查点**：事件监听器是否正确清理？

```javascript
// ❌ 检查不通过
element.addEventListener('click', handler);
// 元素移除，监听器未清理

// ✅ 检查通过
element.addEventListener('click', handler);
element.removeEventListener('click', handler);
```

#### ✓ 29. 避免循环引用

**检查点**：对象间是否存在循环引用？

```javascript
// ❌ 检查不通过
const a = {};
const b = {};
a.ref = b;
b.ref = a;  // 循环引用

// ✅ 检查通过
const a = {};
const b = {};
a.ref = b;
// 不创建反向引用，或使用WeakMap
```

#### ✓ 30. 使用对象池

**检查点**：频繁创建的对象是否使用对象池？

```javascript
// ❌ 检查不通过
function calculate() {
  const vector = { x: 0, y: 0, z: 0 };  // 频繁创建
  // ...
}

// ✅ 检查通过
const pool = new ObjectPool(
  () => ({ x: 0, y: 0, z: 0 }),
  (v) => { v.x = 0; v.y = 0; v.z = 0; }
);

function calculate() {
  const vector = pool.acquire();  // 复用
  // ...
  pool.release(vector);
}
```

## 性能分析工具

### Node.js内置工具

#### 1. --trace-opt 和 --trace-deopt

追踪优化和去优化：

```bash
node --trace-opt --trace-deopt script.js
```

**输出示例**：

```
[marking 0x... <JS Function process> for optimized recompilation]
[optimizing 0x... <JS Function process> - took 2.3ms]
[deoptimizing 0x... <JS Function process> - wrong type feedback]
```

#### 2. --trace-ic

追踪内联缓存状态：

```bash
node --trace-ic script.js
```

**输出示例**：

```
[LoadIC in ~process+150 at script.js:10 (0->.) map=0x...]
[LoadIC in ~process+150 at script.js:10 (.->1) map=0x...]
```

**解读**：
- `0->. ` : 未初始化 → 单态
- `.->1` : 单态 → 多态
- `1->2` : 多态 → 多态（添加新形状）

#### 3. --prof 和 --prof-process

性能分析：

```bash
node --prof script.js
node --prof-process isolate-*.log > profile.txt
```

**profile.txt 示例**：

```
   ticks  total  nonlib   name
    456   45.6%   55.2%  JavaScript
    210   21.0%   25.4%  C++
    334   33.4%   40.4%  GC

 [JavaScript]:
   ticks  total  nonlib   name
    120   12.0%   14.5%  LazyCompile: *process script.js:10
     80    8.0%    9.7%  LazyCompile: *transform script.js:25
```

### Chrome DevTools

#### 1. Performance面板

录制性能分析：

1. 打开DevTools → Performance
2. 点击录制按钮
3. 执行操作
4. 停止录制

**查看内容**：
- JavaScript执行时间
- GC事件
- 函数调用堆栈

#### 2. Memory面板

内存分析：

1. DevTools → Memory
2. 选择"Heap snapshot"
3. 拍摄快照
4. 比较快照，找出内存泄漏

**查找泄漏**：
- 拍摄快照1
- 执行操作
- 拍摄快照2
- 对比快照，查看增长的对象

#### 3. --inspect调试

```bash
node --inspect script.js
```

然后在Chrome打开 `chrome://inspect`，连接到Node进程。

## 实战案例

让我们用检查清单优化一个真实场景：

### 优化前

```javascript
// 处理用户列表
function processUsers(data) {
  const results = [];
  
  for (let i = 0; i < data.length; i++) {
    const user = {};  // ❌ 形状不一致
    user.id = data[i].id;
    
    if (data[i].email) {  // ❌ 条件属性
      user.email = data[i].email;
    }
    
    results.push(user);
  }
  
  return results;
}
```

**问题清单**：
- ❌ 第1项：对象形状不一致
- ❌ 第4项：动态属性添加

### 优化后

```javascript
// 优化版本
function processUsers(data) {
  // ✅ 预分配数组
  const results = new Array(data.length);
  
  for (let i = 0; i < data.length; i++) {
    // ✅ 形状一致
    results[i] = {
      id: data[i].id,
      email: data[i].email ?? null  // 总是存在
    };
  }
  
  return results;
}
```

**改进点**：
- ✅ 第1项：对象形状一致
- ✅ 第6项：数组预分配，无空洞

## 自动化检查

### ESLint配置

```json
{
  "rules": {
    "no-eval": "error",
    "no-with": "error",
    "prefer-rest-params": "error",
    "max-lines-per-function": ["warn", 100],
    "max-params": ["warn", 4],
    "no-var": "error",
    "prefer-const": "error"
  }
}
```

### 性能测试

```javascript
// 性能基准测试
const Benchmark = require('benchmark');
const suite = new Benchmark.Suite();

suite
  .add('优化前', function() {
    processUsersOld(data);
  })
  .add('优化后', function() {
    processUsersNew(data);
  })
  .on('cycle', function(event) {
    console.log(String(event.target));
  })
  .on('complete', function() {
    console.log('最快: ' + this.filter('fastest').map('name'));
  })
  .run();
```

## 本章小结

1. **优化检查清单**：30项可操作的检查点，覆盖对象、函数、数据结构、作用域、内存5大类

2. **性能分析工具**：
   - Node.js: --trace-opt, --trace-deopt, --trace-ic, --prof
   - Chrome DevTools: Performance, Memory, --inspect

3. **自动化**：ESLint规则 + 性能基准测试

4. **实战流程**：
   - 使用检查清单审查代码
   - 用工具验证优化效果
   - 建立性能回归测试

通过这三章的学习，你已经掌握了编写V8友好代码的完整知识体系。记住：**优化是手段，不是目的**。先写出正确、可维护的代码，再根据性能瓶颈进行针对性优化。
