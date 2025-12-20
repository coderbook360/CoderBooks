# querySelectorAll 优先策略

前面几章我们详细分析了 Sizzle 的选择器引擎实现。但有一个重要的事实：**Sizzle 在大多数情况下并不使用自己的引擎**。

现代浏览器都实现了 `querySelectorAll` API，这是原生的、经过高度优化的选择器引擎。Sizzle 的策略是：能用原生 API 就用原生，只有在原生 API 不支持的情况下才回退到自己的实现。

---

## 为什么优先使用原生 API？

**性能**。

浏览器的 `querySelectorAll` 是用 C++ 实现的，直接在渲染引擎层面操作 DOM 树。JavaScript 实现的 Sizzle 再怎么优化，也无法与之匹敌。

一个简单的基准测试：

```javascript
// 测试选择器：div.container ul li
// DOM：1000 个 li 元素

// 原生 API
console.time("querySelectorAll");
for (var i = 0; i < 1000; i++) {
  document.querySelectorAll("div.container ul li");
}
console.timeEnd("querySelectorAll");  // ~10ms

// Sizzle 自实现
console.time("Sizzle");
for (var i = 0; i < 1000; i++) {
  Sizzle("div.container ul li");
}
console.timeEnd("Sizzle");  // ~100ms
```

对于标准 CSS 选择器，原生 API 通常快 10-100 倍。

---

## Sizzle 的决策流程

当你调用 `$("div.container ul li")` 时，Sizzle 的决策流程是：

```javascript
function Sizzle(selector, context) {
  // 1. 尝试使用原生 API
  if (context.querySelectorAll && !rbuggyQSA.test(selector)) {
    try {
      return context.querySelectorAll(selector);
    } catch (e) {
      // 原生 API 抛出异常，回退到 Sizzle
    }
  }
  
  // 2. 回退到 Sizzle 自实现
  return select(selector, context);
}
```

核心逻辑：
1. 检查 `querySelectorAll` 是否可用
2. 检查选择器是否包含已知的浏览器 bug 触发模式
3. 尝试调用原生 API
4. 如果抛出异常（选择器语法错误或不支持），回退到 Sizzle

---

## 何时回退到 Sizzle？

有几种情况 Sizzle 会使用自己的实现：

### 1. jQuery 扩展伪类

原生 `querySelectorAll` 不支持 jQuery 特有的伪类：

```javascript
$("li:eq(2)")        // :eq() 不是标准 CSS
$("div:visible")     // :visible 不是标准 CSS
$("p:contains('hello')")  // :contains() 不是标准 CSS
$("tr:even")         // :even 不是标准 CSS
```

Sizzle 在解析选择器时会检测这些扩展语法，一旦发现就跳过原生 API。

```javascript
var rneedsContext = /:(eq|gt|lt|nth|first|last|even|odd|visible|hidden|contains|has)/i;

function Sizzle(selector, context) {
  if (rneedsContext.test(selector)) {
    // 包含 jQuery 扩展，必须用 Sizzle
    return select(selector, context);
  }
  // ...
}
```

### 2. 复杂的 :not() 参数

CSS 标准的 `:not()` 只接受简单选择器：

```css
/* 标准 CSS - 简单选择器 */
div:not(.hidden)
li:not(:first-child)

/* 非标准 - 复杂选择器 */
div:not(.a.b)           /* 多个类 */
li:not(ul > li)         /* 包含关系符 */
```

浏览器对复杂 `:not()` 的支持不一致，Sizzle 会回退处理。

### 3. 属性选择器的特殊情况

某些属性选择器在特定浏览器有 bug：

```javascript
// 某些旧版浏览器对空值属性有问题
$("[value='']")

// 某些浏览器对 type 属性有 bug
$("input[type='hidden']")
```

Sizzle 维护一个"已知 bug"列表，遇到这些模式就回退。

---

## rbuggyQSA：已知 bug 列表

Sizzle 用正则表达式检测可能触发浏览器 bug 的选择器：

```javascript
var rbuggyQSA = [];

// 检测并记录当前浏览器的 bug
(function() {
  var div = document.createElement("div");
  
  // 测试 :checked 伪类
  div.innerHTML = "<input type='checkbox' checked/>";
  if (!div.querySelectorAll(":checked").length) {
    rbuggyQSA.push(":checked");
  }
  
  // 测试属性选择器
  try {
    div.querySelectorAll("[test^='']");
  } catch (e) {
    rbuggyQSA.push("[*^$]=");  // 空值属性选择器
  }
  
  // ... 更多测试
})();

// 转换为正则
rbuggyQSA = new RegExp(rbuggyQSA.join("|"));
```

这个自检机制在 Sizzle 加载时执行，检测当前浏览器的 quirks，确保不会使用有问题的原生 API。

---

## 快速路径优化

Sizzle 对常见的简单选择器有专门的快速路径，甚至比 `querySelectorAll` 更快：

```javascript
function Sizzle(selector, context) {
  // 快速路径：ID 选择器
  var match = /^#([\w-]+)$/.exec(selector);
  if (match) {
    return [context.getElementById(match[1])];
  }
  
  // 快速路径：标签选择器
  match = /^(\w+)$/.exec(selector);
  if (match) {
    return context.getElementsByTagName(selector);
  }
  
  // 快速路径：类选择器
  match = /^\.([\w-]+)$/.exec(selector);
  if (match) {
    return context.getElementsByClassName(match[1]);
  }
  
  // 其他选择器：尝试 querySelectorAll
  // ...
}
```

为什么这些专用 API 更快？

- `getElementById`：直接哈希查找，O(1)
- `getElementsByTagName`：返回 live NodeList，无需构建结果数组
- `getElementsByClassName`：同上

而 `querySelectorAll` 需要：
1. 解析选择器
2. 构建匹配器
3. 遍历 DOM
4. 构建结果数组

对于简单选择器，专用 API 的开销更小。

---

## context 参数的处理

`querySelectorAll` 有一个容易忽视的陷阱：它是相对于 document 查找的，不是相对于调用它的元素。

```javascript
var container = document.getElementById("container");

// 这会找到 document 中所有 li，然后过滤出在 container 内的
container.querySelectorAll("li");

// 但这个选择器的行为可能出乎意料
container.querySelectorAll("div li");
// 如果 container 自己就是 div，它的 li 子元素会被选中吗？
```

Sizzle 对此有特殊处理：

```javascript
function Sizzle(selector, context) {
  if (context !== document) {
    // 为 context 添加临时 ID
    var id = context.id || (context.id = "__sizzle__");
    
    // 修改选择器，限定在 context 内
    var scopedSelector = "#" + id + " " + selector;
    
    var results = document.querySelectorAll(scopedSelector);
    
    // 移除临时 ID
    if (context.id === "__sizzle__") {
      context.removeAttribute("id");
    }
    
    return results;
  }
  
  return document.querySelectorAll(selector);
}
```

通过临时 ID 和作用域选择器，确保结果限定在 context 内。

---

## matches 和 matchesSelector

除了 `querySelectorAll`，Sizzle 还利用 `matches` API（旧名 `matchesSelector`）：

```javascript
// 检查单个元素是否匹配选择器
element.matches("div.active");  // 返回 boolean
```

这在 `$.fn.is()` 和 `$.fn.filter()` 等方法中很有用：

```javascript
$.fn.is = function(selector) {
  // 优先使用原生 matches
  if (this[0].matches) {
    return this[0].matches(selector);
  }
  
  // 回退到 Sizzle 匹配
  return Sizzle.matchesSelector(this[0], selector);
};
```

---

## 选择器规范化

Sizzle 在调用原生 API 前会对选择器做一些规范化处理：

```javascript
function normalizeSelector(selector) {
  // 去除首尾空白
  selector = selector.trim();
  
  // 规范化逗号周围的空白
  selector = selector.replace(/,\s*/g, ", ");
  
  // 规范化关系符周围的空白
  selector = selector.replace(/\s*([>+~])\s*/g, " $1 ");
  
  return selector;
}
```

这确保选择器格式统一，减少解析错误。

---

## 错误处理

如果选择器有语法错误，`querySelectorAll` 会抛出 `SyntaxError`：

```javascript
document.querySelectorAll("div[");  // SyntaxError
```

Sizzle 捕获这个异常：

```javascript
function Sizzle(selector, context) {
  try {
    return context.querySelectorAll(selector);
  } catch (e) {
    // 可能是语法错误，也可能是不支持的选择器
    // 回退到 Sizzle，让它报告更友好的错误
  }
  
  return select(selector, context);
}
```

Sizzle 自己的错误信息更加友好：

```javascript
Sizzle.error = function(msg) {
  throw new Error("Syntax error, unrecognized expression: " + msg);
};
```

---

## 性能建议

理解 Sizzle 的工作方式后，我们可以写出更高效的代码：

### 1. 优先使用标准 CSS 选择器

```javascript
// 好：使用标准 CSS，可以走原生 API
$("li:first-child")
$("li:nth-child(1)")

// 差：使用 jQuery 扩展，必须走 Sizzle
$("li:first")
$("li:eq(0)")
```

### 2. 简单选择器用专用方法

```javascript
// 好：专用 API
$("#myId")
$(".myClass")
$("div")

// 这些已经是最优的了
```

### 3. 避免过度复杂的选择器

```javascript
// 好：简洁
$(".item.active")

// 差：过度限定
$("html body div.container > ul.list > li.item.active")
```

### 4. 缓存选择结果

```javascript
// 差：重复查询
function update() {
  $(".item").addClass("processed");
  $(".item").data("time", Date.now());
}

// 好：缓存结果
function update() {
  var $items = $(".item");
  $items.addClass("processed");
  $items.data("time", Date.now());
}
```

---

## 本章小结

本章我们分析了 Sizzle 的原生 API 优先策略：

- **优先原生**：标准 CSS 选择器优先使用 `querySelectorAll`
- **回退条件**：jQuery 扩展伪类、浏览器 bug、复杂 :not() 等
- **快速路径**：ID、TAG、CLASS 选择器用专用 API
- **作用域处理**：通过临时 ID 确保 context 生效
- **错误处理**：捕获原生异常，提供友好错误信息

这种"尽可能利用原生能力"的设计理念值得学习：不是所有问题都需要自己解决，善用平台能力可以事半功倍。

下一章，我们将深入 Sizzle 的缓存机制，看看它如何通过缓存进一步优化性能。
