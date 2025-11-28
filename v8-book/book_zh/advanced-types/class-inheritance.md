# 类与继承：ES6 Class 的底层转换

ES6的`class`语法让JavaScript面向对象编程更直观易读，但你是否好奇过，这些简洁的`class`代码在V8引擎中是如何执行的？它真的是传统面向对象语言中的"类"吗？

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

class Dog extends Animal {
  speak() {
    console.log(`${this.name} barks`);
  }
}
```

事实上,ES6的`class`只是基于原型链的**语法糖**（Syntactic Sugar），V8将其转换为构造函数和原型对象的组合。本章将深入揭示类定义、继承机制、`super`关键字的底层转换过程，帮助你理解`class`语法背后的原型链本质。

## 传统构造函数 vs ES6 Class

### 构造函数模式

ES6之前，JavaScript通过构造函数和原型实现面向对象：

```javascript
// 构造函数
function Animal(name) {
  this.name = name;
}

// 原型方法
Animal.prototype.speak = function() {
  console.log(this.name + ' makes a sound');
};

// 继承（组合继承）
function Dog(name, breed) {
  Animal.call(this, name);  // 调用父构造函数
  this.breed = breed;
}

Dog.prototype = Object.create(Animal.prototype);  // 原型链继承
Dog.prototype.constructor = Dog;                  // 修正constructor指向

Dog.prototype.speak = function() {
  console.log(this.name + ' barks');
};

// 使用
const dog = new Dog('Buddy', 'Golden Retriever');
dog.speak();  // Buddy barks
```

这种模式代码冗长，易出错（忘记修正`constructor`、`this`绑定问题等）。

### ES6 Class 语法

ES6提供了更清晰的`class`语法：

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log(`${this.name} makes a sound`);
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // 调用父类构造函数
    this.breed = breed;
  }
  
  speak() {
    console.log(`${this.name} barks`);
  }
}

const dog = new Dog('Buddy', 'Golden Retriever');
dog.speak();  // Buddy barks
```

**语法优势**：
- 结构清晰：类定义一目了然。
- `super`关键字：简化父类方法调用。
- 严格模式：类体内自动启用严格模式。
- 不可提升：类声明不提升，避免TDZ问题。

但底层实现仍是基于原型链，V8将`class`语法转换为构造函数+原型的形式。

## Class 的内部转换

### 类声明的转换

V8将`class`声明转换为以下等价代码（简化版）：

**ES6 Class**：

```javascript
class Person {
  constructor(name, age) {
    this.name = name;
    this.age = age;
  }
  
  greet() {
    console.log(`Hi, I'm ${this.name}`);
  }
  
  static create(name, age) {
    return new Person(name, age);
  }
}
```

**等价转换（V8内部逻辑）**：

```javascript
// 1. 创建构造函数（来自 constructor 方法）
const Person = function(name, age) {
  // 类构造函数必须使用 new 调用
  if (!new.target) {
    throw new TypeError('Class constructor Person cannot be invoked without \'new\'');
  }
  this.name = name;
  this.age = age;
};

// 2. 定义原型方法（非可枚举）
Object.defineProperty(Person.prototype, 'greet', {
  value: function() {
    console.log(`Hi, I'm ${this.name}`);
  },
  writable: true,
  enumerable: false,  // 类方法不可枚举
  configurable: true
});

// 3. 定义静态方法
Object.defineProperty(Person, 'create', {
  value: function(name, age) {
    return new Person(name, age);
  },
  writable: true,
  enumerable: false,
  configurable: true
});

// 4. 锁定 prototype 的 constructor 属性
Object.defineProperty(Person.prototype, 'constructor', {
  value: Person,
  writable: true,
  enumerable: false,
  configurable: true
});
```

**关键转换点**：

**constructor检查**：类构造函数必须用`new`调用，V8在函数开头插入`new.target`检查。

```javascript
class MyClass {}

MyClass();  // TypeError: Class constructor MyClass cannot be invoked without 'new'
```

**方法不可枚举**：类原型方法默认`enumerable: false`，与构造函数模式不同。

```javascript
class Animal {
  speak() {}
}

console.log(Object.keys(Animal.prototype));  // []（方法不可枚举）

// 对比构造函数
function OldAnimal() {}
OldAnimal.prototype.speak = function() {};
console.log(Object.keys(OldAnimal.prototype));  // ['speak']（可枚举）
```

**严格模式**：类体内自动启用严格模式，无需显式声明`'use strict'`。

### 实例创建过程

使用`new`创建类实例时，V8执行以下步骤：

```javascript
class Person {
  constructor(name) {
    this.name = name;
  }
}

const p = new Person('Alice');
```

**内部步骤**：

1. **创建空对象**：`const obj = Object.create(Person.prototype);`
2. **绑定this**：将`this`绑定到新对象。
3. **执行构造函数**：调用`Person.call(obj, 'Alice')`。
4. **返回对象**：如果构造函数返回对象，使用该对象；否则返回`obj`。

**内存布局**：

```
Person 实例：
+------------------------+
| Map (Hidden Class)     |  ← 指向 Person 实例的 Map
+------------------------+
| Properties             |
|   name: "Alice"        |
+------------------------+
| __proto__ ───────────> Person.prototype
                         +---------------------+
                         | constructor: Person |
                         | greet: [Function]   |
                         | __proto__: Object.prototype
                         +---------------------+
```

## 继承机制：extends 与原型链

### extends 的底层转换

`extends`关键字建立原型链关系：

**ES6 Class**：

```javascript
class Animal {
  constructor(name) {
    this.name = name;
  }
  
  speak() {
    console.log('Some sound');
  }
}

class Dog extends Animal {
  constructor(name, breed) {
    super(name);
    this.breed = breed;
  }
  
  speak() {
    console.log('Woof!');
  }
}
```

**等价转换**：

```javascript
// 1. 父类构造函数
function Animal(name) {
  if (!new.target) throw new TypeError('...');
  this.name = name;
}

Animal.prototype.speak = function() {
  console.log('Some sound');
};

// 2. 子类构造函数
function Dog(name, breed) {
  if (!new.target) throw new TypeError('...');
  
  // super(name) 转换为：
  const _this = Reflect.construct(Animal, [name], new.target);
  _this.breed = breed;
  return _this;
}

// 3. 建立原型链（关键步骤）
Object.setPrototypeOf(Dog.prototype, Animal.prototype);  // 原型链继承
Object.setPrototypeOf(Dog, Animal);                      // 静态方法继承

// 4. 定义子类方法
Object.defineProperty(Dog.prototype, 'speak', {
  value: function() {
    console.log('Woof!');
  },
  enumerable: false,
  configurable: true,
  writable: true
});
```

**原型链结构**：

```
Dog 实例
  |
  ├─> Dog.prototype
  |     ├─> speak: [Function]（子类方法）
  |     └─> __proto__ ───> Animal.prototype
  |                          ├─> speak: [Function]（父类方法）
  |                          └─> __proto__ ───> Object.prototype
  |
  └─> Dog（构造函数）
        └─> __proto__ ───> Animal（静态方法继承）
```

**双重继承**：
- **实例方法继承**：`Dog.prototype.__proto__ === Animal.prototype`
- **静态方法继承**：`Dog.__proto__ === Animal`（类本身也是对象）

```javascript
class Animal {
  static classify() {
    return 'Animal Kingdom';
  }
}

class Dog extends Animal {}

console.log(Dog.classify());  // 'Animal Kingdom'（继承静态方法）
console.log(Dog.__proto__ === Animal);  // true
```

### super 关键字的实现

`super`在不同位置有不同含义：

**1. 构造函数中的super**：调用父类构造函数。

```javascript
class Dog extends Animal {
  constructor(name, breed) {
    super(name);  // 调用 Animal 构造函数
    this.breed = breed;
  }
}
```

**转换为**：

```javascript
function Dog(name, breed) {
  // super(name) 转换为 Reflect.construct
  const _this = Reflect.construct(Animal, [name], new.target);
  _this.breed = breed;
  return _this;
}
```

`Reflect.construct(Animal, [name], new.target)`等价于`new Animal(name)`，但保留了`new.target`指向子类`Dog`。

**关键约束**：必须在访问`this`之前调用`super()`。

```javascript
class Dog extends Animal {
  constructor(name) {
    this.breed = 'unknown';  // ReferenceError: Must call super before accessing 'this'
    super(name);
  }
}
```

V8通过TDZ（Temporal Dead Zone）机制实现：在`super()`调用前，`this`处于未初始化状态。

**2. 方法中的super**：访问父类方法。

```javascript
class Dog extends Animal {
  speak() {
    super.speak();  // 调用父类 speak 方法
    console.log('Woof!');
  }
}
```

**转换为**：

```javascript
Dog.prototype.speak = function() {
  // super.speak() 转换为从父原型查找方法
  const _super = Object.getPrototypeOf(Dog.prototype);
  _super.speak.call(this);  // 绑定当前 this
  console.log('Woof!');
};
```

`Object.getPrototypeOf(Dog.prototype)`获取`Animal.prototype`，然后调用其`speak`方法并绑定当前实例的`this`。

**HomeObject机制**：V8在函数对象上存储`[[HomeObject]]`内部slot，记录方法定义的原型对象，用于解析`super`。

```
Dog.prototype.speak 函数：
+------------------------+
| Map                    |
+------------------------+
| [[HomeObject]]         |  ← 指向 Dog.prototype
+------------------------+
| Code                   |
+------------------------+

super.speak() 解析过程：
1. 获取当前方法的 [[HomeObject]]（Dog.prototype）
2. 获取 [[HomeObject]] 的 __proto__（Animal.prototype）
3. 在 Animal.prototype 上查找 speak 方法
4. 绑定当前 this 调用
```

### 内置类的继承

ES6允许继承内置类（如`Array`、`Error`）：

```javascript
class MyArray extends Array {
  first() {
    return this[0];
  }
}

const arr = new MyArray(1, 2, 3);
console.log(arr.first());  // 1
console.log(arr.length);   // 3
arr.push(4);
console.log(arr.length);   // 4
```

**V8特殊处理**：

内置类（如`Array`）有特殊的内部slot（如`[[ArrayLength]]`），V8在子类实例化时确保正确初始化这些slot。

```javascript
// 内部逻辑（简化）
function MyArray(...args) {
  // 使用 Reflect.construct 创建真正的 Array 实例
  const instance = Reflect.construct(Array, args, MyArray);
  // instance 拥有 Array 的所有内部行为（length自动更新等）
  return instance;
}

Object.setPrototypeOf(MyArray.prototype, Array.prototype);
Object.setPrototypeOf(MyArray, Array);
```

**限制**：部分内置类无法可靠继承（如DOM类`HTMLElement`），需浏览器原生支持。

## 类的特殊特性

### 静态方法与静态属性

静态成员属于类本身，不属于实例：

```javascript
class MathUtils {
  static PI = 3.14159;  // 静态属性
  
  static add(a, b) {     // 静态方法
    return a + b;
  }
}

console.log(MathUtils.PI);       // 3.14159
console.log(MathUtils.add(2, 3)); // 5

const util = new MathUtils();
console.log(util.PI);       // undefined（实例无法访问）
console.log(util.add);      // undefined
```

**转换为**：

```javascript
function MathUtils() {
  if (!new.target) throw new TypeError('...');
}

// 静态属性
Object.defineProperty(MathUtils, 'PI', {
  value: 3.14159,
  writable: true,
  enumerable: false,
  configurable: true
});

// 静态方法
Object.defineProperty(MathUtils, 'add', {
  value: function(a, b) {
    return a + b;
  },
  writable: true,
  enumerable: false,
  configurable: true
});
```

静态成员存储在构造函数对象上，不在原型链上。

### 私有字段（Private Fields）

ES2022引入私有字段（以`#`开头）：

```javascript
class Counter {
  #count = 0;  // 私有字段
  
  increment() {
    this.#count++;
  }
  
  getCount() {
    return this.#count;
  }
}

const counter = new Counter();
counter.increment();
console.log(counter.getCount());  // 1
console.log(counter.#count);      // SyntaxError: Private field '#count' must be declared in an enclosing class
```

**V8实现**：

V8使用内部`[[PrivateFields]]` slot存储私有字段，每个实例有独立的私有字段映射：

```
Counter 实例：
+------------------------+
| Map                    |
+------------------------+
| Properties             |
|   (无公开属性)         |
+------------------------+
| [[PrivateFields]]      |  ← WeakMap 存储私有字段
|   #count: 1            |
+------------------------+
```

私有字段通过`WeakMap`实现，键为实例对象，值为私有字段的值。访问私有字段时，V8检查当前对象是否在`WeakMap`中，不存在则抛出TypeError。

**性能特点**：
- 私有字段访问速度与普通属性相当（V8优化后）。
- 真正私有：外部无法通过任何方式访问（包括`Object.keys`、`Reflect.ownKeys`等）。

## 性能优化与最佳实践

### Class vs 构造函数：性能对比

```javascript
// 性能测试
function testPerformance(iterations) {
  // 构造函数
  console.time('Constructor function');
  function Person(name) {
    this.name = name;
  }
  Person.prototype.greet = function() {
    return `Hi, ${this.name}`;
  };
  
  for (let i = 0; i < iterations; i++) {
    const p = new Person('Alice');
    p.greet();
  }
  console.timeEnd('Constructor function');
  
  // ES6 Class
  console.time('ES6 Class');
  class PersonClass {
    constructor(name) {
      this.name = name;
    }
    greet() {
      return `Hi, ${this.name}`;
    }
  }
  
  for (let i = 0; i < iterations; i++) {
    const p = new PersonClass('Alice');
    p.greet();
  }
  console.timeEnd('ES6 Class');
}

testPerformance(1000000);
// Constructor function: 45ms
// ES6 Class: 46ms（几乎相同）
```

**性能结论**：
- 实例化和方法调用速度相同（底层都是原型链）。
- TurboFan对两者优化策略一致（Inline Cache、Hidden Class）。
- `class`语法的性能开销仅在解析阶段（可忽略不计）。

### 避免动态修改类

动态修改类原型会破坏V8优化：

```javascript
// 不好：动态添加方法
class Person {
  constructor(name) {
    this.name = name;
  }
}

Person.prototype.greet = function() {  // 运行时添加
  console.log(`Hi, ${this.name}`);
};
```

这会导致：
- Hidden Class转换（所有实例失去Map共享）。
- Inline Cache失效（方法调用无法内联）。

**最佳实践**：所有方法在类定义时声明，避免运行时修改。

```javascript
// 好：静态定义
class Person {
  constructor(name) {
    this.name = name;
  }
  
  greet() {
    console.log(`Hi, ${this.name}`);
  }
}
```

### 继承层级不宜过深

深层继承链会影响方法查找性能：

```javascript
class A {}
class B extends A {}
class C extends B {}
class D extends C {}
class E extends D {}

const e = new E();
// 调用方法时，V8需要沿原型链逐层查找
// E.prototype -> D.prototype -> C.prototype -> B.prototype -> A.prototype -> Object.prototype
```

**建议**：
- 继承层级不超过3-4层。
- 优先使用组合（Composition）而非继承（Inheritance）。
- 性能关键路径避免频繁调用深层继承的方法。

### 合理使用静态方法

静态方法适合工具函数，不需要访问实例状态：

```javascript
class MathUtils {
  static add(a, b) {
    return a + b;
  }
  
  // 不好：静态方法中访问实例属性
  static badMethod() {
    return this.name;  // this 指向类本身，不是实例
  }
}

console.log(MathUtils.add(2, 3));  // 5
console.log(MathUtils.badMethod());  // undefined
```

## 本章小结

ES6的`class`语法虽然看起来像传统面向对象语言的类，但在V8引擎中仍是基于原型链的实现，只是提供了更清晰的语法糖：

1. **类声明转换**：V8将`class`转换为构造函数+原型对象，类方法定义为不可枚举属性，构造函数强制要求`new`调用，类体自动启用严格模式。

2. **继承机制**：`extends`建立双重原型链（实例方法继承和静态方法继承），`super`在构造函数中调用父构造函数（通过`Reflect.construct`保留`new.target`），在方法中访问父类方法（通过`[[HomeObject]]`机制解析原型链）。

3. **特殊特性**：静态成员存储在构造函数对象上，私有字段通过内部`[[PrivateFields]]` slot实现真正私有性（类似`WeakMap`），内置类继承需特殊处理内部slot初始化。

4. **性能优化**：`class`语法与构造函数性能相同，避免动态修改类原型（破坏Hidden Class优化），继承层级不宜过深（影响方法查找），合理使用静态方法和私有字段。

理解`class`的底层转换后，你可以更好地设计类结构，避免常见性能陷阱，编写高效的面向对象代码。下一章我们将探讨`ArrayBuffer`与`TypedArray`，看V8如何处理二进制数据。

### 思考题

1. 为什么类方法默认不可枚举，而构造函数原型方法默认可枚举？这种设计有什么考量？

2. 实现一个`Mixin`函数，能够将多个类的方法混入到目标类中，支持方法冲突检测和`super`调用。

3. 私有字段使用`#`前缀而非Symbol实现，有什么技术优势？Symbol能否实现真正的私有性？
