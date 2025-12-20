# 类型检测工具函数

JavaScript的类型检测一直是个"坑"。

```javascript
typeof null          // 'object' — 明明是null！
typeof []            // 'object' — 明明是数组！
typeof new Date()    // 'object' — 所有对象都一样
```

`typeof` 对于复杂类型几乎没用。jQuery实现了一套更精确的类型检测工具。

## typeof的局限

`typeof` 只能返回7种结果：

```javascript
typeof undefined     // 'undefined'
typeof true          // 'boolean'
typeof 42            // 'number'
typeof 'hello'       // 'string'
typeof Symbol()      // 'symbol'
typeof function(){}  // 'function'
typeof {}            // 'object'
typeof []            // 'object' — 问题开始了
typeof null          // 'object' — 历史遗留bug
typeof new Date()    // 'object'
typeof /regex/       // 'object'
```

对于数组、日期、正则、null等，typeof 都返回 `'object'`，无法区分。

## Object.prototype.toString

jQuery使用了一个技巧：`Object.prototype.toString.call()`。

```javascript
Object.prototype.toString.call([])           // '[object Array]'
Object.prototype.toString.call({})           // '[object Object]'
Object.prototype.toString.call(null)         // '[object Null]'
Object.prototype.toString.call(undefined)    // '[object Undefined]'
Object.prototype.toString.call(new Date())   // '[object Date]'
Object.prototype.toString.call(/regex/)      // '[object RegExp]'
Object.prototype.toString.call(function(){}) // '[object Function]'
Object.prototype.toString.call(42)           // '[object Number]'
Object.prototype.toString.call('hello')      // '[object String]'
Object.prototype.toString.call(true)         // '[object Boolean]'
```

每种类型都有唯一的 `[object Type]` 标识。

**为什么要用 call？**

直接调用 `[].toString()` 会得到不同的结果：

```javascript
[1, 2, 3].toString()   // '1,2,3' — Array.prototype.toString
({}).toString()        // '[object Object]'

// 必须用Object.prototype.toString
Object.prototype.toString.call([1, 2, 3])  // '[object Array]'
```

数组等类型覆盖了 `toString` 方法，所以需要显式调用 `Object.prototype.toString`。

## jQuery的class2type

jQuery创建了一个映射表：

```javascript
var class2type = {};
var toString = class2type.toString;  // 即 Object.prototype.toString

// 初始化映射表
jQuery.each(
    "Boolean Number String Function Array Date RegExp Object Error Symbol".split(" "),
    function( _i, name ) {
        class2type[ "[object " + name + "]" ] = name.toLowerCase();
    }
);

// class2type 的内容：
// {
//     '[object Boolean]': 'boolean',
//     '[object Number]': 'number',
//     '[object String]': 'string',
//     '[object Function]': 'function',
//     '[object Array]': 'array',
//     '[object Date]': 'date',
//     '[object RegExp]': 'regexp',
//     '[object Object]': 'object',
//     '[object Error]': 'error',
//     '[object Symbol]': 'symbol'
// }
```

## jQuery.type()

有了映射表，类型检测就简单了：

```javascript
jQuery.type = function( obj ) {
    if ( obj == null ) {
        return obj + "";  // 'null' 或 'undefined'
    }
    
    return typeof obj === "object" || typeof obj === "function" ?
        class2type[ toString.call( obj ) ] || "object" :
        typeof obj;
};
```

逻辑：
1. `null` 或 `undefined`：直接转字符串返回
2. 基本类型（非对象）：用 typeof
3. 对象类型：用 class2type 映射

```javascript
$.type( undefined )    // 'undefined'
$.type( null )         // 'null'
$.type( true )         // 'boolean'
$.type( 42 )           // 'number'
$.type( 'hello' )      // 'string'
$.type( [] )           // 'array'
$.type( {} )           // 'object'
$.type( new Date() )   // 'date'
$.type( /regex/ )      // 'regexp'
$.type( function(){} ) // 'function'
```

**注意**：jQuery 3.x 已废弃 `$.type()`，推荐使用原生方法。

## jQuery.isFunction()

```javascript
jQuery.isFunction = function( obj ) {
    return typeof obj === "function";
};
```

直接用 typeof，因为 typeof 对函数的判断是准确的。

## jQuery.isArray()

```javascript
jQuery.isArray = Array.isArray;
```

直接使用原生 `Array.isArray`。现代浏览器都支持。

## jQuery.isPlainObject()

判断是否是"纯粹的对象"——通过 `{}` 或 `new Object()` 创建的对象。

```javascript
jQuery.isPlainObject = function( obj ) {
    var proto, Ctor;

    // 排除非对象
    if ( !obj || toString.call( obj ) !== "[object Object]" ) {
        return false;
    }

    proto = Object.getPrototypeOf( obj );

    // 没有原型的对象（如 Object.create(null)）
    if ( !proto ) {
        return true;
    }

    // 检查是否由Object构造
    Ctor = proto.hasOwnProperty( "constructor" ) && proto.constructor;
    return typeof Ctor === "function" && 
           Function.prototype.toString.call( Ctor ) === 
           Function.prototype.toString.call( Object );
};
```

逻辑：
1. 必须是 `[object Object]`
2. 原型必须是 Object.prototype 或 null

```javascript
$.isPlainObject( {} )                     // true
$.isPlainObject( new Object() )           // true
$.isPlainObject( Object.create(null) )    // true

$.isPlainObject( [] )                     // false
$.isPlainObject( new Date() )             // false
$.isPlainObject( document.body )          // false
$.isPlainObject( new function Foo(){} )   // false
```

**为什么需要这个？**

深拷贝时，只有"纯对象"才需要递归处理：

```javascript
$.extend(true, {}, {
    date: new Date(),   // 不递归，直接引用
    config: { a: 1 }    // 递归处理
});
```

## jQuery.isEmptyObject()

判断对象是否为空：

```javascript
jQuery.isEmptyObject = function( obj ) {
    var name;
    for ( name in obj ) {
        return false;
    }
    return true;
};
```

如果 for-in 能枚举出任何属性，就不是空对象。

```javascript
$.isEmptyObject( {} )             // true
$.isEmptyObject( { a: 1 } )       // false
$.isEmptyObject( [] )             // true
$.isEmptyObject( [1, 2] )         // false
```

**注意**：这个方法会检查继承的可枚举属性。

## jQuery.isArrayLike()

判断是否是"类数组"：

```javascript
function isArrayLike( obj ) {
    var length = !!obj && "length" in obj && obj.length,
        type = jQuery.type( obj );

    // 排除函数和window
    if ( typeof obj === "function" || jQuery.isWindow( obj ) ) {
        return false;
    }

    return type === "array" || length === 0 ||
        typeof length === "number" && length > 0 && ( length - 1 ) in obj;
}
```

类数组的条件：
1. 有 `length` 属性
2. 不是函数（函数也有length，表示参数个数）
3. 不是 window（window.length是frame数量）
4. 如果 length > 0，则 `length - 1` 索引存在

```javascript
isArrayLike( [1, 2, 3] )              // true
isArrayLike( { 0: 'a', 1: 'b', length: 2 } )  // true
isArrayLike( document.querySelectorAll('div') )  // true
isArrayLike( 'hello' )                // true（字符串是类数组）
isArrayLike( { a: 1, b: 2 } )         // false
isArrayLike( function(){} )           // false
```

## 现代替代方案

ES6+ 提供了更好的类型检测方法：

**Array.isArray()**

```javascript
Array.isArray([])          // true
Array.isArray({length: 0}) // false
```

**typeof 的改进使用**

对于基本类型，typeof 足够好：

```javascript
if (typeof value === 'string') { }
if (typeof value === 'number') { }
if (typeof value === 'boolean') { }
if (typeof value === 'function') { }
if (typeof value === 'undefined') { }
```

**instanceof**

检查原型链：

```javascript
[] instanceof Array        // true
new Date() instanceof Date // true
/regex/ instanceof RegExp  // true
```

但 instanceof 对跨 iframe 的对象无效。

**类型守卫（TypeScript）**

TypeScript 提供了更好的类型检测方案：

```typescript
function isString(value: unknown): value is string {
    return typeof value === 'string';
}

function isArray<T>(value: unknown): value is T[] {
    return Array.isArray(value);
}
```

## 最佳实践

**基本类型**

```javascript
// 推荐
typeof value === 'string'
typeof value === 'number'
typeof value === 'boolean'
typeof value === 'function'
typeof value === 'undefined'
```

**null检测**

```javascript
// 推荐
value === null
```

**数组检测**

```javascript
// 推荐
Array.isArray(value)
```

**对象检测**

```javascript
// 纯对象
value !== null && typeof value === 'object' && !Array.isArray(value)

// 或者使用jQuery的isPlainObject思路
Object.prototype.toString.call(value) === '[object Object]'
```

**类数组检测**

```javascript
function isArrayLike(obj) {
    if (obj == null || typeof obj === 'function') return false;
    const length = obj.length;
    return typeof length === 'number' && length >= 0 && Number.isInteger(length);
}
```

## 小结

本章学习了jQuery的类型检测工具：

**typeof的局限**
- 无法区分 null 和 object
- 无法区分数组、日期、正则等对象类型

**jQuery的解决方案**
- Object.prototype.toString.call()
- class2type 映射表
- $.type() 统一类型检测

**常用检测方法**
- $.isFunction()：typeof obj === 'function'
- $.isArray()：Array.isArray
- $.isPlainObject()：检查原型链
- $.isEmptyObject()：for-in 遍历
- isArrayLike()：检查 length 属性

**现代替代方案**
- Array.isArray()
- typeof 配合严格比较
- TypeScript 类型守卫

下一章，我们将学习 `each` 和 `map` 遍历方法的实现。
