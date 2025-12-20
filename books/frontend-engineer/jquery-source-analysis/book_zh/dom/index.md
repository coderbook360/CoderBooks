# index 元素索引

`index()` 方法用于获取元素在集合中的位置。这个看似简单的方法有几种不同的调用方式，本章我们逐一分析。

---

## 三种调用方式

`index()` 有三种使用方式，行为各不相同：

### 1. 无参数：在兄弟元素中的位置

```javascript
$("li.active").index()
// 返回 .active 在所有兄弟 li 中的索引
```

### 2. DOM 元素或 jQuery 对象参数：在当前集合中的位置

```javascript
var $item = $(".item");
$("li").index($item)
// 返回 $item 在 li 集合中的索引
```

### 3. 选择器参数：在选择器匹配结果中的位置

```javascript
$(".active").index("li")
// 返回 .active 在所有 li 中的索引
```

---

## 实现分析

```javascript
jQuery.fn.index = function(elem) {
  // 无参数：在兄弟中的位置
  if (!arguments.length) {
    return this[0] && this[0].parentNode
      ? this.first().prevAll().length
      : -1;
  }
  
  // 字符串参数：在选择器结果中的位置
  if (typeof elem === "string") {
    return indexOf.call(jQuery(elem), this[0]);
  }
  
  // 元素参数：在当前集合中的位置
  return indexOf.call(this, elem.jquery ? elem[0] : elem);
};
```

让我们逐个分析。

---

## 无参数：兄弟元素中的索引

```javascript
$("li.active").index()
```

### 实现逻辑

```javascript
if (!arguments.length) {
  return this[0] && this[0].parentNode
    ? this.first().prevAll().length
    : -1;
}
```

计算 `prevAll().length` ——前面有多少兄弟元素，就是当前元素的索引。

### 示例

```html
<ul>
  <li>0</li>
  <li>1</li>
  <li class="active">2</li>
  <li>3</li>
</ul>
```

```javascript
$("li.active").index()  // 返回 2
// 因为前面有 2 个 li
```

### 边界情况

```javascript
$(".nonexistent").index()  // 返回 -1
// 集合为空时返回 -1
```

---

## 选择器参数：在匹配结果中的索引

```javascript
$(".active").index("li")
```

### 实现逻辑

```javascript
if (typeof elem === "string") {
  return indexOf.call(jQuery(elem), this[0]);
}
```

先用选择器查找所有元素，再找 `this[0]` 在结果中的位置。

### 示例

```html
<ul>
  <li>A</li>
  <li class="active">B</li>
  <li>C</li>
</ul>
<ul>
  <li>D</li>
  <li>E</li>
</ul>
```

```javascript
$(".active").index("li")  // 返回 1
// .active 是第 2 个 li（所有 li 中，不只是同一 ul）
```

### 与无参数版本的区别

```javascript
$(".active").index()      // 在兄弟 li 中的位置：1
$(".active").index("li")  // 在所有 li 中的位置：1（这个例子中恰好相同）
```

如果有多个 ul，结果可能不同：

```javascript
// .active 在第二个 ul 中
$(".active").index()      // 在当前 ul 兄弟中的位置
$(".active").index("li")  // 在整个文档所有 li 中的位置
```

---

## 元素参数：在当前集合中的索引

```javascript
var elem = document.querySelector(".target");
$("li").index(elem)
```

### 实现逻辑

```javascript
return indexOf.call(this, elem.jquery ? elem[0] : elem);
```

在 `this`（当前 jQuery 对象）中查找 `elem` 的位置。

`elem.jquery` 检查参数是否是 jQuery 对象：

```javascript
elem.jquery ? elem[0] : elem
// jQuery 对象取第一个元素，否则直接使用
```

### 示例

```javascript
var $items = $("li");
var $active = $("li.active");

$items.index($active)  // $active 在 $items 中的位置
$items.index($active[0])  // 同上，传入 DOM 元素
```

---

## indexOf 的实现

jQuery 使用数组的 `indexOf`：

```javascript
var indexOf = Array.prototype.indexOf;

indexOf.call(this, elem)
// 把 this（jQuery 对象）当数组，找 elem 的位置
```

jQuery 对象是类数组结构，所以可以借用数组方法。

---

## 实际应用场景

### 标签页切换

```javascript
$(".tabs li").on("click", function() {
  var index = $(this).index();
  
  // 显示对应的内容面板
  $(".panel").hide().eq(index).show();
  
  // 更新标签状态
  $(this).addClass("active").siblings().removeClass("active");
});
```

### 轮播图指示器

```javascript
$(".indicator li").on("click", function() {
  var index = $(this).index();
  
  // 切换到对应的幻灯片
  showSlide(index);
});

function showSlide(index) {
  $(".slide").hide().eq(index).show();
  $(".indicator li").removeClass("active").eq(index).addClass("active");
}
```

### 表格排序

```javascript
$("th").on("click", function() {
  var columnIndex = $(this).index();
  
  // 根据列索引排序表格
  sortTableByColumn(columnIndex);
});
```

### 验证元素位置

```javascript
// 检查元素是否在列表中
if ($("li").index(element) !== -1) {
  // 元素在列表中
}
```

---

## 性能考虑

### 无参数版本

```javascript
$(elem).index()  // 使用 prevAll()
```

需要遍历之前的所有兄弟元素。如果兄弟很多，可能较慢。

### 选择器参数版本

```javascript
$(elem).index("selector")  // 先查询，再 indexOf
```

需要执行一次选择器查询，加上一次 indexOf。

### 元素参数版本

```javascript
$collection.index(elem)  // 直接 indexOf
```

只需要一次 indexOf，最快。

如果需要多次查找索引，考虑预先构建映射：

```javascript
// 差：每次都 indexOf
$("li").each(function() {
  var index = $("li").index(this);
  // ...
});

// 好：预先构建映射
var indexMap = {};
$("li").each(function(i) {
  indexMap[this.id] = i;
});
```

---

## 返回值

`index()` 返回数字：

- 找到：返回 0 开始的索引
- 未找到：返回 -1
- 集合为空：返回 -1

```javascript
$("li").index($(".active"))  // 找到：0, 1, 2, ...
$("li").index($(".nonexistent"))  // 未找到：-1
$(".nonexistent").index()  // 集合为空：-1
```

---

## 与原生 API 的对比

原生 JavaScript 也有类似的能力：

```javascript
// 在兄弟中的索引
var index = Array.from(elem.parentNode.children).indexOf(elem);

// 在 NodeList 中的索引
var nodes = document.querySelectorAll("li");
var index = Array.from(nodes).indexOf(elem);
```

jQuery 的 `index()` 更简洁，但了解原生实现有助于理解底层原理。

---

## 本章小结

本章我们分析了 `index()` 方法的三种用法：

- **无参数**：返回在兄弟元素中的位置，基于 `prevAll().length`
- **选择器参数**：返回在选择器结果中的位置
- **元素参数**：返回在当前集合中的位置

关键点：
- 返回 -1 表示未找到
- 使用 `Array.prototype.indexOf` 实现
- 不同参数类型有不同的语义

下一章，我们分析 `end()` 方法——链式调用中的结果集回退。
