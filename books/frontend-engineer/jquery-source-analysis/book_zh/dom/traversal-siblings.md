# DOM遍历：siblings、prev、next

上一章我们分析了父子方向的遍历方法。本章我们关注**兄弟方向**的遍历：`siblings()`、`prev()` 和 `next()`。

这些方法沿着兄弟节点链遍历，帮助我们在同级元素之间导航。

---

## siblings() 方法

`siblings()` 获取所有兄弟元素（不包括自身）。

```javascript
$(".current").siblings()  // 所有兄弟
$(".current").siblings(".highlight")  // 只要有 highlight 类的兄弟
```

### 实现分析

```javascript
siblings: function(elem) {
  // 从父元素的第一个子元素开始遍历
  // 排除自身
  return siblings((elem.parentNode || {}).firstChild, elem);
}
```

这里调用了 `siblings` 辅助函数，但传入了第二个参数作为排除项：

```javascript
function siblings(node, excludeElem) {
  var matched = [];
  
  for (; node; node = node.nextSibling) {
    if (node.nodeType === 1 && node !== excludeElem) {
      matched.push(node);
    }
  }
  
  return matched;
}
```

从父元素的 `firstChild` 开始，遍历所有 `nextSibling`，收集元素节点，但跳过自身。

### 为什么不用 elem.parentNode.children？

可以简化为：

```javascript
siblings: function(elem) {
  var parent = elem.parentNode;
  if (!parent) return [];
  
  return jQuery.grep(parent.children, function(child) {
    return child !== elem;
  });
}
```

jQuery 选择手动遍历是为了兼容早期浏览器，现代浏览器可以放心使用 `children`。

---

## prev() 方法

`prev()` 获取**紧邻的前一个**兄弟元素。

```javascript
$(".current").prev()  // 前一个兄弟
$(".current").prev("li")  // 前一个兄弟且是 li
```

### 实现分析

```javascript
prev: function(elem) {
  return sibling(elem, "previousSibling");
}
```

使用 `sibling` 辅助函数（注意是单数）：

```javascript
function sibling(elem, direction) {
  while ((elem = elem[direction])) {
    if (elem.nodeType === 1) {
      return elem;  // 找到第一个元素节点就返回
    }
  }
  return null;
}
```

沿着 `previousSibling` 方向找到第一个元素节点。

**为什么要用 while 循环？**

因为 `previousSibling` 可能是文本节点或注释节点：

```html
<ul>
  <li>A</li>
  <!-- 注释 -->
  <li>B</li>
  文本节点
  <li>C</li>
</ul>
```

从 C 开始 `previousSibling`，依次是：
1. 文本节点（空白）
2. `<li>B</li>`（元素，返回）

循环跳过非元素节点，找到真正的前一个兄弟元素。

---

## prevAll() 方法

`prevAll()` 获取**所有**前面的兄弟元素。

```javascript
$(".current").prevAll()  // 所有前面的兄弟
$(".current").prevAll(".item")  // 只要 .item
```

### 实现分析

```javascript
prevAll: function(elem) {
  return dir(elem, "previousSibling");
}
```

使用 `dir` 辅助函数，沿 `previousSibling` 方向一直遍历到头。

结果顺序是**从近到远**：离当前元素最近的在前面。

```html
<ul>
  <li>A</li>
  <li>B</li>
  <li class="current">C</li>
</ul>
```

```javascript
$(".current").prevAll()  // [B, A]，不是 [A, B]
```

---

## prevUntil() 方法

`prevUntil()` 获取前面的兄弟，直到遇到指定元素为止。

```javascript
$(".end").prevUntil(".start")  // 从 .end 往前，到 .start 为止
$(".end").prevUntil(".start", "li")  // 且只要 li 元素
```

### 实现分析

```javascript
prevUntil: function(elem, i, until) {
  return dir(elem, "previousSibling", until);
}
```

`dir` 函数的第三个参数指定终止条件：

```javascript
function dir(elem, direction, until) {
  var matched = [];
  
  while ((elem = elem[direction])) {
    if (elem.nodeType === 1) {
      // 遇到终止元素，停止
      if (until && jQuery(elem).is(until)) {
        break;
      }
      matched.push(elem);
    }
  }
  
  return matched;
}
```

---

## next() 方法

`next()` 是 `prev()` 的镜像，获取紧邻的后一个兄弟元素。

```javascript
$(".current").next()  // 后一个兄弟
$(".current").next("li")  // 后一个兄弟且是 li
```

### 实现分析

```javascript
next: function(elem) {
  return sibling(elem, "nextSibling");
}
```

同样使用 `sibling` 辅助函数，方向改为 `nextSibling`。

---

## nextAll() 和 nextUntil()

与 `prevAll()` 和 `prevUntil()` 对称：

```javascript
nextAll: function(elem) {
  return dir(elem, "nextSibling");
}

nextUntil: function(elem, i, until) {
  return dir(elem, "nextSibling", until);
}
```

`nextAll()` 的结果顺序也是**从近到远**。

---

## 辅助函数总结

jQuery 用两个辅助函数处理所有兄弟遍历：

### sibling(elem, direction)

找到**第一个**指定方向的兄弟元素：

```javascript
function sibling(elem, direction) {
  while ((elem = elem[direction])) {
    if (elem.nodeType === 1) {
      return elem;
    }
  }
  return null;
}
```

用于 `prev()` 和 `next()`。

### dir(elem, direction, until)

收集**所有**指定方向的元素，可选终止条件：

```javascript
function dir(elem, direction, until) {
  var matched = [];
  
  while ((elem = elem[direction])) {
    if (elem.nodeType === 1) {
      if (until && jQuery(elem).is(until)) {
        break;
      }
      matched.push(elem);
    }
  }
  
  return matched;
}
```

用于 `prevAll()`、`nextAll()`、`prevUntil()`、`nextUntil()`，也用于 `parents()` 和 `parentsUntil()`。

---

## 完整的方法生成

jQuery 用配置对象统一生成这些方法：

```javascript
jQuery.each({
  prev: function(elem) {
    return sibling(elem, "previousSibling");
  },
  next: function(elem) {
    return sibling(elem, "nextSibling");
  },
  prevAll: function(elem) {
    return dir(elem, "previousSibling");
  },
  nextAll: function(elem) {
    return dir(elem, "nextSibling");
  },
  prevUntil: function(elem, i, until) {
    return dir(elem, "previousSibling", until);
  },
  nextUntil: function(elem, i, until) {
    return dir(elem, "nextSibling", until);
  },
  siblings: function(elem) {
    return siblings((elem.parentNode || {}).firstChild, elem);
  }
}, function(name, fn) {
  jQuery.fn[name] = function(until, selector) {
    var matched = jQuery.map(this, fn, until);
    
    // Until 方法的参数处理
    if (name.slice(-5) !== "Until") {
      selector = until;
    }
    
    if (selector && typeof selector === "string") {
      matched = jQuery.filter(selector, matched);
    }
    
    if (this.length > 1) {
      // 去重：多个元素可能有共同的兄弟
      jQuery.uniqueSort(matched);
      
      // prev* 方法需要反转顺序
      if (/^(?:parents|prev(?:Until|All))/.test(name)) {
        matched.reverse();
      }
    }
    
    return this.pushStack(matched);
  };
});
```

### 关键细节

**1. Until 方法的参数处理**

`prevUntil(until, selector)` 有两个参数：
- `until`：终止条件
- `selector`：过滤条件

普通方法只有一个参数（过滤条件）。

**2. 结果顺序处理**

`prev*` 系列方法的结果需要反转，以保持 DOM 顺序：

```javascript
if (/^(?:parents|prev(?:Until|All))/.test(name)) {
  matched.reverse();
}
```

因为遍历是从近到远，但期望的结果是 DOM 顺序（从远到近）。

---

## 实际应用

### 切换高亮

```javascript
// 键盘导航：上下切换当前项
$("ul").on("keydown", function(e) {
  var $current = $(this).find(".current");
  
  if (e.key === "ArrowUp") {
    $current.removeClass("current")
      .prev("li").addClass("current");
  }
  
  if (e.key === "ArrowDown") {
    $current.removeClass("current")
      .next("li").addClass("current");
  }
});
```

### 表格行操作

```javascript
// 删除当前行，选中下一行
$(".delete-btn").on("click", function() {
  var $row = $(this).closest("tr");
  var $nextRow = $row.next("tr");
  
  $row.remove();
  
  if ($nextRow.length) {
    $nextRow.addClass("selected");
  }
});
```

### 折叠展开

```javascript
// 点击标题，切换后续内容的显示
$(".section-title").on("click", function() {
  $(this).nextUntil(".section-title").slideToggle();
});
```

---

## 性能考虑

### 1. 避免重复查询

```javascript
// 差：重复调用
$(".item").prev().css("color", "red");
$(".item").prev().css("font-size", "16px");

// 好：缓存结果
var $prev = $(".item").prev();
$prev.css("color", "red");
$prev.css("font-size", "16px");

// 或用链式调用
$(".item").prev().css({
  color: "red",
  fontSize: "16px"
});
```

### 2. 精确选择

```javascript
// 如果只需要一个元素，用具体方法
$(".item").prev()     // 好：只找一个
$(".item").prevAll().first()  // 差：找所有再取第一个
```

### 3. 注意结果数量

```javascript
var $items = $("li");  // 假设有 100 个 li
$items.siblings();     // 每个 li 都找兄弟，可能很多

// 如果只需要某一个的兄弟
$items.eq(5).siblings();  // 更精确
```

---

## 本章小结

本章我们分析了兄弟方向的 DOM 遍历方法：

- **siblings()**：获取所有兄弟（排除自身）
- **prev() / next()**：获取紧邻的兄弟
- **prevAll() / nextAll()**：获取所有前/后兄弟
- **prevUntil() / nextUntil()**：获取到指定元素为止的兄弟

核心实现：
- `sibling` 辅助函数：找第一个兄弟
- `dir` 辅助函数：找所有方向上的元素
- 配置驱动的方法生成
- 结果去重和顺序处理

下一章，我们分析 `closest()` 方法——向上遍历找到第一个匹配的祖先。
