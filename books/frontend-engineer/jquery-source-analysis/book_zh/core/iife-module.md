# 立即执行函数与模块封装

打开jQuery源码，你首先会看到一个巨大的函数包裹着所有代码。这就是IIFE（Immediately Invoked Function Expression，立即执行函数表达式）。

为什么需要这样做？这背后是JavaScript模块化的设计智慧。

## 问题：全局污染

首先要问一个问题：如果没有任何封装，直接把代码写在全局会怎样？

```javascript
// file1.js
var helper = function() { /* ... */ };
var data = [];

// file2.js
var helper = function() { /* 不同的实现 */ }; // 覆盖了file1的helper
var data = {};  // 覆盖了file1的data
```

灾难发生了——变量名冲突导致代码相互覆盖。

在没有模块系统的时代，所有JavaScript代码都运行在同一个全局作用域中。当项目规模增大，多人协作时，变量冲突几乎不可避免。

## 解决方案：IIFE

IIFE通过函数作用域创建了一个"私有空间"。

```javascript
(function() {
    // 这里的所有变量都是私有的
    var helper = function() { /* ... */ };
    var data = [];
    
    // 外部无法访问helper和data
})();
```

这段代码定义了一个匿名函数，并立即执行它。函数内部的变量 `helper` 和 `data` 只在函数作用域内可见，不会污染全局。

**语法解析**

```javascript
(function() { /* 代码 */ })();
 ^         ^               ^
 |         |               |
 |         |               └── 立即调用
 |         └── 函数体
 └── 用括号包裹，使其成为表达式
```

为什么需要外层括号？因为 `function` 关键字在语句开头会被解析为函数声明，而函数声明不能直接调用。用括号包裹后，它变成了函数表达式，可以立即调用。

## jQuery的IIFE结构

看看jQuery 3.7的实际封装结构：

```javascript
( function( global, factory ) {
    "use strict";
    
    if ( typeof module === "object" && typeof module.exports === "object" ) {
        // CommonJS环境
        module.exports = factory( global, true );
    } else {
        // 浏览器环境
        factory( global );
    }
}( typeof window !== "undefined" ? window : this, function( window, noGlobal ) {
    "use strict";
    
    // ========== jQuery核心代码 ==========
    
    var jQuery = function( selector, context ) {
        return new jQuery.fn.init( selector, context );
    };
    
    // ... 上万行代码 ...
    
    // 暴露到全局
    if ( !noGlobal ) {
        window.jQuery = window.$ = jQuery;
    }
    
    return jQuery;
}));
```

这个结构看起来复杂，我们拆解一下。

**外层：环境检测**

```javascript
( function( global, factory ) {
    if ( typeof module === "object" && typeof module.exports === "object" ) {
        module.exports = factory( global, true );
    } else {
        factory( global );
    }
}( window, function( window, noGlobal ) { /* ... */ }));
```

这段代码检测运行环境：
- 如果是Node.js/CommonJS环境，通过 `module.exports` 导出
- 如果是浏览器环境，直接执行factory函数

**内层：核心代码**

```javascript
function( window, noGlobal ) {
    var jQuery = function() { /* ... */ };
    
    // 核心代码...
    
    if ( !noGlobal ) {
        window.jQuery = window.$ = jQuery;
    }
    
    return jQuery;
}
```

核心代码在这个函数内部执行。通过参数 `noGlobal` 控制是否暴露到全局对象。

## 模块模式

IIFE不仅仅是隔离作用域，更重要的是实现了"模块模式"——定义私有成员和公共接口。

```javascript
var myModule = (function() {
    // 私有变量
    var privateData = [];
    var privateCounter = 0;
    
    // 私有函数
    function privateHelper() {
        return privateCounter++;
    }
    
    // 公共接口
    return {
        add: function(item) {
            privateData.push(item);
            privateHelper();
        },
        getCount: function() {
            return privateCounter;
        },
        getData: function() {
            return privateData.slice(); // 返回副本，保护原数据
        }
    };
})();

// 使用
myModule.add('a');
myModule.add('b');
console.log(myModule.getCount());  // 2
console.log(myModule.getData());   // ['a', 'b']
console.log(myModule.privateData); // undefined - 无法访问私有成员
```

这就是经典的模块模式：
- 私有变量：在函数作用域内定义，外部无法访问
- 公共接口：通过返回对象暴露，外部可以调用
- 闭包：公共方法可以访问私有变量

jQuery的核心代码都运行在一个巨大的闭包中，内部的变量和函数都是私有的，只有 `jQuery` 和 `$` 被暴露到全局。

## jQuery中的私有变量

让我们看看jQuery中哪些是私有的：

```javascript
( function( window ) {
    
    // 私有变量 - 外部无法访问
    var arr = [];
    var slice = arr.slice;
    var push = arr.push;
    var indexOf = arr.indexOf;
    var class2type = {};
    var toString = class2type.toString;
    var hasOwn = class2type.hasOwnProperty;
    
    // 正则表达式
    var rquickExpr = /^(?:\s*(<[\w\W]+>)[^>]*|#([\w-]+))$/;
    var rsingleTag = /^<([a-z][^\/\0>:\x20\t\r\n\f]*)[\x20\t\r\n\f]*\/?>(?:<\/\1>|)$/i;
    
    // 缓存对象
    var Expr = { /* Sizzle表达式对象 */ };
    
    // 公共接口 - 暴露到全局
    var jQuery = function( selector, context ) {
        return new jQuery.fn.init( selector, context );
    };
    
    window.jQuery = window.$ = jQuery;
    
})( window );
```

这些私有变量的好处：

1. **防止命名冲突**：`arr`、`slice` 这些通用名称不会与其他库冲突
2. **保护内部实现**：外部无法修改 `class2type` 等内部数据结构
3. **优化性能**：局部变量访问比全局变量更快

## 参数传递的设计

jQuery的IIFE接收 `window` 作为参数：

```javascript
(function( window ) {
    // 使用参数window而非全局window
})( window );
```

为什么不直接使用全局的 `window`？

**性能优化**

在JavaScript中，变量查找沿着作用域链进行。局部变量查找更快，因为不需要向上查找。将 `window` 作为参数传入，使其成为局部变量，频繁访问时性能更优。

```javascript
// 不使用参数 - 每次访问都要查找全局作用域
(function() {
    window.jQuery = /* ... */;  // 查找全局window
    window.$ = /* ... */;       // 再次查找全局window
})();

// 使用参数 - 直接访问局部变量
(function( window ) {
    window.jQuery = /* ... */;  // 访问局部变量window
    window.$ = /* ... */;       // 访问局部变量window
})( window );
```

**压缩优化**

使用参数还有利于代码压缩。压缩工具可以将局部变量名缩短：

```javascript
// 压缩前
(function( window ) {
    window.jQuery = /* ... */;
})( window );

// 压缩后
(function(a){a.jQuery=/* ... */})(window);
```

参数 `window` 被压缩为 `a`，而外部的 `window` 保持不变（压缩工具不会修改全局变量名）。

## 与ES Module的对比

现代JavaScript有了原生的模块系统——ES Module。让我们对比一下：

**IIFE模块**
```javascript
// math.js
var MathModule = (function() {
    function add(a, b) { return a + b; }
    function multiply(a, b) { return a * b; }
    
    return { add, multiply };
})();

// 使用
MathModule.add(1, 2);
```

**ES Module**
```javascript
// math.js
export function add(a, b) { return a + b; }
export function multiply(a, b) { return a * b; }

// app.js
import { add, multiply } from './math.js';
add(1, 2);
```

**相似之处**

- 都解决了全局污染问题
- 都支持私有成员和公共导出
- 都可以明确依赖关系

**不同之处**

| 特性 | IIFE | ES Module |
|------|------|-----------|
| 语法 | 函数包裹 | import/export |
| 加载 | 同步 | 可异步 |
| 依赖 | 手动管理 | 自动解析 |
| 静态分析 | 困难 | 支持 |
| Tree Shaking | 不支持 | 支持 |

ES Module是语言层面的模块系统，拥有更多优势。但IIFE作为一种设计模式，其核心思想——**作用域隔离、私有封装、接口暴露**——与ES Module一脉相承。

## jQuery 3.7的模块化

jQuery 3.7的源码实际上使用ES Module编写：

```javascript
// src/core.js
import arr from "./var/arr.js";
import getProto from "./var/getProto.js";
import slice from "./var/slice.js";
// ...

var jQuery = function( selector, context ) {
    return new jQuery.fn.init( selector, context );
};

export default jQuery;
```

构建时，这些ES Module会被打包成一个IIFE包裹的文件，以支持不同的运行环境。

这就是现代库的常见模式：
- **开发时**使用ES Module，享受模块化的便利
- **发布时**打包为IIFE/UMD，保证兼容性

## 设计启示

从jQuery的IIFE封装中，我们可以学到：

**1. 作用域隔离是模块化的基础**

无论是IIFE还是ES Module，核心目标都是创建独立的作用域，避免全局污染。

**2. 私有与公共的分离**

好的模块设计应该明确区分私有实现和公共接口。私有部分可以自由修改，公共接口保持稳定。

**3. 依赖要显式**

jQuery通过参数传入 `window`，ES Module通过 `import` 声明依赖。显式的依赖关系让代码更易理解和维护。

**4. 为不同环境适配**

jQuery的封装同时支持浏览器和CommonJS环境。设计通用库时，考虑多环境适配是重要的。

## 小结

本章我们学习了jQuery的IIFE封装：

- **IIFE的作用**：创建独立作用域，避免全局污染
- **模块模式**：通过闭包实现私有成员和公共接口
- **参数传递**：性能优化和压缩优化
- **与ES Module对比**：同样的设计理念，不同的实现方式

IIFE是ES Module之前的模块化方案，理解它有助于我们理解JavaScript模块化的演进历程，以及模块化设计的核心思想。

下一章，我们将深入jQuery函数和init构造器，看看 `$()` 这个神奇的函数是如何工作的。
