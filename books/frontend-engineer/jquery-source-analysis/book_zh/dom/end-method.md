# end 方法与结果集回退

jQuery 链式调用的魅力在于可以在一行代码中完成多个操作。但当我们使用遍历或过滤方法后，当前结果集就变了。如何回到之前的结果？这就是 `end()` 方法的作用。

---

## 基本用法

```javascript
$("ul")
  .find("li")        // 现在是 li
    .addClass("item")
  .end()             // 回到 ul
  .addClass("list");
```

`end()` 让我们在链式调用中"回退"一步，继续操作之前的结果集。

---

## 实现分析

```javascript
jQuery.fn.end = function() {
  return this.prevObject || this.constructor();
};
```

就这么简单：返回 `prevObject`，如果没有就返回空的 jQuery 对象。

### prevObject 的来源

每次使用遍历或过滤方法时，`pushStack()` 会保存对前一个结果的引用：

```javascript
jQuery.fn.pushStack = function(elems) {
  var ret = jQuery.merge(jQuery(), elems);
  ret.prevObject = this;  // 保存前一个结果
  return ret;
};
```

`end()` 就是沿着 `prevObject` 回退一步。

---

## prevObject 链

多次遍历会形成一个链表：

```javascript
var $ul = $("ul");
var $li = $ul.find("li");
var $active = $li.filter(".active");
var $first = $active.first();

// 链表结构
$first.prevObject === $active  // true
$active.prevObject === $li     // true
$li.prevObject === $ul         // true
$ul.prevObject === undefined   // true
```

每次调用 `end()` 就沿着链表向上走一步：

```javascript
$first.end() === $active  // true
$first.end().end() === $li  // true
$first.end().end().end() === $ul  // true
```

---

## 实际应用

### 分支操作

```javascript
$("ul")
  .find("li")
    .filter(".active").addClass("highlight").end()
    .filter(".disabled").addClass("dimmed").end()
  .end()
  .addClass("processed");
```

通过 `end()` 回退，可以在同一个链式调用中对不同子集执行不同操作。

### 多层嵌套

```javascript
$("table")
  .find("tr")
    .find("td")
      .css("padding", "10px")
    .end()  // 回到 tr
    .addClass("row")
  .end()    // 回到 table
  .addClass("styled");
```

### 避免重复查询

不用 `end()` 的话：

```javascript
$("ul").addClass("list");
$("ul").find("li").addClass("item");
$("ul").find("li.active").addClass("highlight");
```

每次都重新查询 DOM。用 `end()`：

```javascript
$("ul")
  .addClass("list")
  .find("li")
    .addClass("item")
    .filter(".active")
      .addClass("highlight");
```

更简洁，且只查询一次。

---

## 无 prevObject 的情况

如果对一个"根" jQuery 对象调用 `end()`：

```javascript
var $ul = $("ul");
$ul.end();  // 返回空的 jQuery 对象

$ul.prevObject === undefined  // true
```

`end()` 返回 `this.constructor()`，即一个新的空 jQuery 对象。

这保证了 `end()` 总是返回 jQuery 对象，可以继续链式调用：

```javascript
$("ul").end().addClass("something");  // 不会报错，虽然没有效果
```

---

## 与 addBack() 的对比

`end()` 和 `addBack()` 都涉及 `prevObject`，但作用不同：

| 方法 | 作用 | 结果 |
|------|------|------|
| `end()` | 回退到前一个结果 | 只有前一个结果 |
| `addBack()` | 合并前一个结果 | 当前 + 前一个 |

```javascript
$("ul").find("li").end()      // 只有 ul
$("ul").find("li").addBack()  // ul + li
```

---

## 多次 end()

可以连续调用 `end()` 回退多步：

```javascript
$("div")
  .find("ul")
  .find("li")
  .end()   // 回到 ul
  .end()   // 回到 div
  .addClass("processed");
```

但过多的 `end()` 会让代码难以理解。如果嵌套太深，考虑拆分：

```javascript
// 不太好读
$("div").find("ul").find("li").end().end().addClass("x");

// 更清晰
var $div = $("div");
$div.find("ul").find("li");  // 一些操作
$div.addClass("x");
```

---

## 常见模式

### 缩进格式化

用缩进表示 `end()` 的层级：

```javascript
$("div")
  .addClass("container")
  .find("ul")
    .addClass("list")
    .find("li")
      .addClass("item")
    .end()
  .end()
  .css("border", "1px solid #ccc");
```

缩进帮助理解当前在哪个层级。

### 条件分支

```javascript
var $items = $("li");

$items
  .filter(".success").addClass("green").end()
  .filter(".warning").addClass("yellow").end()
  .filter(".error").addClass("red");
```

### 批量样式设置

```javascript
$("form")
  .find("input[type=text]").css("width", "200px").end()
  .find("input[type=submit]").css("width", "100px").end()
  .find("textarea").css("height", "150px");
```

---

## 性能注意

`end()` 本身开销很小，只是返回 `prevObject` 引用。

但如果链式调用很长，会创建很多中间的 jQuery 对象，每个都保持对前一个的引用。在极端情况下可能影响垃圾回收。

```javascript
// 创建了很多中间对象
var result = $("ul")
  .find("li")
  .filter(".a")
  .find("span")
  .filter(".b")
  // ...
```

如果不需要 `end()` 回退，可以直接丢弃中间结果：

```javascript
var $spans = $("ul").find("li.a span.b");
```

---

## 本章小结

本章我们分析了 `end()` 方法：

- **功能**：在链式调用中回退到前一个结果集
- **实现**：返回 `prevObject` 引用
- **prevObject 链**：多次遍历形成链表结构
- **边界情况**：根对象返回空 jQuery 对象

`end()` 是 jQuery 链式调用的重要组成部分，让我们可以在一个链中灵活地操作不同的元素集合。

下一章，我们进入 DOM 操作的核心：`append()`、`prepend()`、`before()` 和 `after()`。
