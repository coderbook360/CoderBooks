# Symbol 的内部实现：唯一标识符与内置 Symbol

ES6引入了`Symbol`作为JavaScript的第七种原始类型。每个Symbol值都是唯一的，这使它成为定义对象私有属性和自定义行为的理想选择。V8是如何保证Symbol的唯一性的？内置Symbol又是如何影响对象行为的？本章将揭示Symbol的底层实现机制。

## Symbol的基本特性

`Symbol`是一种原始类型，每次调用`Symbol()`都会创建一个唯一的值：

```javascript
const s1 = Symbol('description');
const s2 = Symbol('description');

console.log(s1 === s2);  // false，即使描述相同
console.log(typeof s1);   // 'symbol'

// Symbol不能使用new调用
try {
  new Symbol();  // TypeError: Symbol is not a constructor
} catch (e) {
  console.log(e.message);
}

// Symbol可以用作对象属性键
const obj = {
  [s1]: 'value1',
  [s2]: 'value2'
};

console.log(obj[s1]);  // 'value1'
console.log(obj[s2]);  // 'value2'
```

## V8中的Symbol表示

V8内部使用一个递增的计数器来生成唯一的Symbol标识：

```
┌─────────────────────────────────────┐
│              Symbol                  │
├─────────────────────────────────────┤
│  hash: 唯一标识符 (uint32)          │
├─────────────────────────────────────┤
│  description: 描述字符串 (String)   │
├─────────────────────────────────────┤
│  flags: 标志位                       │
│    - is_private: 是否私有            │
│    - is_well_known: 是否内置        │
└─────────────────────────────────────┘
```

模拟V8的Symbol实现：

```javascript
// V8内部Symbol表示的简化模型
class V8Symbol {
  static nextId = 0;
  
  constructor(description) {
    this.id = V8Symbol.nextId++;  // 唯一标识
    this.description = description;
    this.isPrivate = false;
    this.isWellKnown = false;
  }
  
  equals(other) {
    // Symbol的相等性基于唯一id
    return other instanceof V8Symbol && this.id === other.id;
  }
  
  toString() {
    return `Symbol(${this.description || ''})`;
  }
}

// 每次创建都会生成新的id
const sym1 = new V8Symbol('test');
const sym2 = new V8Symbol('test');
console.log(sym1.equals(sym2));  // false
```

## 全局Symbol注册表

`Symbol.for()`使用全局注册表来实现Symbol的共享：

```javascript
// Symbol.for()创建或获取已注册的Symbol
const globalSym1 = Symbol.for('app.id');
const globalSym2 = Symbol.for('app.id');

console.log(globalSym1 === globalSym2);  // true

// Symbol.keyFor()获取已注册Symbol的键
console.log(Symbol.keyFor(globalSym1));  // 'app.id'

// 普通Symbol不在注册表中
const localSym = Symbol('app.id');
console.log(Symbol.keyFor(localSym));  // undefined
```

V8内部的全局注册表实现：

```javascript
// V8的全局Symbol注册表（简化）
class GlobalSymbolRegistry {
  constructor() {
    this.registry = new Map();  // key -> Symbol
  }
  
  for(key) {
    // 如果已存在，返回已有的Symbol
    if (this.registry.has(key)) {
      return this.registry.get(key);
    }
    
    // 否则创建新的并注册
    const symbol = Symbol(key);
    symbol._registryKey = key;  // 标记为已注册
    this.registry.set(key, symbol);
    return symbol;
  }
  
  keyFor(symbol) {
    // 只有通过for()注册的Symbol才有key
    return symbol._registryKey;
  }
}

const registry = new GlobalSymbolRegistry();
```

## 内置Symbol（Well-Known Symbols）

ECMAScript定义了一组内置Symbol，用于自定义对象的语言行为：

```javascript
// Symbol.iterator - 定义迭代行为
const iterable = {
  data: [1, 2, 3],
  [Symbol.iterator]() {
    let index = 0;
    const data = this.data;
    return {
      next() {
        if (index < data.length) {
          return { value: data[index++], done: false };
        }
        return { done: true };
      }
    };
  }
};

for (const item of iterable) {
  console.log(item);  // 1, 2, 3
}

// Symbol.toStringTag - 自定义toString输出
class MyClass {
  get [Symbol.toStringTag]() {
    return 'MyClass';
  }
}

const instance = new MyClass();
console.log(Object.prototype.toString.call(instance));  // '[object MyClass]'

// Symbol.hasInstance - 自定义instanceof行为
class MyArray {
  static [Symbol.hasInstance](instance) {
    return Array.isArray(instance);
  }
}

console.log([] instanceof MyArray);   // true
console.log({} instanceof MyArray);   // false
```

完整的内置Symbol列表：

```javascript
// 迭代相关
Symbol.iterator      // 默认迭代器
Symbol.asyncIterator // 异步迭代器

// 类型转换
Symbol.toPrimitive   // 对象转原始值
Symbol.toStringTag   // Object.prototype.toString的标签

// 正则表达式
Symbol.match         // String.prototype.match
Symbol.matchAll      // String.prototype.matchAll
Symbol.replace       // String.prototype.replace
Symbol.search        // String.prototype.search
Symbol.split         // String.prototype.split

// 其他
Symbol.hasInstance   // instanceof操作符
Symbol.isConcatSpreadable  // Array.prototype.concat
Symbol.species       // 衍生对象的构造函数
Symbol.unscopables   // with语句排除的属性
```

## Symbol作为属性键

Symbol属性在对象中有特殊的存储方式：

```javascript
const sym = Symbol('private');

const obj = {
  normalProp: 'visible',
  [sym]: 'hidden'
};

// 普通枚举不包含Symbol属性
console.log(Object.keys(obj));  // ['normalProp']
console.log(JSON.stringify(obj));  // '{"normalProp":"visible"}'

// 需要专门的API获取Symbol属性
console.log(Object.getOwnPropertySymbols(obj));  // [Symbol(private)]

// Reflect.ownKeys返回所有键
console.log(Reflect.ownKeys(obj));  // ['normalProp', Symbol(private)]
```

V8内部的Symbol属性存储：

```javascript
// V8对象的属性存储（简化）
class V8Object {
  constructor() {
    this.properties = {};      // 字符串键属性
    this.symbolProperties = new Map();  // Symbol键属性
  }
  
  set(key, value) {
    if (typeof key === 'symbol') {
      this.symbolProperties.set(key, value);
    } else {
      this.properties[String(key)] = value;
    }
  }
  
  get(key) {
    if (typeof key === 'symbol') {
      return this.symbolProperties.get(key);
    }
    return this.properties[String(key)];
  }
  
  ownKeys() {
    return [
      ...Object.keys(this.properties),
      ...this.symbolProperties.keys()
    ];
  }
  
  getOwnPropertySymbols() {
    return [...this.symbolProperties.keys()];
  }
}
```

## Symbol.toPrimitive的实现

`Symbol.toPrimitive`是最强大的内置Symbol之一，它控制类型转换：

```javascript
const obj = {
  [Symbol.toPrimitive](hint) {
    console.log(`Converting with hint: ${hint}`);
    
    switch (hint) {
      case 'number':
        return 42;
      case 'string':
        return 'hello';
      default:  // 'default'
        return true;
    }
  }
};

// 不同上下文触发不同的hint
console.log(+obj);       // hint: 'number' -> 42
console.log(`${obj}`);   // hint: 'string' -> 'hello'
console.log(obj + '');   // hint: 'default' -> 'true'
console.log(obj == 1);   // hint: 'default' -> true
```

V8内部的ToPrimitive算法：

```javascript
// V8的ToPrimitive实现（简化）
function toPrimitive(input, preferredType) {
  if (typeof input !== 'object' || input === null) {
    return input;  // 已经是原始值
  }
  
  // 检查Symbol.toPrimitive
  const exoticToPrim = input[Symbol.toPrimitive];
  if (exoticToPrim !== undefined) {
    const hint = preferredType === 'number' ? 'number' 
               : preferredType === 'string' ? 'string' 
               : 'default';
    const result = exoticToPrim.call(input, hint);
    
    if (typeof result !== 'object') {
      return result;
    }
    throw new TypeError('Cannot convert object to primitive value');
  }
  
  // 没有Symbol.toPrimitive，使用OrdinaryToPrimitive
  return ordinaryToPrimitive(input, preferredType || 'number');
}

function ordinaryToPrimitive(obj, hint) {
  const methodNames = hint === 'string' 
    ? ['toString', 'valueOf'] 
    : ['valueOf', 'toString'];
  
  for (const name of methodNames) {
    const method = obj[name];
    if (typeof method === 'function') {
      const result = method.call(obj);
      if (typeof result !== 'object') {
        return result;
      }
    }
  }
  
  throw new TypeError('Cannot convert object to primitive value');
}
```

## Symbol.species的应用

`Symbol.species`用于派生对象的构造函数选择：

```javascript
class MyArray extends Array {
  // 默认情况下，map/filter等方法返回MyArray实例
  // 通过species可以改变这个行为
  static get [Symbol.species]() {
    return Array;  // 派生方法返回普通Array
  }
}

const myArr = new MyArray(1, 2, 3);
const mapped = myArr.map(x => x * 2);

console.log(myArr instanceof MyArray);   // true
console.log(mapped instanceof MyArray);  // false
console.log(mapped instanceof Array);    // true
```

V8在内置方法中使用Species：

```javascript
// Array.prototype.map的简化实现
Array.prototype.map = function(callback, thisArg) {
  const len = this.length;
  
  // 使用Species构造器
  const C = this.constructor;
  const species = C[Symbol.species];
  const Constructor = species !== undefined ? species : Array;
  
  const result = new Constructor(len);
  
  for (let i = 0; i < len; i++) {
    if (i in this) {
      result[i] = callback.call(thisArg, this[i], i, this);
    }
  }
  
  return result;
};
```

## 私有Symbol与WeakMap比较

Symbol常用于模拟私有属性，与WeakMap方案的对比：

```javascript
// 方案1：Symbol作为私有键
const _privateData = Symbol('privateData');

class ClassWithSymbol {
  constructor() {
    this[_privateData] = { secret: 42 };
  }
  
  getSecret() {
    return this[_privateData].secret;
  }
}

// 问题：Symbol属性仍可通过getOwnPropertySymbols访问
const obj1 = new ClassWithSymbol();
console.log(Object.getOwnPropertySymbols(obj1));  // [Symbol(privateData)]

// 方案2：WeakMap实现真正的私有
const privateMap = new WeakMap();

class ClassWithWeakMap {
  constructor() {
    privateMap.set(this, { secret: 42 });
  }
  
  getSecret() {
    return privateMap.get(this).secret;
  }
}

// WeakMap中的数据完全无法从外部访问
const obj2 = new ClassWithWeakMap();
console.log(Object.getOwnPropertySymbols(obj2));  // []
```

性能对比：

```javascript
function benchmarkPrivate() {
  const iterations = 1000000;
  
  // Symbol方案
  const sym = Symbol('private');
  const symObj = { [sym]: 1 };
  
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    symObj[sym];
    symObj[sym] = i;
  }
  console.log(`Symbol: ${performance.now() - start}ms`);
  
  // WeakMap方案
  const wm = new WeakMap();
  const wmObj = {};
  wm.set(wmObj, { value: 1 });
  
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    wm.get(wmObj).value;
    wm.get(wmObj).value = i;
  }
  console.log(`WeakMap: ${performance.now() - start}ms`);
}

benchmarkPrivate();
// 典型输出：
// Symbol: 15ms
// WeakMap: 45ms
```

## 性能考量

Symbol的性能特点：

```javascript
// Symbol vs 字符串作为属性键
function compareKeyPerformance() {
  const iterations = 1000000;
  const sym = Symbol('key');
  const str = 'key';
  
  const objWithSymbol = { [sym]: 1 };
  const objWithString = { [str]: 1 };
  
  // Symbol键访问
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    objWithSymbol[sym];
  }
  console.log(`Symbol key access: ${performance.now() - start}ms`);
  
  // 字符串键访问
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    objWithString[str];
  }
  console.log(`String key access: ${performance.now() - start}ms`);
}

compareKeyPerformance();
// Symbol和字符串键的访问性能相近
// V8对两者都有良好的优化
```

Symbol的最佳实践：

```javascript
// 1. 复用Symbol实例
// 反模式：每次都创建新Symbol
class Bad {
  getValue() {
    return this[Symbol('value')];  // 每次调用都创建新Symbol
  }
}

// 推荐：复用Symbol
const VALUE = Symbol('value');
class Good {
  getValue() {
    return this[VALUE];
  }
}

// 2. 使用Symbol.for共享跨模块Symbol
// moduleA.js
export const SHARED = Symbol.for('app.shared');

// moduleB.js
import { SHARED } from './moduleA.js';
const same = Symbol.for('app.shared');
console.log(SHARED === same);  // true

// 3. 内置Symbol正确使用
const collection = {
  items: [],
  
  // 正确实现迭代器协议
  [Symbol.iterator]() {
    let index = 0;
    const items = this.items;
    
    return {
      next() {
        return index < items.length
          ? { value: items[index++], done: false }
          : { done: true };
      }
    };
  }
};
```

## 本章小结

Symbol是JavaScript中的唯一标识符类型，V8通过递增计数器保证其唯一性，并为内置Symbol提供特殊的语言集成。

核心要点：

- **唯一性保证**：每个Symbol通过唯一的内部id标识，即使描述相同也不相等
- **全局注册表**：`Symbol.for()`使用全局注册表实现跨作用域的Symbol共享
- **内置Symbol**：13个Well-Known Symbols用于自定义对象的语言行为
- **属性存储**：Symbol属性与字符串属性分开存储，不参与普通枚举
- **性能特点**：Symbol键访问与字符串键性能相近，但创建Symbol有开销

Symbol为JavaScript带来了真正的唯一标识符和元编程能力。下一章，我们将探索V8的正则表达式引擎Irregexp，了解正则匹配的底层实现。
