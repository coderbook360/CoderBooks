# noConflict：多库共存

当页面引入多个使用 `$` 符号的库时，会发生冲突。noConflict 解决这个问题。

## 问题场景

```html
<script src="prototype.js"></script>  <!-- $ = Prototype -->
<script src="jquery.js"></script>     <!-- $ = jQuery，覆盖了 Prototype -->

<script>
  // $ 现在是 jQuery
  // Prototype 的 $ 被覆盖了！
</script>
```

## $.noConflict()

放弃 `$` 的控制权：

```javascript
// 放弃 $
const jq = $.noConflict();

// 现在 $ 恢复成之前的值（Prototype）
// jq 是 jQuery

jq('#myId').hide();
```

## 完全放弃

```javascript
// 放弃 $ 和 jQuery
const jq = $.noConflict(true);

// $ 和 jQuery 都恢复成之前的值
```

## 实现原理

```javascript
// 保存之前的值
const _$ = window.$;
const _jQuery = window.jQuery;

// 定义 jQuery
window.$ = window.jQuery = jQuery;

// noConflict 方法
jQuery.noConflict = function(deep) {
  // 恢复 $
  if (window.$ === jQuery) {
    window.$ = _$;
  }
  
  // 深度恢复，也恢复 jQuery
  if (deep && window.jQuery === jQuery) {
    window.jQuery = _jQuery;
  }
  
  return jQuery;
};
```

## 完整实现

```javascript
// src/utilities/no-conflict.js

export function setupNoConflict(jQuery) {
  // 保存之前的全局变量
  const _$ = typeof window !== 'undefined' ? window.$ : undefined;
  const _jQuery = typeof window !== 'undefined' ? window.jQuery : undefined;
  
  jQuery.noConflict = function(deep) {
    // 只有当前 $ 是我们的 jQuery 时才恢复
    if (window.$ === jQuery) {
      window.$ = _$;
    }
    
    // 深度恢复
    if (deep && window.jQuery === jQuery) {
      window.jQuery = _jQuery;
    }
    
    return jQuery;
  };
}
```

## 使用模式

### 模式 1：简单别名

```javascript
const $j = $.noConflict();

$j(document).ready(function() {
  $j('.myClass').hide();
});
```

### 模式 2：立即执行函数

```javascript
$.noConflict();

(function($) {
  // 在这个作用域内，$ 就是 jQuery
  $(document).ready(function() {
    $('.myClass').hide();
  });
})(jQuery);
```

### 模式 3：jQuery.ready 简写

```javascript
$.noConflict();

jQuery(function($) {
  // $ 在这里是 jQuery
  $('.myClass').hide();
});
```

## 与模块系统结合

在 ES Module 环境中，通常不需要 noConflict：

```javascript
// module.js
import $ from './mini-jquery.js';

// $ 只在这个模块内有效，不会污染全局
$('.myClass').hide();
```

## 完整代码

```javascript
// src/mini-jquery.js

(function(global) {
  'use strict';
  
  // 保存之前的全局变量
  const _$ = global.$;
  const _jQuery = global.jQuery;
  
  // jQuery 核心
  function jQuery(selector) {
    return new jQuery.fn.init(selector);
  }
  
  jQuery.fn = jQuery.prototype = {
    // ... 所有方法
  };
  
  // noConflict 实现
  jQuery.noConflict = function(deep) {
    if (global.$ === jQuery) {
      global.$ = _$;
    }
    
    if (deep && global.jQuery === jQuery) {
      global.jQuery = _jQuery;
    }
    
    return jQuery;
  };
  
  // 注册全局变量
  global.$ = global.jQuery = jQuery;
  
  // 如果支持模块
  if (typeof module === 'object' && typeof module.exports === 'object') {
    module.exports = jQuery;
  }
  
})(typeof window !== 'undefined' ? window : this);
```

## ESM 导出

```javascript
// src/index.js

import jQuery from './core.js';
import { installSelector } from './selector/index.js';
import { installTraversal } from './traversal/index.js';
// ... 其他模块

// 安装所有模块
installSelector(jQuery);
installTraversal(jQuery);
// ...

// 保存全局变量
const _$ = globalThis.$;
const _jQuery = globalThis.jQuery;

jQuery.noConflict = function(deep) {
  if (globalThis.$ === jQuery) {
    globalThis.$ = _$;
  }
  
  if (deep && globalThis.jQuery === jQuery) {
    globalThis.jQuery = _jQuery;
  }
  
  return jQuery;
};

// 导出
export default jQuery;
export { jQuery as $ };

// 注册全局变量（可选）
if (typeof globalThis !== 'undefined') {
  globalThis.$ = globalThis.jQuery = jQuery;
}
```

## 使用示例

### 与其他库共存

```html
<script src="prototype.js"></script>
<script src="mini-jquery.js"></script>

<script>
  // 让 jQuery 放弃 $
  var jq = $.noConflict();
  
  // Prototype 使用 $
  var elements = $('myId');  // Prototype
  
  // jQuery 使用 jq
  jq('.myClass').hide();     // jQuery
</script>
```

### 模块化使用

```javascript
// 完全不使用全局变量
$.noConflict(true);

// 通过模块使用
import $ from './mini-jquery.js';
```

### 兼容模式

```javascript
// 检测是否需要 noConflict
(function() {
  var $ = window.jQuery || window.$;
  
  if (!$ || !$.fn || !$.fn.jquery) {
    console.error('jQuery not found');
    return;
  }
  
  // 如果检测到冲突
  if (window.$ !== window.jQuery) {
    $ = jQuery.noConflict();
  }
  
  // 使用 $
  $(function() {
    // ...
  });
})();
```

## 版本信息

```javascript
jQuery.fn.jquery = '1.0.0';  // 版本号

// 检测版本
console.log($.fn.jquery);  // '1.0.0'
```

## 本章小结

noConflict 要点：

- **保存原值**：在覆盖前保存 `window.$` 和 `window.jQuery`
- **恢复原值**：调用时恢复之前的值
- **返回 jQuery**：返回 jQuery 供其他变量使用
- **深度模式**：传入 `true` 同时恢复 jQuery

使用场景：

- 与其他使用 $ 的库共存
- 渐进式迁移
- 避免全局污染

现代替代方案：

- ES Module 导入
- IIFE 作用域隔离
- 构建工具的别名配置

下一章，我们开始实现高级特性——Deferred 对象。

---

**思考题**：如果调用两次 `$.noConflict()`，会发生什么？如何确保只恢复一次？
