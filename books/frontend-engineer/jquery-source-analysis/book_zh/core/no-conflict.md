# noConflict与多库共存

jQuery使用 `$` 作为全局标识符。但如果页面上还有其他库也使用 `$`（比如Prototype.js），就会产生冲突。

`noConflict` 方法解决了这个问题。

## 问题：全局变量冲突

假设页面上先加载了Prototype.js，它也使用 `$` 作为全局函数：

```html
<!-- Prototype.js 定义了 $ -->
<script src="prototype.js"></script>

<!-- jQuery 覆盖了 $ -->
<script src="jquery.js"></script>

<script>
// 现在 $ 是 jQuery，Prototype的 $ 被覆盖了！
$('element')  // jQuery的选择器，Prototype代码失效
</script>
```

## jQuery的解决方案

jQuery在初始化时，保存了之前的 `$` 和 `jQuery` 变量：

```javascript
var
    // 保存之前的值
    _jQuery = window.jQuery,
    _$ = window.$;

// 定义jQuery
window.jQuery = window.$ = jQuery;
```

然后提供 `noConflict` 方法让出控制权：

```javascript
jQuery.noConflict = function( deep ) {
    // 归还 $
    if ( window.$ === jQuery ) {
        window.$ = _$;
    }

    // 如果deep为true，同时归还 jQuery
    if ( deep && window.jQuery === jQuery ) {
        window.jQuery = _jQuery;
    }

    return jQuery;
};
```

## 使用方式

**只让出 $**

```javascript
$.noConflict();

// 现在 $ 恢复为之前的值（Prototype的$）
// 但 jQuery 仍然可用
jQuery('div').hide();
```

**同时让出 jQuery**

```javascript
var jq = $.noConflict(true);

// 现在 $ 和 jQuery 都恢复了
// 使用自定义变量名
jq('div').hide();
```

**在模块中使用**

```javascript
(function($) {
    // 在这个函数内，$ 就是 jQuery
    $('div').css('color', 'red');
})(jQuery);

// 函数外，$ 可能是其他库
```

## 源码分析

让我们详细分析 noConflict 的实现：

```javascript
var _jQuery = window.jQuery,
    _$ = window.$;
```

在jQuery加载时（IIFE执行前），保存当前的全局变量。如果之前没有定义，值为 `undefined`。

```javascript
jQuery.noConflict = function( deep ) {
    if ( window.$ === jQuery ) {
        window.$ = _$;
    }

    if ( deep && window.jQuery === jQuery ) {
        window.jQuery = _jQuery;
    }

    return jQuery;
};
```

关键设计：

**1. 条件检查**

```javascript
if ( window.$ === jQuery )
```

只有当前 `$` 确实是jQuery时才归还。这避免了意外覆盖第三方代码又修改了 `$` 的情况。

**2. 深度模式**

```javascript
if ( deep && window.jQuery === jQuery )
```

传入 `true` 时，连 `jQuery` 变量也归还。这是完全的命名空间让出。

**3. 返回jQuery**

```javascript
return jQuery;
```

返回jQuery对象，允许赋值给自定义变量：

```javascript
var $j = jQuery.noConflict();
```

## 实际应用场景

**场景一：与其他库共存**

```html
<script src="prototype.js"></script>
<script src="jquery.js"></script>
<script>
    var $j = jQuery.noConflict();
    
    // Prototype的$
    $('elementId').show();
    
    // jQuery的$j
    $j('#elementId').show();
</script>
```

**场景二：多版本jQuery共存**

有时候需要同时使用多个版本的jQuery（通常是因为不同插件依赖不同版本）：

```html
<script src="jquery-1.12.4.js"></script>
<script>
    var jQuery1 = jQuery.noConflict(true);
</script>

<script src="jquery-3.7.1.js"></script>
<script>
    var jQuery3 = jQuery.noConflict(true);
</script>

<script>
    // 使用旧版本
    jQuery1('#old-plugin').oldPlugin();
    
    // 使用新版本
    jQuery3('#new-feature').newMethod();
</script>
```

**场景三：WordPress**

WordPress默认开启noConflict模式，避免与其他插件冲突：

```javascript
// WordPress环境中
jQuery(document).ready(function($) {
    // 在这个函数内 $ 是 jQuery
    $('.content').addClass('loaded');
});
```

## 设计启示

noConflict 体现了几个重要的设计原则：

**1. 保存现场**

```javascript
var _$ = window.$;
```

在修改全局状态前保存当前值，提供恢复能力。这是任何可能覆盖全局状态的代码都应该考虑的。

**2. 可逆操作**

noConflict 让jQuery的加载变成可逆的。即使在不需要的页面上加载了jQuery，也可以"撤销"它的影响。

**3. 渐进式让步**

- 不传参：只让出 `$`
- 传 `true`：同时让出 `jQuery`

根据冲突程度选择让步程度。

**4. 返回引用**

```javascript
return jQuery;
```

让出全局变量，但返回引用。用户不会失去对库的访问能力。

## 现代实践

在ES Module时代，全局变量冲突问题大大减少：

```javascript
// 模块化引入，不污染全局
import $ from 'jquery';

$('div').hide();
```

但在一些场景下仍然需要考虑：

- 遗留代码维护
- 多库混用的项目
- 第三方脚本注入
- WordPress等CMS环境

## 实现练习

实现一个支持noConflict的小型库：

```javascript
(function(global) {
    // 保存现场
    var _myLib = global.myLib;
    var _$ = global.$;
    
    // 库的实现
    var myLib = {
        version: '1.0.0',
        
        greet: function(name) {
            console.log('Hello, ' + name);
        },
        
        noConflict: function(deep) {
            if (global.$ === myLib) {
                global.$ = _$;
            }
            if (deep && global.myLib === myLib) {
                global.myLib = _myLib;
            }
            return myLib;
        }
    };
    
    // 暴露到全局
    global.myLib = global.$ = myLib;
    
})(typeof window !== 'undefined' ? window : this);

// 使用
$.greet('World');           // Hello, World

var lib = $.noConflict();   // 让出 $
lib.greet('Again');         // Hello, Again
```

## 小结

本章学习了jQuery的noConflict机制：

**问题**
- 多个库使用相同的全局变量名
- 后加载的库覆盖先加载的

**解决方案**
- 加载时保存之前的值
- noConflict 归还控制权
- 返回jQuery引用供继续使用

**使用方式**
- `$.noConflict()`：只让出 $
- `$.noConflict(true)`：同时让出 jQuery
- 返回值可赋给自定义变量

**设计原则**
- 保存现场
- 可逆操作
- 渐进式让步
- 返回引用

至此，我们完成了jQuery核心架构部分的学习。你已经理解了：
- IIFE模块封装
- 工厂模式和init构造器
- 原型链和链式调用
- pushStack结果集管理
- extend扩展机制
- access访问器模式
- 类型检测工具
- 遍历方法
- 静态工具
- noConflict多库共存

这些是jQuery的"骨架"。下一部分，我们将进入Sizzle选择器引擎的世界。
