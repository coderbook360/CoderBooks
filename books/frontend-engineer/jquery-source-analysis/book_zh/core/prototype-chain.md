# 原型链与链式调用

```javascript
$('#box')
    .css('color', 'red')
    .addClass('active')
    .fadeIn()
    .find('p')
    .text('Hello');
```

一行代码完成五个操作——这就是jQuery著名的链式调用。

但这不是魔法，而是精心设计的原型链结构。本章将揭示其背后的原理。

## jQuery.fn的本质

首先要问一个问题：`$.fn` 是什么？

答案很简单：

```javascript
jQuery.fn = jQuery.prototype;
```

`fn` 只是 `prototype` 的别名。jQuery创建这个别名有几个原因：

1. **更短**：写 `$.fn.myPlugin` 比 `$.prototype.myPlugin` 更简洁
2. **语义明确**：`fn` 暗示"functions"，表示这是方法集合
3. **隐藏实现**：避免用户直接操作 `prototype` 这个"底层"概念

当你写jQuery插件时：

```javascript
$.fn.myPlugin = function() {
    // 插件代码
};
```

实际上是在扩展 `jQuery.prototype`，让所有jQuery实例都能使用这个方法。

## 原型链结构

让我们画出jQuery对象的完整原型链：

```javascript
var $div = $('div');

// 原型链
$div
   └── [[Prototype]] → jQuery.fn (= jQuery.prototype = init.prototype)
                            ├── jquery: "3.7.1"
                            ├── constructor: jQuery
                            ├── length: 0
                            ├── toArray()
                            ├── get()
                            ├── pushStack()
                            ├── each()
                            ├── map()
                            ├── first()
                            ├── last()
                            ├── eq()
                            ├── end()
                            ├── css()
                            ├── html()
                            ├── on()
                            └── ... 更多方法
                                    |
                                    └── [[Prototype]] → Object.prototype
                                            ├── hasOwnProperty()
                                            ├── toString()
                                            └── ...
```

关键点：

1. **$div** 是 `new jQuery.fn.init()` 返回的实例
2. **jQuery.fn** 同时是 `jQuery.prototype` 和 `init.prototype`
3. 所有jQuery方法都定义在 **jQuery.fn** 上
4. jQuery.fn 继承自 **Object.prototype**

## init.prototype = jQuery.fn

上一章我们看到了这行关键代码：

```javascript
init.prototype = jQuery.fn;
```

为什么这行代码如此重要？

```javascript
var jQuery = function( selector ) {
    return new jQuery.fn.init( selector );
};

jQuery.fn = jQuery.prototype = { /* 方法 */ };

var init = jQuery.fn.init = function( selector ) { /* ... */ };

init.prototype = jQuery.fn;  // 关键！
```

思考一下：`new init()` 返回的对象，它的原型是什么？

根据JavaScript规则，`new Constructor()` 返回的对象的原型是 `Constructor.prototype`。

所以：
- `new init()` 的原型是 `init.prototype`
- 通过 `init.prototype = jQuery.fn`
- `new init()` 的原型就变成了 `jQuery.fn`

这样，通过 `$()` 创建的对象就能访问 `jQuery.fn` 上的所有方法了。

**验证**

```javascript
var $div = $('div');

console.log( $div instanceof jQuery );           // true
console.log( Object.getPrototypeOf($div) === jQuery.fn );  // true
console.log( $div.css === jQuery.fn.css );       // true
```

## 链式调用的实现

现在来看链式调用是如何实现的。

秘密只有一个：**return this**。

```javascript
jQuery.fn = {
    css: function( prop, value ) {
        // 设置样式的逻辑
        // ...
        return this;  // 返回jQuery对象本身
    },
    
    addClass: function( className ) {
        // 添加类名的逻辑
        // ...
        return this;  // 返回jQuery对象本身
    },
    
    html: function( value ) {
        if ( value === undefined ) {
            // getter模式 - 返回值
            return this[0].innerHTML;
        }
        // setter模式 - 返回this
        this[0].innerHTML = value;
        return this;
    }
};
```

当方法返回 `this` 时，返回的是jQuery对象本身。于是可以继续调用下一个方法：

```javascript
$('#box').css('color', 'red').addClass('active');
//       ↓                   ↓
//       返回$('#box')        返回$('#box')
```

每个方法调用后，返回的还是同一个jQuery对象，所以可以继续链式调用。

**getter/setter模式**

有些方法既可以读取也可以设置值，比如 `html()`：

```javascript
$('#box').html();           // 读取，返回字符串
$('#box').html('<p>Hi</p>'); // 设置，返回jQuery对象
```

读取时返回具体值，设置时返回 `this`。这是jQuery中常见的模式。

## 隐式迭代

链式调用的另一个特点是**隐式迭代**。

当jQuery对象包含多个元素时，操作会自动应用到所有元素：

```javascript
$('div').css('color', 'red');  // 所有div都变红
```

实现原理：

```javascript
jQuery.fn.css = function( prop, value ) {
    // 遍历所有元素
    for ( var i = 0; i < this.length; i++ ) {
        this[i].style[prop] = value;
    }
    return this;
};
```

更优雅的写法是使用 `each`：

```javascript
jQuery.fn.css = function( prop, value ) {
    return this.each(function() {
        this.style[prop] = value;
    });
};

jQuery.fn.each = function( callback ) {
    for ( var i = 0; i < this.length; i++ ) {
        callback.call( this[i], i, this[i] );
    }
    return this;  // each也返回this，支持链式调用
};
```

隐式迭代让代码更简洁：

```javascript
// 没有隐式迭代，需要手动遍历
var divs = document.querySelectorAll('div');
divs.forEach(function(div) {
    div.style.color = 'red';
});

// 有隐式迭代，一行搞定
$('div').css('color', 'red');
```

## 静态方法vs实例方法

jQuery有两种方法：

**静态方法**：挂在 `jQuery` 对象上

```javascript
$.each(array, callback);
$.extend(target, source);
$.ajax(options);
$.isArray(obj);
```

**实例方法**：挂在 `jQuery.fn` 上

```javascript
$('div').each(callback);
$('div').css('color', 'red');
$('div').on('click', handler);
```

两者的区别：

| 特性 | 静态方法 | 实例方法 |
|------|----------|----------|
| 调用方式 | `$.method()` | `$(...).method()` |
| 定义位置 | `jQuery` | `jQuery.fn` |
| this指向 | 无意义 | jQuery对象 |
| 用途 | 工具函数 | 操作DOM元素 |

有些方法同时有静态版和实例版：

```javascript
// 静态版 - 遍历任意对象/数组
$.each([1, 2, 3], function(i, val) {
    console.log(val);
});

// 实例版 - 遍历jQuery对象中的元素
$('div').each(function(i, elem) {
    console.log(elem);
});
```

实例版通常会调用静态版：

```javascript
jQuery.fn.each = function( callback ) {
    return jQuery.each( this, callback );  // 调用静态版
};
```

这种设计避免了代码重复。

## 流畅接口设计模式

jQuery的链式调用体现了**流畅接口（Fluent Interface）**设计模式。

这种模式的特点是方法返回自身，允许连续调用。现代JavaScript中很多API都采用这种模式：

**Promise链**

```javascript
fetch('/api/data')
    .then(response => response.json())
    .then(data => process(data))
    .catch(error => console.error(error));
```

**数组方法链**

```javascript
[1, 2, 3, 4, 5]
    .filter(n => n > 2)
    .map(n => n * 2)
    .reduce((a, b) => a + b);
```

**Builder模式**

```javascript
new QueryBuilder()
    .select('name', 'age')
    .from('users')
    .where('age', '>', 18)
    .orderBy('name')
    .build();
```

**何时使用链式调用**

链式调用适合以下场景：
- 对同一个对象执行多个操作
- 操作顺序有意义
- 希望代码更紧凑可读

不适合的场景：
- 每一步都需要检查结果
- 操作可能失败需要处理
- 方法有重要返回值

## 实现练习

让我们实现一个支持链式调用的迷你DOM库：

```javascript
class DOMWrapper {
    constructor(selector) {
        if (typeof selector === 'string') {
            this.elements = [...document.querySelectorAll(selector)];
        } else if (selector instanceof Element) {
            this.elements = [selector];
        } else {
            this.elements = [];
        }
        this.length = this.elements.length;
        
        // 设置数字索引
        this.elements.forEach((el, i) => {
            this[i] = el;
        });
    }
    
    each(callback) {
        this.elements.forEach((el, i) => {
            callback.call(el, i, el);
        });
        return this;  // 链式调用
    }
    
    css(prop, value) {
        return this.each(function() {
            this.style[prop] = value;
        });
    }
    
    addClass(className) {
        return this.each(function() {
            this.classList.add(className);
        });
    }
    
    removeClass(className) {
        return this.each(function() {
            this.classList.remove(className);
        });
    }
    
    on(event, handler) {
        return this.each(function() {
            this.addEventListener(event, handler);
        });
    }
    
    html(value) {
        if (value === undefined) {
            return this[0]?.innerHTML;  // getter
        }
        return this.each(function() {
            this.innerHTML = value;  // setter
        });
    }
}

// 工厂函数
function $(selector) {
    return new DOMWrapper(selector);
}

// 使用
$('.box')
    .css('background', '#f0f0f0')
    .addClass('active')
    .on('click', function() {
        console.log('clicked:', this);
    });
```

这个实现包含了jQuery原型链设计的核心要素：
- 类数组结构
- 隐式迭代
- 链式调用
- getter/setter模式

## 小结

本章深入分析了jQuery的原型链和链式调用：

**jQuery.fn**
- `jQuery.fn = jQuery.prototype` 的别名
- 所有实例方法都定义在这里
- `init.prototype = jQuery.fn` 连接原型链

**原型链结构**
- jQuery对象 → jQuery.fn → Object.prototype
- 所有jQuery对象共享原型上的方法

**链式调用**
- 核心：`return this`
- 隐式迭代：自动应用到所有元素
- getter/setter：读取返回值，设置返回this

**静态方法vs实例方法**
- 静态方法：工具函数，挂在jQuery上
- 实例方法：DOM操作，挂在jQuery.fn上

**流畅接口**
- 设计模式的实际应用
- 现代API广泛采用

下一章，我们将学习 `pushStack` 和结果集栈管理，理解jQuery如何追踪DOM遍历的历史。
