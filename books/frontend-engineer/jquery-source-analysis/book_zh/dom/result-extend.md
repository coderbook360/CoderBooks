# add 与 addBack 结果集扩展

上一章我们学习了如何截取结果集，本章我们看看如何**扩展**结果集。jQuery 提供了 `add()` 和 `addBack()` 两个方法来向当前集合添加元素。

---

## add() 方法

`add()` 向当前 jQuery 对象添加新元素，返回合并后的新集合。

```javascript
$("div").add("p")          // div 和 p
$("li").add(".special")    // li 和 .special
$("ul").add(document.body) // ul 和 body
```

### 参数类型

| 参数类型 | 示例 | 说明 |
|---------|------|------|
| 选择器 | `".class"` | 添加匹配的元素 |
| HTML 字符串 | `"<span>"` | 创建并添加新元素 |
| DOM 元素 | `element` | 添加该元素 |
| jQuery 对象 | `$others` | 合并两个集合 |

### 实现分析

```javascript
jQuery.fn.add = function(selector, context) {
  return this.pushStack(
    jQuery.uniqueSort(
      jQuery.merge(this.get(), jQuery(selector, context))
    )
  );
};
```

核心步骤：
1. `jQuery(selector, context)`：将参数转换为 jQuery 对象
2. `jQuery.merge()`：合并两个数组
3. `jQuery.uniqueSort()`：去重并按 DOM 顺序排序
4. `pushStack()`：创建新的 jQuery 对象

### uniqueSort 的重要性

合并后可能有重复元素：

```javascript
$("li").add("li.active")
// li.active 会出现两次，需要去重
```

并且需要保持 DOM 顺序，这样遍历时顺序一致：

```html
<p>1</p>
<div>2</div>
<p>3</p>
```

```javascript
$("p").add("div")  // 顺序：p1, div, p3（DOM 顺序）
// 不是：p1, p3, div（先 p 后 div）
```

---

## 实际应用

### 同时操作多种元素

```javascript
// 隐藏所有表单字段和提示文本
$("input").add("label").add(".hint").hide();

// 更简洁的写法
$("input, label, .hint").hide();
```

当元素来自不同来源时，`add()` 更灵活：

```javascript
var $fields = $("input");
var $labels = findRelatedLabels($fields);

$fields.add($labels).addClass("highlighted");
```

### 添加动态创建的元素

```javascript
$("ul").add("<li>New Item</li>")
  .appendTo("body");
```

注意：这里 `<li>` 是新创建的，还没有插入 DOM。

### 链式添加

```javascript
$("h1")
  .add("h2")
  .add("h3")
  .css("color", "blue");
```

---

## addBack() 方法

`addBack()` 将前一个结果集合并到当前结果集。这在链式调用中特别有用。

```javascript
$("ul").find("li").addBack()
// 结果：所有 ul 和它们的 li 子元素
```

### 问题场景

考虑这个链式调用：

```javascript
$("div")
  .find("span")        // 现在只有 span
  .addClass("found");  // 只给 span 添加类
```

如果我们想同时操作 `div` 和 `span` 呢？

```javascript
$("div")
  .find("span")
  .addBack()           // 现在有 div 和 span
  .addClass("found");  // 两者都添加类
```

### 实现分析

```javascript
jQuery.fn.addBack = function(selector) {
  return this.add(
    selector == null
      ? this.prevObject
      : this.prevObject.filter(selector)
  );
};
```

关键是 `this.prevObject`——jQuery 对象保存的对前一个结果集的引用。

### 可选的选择器参数

```javascript
$("ul")
  .find("li")
  .addBack("ul.main")  // 只添加 ul.main，不是所有 ul
  .addClass("highlight");
```

只有匹配选择器的前一个结果才会被添加。

---

## prevObject 机制

`addBack()` 依赖于 jQuery 的 `prevObject` 机制。每次遍历方法都会通过 `pushStack()` 保存前一个结果：

```javascript
jQuery.fn.pushStack = function(elems) {
  // 创建新的 jQuery 对象
  var ret = jQuery.merge(jQuery(), elems);
  
  // 保存对前一个对象的引用
  ret.prevObject = this;
  
  return ret;
};
```

这形成了一个链表结构：

```javascript
var $ul = $("ul");
var $li = $ul.find("li");
var $active = $li.filter(".active");

// 链表结构
// $active.prevObject === $li
// $li.prevObject === $ul
// $ul.prevObject === undefined
```

`addBack()` 就是沿着这个链表向上一步，获取前一个结果。

---

## andSelf()（已废弃）

在 jQuery 1.8 之前，这个方法叫 `andSelf()`：

```javascript
// 旧写法（已废弃）
$("ul").find("li").andSelf()

// 新写法
$("ul").find("li").addBack()
```

如果你在维护旧代码，可能会遇到 `andSelf()`。功能完全相同，只是名字变了。

---

## add() vs addBack() 的区别

| 特性 | add() | addBack() |
|------|-------|----------|
| 添加内容 | 任意选择器/元素 | 前一个结果集 |
| 需要参数 | 是 | 否（可选过滤） |
| 用途 | 合并不相关的元素 | 链式调用中回溯 |

```javascript
// add：添加任意元素
$("div").add("span")

// addBack：添加链式调用中的前一个结果
$("div").find("span").addBack()
```

---

## 实际应用场景

### 高亮容器和内容

```javascript
$(".container")
  .find(".item")
  .addBack()
  .addClass("highlighted");
// container 和 item 都高亮
```

### 表单和标签同时处理

```javascript
$("label")
  .next("input")
  .addBack()
  .css("display", "inline-block");
// label 和相邻的 input 都设置样式
```

### 递归选择

```javascript
function getAllWithChildren($elem) {
  var $children = $elem.children();
  if ($children.length) {
    return $elem.add(getAllWithChildren($children));
  }
  return $elem;
}
```

### 动画序列

```javascript
$(".box")
  .children()
  .addBack()
  .each(function(i) {
    $(this).delay(i * 100).fadeIn();
  });
// box 和其子元素依次淡入
```

---

## 与 end() 的配合

`addBack()` 和 `end()` 经常一起使用：

```javascript
$("ul")
  .find("li")
    .addClass("item")
    .filter(".active")
      .addClass("active-item")
    .end()  // 回到所有 li
  .addBack()  // 加上 ul
  .css("border", "1px solid #ccc");
```

`end()` 回退到前一个结果，`addBack()` 合并前一个结果。

---

## 性能考虑

`add()` 需要去重和排序，有一定开销：

```javascript
// 如果元素没有重叠，用选择器更直接
$("div, span")  // 优于
$("div").add("span")

// 但当你已经有了 jQuery 对象
var $divs = $("div");
var $spans = $("span");
$divs.add($spans)  // 合理的用法
```

`addBack()` 只是引用 `prevObject`，开销很小。

---

## 本章小结

本章我们分析了两个结果集扩展方法：

- **add()**：添加新元素，支持选择器、元素、jQuery 对象
- **addBack()**：添加链式调用中的前一个结果集

设计亮点：
- `uniqueSort` 保证去重和 DOM 顺序
- `prevObject` 机制支持链式回溯
- 可选的选择器参数提供灵活过滤

下一章，我们分析 `index()` 方法——获取元素在集合中的位置。
