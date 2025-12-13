# new 操作符：对象创建与构造函数调用

当你使用`new`关键字创建对象时，JavaScript引擎究竟做了什么？为什么构造函数可以返回自定义对象？`new.target`是如何工作的？这些看似简单的问题，背后都有着复杂的实现机制。

本章将深入V8引擎，探讨`new`操作符的完整执行过程，包括对象创建、原型链建立、this绑定以及V8的优化策略。

## new操作符的执行步骤

根据ECMAScript规范，使用`new`调用构造函数时，V8会执行以下步骤：

```javascript
function Person(name, age) {
  this.name = name;
  this.age = age;
}

Person.prototype.greet = function() {
  return `Hello, I'm ${this.name}`;
};

const alice = new Person('Alice', 30);
console.log(alice.greet());  // Hello, I'm Alice
```

这个看似简单的操作，实际上包含了多个步骤。让我们实现一个完整的`new`操作符来理解其内部机制：

```javascript
// 模拟V8的new操作符实现
function simulateNew(constructor, ...args) {
  // 步骤1：检查constructor是否可调用
  if (typeof constructor !== 'function') {
    throw new TypeError(`${constructor} is not a constructor`);
  }
  
  // 步骤2：创建新对象，原型指向constructor.prototype
  const instance = Object.create(constructor.prototype);
  
  // 步骤3：执行构造函数，this绑定到新对象
  // 同时设置new.target为constructor
  const result = constructor.apply(instance, args);
  
  // 步骤4：处理构造函数的返回值
  // 如果返回对象，使用返回的对象；否则返回新创建的对象
  if (result !== null && (typeof result === 'object' || typeof result === 'function')) {
    return result;
  }
  
  return instance;
}

// 测试
function Test(value) {
  this.value = value;
}

const obj1 = simulateNew(Test, 42);
console.log(obj1.value);  // 42
console.log(obj1 instanceof Test);  // true

// 测试返回对象的情况
function TestWithReturn(value) {
  this.value = value;
  return { custom: 'object' };
}

const obj2 = simulateNew(TestWithReturn, 42);
console.log(obj2.custom);  // 'object'
console.log(obj2.value);   // undefined
console.log(obj2 instanceof TestWithReturn);  // false
```

这个实现展示了`new`操作符的核心逻辑，但V8的实际实现要复杂得多。

## 原型链的建立

`new`操作符最关键的一步是通过`Object.create(constructor.prototype)`建立原型链。这确保了实例可以访问构造函数原型上的方法：

```javascript
// V8中的原型链建立过程
class V8ObjectCreation {
  // 创建对象并设置原型
  static createWithPrototype(prototype) {
    // V8内部使用特殊的对象分配器
    const obj = this.allocateObject();
    
    // 设置对象的[[Prototype]]内部槽
    this.setPrototype(obj, prototype);
    
    return obj;
  }
  
  static allocateObject() {
    // 在V8的堆中分配内存
    // 初始化对象的隐藏类（Map）
    return {};
  }
  
  static setPrototype(obj, prototype) {
    // 设置[[Prototype]]
    Object.setPrototypeOf(obj, prototype);
  }
}

// 完整的new操作模拟
class V8NewOperator {
  static construct(constructor, args) {
    // 1. 验证构造函数
    if (!this.isConstructor(constructor)) {
      throw new TypeError(`${constructor.name || 'function'} is not a constructor`);
    }
    
    // 2. 获取prototype属性
    const prototype = constructor.prototype;
    
    // 验证prototype是对象
    const proto = (typeof prototype === 'object' && prototype !== null) 
      ? prototype 
      : Object.prototype;
    
    // 3. 创建实例
    const instance = V8ObjectCreation.createWithPrototype(proto);
    
    // 4. 执行构造函数
    const result = this.callConstructor(constructor, instance, args);
    
    // 5. 返回结果
    return this.processConstructorResult(result, instance);
  }
  
  static isConstructor(func) {
    // 箭头函数不能作为构造函数
    // 检查[[ConstructorKind]]内部槽
    return typeof func === 'function' && func.prototype !== undefined;
  }
  
  static callConstructor(constructor, thisArg, args) {
    // 在构造函数调用上下文中执行
    return constructor.apply(thisArg, args);
  }
  
  static processConstructorResult(result, instance) {
    // 如果构造函数返回对象，使用返回值
    if (result !== null && typeof result === 'object') {
      return result;
    }
    
    // 如果构造函数返回函数，也使用返回值
    if (typeof result === 'function') {
      return result;
    }
    
    // 否则返回新创建的实例
    return instance;
  }
}

// 测试
function Animal(name) {
  this.name = name;
}

Animal.prototype.speak = function() {
  return `${this.name} makes a sound`;
};

const dog = V8NewOperator.construct(Animal, ['Dog']);
console.log(dog.name);           // Dog
console.log(dog.speak());        // Dog makes a sound
console.log(dog instanceof Animal);  // true
```

## 构造函数的返回值处理

构造函数可以显式返回对象，这会影响`new`表达式的结果：

```javascript
// 情况1：不返回任何值（或返回undefined）
function Case1(value) {
  this.value = value;
  // 隐式返回undefined
}

const obj1 = new Case1(42);
console.log(obj1.value);  // 42 - 使用新创建的对象

// 情况2：返回对象
function Case2(value) {
  this.value = value;
  return { custom: true };
}

const obj2 = new Case2(42);
console.log(obj2.custom);  // true
console.log(obj2.value);   // undefined - 使用返回的对象

// 情况3：返回原始值
function Case3(value) {
  this.value = value;
  return 100;  // 原始值被忽略
}

const obj3 = new Case3(42);
console.log(obj3.value);  // 42 - 原始值被忽略，使用新对象

// 情况4：返回null
function Case4(value) {
  this.value = value;
  return null;  // null被忽略
}

const obj4 = new Case4(42);
console.log(obj4.value);  // 42 - null被忽略，使用新对象

// 情况5：返回函数
function Case5(value) {
  this.value = value;
  return function() { return 'returned function'; };
}

const obj5 = new Case5(42);
console.log(typeof obj5);  // function - 使用返回的函数
console.log(obj5());       // 'returned function'
```

V8对返回值的处理逻辑非常明确：

```javascript
// 返回值处理的完整逻辑
class ConstructorReturnHandler {
  static shouldUseReturnValue(returnValue) {
    // null被视为原始值，不使用
    if (returnValue === null) {
      return false;
    }
    
    // 对象和函数使用返回值
    const type = typeof returnValue;
    return type === 'object' || type === 'function';
  }
  
  static processReturn(returnValue, instance) {
    if (this.shouldUseReturnValue(returnValue)) {
      return returnValue;
    }
    return instance;
  }
}

// 测试
console.log(ConstructorReturnHandler.shouldUseReturnValue({}));        // true
console.log(ConstructorReturnHandler.shouldUseReturnValue(function(){}));  // true
console.log(ConstructorReturnHandler.shouldUseReturnValue(42));        // false
console.log(ConstructorReturnHandler.shouldUseReturnValue('string'));  // false
console.log(ConstructorReturnHandler.shouldUseReturnValue(null));      // false
console.log(ConstructorReturnHandler.shouldUseReturnValue(undefined)); // false
```

## new.target元属性

ES6引入了`new.target`，用于检测函数是否通过`new`调用：

```javascript
function MyClass() {
  // new.target在构造函数调用时指向构造函数本身
  // 普通调用时为undefined
  console.log('new.target:', new.target);
  
  if (!new.target) {
    throw new Error('Must be called with new');
  }
}

new MyClass();    // new.target: [Function: MyClass]
// MyClass();     // Error: Must be called with new

// 继承中的new.target
class Base {
  constructor() {
    console.log('Base new.target:', new.target.name);
  }
}

class Derived extends Base {
  constructor() {
    super();  // 调用Base，但new.target是Derived
    console.log('Derived new.target:', new.target.name);
  }
}

new Derived();
// Base new.target: Derived
// Derived new.target: Derived
```

V8通过隐式参数传递`new.target`：

```javascript
// 模拟new.target的实现
class V8NewTarget {
  // 普通函数调用
  static callFunction(func, thisArg, args) {
    // new.target = undefined
    return func.apply(thisArg, args);
  }
  
  // 构造函数调用
  static constructFunction(constructor, args) {
    const instance = Object.create(constructor.prototype);
    
    // 创建带new.target的执行上下文
    const context = {
      thisBinding: instance,
      newTarget: constructor  // 设置new.target
    };
    
    // 执行构造函数（传递new.target）
    const result = this.executeWithNewTarget(constructor, context, args);
    
    return this.processResult(result, instance);
  }
  
  static executeWithNewTarget(func, context, args) {
    // V8内部会将new.target作为隐式参数传递
    // 函数内部通过特殊指令访问new.target
    return func.apply(context.thisBinding, args);
  }
  
  static processResult(result, instance) {
    if (result !== null && typeof result === 'object') {
      return result;
    }
    return instance;
  }
}

// 实际使用中的模式
class SafeConstructor {
  constructor(value) {
    // 防御性编程：确保通过new调用
    if (!new.target) {
      return new SafeConstructor(value);
    }
    this.value = value;
  }
}

const obj1 = new SafeConstructor(42);
const obj2 = SafeConstructor(100);  // 自动转换为new调用

console.log(obj1.value);  // 42
console.log(obj2.value);  // 100
console.log(obj1 instanceof SafeConstructor);  // true
console.log(obj2 instanceof SafeConstructor);  // true
```

## 箭头函数不能用作构造函数

箭头函数没有`[[Construct]]`内部方法，不能使用`new`调用：

```javascript
// 普通函数：有prototype，可以作为构造函数
const NormalFunc = function(value) {
  this.value = value;
};
console.log(NormalFunc.prototype);  // {}
const obj1 = new NormalFunc(42);
console.log(obj1.value);  // 42

// 箭头函数：没有prototype，不能作为构造函数
const ArrowFunc = (value) => {
  this.value = value;
};
console.log(ArrowFunc.prototype);  // undefined

try {
  const obj2 = new ArrowFunc(42);
} catch (e) {
  console.log('Error:', e.message);  // ArrowFunc is not a constructor
}
```

V8在解析阶段就会标记函数的类型：

```javascript
// V8函数对象的内部表示
class V8Function {
  constructor(code, isArrow) {
    this.code = code;
    this.isArrow = isArrow;
    
    // 箭头函数没有prototype
    if (!isArrow) {
      this.prototype = {};
    }
  }
  
  // [[Call]]：所有函数都有
  call(thisArg, args) {
    // 箭头函数使用词法this
    const effectiveThis = this.isArrow ? this.lexicalThis : thisArg;
    return this.code.execute(effectiveThis, args);
  }
  
  // [[Construct]]：只有普通函数有
  construct(args) {
    if (this.isArrow) {
      throw new TypeError(`${this.name || 'Arrow function'} is not a constructor`);
    }
    
    const instance = Object.create(this.prototype);
    const result = this.call(instance, args);
    
    if (result !== null && typeof result === 'object') {
      return result;
    }
    return instance;
  }
}
```

## V8的对象分配优化

V8对`new`操作进行了多项优化，特别是对象分配：

```javascript
// 1. 内联分配：小对象直接在快速路径分配
function FastAllocation() {
  // V8会预测这个构造函数创建的对象形状
  this.x = 0;
  this.y = 0;
}

// V8的优化：
// - 预分配固定大小的内存
// - 使用内联缓存记录对象形状
// - 快速路径避免调用运行时函数

// 2. 隐藏类预分配
function Point(x, y) {
  this.x = x;  // 创建时就确定了属性顺序
  this.y = y;
}

// V8优化：
// - 第一次创建时生成隐藏类
// - 后续创建复用同一隐藏类
// - 避免隐藏类转换开销

const points = [];
for (let i = 0; i < 1000; i++) {
  points.push(new Point(i, i * 2));
}
// 所有point对象共享同一隐藏类
```

性能对比测试：

```javascript
function performanceTest() {
  const iterations = 1000000;
  
  // 测试1：普通对象字面量
  console.time('Object literal');
  for (let i = 0; i < iterations; i++) {
    const obj = { x: i, y: i * 2 };
  }
  console.timeEnd('Object literal');
  
  // 测试2：构造函数
  function Constructor(x, y) {
    this.x = x;
    this.y = y;
  }
  
  console.time('Constructor');
  for (let i = 0; i < iterations; i++) {
    const obj = new Constructor(i, i * 2);
  }
  console.timeEnd('Constructor');
  
  // 测试3：Object.create
  const proto = { x: 0, y: 0 };
  
  console.time('Object.create');
  for (let i = 0; i < iterations; i++) {
    const obj = Object.create(proto);
    obj.x = i;
    obj.y = i * 2;
  }
  console.timeEnd('Object.create');
}

performanceTest();
// 典型结果：
// Object literal: ~40ms（最快）
// Constructor: ~50ms
// Object.create: ~80ms（最慢，涉及原型查找）
```

## 继承链中的new操作

在类继承中，`new`操作变得更加复杂：

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // 必须先调用super
    this.breed = breed;
  }
}

const dog = new Dog('Buddy', 'Golden Retriever');
```

V8处理继承的步骤：

```javascript
// 模拟类继承中的new操作
class V8ClassConstruction {
  static constructDerived(DerivedClass, BaseClass, args) {
    // 1. 创建未初始化的实例（特殊状态）
    let instance = this.createUninitializedInstance();
    
    // 2. 调用派生类构造函数
    const derivedResult = this.callDerivedConstructor(
      DerivedClass,
      BaseClass,
      instance,
      args
    );
    
    return derivedResult;
  }
  
  static createUninitializedInstance() {
    // 返回特殊的未初始化对象
    // 在super()调用前，this不可访问
    return { __initialized: false };
  }
  
  static callDerivedConstructor(DerivedClass, BaseClass, instance, args) {
    // 设置new.target为派生类
    const newTarget = DerivedClass;
    
    // 派生类构造函数会调用super()
    // super()内部会：
    // 1. 调用基类构造函数
    // 2. 初始化instance
    // 3. 返回初始化后的instance
    
    return instance;
  }
}

// super()的本质
function simulateSuper(BaseClass, derivedInstance, args) {
  // 1. 调用基类构造函数，this是派生类实例
  BaseClass.apply(derivedInstance, args);
  
  // 2. 标记实例已初始化
  derivedInstance.__initialized = true;
  
  // 3. 返回实例
  return derivedInstance;
}
```

## 最佳实践

基于对`new`操作符的理解，我们可以总结出以下最佳实践：

### 1. 构造函数命名使用大写

```javascript
// 清晰标识构造函数
function Person(name) {  // 大写P
  this.name = name;
}

// 避免混淆
function createPerson(name) {  // 工厂函数，小写c
  return { name };
}
```

### 2. 验证new调用

```javascript
// 推荐：使用new.target
function SafeConstructor(value) {
  if (!new.target) {
    throw new Error('Must be called with new');
  }
  this.value = value;
}

// 或自动修正
function AutoCorrect(value) {
  if (!new.target) {
    return new AutoCorrect(value);
  }
  this.value = value;
}
```

### 3. 避免在构造函数中返回对象

```javascript
// 不推荐：返回不同的对象
function Confusing(value) {
  this.value = value;
  return { different: true };  // 破坏instanceof检查
}

// 推荐：只设置属性
function Clear(value) {
  this.value = value;
  // 隐式返回this
}
```

### 4. 保持对象形状一致

```javascript
// 不推荐：条件属性
function BadShape(includeExtra) {
  this.x = 0;
  if (includeExtra) {
    this.y = 0;  // 导致不同的隐藏类
  }
}

// 推荐：固定属性
function GoodShape(includeExtra) {
  this.x = 0;
  this.y = includeExtra ? 0 : undefined;  // 保持形状一致
}
```

### 5. 类继承中正确使用super

```javascript
class Base {
  constructor(value) {
    this.value = value;
  }
}

class Derived extends Base {
  constructor(value, extra) {
    // 必须先调用super
    super(value);
    
    // 然后才能使用this
    this.extra = extra;
  }
}
```

## 本章小结

本章深入探讨了`new`操作符的底层实现机制。我们学习了以下核心内容：

1. **执行步骤**：`new`操作包括对象创建、原型链建立、构造函数执行和返回值处理四个步骤。

2. **原型链建立**：通过`Object.create(constructor.prototype)`将实例的`[[Prototype]]`指向构造函数的原型对象。

3. **返回值处理**：构造函数返回对象或函数时使用返回值，返回原始值时使用新创建的实例。

4. **new.target**：ES6元属性，在构造函数调用时指向构造函数，普通调用时为undefined。

5. **V8优化**：对象内联分配、隐藏类预分配等优化使`new`操作性能接近对象字面量。

理解`new`操作符的工作原理，能够帮助你更好地设计构造函数，避免常见陷阱，并编写出性能更优的代码。在下一章中，我们将探讨严格模式的底层实现与性能影响。
