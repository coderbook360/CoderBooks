# 自定义选择器扩展

前面的章节我们深入分析了 Sizzle 的内部实现。本章我们换个角度：**如何扩展 Sizzle，添加自定义选择器**。

这是 Sizzle 设计的一大亮点——开放的扩展机制。通过简单的 API，我们可以定义自己的伪类选择器，让 jQuery 支持项目特定的查询需求。

---

## 扩展入口：$.expr.pseudos

jQuery 通过 `$.expr.pseudos`（旧版本是 `$.expr[':']`）暴露伪类注册接口：

```javascript
// 添加自定义伪类
$.expr.pseudos.myPseudo = function(elem) {
  // 返回 true 表示匹配
  return /* 匹配条件 */;
};

// 使用
$("div:myPseudo")
```

就这么简单。注册一个函数，函数接收 DOM 元素，返回 boolean。

---

## 示例：:external 选择器

假设我们需要选择所有外部链接（指向其他域名的 `<a>` 标签）：

```javascript
$.expr.pseudos.external = function(elem) {
  // 只处理 <a> 标签
  if (elem.nodeName.toLowerCase() !== "a") {
    return false;
  }
  
  var href = elem.getAttribute("href");
  if (!href) {
    return false;
  }
  
  // 检查是否指向外部域名
  // 以 http/https 开头，且不是当前域名
  if (!/^https?:\/\//i.test(href)) {
    return false;  // 相对链接
  }
  
  return href.indexOf(location.hostname) === -1;
};

// 使用
$("a:external").addClass("external-link");
$("a:external").attr("target", "_blank");
```

---

## 带参数的伪类

有些伪类需要接收参数，比如 `:contains('text')`。实现方式略有不同：

```javascript
$.expr.pseudos.attr = $.expr.createPseudo(function(argument) {
  // argument 是括号内的参数
  // 返回一个匹配器函数
  return function(elem) {
    return elem.hasAttribute(argument);
  };
});

// 使用
$("div:attr(data-id)")  // 选择有 data-id 属性的 div
```

`$.expr.createPseudo` 是关键。它告诉 Sizzle 这是一个"工厂"——接收参数，返回匹配器。

### createPseudo 的工作原理

```javascript
$.expr.createPseudo = function(fn) {
  // 标记这是一个需要参数的伪类
  fn.sizzleFilter = true;
  return fn;
};
```

当 Sizzle 遇到 `:myPseudo(arg)` 时：

1. 在 `$.expr.pseudos` 中查找 `myPseudo`
2. 检查它是否有 `sizzleFilter` 标记
3. 如果有，调用它并传入参数，得到真正的匹配器
4. 如果没有，直接当作匹配器使用

---

## 实战：:data() 选择器

jQuery 的 `.data()` 方法在元素上存储数据。我们可以创建一个伪类来根据数据查询元素：

```javascript
$.expr.pseudos.data = $.expr.createPseudo(function(argument) {
  // 解析参数：支持 :data(key) 和 :data(key=value)
  var parts = argument.split("=");
  var key = parts[0].trim();
  var value = parts[1] ? parts[1].trim() : undefined;
  
  return function(elem) {
    var data = $.data(elem, key);
    
    if (value === undefined) {
      // 只检查键是否存在
      return data !== undefined;
    }
    
    // 检查值是否相等（转为字符串比较）
    return String(data) === value;
  };
});

// 使用
$("div:data(loaded)")           // 有 loaded 数据的 div
$("li:data(status=active)")     // status 为 "active" 的 li
```

---

## 实战：:regex() 选择器

用正则表达式匹配元素内容：

```javascript
$.expr.pseudos.regex = $.expr.createPseudo(function(argument) {
  // 参数格式：attr,pattern 或 直接 pattern（匹配 textContent）
  var parts = argument.split(",");
  var attr, pattern;
  
  if (parts.length === 2) {
    attr = parts[0].trim();
    pattern = parts[1].trim();
  } else {
    attr = null;
    pattern = argument;
  }
  
  var regex = new RegExp(pattern);
  
  return function(elem) {
    var text = attr 
      ? elem.getAttribute(attr) 
      : elem.textContent;
    
    return text && regex.test(text);
  };
});

// 使用
$("span:regex(^\\d+$)")           // 内容是纯数字的 span
$("a:regex(href,\\.pdf$)")        // href 以 .pdf 结尾的链接
```

---

## 实战：:inViewport 选择器

选择当前在视口中可见的元素：

```javascript
$.expr.pseudos.inViewport = function(elem) {
  var rect = elem.getBoundingClientRect();
  
  return (
    rect.top >= 0 &&
    rect.left >= 0 &&
    rect.bottom <= window.innerHeight &&
    rect.right <= window.innerWidth
  );
};

// 使用
$("img:inViewport").each(function() {
  // 懒加载：只加载视口内的图片
  this.src = this.dataset.src;
});
```

**注意**：这个选择器的结果依赖于滚动位置，每次调用可能返回不同结果。

---

## 性能注意事项

自定义伪类的性能取决于匹配器函数的实现：

### 1. 避免昂贵的操作

```javascript
// 差：每次匹配都触发布局
$.expr.pseudos.big = function(elem) {
  return elem.offsetWidth > 500;  // 触发布局计算
};

// 好：使用 CSS 类或数据属性
$.expr.pseudos.big = function(elem) {
  return elem.classList.contains("big");
};
```

### 2. 缓存可复用的计算

```javascript
$.expr.pseudos.inSection = $.expr.createPseudo(function(sectionId) {
  // 在工厂函数中缓存查询结果
  var section = document.getElementById(sectionId);
  
  return function(elem) {
    return section && section.contains(elem);
  };
});
```

### 3. 注意调用频率

自定义伪类会为每个候选元素调用一次。如果选择器是 `div:myPseudo`，且页面有 1000 个 div，匹配器会被调用 1000 次。

```javascript
// 这个伪类在大型 DOM 上会很慢
$.expr.pseudos.deepNested = function(elem) {
  var depth = 0;
  var node = elem;
  while ((node = node.parentNode)) {
    depth++;
  }
  return depth > 10;
};
```

---

## 与原生 API 的兼容性

自定义伪类不被 `querySelectorAll` 支持。一旦选择器包含自定义伪类，Sizzle 会回退到自己的实现。

```javascript
// 这个选择器只能用 Sizzle 处理
$("div:myPseudo")

// 如果可能，把自定义伪类放在后面
$("div.container li:myPseudo")
// Sizzle 可以先用 querySelectorAll 找到 div.container li
// 然后用自定义伪类过滤
```

---

## 覆盖内置伪类

我们甚至可以覆盖 Sizzle 内置的伪类：

```javascript
// 保存原来的实现
var originalVisible = $.expr.pseudos.visible;

// 覆盖
$.expr.pseudos.visible = function(elem) {
  // 添加自定义逻辑
  if (elem.dataset.forceHidden === "true") {
    return false;
  }
  
  // 调用原始实现
  return originalVisible(elem);
};
```

这种技术可以用于扩展或修复内置行为。

---

## 实用伪类库示例

以下是一些实用的自定义伪类，可以直接用于项目：

```javascript
(function($) {
  var pseudos = $.expr.pseudos;
  
  // :blank - 内容为空或只有空白的元素
  pseudos.blank = function(elem) {
    return !elem.textContent.trim();
  };
  
  // :truncated - 内容被截断的元素
  pseudos.truncated = function(elem) {
    return elem.scrollWidth > elem.clientWidth;
  };
  
  // :onscreen - 在屏幕可见区域内
  pseudos.onscreen = function(elem) {
    var rect = elem.getBoundingClientRect();
    return (
      rect.bottom > 0 &&
      rect.right > 0 &&
      rect.top < window.innerHeight &&
      rect.left < window.innerWidth
    );
  };
  
  // :loaded - 已加载完成的图片
  pseudos.loaded = function(elem) {
    if (elem.nodeName.toLowerCase() !== "img") {
      return false;
    }
    return elem.complete && elem.naturalWidth > 0;
  };
  
  // :localLink - 指向当前页面锚点的链接
  pseudos.localLink = function(elem) {
    if (elem.nodeName.toLowerCase() !== "a") {
      return false;
    }
    var href = elem.getAttribute("href");
    return href && href.charAt(0) === "#";
  };
  
  // :target(id) - 匹配特定 ID 的元素（带参数）
  pseudos.target = pseudos.target || $.expr.createPseudo(function(id) {
    return function(elem) {
      return elem.id === id;
    };
  });
  
})(jQuery);
```

---

## 测试自定义伪类

编写自定义伪类后，建议进行测试：

```javascript
// 简单的测试框架
function testPseudo(name, html, selector, expected) {
  var $container = $("<div>").html(html).appendTo("body");
  var result = $(selector, $container).length;
  var passed = result === expected;
  
  console.log(
    (passed ? "✓" : "✗") + " :" + name,
    "expected:", expected,
    "got:", result
  );
  
  $container.remove();
  return passed;
}

// 测试 :external
testPseudo(
  "external",
  '<a href="https://example.com">外部</a><a href="/local">本地</a>',
  "a:external",
  1
);

// 测试 :blank
testPseudo(
  "blank",
  '<span>有内容</span><span>  </span><span></span>',
  "span:blank",
  2
);
```

---

## 设计启示

从 Sizzle 的扩展机制中，我们可以学到：

### 1. 开放封闭原则

Sizzle 的核心代码是封闭的，但通过 `$.expr.pseudos` 对扩展开放。添加新功能不需要修改源码。

### 2. 一致的扩展模式

无论是简单伪类还是带参数的伪类，都遵循相同的注册模式。学习成本低，使用简单。

### 3. 向后兼容

即使覆盖内置伪类，也可以保持对原始行为的调用。扩展可以增量进行。

### 4. 性能责任转移

Sizzle 提供扩展机制，但性能责任由扩展者承担。这是合理的职责划分。

---

## 本章小结

本章我们学习了如何扩展 Sizzle：

- **简单伪类**：在 `$.expr.pseudos` 中注册匹配器函数
- **带参数伪类**：使用 `$.expr.createPseudo` 创建工厂函数
- **实用示例**：:external、:data()、:regex()、:inViewport 等
- **性能注意**：避免昂贵操作，缓存计算结果
- **兼容性**：自定义伪类会导致 Sizzle 回退到自实现

Sizzle 的扩展机制展示了优秀的 API 设计：简单、一致、强大。

至此，我们完成了 Sizzle 选择器引擎的全部分析。从架构设计到词法分析，从编译优化到扩展机制，我们深入理解了这个 jQuery 核心组件的工作原理。

下一部分，我们将进入 jQuery 的 DOM 操作模块，看看 jQuery 如何简化我们与 DOM 的交互。
