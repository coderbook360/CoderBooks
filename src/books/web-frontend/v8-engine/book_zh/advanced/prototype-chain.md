# 原型链的底层实现：__proto__ 与 prototype

JavaScript的继承机制与传统的类继承不同，它基于原型链（Prototype Chain）。当你访问一个对象的属性时，如果对象本身没有这个属性，JavaScript会沿着原型链向上查找。这个看似简单的机制，在V8内部有着精巧的实现。本章将揭示原型链的底层结构，以及V8如何优化原型属性的访问。

## 原型链的基本结构

每个JavaScript对象都有一个内部属性`[[Prototype]]`，指向它的原型对象。这个属性可以通过`__proto__`访问器或`Object.getPrototypeOf()`获取：

```javascript
const obj = { x: 1 };
console.log(obj.__proto__ === Object.prototype);  // true
console.log(Object.getPrototypeOf(obj) === Object.prototype);  // true

// 原型链：obj -> Object.prototype -> null
console.log(Object.prototype.__proto__);  // null
```

在V8内部，对象的结构如下：

```
┌──────────────────────────────────────┐
│              JSObject                │
├──────────────────────────────────────┤
│  Map (隐藏类)                        │ ──> 包含 prototype 引用
├──────────────────────────────────────┤
│  Properties (命名属性)               │
├──────────────────────────────────────┤
│  Elements (索引属性)                 │
└──────────────────────────────────────┘
```

原型引用存储在Map（隐藏类）中，而不是对象本身。这意味着具有相同结构和相同原型的对象共享同一个Map。

## 函数的prototype与对象的__proto__

这是JavaScript中最容易混淆的概念之一。让我们理清它们的关系：

```javascript
function Person(name) {
  this.name = name;
}

Person.prototype.sayHello = function() {
  console.log(`Hello, I'm ${this.name}`);
};

const alice = new Person('Alice');

// alice的原型是Person.prototype
console.log(alice.__proto__ === Person.prototype);  // true

// Person.prototype的原型是Object.prototype
console.log(Person.prototype.__proto__ === Object.prototype);  // true

// Person函数自身的原型是Function.prototype
console.log(Person.__proto__ === Function.prototype);  // true
```

完整的原型链结构：

```
alice
  │
  └──> Person.prototype
         │
         └──> Object.prototype
                │
                └──> null

Person (函数对象)
  │
  └──> Function.prototype
         │
         └──> Object.prototype
                │
                └──> null
```

## V8中的原型存储

V8使用Map（隐藏类）来存储原型信息。当创建新对象时，V8会为其分配或复用Map：

```javascript
// V8内部处理过程的模拟
class V8Map {
  constructor() {
    this.prototype = null;
    this.transitions = new Map();  // 属性转换表
    this.descriptors = [];         // 属性描述符
  }
}

class V8Object {
  constructor(map) {
    this.map = map;
    this.properties = {};
    this.elements = [];
  }
  
  getPrototype() {
    return this.map.prototype;
  }
  
  setPrototype(proto) {
    // 原型变化需要创建新的Map
    const newMap = new V8Map();
    newMap.prototype = proto;
    newMap.descriptors = [...this.map.descriptors];
    this.map = newMap;
  }
}
```

## 属性查找的实现

当访问对象属性时，V8执行以下查找过程：

```javascript
function propertyLookup(object, key) {
  let current = object;
  
  while (current !== null) {
    // 1. 检查对象自身属性
    const descriptor = getOwnPropertyDescriptor(current, key);
    
    if (descriptor !== undefined) {
      if (descriptor.value !== undefined) {
        return descriptor.value;
      }
      // 访问器属性
      if (descriptor.get) {
        return descriptor.get.call(object);  // 注意：this指向原始对象
      }
      return undefined;
    }
    
    // 2. 沿原型链向上查找
    current = Object.getPrototypeOf(current);
  }
  
  return undefined;
}

// 使用示例
const parent = { x: 1 };
const child = Object.create(parent);
child.y = 2;

console.log(propertyLookup(child, 'y'));  // 2 (自身属性)
console.log(propertyLookup(child, 'x'));  // 1 (原型属性)
console.log(propertyLookup(child, 'z'));  // undefined
```

## 原型链缓存与内联缓存

V8使用内联缓存（IC）优化原型链属性访问。关键机制是`Prototype Check`：

```javascript
// V8的原型链缓存策略
class PrototypeIC {
  constructor() {
    this.cache = null;
  }
  
  lookup(receiver, key) {
    // 检查缓存是否有效
    if (this.cache && this.isValidCache(receiver)) {
      return this.cache.value;
    }
    
    // 缓存未命中，执行完整查找
    const result = this.fullLookup(receiver, key);
    this.updateCache(receiver, key, result);
    return result;
  }
  
  isValidCache(receiver) {
    // 验证原型链未被修改
    let current = receiver;
    for (const expected of this.cache.prototypeChain) {
      if (Object.getPrototypeOf(current) !== expected) {
        return false;
      }
      current = expected;
    }
    return true;
  }
  
  updateCache(receiver, key, result) {
    // 记录原型链快照
    const prototypeChain = [];
    let current = receiver;
    
    while (current !== null && current !== result.holder) {
      const proto = Object.getPrototypeOf(current);
      prototypeChain.push(proto);
      current = proto;
    }
    
    this.cache = {
      map: receiver.constructor,  // 隐藏类
      prototypeChain,
      value: result.value
    };
  }
}
```

## 原型变更的代价

修改对象的原型是代价高昂的操作，因为它会使相关的内联缓存失效：

```javascript
const obj = { x: 1 };

// 读取属性，V8建立IC
console.log(obj.x);  // IC缓存建立

// 修改原型 - 导致IC失效
Object.setPrototypeOf(obj, { y: 2 });

// 后续访问需要重新建立IC
console.log(obj.x);  // IC需要重建
```

性能测试展示修改原型的影响：

```javascript
function testPrototypeModification() {
  const iterations = 1000000;
  
  // 测试1：不修改原型
  const obj1 = { x: 1 };
  let start = performance.now();
  for (let i = 0; i < iterations; i++) {
    obj1.x;
  }
  console.log(`不修改原型: ${performance.now() - start}ms`);
  
  // 测试2：修改原型后访问
  const obj2 = { x: 1 };
  Object.setPrototypeOf(obj2, { y: 2 });
  
  start = performance.now();
  for (let i = 0; i < iterations; i++) {
    obj2.x;
  }
  console.log(`修改原型后: ${performance.now() - start}ms`);
}

testPrototypeModification();
// 典型输出：
// 不修改原型: 2ms
// 修改原型后: 5ms
```

## 原型继承的实现模式

### Object.create的实现

```javascript
// Object.create的简化实现
function objectCreate(proto, propertiesObject) {
  if (proto !== null && typeof proto !== 'object') {
    throw new TypeError('Object prototype may only be an Object or null');
  }
  
  // 创建一个空的构造函数
  function F() {}
  F.prototype = proto;
  
  const obj = new F();
  
  if (propertiesObject !== undefined) {
    Object.defineProperties(obj, propertiesObject);
  }
  
  return obj;
}

// V8内部的优化版本
function v8ObjectCreate(proto) {
  // 直接创建对象并设置其Map的原型
  const obj = {};  // 创建空对象
  // V8内部：obj.map.prototype = proto
  Object.setPrototypeOf(obj, proto);
  return obj;
}
```

### 类继承的原型链

ES6的`class`语法在底层仍然使用原型继承：

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(`${this.name} makes a sound.`);
  }
}

class Dog extends Animal {
  constructor(name) {
    super(name);
  }
  
  speak() {
    console.log(`${this.name} barks.`);
  }
}

const dog = new Dog('Rex');

// 验证原型链
console.log(dog.__proto__ === Dog.prototype);  // true
console.log(Dog.prototype.__proto__ === Animal.prototype);  // true
console.log(Animal.prototype.__proto__ === Object.prototype);  // true

// 类本身的原型链
console.log(Dog.__proto__ === Animal);  // true
console.log(Animal.__proto__ === Function.prototype);  // true
```

## 原型链优化策略

### 避免深层原型链

过深的原型链会增加属性查找的时间：

```javascript
// 反模式：过深的原型链
function createDeepChain(depth) {
  let proto = null;
  for (let i = 0; i < depth; i++) {
    proto = Object.create(proto);
    proto[`level${i}`] = i;
  }
  return proto;
}

const deep = createDeepChain(100);

// 访问最底层属性需要遍历整个链
console.log(deep.level0);  // 需要查找100层

// 推荐：保持原型链简短
// 大多数情况下2-3层足够
```

### 使用hasOwnProperty检查

区分自身属性和原型属性：

```javascript
const proto = { inherited: true };
const obj = Object.create(proto);
obj.own = true;

// 检查自身属性
console.log(obj.hasOwnProperty('own'));       // true
console.log(obj.hasOwnProperty('inherited')); // false

// in操作符检查整个原型链
console.log('own' in obj);       // true
console.log('inherited' in obj); // true

// 安全的hasOwnProperty调用
function hasOwn(obj, key) {
  return Object.prototype.hasOwnProperty.call(obj, key);
}
```

### 原型方法vs实例方法

将方法定义在原型上可以节省内存：

```javascript
// 反模式：每个实例都有方法副本
function BadPerson(name) {
  this.name = name;
  this.sayHello = function() {
    console.log(`Hello, I'm ${this.name}`);
  };
}

// 推荐：方法定义在原型上
function GoodPerson(name) {
  this.name = name;
}
GoodPerson.prototype.sayHello = function() {
  console.log(`Hello, I'm ${this.name}`);
};

// 测试内存使用
const bad = [];
const good = [];

for (let i = 0; i < 10000; i++) {
  bad.push(new BadPerson(`Person${i}`));
  good.push(new GoodPerson(`Person${i}`));
}

// BadPerson：每个实例都有独立的函数对象
// GoodPerson：所有实例共享同一个函数对象
```

## 特殊对象的原型处理

某些内置对象有特殊的原型行为：

```javascript
// 数组的原型
const arr = [1, 2, 3];
console.log(arr.__proto__ === Array.prototype);  // true
console.log(Array.prototype.__proto__ === Object.prototype);  // true

// 函数的原型
function fn() {}
console.log(fn.__proto__ === Function.prototype);  // true

// null原型对象
const nullProto = Object.create(null);
console.log(nullProto.__proto__);  // undefined
console.log('toString' in nullProto);  // false

// 常用于创建纯净的字典对象
const dict = Object.create(null);
dict.key = 'value';
// 没有Object.prototype的方法，避免属性名冲突
```

## 本章小结

原型链是JavaScript继承机制的基础，V8通过多种优化策略提升了原型属性访问的性能。

核心要点：

- **双重原型**：`__proto__`是对象的原型引用，`prototype`是函数的原型属性
- **Map存储**：原型引用存储在隐藏类（Map）中，相同结构的对象共享Map
- **IC优化**：内联缓存记录原型链快照，加速重复访问
- **修改代价**：`Object.setPrototypeOf`会使IC失效，应避免在运行时修改原型
- **设计建议**：保持原型链简短，方法定义在原型上，使用`Object.create(null)`创建纯净字典

理解原型链的底层实现，能帮助你写出更高效的面向对象代码。下一章，我们将探索Proxy与Reflect，了解V8如何支持JavaScript的元编程能力。
