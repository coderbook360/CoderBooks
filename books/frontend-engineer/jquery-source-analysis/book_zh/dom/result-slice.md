# slice、first、last、eq 结果集截取

jQuery 对象是类数组结构，我们经常需要从中取出特定位置的元素。本章分析四个结果集截取方法：`slice()`、`first()`、`last()` 和 `eq()`。

---

## eq() 方法

`eq()` 获取指定索引位置的元素，返回 jQuery 对象。

```javascript
$("li").eq(0)   // 第一个 li
$("li").eq(2)   // 第三个 li
$("li").eq(-1)  // 最后一个 li（负索引）
```

### 实现分析

```javascript
jQuery.fn.eq = function(i) {
  var len = this.length,
      j = +i + (i < 0 ? len : 0);  // 处理负索引
  
  return this.pushStack(j >= 0 && j < len ? [this[j]] : []);
};
```

### 关键点

**1. 负索引支持**

```javascript
j = +i + (i < 0 ? len : 0);
// i = -1, len = 5 => j = -1 + 5 = 4
// i = -2, len = 5 => j = -2 + 5 = 3
```

负索引从末尾开始计数：`-1` 是最后一个，`-2` 是倒数第二个。

**2. 边界检查**

```javascript
j >= 0 && j < len ? [this[j]] : []
```

索引越界时返回空数组，不会抛出错误。

**3. 返回 jQuery 对象**

`eq()` 返回的是 jQuery 对象（包含单个元素），不是 DOM 元素。这样可以继续链式调用。

如果需要 DOM 元素，用 `get()` 或索引访问：

```javascript
$("li").eq(0)     // jQuery 对象
$("li").get(0)    // DOM 元素
$("li")[0]        // DOM 元素
```

---

## first() 和 last() 方法

`first()` 获取第一个元素，`last()` 获取最后一个元素。

```javascript
$("li").first()  // 第一个
$("li").last()   // 最后一个
```

### 实现分析

```javascript
jQuery.fn.first = function() {
  return this.eq(0);
};

jQuery.fn.last = function() {
  return this.eq(-1);
};
```

非常简洁：直接调用 `eq()`。这就是代码复用的典范。

### 与选择器的对比

```javascript
// jQuery 方法
$("li").first()
$("li").last()

// 选择器伪类
$("li:first")
$("li:last")
```

效果相同，但有细微区别：

- 方法版本：在已有结果集上操作
- 选择器版本：在选择过程中过滤

当你已经有了 jQuery 对象时，用方法版本避免重新查询。

---

## slice() 方法

`slice()` 获取索引范围内的元素，类似数组的 `slice()`。

```javascript
$("li").slice(0, 3)   // 前 3 个
$("li").slice(2)      // 从第 3 个到末尾
$("li").slice(-2)     // 最后 2 个
$("li").slice(1, -1)  // 除了首尾
```

### 实现分析

```javascript
jQuery.fn.slice = function() {
  return this.pushStack(
    Array.prototype.slice.apply(this, arguments)
  );
};
```

直接借用数组的 `slice` 方法，非常简洁。

### 参数说明

- `start`：起始索引（包含）
- `end`：结束索引（不包含），可选

负索引从末尾计数。

```javascript
$("li").slice(1, 4)   // 索引 1, 2, 3
$("li").slice(-3, -1) // 倒数第 3 到倒数第 2
```

### 与数组 slice 的一致性

jQuery 的 `slice()` 行为与数组 `slice()` 完全一致：

```javascript
// 数组
[0, 1, 2, 3, 4].slice(1, 3)  // [1, 2]

// jQuery
$("li").slice(1, 3)  // 索引 1 和 2 的 li
```

这种一致性降低了学习成本。

---

## get() 方法

与截取方法相关的还有 `get()`，它返回 DOM 元素而不是 jQuery 对象。

```javascript
$("li").get()     // 所有 li 的数组
$("li").get(0)    // 第一个 li（DOM 元素）
$("li").get(-1)   // 最后一个 li（DOM 元素）
```

### 实现分析

```javascript
jQuery.fn.get = function(num) {
  if (num == null) {
    // 无参数：返回所有元素的数组
    return Array.prototype.slice.call(this);
  }
  
  // 有参数：返回指定位置的元素
  return num < 0 ? this[num + this.length] : this[num];
};
```

### eq() vs get()

| 特性 | eq(i) | get(i) |
|------|-------|--------|
| 返回值 | jQuery 对象 | DOM 元素 |
| 链式调用 | 可以 | 不可以 |
| 无参数 | - | 返回数组 |

```javascript
$("li").eq(0).addClass("first")   // 可以链式调用
$("li").get(0).addClass("first")  // 错误！DOM 元素没有 addClass
```

---

## 与选择器伪类的对比

jQuery 有一系列位置相关的伪类选择器：

```javascript
$("li:eq(0)")      // 等同于 $("li").eq(0)
$("li:first")      // 等同于 $("li").first()
$("li:last")       // 等同于 $("li").last()
$("li:lt(3)")      // 等同于 $("li").slice(0, 3)
$("li:gt(2)")      // 等同于 $("li").slice(3)
```

### 性能差异

伪类选择器是 jQuery 扩展，不被 `querySelectorAll` 支持：

```javascript
// 这个会使用原生 API
$("li").first()

// 这个必须用 Sizzle
$("li:first")
```

如果可能，优先使用方法版本。

### 使用场景

**伪类选择器适合**：组合在复杂选择器中

```javascript
$("ul:first li:even")  // 第一个 ul 中的偶数 li
```

**方法适合**：对已有结果集操作

```javascript
var $list = $("li");
// ... 一些操作
$list.first().addClass("highlight");
```

---

## 链式调用中的应用

截取方法常与 `end()` 配合使用：

```javascript
$("li")
  .first().addClass("first").end()
  .last().addClass("last").end()
  .slice(1, -1).addClass("middle");
```

每个截取方法都用 `pushStack` 保存对前一个结果的引用，`end()` 可以回退。

---

## 实际应用场景

### 分页显示

```javascript
function showPage(items, page, pageSize) {
  var start = page * pageSize;
  var end = start + pageSize;
  
  $(items).hide().slice(start, end).show();
}
```

### 轮播图

```javascript
var $slides = $(".slide");
var current = 0;

function next() {
  $slides.eq(current).fadeOut();
  current = (current + 1) % $slides.length;
  $slides.eq(current).fadeIn();
}
```

### 表格条纹

```javascript
// 交替行颜色
$("tr").slice(0).filter(":even").addClass("even");
$("tr").slice(0).filter(":odd").addClass("odd");

// 或更简洁
$("tr:even").addClass("even");
$("tr:odd").addClass("odd");
```

### 限制显示数量

```javascript
// 只显示前 5 条评论
$(".comment").slice(5).hide();

// 带"显示更多"按钮
$(".show-more").on("click", function() {
  $(".comment:hidden").slice(0, 5).show();
  
  if (!$(".comment:hidden").length) {
    $(this).hide();
  }
});
```

---

## 边界情况处理

### 空集合

```javascript
$(".nonexistent").first()   // 返回空 jQuery 对象
$(".nonexistent").eq(0)     // 返回空 jQuery 对象
$(".nonexistent").slice(0, 5)  // 返回空 jQuery 对象
```

不会抛出错误，返回空的 jQuery 对象，可以安全地继续链式调用。

### 索引越界

```javascript
$("li").eq(100)   // 返回空 jQuery 对象
$("li").slice(100, 200)  // 返回空 jQuery 对象
```

同样不会抛出错误。

### 负索引超出范围

```javascript
$("li").eq(-100)  // 返回空 jQuery 对象
// 因为 -100 + length 仍然是负数
```

---

## 本章小结

本章我们分析了四个结果集截取方法：

- **eq(i)**：获取第 i 个元素，支持负索引
- **first() / last()**：获取第一个 / 最后一个，基于 eq()
- **slice(start, end)**：获取范围内的元素，借用数组 slice

设计亮点：
- 负索引支持，与 Python 等语言一致
- 返回 jQuery 对象，保持链式调用
- 边界安全，越界返回空集合
- 与数组方法行为一致

下一章，我们分析结果集扩展方法：`add()` 和 `addBack()`。
