# 伪类选择器实现

前几章我们学习了 Sizzle 的核心流程：tokenize → compile → 从右向左匹配。但我们还没深入一类特殊的选择器：**伪类选择器**。

伪类选择器以 `:` 开头，用于选择处于特定状态的元素，如 `:first-child`、`:nth-child(2n+1)`、`:not(.disabled)`。本章我们深入 Sizzle 的伪类实现。

---

## 伪类的分类

CSS 伪类可以分为几大类：

**结构伪类**：基于元素在 DOM 树中的位置
- `:first-child`、`:last-child`
- `:nth-child()`、`:nth-last-child()`
- `:only-child`
- `:first-of-type`、`:last-of-type`

**用户行为伪类**：基于用户交互状态
- `:hover`、`:active`、`:focus`
- `:checked`、`:disabled`、`:enabled`

**否定伪类**
- `:not(selector)`

**jQuery 扩展伪类**（非标准 CSS）
- `:eq()`、`:gt()`、`:lt()`
- `:visible`、`:hidden`
- `:contains()`

本章重点分析结构伪类和否定伪类的实现。

---

## 伪类的注册机制

Sizzle 用 `Expr.pseudos` 对象存储所有伪类处理器：

```javascript
Expr.pseudos = {
  "first-child": function(elem) {
    // 判断 elem 是否是父元素的第一个子元素
  },
  "not": function(selector) {
    // 返回一个匹配器，判断 elem 是否不匹配 selector
  },
  // ... 其他伪类
};
```

每个伪类处理器可以是：
1. **匹配器函数**：直接接收 elem，返回 boolean
2. **匹配器工厂**：接收参数，返回匹配器函数

---

## :first-child 的实现

`:first-child` 是最简单的结构伪类之一。它匹配作为父元素第一个子元素的元素。

```javascript
Expr.pseudos["first-child"] = function(elem) {
  // 向前遍历，检查是否有前面的兄弟元素
  var node = elem;
  while ((node = node.previousSibling)) {
    if (node.nodeType === 1) {
      // 有元素类型的前置兄弟，不是 first-child
      return false;
    }
  }
  return true;
};
```

注意这里遍历的是 `previousSibling`，跳过文本节点和注释节点（nodeType !== 1）。

---

## :last-child 的实现

`:last-child` 是镜像版本：

```javascript
Expr.pseudos["last-child"] = function(elem) {
  var node = elem;
  while ((node = node.nextSibling)) {
    if (node.nodeType === 1) {
      return false;
    }
  }
  return true;
};
```

---

## :nth-child() 的复杂实现

`:nth-child()` 是最复杂的结构伪类，它接受一个公式参数：

```css
li:nth-child(2)        /* 第 2 个 */
li:nth-child(odd)      /* 奇数个：1, 3, 5... */
li:nth-child(even)     /* 偶数个：2, 4, 6... */
li:nth-child(3n)       /* 3 的倍数：3, 6, 9... */
li:nth-child(2n+1)     /* 等于 odd */
li:nth-child(-n+3)     /* 前 3 个 */
```

### 解析公式

首先要解析参数字符串。Sizzle 用正则提取 `a` 和 `b` 两个数值：

```javascript
// 公式：an+b
var nthPattern = /^([+-]?\d*n)?([+-]?\d+)?$/;

function parseNth(argument) {
  // 处理特殊值
  if (argument === "odd") return { a: 2, b: 1 };
  if (argument === "even") return { a: 2, b: 0 };
  
  var match = nthPattern.exec(argument);
  if (!match) return null;
  
  var a = match[1];
  var b = match[2];
  
  // 处理 "n" = "1n", "-n" = "-1n"
  if (a === "n") a = 1;
  else if (a === "-n") a = -1;
  else if (a === "" || a === undefined) a = 0;
  else a = parseInt(a, 10);
  
  b = b ? parseInt(b, 10) : 0;
  
  return { a: a, b: b };
}
```

### 匹配逻辑

有了 `a` 和 `b`，匹配逻辑需要计算元素在兄弟中的位置，然后检查是否满足公式：

```javascript
Expr.pseudos["nth-child"] = function(argument) {
  var parsed = parseNth(argument);
  var a = parsed.a;
  var b = parsed.b;
  
  return function(elem) {
    // 计算元素是第几个子元素
    var position = 1;
    var node = elem;
    while ((node = node.previousSibling)) {
      if (node.nodeType === 1) {
        position++;
      }
    }
    
    // 检查 position 是否满足 an + b
    if (a === 0) {
      // 没有 n 项，直接比较
      return position === b;
    }
    
    // 计算 (position - b) / a 是否为非负整数
    var diff = position - b;
    if (a > 0) {
      return diff >= 0 && diff % a === 0;
    } else {
      return diff <= 0 && diff % a === 0;
    }
  };
};
```

### 性能优化：缓存位置

每次调用都遍历 `previousSibling` 计算位置很慢。Sizzle 有一个优化：**为元素标记位置**。

```javascript
function markPositions(parent) {
  var node = parent.firstChild;
  var index = 0;
  
  while (node) {
    if (node.nodeType === 1) {
      index++;
      node._sizzleIndex = index;  // 标记位置
    }
    node = node.nextSibling;
  }
}
```

在匹配前预先标记，匹配时直接读取 `elem._sizzleIndex`，避免重复遍历。

---

## :not() 的实现

`:not()` 伪类接受一个选择器作为参数，匹配**不满足**该选择器的元素。

```javascript
$("div:not(.hidden)")  // 没有 hidden 类的 div
$("li:not(:first-child)")  // 不是第一个的 li
```

实现思路：编译参数选择器，取反结果。

```javascript
Expr.pseudos["not"] = function(selector) {
  // 编译参数选择器
  var matcher = compile(selector);
  
  return function(elem, context, xml) {
    // 取反：参数选择器不匹配，才算匹配
    return !matcher(elem, context, xml);
  };
};
```

这里有个巧妙之处：`:not()` 可以嵌套任意复杂的选择器，因为它复用了 compile 函数。

```javascript
$("div:not(.a:not(.b))")  
// div 元素，排除"有 a 类但没有 b 类"的
```

---

## :has() 的实现

`:has()` 是一个强大的关系伪类，匹配包含特定后代的元素：

```javascript
$("div:has(> p)")  // 有直接 p 子元素的 div
$("ul:has(li.active)")  // 包含 li.active 后代的 ul
```

```javascript
Expr.pseudos["has"] = function(selector) {
  return function(elem) {
    // 在 elem 内部查找匹配 selector 的元素
    return Sizzle(selector, elem).length > 0;
  };
};
```

`:has()` 的实现是递归调用 Sizzle——在当前元素内部执行一次完整的选择器查询。

这很灵活，但也意味着性能开销较大。对于大型 DOM 树，应谨慎使用 `:has()`。

---

## jQuery 扩展伪类

jQuery/Sizzle 提供了一些非标准的伪类，在实际开发中很常用。

### :eq()、:gt()、:lt()

这些是"位置伪类"，基于元素在结果集中的位置过滤：

```javascript
$("li:eq(2)")   // 第 3 个 li（0-indexed）
$("li:gt(1)")   // 第 2 个之后的所有 li
$("li:lt(3)")   // 前 3 个 li
```

这些伪类的特殊之处在于：**它们需要知道整个结果集**，不能仅凭单个元素判断。

Sizzle 用 `setFilters` 处理这类伪类：

```javascript
setFilters = {
  "eq": function(elements, index) {
    return [elements[index]];
  },
  "gt": function(elements, index) {
    return elements.slice(index + 1);
  },
  "lt": function(elements, index) {
    return elements.slice(0, index);
  }
};
```

这些过滤器在所有普通匹配完成后，对结果集进行后处理。

### :visible 和 :hidden

这两个伪类判断元素是否可见：

```javascript
Expr.pseudos["visible"] = function(elem) {
  return !!(elem.offsetWidth || elem.offsetHeight || elem.getClientRects().length);
};

Expr.pseudos["hidden"] = function(elem) {
  return !Expr.pseudos["visible"](elem);
};
```

判断可见性需要触发浏览器的布局计算，性能开销较大。

### :contains()

匹配包含特定文本的元素：

```javascript
$("p:contains('hello')")

Expr.pseudos["contains"] = function(text) {
  return function(elem) {
    return (elem.textContent || elem.innerText || "").indexOf(text) > -1;
  };
};
```

---

## 伪类的正则匹配

tokenize 用这个正则识别伪类：

```javascript
var rpseudo = /^:([\w-]+)(?:\(((?:[^()]+|\([^()]*\))*)\))?/;
// 匹配：:name 或 :name(args)
```

这个正则支持：
- 简单伪类：`:first-child`
- 带参数的伪类：`:nth-child(2n+1)`
- 嵌套括号：`:not(:nth-child(2))`

---

## 伪类匹配器的生成

compile 在处理 PSEUDO 类型的 Token 时：

```javascript
if (token.type === "PSEUDO") {
  var pseudo = token.matches[1];  // 伪类名
  var argument = token.matches[2];  // 参数（如果有）
  
  var handler = Expr.pseudos[pseudo];
  
  if (typeof handler === "function") {
    if (argument !== undefined) {
      // 带参数的伪类：调用工厂函数
      matcher = handler(argument);
    } else {
      // 无参数：直接使用
      matcher = handler;
    }
  }
  
  matchers.push(matcher);
}
```

---

## 自定义伪类

Sizzle 允许我们定义自己的伪类。假设我们想添加一个 `:external` 伪类，匹配外部链接：

```javascript
$.expr.pseudos.external = function(elem) {
  // 检查是否是链接，且 href 指向外部域名
  if (elem.nodeName.toLowerCase() !== "a") {
    return false;
  }
  
  var href = elem.getAttribute("href");
  if (!href) return false;
  
  // 简化判断：以 http 开头且不是当前域名
  return href.indexOf("http") === 0 && 
         href.indexOf(location.hostname) === -1;
};

// 使用
$("a:external").addClass("external-link");
```

---

## 设计启示

从伪类实现中，我们可以学到：

### 1. 插件化架构

所有伪类注册在 `Expr.pseudos` 对象中，添加新伪类只需要添加新属性。这是典型的"开闭原则"应用。

### 2. 工厂模式

带参数的伪类（如 `:nth-child()`）用工厂函数生成匹配器。参数在编译时确定，运行时直接使用，避免重复解析。

### 3. 组合复用

`:not()` 和 `:has()` 复用了 compile 和 Sizzle 本身，实现了复杂功能但代码简洁。

### 4. 性能权衡

不同伪类的性能差异很大：
- `:first-child`：遍历少量兄弟节点，快
- `:nth-child()`：需要计算位置，中等
- `:has()`：递归查询，可能很慢
- `:visible`：触发布局计算，慢

选择伪类时要考虑性能影响。

---

## 本章小结

本章我们深入分析了 Sizzle 的伪类选择器实现：

- **结构伪类**：通过遍历兄弟节点判断位置（`:first-child`、`:nth-child()` 等）
- **否定伪类**：`:not()` 编译参数选择器并取反
- **关系伪类**：`:has()` 递归调用 Sizzle 查询后代
- **jQuery 扩展**：`:eq()`、`:visible` 等非标准但实用的伪类
- **扩展机制**：通过 `$.expr.pseudos` 添加自定义伪类

下一章，我们将探讨 Sizzle 如何与浏览器原生的 `querySelectorAll` 协作，以及何时选择使用原生 API。
