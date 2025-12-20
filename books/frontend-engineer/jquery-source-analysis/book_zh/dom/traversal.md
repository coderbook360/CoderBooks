# DOM遍历：parent、children、find

从本章开始，我们进入 jQuery 的 DOM 操作模块。DOM 操作是 jQuery 最常用的功能之一，也是它最初流行的重要原因。

本章我们分析三个核心的 DOM 遍历方法：`parent()`、`children()` 和 `find()`。它们看似简单，背后却有精妙的设计。

---

## 遍历方法的统一模式

在分析具体方法之前，我们先看看 jQuery 是如何组织这些遍历方法的。

jQuery 有很多遍历方法：`parent()`、`parents()`、`children()`、`find()`、`siblings()` 等。它们有共同的特点：

1. 从当前元素出发，沿某个方向遍历
2. 收集符合条件的元素
3. 返回新的 jQuery 对象

jQuery 用一个统一的工厂函数生成这些方法：

```javascript
jQuery.each({
  parent: function(elem) {
    var parent = elem.parentNode;
    return parent && parent.nodeType !== 11 ? parent : null;
  },
  parents: function(elem) {
    return dir(elem, "parentNode");
  },
  children: function(elem) {
    return siblings(elem.firstChild);
  },
  // ... 更多方法
}, function(name, fn) {
  jQuery.fn[name] = function(selector) {
    var matched = jQuery.map(this, fn);
    
    if (selector) {
      matched = jQuery.filter(selector, matched);
    }
    
    return this.pushStack(jQuery.uniqueSort(matched));
  };
});
```

核心思想：**配置驱动**。每个方法的"遍历逻辑"不同，但"收集"和"返回"的模式相同。

---

## parent() 方法

`parent()` 获取每个匹配元素的直接父元素。

```javascript
$("li").parent()  // 获取所有 li 的父元素
$("li").parent(".list")  // 只要类名为 list 的父元素
```

### 实现分析

```javascript
parent: function(elem) {
  var parent = elem.parentNode;
  // 排除文档片段（nodeType === 11）
  return parent && parent.nodeType !== 11 ? parent : null;
}
```

非常简单：返回 `parentNode`，但要排除文档片段。

**为什么排除文档片段？**

文档片段（DocumentFragment）是一种特殊的节点，用于暂存 DOM 元素。当元素在片段中时，它的 `parentNode` 是片段本身，但片段不是真正的 DOM 父元素。

```javascript
var frag = document.createDocumentFragment();
var div = document.createElement("div");
frag.appendChild(div);

div.parentNode;  // 返回 frag，但 frag 不在 DOM 树中
```

### 完整方法

```javascript
jQuery.fn.parent = function(selector) {
  var matched = jQuery.map(this, function(elem) {
    var parent = elem.parentNode;
    return parent && parent.nodeType !== 11 ? parent : null;
  });
  
  // 去重：多个子元素可能有同一个父元素
  matched = jQuery.uniqueSort(matched);
  
  // 过滤：如果提供了选择器
  if (selector) {
    matched = jQuery.filter(selector, matched);
  }
  
  return this.pushStack(matched);
};
```

注意 `uniqueSort`：如果选择器匹配了多个兄弟元素，它们的父元素是同一个，需要去重。

---

## parents() 方法

`parents()` 获取所有祖先元素，一直到 `<html>`。

```javascript
$("span").parents()  // 所有祖先
$("span").parents("div")  // 只要 div 祖先
```

### dir 辅助函数

`parents()` 使用 `dir` 函数沿着某个方向遍历：

```javascript
function dir(elem, direction, until) {
  var matched = [];
  
  // 沿指定方向遍历
  while ((elem = elem[direction])) {
    if (elem.nodeType === 1) {
      // 遇到终止条件
      if (until && jQuery(elem).is(until)) {
        break;
      }
      matched.push(elem);
    }
  }
  
  return matched;
}
```

这个函数很通用：

- `direction`：遍历方向（`parentNode`、`nextSibling` 等）
- `until`：可选的终止条件

### parents 实现

```javascript
parents: function(elem) {
  return dir(elem, "parentNode");
}
```

沿着 `parentNode` 方向一直走到根。

### parentsUntil 实现

还有一个变体 `parentsUntil()`，遍历到指定祖先为止：

```javascript
$("span").parentsUntil(".container")  // 到 .container 为止
$("span").parentsUntil(".container", "div")  // 且只要 div

parentsUntil: function(elem, i, until) {
  return dir(elem, "parentNode", until);
}
```

---

## children() 方法

`children()` 获取所有直接子元素。

```javascript
$("ul").children()  // 所有直接子元素
$("ul").children(".active")  // 只要 .active 子元素
```

### siblings 辅助函数

`children()` 使用 `siblings` 函数：

```javascript
function siblings(node) {
  var matched = [];
  
  for (; node; node = node.nextSibling) {
    if (node.nodeType === 1) {
      matched.push(node);
    }
  }
  
  return matched;
}
```

从第一个子节点开始，遍历所有兄弟节点，收集元素节点。

### children 实现

```javascript
children: function(elem) {
  return siblings(elem.firstChild);
}
```

从 `firstChild` 开始遍历，收集所有元素类型的子节点。

**为什么不用 `elem.children`？**

原生的 `elem.children` 返回 HTMLCollection，已经只包含元素节点。但在早期 IE 中，`children` 可能包含注释节点。jQuery 选择手动遍历 `childNodes` 来保证一致性。

在现代浏览器中，可以直接用：

```javascript
children: function(elem) {
  return jQuery.makeArray(elem.children);
}
```

---

## find() 方法

`find()` 是最强大的遍历方法，它在后代中查找匹配选择器的元素。

```javascript
$("div").find("span")  // div 下的所有 span
$("ul").find("li.active")  // ul 下的所有 li.active
```

### 实现分析

`find()` 与其他遍历方法不同，它直接调用 Sizzle：

```javascript
jQuery.fn.find = function(selector) {
  var i, ret,
      len = this.length,
      self = this;
  
  // 如果选择器是 jQuery 对象或 DOM 元素
  if (typeof selector !== "string") {
    return this.pushStack(jQuery(selector).filter(function() {
      for (i = 0; i < len; i++) {
        if (jQuery.contains(self[i], this)) {
          return true;
        }
      }
    }));
  }
  
  // 字符串选择器：在每个元素内部查找
  ret = this.pushStack([]);
  for (i = 0; i < len; i++) {
    jQuery.find(selector, self[i], ret);
  }
  
  // 多个上下文可能产生重复，需要去重排序
  return len > 1 ? jQuery.uniqueSort(ret) : ret;
};
```

### 关键点

**1. 调用 Sizzle**

`jQuery.find` 实际上是 Sizzle：

```javascript
jQuery.find = Sizzle;
```

这意味着 `find()` 支持所有 CSS 选择器和 jQuery 扩展选择器。

**2. 上下文查找**

```javascript
jQuery.find(selector, self[i], ret);
// 等价于
Sizzle(selector, self[i], ret);
```

第二个参数是查找上下文，Sizzle 只在这个元素内部查找。

**3. 非字符串选择器**

如果参数不是字符串（是 jQuery 对象或 DOM 元素），用 `jQuery.contains` 检查是否是后代：

```javascript
jQuery.contains = function(container, contained) {
  // 检查 contained 是否在 container 内部
  return container !== contained && container.contains(contained);
};
```

---

## 遍历方法的共同特点

总结一下这些遍历方法的设计模式：

### 1. pushStack 保持链式调用

所有遍历方法都返回新的 jQuery 对象，通过 `pushStack` 保持对前一个结果的引用：

```javascript
$("ul")
  .find("li")      // 新对象，prevObject 指向 ul
  .filter(".active")
  .end()           // 回退到 li
  .end()           // 回退到 ul
```

### 2. 选择器过滤

大多数遍历方法接受可选的选择器参数，用于过滤结果：

```javascript
$("li").parent()           // 所有父元素
$("li").parent(".list")    // 只要 .list
```

这通过 `jQuery.filter` 实现：

```javascript
if (selector) {
  matched = jQuery.filter(selector, matched);
}
```

### 3. 去重排序

多个起始元素可能遍历到相同的结果，用 `uniqueSort` 去重并保持 DOM 顺序：

```javascript
matched = jQuery.uniqueSort(matched);
```

### 4. 配置驱动

遍历逻辑通过配置对象定义，工厂函数生成方法。添加新方法只需添加配置：

```javascript
jQuery.each({
  newMethod: function(elem) { /* 遍历逻辑 */ }
}, function(name, fn) {
  jQuery.fn[name] = function(selector) {
    // 通用的收集和返回逻辑
  };
});
```

---

## 性能考虑

### 1. find() vs 后代选择器

这两种写法等效，但性能略有差异：

```javascript
$("div").find("span")
$("div span")
```

第一种写法实际上执行两次查询。第二种写法让 Sizzle 一次处理完整选择器，可能更高效。

但当你已经有了 jQuery 对象，`find()` 避免了重新查询容器：

```javascript
var $container = $(".container");
// ... 其他操作
$container.find("li")  // 复用已有的 jQuery 对象
```

### 2. children() vs find("> *")

```javascript
$("ul").children()       // 快
$("ul").find("> *")      // 慢
```

`children()` 直接遍历 `childNodes`，不需要选择器解析。

### 3. parent() vs closest()

```javascript
$("span").parent("div")   // 只检查直接父元素
$("span").closest("div")  // 向上遍历直到找到
```

如果知道父元素就是目标，用 `parent()` 更快。

---

## 本章小结

本章我们分析了三个核心的 DOM 遍历方法：

- **parent()**：获取直接父元素，排除文档片段
- **parents()**：获取所有祖先，使用 dir 辅助函数
- **children()**：获取直接子元素，使用 siblings 辅助函数
- **find()**：在后代中查找，直接调用 Sizzle

设计亮点：
- 配置驱动的方法生成
- pushStack 保持链式调用
- 统一的选择器过滤
- uniqueSort 去重排序

下一章，我们继续分析更多遍历方法：`siblings()`、`prev()` 和 `next()`。
