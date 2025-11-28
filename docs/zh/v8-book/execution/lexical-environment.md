# 词法环境与变量环境：let/const 与 var 的区别

为什么用`let`声明的变量不能在声明前访问，而`var`可以？为什么`const`声明的变量不能重新赋值？块级作用域是如何实现的？这些ES6引入的新特性，背后都有着不同于`var`的底层机制。

在前面的章节中，我们学习了执行上下文包含词法环境（Lexical Environment）和变量环境（Variable Environment）两个组件。本章将深入探讨这两个环境的区别，以及V8如何通过它们实现`let`/`const`与`var`的不同行为。

## 词法环境与变量环境的概念

在ECMAScript规范中，每个执行上下文都包含两个环境组件：

- **词法环境（Lexical Environment）**：用于存储`let`、`const`、`class`声明的标识符
- **变量环境（Variable Environment）**：用于存储`var`和`function`声明的标识符

让我们通过一个简单的例子来理解它们的区别：

```javascript
function example() {
  var varVariable = 'var';
  let letVariable = 'let';
  const constVariable = 'const';
  
  console.log(varVariable);    // 'var'
  console.log(letVariable);    // 'let'
  console.log(constVariable);  // 'const'
}

example();
```

在V8内部，这个函数的执行上下文结构如下：

```javascript
// 执行上下文的简化表示
const executionContext = {
  // 词法环境：存储let/const
  lexicalEnvironment: {
    environmentRecord: {
      letVariable: 'let',
      constVariable: 'const'
    },
    outer: globalLexicalEnvironment
  },
  
  // 变量环境：存储var
  variableEnvironment: {
    environmentRecord: {
      varVariable: 'var'
    },
    outer: globalVariableEnvironment
  },
  
  thisBinding: globalThis
};
```

初看起来，这两个环境似乎只是存储不同声明方式的变量。但实际上，它们的行为有着本质的区别。

## 变量提升与暂时性死区

`var`和`let`/`const`最显著的区别就是变量提升（Hoisting）和暂时性死区（Temporal Dead Zone，TDZ）：

```javascript
function demonstrateHoisting() {
  // var: 可以在声明前访问（值为undefined）
  console.log(varValue);  // undefined
  var varValue = 'var';
  
  // let: 访问会抛出ReferenceError
  try {
    console.log(letValue);  // ReferenceError
  } catch (e) {
    console.log('Error:', e.message);
  }
  let letValue = 'let';
  
  // const: 同样存在TDZ
  try {
    console.log(constValue);  // ReferenceError
  } catch (e) {
    console.log('Error:', e.message);
  }
  const constValue = 'const';
}

demonstrateHoisting();
```

V8如何实现这种差异？让我们深入环境记录的创建过程：

```javascript
// 模拟V8的环境记录创建
class EnvironmentRecord {
  constructor() {
    this.bindings = new Map();
  }
  
  // var声明：创建并初始化为undefined
  createVarBinding(name) {
    this.bindings.set(name, {
      value: undefined,
      initialized: true,
      mutable: true
    });
  }
  
  // let声明：创建但不初始化（TDZ状态）
  createLetBinding(name) {
    this.bindings.set(name, {
      value: undefined,
      initialized: false,  // TDZ状态
      mutable: true
    });
  }
  
  // const声明：创建但不初始化，且不可变
  createConstBinding(name) {
    this.bindings.set(name, {
      value: undefined,
      initialized: false,  // TDZ状态
      mutable: false       // 不可重新赋值
    });
  }
  
  // 获取绑定的值
  getBinding(name) {
    const binding = this.bindings.get(name);
    if (!binding) {
      throw new ReferenceError(`${name} is not defined`);
    }
    if (!binding.initialized) {
      throw new ReferenceError(`Cannot access '${name}' before initialization`);
    }
    return binding.value;
  }
  
  // 初始化绑定
  initializeBinding(name, value) {
    const binding = this.bindings.get(name);
    if (!binding) {
      throw new ReferenceError(`${name} is not defined`);
    }
    binding.value = value;
    binding.initialized = true;
  }
  
  // 设置绑定的值
  setBinding(name, value) {
    const binding = this.bindings.get(name);
    if (!binding) {
      throw new ReferenceError(`${name} is not defined`);
    }
    if (!binding.initialized) {
      throw new ReferenceError(`Cannot access '${name}' before initialization`);
    }
    if (!binding.mutable) {
      throw new TypeError(`Assignment to constant variable`);
    }
    binding.value = value;
  }
}
```

这个实现揭示了TDZ的本质：`let`/`const`声明的变量在创建时处于未初始化状态，任何访问都会抛出错误，直到执行到声明语句才完成初始化。

## 块级作用域的实现

`let`和`const`支持块级作用域，而`var`只有函数作用域。V8如何实现这种差异？

```javascript
function blockScopeDemo() {
  var functionScoped = 'outer';
  
  {
    var functionScoped = 'inner';  // 覆盖外层的var
    let blockScoped = 'inner';     // 创建新的块级作用域
    
    console.log(functionScoped);  // 'inner'
    console.log(blockScoped);     // 'inner'
  }
  
  console.log(functionScoped);    // 'inner' - var被覆盖
  // console.log(blockScoped);    // ReferenceError - 块级作用域已销毁
}

blockScopeDemo();
```

V8为每个块创建新的词法环境，形成嵌套的环境链：

```javascript
// 模拟块级作用域的环境创建
class BlockEnvironment {
  // 进入块时创建新的词法环境
  static enterBlock(parentEnv) {
    return {
      environmentRecord: new EnvironmentRecord(),
      outer: parentEnv  // 指向父环境
    };
  }
  
  // 离开块时恢复父环境
  static exitBlock(blockEnv) {
    return blockEnv.outer;
  }
}

// 模拟函数执行
function simulateBlockScope() {
  // 函数级环境
  const functionEnv = {
    variableEnvironment: new EnvironmentRecord(),
    lexicalEnvironment: new EnvironmentRecord(),
    outer: null
  };
  
  // var声明：添加到变量环境
  functionEnv.variableEnvironment.createVarBinding('functionScoped');
  functionEnv.variableEnvironment.setBinding('functionScoped', 'outer');
  
  // 进入块：创建新的词法环境
  const blockEnv = BlockEnvironment.enterBlock(functionEnv.lexicalEnvironment);
  
  // let声明：添加到块级词法环境
  blockEnv.environmentRecord.createLetBinding('blockScoped');
  blockEnv.environmentRecord.initializeBinding('blockScoped', 'inner');
  
  // var在块内：仍然添加到函数级变量环境
  functionEnv.variableEnvironment.setBinding('functionScoped', 'inner');
  
  console.log('Inside block:');
  console.log('functionScoped:', 
    functionEnv.variableEnvironment.getBinding('functionScoped'));  // 'inner'
  console.log('blockScoped:', 
    blockEnv.environmentRecord.getBinding('blockScoped'));  // 'inner'
  
  // 离开块
  const afterBlock = BlockEnvironment.exitBlock(blockEnv);
  
  console.log('\nAfter block:');
  console.log('functionScoped:', 
    functionEnv.variableEnvironment.getBinding('functionScoped'));  // 'inner'
  // blockScoped不再可访问
}

simulateBlockScope();
```

这个实现展示了关键机制：`var`声明无论在哪里都添加到函数级的变量环境，而`let`/`const`添加到当前块的词法环境。

## for循环中的块级作用域

`let`在`for`循环中的表现是块级作用域最经典的应用场景：

```javascript
// var版本：所有函数共享同一个i
function varForLoop() {
  const functions = [];
  for (var i = 0; i < 3; i++) {
    functions.push(function() {
      return i;
    });
  }
  return functions;
}

const varFuncs = varForLoop();
console.log(varFuncs[0]());  // 3
console.log(varFuncs[1]());  // 3
console.log(varFuncs[2]());  // 3

// let版本：每次迭代创建新的绑定
function letForLoop() {
  const functions = [];
  for (let i = 0; i < 3; i++) {
    functions.push(function() {
      return i;
    });
  }
  return functions;
}

const letFuncs = letForLoop();
console.log(letFuncs[0]());  // 0
console.log(letFuncs[1]());  // 1
console.log(letFuncs[2]());  // 2
```

V8对`let`在`for`循环中的处理非常特殊：

```javascript
// 模拟for循环的环境创建
class ForLoopEnvironment {
  // for (let i = 0; i < 3; i++) 的实现
  static executeForLoop(initExpr, testExpr, updateExpr, bodyFunc) {
    // 1. 创建循环外层环境（用于初始化表达式）
    const outerEnv = new EnvironmentRecord();
    
    // 2. 执行初始化：let i = 0
    outerEnv.createLetBinding('i');
    outerEnv.initializeBinding('i', initExpr());
    
    const results = [];
    
    // 3. 循环迭代
    while (testExpr(outerEnv.getBinding('i'))) {
      // 每次迭代创建新的环境（关键！）
      const iterationEnv = new EnvironmentRecord();
      
      // 复制循环变量到迭代环境
      const currentI = outerEnv.getBinding('i');
      iterationEnv.createLetBinding('i');
      iterationEnv.initializeBinding('i', currentI);
      
      // 在迭代环境中执行循环体
      const result = bodyFunc(iterationEnv);
      results.push(result);
      
      // 更新外层环境的i
      const newI = updateExpr(outerEnv.getBinding('i'));
      outerEnv.setBinding('i', newI);
    }
    
    return results;
  }
}

// 使用示例
const functions = ForLoopEnvironment.executeForLoop(
  () => 0,                        // init: let i = 0
  (i) => i < 3,                   // test: i < 3
  (i) => i + 1,                   // update: i++
  (env) => () => env.getBinding('i')  // body: () => i
);

console.log(functions[0]());  // 0
console.log(functions[1]());  // 1
console.log(functions[2]());  // 2
```

这个实现揭示了`let`在`for`循环中的魔法：每次迭代都创建新的词法环境，并将循环变量复制到新环境中。这样每个闭包捕获的都是独立的变量绑定。

## const的不可变性

`const`声明的变量不能重新赋值，但这并不意味着值本身不可变：

```javascript
// const阻止的是重新赋值
const primitive = 42;
// primitive = 100;  // TypeError: Assignment to constant variable

// 对象的属性仍然可以修改
const obj = { value: 42 };
obj.value = 100;  // 允许
console.log(obj.value);  // 100

// 但不能重新赋值整个对象
// obj = { value: 200 };  // TypeError

// 数组同理
const arr = [1, 2, 3];
arr.push(4);  // 允许
arr[0] = 10;  // 允许
console.log(arr);  // [10, 2, 3, 4]

// 但不能重新赋值
// arr = [5, 6, 7];  // TypeError
```

V8通过环境记录中的`mutable`标志来实现这一特性：

```javascript
// 完整的环境记录实现
class CompleteEnvironmentRecord {
  constructor() {
    this.bindings = new Map();
  }
  
  createBinding(name, kind) {
    const binding = {
      value: undefined,
      initialized: kind === 'var',  // var立即初始化
      mutable: kind !== 'const',    // const不可变
      kind: kind                    // 'var', 'let', 'const'
    };
    this.bindings.set(name, binding);
  }
  
  initializeBinding(name, value) {
    const binding = this.bindings.get(name);
    if (!binding) {
      throw new ReferenceError(`${name} is not defined`);
    }
    if (binding.kind === 'const' && binding.initialized) {
      throw new TypeError(`Cannot re-initialize constant`);
    }
    binding.value = value;
    binding.initialized = true;
  }
  
  setBinding(name, value) {
    const binding = this.bindings.get(name);
    if (!binding) {
      throw new ReferenceError(`${name} is not defined`);
    }
    if (!binding.initialized) {
      throw new ReferenceError(`Cannot access '${name}' before initialization`);
    }
    if (!binding.mutable) {
      throw new TypeError(`Assignment to constant variable`);
    }
    binding.value = value;
  }
  
  getBinding(name) {
    const binding = this.bindings.get(name);
    if (!binding) {
      throw new ReferenceError(`${name} is not defined`);
    }
    if (!binding.initialized) {
      throw new ReferenceError(`Cannot access '${name}' before initialization`);
    }
    return binding.value;
  }
}

// 测试const行为
const env = new CompleteEnvironmentRecord();

// 创建const绑定
env.createBinding('myConst', 'const');
env.initializeBinding('myConst', { value: 42 });

// 读取值
console.log(env.getBinding('myConst'));  // { value: 42 }

// 修改对象属性（允许）
const obj = env.getBinding('myConst');
obj.value = 100;
console.log(env.getBinding('myConst'));  // { value: 100 }

// 尝试重新赋值（抛出错误）
try {
  env.setBinding('myConst', { value: 200 });
} catch (e) {
  console.log('Error:', e.message);  // Assignment to constant variable
}
```

## 性能影响与优化

不同的声明方式对性能有不同的影响：

```javascript
// 性能测试
function performanceTest() {
  const iterations = 10000000;
  
  // 测试1：var访问
  console.time('var access');
  function testVar() {
    var x = 0;
    for (var i = 0; i < iterations; i++) {
      x += i;
    }
    return x;
  }
  testVar();
  console.timeEnd('var access');
  
  // 测试2：let访问
  console.time('let access');
  function testLet() {
    let x = 0;
    for (let i = 0; i < iterations; i++) {
      x += i;
    }
    return x;
  }
  testLet();
  console.timeEnd('let access');
  
  // 测试3：const访问
  console.time('const access');
  function testConst() {
    let x = 0;
    for (let i = 0; i < iterations; i++) {
      const j = i;  // const在循环内
      x += j;
    }
    return x;
  }
  testConst();
  console.timeEnd('const access');
}

performanceTest();
// 结果：现代V8中性能差异很小（通常在5%以内）
// V8已经对let/const进行了充分优化
```

V8的优化策略包括：

1. **环境记录的扁平化存储**：将环境记录转换为固定偏移量的数组访问
2. **TDZ检查的消除**：编译器可以静态分析并消除不必要的TDZ检查
3. **const的优化**：对于never reassigned的变量，V8可能直接内联其值

## 最佳实践

基于对词法环境和变量环境的理解，我们可以总结出以下最佳实践：

### 1. 优先使用const

```javascript
// 推荐：明确表达不可变意图
const MAX_SIZE = 100;
const config = { timeout: 5000 };

// 不推荐：使用let但从未重新赋值
let maxSize = 100;  // 应该用const
```

### 2. 需要重新赋值时使用let

```javascript
// 正确使用let
let count = 0;
for (let i = 0; i < 10; i++) {
  count += i;
}

// 循环变量用let
for (let item of items) {
  process(item);
}
```

### 3. 避免使用var

```javascript
// 不推荐：var的函数作用域容易出错
function oldStyle() {
  if (condition) {
    var x = 1;  // x在整个函数作用域可见
  }
  console.log(x);  // undefined或1（容易混淆）
}

// 推荐：let的块级作用域更清晰
function modernStyle() {
  if (condition) {
    let x = 1;  // x只在if块内可见
  }
  // console.log(x);  // ReferenceError（更早发现错误）
}
```

### 4. 利用TDZ捕获错误

```javascript
// TDZ帮助发现逻辑错误
function processData() {
  // 错误：在声明前使用
  // console.log(data);  // ReferenceError
  
  let data = fetchData();
  // 正确的使用位置
  console.log(data);
}
```

### 5. 块级作用域隔离变量

```javascript
// 推荐：使用块限制变量作用域
function processItems(items) {
  for (let i = 0; i < items.length; i++) {
    // 临时变量限制在循环内
    const item = items[i];
    const processed = transform(item);
    save(processed);
  }
  // i, item, processed都不可访问（清晰的作用域边界）
}
```

## 全局作用域的特殊处理

全局作用域中的`var`和`let`/`const`有显著不同：

```javascript
// 全局var：创建全局对象的属性
var globalVar = 'var';
console.log(window.globalVar);  // 'var'（浏览器环境）
console.log(global.globalVar);  // 'var'（Node.js环境）

// 全局let/const：不创建全局对象属性
let globalLet = 'let';
const globalConst = 'const';
console.log(window.globalLet);    // undefined
console.log(window.globalConst);  // undefined
```

V8在全局作用域使用不同的环境记录实现：

```javascript
// 模拟全局作用域的环境
class GlobalEnvironment {
  constructor(globalObject) {
    this.globalObject = globalObject;  // window或global
    
    // 全局变量环境：var和function
    this.variableEnvironment = {
      environmentRecord: new ObjectEnvironmentRecord(globalObject)
    };
    
    // 全局词法环境：let和const
    this.lexicalEnvironment = {
      environmentRecord: new DeclarativeEnvironmentRecord()
    };
  }
}

// 对象环境记录：直接操作全局对象
class ObjectEnvironmentRecord {
  constructor(bindingObject) {
    this.bindingObject = bindingObject;
  }
  
  createBinding(name) {
    // var在全局对象上创建属性
    this.bindingObject[name] = undefined;
  }
  
  setBinding(name, value) {
    this.bindingObject[name] = value;
  }
  
  getBinding(name) {
    return this.bindingObject[name];
  }
}

// 声明式环境记录：独立存储
class DeclarativeEnvironmentRecord {
  constructor() {
    this.bindings = new Map();
  }
  
  createBinding(name, kind) {
    this.bindings.set(name, {
      value: undefined,
      initialized: false,
      mutable: kind !== 'const'
    });
  }
  
  // ... 其他方法同前
}
```

这种设计确保了`let`/`const`不污染全局对象，同时保持了`var`的向后兼容性。

## 本章小结

本章深入探讨了词法环境与变量环境的底层实现机制。我们学习了以下核心内容：

1. **两种环境的区别**：词法环境存储`let`/`const`，变量环境存储`var`，它们在作用域和初始化行为上有本质差异。

2. **TDZ机制**：`let`/`const`在声明前处于未初始化状态，访问会抛出ReferenceError，这是通过环境记录的`initialized`标志实现的。

3. **块级作用域**：每个块创建新的词法环境，形成嵌套的环境链。`for`循环中的`let`每次迭代创建新绑定。

4. **const的不可变性**：通过环境记录的`mutable`标志实现，阻止重新赋值但不影响对象属性的修改。

5. **性能优化**：现代V8对`let`/`const`进行了充分优化，性能差异很小。应优先使用`const`，需要重新赋值时使用`let`，避免使用`var`。

理解这些底层机制，能够帮助你写出更安全、更易维护的代码，避免作用域相关的常见错误。在下一章中，我们将探讨`new`操作符的底层实现，理解对象创建和构造函数调用的完整过程。
