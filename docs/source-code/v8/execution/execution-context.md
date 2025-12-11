# 执行上下文：JavaScript 代码的运行环境

当一段JavaScript代码运行时，变量存储在哪里？函数如何访问外部变量？`this`的值如何确定？这些问题的答案都指向一个核心概念——**执行上下文**（Execution Context）。

```javascript
function outer() {
  const x = 1;
  
  function inner() {
    console.log(x);  // 如何访问到外部的 x？
    console.log(this);  // this 是什么？
  }
  
  inner();
}

outer();
```

执行上下文是JavaScript代码执行的环境，它包含了代码运行所需的所有信息：变量、函数、`this`绑定、作用域链等。V8为每个执行的代码块（全局代码、函数、eval）创建执行上下文，并通过**执行上下文栈**（Call Stack）管理它们。

本章将深入V8引擎，揭示执行上下文的组成结构、创建过程、执行流程、以及执行栈的管理机制。

## 执行上下文的类型

### 三种执行上下文

JavaScript中有三种类型的执行上下文：

**1. 全局执行上下文（Global Execution Context）**

```javascript
// 全局代码
var globalVar = 'global';
const globalConst = 'const';

function globalFunc() {
  console.log('global function');
}

// 所有全局代码在全局执行上下文中运行
```

**特点**：
- 程序启动时创建，只有一个
- 创建全局对象（浏览器中是`window`，Node.js中是`global`）
- 将`this`绑定到全局对象
- 所有不在函数内的代码都在全局上下文中执行

**2. 函数执行上下文（Function Execution Context）**

```javascript
function foo() {
  const x = 1;
  return x + 1;
}

foo();  // 创建函数执行上下文
```

**特点**：
- 每次调用函数时创建新的上下文
- 可以有任意多个
- 函数执行完成后销毁

**3. Eval执行上下文（Eval Execution Context）**

```javascript
eval('var x = 1; console.log(x);');
// eval 代码在独立的执行上下文中运行
```

**特点**：
- `eval`函数内的代码有自己的执行上下文
- 较少使用，有安全和性能问题

### 执行上下文与作用域的区别

```javascript
// 作用域：代码定义时确定
function outer() {
  const x = 1;  // outer 的作用域
  
  function inner() {
    console.log(x);  // 可以访问 outer 的作用域
  }
  
  return inner;
}

const fn = outer();

// 执行上下文：代码运行时创建
fn();  // 创建 inner 的执行上下文，但仍能访问 outer 的作用域
```

**区别**：

- **作用域**：词法作用域，在代码编写时确定，静态的。
- **执行上下文**：动态创建，在代码运行时产生，包含作用域信息。

## 执行上下文的组成

### ECMAScript 规范定义

根据ECMAScript规范，执行上下文包含以下组件：

```javascript
// V8 内部的执行上下文结构（简化）
class ExecutionContext {
  constructor() {
    // 词法环境：用于处理 let/const 和函数声明
    this.LexicalEnvironment = null;
    
    // 变量环境：用于处理 var 声明
    this.VariableEnvironment = null;
    
    // this 绑定
    this.ThisBinding = null;
    
    // 代码求值状态（仅函数上下文）
    this.Function = null;          // 函数对象
    this.Realm = null;             // Realm 记录
    this.ScriptOrModule = null;    // 脚本或模块记录
  }
}
```

### 1. 词法环境（Lexical Environment）

词法环境是一个包含标识符-变量映射的结构：

```javascript
// 词法环境的结构（简化）
class LexicalEnvironment {
  constructor() {
    // 环境记录：存储变量和函数声明
    this.EnvironmentRecord = null;
    
    // 外部词法环境的引用（作用域链）
    this.outer = null;
  }
}
```

**环境记录的类型**：

```javascript
// 1. 声明式环境记录（函数作用域、块作用域）
class DeclarativeEnvironmentRecord {
  constructor() {
    this.bindings = new Map();  // 存储变量绑定
  }
  
  CreateMutableBinding(name) {
    this.bindings.set(name, { value: undefined, mutable: true });
  }
  
  CreateImmutableBinding(name) {
    this.bindings.set(name, { value: undefined, mutable: false });
  }
  
  GetBindingValue(name) {
    return this.bindings.get(name).value;
  }
  
  SetMutableBinding(name, value) {
    const binding = this.bindings.get(name);
    if (!binding.mutable) {
      throw new TypeError('Assignment to constant variable');
    }
    binding.value = value;
  }
}

// 2. 对象环境记录（with 语句、全局对象）
class ObjectEnvironmentRecord {
  constructor(bindingObject) {
    this.bindingObject = bindingObject;  // 绑定到一个对象
  }
  
  GetBindingValue(name) {
    return this.bindingObject[name];
  }
  
  SetMutableBinding(name, value) {
    this.bindingObject[name] = value;
  }
}
```

**词法环境的示例**：

```javascript
const x = 10;

function foo() {
  const y = 20;
  
  function bar() {
    const z = 30;
    console.log(x + y + z);
  }
  
  bar();
}

foo();

// 执行 bar 时的词法环境链：
// bar 的词法环境
//   EnvironmentRecord: { z: 30 }
//   outer -> foo 的词法环境
//     EnvironmentRecord: { y: 20 }
//     outer -> 全局词法环境
//       EnvironmentRecord: { x: 10, foo: [Function] }
//       outer -> null
```

### 2. 变量环境（Variable Environment）

变量环境专门用于处理`var`声明和函数声明：

```javascript
function test() {
  console.log(x);  // undefined（提升）
  var x = 1;
  
  console.log(y);  // ReferenceError（TDZ）
  let y = 2;
}

// test 函数的执行上下文：
// VariableEnvironment: { x: undefined }  // var 提升
// LexicalEnvironment: { y: <uninitialized> }  // let 暂时性死区
```

**变量环境与词法环境的关系**：

```javascript
// 在函数执行上下文创建时
function createFunctionContext() {
  const context = new ExecutionContext();
  
  // 初始时，两者指向同一个环境
  const env = new LexicalEnvironment();
  context.LexicalEnvironment = env;
  context.VariableEnvironment = env;
  
  // var 声明在 VariableEnvironment 中创建
  context.VariableEnvironment.CreateMutableBinding('varVariable');
  
  // let/const 声明在 LexicalEnvironment 中创建
  context.LexicalEnvironment.CreateImmutableBinding('constVariable');
  
  return context;
}
```

### 3. this 绑定

`this`的值在执行上下文创建时确定：

```javascript
// 全局上下文
console.log(this);  // window（浏览器）/ global（Node.js）

// 函数上下文
function foo() {
  console.log(this);
}

foo();           // 全局对象（非严格模式）/ undefined（严格模式）
obj.foo();       // obj
foo.call(obj);   // obj
new foo();       // 新创建的对象
```

**this 绑定的存储**：

```javascript
class ExecutionContext {
  constructor(thisValue) {
    this.ThisBinding = thisValue;
  }
  
  GetThisBinding() {
    return this.ThisBinding;
  }
}
```

## 执行上下文的创建过程

### 创建阶段（Creation Phase）

执行上下文在代码执行前创建，分为两个阶段：

**阶段1：创建阶段**

```javascript
// 创建全局执行上下文（简化）
function CreateGlobalExecutionContext() {
  const context = new ExecutionContext();
  
  // 1. 创建全局对象
  const globalObject = CreateGlobalObject();  // window / global
  
  // 2. 创建全局环境记录
  const globalEnv = new LexicalEnvironment();
  globalEnv.EnvironmentRecord = new GlobalEnvironmentRecord(globalObject);
  globalEnv.outer = null;
  
  // 3. 设置词法环境和变量环境
  context.LexicalEnvironment = globalEnv;
  context.VariableEnvironment = globalEnv;
  
  // 4. 设置 this 绑定
  context.ThisBinding = globalObject;
  
  return context;
}
```

**阶段2：绑定创建**

在创建阶段，会处理变量和函数声明：

```javascript
function foo() {
  console.log(x);  // undefined
  var x = 1;
  
  console.log(y);  // ReferenceError
  let y = 2;
  
  bar();  // 可以调用
  function bar() {}
}

// 创建 foo 的执行上下文时：
// 1. 处理函数声明（提升）
//    VariableEnvironment: { bar: [Function] }
//
// 2. 处理 var 声明（提升，初始化为 undefined）
//    VariableEnvironment: { x: undefined }
//
// 3. 处理 let/const 声明（提升，但不初始化）
//    LexicalEnvironment: { y: <uninitialized> }
```

**变量提升的底层实现**：

```javascript
// V8 处理变量声明（简化）
function ProcessVariableDeclarations(code, context) {
  // 扫描代码中的声明
  const declarations = ScanDeclarations(code);
  
  for (const decl of declarations) {
    if (decl.type === 'FunctionDeclaration') {
      // 函数声明：创建并初始化
      const func = CreateFunctionObject(decl);
      context.VariableEnvironment.CreateMutableBinding(decl.name);
      context.VariableEnvironment.InitializeBinding(decl.name, func);
    } else if (decl.type === 'VarDeclaration') {
      // var 声明：创建并初始化为 undefined
      context.VariableEnvironment.CreateMutableBinding(decl.name);
      context.VariableEnvironment.InitializeBinding(decl.name, undefined);
    } else if (decl.type === 'LetDeclaration') {
      // let 声明：创建但不初始化（TDZ）
      context.LexicalEnvironment.CreateMutableBinding(decl.name);
      // 不调用 InitializeBinding，保持未初始化状态
    } else if (decl.type === 'ConstDeclaration') {
      // const 声明：创建但不初始化（TDZ）
      context.LexicalEnvironment.CreateImmutableBinding(decl.name);
    }
  }
}
```

### 执行阶段（Execution Phase）

创建完成后，代码逐行执行：

```javascript
function test() {
  console.log(x);  // undefined（var 已提升）
  var x = 1;       // 执行阶段赋值
  console.log(x);  // 1
  
  console.log(y);  // ReferenceError（TDZ）
  let y = 2;       // 执行到这里才初始化
  console.log(y);  // 2
}

// 执行过程：
// 1. 创建阶段完成，x = undefined, y = <uninitialized>
// 2. console.log(x) -> undefined
// 3. x = 1 -> 更新 x 的值
// 4. console.log(x) -> 1
// 5. console.log(y) -> 访问未初始化的 y，抛出错误
```

## 执行上下文栈（Call Stack）

### 栈的管理

V8使用栈来管理执行上下文：

```javascript
// 执行上下文栈（简化）
class ExecutionContextStack {
  constructor() {
    this.stack = [];
  }
  
  // 压入上下文
  push(context) {
    this.stack.push(context);
  }
  
  // 弹出上下文
  pop() {
    return this.stack.pop();
  }
  
  // 获取当前上下文
  current() {
    return this.stack[this.stack.length - 1];
  }
  
  // 获取栈大小
  size() {
    return this.stack.length;
  }
}

// 全局的执行上下文栈
const ExecutionStack = new ExecutionContextStack();
```

### 栈操作示例

```javascript
// 代码
function first() {
  console.log('First');
  second();
  console.log('First again');
}

function second() {
  console.log('Second');
  third();
  console.log('Second again');
}

function third() {
  console.log('Third');
}

first();

// 执行流程和栈的变化：

// 1. 创建全局执行上下文
// Stack: [GlobalContext]

// 2. 调用 first()，创建并压入 first 的执行上下文
// Stack: [GlobalContext, FirstContext]
// 输出：First

// 3. 调用 second()，创建并压入 second 的执行上下文
// Stack: [GlobalContext, FirstContext, SecondContext]
// 输出：Second

// 4. 调用 third()，创建并压入 third 的执行上下文
// Stack: [GlobalContext, FirstContext, SecondContext, ThirdContext]
// 输出：Third

// 5. third() 执行完成，弹出 ThirdContext
// Stack: [GlobalContext, FirstContext, SecondContext]
// 输出：Second again

// 6. second() 执行完成，弹出 SecondContext
// Stack: [GlobalContext, FirstContext]
// 输出：First again

// 7. first() 执行完成，弹出 FirstContext
// Stack: [GlobalContext]
```

### 栈溢出

递归调用过深会导致栈溢出：

```javascript
function recursion(n) {
  if (n === 0) return;
  recursion(n - 1);
}

// 栈深度有限（V8 默认约 10000-15000 层）
try {
  recursion(100000);
} catch (e) {
  console.log(e);  // RangeError: Maximum call stack size exceeded
}
```

**栈溢出的检测**：

```javascript
// V8 内部的栈溢出检测（简化）
class ExecutionContextStack {
  constructor() {
    this.stack = [];
    this.maxStackSize = 10000;  // 最大栈深度
  }
  
  push(context) {
    if (this.stack.length >= this.maxStackSize) {
      throw new RangeError('Maximum call stack size exceeded');
    }
    this.stack.push(context);
  }
}
```

## 执行上下文的生命周期

### 完整的生命周期

```javascript
function example() {
  var x = 1;
  const y = 2;
  
  function inner() {
    console.log(x, y);
  }
  
  return inner;
}

const closure = example();
closure();

// 1. 调用 example()
//    - 创建 example 的执行上下文
//    - 创建词法环境和变量环境
//    - 处理变量声明（x, y, inner）
//    - 设置 this 绑定
//
// 2. 执行 example 的代码
//    - 初始化 x = 1
//    - 初始化 y = 2
//    - 创建 inner 函数对象，捕获外部环境
//    - 返回 inner
//
// 3. example() 执行完成
//    - 弹出 example 的执行上下文
//    - 但词法环境不会被销毁（闭包引用）
//
// 4. 调用 closure()（即 inner）
//    - 创建 inner 的执行上下文
//    - 通过闭包访问 example 的词法环境
//    - 执行完成后弹出上下文
```

### 词法环境的生命周期

```javascript
// 词法环境的引用计数（简化）
class LexicalEnvironment {
  constructor() {
    this.EnvironmentRecord = new Map();
    this.outer = null;
    this.referenceCount = 0;  // 引用计数
  }
  
  addReference() {
    this.referenceCount++;
  }
  
  removeReference() {
    this.referenceCount--;
    if (this.referenceCount === 0) {
      // 可以被垃圾回收
      this.EnvironmentRecord.clear();
    }
  }
}
```

## 性能优化与最佳实践

### 避免深层递归

使用循环或尾递归优化：

```javascript
// ❌ 深层递归
function factorial(n) {
  if (n <= 1) return 1;
  return n * factorial(n - 1);
}

// ✅ 循环
function factorial(n) {
  let result = 1;
  for (let i = 2; i <= n; i++) {
    result *= i;
  }
  return result;
}

// ✅ 尾递归（需要引擎支持）
function factorial(n, acc = 1) {
  if (n <= 1) return acc;
  return factorial(n - 1, n * acc);
}
```

### 减少闭包创建

避免在循环中创建闭包：

```javascript
// ❌ 每次循环创建新闭包
const callbacks = [];
for (var i = 0; i < 1000; i++) {
  callbacks.push(function() {
    console.log(i);
  });
}

// ✅ 使用 let（块级作用域）
const callbacks = [];
for (let i = 0; i < 1000; i++) {
  callbacks.push(function() {
    console.log(i);
  });
}

// ✅ 提取函数
function createCallback(value) {
  return function() {
    console.log(value);
  };
}

const callbacks = [];
for (let i = 0; i < 1000; i++) {
  callbacks.push(createCallback(i));
}
```

### 优化变量访问

尽量使用局部变量：

```javascript
// ❌ 频繁访问全局变量
const THRESHOLD = 100;
function process(arr) {
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > THRESHOLD) {  // 每次都查找全局作用域
      // ...
    }
  }
}

// ✅ 缓存到局部变量
function process(arr) {
  const threshold = THRESHOLD;  // 局部变量，访问更快
  for (let i = 0; i < arr.length; i++) {
    if (arr[i] > threshold) {
      // ...
    }
  }
}
```

### 避免 with 和 eval

这些特性会阻止优化：

```javascript
// ❌ with 动态修改作用域
with (obj) {
  // 无法优化，所有变量访问都可能是 obj 的属性
  x = 1;
}

// ❌ eval 动态执行代码
function test() {
  eval('var x = 1');  // 无法在编译时优化
  console.log(x);
}

// ✅ 直接访问对象属性
obj.x = 1;

// ✅ 使用 Function 构造函数（更安全）
const fn = new Function('a', 'b', 'return a + b');
```

## 本章小结

本章深入探讨了V8引擎中执行上下文的实现机制：

1. **执行上下文的组成**：包括词法环境、变量环境和this绑定三个核心组件，分别负责管理不同类型的变量声明和this的值。

2. **创建与执行阶段**：执行上下文在代码执行前创建，分为创建阶段（处理声明、建立绑定）和执行阶段（执行代码、赋值操作），这解释了变量提升的本质。

3. **执行上下文栈**：V8使用栈来管理执行上下文的创建和销毁，理解栈的工作机制有助于调试递归问题和理解调用栈。

4. **词法环境的链式结构**：通过outer引用形成作用域链，实现了变量的逐层查找机制，这是闭包和作用域的基础。

5. **性能优化**：避免深层递归、减少不必要的闭包创建、优化变量访问路径，都能提升代码执行效率。

理解执行上下文的底层实现，能够帮助我们更好地理解JavaScript的执行机制，编写更高效的代码，并在遇到作用域、闭包、this等问题时快速定位原因。下一章将深入探讨作用域链的底层实现机制。
