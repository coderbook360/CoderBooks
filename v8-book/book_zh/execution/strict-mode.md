# 严格模式：底层实现与性能影响

你是否注意到在函数开头加上`'use strict'`后，某些原本"可以运行"的代码会抛出错误？为什么严格模式下`this`的行为不同？严格模式真的会影响性能吗？

严格模式是ES5引入的重要特性，它不仅改变了JavaScript的语义行为，也影响了V8引擎的优化策略。本章将深入探讨严格模式的底层实现机制和性能影响。

## 严格模式的启用方式

严格模式可以在全局作用域或函数作用域启用：

```javascript
// 全局严格模式
'use strict';

function globalStrict() {
  // 此函数在严格模式下运行
  console.log(this);  // undefined（非严格模式下是全局对象）
}

// 函数级严格模式
function functionStrict() {
  'use strict';
  // 只有这个函数在严格模式下运行
  console.log(this);  // undefined
}

function nonStrict() {
  // 这个函数不在严格模式下
  console.log(this);  // 全局对象
}

globalStrict();
functionStrict();
nonStrict();
```

V8在解析阶段就会检测严格模式指令：

```javascript
// 模拟V8的严格模式检测
class StrictModeDetector {
  static parseFunction(code) {
    // 获取函数体的第一个语句
    const firstStatement = this.getFirstStatement(code);
    
    // 检查是否是"use strict"指令
    const isStrict = this.isUseStrictDirective(firstStatement);
    
    return {
      code: code,
      isStrict: isStrict,
      // V8会在函数对象中存储strict标志
      strictFlag: isStrict
    };
  }
  
  static getFirstStatement(code) {
    // 跳过空白和注释，获取第一条语句
    const trimmed = code.trim();
    const match = trimmed.match(/^['"]use strict['"];?/);
    return match ? match[0] : null;
  }
  
  static isUseStrictDirective(statement) {
    if (!statement) return false;
    return statement === "'use strict';" || 
           statement === '"use strict";' ||
           statement === "'use strict'" ||
           statement === '"use strict"';
  }
}

// 测试
const func1 = `'use strict'; console.log('strict');`;
const func2 = `console.log('not strict');`;

console.log(StrictModeDetector.parseFunction(func1).isStrict);  // true
console.log(StrictModeDetector.parseFunction(func2).isStrict);  // false
```

## 严格模式的语义变化

严格模式改变了JavaScript的多项行为：

### 1. 禁止意外创建全局变量

```javascript
function testGlobalVariable() {
  'use strict';
  
  // 非严格模式：创建全局变量
  // 严格模式：抛出ReferenceError
  try {
    undeclaredVar = 42;
  } catch (e) {
    console.log('Error:', e.message);  // undeclaredVar is not defined
  }
}

testGlobalVariable();
```

V8实现：

```javascript
// 模拟V8的变量赋值检查
class StrictModeAssignment {
  static assignVariable(name, value, context) {
    // 查找变量绑定
    const binding = context.findBinding(name);
    
    if (!binding) {
      if (context.isStrict) {
        // 严格模式：抛出错误
        throw new ReferenceError(`${name} is not defined`);
      } else {
        // 非严格模式：创建全局变量
        context.global[name] = value;
      }
    } else {
      // 变量存在，正常赋值
      binding.value = value;
    }
  }
}
```

### 2. this绑定的差异

```javascript
function testThis() {
  'use strict';
  console.log(this);
}

// 严格模式下，独立调用this为undefined
testThis();  // undefined

// 非严格模式下，this为全局对象
function nonStrictThis() {
  console.log(this);
}
nonStrictThis();  // 全局对象

// call/apply传入null/undefined
testThis.call(null);       // null（严格模式）
testThis.call(undefined);  // undefined（严格模式）

nonStrictThis.call(null);       // 全局对象（非严格模式）
nonStrictThis.call(undefined);  // 全局对象（非严格模式）
```

V8的this绑定实现：

```javascript
// 模拟V8的this绑定处理
class StrictModeThisBinding {
  static resolveThis(thisArg, isStrict) {
    if (isStrict) {
      // 严格模式：直接使用传入的this值
      return thisArg;
    } else {
      // 非严格模式：转换null/undefined为全局对象
      if (thisArg === null || thisArg === undefined) {
        return globalThis;
      }
      // 原始值包装为对象
      return Object(thisArg);
    }
  }
}

// 测试
console.log(StrictModeThisBinding.resolveThis(undefined, true));   // undefined
console.log(StrictModeThisBinding.resolveThis(undefined, false));  // 全局对象
console.log(StrictModeThisBinding.resolveThis(42, true));          // 42
console.log(StrictModeThisBinding.resolveThis(42, false));         // Number(42)
```

### 3. 禁止删除不可配置的属性

```javascript
'use strict';

const obj = {};
Object.defineProperty(obj, 'fixed', {
  value: 42,
  configurable: false
});

try {
  delete obj.fixed;  // 严格模式：TypeError
} catch (e) {
  console.log('Error:', e.message);  // Cannot delete property 'fixed'
}

// 非严格模式下返回false，但不抛出错误
```

### 4. 禁止重复参数名

```javascript
// 非严格模式：允许（后者覆盖前者）
function nonStrictDuplicateParams(a, a) {
  console.log(a);  // 使用第二个a
}
nonStrictDuplicateParams(1, 2);  // 2

// 严格模式：语法错误
try {
  eval(`
    'use strict';
    function strictDuplicateParams(a, a) {
      console.log(a);
    }
  `);
} catch (e) {
  console.log('Syntax Error: Duplicate parameter name not allowed');
}
```

### 5. 禁止八进制字面量

```javascript
// 非严格模式：八进制
const nonStrictOctal = 0755;  // 493 (十进制)
console.log(nonStrictOctal);

// 严格模式：语法错误
try {
  eval(`
    'use strict';
    const strictOctal = 0755;
  `);
} catch (e) {
  console.log('Syntax Error: Octal literals are not allowed in strict mode');
}

// 严格模式允许的八进制语法
'use strict';
const es6Octal = 0o755;  // 使用0o前缀
console.log(es6Octal);  // 493
```

### 6. with语句被禁用

```javascript
const obj = { x: 10 };

// 非严格模式：with可用
with (obj) {
  console.log(x);  // 10
}

// 严格模式：语法错误
try {
  eval(`
    'use strict';
    with (obj) {
      console.log(x);
    }
  `);
} catch (e) {
  console.log('Syntax Error: with statement not allowed in strict mode');
}
```

### 7. eval的作用域隔离

```javascript
function testEvalScope() {
  'use strict';
  
  // 严格模式：eval有自己的作用域
  eval('var evalVar = 42');
  try {
    console.log(evalVar);  // ReferenceError
  } catch (e) {
    console.log('evalVar not accessible');
  }
}

function nonStrictEvalScope() {
  // 非严格模式：eval污染外层作用域
  eval('var evalVar = 42');
  console.log(evalVar);  // 42
}

testEvalScope();
nonStrictEvalScope();
```

## V8中的严格模式实现

V8在多个层面实现严格模式：

```javascript
// 模拟V8的函数对象结构
class V8Function {
  constructor(code, isStrict) {
    this.code = code;
    this.isStrict = isStrict;  // 严格模式标志
    
    // 生成不同的字节码
    this.bytecode = this.compileToBytecode(code, isStrict);
  }
  
  compileToBytecode(code, isStrict) {
    if (isStrict) {
      return {
        // 严格模式字节码
        thisMode: 'strict',           // this不转换
        globalAssign: 'error',        // 未声明变量赋值报错
        deleteNonConfigurable: 'error', // 删除不可配置属性报错
        evalScope: 'isolated'         // eval有独立作用域
      };
    } else {
      return {
        // 非严格模式字节码
        thisMode: 'coerce',           // this转换为对象
        globalAssign: 'create',       // 创建全局变量
        deleteNonConfigurable: 'silent', // 静默失败
        evalScope: 'shared'           // eval共享作用域
      };
    }
  }
  
  call(thisArg, args) {
    // 根据严格模式处理this
    const effectiveThis = this.isStrict 
      ? thisArg 
      : this.coerceThis(thisArg);
    
    return this.code.execute(effectiveThis, args);
  }
  
  coerceThis(thisArg) {
    if (thisArg === null || thisArg === undefined) {
      return globalThis;
    }
    return Object(thisArg);
  }
}
```

## 严格模式的性能影响

严格模式对性能的影响主要体现在以下方面：

### 1. 减少运行时检查

```javascript
// 性能测试：this绑定
function performanceTestThis() {
  const iterations = 10000000;
  
  // 严格模式函数
  function strictFunc() {
    'use strict';
    return this;
  }
  
  // 非严格模式函数
  function nonStrictFunc() {
    return this;
  }
  
  console.time('strict this');
  for (let i = 0; i < iterations; i++) {
    strictFunc.call(undefined);
  }
  console.timeEnd('strict this');
  
  console.time('non-strict this');
  for (let i = 0; i < iterations; i++) {
    nonStrictFunc.call(undefined);
  }
  console.timeEnd('non-strict this');
}

performanceTestThis();
// 严格模式略快（省去this转换）
// strict this: ~30ms
// non-strict this: ~35ms
```

### 2. 优化器友好

```javascript
// 严格模式允许更激进的优化
'use strict';

function optimizable(a, b) {
  // 严格模式：参数名不重复，优化器可以安全优化
  return a + b;
}

// V8可以进行的优化：
// 1. 内联函数调用
// 2. 寄存器分配优化
// 3. 消除冗余检查
```

### 3. 避免arguments性能陷阱

```javascript
function testArguments() {
  const iterations = 1000000;
  
  // 严格模式：arguments不与参数绑定
  function strictArgs(a, b) {
    'use strict';
    return arguments[0] + arguments[1];
  }
  
  // 非严格模式：arguments与参数绑定
  function nonStrictArgs(a, b) {
    return arguments[0] + arguments[1];
  }
  
  console.time('strict arguments');
  for (let i = 0; i < iterations; i++) {
    strictArgs(1, 2);
  }
  console.timeEnd('strict arguments');
  
  console.time('non-strict arguments');
  for (let i = 0; i < iterations; i++) {
    nonStrictArgs(1, 2);
  }
  console.timeEnd('non-strict arguments');
}

testArguments();
// 严格模式更快（参数不需要同步到arguments）
```

### 4. 禁用with提升性能

```javascript
// with语句阻止优化
function nonStrictWith(obj) {
  let sum = 0;
  with (obj) {
    // V8无法优化：变量查找是动态的
    for (let i = 0; i < 1000; i++) {
      sum += value || 0;
    }
  }
  return sum;
}

// 严格模式禁用with，允许优化
function strictVersion(obj) {
  'use strict';
  let sum = 0;
  const value = obj.value || 0;
  for (let i = 0; i < 1000; i++) {
    sum += value;
  }
  return sum;
}
```

## 模块中的隐式严格模式

ES6模块自动启用严格模式，无需显式声明：

```javascript
// module.js - 自动严格模式
export function moduleFunc() {
  // 无需'use strict'
  console.log(this);  // undefined
  
  // 意外赋值会报错
  // undeclaredVar = 42;  // ReferenceError
}

// V8对模块的处理
class V8Module {
  constructor(code) {
    this.code = code;
    // 模块总是严格模式
    this.isStrict = true;
    this.bytecode = this.compile(code, true);
  }
  
  compile(code, isStrict) {
    // 生成严格模式字节码
    return {
      strictMode: true,
      exports: this.parseExports(code),
      imports: this.parseImports(code)
    };
  }
  
  parseExports(code) {
    // 解析export声明
    return [];
  }
  
  parseImports(code) {
    // 解析import声明
    return [];
  }
}
```

## 类中的隐式严格模式

ES6类的代码自动在严格模式下运行：

```javascript
class MyClass {
  constructor() {
    // 类内部自动严格模式
    console.log(this);  // MyClass实例，不会是全局对象
  }
  
  method() {
    // 方法也在严格模式下
    console.log(this);  // undefined（如果直接调用）
  }
}

const obj = new MyClass();
const method = obj.method;
method();  // undefined（严格模式行为）
```

## 最佳实践

基于对严格模式的理解，我们可以总结出以下最佳实践：

### 1. 始终使用严格模式

```javascript
// 推荐：文件开头启用严格模式
'use strict';

// 或在每个函数中启用
function myFunction() {
  'use strict';
  // 函数代码
}
```

### 2. 使用模块和类

```javascript
// 推荐：使用ES6模块（自动严格模式）
export function myFunc() {
  // 自动严格模式
}

// 推荐：使用类（自动严格模式）
class MyClass {
  // 自动严格模式
}
```

### 3. 避免严格模式陷阱

```javascript
// 注意：字符串连接可能破坏严格模式
const code1 = "'use strict';";
const code2 = "var x = 10;";
// eval(code1 + code2); // 严格模式生效

const code3 = "var x = 10; 'use strict';";
// eval(code3); // 严格模式不生效（不是第一条语句）
```

### 4. 利用严格模式的错误检测

```javascript
'use strict';

// 严格模式帮助发现错误
function detectErrors() {
  // 拼写错误会被捕获
  // thiis = 42;  // ReferenceError
  
  // 删除不可删除的属性
  // delete Object.prototype;  // TypeError
  
  // 给只读属性赋值
  const obj = {};
  Object.defineProperty(obj, 'x', {
    value: 42,
    writable: false
  });
  // obj.x = 100;  // TypeError
}
```

## 本章小结

本章深入探讨了严格模式的底层实现与性能影响。我们学习了以下核心内容：

1. **启用方式**：可以在全局或函数级启用，ES6模块和类自动启用严格模式。

2. **语义变化**：禁止意外全局变量、改变this绑定、禁止删除不可配置属性、禁用with等。

3. **V8实现**：在解析阶段检测严格模式指令，生成不同的字节码，运行时根据严格模式标志执行不同的逻辑。

4. **性能影响**：严格模式减少运行时检查、允许更激进的优化、避免arguments和with的性能陷阱，整体上有利于性能。

5. **最佳实践**：始终使用严格模式，优先使用ES6模块和类，利用严格模式的错误检测能力。

理解严格模式的工作原理，能够帮助你写出更安全、更高效的代码，避免常见的JavaScript陷阱。在下一章中，我们将探讨with和eval的动态作用域特性及其性能代价。
