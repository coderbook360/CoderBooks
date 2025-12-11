# 对象不可变性：freeze、seal 与 preventExtensions

你是否思考过，为什么 JavaScript 提供了三种不同的方式来"锁定"对象？`Object.freeze()`、`Object.seal()` 和 `Object.preventExtensions()` 有什么区别？为什么 `const` 声明的对象仍然可以修改属性？

在前面的章节中，我们了解了属性描述符如何控制单个属性的行为。本章将探讨对象级别的不可变性机制，了解 V8 如何实现这些约束，以及它们对性能的影响。

## JavaScript 中的"不可变"

首先要明确：JavaScript 中没有真正的深度不可变。所有不可变性 API 都只是浅层的。

```javascript
const obj = {
    x: 1,
    nested: { y: 2 }
};

Object.freeze(obj);

obj.x = 100;  // 无效（严格模式下抛出 TypeError）
console.log(obj.x);  // 1

// 但嵌套对象仍可修改！
obj.nested.y = 200;
console.log(obj.nested.y);  // 200
```

## 三种不可变性级别

JavaScript 提供了三个 API，按限制强度递增：

### 1. Object.preventExtensions() —— 不可扩展

**效果**：不能添加新属性，但可以修改和删除现有属性。

```javascript
const obj = { x: 1 };

Object.preventExtensions(obj);

// 无法添加新属性
obj.y = 2;
console.log(obj.y);  // undefined（严格模式下抛出 TypeError）

// 可以修改现有属性
obj.x = 10;
console.log(obj.x);  // 10

// 可以删除现有属性
delete obj.x;
console.log(obj.x);  // undefined

// 检查对象是否可扩展
console.log(Object.isExtensible(obj));  // false
```

### 2. Object.seal() —— 密封对象

**效果**：不能添加或删除属性，但可以修改现有属性的值。

实际上，`Object.seal()` 等价于：
1. 调用 `Object.preventExtensions()`
2. 将所有属性的 `configurable` 设置为 `false`

```javascript
const obj = { x: 1, y: 2 };

Object.seal(obj);

// 无法添加新属性
obj.z = 3;
console.log(obj.z);  // undefined

// 无法删除现有属性
delete obj.x;
console.log(obj.x);  // 1（删除失败）

// 可以修改现有属性的值
obj.x = 10;
console.log(obj.x);  // 10

// 无法改变属性特性
Object.defineProperty(obj, 'x', {
    enumerable: false  // TypeError: Cannot redefine property
});

// 检查对象是否密封
console.log(Object.isSealed(obj));  // true
console.log(Object.isExtensible(obj));  // false（seal 隐含了 preventExtensions）
```

### 3. Object.freeze() —— 冻结对象

**效果**：不能添加、删除或修改属性。对象完全只读。

实际上，`Object.freeze()` 等价于：
1. 调用 `Object.seal()`
2. 将所有数据属性的 `writable` 设置为 `false`

```javascript
const obj = { x: 1, y: 2 };

Object.freeze(obj);

// 无法添加新属性
obj.z = 3;
console.log(obj.z);  // undefined

// 无法删除现有属性
delete obj.x;
console.log(obj.x);  // 1

// 无法修改现有属性
obj.x = 10;
console.log(obj.x);  // 1（修改失败）

// 检查对象是否冻结
console.log(Object.isFrozen(obj));  // true
console.log(Object.isSealed(obj));  // true
console.log(Object.isExtensible(obj));  // false
```

### 三者的关系

```
Object.freeze()
    ↓ 包含
Object.seal()
    ↓ 包含
Object.preventExtensions()
```

或者用集合表示：

```
freeze ⊂ seal ⊂ preventExtensions
```

## V8 中的实现

V8 如何实现这些不可变性约束？

### Map 标志位

V8 在对象的 Map（隐藏类）中使用标志位标记对象的可扩展性：

```
Map 对象结构（部分）：
+---------------------------+
| Bit Flags                 |
+---------------------------+
  包含：
  - is_extensible（是否可扩展）
  - is_prototype_map
  - is_deprecated
  等等
```

当调用 `Object.preventExtensions()` 时：

1. V8 创建一个新的 Map（或复用现有的不可扩展 Map）
2. 将新 Map 的 `is_extensible` 标志设置为 `false`
3. 对象的 Map 指针更新为新 Map

后续尝试添加属性时，V8 检查 Map 的 `is_extensible` 标志，如果为 `false`，拒绝操作。

### seal 和 freeze 的实现

`Object.seal()` 和 `Object.freeze()` 需要修改所有属性的特性：

```javascript
// Object.seal() 的简化实现
function seal(obj) {
    Object.preventExtensions(obj);
    
    const props = Object.getOwnPropertyNames(obj);
    for (const prop of props) {
        Object.defineProperty(obj, prop, {
            configurable: false
        });
    }
    
    return obj;
}

// Object.freeze() 的简化实现
function freeze(obj) {
    Object.seal(obj);
    
    const props = Object.getOwnPropertyNames(obj);
    for (const prop of props) {
        const descriptor = Object.getOwnPropertyDescriptor(obj, prop);
        if (descriptor.writable) {  // 只修改数据属性
            Object.defineProperty(obj, prop, {
                writable: false
            });
        }
    }
    
    return obj;
}
```

V8 的实际实现更高效，但原理类似：遍历所有属性，批量修改属性描述符。

### 性能影响

修改属性描述符会导致 Map 转换：

```javascript
const obj1 = { x: 1, y: 2 };
const obj2 = { x: 3, y: 4 };
// obj1 和 obj2 共享 Map M0

Object.freeze(obj1);
// obj1 转换到新的 Map M1（所有属性 writable: false, configurable: false）
// obj2 仍然使用 Map M0

function getX(obj) {
    return obj.x;
}

// 函数 getX 现在看到两种 Map，从单态变为多态
getX(obj1);
getX(obj2);
```

## 深度冻结

由于 JavaScript 的 `Object.freeze()` 是浅层的，需要递归实现深度冻结：

```javascript
function deepFreeze(obj) {
    // 冻结对象本身
    Object.freeze(obj);
    
    // 递归冻结所有属性值
    Object.getOwnPropertyNames(obj).forEach(prop => {
        const value = obj[prop];
        
        // 如果属性值是对象且未冻结，递归冻结
        if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
            deepFreeze(value);
        }
    });
    
    return obj;
}

const obj = {
    x: 1,
    nested: {
        y: 2,
        deepNested: {
            z: 3
        }
    }
};

deepFreeze(obj);

obj.x = 100;  // 无效
obj.nested.y = 200;  // 无效
obj.nested.deepNested.z = 300;  // 无效

console.log(obj);  // { x: 1, nested: { y: 2, deepNested: { z: 3 } } }
```

**注意**：深度冻结可能很昂贵，尤其是对大型对象树。而且，它不处理循环引用：

```javascript
const obj1 = { x: 1 };
const obj2 = { y: 2 };
obj1.ref = obj2;
obj2.ref = obj1;  // 循环引用

// 需要改进 deepFreeze 以处理循环引用
function deepFreezeSafe(obj, frozen = new WeakSet()) {
    if (frozen.has(obj)) return obj;  // 已经处理过
    
    Object.freeze(obj);
    frozen.add(obj);
    
    Object.getOwnPropertyNames(obj).forEach(prop => {
        const value = obj[prop];
        if (value !== null && typeof value === 'object') {
            deepFreezeSafe(value, frozen);
        }
    });
    
    return obj;
}

deepFreezeSafe(obj1);
```

## 性能测试

不可变对象的性能特征：

```javascript
const mutableObj = { x: 1, y: 2 };
const sealedObj = Object.seal({ x: 1, y: 2 });
const frozenObj = Object.freeze({ x: 1, y: 2 });

// 测试读取性能
function testRead(obj) {
    let sum = 0;
    for (let i = 0; i < 1000000; i++) {
        sum += obj.x + obj.y;
    }
    return sum;
}

console.time('Mutable Read');
testRead(mutableObj);
console.timeEnd('Mutable Read');
// 典型输出：Mutable Read: 5ms

console.time('Sealed Read');
testRead(sealedObj);
console.timeEnd('Sealed Read');
// 典型输出：Sealed Read: 5ms（几乎无差异）

console.time('Frozen Read');
testRead(frozenObj);
console.timeEnd('Frozen Read');
// 典型输出：Frozen Read: 5ms（几乎无差异）

// 读取性能没有明显差异，因为 V8 的内联缓存仍然有效
```

```javascript
// 测试写入性能（会失败的操作）
function testWrite(obj) {
    for (let i = 0; i < 1000000; i++) {
        obj.x = i;  // frozen/sealed 对象上会静默失败
    }
}

console.time('Mutable Write');
testWrite(mutableObj);
console.timeEnd('Mutable Write');
// 典型输出：Mutable Write: 10ms

console.time('Frozen Write');
testWrite(frozenObj);
console.timeEnd('Frozen Write');
// 典型输出：Frozen Write: 2ms（更快，因为操作被忽略）
```

## 实用模式

### 1. 配置对象

```javascript
const CONFIG = Object.freeze({
    API_URL: 'https://api.example.com',
    TIMEOUT: 5000,
    MAX_RETRIES: 3,
    
    // 嵌套对象需要手动冻结
    FEATURES: Object.freeze({
        NEW_UI: true,
        DARK_MODE: false
    })
});

// 防止意外修改配置
// CONFIG.API_URL = 'https://evil.com';  // 无效
```

### 2. 枚举

```javascript
const Status = Object.freeze({
    PENDING: 'pending',
    RUNNING: 'running',
    SUCCESS: 'success',
    FAILED: 'failed'
});

function processTask(status) {
    switch (status) {
        case Status.PENDING:
            // ...
            break;
        case Status.RUNNING:
            // ...
            break;
        // ...
    }
}

// 无法修改枚举值
// Status.PENDING = 'waiting';  // 无效
```

### 3. 不可变数据结构

```javascript
class ImmutablePoint {
    constructor(x, y) {
        this.x = x;
        this.y = y;
        Object.freeze(this);  // 在构造函数中冻结
    }
    
    // 返回新实例而不是修改现有实例
    move(dx, dy) {
        return new ImmutablePoint(this.x + dx, this.y + dy);
    }
}

const p1 = new ImmutablePoint(0, 0);
const p2 = p1.move(10, 20);

console.log(p1);  // ImmutablePoint { x: 0, y: 0 }
console.log(p2);  // ImmutablePoint { x: 10, y: 20 }

// p1.x = 100;  // 无效
```

### 4. 函数参数保护

```javascript
function processData(config) {
    // 冻结参数，防止函数内部意外修改
    config = Object.freeze({ ...config });
    
    // 现在可以安全地传递 config 到其他函数
    // 不用担心被修改
    someOtherFunction(config);
}
```

## const vs freeze

很多开发者混淆 `const` 和 `Object.freeze()`：

```javascript
// const 只防止重新赋值
const obj1 = { x: 1 };
// obj1 = {};  // TypeError: Assignment to constant variable

obj1.x = 2;  // OK，可以修改属性
obj1.y = 3;  // OK，可以添加属性
console.log(obj1);  // { x: 2, y: 3 }

// Object.freeze() 防止修改对象本身
let obj2 = { x: 1 };
Object.freeze(obj2);

obj2 = {};  // OK，可以重新赋值（let 声明）
console.log(obj2);  // {}

obj2 = Object.freeze({ x: 1 });
obj2.x = 2;  // 无效
obj2.y = 3;  // 无效
console.log(obj2);  // { x: 1 }

// 结合使用
const obj3 = Object.freeze({ x: 1 });
// obj3 = {};  // TypeError
// obj3.x = 2;  // 无效
// 真正的不可变绑定
```

## 陷阱与最佳实践

### 陷阱 1：浅层冻结

```javascript
const obj = Object.freeze({
    arr: [1, 2, 3],
    nested: { x: 1 }
});

// obj 本身冻结了
obj.newProp = 'value';  // 无效

// 但嵌套对象和数组仍可修改
obj.arr.push(4);
console.log(obj.arr);  // [1, 2, 3, 4]

obj.nested.x = 2;
console.log(obj.nested.x);  // 2

// 解决方案：深度冻结
const deepFrozenObj = deepFreeze({
    arr: [1, 2, 3],
    nested: { x: 1 }
});
```

### 陷阱 2：原型链

```javascript
const proto = { x: 1 };
const obj = Object.create(proto);
obj.y = 2;

Object.freeze(obj);

// obj 的自有属性冻结
obj.y = 3;  // 无效

// 但原型属性仍可修改！
proto.x = 10;
console.log(obj.x);  // 10（通过原型链访问）

// 需要同时冻结原型
Object.freeze(proto);
```

### 陷阱 3：性能误解

```javascript
// 误解：freeze 会提高性能（因为对象不可变）
// 实际：freeze 可能降低性能（因为 Map 转换）

const arr1 = [];
for (let i = 0; i < 1000; i++) {
    arr1.push({ x: i, y: i * 2 });
}
// 所有对象共享同一个 Map

const arr2 = [];
for (let i = 0; i < 1000; i++) {
    arr2.push(Object.freeze({ x: i, y: i * 2 }));
}
// 每个 freeze 可能导致 Map 转换，破坏共享

function sumX(arr) {
    let sum = 0;
    for (const obj of arr) {
        sum += obj.x;
    }
    return sum;
}

console.time('Mutable');
sumX(arr1);
console.timeEnd('Mutable');
// 典型输出：Mutable: 0.1ms

console.time('Frozen');
sumX(arr2);
console.timeEnd('Frozen');
// 典型输出：Frozen: 0.15ms（可能稍慢）
```

### 最佳实践

**何时使用 freeze/seal/preventExtensions**：

1. **配置对象**：防止意外修改全局配置
2. **枚举和常量**：定义不应改变的值集合
3. **不可变数据结构**：实现函数式编程风格
4. **API 返回值**：防止调用者修改内部状态

**何时不使用**：

1. **性能关键路径**：频繁创建和访问的对象
2. **大型对象树**：深度冻结成本高昂
3. **临时对象**：生命周期短的对象没必要冻结

## 本章小结

JavaScript 提供了三个 API 来限制对象的可变性，按强度递增：`preventExtensions`、`seal`、`freeze`。这些 API 都是浅层的，只影响对象本身，不影响嵌套对象。

**核心概念**：
- **preventExtensions**：不能添加新属性
- **seal**：不能添加或删除属性（= preventExtensions + configurable: false）
- **freeze**：不能添加、删除或修改属性（= seal + writable: false）
- **V8 实现**：通过 Map 的 `is_extensible` 标志和属性描述符实现

**关键区别**：
- `const` 防止重新赋值，不防止修改对象
- `freeze` 防止修改对象，不防止重新赋值
- 结合使用：`const obj = Object.freeze({...})`

**性能影响**：
- 读取性能无明显差异
- 修改属性特性会导致 Map 转换，可能破坏 Map 共享
- 深度冻结对大型对象树成本高昂

**最佳实践**：
- 用于配置对象、枚举、常量定义
- 需要深度不可变时实现 `deepFreeze`
- 注意处理原型链和循环引用
- 避免在性能关键路径过度使用

在下一章中，我们将探讨 Map 和 Set 集合，了解 V8 如何实现这些基于哈希表的高效数据结构。

**思考题**：

1. 为什么 `Object.freeze()` 不能真正阻止对象被修改（考虑 Reflect 和 Proxy）？
2. 如果一个对象已经 `freeze`，后续访问属性是否还需要检查 `writable` 标志？V8 能否优化这种情况？
3. 实现一个性能更好的 `deepFreeze`，使用 WeakMap 缓存已冻结的对象。
