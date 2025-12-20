# jQuery 3.7源码结构与入口

在正式开始阅读源码之前，我们需要先建立对jQuery源码的整体认知。这就像进入一座陌生的城市，你首先需要一张地图。

本章将带你了解jQuery 3.7的源码组织结构，找到阅读的入口点，为后续的深入学习打好基础。

## 获取源码

首先要问一个问题：我们应该读哪个版本的源码？

jQuery有两种形态的代码：

- **发布版本**：经过构建打包的单文件，适合在项目中使用
- **源码版本**：GitHub上的原始代码，按模块组织，适合阅读学习

我们要读的是源码版本。从GitHub获取：

```bash
git clone https://github.com/jquery/jquery.git
cd jquery
git checkout 3.7.1  # 切换到3.7.1版本
```

你也可以直接在GitHub上在线浏览：https://github.com/jquery/jquery/tree/3.7.1

## 目录结构概览

让我们看看jQuery源码的目录结构：

```
jquery/
├── src/                # 源码目录（重点关注）
│   ├── jquery.js       # 入口文件
│   ├── core.js         # 核心模块
│   ├── selector.js     # 选择器模块（Sizzle封装）
│   ├── traversing.js   # DOM遍历
│   ├── manipulation.js # DOM操作
│   ├── css.js          # 样式处理
│   ├── event.js        # 事件系统
│   ├── ajax.js         # Ajax模块
│   ├── effects.js      # 动画效果
│   ├── data/           # 数据缓存
│   ├── deferred/       # Deferred对象
│   ├── exports/        # 模块导出
│   └── ...
├── dist/               # 构建产物
├── test/               # 测试文件
├── build/              # 构建脚本
├── Gruntfile.js        # Grunt配置
└── package.json
```

`src` 目录是我们学习的重点。其中每个文件对应jQuery的一个功能模块。

## 模块职责划分

jQuery的源码按功能划分为多个模块，每个模块职责清晰：

**核心模块（core相关）**

- `core.js`：jQuery构造函数、原型方法、工具函数
- `core/init.js`：`$()`的初始化逻辑
- `core/access.js`：属性读写的通用访问器
- `core/ready.js`：DOM ready事件处理

**选择器模块**

- `selector.js`：选择器入口，封装Sizzle
- `selector/`：选择器相关辅助函数
- `external/sizzle/`：Sizzle选择器引擎（作为外部依赖）

**DOM操作模块**

- `traversing.js`：DOM遍历（parent、children、find等）
- `manipulation.js`：DOM操作（append、remove等）
- `manipulation/`：DOM操作的辅助函数

**样式与属性模块**

- `css.js`：CSS样式读写
- `css/`：样式处理辅助函数
- `attributes.js`：属性操作（attr、prop、class等）

**事件模块**

- `event.js`：事件系统核心

**Ajax模块**

- `ajax.js`：Ajax入口
- `ajax/`：Ajax相关辅助模块

**动画模块**

- `effects.js`：动画效果
- `effects/`：动画辅助函数

**工具模块**

- `deferred.js`：Deferred对象（Promise的前身）
- `callbacks.js`：回调函数队列
- `queue.js`：通用队列
- `data/`：数据缓存系统

## 模块依赖关系

这些模块之间存在依赖关系。理解这些依赖，有助于我们选择合适的阅读顺序。

```
jquery.js (入口)
    └── core.js (核心)
            ├── selector.js (选择器)
            ├── callbacks.js (回调队列)
            ├── deferred.js (异步控制)
            │       └── callbacks.js
            ├── data.js (数据缓存)
            ├── queue.js (队列)
            │       └── data.js
            ├── attributes.js (属性)
            │       └── data.js
            ├── css.js (样式)
            ├── traversing.js (遍历)
            ├── manipulation.js (操作)
            │       └── data.js
            ├── event.js (事件)
            │       └── data.js
            ├── ajax.js (Ajax)
            │       └── deferred.js
            └── effects.js (动画)
                    ├── css.js
                    └── queue.js
```

可以看到，`core.js` 是所有模块的基础，`data.js` 被多个模块依赖（事件、属性、操作等都需要数据存储），`callbacks.js` 是 `deferred.js` 的基础。

## 入口文件分析

打开 `src/jquery.js`，这是jQuery的入口文件：

```javascript
import jQuery from "./core.js";
import "./core/ready.js";
import "./core/access.js";
import "./core/init.js";
import "./traversing.js";
import "./manipulation.js";
import "./css.js";
import "./attributes.js";
import "./event.js";
import "./ajax.js";
import "./effects.js";
import "./exports/amd.js";
import "./exports/global.js";

export default jQuery;
```

非常简洁——入口文件只做一件事：按顺序导入所有模块，然后导出jQuery对象。

这里有几个值得注意的点：

**1. ES Module语法**

jQuery 3.x的源码使用ES Module（import/export）编写。这与最终发布的UMD版本不同——构建过程会将ES Module转换为兼容各种环境的格式。

**2. 导入顺序有讲究**

模块的导入顺序体现了依赖关系。`core.js` 最先导入，因为其他所有模块都依赖它。

**3. 副作用导入**

除了 `core.js`，其他模块都是"副作用导入"（没有 `from` 赋值）。这些模块导入时会自动将方法挂载到jQuery原型上。

## 核心模块：一切的起点

让我们看看 `src/core.js` 的结构：

```javascript
import arr from "./var/arr.js";
import getProto from "./var/getProto.js";
import slice from "./var/slice.js";
import flat from "./var/flat.js";
import push from "./var/push.js";
import indexOf from "./var/indexOf.js";
import class2type from "./var/class2type.js";
import toString from "./var/toString.js";
import hasOwn from "./var/hasOwn.js";
import fnToString from "./var/fnToString.js";
import ObjectFunctionString from "./var/ObjectFunctionString.js";
import support from "./var/support.js";
import isArrayLike from "./core/isArrayLike.js";
import DOMEval from "./core/DOMEval.js";

var version = "3.7.1",
    rhtmlSuffix = /HTML$/i,

    // 定义jQuery构造函数
    jQuery = function( selector, context ) {
        return new jQuery.fn.init( selector, context );
    };

// jQuery原型定义
jQuery.fn = jQuery.prototype = {
    jquery: version,
    constructor: jQuery,
    length: 0,
    
    toArray: function() { /* ... */ },
    get: function( num ) { /* ... */ },
    pushStack: function( elems ) { /* ... */ },
    each: function( callback ) { /* ... */ },
    map: function( callback ) { /* ... */ },
    slice: function() { /* ... */ },
    first: function() { /* ... */ },
    last: function() { /* ... */ },
    eq: function( i ) { /* ... */ },
    end: function() { /* ... */ },
    push: push,
    sort: arr.sort,
    splice: arr.splice
};

// extend方法
jQuery.extend = jQuery.fn.extend = function() { /* ... */ };

// 静态工具方法
jQuery.extend( {
    isFunction: function( obj ) { /* ... */ },
    isArray: Array.isArray,
    isWindow: function( obj ) { /* ... */ },
    type: function( obj ) { /* ... */ },
    each: function( obj, callback ) { /* ... */ },
    trim: function( text ) { /* ... */ },
    makeArray: function( arr, results ) { /* ... */ },
    inArray: function( elem, arr, i ) { /* ... */ },
    merge: function( first, second ) { /* ... */ },
    grep: function( elems, callback, invert ) { /* ... */ },
    map: function( elems, callback, arg ) { /* ... */ },
    // ...更多工具方法
} );

export default jQuery;
```

这就是jQuery的"心脏"。几个关键点：

**1. jQuery函数的本质**

`jQuery` 是一个函数，调用它返回的是 `new jQuery.fn.init()`。这就是著名的"工厂模式"——你不需要写 `new`，jQuery内部帮你处理了。

**2. 原型的双重赋值**

`jQuery.fn = jQuery.prototype`，这个赋值让 `$.fn` 成为 `$.prototype` 的别名，插件开发时写 `$.fn.myPlugin` 就是在扩展原型。

**3. extend的核心地位**

`jQuery.extend` 既是静态方法也是实例方法。它是jQuery扩展机制的基础，后面我们会专门分析它的实现。

## 源码阅读路线推荐

了解了源码结构，现在我们来规划阅读路线。

**第一步：核心架构（本书第二部分）**

从 `core.js` 和 `core/init.js` 开始，理解：
- jQuery函数如何工作
- 原型链如何组织
- 链式调用如何实现
- extend如何扩展

这是整个jQuery的骨架，必须首先掌握。

**第二步：选择器引擎（本书第三部分）**

Sizzle选择器引擎是jQuery最复杂的部分。它涉及词法分析、语法编译、匹配优化等编译原理知识。这部分有挑战性，但收获也最大。

**第三步：DOM操作（本书第四部分）**

有了核心和选择器的基础，DOM操作就比较容易理解了。重点关注 `domManip` 和 `buildFragment` 这两个核心函数。

**第四步：按兴趣深入**

后续的事件、Ajax、动画等模块相对独立，可以根据兴趣选择阅读顺序。

## 阅读技巧

在开始阅读源码之前，分享几个实用技巧：

**1. 善用GitHub搜索**

在jQuery仓库中搜索关键函数名，可以快速找到定义和使用位置。

**2. 对照文档**

jQuery官方文档（https://api.jquery.com/）对每个方法都有详细说明。阅读源码时对照文档，有助于理解功能需求。

**3. 关注注释**

jQuery的源码注释很丰富，特别是那些解释"为什么这样做"的注释，往往蕴含着重要的设计思想。

**4. 设置断点**

阅读静态代码容易迷失在分支和条件中。设置断点，观察实际执行路径，效果更好。这部分我们在下一章详细讲解。

## 小结

本章我们了解了jQuery 3.7的源码结构：

- **源码位置**：`src` 目录包含所有模块源码
- **模块划分**：按功能分为core、selector、dom、css、event、ajax、effects等模块
- **依赖关系**：core是基础，data被多个模块依赖
- **入口文件**：`jquery.js` 汇集所有模块并导出
- **核心模块**：`core.js` 定义了jQuery函数和原型

有了这张"地图"，我们就可以有目的地进行源码探索了。

下一章，我们将搭建本地调试环境，让源码"跑起来"。
