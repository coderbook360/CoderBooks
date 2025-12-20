# contents 与子节点获取

`contents()` 是一个特殊的遍历方法。与 `children()` 不同，它返回**所有子节点**，包括文本节点和注释节点。

这个方法主要用于处理需要操作文本内容的场景，以及 iframe 的内容访问。

---

## 基本用法

```javascript
// 获取所有子节点（包括文本节点）
$("p").contents()

// 获取 iframe 的内容文档
$("iframe").contents()
```

### 与 children() 的区别

```html
<p>Hello <strong>World</strong>!</p>
```

```javascript
$("p").children()
// 返回：[<strong>World</strong>]
// 只有元素节点

$("p").contents()
// 返回：[#text "Hello ", <strong>World</strong>, #text "!"]
// 包括文本节点
```

---

## 实现分析

```javascript
jQuery.fn.contents = function() {
  return this.map(function() {
    // 如果是 iframe，返回其内容文档
    if (this.nodeName.toLowerCase() === "iframe") {
      return this.contentDocument || this.contentWindow.document;
    }
    
    // 否则返回 childNodes
    return jQuery.merge([], this.childNodes);
  });
};
```

### 核心逻辑

1. **检测 iframe**：特殊处理，返回内容文档
2. **普通元素**：返回 `childNodes`（不是 `children`）

`childNodes` 包含所有类型的子节点：
- 元素节点（nodeType === 1）
- 文本节点（nodeType === 3）
- 注释节点（nodeType === 8）

---

## iframe 的特殊处理

`contents()` 对 iframe 有特殊意义：

```javascript
var $iframe = $("<iframe>").appendTo("body");

// 获取 iframe 的文档
var $iframeDoc = $iframe.contents();

// 操作 iframe 内容
$iframeDoc.find("body").html("<p>Hello from iframe!</p>");
```

### contentDocument vs contentWindow

```javascript
// 两种方式访问 iframe 文档
iframe.contentDocument
iframe.contentWindow.document
```

jQuery 的实现同时尝试两种方式，确保兼容性：

```javascript
return this.contentDocument || this.contentWindow.document;
```

### 跨域限制

如果 iframe 来自不同域，访问 `contents()` 会抛出安全错误：

```javascript
$("<iframe src='https://other-domain.com'>")
  .appendTo("body")
  .contents();  // 抛出 SecurityError
```

这是浏览器的同源策略限制，jQuery 无法绑过。

---

## 文本节点处理

`contents()` 最常见的用途是处理文本节点：

### 高亮搜索结果

```javascript
function highlightText(element, searchText) {
  $(element).contents().each(function() {
    if (this.nodeType === 3) {  // 文本节点
      var text = this.nodeValue;
      var index = text.indexOf(searchText);
      
      if (index !== -1) {
        // 分割文本节点
        var before = text.substring(0, index);
        var match = text.substring(index, index + searchText.length);
        var after = text.substring(index + searchText.length);
        
        // 替换为高亮 span
        $(this).replaceWith(
          before + 
          '<span class="highlight">' + match + '</span>' + 
          after
        );
      }
    } else if (this.nodeType === 1) {  // 元素节点
      // 递归处理
      highlightText(this, searchText);
    }
  });
}
```

### 文本换行处理

```javascript
// 将文本中的换行符转换为 <br>
$("pre").contents().each(function() {
  if (this.nodeType === 3) {
    var html = this.nodeValue.replace(/\n/g, "<br>");
    $(this).replaceWith(html);
  }
});
```

---

## 过滤特定类型的节点

`contents()` 常与 `filter()` 配合使用：

### 只获取文本节点

```javascript
$("p").contents().filter(function() {
  return this.nodeType === 3;
});
```

### 只获取注释节点

```javascript
$("div").contents().filter(function() {
  return this.nodeType === 8;
});
```

### 只获取非空文本节点

```javascript
$("p").contents().filter(function() {
  return this.nodeType === 3 && this.nodeValue.trim() !== "";
});
```

---

## 与 childNodes 的区别

原生的 `childNodes` 返回的是 NodeList，而 `contents()` 返回 jQuery 对象：

```javascript
// 原生
var nodes = element.childNodes;  // NodeList
nodes.forEach(...)  // 需要转换或使用 Array.from

// jQuery
$(element).contents().each(...)  // 直接使用 jQuery 方法
$(element).contents().filter(...)
```

jQuery 对象提供了更丰富的操作方法。

---

## 实际应用场景

### 1. 富文本编辑器

```javascript
// 获取选中的文本节点
function getSelectedTextNodes() {
  var selection = window.getSelection();
  var range = selection.getRangeAt(0);
  
  return $(range.commonAncestorContainer)
    .contents()
    .filter(function() {
      return this.nodeType === 3 && selection.containsNode(this);
    });
}
```

### 2. 提取纯文本

```javascript
// 获取元素的纯文本（忽略嵌套元素）
function getDirectText(element) {
  return $(element)
    .contents()
    .filter(function() {
      return this.nodeType === 3;
    })
    .map(function() {
      return this.nodeValue;
    })
    .get()
    .join("");
}

// <p>Hello <strong>World</strong>!</p>
// getDirectText($("p")[0]) => "Hello !"
```

### 3. 处理 template 内容

```javascript
// 获取 template 元素的内容
$("template").contents()  // 实际上需要用 content 属性

// 更准确的做法
$($("template")[0].content).contents()
```

### 4. 清理空白文本节点

```javascript
// 移除元素内的空白文本节点
$("div").contents().filter(function() {
  return this.nodeType === 3 && !this.nodeValue.trim();
}).remove();
```

---

## 注意事项

### 1. 不会深度遍历

`contents()` 只返回直接子节点，不会递归：

```html
<div>
  Text 1
  <span>
    Text 2
  </span>
</div>
```

```javascript
$("div").contents()
// 返回：[#text, <span>, #text]
// 不包括 span 内的 "Text 2"
```

需要递归时手动处理：

```javascript
function getAllContents($elem) {
  return $elem.contents().add(
    $elem.children().map(function() {
      return getAllContents($(this)).get();
    })
  );
}
```

### 2. 修改会影响 DOM

对 `contents()` 返回的节点进行操作会直接影响 DOM：

```javascript
$("p").contents().first().replaceWith("New text");
// 直接修改了 p 的第一个子节点
```

### 3. 空元素返回空集合

```javascript
$("<div></div>").contents()  // 返回空 jQuery 对象
```

---

## 性能考虑

`contents()` 比 `children()` 返回更多节点，可能影响后续操作的性能：

```javascript
// 如果只需要元素节点
$("div").children()  // 好：只返回元素

$("div").contents().filter(function() {
  return this.nodeType === 1;
})  // 差：先获取所有再过滤
```

只在真正需要文本节点时使用 `contents()`。

---

## 本章小结

本章我们分析了 `contents()` 方法：

- **功能**：获取所有子节点，包括文本和注释
- **与 children() 区别**：children 只返回元素节点
- **iframe 特殊处理**：返回内容文档
- **常见用途**：文本处理、高亮、富文本编辑

`contents()` 是一个专门用于处理非元素节点的工具。虽然使用频率不如其他遍历方法高，但在需要操作文本内容时非常有用。

下一章，我们分析 DOM 过滤方法：`filter()`、`not()` 和 `is()`。
