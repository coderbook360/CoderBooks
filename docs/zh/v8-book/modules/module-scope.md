# 模块作用域：import/export 的底层实现

为什么模块中声明的变量不会污染全局作用域？`import`声明的变量为何不能被重新赋值？`export`的值是如何与`import`同步更新的？

```javascript
// module.js
const secret = 'private';  // 外部无法访问
export let counter = 0;    // 只读导出

// main.js
import { counter } from './module.js';
console.log(counter);  // 0
counter = 10;          // TypeError: Assignment to constant variable
console.log(secret);   // ReferenceError: secret is not defined
```

这些行为的背后，是V8为每个模块创建的**模块环境记录**（Module Environment Record）和**词法环境**（Lexical Environment）机制。与全局作用域和函数作用域不同，模块作用域具有独特的绑定规则和导入导出的特殊处理。

本章将深入V8引擎，揭示模块作用域的实现机制、import/export的底层绑定关系、命名空间对象的创建、以及各种导入导出语法的处理细节。

## 模块环境记录

### 环境记录的层次结构

V8使用**环境记录**（Environment Record）来管理作用域中的变量绑定：

```
全局环境记录（Global Environment Record）
  ├─ 对象环境记录（Object Environment Record）：window/global
  └─ 声明式环境记录（Declarative Environment Record）：let/const

函数环境记录（Function Environment Record）
  └─ 声明式环境记录

模块环境记录（Module Environment Record）
  └─ 声明式环境记录 + 特殊的导入绑定
```

**模块环境记录的特殊性**：

1. **继承自声明式环境记录**：支持`let`/`const`/`var`绑定。
2. **支持导入绑定**：`import`声明创建不可变的间接绑定。
3. **支持导出绑定**：`export`声明标记可导出的绑定。
4. **外部环境为全局环境**：不是`null`，可以访问全局对象。

### 模块环境记录的数据结构

V8内部的模块环境记录（简化）：

```javascript
class ModuleEnvironmentRecord extends DeclarativeEnvironmentRecord {
  constructor() {
    super();
    this.bindings = new Map();        // 本地绑定
    this.importBindings = new Map();  // 导入绑定（间接）
    this.exportBindings = new Set();  // 导出的绑定名称
    this.outerEnv = globalEnv;        // 外部环境（全局）
  }
  
  // 创建不可变导入绑定
  CreateImportBinding(name, module, importName) {
    // 检查绑定是否已存在
    if (this.bindings.has(name) || this.importBindings.has(name)) {
      throw new SyntaxError(`Identifier '${name}' has already been declared`);
    }
    
    // 创建间接绑定
    this.importBindings.set(name, {
      targetModule: module,
      targetName: importName
    });
  }
  
  // 创建可变绑定（let/var）
  CreateMutableBinding(name, deletable = false) {
    if (this.bindings.has(name)) {
      throw new SyntaxError(`Identifier '${name}' has already been declared`);
    }
    
    this.bindings.set(name, {
      value: undefined,
      mutable: true,
      deletable: deletable,
      initialized: false
    });
  }
  
  // 创建不可变绑定（const）
  CreateImmutableBinding(name) {
    if (this.bindings.has(name)) {
      throw new SyntaxError(`Identifier '${name}' has already been declared`);
    }
    
    this.bindings.set(name, {
      value: undefined,
      mutable: false,
      deletable: false,
      initialized: false
    });
  }
  
  // 获取绑定值
  GetBindingValue(name) {
    // 优先查找导入绑定
    if (this.importBindings.has(name)) {
      const { targetModule, targetName } = this.importBindings.get(name);
      return targetModule.environment.GetBindingValue(targetName);
    }
    
    // 查找本地绑定
    if (this.bindings.has(name)) {
      const binding = this.bindings.get(name);
      if (!binding.initialized) {
        throw new ReferenceError(`Cannot access '${name}' before initialization`);
      }
      return binding.value;
    }
    
    // 查找外部环境（全局）
    if (this.outerEnv) {
      return this.outerEnv.GetBindingValue(name);
    }
    
    throw new ReferenceError(`${name} is not defined`);
  }
  
  // 设置绑定值
  SetBindingValue(name, value) {
    // 导入绑定是只读的
    if (this.importBindings.has(name)) {
      throw new TypeError('Assignment to constant variable');
    }
    
    // 设置本地绑定
    if (this.bindings.has(name)) {
      const binding = this.bindings.get(name);
      
      if (!binding.initialized) {
        throw new ReferenceError(`Cannot access '${name}' before initialization`);
      }
      
      if (!binding.mutable) {
        throw new TypeError('Assignment to constant variable');
      }
      
      binding.value = value;
      return;
    }
    
    throw new ReferenceError(`${name} is not defined`);
  }
}
```

## import 声明的底层实现

### 命名导入

最常见的导入形式：

```javascript
// module.js
export const a = 1;
export function b() {}

// main.js
import { a, b } from './module.js';
```

**V8的处理过程**：

```javascript
// 1. 解析阶段：记录导入信息
moduleRecord.importEntries.push({
  importName: 'a',      // 导入的名称
  localName: 'a',       // 本地绑定名称
  moduleRequest: './module.js'
});

moduleRecord.importEntries.push({
  importName: 'b',
  localName: 'b',
  moduleRequest: './module.js'
});

// 2. 实例化阶段：创建导入绑定
const targetModule = ResolveModule('./module.js');

mainModule.environment.CreateImportBinding(
  'a',              // 本地名称
  targetModule,     // 目标模块
  'a'               // 目标模块中的导出名称
);

mainModule.environment.CreateImportBinding('b', targetModule, 'b');
```

**导入绑定的特性**：

```javascript
import { counter } from './module.js';

// ✅ 可以读取
console.log(counter);

// ❌ 不能赋值（即使导出是 let）
counter = 10;  // TypeError: Assignment to constant variable

// ❌ 不能删除
delete counter;  // SyntaxError（严格模式）
```

### 重命名导入

使用`as`关键字重命名：

```javascript
import { originalName as newName } from './module.js';
```

**V8的处理**：

```javascript
// 导入记录
moduleRecord.importEntries.push({
  importName: 'originalName',  // 目标模块中的名称
  localName: 'newName',        // 本地使用的名称
  moduleRequest: './module.js'
});

// 创建绑定
mainModule.environment.CreateImportBinding(
  'newName',        // 本地名称
  targetModule,
  'originalName'    // 目标导出名称
);
```

### 默认导入

导入默认导出：

```javascript
// module.js
export default function() {}

// main.js
import myFunction from './module.js';
```

**V8的转换**：

```javascript
// 默认导出在内部使用 'default' 名称
moduleRecord.importEntries.push({
  importName: 'default',   // 特殊名称 'default'
  localName: 'myFunction',
  moduleRequest: './module.js'
});

// 等价于
import { default as myFunction } from './module.js';
```

### 命名空间导入

导入整个模块的命名空间：

```javascript
import * as mod from './module.js';
console.log(mod.a);
console.log(mod.b);
```

**V8的实现**：

```javascript
// 创建模块命名空间对象
const namespace = CreateModuleNamespace(targetModule);

// 将命名空间对象绑定到本地名称
mainModule.environment.CreateImmutableBinding('mod');
mainModule.environment.InitializeBinding('mod', namespace);

// 命名空间对象是普通的不可变绑定，不是导入绑定
// 但命名空间对象的属性是 getter，返回最新值
```

### 仅导入副作用

不导入任何绑定，只执行模块代码：

```javascript
import './polyfill.js';
```

**V8的处理**：

```javascript
// 不创建任何导入绑定
// 但模块依然会被加载、实例化和执行
moduleRecord.requestedModules.push('./polyfill.js');
```

## export 声明的底层实现

### 命名导出

导出变量、函数或类：

```javascript
// 声明时导出
export const a = 1;
export function b() {}
export class C {}

// 先声明后导出
const x = 1;
function y() {}
export { x, y };
```

**V8的处理**：

```javascript
// 1. 在模块环境中创建绑定
moduleEnv.CreateImmutableBinding('a');
moduleEnv.InitializeBinding('a', 1);

moduleEnv.CreateMutableBinding('b');
moduleEnv.InitializeBinding('b', functionObject);

// 2. 标记为导出绑定
moduleRecord.exportEntries.push({
  exportName: 'a',     // 导出的名称
  localName: 'a',      // 本地绑定名称
  type: 'local'
});

moduleRecord.exportEntries.push({
  exportName: 'b',
  localName: 'b',
  type: 'local'
});

// 3. 在命名空间对象上创建 getter
Object.defineProperty(namespace, 'a', {
  get() {
    return moduleEnv.GetBindingValue('a');
  },
  enumerable: true,
  configurable: false
});
```

**导出绑定的特性**：

```javascript
// module.js
export let counter = 0;
export function increment() {
  counter++;
}

// 导出的是绑定，不是值的快照
// 内部修改会同步到所有导入位置
```

### 重命名导出

导出时使用不同的名称：

```javascript
const internal = 1;
export { internal as external };
```

**V8的处理**：

```javascript
moduleRecord.exportEntries.push({
  exportName: 'external',  // 导出的名称
  localName: 'internal',   // 本地绑定名称
  type: 'local'
});

// 命名空间对象
namespace.external = moduleEnv.GetBindingValue('internal');
```

### 默认导出

导出默认值：

```javascript
// 默认导出表达式
export default 42;

// 默认导出声明
export default function() {}
export default class {}

// 默认导出变量
const value = 42;
export { value as default };
```

**V8的转换**：

```javascript
// 1. 匿名默认导出（表达式）
// export default 42;
moduleEnv.CreateImmutableBinding('*default*');  // 内部名称
moduleEnv.InitializeBinding('*default*', 42);

moduleRecord.exportEntries.push({
  exportName: 'default',
  localName: '*default*',
  type: 'local'
});

// 2. 具名默认导出（声明）
// export default function foo() {}
moduleEnv.CreateMutableBinding('foo');
moduleEnv.InitializeBinding('foo', functionObject);

// 同时导出为 'default' 和 'foo'
moduleRecord.exportEntries.push({
  exportName: 'default',
  localName: 'foo',
  type: 'local'
});
```

**匿名与具名的区别**：

```javascript
// 具名默认导出
export default function foo() {}
// 内部可以访问 foo
console.log(foo.name);  // 'foo'

// 匿名默认导出
export default function() {}
// 内部无法访问（没有绑定）
```

### 重导出

从其他模块导入再导出：

```javascript
// 重导出全部
export * from './module.js';

// 重导出部分
export { a, b } from './module.js';

// 重命名重导出
export { a as x } from './module.js';

// 重导出默认为命名
export { default as foo } from './module.js';
```

**V8的处理**：

```javascript
// export { a } from './module.js';
// 不创建本地绑定，直接转发
moduleRecord.exportEntries.push({
  exportName: 'a',
  moduleRequest: './module.js',
  importName: 'a',
  type: 'indirect'  // 间接导出
});

// 命名空间对象的 getter 指向目标模块
Object.defineProperty(namespace, 'a', {
  get() {
    const targetModule = ResolveModule('./module.js');
    return targetModule.namespace.a;
  },
  enumerable: true,
  configurable: false
});
```

**export * 的特殊处理**：

```javascript
// export * from './module.js';
moduleRecord.starExportEntries.push({
  moduleRequest: './module.js'
});

// 实例化时，将目标模块的所有导出（除了 default）添加到命名空间
function InstantiateStarExports(module) {
  for (const starExport of module.starExportEntries) {
    const targetModule = ResolveModule(starExport.moduleRequest);
    
    for (const [name, value] of Object.entries(targetModule.namespace)) {
      // 跳过 default 和已存在的导出
      if (name === 'default' || module.namespace.hasOwnProperty(name)) {
        continue;
      }
      
      // 添加到命名空间
      Object.defineProperty(module.namespace, name, {
        get() {
          return targetModule.namespace[name];
        },
        enumerable: true,
        configurable: false
      });
    }
  }
}
```

**重导出的命名冲突**：

```javascript
// 如果多个重导出有同名导出，会报错
export * from './a.js';  // 导出 foo
export * from './b.js';  // 也导出 foo
// SyntaxError: The requested module contains conflicting star exports for name 'foo'
```

## 模块命名空间对象

### 命名空间对象的创建

每个模块都有一个命名空间对象，包含所有导出：

```javascript
// V8 创建命名空间对象（简化）
function CreateModuleNamespace(module) {
  // 已创建则直接返回
  if (module.namespace) {
    return module.namespace;
  }
  
  // 创建空对象
  const namespace = Object.create(null);
  
  // 设置 Symbol.toStringTag
  Object.defineProperty(namespace, Symbol.toStringTag, {
    value: 'Module',
    writable: false,
    enumerable: false,
    configurable: false
  });
  
  // 为每个导出创建 getter
  for (const exportEntry of module.exportEntries) {
    const { exportName, localName } = exportEntry;
    
    Object.defineProperty(namespace, exportName, {
      get() {
        // 返回模块环境中的最新值
        return module.environment.GetBindingValue(localName);
      },
      enumerable: true,
      configurable: false
    });
  }
  
  // 密封对象（不可添加/删除属性）
  Object.seal(namespace);
  
  // 缓存命名空间对象
  module.namespace = namespace;
  
  return namespace;
}
```

### 命名空间对象的特性

**1. 原型为null**：

```javascript
import * as mod from './module.js';
console.log(Object.getPrototypeOf(mod));  // null
```

**2. 不可扩展**：

```javascript
import * as mod from './module.js';
mod.newProp = 'value';  // TypeError（严格模式）
Object.isSealed(mod);   // true
```

**3. 属性是getter**：

```javascript
// module.js
export let count = 0;
export function increment() { count++; }

// main.js
import * as mod from './module.js';
const descriptor = Object.getOwnPropertyDescriptor(mod, 'count');
console.log(descriptor);
// {
//   get: [Function: get],
//   set: undefined,
//   enumerable: true,
//   configurable: false
// }

mod.increment();
console.log(mod.count);  // 1（getter返回最新值）
```

**4. Symbol.toStringTag**：

```javascript
import * as mod from './module.js';
console.log(Object.prototype.toString.call(mod));  // '[object Module]'
console.log(mod[Symbol.toStringTag]);              // 'Module'
```

## 作用域隔离机制

### 模块的词法环境

每个模块有独立的词法环境，不共享变量：

```javascript
// a.js
const x = 1;
var y = 2;
console.log(x, y);  // 1 2

// b.js
const x = 10;
var y = 20;
console.log(x, y);  // 10 20

// 两个模块的 x 和 y 是完全独立的绑定
```

**模块环境的链式结构**：

```
模块A的环境记录
  └─> 全局环境记录
        └─> 对象环境记录（window/global）

模块B的环境记录
  └─> 全局环境记录
        └─> 对象环境记录（window/global）
```

### 访问全局对象

模块可以访问全局对象，但不会污染它：

```javascript
// module.js
var x = 1;         // 不创建全局属性
console.log(x);    // 1（模块作用域）

console.log(globalThis.x);  // undefined（没有污染全局）

// 显式访问全局
globalThis.y = 2;
console.log(window.y);      // 2（浏览器）
console.log(global.y);      // 2（Node.js）
```

**var声明的处理**：

```javascript
// 传统脚本
var x = 1;
console.log(window.x);  // 1（创建全局属性）

// 模块
var x = 1;
console.log(window.x);  // undefined（不创建全局属性）
```

V8的实现：

```javascript
// 传统脚本：var 在对象环境记录中创建绑定
globalEnv.objectRecord.CreateBinding('x', 1);

// 模块：var 在模块的声明式环境记录中创建绑定
moduleEnv.CreateMutableBinding('x');
moduleEnv.InitializeBinding('x', 1);
```

### 顶层this的值

模块中的顶层`this`是`undefined`：

```javascript
// module.js
console.log(this);  // undefined

// 传统脚本
console.log(this);  // window（浏览器）/ global（Node.js）
```

V8的处理：

```javascript
// 执行模块代码时，thisValue 设为 undefined
function EvaluateModule(module) {
  const thisValue = undefined;
  const result = module.code.call(thisValue);
  return result;
}
```

## 临时死区（TDZ）与初始化

### 导入绑定的初始化

导入绑定在模块实例化后立即可用：

```javascript
// module.js
export const a = 1;

// main.js
console.log(a);  // ✅ 1（在 import 声明后立即可用）
import { a } from './module.js';
```

这是因为`import`声明被提升到模块顶部（hoisting）：

```javascript
// V8 的处理顺序
// 1. 解析阶段：收集所有 import 和 export
// 2. 实例化阶段：创建所有导入绑定
// 3. 求值阶段：执行模块代码

// 因此在模块代码执行前，导入绑定已经存在
```

### let/const的临时死区

模块中的`let`/`const`遵循TDZ规则：

```javascript
// module.js
console.log(x);  // ReferenceError: Cannot access 'x' before initialization
export let x = 1;
```

**初始化顺序**：

```javascript
// V8 执行模块代码时的处理
function EvaluateModule(module) {
  // 1. 导入绑定已经创建（实例化阶段）
  
  // 2. 执行模块代码
  // 遇到 let/const 声明时才初始化
  
  // 例如：
  // export let x = 1;
  
  // a. 创建绑定（已在解析阶段完成）
  // moduleEnv.CreateMutableBinding('x');
  
  // b. 计算初始化值
  const value = 1;
  
  // c. 初始化绑定
  moduleEnv.InitializeBinding('x', value);
}
```

## 性能优化与最佳实践

### 优先使用命名导出

命名导出有利于Tree Shaking：

```javascript
// ❌ 默认导出对象
export default {
  funcA() {},
  funcB() {},
  funcC() {}
};

// 未使用的函数仍会被打包

// ✅ 命名导出
export function funcA() {}
export function funcB() {}
export function funcC() {}

// 只打包使用的函数
import { funcA } from './utils.js';
```

### 避免导出可变绑定

导出的可变绑定难以追踪：

```javascript
// ❌ 导出可变变量
export let state = { count: 0 };
state.count++;  // 外部可能读到中间状态

// ✅ 导出函数和不可变值
let state = { count: 0 };
export function getState() {
  return { ...state };  // 返回副本
}
export function setState(newState) {
  state = newState;
}
```

### 集中导出

在入口文件统一导出：

```javascript
// index.js
export { funcA, funcB } from './utils.js';
export { ComponentA, ComponentB } from './components.js';
export { default as Config } from './config.js';

// 使用者只需导入入口文件
import { funcA, ComponentA, Config } from './lib';
```

### 避免循环依赖

重构模块结构消除循环：

```javascript
// ❌ 循环依赖
// a.js
import { b } from './b.js';
export const a = 1;

// b.js
import { a } from './a.js';
export const b = 2;

// ✅ 提取共享依赖
// common.js
export const shared = {};

// a.js
import { shared } from './common.js';
export const a = 1;

// b.js
import { shared } from './common.js';
export const b = 2;
```

## 本章小结

本章深入探讨了V8引擎中模块作用域的实现机制：

1. **模块环境记录**：每个模块有独立的环境记录，继承自声明式环境记录，支持导入绑定、导出绑定和本地绑定的统一管理。

2. **导入绑定的间接性**：`import`创建的是间接绑定而非值拷贝，通过引用目标模块的环境记录实现活绑定，这是ESM实现导出值同步更新的关键机制。

3. **命名空间对象的设计**：模块命名空间对象使用getter属性实现对导出值的访问，对象被密封以防止修改，确保模块接口的稳定性。

4. **作用域隔离**：模块的词法环境独立于全局环境，`var`声明不会创建全局属性，顶层`this`为`undefined`，实现了完整的作用域隔离。

5. **初始化顺序**：理解导入绑定、let/const的初始化时机和临时死区规则，能够避免循环依赖中的初始化错误。

理解模块作用域的底层实现，能够帮助我们编写更健壮的模块代码，合理设计模块接口，并在遇到循环依赖、作用域问题时快速定位原因。下一章将深入探讨循环依赖的处理机制。
