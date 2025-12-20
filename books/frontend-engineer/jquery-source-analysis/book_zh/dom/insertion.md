# DOM插入：append、prepend、before、after

DOM 插入是 jQuery 最常用的功能之一。本章我们分析四个核心插入方法：`append()`、`prepend()`、`before()` 和 `after()`，以及它们的反向版本。

---

## 四个方向

jQuery 提供四个方向的插入方法：

| 方法 | 位置 | 说明 |
|------|------|------|
| `append()` | 内部末尾 | 作为最后一个子元素 |
| `prepend()` | 内部开头 | 作为第一个子元素 |
| `before()` | 外部之前 | 作为前一个兄弟 |
| `after()` | 外部之后 | 作为后一个兄弟 |

```javascript
$("ul").append("<li>末尾</li>")
$("ul").prepend("<li>开头</li>")
$("li.target").before("<li>前面</li>")
$("li.target").after("<li>后面</li>")
```

---

## 参数类型

这些方法都支持多种参数：

```javascript
// HTML 字符串
$("ul").append("<li>New</li>")

// DOM 元素
$("ul").append(document.createElement("li"))

// jQuery 对象
$("ul").append($("<li>"))

// 函数（返回内容）
$("ul").append(function(index, html) {
  return "<li>Item " + index + "</li>";
})
```

---

## 基本实现模式

这四个方法共享相同的实现模式：

```javascript
jQuery.fn.extend({
  append: function() {
    return domManip(this, arguments, function(elem) {
      if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
        this.appendChild(elem);
      }
    });
  },
  
  prepend: function() {
    return domManip(this, arguments, function(elem) {
      if (this.nodeType === 1 || this.nodeType === 11 || this.nodeType === 9) {
        this.insertBefore(elem, this.firstChild);
      }
    });
  },
  
  before: function() {
    return domManip(this, arguments, function(elem) {
      if (this.parentNode) {
        this.parentNode.insertBefore(elem, this);
      }
    });
  },
  
  after: function() {
    return domManip(this, arguments, function(elem) {
      if (this.parentNode) {
        this.parentNode.insertBefore(elem, this.nextSibling);
      }
    });
  }
});
```

### 核心模式

1. 调用 `domManip()` 处理参数
2. 提供回调函数执行实际插入
3. 回调中使用原生 DOM 方法

### 原生 API

- `appendChild(elem)`：添加到子元素末尾
- `insertBefore(elem, reference)`：插入到参考节点之前
- 没有 `insertAfter`，用 `insertBefore(elem, ref.nextSibling)` 模拟

---

## 反向方法

每个插入方法都有一个反向版本：

| 方法 | 反向方法 | 区别 |
|------|---------|------|
| `append()` | `appendTo()` | 主语客语交换 |
| `prepend()` | `prependTo()` | 主语客语交换 |
| `before()` | `insertBefore()` | 主语客语交换 |
| `after()` | `insertAfter()` | 主语客语交换 |

```javascript
// 等效操作
$("ul").append("<li>New</li>")
$("<li>New</li>").appendTo("ul")

// 区别：返回值不同
$("ul").append("<li>New</li>")      // 返回 ul
$("<li>New</li>").appendTo("ul")    // 返回 li
```

### 反向方法的实现

```javascript
jQuery.fn.appendTo = function(target) {
  return jQuery(target).append(this);
};
```

非常简洁：交换调用者和参数，返回被插入的元素。

实际上 jQuery 用一个工厂函数生成这些方法：

```javascript
jQuery.each({
  appendTo: "append",
  prependTo: "prepend",
  insertBefore: "before",
  insertAfter: "after"
}, function(name, original) {
  jQuery.fn[name] = function(selector) {
    var ret = [];
    var $target = jQuery(selector);
    
    for (var i = 0; i < $target.length; i++) {
      jQuery.fn[original].call($target.eq(i), this);
      ret.push.apply(ret, this.get());
    }
    
    return this.pushStack(ret);
  };
});
```

---

## 多目标插入

当目标是多个元素时，内容会被**复制**：

```javascript
$("ul").append("<li>New</li>")
// 如果有 3 个 ul，每个都会添加一个 li
// li 会被克隆
```

这是通过 `domManip` 内部的克隆逻辑实现的：

```javascript
// 简化逻辑
for (var i = 0; i < targets.length; i++) {
  var node = i === targets.length - 1
    ? elem           // 最后一个用原始节点
    : elem.cloneNode(true);  // 其他的克隆
  
  callback.call(targets[i], node);
}
```

最后一个目标使用原始节点，之前的都用克隆。这样可以保持对原始节点的引用。

---

## 函数参数

当参数是函数时，会为每个目标调用一次：

```javascript
$("li").append(function(index, html) {
  // this: 当前 li 元素
  // index: 在集合中的索引
  // html: 当前 innerHTML
  return " (" + (index + 1) + ")";
});
```

这允许根据每个元素动态生成内容。

### 实现逻辑

```javascript
if (typeof value === "function") {
  return this.each(function(i) {
    var self = jQuery(this);
    self[methodName](value.call(this, i, self.html()));
  });
}
```

---

## 脚本处理

插入包含 `<script>` 的 HTML 时，jQuery 会执行脚本：

```javascript
$("body").append("<script>alert('Hi')</script>")
// 脚本会执行
```

这是通过 `domManip` 中的脚本检测实现的：

```javascript
// 找到所有 script 元素
var scripts = jQuery.map(fragment.querySelectorAll("script"), function(elem) {
  return elem;
});

// 执行脚本
jQuery.each(scripts, function(i, elem) {
  if (!elem.type || /^text\/javascript/i.test(elem.type)) {
    // 内联脚本
    if (elem.textContent) {
      jQuery.globalEval(elem.textContent);
    }
    // 外部脚本
    else if (elem.src) {
      jQuery.ajax({ url: elem.src, async: false, dataType: "script" });
    }
  }
});
```

### 安全注意

自动执行脚本可能有安全风险。如果内容来自用户输入，要特别小心 XSS 攻击。

---

## 事件和数据处理

插入元素时，jQuery 可以保留事件和数据：

```javascript
var $item = $("<div>").data("key", "value").on("click", handler);

// 克隆时保留数据和事件
$item.clone(true).appendTo("body");
```

`clone(true)` 的 `true` 参数表示深度克隆，包括事件和数据。

---

## 性能优化

### 批量插入

```javascript
// 差：每次插入都触发重排
for (var i = 0; i < 100; i++) {
  $("ul").append("<li>" + i + "</li>");
}

// 好：构建完再一次性插入
var html = "";
for (var i = 0; i < 100; i++) {
  html += "<li>" + i + "</li>";
}
$("ul").append(html);

// 更好：使用文档片段
var $fragment = $(document.createDocumentFragment());
for (var i = 0; i < 100; i++) {
  $fragment.append($("<li>").text(i));
}
$("ul").append($fragment);
```

### 使用 detach

```javascript
// 复杂操作前先分离
var $list = $("ul").detach();

// 进行多次操作
for (var i = 0; i < 100; i++) {
  $list.append("<li>" + i + "</li>");
}

// 操作完再插回
$("body").append($list);
```

分离后的元素不在 DOM 树中，操作不会触发重排。

---

## 实际应用

### 动态列表

```javascript
function addItem(text) {
  $("<li>")
    .text(text)
    .append('<button class="delete">×</button>')
    .appendTo("ul.items");
}
```

### 加载更多

```javascript
$(".load-more").on("click", function() {
  $.get("/api/items", function(data) {
    var $items = data.map(function(item) {
      return $("<div>").addClass("item").text(item.name);
    });
    $(".container").append($items);
  });
});
```

### 消息提示

```javascript
function showMessage(text, type) {
  $("<div>")
    .addClass("message " + type)
    .text(text)
    .appendTo(".messages")
    .delay(3000)
    .fadeOut(function() {
      $(this).remove();
    });
}
```

---

## 本章小结

本章我们分析了 jQuery 的 DOM 插入方法：

- **四个方向**：append、prepend、before、after
- **反向方法**：appendTo、prependTo、insertBefore、insertAfter
- **多种参数**：HTML 字符串、DOM 元素、jQuery 对象、函数
- **多目标克隆**：插入到多个目标时自动克隆
- **脚本执行**：自动执行插入的脚本

下一章，我们深入 `domManip` 核心函数，看看这些插入方法的底层实现。
