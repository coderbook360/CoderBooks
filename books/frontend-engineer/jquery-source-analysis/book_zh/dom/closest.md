# closest 最近祖先匹配

`closest()` 是 jQuery 遍历方法中非常实用的一个。它从当前元素开始，沿着 DOM 树向上遍历，返回第一个匹配选择器的祖先元素。

这个方法在事件委托中特别常用，本章我们深入分析它的实现。

---

## 基本用法

```javascript
// 从 span 开始，找最近的 div 祖先
$("span").closest("div")

// 找最近的有 .container 类的祖先
$(".item").closest(".container")

// 可以匹配自身
$("div.active").closest("div")  // 可能返回自身
```

与 `parent()` 和 `parents()` 的区别：

| 方法 | 返回 | 是否包含自身 |
|------|------|-------------|
| `parent()` | 直接父元素 | 否 |
| `parents()` | 所有祖先 | 否 |
| `closest()` | 第一个匹配的祖先 | 是 |

---

## 实现分析

```javascript
jQuery.fn.closest = function(selectors, context) {
  var matched = [],
      targets = typeof selectors !== "string" 
        ? jQuery(selectors, context)
        : null;
  
  this.each(function() {
    var cur = this;
    
    while (cur && cur !== context) {
      // 检查当前节点是否匹配
      if (targets ? targets.index(cur) > -1 : jQuery(cur).is(selectors)) {
        matched.push(cur);
        break;
      }
      
      // 向上移动到父节点
      cur = cur.parentNode;
    }
  });
  
  return this.pushStack(jQuery.uniqueSort(matched));
};
```

### 核心逻辑

1. **从自身开始**：`var cur = this`，包含当前元素
2. **向上遍历**：`cur = cur.parentNode`
3. **检查匹配**：用 `is()` 或 `index()` 判断
4. **找到即停**：匹配后 `break`，只返回第一个

### 两种选择器处理

**字符串选择器**：用 `jQuery(cur).is(selectors)` 判断

```javascript
$("span").closest("div.container")
// 每个 cur 都用 is("div.container") 检查
```

**非字符串（元素或 jQuery 对象）**：用 `index()` 判断

```javascript
var $container = $(".container");
$("span").closest($container)
// 检查 cur 是否在 $container 中
```

---

## context 参数

`closest()` 接受可选的 `context` 参数，限制遍历范围：

```javascript
// 只在 #main 内部找
$("span").closest("div", document.getElementById("main"))

// 如果 span 在 #main 外部，返回空
```

实现中的边界检查：

```javascript
while (cur && cur !== context) {
  // ...
}
```

当 `cur` 到达 `context` 时停止遍历，不会继续向上。

---

## 性能优化：使用原生 closest

现代浏览器实现了原生的 `Element.prototype.closest()`：

```javascript
// 原生 API
document.querySelector("span").closest("div.container")
```

jQuery 可以利用它来提升性能：

```javascript
jQuery.fn.closest = function(selectors, context) {
  // 简单情况：单个元素 + 字符串选择器 + 无 context
  if (this.length === 1 && typeof selectors === "string" && !context) {
    var native = this[0].closest;
    if (native) {
      var result = native.call(this[0], selectors);
      return this.pushStack(result ? [result] : []);
    }
  }
  
  // 复杂情况：使用 jQuery 实现
  // ...
};
```

原生 API 在浏览器层面实现，比 JavaScript 遍历快得多。

---

## 事件委托中的应用

`closest()` 最常见的用途是事件委托：

```javascript
// 点击列表项
$("ul").on("click", "li", function(e) {
  // this 是 li 元素
});

// 等价于
$("ul").on("click", function(e) {
  var $li = $(e.target).closest("li");
  if ($li.length) {
    // 处理 li 点击
  }
});
```

jQuery 内部的事件委托实现就是基于 `closest()`：

```javascript
// jQuery 事件系统内部（简化）
function delegateHandler(event) {
  var target = event.target;
  
  // 从 target 向上找匹配委托选择器的元素
  var $matched = jQuery(target).closest(delegateSelector, this);
  
  if ($matched.length) {
    // 调用处理函数，this 设为匹配的元素
    handler.call($matched[0], event);
  }
}
```

---

## 与 parents().filter() 的对比

理论上，`closest()` 可以用 `parents()` 和 `filter()` 组合实现：

```javascript
// 这两个等价吗？
$("span").closest("div")
$("span").parents("div").first()
```

**不完全等价！**

`closest()` 包含自身，`parents()` 不包含：

```javascript
$("div.inner").closest("div")  // 可能返回自身
$("div.inner").parents("div")  // 不包含自身
```

正确的等价写法：

```javascript
$("span").closest("div")
// 等价于
$("span").add($("span").parents()).filter("div").first()
```

显然，`closest()` 更简洁高效。

---

## 实现细节

### 处理元素节点

遍历时需要检查节点类型：

```javascript
while (cur && cur.nodeType !== 11 && cur !== context) {
  if (cur.nodeType === 1) {  // 只处理元素节点
    if (matches(cur, selectors)) {
      return cur;
    }
  }
  cur = cur.parentNode;
}
```

`nodeType === 11` 是文档片段，到达它时应该停止。

### 多元素处理

当 jQuery 对象包含多个元素时，为每个元素找 closest：

```javascript
$("li").closest("ul")  // 每个 li 都找自己的 ul 祖先
```

如果多个 li 在同一个 ul 下，结果会包含重复的 ul。使用 `uniqueSort` 去重：

```javascript
return this.pushStack(jQuery.uniqueSort(matched));
```

---

## parentsUntil + 终止条件

`closest()` 可以看作是 `parentsUntil()` 的特殊用法：

```javascript
// 找所有祖先，直到（但不包括）匹配的
$("span").parentsUntil("div")

// closest 是找第一个匹配的（包含自身）
$("span").closest("div")
```

理解这个关系有助于选择正确的方法：

- 需要中间的祖先：用 `parentsUntil()`
- 需要最近的匹配祖先：用 `closest()`

---

## 实际应用场景

### 1. 表单验证

```javascript
$("input").on("blur", function() {
  var $field = $(this).closest(".form-field");
  
  if (this.validity.valid) {
    $field.removeClass("error");
  } else {
    $field.addClass("error");
  }
});
```

### 2. 表格行操作

```javascript
$(".delete-btn").on("click", function() {
  $(this).closest("tr").remove();
});
```

### 3. 模态框关闭

```javascript
$(".modal").on("click", function(e) {
  // 点击模态框外部时关闭
  if (!$(e.target).closest(".modal-content").length) {
    $(this).hide();
  }
});
```

### 4. 下拉菜单

```javascript
$(document).on("click", function(e) {
  // 点击下拉菜单外部时关闭
  if (!$(e.target).closest(".dropdown").length) {
    $(".dropdown").removeClass("open");
  }
});
```

---

## 性能建议

### 1. 优先使用字符串选择器

```javascript
// 好：字符串选择器可以利用原生 closest
$("span").closest("div.container")

// 慢：需要为每个元素检查 index
var $container = $(".container");
$("span").closest($container)
```

### 2. 避免过深遍历

```javascript
// 如果知道距离不远，可以用更精确的方法
$("span").parent("div")      // 只检查直接父元素
$("span").closest("div")     // 可能遍历很多层
```

### 3. 缓存结果

```javascript
// 在事件处理器中
$(".item").on("click", function() {
  var $container = $(this).closest(".container");
  
  // 多次使用 $container
  $container.addClass("active");
  $container.find(".title").text("Clicked");
});
```

---

## 本章小结

本章我们深入分析了 `closest()` 方法：

- **功能**：从自身开始，向上找第一个匹配的祖先
- **与其他方法区别**：包含自身，只返回一个
- **context 参数**：限制遍历范围
- **原生优化**：现代浏览器可用原生 `closest()`
- **事件委托**：`closest()` 是事件委托的基础

`closest()` 的设计简洁而强大，是 DOM 遍历中最常用的方法之一。

下一章，我们分析 `contents()` 方法——获取元素的所有子节点（包括文本节点）。
