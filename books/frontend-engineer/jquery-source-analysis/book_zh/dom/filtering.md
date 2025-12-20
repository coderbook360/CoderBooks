# DOM过滤：filter、not、is

遍历方法帮我们找到相关元素，过滤方法则帮我们筛选出真正需要的元素。本章我们分析 jQuery 的三个核心过滤方法：`filter()`、`not()` 和 `is()`。

---

## filter() 方法

`filter()` 保留匹配条件的元素，移除不匹配的。

```javascript
$("li").filter(".active")      // 保留有 active 类的
$("li").filter(":visible")     // 保留可见的
$("li").filter(function(i) {   // 保留索引为偶数的
  return i % 2 === 0;
})
```

### 参数类型

`filter()` 支持多种参数类型：

| 参数类型 | 示例 | 说明 |
|---------|------|------|
| 选择器 | `.active` | 匹配选择器的元素 |
| 函数 | `function(i, elem)` | 返回 true 的元素 |
| jQuery 对象 | `$others` | 在集合中的元素 |
| DOM 元素 | `element` | 与该元素相同的 |

### 实现分析

```javascript
jQuery.fn.filter = function(selector) {
  return this.pushStack(winnow(this, selector, false));
};
```

核心逻辑在 `winnow` 函数：

```javascript
function winnow(elements, qualifier, not) {
  // 函数参数
  if (typeof qualifier === "function") {
    return jQuery.grep(elements, function(elem, i) {
      return !!qualifier.call(elem, i, elem) !== not;
    });
  }
  
  // DOM 元素参数
  if (qualifier.nodeType) {
    return jQuery.grep(elements, function(elem) {
      return (elem === qualifier) !== not;
    });
  }
  
  // 字符串选择器
  if (typeof qualifier === "string") {
    // 简单选择器：直接用 Sizzle 匹配
    return jQuery.filter(qualifier, elements, not);
  }
  
  // jQuery 对象或数组
  return jQuery.grep(elements, function(elem) {
    return (indexOf.call(qualifier, elem) > -1) !== not;
  });
}
```

### winnow 的巧妙设计

`winnow` 函数有一个 `not` 参数，控制是保留匹配项还是排除匹配项：

- `not = false`：保留匹配的（用于 `filter`）
- `not = true`：排除匹配的（用于 `not`）

这样 `filter()` 和 `not()` 可以复用同一个核心逻辑。

---

## not() 方法

`not()` 是 `filter()` 的反向操作，移除匹配条件的元素。

```javascript
$("li").not(".disabled")      // 移除 disabled 的
$("li").not(":hidden")        // 移除隐藏的
$("li").not(function(i) {     // 移除索引为偶数的
  return i % 2 === 0;
})
```

### 实现分析

```javascript
jQuery.fn.not = function(selector) {
  return this.pushStack(winnow(this, selector, true));  // not = true
};
```

与 `filter()` 完全对称，只是把 `not` 参数设为 `true`。

### 等价关系

```javascript
$("li").filter(".active")
// 等价于
$("li").not(":not(.active)")

$("li").not(".disabled")
// 等价于
$("li").filter(":not(.disabled)")
```

选择哪个取决于哪种表达更自然。

---

## is() 方法

`is()` 检查集合中是否**至少有一个元素**匹配条件，返回布尔值。

```javascript
$("li").is(".active")       // 是否有 active 的 li
$("li").is(":visible")      // 是否有可见的 li
$("li").is(function(i) {    // 是否有索引为 0 的 li
  return i === 0;
})
```

### 与 filter() 的区别

```javascript
// filter 返回 jQuery 对象
var $result = $("li").filter(".active");
if ($result.length > 0) { ... }

// is 返回 boolean
if ($("li").is(".active")) { ... }
```

`is()` 更简洁，适合用于条件判断。

### 实现分析

```javascript
jQuery.fn.is = function(selector) {
  return !!winnow(
    this,
    typeof selector === "string" && rneedsContext.test(selector)
      ? jQuery(selector)
      : selector || [],
    false
  ).length;
};
```

核心是 `!!...length`：有匹配元素返回 `true`，否则返回 `false`。

### 特殊情况：上下文相关选择器

有些选择器需要上下文才能工作，如 `:first`、`:last`、`:eq()`：

```javascript
// rneedsContext 检测这类选择器
var rneedsContext = /:(eq|gt|lt|nth|first|last|even|odd)/i;
```

对于这类选择器，先用它查找 DOM，再检查当前元素是否在结果中：

```javascript
if (rneedsContext.test(selector)) {
  var $results = jQuery(selector);
  return this.filter(function() {
    return $results.index(this) > -1;
  }).length > 0;
}
```

---

## jQuery.filter 静态方法

除了实例方法，jQuery 还有一个静态的 `filter` 方法：

```javascript
jQuery.filter = function(selector, elements, not) {
  // 单个元素
  if (elements.length === 1) {
    return Sizzle.matchesSelector(elements[0], selector) !== not
      ? [elements[0]]
      : [];
  }
  
  // 多个元素
  return not
    ? Sizzle.matches(selector, elements).length === 0
    : Sizzle.matches(selector, elements);
};
```

这个方法直接调用 Sizzle 的匹配功能。

---

## 函数参数的使用

当使用函数作为过滤条件时，函数会被每个元素调用：

```javascript
$("li").filter(function(index, element) {
  // this === element
  // 返回 true 保留，false 排除
  return $(this).data("priority") > 5;
});
```

### 函数参数

- `index`：元素在集合中的索引
- `element`：当前 DOM 元素
- `this`：也是当前 DOM 元素

### 实际应用

```javascript
// 过滤出数据满足条件的元素
$(".item").filter(function() {
  return $(this).data("count") > 10;
});

// 过滤出特定状态的元素
$("input").filter(function() {
  return this.validity.valid;
});

// 复杂条件
$(".product").filter(function() {
  var price = parseFloat($(this).data("price"));
  var stock = parseInt($(this).data("stock"));
  return price < 100 && stock > 0;
});
```

---

## 链式调用中的应用

过滤方法常在链式调用中使用：

```javascript
$("li")
  .filter(".active")
  .addClass("highlight")
  .end()
  .filter(".disabled")
  .addClass("dimmed");
```

`filter()` 会创建新的 jQuery 对象，原集合不受影响。用 `end()` 可以回退到原集合。

---

## 性能对比

```javascript
// 方式一：选择器中过滤
$("li.active")

// 方式二：先选择再过滤
$("li").filter(".active")
```

方式一通常更快，因为 Sizzle 可以一次处理完整选择器。

但当你已经有了 jQuery 对象，用 `filter()` 避免重新查询 DOM：

```javascript
var $items = $("li");  // 已经有了

// 好：复用已有集合
$items.filter(".active")

// 差：重新查询
$("li.active")
```

---

## 与数组方法的对比

jQuery 的 `filter()` 与数组的 `filter()` 类似，但有区别：

```javascript
// 数组 filter
[1, 2, 3].filter(x => x > 1);  // [2, 3]

// jQuery filter
$("li").filter(function() {
  return $(this).data("value") > 1;
});  // jQuery 对象
```

jQuery 的 `filter()` 返回 jQuery 对象，可以继续链式调用。

---

## 实际应用场景

### 表单验证

```javascript
// 检查是否有空的必填字段
if ($("input[required]").filter(function() {
  return !this.value.trim();
}).length > 0) {
  alert("请填写所有必填字段");
}

// 或用 is
if ($("input[required]").is(function() {
  return !this.value.trim();
})) {
  alert("有必填字段未填写");
}
```

### 条件渲染

```javascript
$(".message")
  .filter(".success").show().end()
  .filter(".error").hide();
```

### 事件处理

```javascript
$("a").on("click", function(e) {
  if ($(this).is("[data-external]")) {
    // 外部链接，打开新窗口
    window.open(this.href);
    e.preventDefault();
  }
});
```

### 状态检查

```javascript
// 检查复选框状态
if ($("#agree").is(":checked")) {
  $(".submit-btn").prop("disabled", false);
}

// 检查元素是否在视口中
if ($(".lazy-image").is(":visible")) {
  loadImages();
}
```

---

## 本章小结

本章我们分析了三个核心的过滤方法：

- **filter()**：保留匹配条件的元素
- **not()**：移除匹配条件的元素
- **is()**：检查是否有元素匹配，返回布尔值

设计亮点：
- **winnow 函数**：统一处理多种参数类型
- **not 参数**：让 filter 和 not 复用同一逻辑
- **支持多种参数**：选择器、函数、jQuery 对象、DOM 元素

下一章，我们分析结果集截取方法：`slice()`、`first()`、`last()` 和 `eq()`。
