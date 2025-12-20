# 语法分析：选择器编译

上一章我们看到 tokenize 如何将选择器字符串拆分成 Token 数组。这些 Token 描述了选择器的"词汇"，但还没有变成可执行的逻辑。

本章我们进入 Sizzle 的核心：**compile 函数**。它将 Token 数组编译成一个匹配函数，这个函数能判断任意 DOM 元素是否满足选择器条件。

---

## 为什么需要编译？

一个问题：为什么不直接遍历 Token 数组进行匹配，而要"编译"成函数？

**答案是性能。**

假设我们有选择器 `"div.container li.active"`，要在一个有 1000 个元素的 DOM 树中查找匹配元素。如果每次匹配都要：

1. 遍历 Token 数组
2. 对每个 Token 进行类型判断
3. 执行对应的匹配逻辑

这些判断和分支会重复 1000 次。

**编译的思想是：把这些判断提前做掉。**

编译阶段，我们根据 Token 生成一个专门的匹配函数。这个函数内部已经"知道"要匹配什么，没有多余的判断分支。运行时直接执行，效率大大提高。

这就是"解释执行"和"编译执行"的区别。

---

## compile 函数的目标

compile 函数的输入输出：

```javascript
// 输入：选择器字符串
// 输出：匹配函数

var superMatcher = compile("div.container li.active");

// 使用：传入元素，返回是否匹配
superMatcher(element, context);  // true 或 false
```

编译后的 `superMatcher` 是一个闭包，它"记住"了选择器的所有条件，调用时只做最少的工作。

---

## 匹配器的概念

在理解 compile 之前，我们需要先理解 **Matcher（匹配器）** 的概念。

Sizzle 中的匹配器是一个函数，签名如下：

```javascript
function matcher(elem, context, xml) {
  // 返回 true 表示 elem 匹配条件
  // 返回 false 表示不匹配
}
```

每种选择器类型都有对应的匹配器工厂函数。比如：

```javascript
// TAG 匹配器
Expr.filter["TAG"] = function(nodeNameSelector) {
  var expectedNodeName = nodeNameSelector.toLowerCase();
  
  return function(elem) {
    return elem.nodeName.toLowerCase() === expectedNodeName;
  };
};

// CLASS 匹配器
Expr.filter["CLASS"] = function(className) {
  var pattern = new RegExp("(^|\\s)" + className + "(\\s|$)");
  
  return function(elem) {
    return pattern.test(elem.className);
  };
};
```

注意这里的模式：**工厂函数接收选择器值，返回一个匹配器函数**。

调用 `Expr.filter["TAG"]("div")` 返回的是一个专门匹配 `div` 标签的函数。这个函数不需要再判断"要匹配什么标签"，它已经知道了。

---

## 从 Token 到 Matcher

compile 的第一步是为每个 Token 生成对应的匹配器：

```javascript
function matcherFromTokens(tokens) {
  var matchers = [];
  
  for (var i = 0; i < tokens.length; i++) {
    var token = tokens[i];
    
    if (token.type in Expr.relative) {
      // 关系符，后面单独处理
    } else {
      // 普通选择器，生成匹配器
      var matcher = Expr.filter[token.type](token.matches);
      matchers.push(matcher);
    }
  }
  
  return matchers;
}
```

对于选择器 `div.active`，我们会得到两个匹配器：

```javascript
matchers = [
  function(elem) { return elem.nodeName.toLowerCase() === "div"; },
  function(elem) { return /\bactive\b/.test(elem.className); }
]
```

---

## 组合匹配器

有了单个匹配器，下一步是把它们组合起来。`div.active` 要求元素同时满足"是 div"和"有 active 类"两个条件。

```javascript
function elementMatcher(matchers) {
  return matchers.length === 1
    ? matchers[0]
    : function(elem, context, xml) {
        for (var i = 0; i < matchers.length; i++) {
          if (!matchers[i](elem, context, xml)) {
            return false;  // 任一不满足，整体不满足
          }
        }
        return true;  // 全部满足
      };
}
```

如果只有一个匹配器，直接返回它（避免不必要的包装）。

如果有多个匹配器，返回一个组合函数，依次调用每个匹配器，全部返回 true 才算匹配。

---

## 关系符的处理

到目前为止，我们处理的都是"简单选择器"——没有关系符的选择器。但实际选择器经常包含关系符：

```javascript
$("div > ul li")  // > 和 空格
```

关系符定义了元素之间的层级关系：

| 关系符 | 含义 | 示例 |
|--------|------|------|
| 空格 | 后代 | `div li`（div 的任意后代 li） |
| `>` | 直接子元素 | `div > li`（div 的直接子元素 li） |
| `+` | 相邻兄弟 | `div + p`（紧跟在 div 后面的 p） |
| `~` | 一般兄弟 | `div ~ p`（div 后面的任意 p 兄弟） |

Sizzle 用 `Expr.relative` 存储关系符的处理函数：

```javascript
Expr.relative = {
  ">": { dir: "parentNode", first: true },
  " ": { dir: "parentNode", first: false },
  "+": { dir: "previousSibling", first: true },
  "~": { dir: "previousSibling", first: false }
};
```

`dir` 指定沿着哪个方向遍历 DOM 树，`first` 表示是否只检查第一个。

---

## addCombinator：连接匹配器

关系符的核心实现在 `addCombinator` 函数：

```javascript
function addCombinator(matcher, combinator) {
  var dir = combinator.dir,
      first = combinator.first;
  
  return function(elem, context, xml) {
    // 沿着 dir 方向遍历
    while ((elem = elem[dir])) {
      if (elem.nodeType === 1) {
        // 找到元素节点
        if (matcher(elem, context, xml)) {
          return true;  // 匹配成功
        }
        if (first) {
          break;  // 只检查第一个
        }
      }
    }
    return false;
  };
}
```

这个函数的作用是：**在给定方向上遍历 DOM，寻找满足条件的元素**。

比如对于 `div > li`：

1. 从 `li` 元素开始
2. 沿 `parentNode` 方向走一步
3. 检查这个父元素是否满足 `div` 匹配器
4. 因为是 `>`（first: true），只检查直接父元素

---

## 完整的编译流程

现在我们把所有部分串联起来。对于选择器 `"div.container > ul li.active"`：

**第 1 步：tokenize**

```javascript
tokens = [
  { type: "TAG", value: "div" },
  { type: "CLASS", value: ".container" },
  { type: ">", value: " > " },
  { type: "TAG", value: "ul" },
  { type: " ", value: " " },
  { type: "TAG", value: "li" },
  { type: "CLASS", value: ".active" }
]
```

**第 2 步：按关系符分组**

```javascript
// 组 1: div.container
// 关系符: >
// 组 2: ul
// 关系符: 空格
// 组 3: li.active
```

**第 3 步：为每组生成匹配器**

```javascript
matcher1 = elementMatcher([tagMatcher("div"), classMatcher("container")]);
matcher2 = elementMatcher([tagMatcher("ul")]);
matcher3 = elementMatcher([tagMatcher("li"), classMatcher("active")]);
```

**第 4 步：用关系符连接匹配器**

从右向左连接（Sizzle 的从右向左匹配策略，下一章详解）：

```javascript
// li.active 的匹配器
// + 后代关系 + ul 的匹配器
// + 子元素关系 + div.container 的匹配器
```

**第 5 步：返回最终的 superMatcher**

```javascript
function superMatcher(elem) {
  // 1. 检查 elem 是否匹配 li.active
  if (!matcher3(elem)) return false;
  
  // 2. 沿 parentNode 向上找，有没有 ul 祖先
  var cursor = elem;
  while ((cursor = cursor.parentNode)) {
    if (cursor.nodeType === 1 && matcher2(cursor)) {
      // 找到 ul
      // 3. 检查 ul 的直接父元素是否匹配 div.container
      var parent = cursor.parentNode;
      if (parent.nodeType === 1 && matcher1(parent)) {
        return true;
      }
    }
  }
  return false;
}
```

实际的 Sizzle 代码当然更复杂，但核心思想就是这样：**通过闭包和函数组合，将选择器"编译"成一个高效的匹配函数**。

---

## 选择器组的编译

如果选择器包含逗号（选择器组），compile 会为每个组生成独立的匹配器，最后用"或"逻辑组合：

```javascript
$("div.a, span.b")

// 编译结果
function superMatcher(elem) {
  return matcher1(elem) || matcher2(elem);
}
```

元素满足任一选择器就算匹配。

---

## 编译缓存

和 tokenize 一样，compile 也有缓存：

```javascript
var compilerCache = createCache();

function compile(selector, match) {
  var cached = compilerCache[selector];
  if (cached) {
    return cached;
  }
  
  // ... 编译逻辑 ...
  
  return compilerCache(selector, superMatcher);
}
```

编译是个相对昂贵的操作，缓存编译结果可以大大提升重复查询的性能。

---

## 设计启示

compile 函数展示了几个重要的设计思想：

### 1. 编译优于解释

将"描述"转换为"可执行代码"，把运行时的判断提前到编译时。这在很多性能敏感的场景都适用，比如模板引擎、正则引擎等。

### 2. 函数式组合

小的匹配器函数通过组合形成复杂的匹配逻辑。这种"组合优于继承"的思想让代码更灵活、更易测试。

### 3. 闭包的威力

闭包让我们能够"记住"编译时的信息（如选择器值），运行时直接使用。这是 JavaScript 实现高阶抽象的重要手段。

### 4. 策略模式

不同类型的选择器有不同的匹配策略，通过 `Expr.filter` 对象进行分发。添加新选择器类型只需要添加新条目，不需要修改 compile 函数。

---

## 本章小结

本章我们深入分析了 Sizzle 的编译器 compile：

- **编译的目的**：将选择器转换为高效的匹配函数，避免运行时的重复判断
- **匹配器**：每种选择器类型有对应的匹配器工厂
- **组合匹配器**：简单选择器的多个条件用"与"逻辑组合
- **关系符处理**：addCombinator 实现 DOM 树遍历逻辑
- **编译缓存**：缓存编译结果提升重复查询性能

编译生成的匹配函数采用"从右向左"的匹配策略——这是 Sizzle 性能优化的关键。下一章，我们将详细解析这个策略的原理和实现。
