# ready 事件：DOM 就绪

`$(document).ready()` 是 jQuery 最经典的用法之一，用于在 DOM 完全加载后执行代码。

## 基本用法

```javascript
// 经典写法
$(document).ready(function() {
  // DOM 已就绪
});

// 简写
$(function() {
  // DOM 已就绪
});
```

## 为什么需要 ready

```html
<script>
  // 这时 DOM 还没加载完
  document.querySelector('.btn').click();  // 错误！元素不存在
</script>

<button class="btn">Click</button>
```

解决方案：

1. **放在底部**：`<script>` 放在 `</body>` 前
2. **defer 属性**：`<script defer>`
3. **ready 事件**：等待 DOM 就绪

## DOMContentLoaded

现代浏览器提供 `DOMContentLoaded` 事件：

```javascript
document.addEventListener('DOMContentLoaded', function() {
  // DOM 已就绪，但图片等资源可能还在加载
});
```

与 `window.onload` 的区别：

| 事件 | 触发时机 |
|------|----------|
| DOMContentLoaded | DOM 树构建完成 |
| window.onload | 所有资源（图片等）加载完成 |

jQuery 的 `ready` 对应 `DOMContentLoaded`。

## 基础实现

```javascript
jQuery.fn.ready = function(fn) {
  // 如果 DOM 已经就绪，直接执行
  if (document.readyState !== 'loading') {
    setTimeout(fn, 0);
  } else {
    document.addEventListener('DOMContentLoaded', fn);
  }
  return this;
};
```

## 支持简写

```javascript
$(function() { /* ... */ });
```

在 `$()` 函数中处理：

```javascript
function jQuery(selector) {
  // 如果是函数，当作 ready 处理
  if (typeof selector === 'function') {
    return jQuery(document).ready(selector);
  }
  
  // 其他处理...
}
```

## 完整实现

处理多次调用和已就绪的情况：

```javascript
// src/events/ready.js

let isReady = false;
const readyCallbacks = [];

function executeReady() {
  if (isReady) return;
  isReady = true;
  
  readyCallbacks.forEach(fn => {
    try {
      fn.call(document, jQuery);
    } catch (e) {
      console.error('Ready callback error:', e);
    }
  });
  
  // 清空回调
  readyCallbacks.length = 0;
}

// 监听 DOMContentLoaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', executeReady);
} else {
  // 已经就绪
  isReady = true;
}

export function installReadyMethod(jQuery) {
  
  jQuery.fn.ready = function(fn) {
    if (typeof fn !== 'function') {
      return this;
    }
    
    if (isReady) {
      // 已就绪，异步执行
      setTimeout(() => {
        try {
          fn.call(document, jQuery);
        } catch (e) {
          console.error('Ready callback error:', e);
        }
      }, 0);
    } else {
      // 未就绪，加入队列
      readyCallbacks.push(fn);
    }
    
    return this;
  };
  
  // 支持 $.ready
  jQuery.ready = jQuery.fn.ready.bind(jQuery(document));
}
```

## 在 $ 入口中处理

```javascript
// src/core/jquery.js

function jQuery(selector, context) {
  // 函数 → ready
  if (typeof selector === 'function') {
    return jQuery.fn.ready(selector);
  }
  
  // 其他处理...
  return new jQuery.fn.init(selector, context);
}
```

## ready 的回调参数

jQuery 传入自身作为参数，用于避免冲突：

```javascript
jQuery(function($) {
  // 这里的 $ 一定是 jQuery
  $('.btn').click(handler);
});
```

即使其他库占用了 `$`：

```javascript
var $ = otherLibrary;

jQuery(function($) {
  // 安全使用 $
});
```

## holdReady

jQuery 提供 `$.holdReady()` 延迟 ready：

```javascript
// 暂停 ready
$.holdReady(true);

// 加载完资源后恢复
loadAsyncResource().then(() => {
  $.holdReady(false);
});
```

实现：

```javascript
let holdCount = 0;

jQuery.holdReady = function(hold) {
  if (hold) {
    holdCount++;
  } else {
    holdCount--;
    if (holdCount === 0 && document.readyState !== 'loading') {
      executeReady();
    }
  }
};

function executeReady() {
  if (isReady || holdCount > 0) return;
  // ...
}
```

## 多次调用

可以多次调用 `ready`，所有回调都会执行：

```javascript
$(document).ready(function() {
  console.log('First');
});

$(document).ready(function() {
  console.log('Second');
});

// 输出：
// First
// Second
```

## 实际应用场景

### 场景 1：初始化

```javascript
$(function() {
  initSlider();
  initModal();
  bindEvents();
});
```

### 场景 2：避免命名冲突

```javascript
// IIFE + ready
(function($) {
  $(function() {
    // 安全使用 $
  });
})(jQuery);

// 或简写
jQuery(function($) {
  // 安全使用 $
});
```

### 场景 3：模块初始化

```javascript
// module-a.js
$(function() {
  window.moduleA = new ModuleA();
});

// module-b.js
$(function() {
  window.moduleB = new ModuleB();
});
```

### 场景 4：条件初始化

```javascript
$(function() {
  if ($('.slider').length) {
    initSlider();
  }
  
  if ($('.modal').length) {
    initModal();
  }
});
```

## 现代替代方案

### defer 属性

```html
<script src="app.js" defer></script>
```

`defer` 脚本在 DOM 解析完成后、`DOMContentLoaded` 前执行。

### ES 模块

```html
<script type="module" src="app.js"></script>
```

模块脚本默认 defer。

### 直接监听

```javascript
document.addEventListener('DOMContentLoaded', () => {
  // 初始化
});
```

## ready 还需要吗

在现代开发中：

- 使用 `defer` 或 ES 模块时，脚本执行时 DOM 已就绪
- 框架（React、Vue）有自己的生命周期
- `ready` 主要用于传统多页面应用

但 `ready` 仍有价值：

- 不确定脚本加载位置时
- 需要等待多个脚本加载后统一初始化
- 兼容各种引入方式

## 本章小结

ready 方法的作用：

- **DOM 就绪时执行**：确保可以操作 DOM
- **异步安全**：已就绪时也能正确执行
- **多次调用**：所有回调都会执行

实现要点：

- 监听 `DOMContentLoaded`
- 检查 `document.readyState`
- 维护回调队列
- 传入 jQuery 作为参数

下一章，我们实现常用事件的快捷方法。

---

**思考题**：如果在 `$(document).ready()` 回调中再次调用 `$(document).ready()`，第二个回调什么时候执行？
