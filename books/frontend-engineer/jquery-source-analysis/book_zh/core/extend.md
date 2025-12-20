# jQuery.extend深度解析

`jQuery.extend` 可能是jQuery中使用最频繁的函数之一。

它只有一个，却能做很多事：

```javascript
// 扩展jQuery
$.extend({ myMethod: function() {} });

// 扩展jQuery原型
$.fn.extend({ myPlugin: function() {} });

// 合并对象
$.extend(target, obj1, obj2);

// 深拷贝
$.extend(true, target, source);

// 默认参数
var opts = $.extend({}, defaults, options);
```

一个函数，五种用法。这是怎么做到的？

## extend的多种用法

让我们逐一理解每种用法。

**用法一：扩展jQuery静态方法**

```javascript
$.extend({
    log: function(msg) {
        console.log('[jQuery]', msg);
    },
    sum: function(a, b) {
        return a + b;
    }
});

// 使用
$.log('Hello');     // [jQuery] Hello
$.sum(1, 2);        // 3
```

只传一个对象参数时，extend 将属性添加到 jQuery 自身。

**用法二：扩展jQuery原型**

```javascript
$.fn.extend({
    highlight: function(color) {
        return this.css('background', color);
    },
    shake: function() {
        // 震动效果
        return this;
    }
});

// 使用
$('div').highlight('yellow').shake();
```

`$.fn.extend` 将方法添加到 jQuery.prototype，所有jQuery对象都能使用。

**用法三：合并对象**

```javascript
var obj1 = { a: 1, b: 2 };
var obj2 = { b: 3, c: 4 };
var result = $.extend({}, obj1, obj2);

console.log(result);  // { a: 1, b: 3, c: 4 }
```

将多个源对象的属性合并到目标对象。后面的属性覆盖前面的。

**用法四：深拷贝**

```javascript
var source = {
    name: 'John',
    address: {
        city: 'New York',
        zip: '10001'
    }
};

// 浅拷贝
var shallow = $.extend({}, source);
shallow.address.city = 'Boston';
console.log(source.address.city);  // 'Boston' - 原对象被修改了！

// 深拷贝
var deep = $.extend(true, {}, source);
deep.address.city = 'Chicago';
console.log(source.address.city);  // 'Boston' - 原对象不受影响
```

第一个参数传 `true`，执行深拷贝。

**用法五：默认参数模式**

这是最常见的用法，用于处理函数的可选参数：

```javascript
function createDialog(options) {
    var defaults = {
        title: 'Dialog',
        width: 400,
        height: 300,
        modal: true
    };
    
    var settings = $.extend({}, defaults, options);
    
    // settings现在包含合并后的配置
    console.log(settings.title);   // 用户提供的或'Dialog'
    console.log(settings.width);   // 用户提供的或400
}

createDialog({ title: 'Warning', width: 500 });
// settings: { title: 'Warning', width: 500, height: 300, modal: true }
```

用空对象作为目标，避免修改 defaults。

## 源码分析

现在来看 extend 的实现：

```javascript
jQuery.extend = jQuery.fn.extend = function() {
    var options, name, src, copy, copyIsArray, clone,
        target = arguments[ 0 ] || {},
        i = 1,
        length = arguments.length,
        deep = false;

    // 处理深拷贝标志
    if ( typeof target === "boolean" ) {
        deep = target;
        target = arguments[ i ] || {};
        i++;
    }

    // 处理target不是对象的情况
    if ( typeof target !== "object" && typeof target !== "function" ) {
        target = {};
    }

    // 如果只传一个参数，扩展jQuery自身
    if ( i === length ) {
        target = this;
        i--;
    }

    // 遍历源对象
    for ( ; i < length; i++ ) {
        if ( ( options = arguments[ i ] ) != null ) {
            for ( name in options ) {
                copy = options[ name ];

                // 防止循环引用
                if ( name === "__proto__" || target === copy ) {
                    continue;
                }

                // 深拷贝
                if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
                    ( copyIsArray = Array.isArray( copy ) ) ) ) {
                    
                    src = target[ name ];

                    if ( copyIsArray && !Array.isArray( src ) ) {
                        clone = [];
                    } else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
                        clone = {};
                    } else {
                        clone = src;
                    }
                    copyIsArray = false;

                    // 递归
                    target[ name ] = jQuery.extend( deep, clone, copy );

                } else if ( copy !== undefined ) {
                    // 浅拷贝
                    target[ name ] = copy;
                }
            }
        }
    }

    return target;
};
```

让我们逐段解析。

**第一步：参数归一化**

```javascript
var target = arguments[ 0 ] || {},
    i = 1,
    length = arguments.length,
    deep = false;

// 处理深拷贝标志
if ( typeof target === "boolean" ) {
    deep = target;
    target = arguments[ i ] || {};
    i++;
}
```

extend 的参数是可变的。第一个参数可能是：
- 布尔值（深拷贝标志）
- 目标对象

如果第一个是布尔值，提取它作为 `deep`，然后第二个参数才是目标对象。

**第二步：扩展自身的处理**

```javascript
if ( i === length ) {
    target = this;
    i--;
}
```

如果只传了一个对象（即 `i === length`），说明没有目标对象，应该扩展 `this`。

- 通过 `$.extend({...})` 调用时，`this` 是 jQuery
- 通过 `$.fn.extend({...})` 调用时，`this` 是 jQuery.fn

**第三步：遍历并复制**

```javascript
for ( ; i < length; i++ ) {
    if ( ( options = arguments[ i ] ) != null ) {
        for ( name in options ) {
            copy = options[ name ];
            
            if ( copy !== undefined ) {
                target[ name ] = copy;  // 浅拷贝
            }
        }
    }
}
```

这是浅拷贝的核心：遍历每个源对象的属性，直接赋值给目标对象。

**第四步：深拷贝处理**

```javascript
if ( deep && copy && ( jQuery.isPlainObject( copy ) ||
    ( copyIsArray = Array.isArray( copy ) ) ) ) {
    
    src = target[ name ];

    if ( copyIsArray && !Array.isArray( src ) ) {
        clone = [];
    } else if ( !copyIsArray && !jQuery.isPlainObject( src ) ) {
        clone = {};
    } else {
        clone = src;
    }
    copyIsArray = false;

    // 递归合并
    target[ name ] = jQuery.extend( deep, clone, copy );
}
```

深拷贝时，如果值是对象或数组，递归调用 extend。

逻辑是：
1. 检查 `copy` 是否是普通对象或数组
2. 确定 `clone` 的初始值（空数组/空对象/已有值）
3. 递归调用 extend 合并

**第五步：循环引用保护**

```javascript
if ( name === "__proto__" || target === copy ) {
    continue;
}
```

两种情况需要跳过：
- `__proto__` 属性：避免原型污染攻击
- `target === copy`：避免无限循环

## 浅拷贝vs深拷贝

理解两者的区别很重要。

**浅拷贝**

```javascript
var original = {
    name: 'John',
    scores: [90, 85, 88]
};

var shallow = $.extend({}, original);

// 修改嵌套对象
shallow.scores.push(95);

console.log(original.scores);  // [90, 85, 88, 95] - 原对象也被修改了！
```

浅拷贝只复制第一层。嵌套的对象/数组仍然是引用。

**深拷贝**

```javascript
var original = {
    name: 'John',
    scores: [90, 85, 88]
};

var deep = $.extend(true, {}, original);

// 修改嵌套对象
deep.scores.push(95);

console.log(original.scores);  // [90, 85, 88] - 原对象不受影响
console.log(deep.scores);      // [90, 85, 88, 95]
```

深拷贝递归复制所有层级，创建完全独立的副本。

**何时使用深拷贝**

- 需要完全独立的副本
- 要修改嵌套数据但不影响原对象
- 配置对象的克隆

**深拷贝的代价**

- 性能开销：递归遍历所有属性
- 内存占用：创建所有嵌套对象的副本
- 限制：无法处理函数、DOM元素、循环引用（会无限递归）

## 现代替代方案

ES6+ 提供了几种替代 extend 的方式。

**Object.assign（浅拷贝）**

```javascript
// jQuery
var result = $.extend({}, obj1, obj2);

// ES6
var result = Object.assign({}, obj1, obj2);
```

功能等同于 `$.extend` 的浅拷贝。

**展开运算符（浅拷贝）**

```javascript
// jQuery
var result = $.extend({}, defaults, options);

// ES6+
var result = { ...defaults, ...options };
```

更简洁的语法，但只能浅拷贝。

**structuredClone（深拷贝）**

```javascript
// jQuery
var deep = $.extend(true, {}, source);

// 现代浏览器
var deep = structuredClone(source);
```

原生深拷贝，支持循环引用，但不支持函数。

**对比**

| 方法 | 浅/深 | 函数 | 循环引用 | 兼容性 |
|------|-------|------|----------|--------|
| $.extend | 都支持 | ✓ | 部分 | 全部 |
| Object.assign | 浅 | ✓ | - | ES6+ |
| 展开运算符 | 浅 | ✓ | - | ES6+ |
| structuredClone | 深 | ✗ | ✓ | 较新 |
| JSON.parse/stringify | 深 | ✗ | ✗ | 全部 |

## 设计思想

extend 展示了几个值得学习的设计技巧。

**1. 参数重载**

一个函数根据参数数量和类型执行不同操作：

```javascript
// 1个参数 - 扩展自身
$.extend({ foo: 1 });

// 2个参数 - 合并对象
$.extend(target, source);

// 第一个是boolean - 深拷贝
$.extend(true, target, source);
```

**2. 可变参数**

支持任意数量的源对象：

```javascript
$.extend(target, src1, src2, src3, /* ... */);
```

**3. 返回目标对象**

返回修改后的目标对象，支持链式使用：

```javascript
var result = $.extend({}, a, b);
```

**4. 统一静态和实例方法**

```javascript
jQuery.extend = jQuery.fn.extend = function() {
    // 同一个实现
    // this指向调用者（jQuery或jQuery.fn）
};
```

通过 `this` 实现两种用法共用一套代码。

## 实现练习

实现一个简化版的 extend：

```javascript
function extend(deep, target, ...sources) {
    // 参数归一化
    if (typeof deep !== 'boolean') {
        sources.unshift(target);
        target = deep;
        deep = false;
    }
    
    // 遍历源对象
    for (const source of sources) {
        if (source == null) continue;
        
        for (const key of Object.keys(source)) {
            const value = source[key];
            
            // 深拷贝
            if (deep && value && typeof value === 'object') {
                if (Array.isArray(value)) {
                    target[key] = extend(true, [], value);
                } else if (isPlainObject(value)) {
                    target[key] = extend(true, target[key] || {}, value);
                } else {
                    target[key] = value;
                }
            } else if (value !== undefined) {
                target[key] = value;
            }
        }
    }
    
    return target;
}

function isPlainObject(obj) {
    return Object.prototype.toString.call(obj) === '[object Object]';
}

// 测试
const defaults = { a: 1, b: { c: 2 } };
const options = { b: { d: 3 } };

// 浅拷贝
console.log(extend({}, defaults, options));
// { a: 1, b: { d: 3 } }

// 深拷贝
console.log(extend(true, {}, defaults, options));
// { a: 1, b: { c: 2, d: 3 } }
```

## 小结

本章深入分析了 `jQuery.extend`：

**多种用法**
- 扩展jQuery静态方法
- 扩展jQuery实例方法
- 合并对象
- 深拷贝
- 默认参数模式

**实现原理**
- 参数归一化处理
- 通过 `this` 区分静态/实例扩展
- 浅拷贝直接赋值
- 深拷贝递归处理

**浅拷贝vs深拷贝**
- 浅拷贝只复制第一层
- 深拷贝递归复制所有层级
- 深拷贝有性能开销

**现代替代方案**
- `Object.assign`：浅拷贝
- 展开运算符：浅拷贝
- `structuredClone`：深拷贝

**设计思想**
- 参数重载
- 可变参数
- 统一静态和实例方法

下一章，我们将学习 `access` 通用访问器模式——jQuery如何用一个函数同时实现getter和setter。
