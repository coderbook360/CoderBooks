# 词法分析：tokenize

上一章我们了解了 Sizzle 的整体架构，知道选择器引擎的核心流程是 tokenize → compile → select。本章我们深入第一个环节：**词法分析**。

一个选择器字符串进入 Sizzle，第一步就是被 `tokenize` 函数"切碎"成一个个有意义的 Token。这个过程看似简单，实则是整个选择器引擎的基础。

---

## 从一个问题开始

假设我们有这样一个选择器：

```javascript
$("div.container > ul li.active:first-child")
```

这是一个人类可读的字符串。但对于程序来说，它只是一串字符。我们怎么让程序"理解"这个选择器的含义？

**答案是：拆分。**

就像编译器处理源代码一样，我们需要把这个字符串拆分成一个个有意义的"词法单元"（Token）。这就是词法分析要做的事情。

---

## Token 的数据结构

在 Sizzle 中，每个 Token 是一个对象，包含三个核心属性：

```javascript
{
  type: "TAG",        // Token 类型
  value: "div",       // Token 的原始值
  matches: ["div"]    // 正则匹配结果
}
```

**type** 告诉我们这个 Token 是什么类型（标签、类名、ID 等），**value** 保存原始字符串，**matches** 存储正则匹配的捕获组结果。

Sizzle 支持的 Token 类型包括：

| 类型 | 含义 | 示例 |
|------|------|------|
| TAG | 标签选择器 | `div` |
| CLASS | 类选择器 | `.active` |
| ID | ID 选择器 | `#header` |
| ATTR | 属性选择器 | `[type="text"]` |
| PSEUDO | 伪类选择器 | `:first-child` |
| CHILD | 子元素伪类 | `:nth-child(2n+1)` |

---

## tokenize 函数解析

让我们看看 tokenize 函数的核心实现：

```javascript
function tokenize(selector) {
  var tokens = [],
      groups = [],
      soFar = selector,
      matched, match;
  
  // 循环直到选择器字符串被完全消费
  while (soFar) {
    // 1. 处理逗号分隔符（选择器组）
    if (!matched || (match = rcomma.exec(soFar))) {
      if (match) {
        soFar = soFar.slice(match[0].length);
      }
      groups.push(tokens = []);
    }
    
    matched = false;
    
    // 2. 处理关系符（> + ~ 空格）
    if ((match = rcombinators.exec(soFar))) {
      matched = match.shift();
      tokens.push({
        type: match[0].replace(/^\s+|\s+$/g, "") || " ",
        value: matched
      });
      soFar = soFar.slice(matched.length);
    }
    
    // 3. 处理各种选择器
    for (type in Expr.filter) {
      if ((match = matchExpr[type].exec(soFar))) {
        tokens.push({
          type: type,
          value: match[0],
          matches: match
        });
        soFar = soFar.slice(match[0].length);
        matched = true;
        break;
      }
    }
    
    if (!matched) {
      break;  // 无法匹配，选择器格式错误
    }
  }
  
  return groups;
}
```

这段代码的核心思想是：**逐步消费选择器字符串**。

每次循环：
1. 检查是否遇到逗号（选择器组分隔符）
2. 检查是否遇到关系符（`>`、`+`、`~`、空格）
3. 遍历所有选择器类型的正则，尝试匹配

匹配成功后，从 `soFar` 中切掉已匹配的部分，继续处理剩余字符串。

---

## 正则表达式：词法分析的核心

tokenize 能够识别各种选择器，靠的是一组精心设计的正则表达式。让我们看几个关键的：

### 标签选择器

```javascript
var ridentifier = /^[a-zA-Z_][\w-]*/;
// 匹配：div, span, my-component
```

### 类选择器

```javascript
var rclass = /^\.((?:\\.|[\w-])+)/;
// 匹配：.container, .my-class, .foo\.bar（转义的点号）
```

### ID 选择器

```javascript
var rid = /^#((?:\\.|[\w-])+)/;
// 匹配：#header, #main-content
```

### 属性选择器

```javascript
var rattr = /^\[[\x20\t\r\n\f]*((?:\\.|[\w-])+)(?:[\x20\t\r\n\f]*([*^$|!~]?=)[\x20\t\r\n\f]*(?:'((?:\\.|[^\\'])*)'|"((?:\\.|[^\\"])*)"|((?:\\.|[\w-])+)))?[\x20\t\r\n\f]*\]/;
// 匹配：[type], [type="text"], [data-id^="prefix"]
```

属性选择器的正则最复杂，因为它需要处理：
- 属性名
- 各种比较操作符（`=`、`^=`、`$=`、`*=`、`~=`、`|=`、`!=`）
- 引号包裹的值（单引号或双引号）
- 无引号的值

### 关系符

```javascript
var rcombinators = /^[\x20\t\r\n\f]*([>+~]|[\x20\t\r\n\f]+)[\x20\t\r\n\f]*/;
// 匹配：> + ~ 以及空格（后代选择器）
```

---

## 实例演示：解析复杂选择器

让我们手动模拟一下 tokenize 处理 `"div.container > ul li.active"` 的过程：

**初始状态**：
```javascript
soFar = "div.container > ul li.active"
groups = []
tokens = []
```

**第 1 轮**：匹配 `div`（TAG）
```javascript
tokens = [{ type: "TAG", value: "div", matches: ["div"] }]
soFar = ".container > ul li.active"
```

**第 2 轮**：匹配 `.container`（CLASS）
```javascript
tokens = [
  { type: "TAG", value: "div", matches: ["div"] },
  { type: "CLASS", value: ".container", matches: [".container", "container"] }
]
soFar = " > ul li.active"
```

**第 3 轮**：匹配 ` > `（关系符）
```javascript
tokens = [
  { type: "TAG", value: "div", matches: ["div"] },
  { type: "CLASS", value: ".container", matches: [".container", "container"] },
  { type: ">", value: " > " }
]
soFar = "ul li.active"
```

**第 4 轮**：匹配 `ul`（TAG）

**第 5 轮**：匹配 ` `（后代关系符）

**第 6 轮**：匹配 `li`（TAG）

**第 7 轮**：匹配 `.active`（CLASS）

**最终结果**：
```javascript
groups = [[
  { type: "TAG", value: "div", matches: ["div"] },
  { type: "CLASS", value: ".container", matches: [".container", "container"] },
  { type: ">", value: " > " },
  { type: "TAG", value: "ul", matches: ["ul"] },
  { type: " ", value: " " },
  { type: "TAG", value: "li", matches: ["li"] },
  { type: "CLASS", value: ".active", matches: [".active", "active"] }
]]
```

---

## 选择器组的处理

CSS 选择器支持逗号分隔的选择器组，比如 `"div, span, p"`。这会匹配满足任一选择器的元素。

tokenize 如何处理？

```javascript
$("div.a, span.b")
```

tokenize 的结果是一个二维数组：

```javascript
groups = [
  // 第一组：div.a
  [
    { type: "TAG", value: "div", matches: ["div"] },
    { type: "CLASS", value: ".a", matches: [".a", "a"] }
  ],
  // 第二组：span.b
  [
    { type: "TAG", value: "span", matches: ["span"] },
    { type: "CLASS", value: ".b", matches: [".b", "b"] }
  ]
]
```

每遇到一个逗号，就开始一个新的 tokens 数组。最终 groups 包含所有选择器组。

---

## 缓存机制

tokenize 是个纯函数：相同的输入总是产生相同的输出。因此 Sizzle 对它的结果进行了缓存：

```javascript
var tokenCache = createCache();

function tokenize(selector) {
  var cached = tokenCache[selector];
  if (cached) {
    return cached;  // 命中缓存，直接返回
  }
  
  // ... 词法分析逻辑 ...
  
  // 存入缓存
  return tokenCache(selector, groups);
}
```

`createCache` 创建了一个 LRU 缓存（最近最少使用），容量有限。当缓存满了，最久未使用的条目会被淘汰。

这个优化非常重要。在实际应用中，相同的选择器往往会被反复使用（比如在事件循环中），缓存可以避免重复的词法分析开销。

---

## 错误处理

如果选择器格式错误，tokenize 会如何处理？

```javascript
$("div[")  // 不完整的属性选择器
```

在 while 循环中，如果所有正则都无法匹配剩余字符串，`matched` 保持 `false`，循环终止：

```javascript
if (!matched) {
  break;
}
```

此时 `soFar` 不为空，表示选择器没有被完全消费。Sizzle 会检测这种情况并抛出错误：

```javascript
if (soFar) {
  Sizzle.error("Syntax error, unrecognized expression: " + selector);
}
```

---

## 设计启示

从 tokenize 的实现中，我们可以学到几个重要的设计思想：

### 1. 关注点分离

tokenize 只负责一件事：把字符串拆成 Token。它不关心这些 Token 后续如何使用。这种单一职责让代码更容易理解和测试。

### 2. 表驱动设计

选择器类型和对应的正则存储在 `Expr.filter` 和 `matchExpr` 对象中。添加新的选择器类型只需要添加新条目，不需要修改 tokenize 函数本身。这就是"开闭原则"的体现。

### 3. 缓存优化

对于纯函数，缓存是一种零风险的优化策略。这个思想在很多场景都适用。

### 4. 渐进式消费

用 `soFar` 表示"还剩多少要处理"，每次匹配后切掉已处理的部分。这是一种经典的解析模式，在很多编译器和解释器中都能看到。

---

## 本章小结

本章我们深入分析了 Sizzle 的词法分析器 tokenize：

- **核心任务**：将选择器字符串拆分为 Token 数组
- **Token 结构**：包含 type、value、matches 三个属性
- **解析策略**：逐步消费字符串，用正则匹配各种选择器类型
- **缓存优化**：使用 LRU 缓存避免重复解析
- **错误处理**：检测无法识别的语法并报错

tokenize 的输出——Token 数组——将作为下一步编译过程的输入。下一章，我们将看看 compile 函数如何将这些 Token 转换为可执行的匹配函数。
