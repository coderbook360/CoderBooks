# jQuery函数与init构造器

`$('#id')` —— 这可能是前端开发中最著名的函数调用。

但你有没有想过：为什么可以直接调用 `$()`，而不需要写 `new $()`？返回的是什么对象？它是如何根据不同的参数做出不同的响应的？

本章将揭开jQuery函数的神秘面纱。

## jQuery函数的定义

让我们从源码开始：

```javascript
var jQuery = function( selector, context ) {
    return new jQuery.fn.init( selector, context );
};
```

就这么简单——jQuery函数的定义只有一行代码。

但这一行代码蕴含着精妙的设计：

1. `jQuery` 是一个普通函数，可以直接调用
2. 调用时，它返回 `new jQuery.fn.init()` 的结果
3. 真正的构造器是 `jQuery.fn.init`

## 为什么需要工厂模式

首先要问一个问题：为什么不直接让 `jQuery` 函数作为构造器？

假设我们这样设计：

```javascript
var jQuery = function( selector ) {
    this.selector = selector;
    this.elements = document.querySelectorAll( selector );
};

// 使用
var $div = new jQuery( 'div' );  // 必须用new
```

问题来了——每次都要写 `new`，太麻烦了。jQuery的设计目标是"Write Less, Do More"，强制用户写 `new` 显然不够优雅。

那么，我们能不能让函数自动处理 `new`？

```javascript
var jQuery = function( selector ) {
    if ( !(this instanceof jQuery) ) {
        return new jQuery( selector );  // 没有new时自动补上
    }
    this.selector = selector;
};

// 使用
var $div = jQuery( 'div' );  // 不用new也可以
```

这看起来可行，但有个问题：检查 `this instanceof jQuery` 时，如果没有使用 `new`，`this` 可能指向 `window`（非严格模式）或 `undefined`（严格模式）。

jQuery采用了更巧妙的方案——**使用独立的init函数作为真正的构造器**。

## init构造器

看看 `jQuery.fn.init` 的实现：

```javascript
jQuery.fn = jQuery.prototype = {
    constructor: jQuery,
    length: 0,
    // ... 其他方法
};

init = jQuery.fn.init = function( selector, context ) {
    var match, elem;
    
    // 空值处理
    if ( !selector ) {
        return this;
    }
    
    // 根据selector类型分别处理
    // ...
    
    return this;
};

// 关键：让init的实例也是jQuery的实例
init.prototype = jQuery.fn;
```

最后一行是关键：`init.prototype = jQuery.fn`。

这行代码让 `new jQuery.fn.init()` 返回的对象拥有 `jQuery.prototype` 上的所有方法。换句话说，`init` 的实例就是 `jQuery` 的实例。

**原型链示意**

```
$('div')
   |
   └── [[Prototype]] → init.prototype (= jQuery.fn = jQuery.prototype)
                            |
                            ├── css()
                            ├── html()
                            ├── on()
                            └── ... 其他jQuery方法
```

这个设计的精妙之处：
- 用户调用 `$()`，不需要 `new`
- 内部使用 `new init()`，确保返回新对象
- 通过 `init.prototype = jQuery.fn`，让返回的对象拥有jQuery的所有方法

## 参数处理逻辑

`init` 函数的核心工作是根据参数类型执行不同的操作。让我们逐一分析：

```javascript
init = jQuery.fn.init = function( selector, context ) {
    var match, elem;

    // 1. 处理 $(""), $(null), $(undefined), $(false)
    if ( !selector ) {
        return this;
    }

    // 2. 处理字符串
    if ( typeof selector === "string" ) {
        // 2.1 处理HTML字符串 $("<div>")
        if ( selector[ 0 ] === "<" && selector[ selector.length - 1 ] === ">" ) {
            match = [ null, selector, null ];
        } else {
            // 2.2 尝试快速匹配 #id 或 <tag>
            match = rquickExpr.exec( selector );
        }

        if ( match && ( match[ 1 ] || !context ) ) {
            // 处理 $("<div>") 或 $("#id")
            if ( match[ 1 ] ) {
                // HTML字符串 - 创建DOM元素
                jQuery.merge( this, jQuery.parseHTML( match[ 1 ], context ) );
            } else {
                // ID选择器 - 使用getElementById
                elem = document.getElementById( match[ 2 ] );
                if ( elem ) {
                    this[ 0 ] = elem;
                    this.length = 1;
                }
            }
        } else {
            // 其他选择器 - 使用Sizzle引擎
            return ( context || document ).querySelectorAll( selector );
        }

    // 3. 处理DOM元素 $(element)
    } else if ( selector.nodeType ) {
        this[ 0 ] = selector;
        this.length = 1;

    // 4. 处理函数 $(function)
    } else if ( typeof selector === "function" ) {
        // DOM ready
        return jQuery.ready.then( selector );
    }

    return this;
};
```

我来详细解释每个分支。

**1. 空值处理**

```javascript
if ( !selector ) {
    return this;
}
```

传入空值时，直接返回空的jQuery对象。这是一种防御性编程，避免后续代码出错。

**2. 字符串处理**

字符串是最常见的参数类型，但它可能表示不同的含义：

```javascript
$('#myId')        // ID选择器
$('.myClass')     // 类选择器
$('div > p')      // 复杂选择器
$('<div>')        // HTML字符串
$('<div>text</div>')  // HTML字符串
```

jQuery使用正则表达式快速区分：

```javascript
var rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
```

这个正则匹配两种模式：
- `<tag>` 或 `<tag>...</tag>`：HTML字符串
- `#id`：ID选择器

对于ID选择器，jQuery直接使用 `getElementById`，这比Sizzle引擎快得多：

```javascript
elem = document.getElementById( match[ 2 ] );
if ( elem ) {
    this[ 0 ] = elem;
    this.length = 1;
}
```

对于其他选择器（类选择器、属性选择器、复杂选择器），则交给Sizzle处理。

**3. DOM元素处理**

```javascript
if ( selector.nodeType ) {
    this[ 0 ] = selector;
    this.length = 1;
}
```

如果传入的是DOM元素（有 `nodeType` 属性），直接包装成jQuery对象。

使用场景：
```javascript
// 事件处理中，this是原生DOM元素
$('#btn').on('click', function() {
    $(this).addClass('active');  // 包装成jQuery对象
});
```

**4. 函数处理**

```javascript
if ( typeof selector === "function" ) {
    return jQuery.ready.then( selector );
}
```

如果传入函数，则注册为DOM ready回调。

```javascript
$(function() {
    console.log('DOM加载完成');
});

// 等价于
$(document).ready(function() {
    console.log('DOM加载完成');
});
```

## jQuery对象的本质

现在我们理解了init的工作方式。但jQuery对象到底是什么？

```javascript
var $divs = $('div');
console.log($divs);
// jQuery.fn.init [div, div, div, ...]
```

jQuery对象是一个**类数组对象**：
- 有 `length` 属性
- 有数字索引（`0`, `1`, `2`...）
- 可以用 `[i]` 访问元素
- 但不是真正的数组

```javascript
$divs[0]       // 第一个原生DOM元素
$divs.length   // 元素数量
$divs.eq(0)    // 返回jQuery对象
```

jQuery对象的结构：

```javascript
{
    0: <div>,          // 第一个DOM元素
    1: <div>,          // 第二个DOM元素
    2: <div>,          // 第三个DOM元素
    length: 3,         // 元素数量
    prevObject: ...,   // 上一个jQuery对象（用于end()）
    context: document, // 上下文
    selector: "div",   // 选择器字符串
    
    // 继承的方法（来自jQuery.prototype）
    css: function() {},
    html: function() {},
    on: function() {},
    // ...
}
```

## 参数重载的设计模式

jQuery的 `$()` 函数展示了一种常见的设计模式——**参数重载**。

同一个函数根据参数类型执行不同的操作：

```javascript
$('#id')           // 选择器
$('<div>')         // 创建元素
$(element)         // 包装元素
$(function)        // DOM ready
$($jqueryObj)      // 返回自身
```

这种设计的优点：
- API简洁，用户只需记住一个函数
- 符合直觉，参数类型决定行为
- 灵活，可以组合使用

缺点：
- 实现复杂，需要处理多种情况
- 类型不明确，IDE难以推断
- 可能造成意外行为

**现代API设计的思考**

现代JavaScript更推荐明确的函数签名。TypeScript的流行让类型安全变得更重要。

如果今天重新设计jQuery，可能会这样：

```javascript
$.select('#id')         // 选择
$.create('<div>')       // 创建
$.wrap(element)         // 包装
$.onReady(function)     // DOM ready
```

但在jQuery诞生的年代，简洁的API是巨大的优势。理解这种设计的权衡，有助于我们在自己的项目中做出合适的选择。

## 实现一个迷你jQuery

通过实现一个简化版jQuery，加深理解：

```javascript
var $ = function( selector ) {
    return new $.fn.init( selector );
};

$.fn = $.prototype = {
    constructor: $,
    length: 0,
    
    // 遍历方法
    each: function( callback ) {
        for ( var i = 0; i < this.length; i++ ) {
            callback.call( this[ i ], i, this[ i ] );
        }
        return this;
    },
    
    // 样式方法
    css: function( prop, value ) {
        return this.each(function() {
            this.style[ prop ] = value;
        });
    },
    
    // 事件方法
    on: function( event, handler ) {
        return this.each(function() {
            this.addEventListener( event, handler );
        });
    }
};

// init构造器
var init = $.fn.init = function( selector ) {
    if ( !selector ) {
        return this;
    }
    
    if ( typeof selector === 'string' ) {
        var elements = document.querySelectorAll( selector );
        for ( var i = 0; i < elements.length; i++ ) {
            this[ i ] = elements[ i ];
        }
        this.length = elements.length;
    } else if ( selector.nodeType ) {
        this[ 0 ] = selector;
        this.length = 1;
    }
    
    return this;
};

// 关键：连接原型链
init.prototype = $.fn;

// 使用
$('div').css('color', 'red').on('click', function() {
    console.log('clicked');
});
```

这个迷你版实现了核心功能：
- 工厂模式（不需要new）
- 参数重载（字符串/元素）
- 链式调用
- 类数组存储

## 小结

本章深入分析了jQuery函数的工作原理：

**jQuery函数**
- 是一个工厂函数，不需要 `new`
- 内部调用 `new jQuery.fn.init()`
- 返回jQuery对象（类数组）

**init构造器**
- 真正的构造器
- 根据参数类型执行不同操作
- 通过 `init.prototype = jQuery.fn` 连接原型链

**参数处理**
- 空值：返回空jQuery对象
- 字符串：选择器或HTML创建
- DOM元素：直接包装
- 函数：DOM ready回调

**设计模式**
- 工厂模式：隐藏构造细节
- 参数重载：一个接口多种用途

下一章，我们将探讨jQuery的原型链设计和链式调用的实现原理。
