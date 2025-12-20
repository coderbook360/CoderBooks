# 从右向左的匹配策略

前两章我们学习了 Sizzle 的词法分析和编译过程。本章我们深入 Sizzle 最核心的性能优化策略：**从右向左匹配**。

这个策略看似反直觉，却是 CSS 选择器引擎高效运行的关键。

---

## 一个直觉的陷阱

假设我们有选择器 `div.container ul li.active`，要在 DOM 树中找到所有匹配的元素。

**直觉做法**（从左向右）：

1. 找到所有 `div.container` 元素
2. 在每个 `div.container` 下找 `ul` 后代
3. 在每个 `ul` 下找 `li.active` 后代

这看起来合理，但效率很低。为什么？

假设页面有：
- 10 个 `div.container`
- 每个下面有 5 个 `ul`
- 每个 `ul` 下有 20 个 `li`
- 但只有 3 个 `li` 有 `active` 类

从左向右，我们要：
1. 遍历 10 个 `div.container`
2. 遍历 50 个 `ul`
3. 遍历 1000 个 `li`
4. 最终只匹配 3 个

我们检查了 1000 个元素，只为找到 3 个目标。

---

## 从右向左的威力

**从右向左**的做法完全不同：

1. 找到所有 `li.active` 元素（3 个）
2. 对每个 `li.active`，向上检查是否有 `ul` 祖先
3. 对每个 `ul`，向上检查是否有 `div.container` 祖先

从右向左，我们只需要：
1. 找到 3 个 `li.active`
2. 向上遍历验证，每个最多检查几层父元素

这个差距在大型 DOM 树上会非常明显。

---

## 为什么从右向左更快？

核心原因：**选择器的最右部分（关键选择器）通常最具限制性**。

在 `div.container ul li.active` 中：
- `div.container`：可能有很多
- `ul`：可能更多
- `li.active`：通常很少

从最具限制性的部分开始，可以最早排除不匹配的元素，减少无效遍历。

这就是为什么 CSS 规范建议：**把最具体的选择器放在最右边**。

```css
/* 好：具体选择器在右边 */
.container .item.active { }

/* 差：通用选择器在右边 */
.active div span { }
```

---

## Sizzle 的实现

让我们看看 Sizzle 如何实现从右向左匹配。

### 1. 寻找"种子"元素

编译后的匹配函数需要一个起点。Sizzle 首先从最右边的选择器找到"种子"元素：

```javascript
function select(selector, context) {
  var tokens = tokenize(selector)[0],
      seed = [],
      i = tokens.length;
  
  // 从右向左扫描，找到第一个可以确定种子的 Token
  while (i--) {
    var token = tokens[i];
    
    // 跳过关系符
    if (Expr.relative[token.type]) {
      continue;
    }
    
    // 找到具体选择器，用它生成种子
    if (token.type === "ID") {
      seed = [context.getElementById(token.matches[1])];
      break;
    } else if (token.type === "TAG") {
      seed = context.getElementsByTagName(token.matches[0]);
      break;
    } else if (token.type === "CLASS") {
      seed = context.getElementsByClassName(token.matches[1]);
      break;
    }
  }
  
  // 用编译后的匹配函数过滤种子
  return compile(selector)(seed, context);
}
```

对于 `div.container ul li.active`，种子是通过 `getElementsByClassName("active")` 找到的所有有 `active` 类的元素，然后再过滤出标签是 `li` 的。

### 2. 编译时确定匹配顺序

compile 函数生成的匹配器从右向左组织：

```javascript
function matcherFromTokens(tokens) {
  var matchers = [];
  
  // 从右向左遍历 tokens
  for (var i = tokens.length - 1; i >= 0; i--) {
    var token = tokens[i];
    
    if (Expr.relative[token.type]) {
      // 关系符：用 addCombinator 包装
      matchers = [addCombinator(elementMatcher(matchers), token)];
    } else {
      // 普通选择器：添加匹配器
      matchers.push(Expr.filter[token.type](token.matches));
    }
  }
  
  return elementMatcher(matchers);
}
```

### 3. 匹配时向上遍历

匹配一个元素时，从元素本身开始，逐步向上检查祖先：

```javascript
// 简化的匹配逻辑
function matchElement(elem, tokens) {
  var cursor = elem;
  
  // 从右向左遍历 tokens
  for (var i = tokens.length - 1; i >= 0; ) {
    var token = tokens[i];
    
    if (Expr.relative[token.type]) {
      // 关系符：移动 cursor
      cursor = navigateRelative(cursor, token);
      if (!cursor) return false;
      i--;
    } else {
      // 普通选择器：检查 cursor 是否匹配
      if (!matchToken(cursor, token)) {
        return false;
      }
      i--;
    }
  }
  
  return true;  // 所有条件都满足
}

function navigateRelative(elem, combinator) {
  var dir = combinator.dir;  // "parentNode" 或 "previousSibling"
  var first = combinator.first;
  
  while ((elem = elem[dir])) {
    if (elem.nodeType === 1) {
      if (first) return elem;  // 只取第一个
      // 后代/兄弟选择器需要继续搜索
    }
  }
  return null;
}
```

---

## 实例演示

让我们用 `div#main > ul li.item` 这个选择器，在下面的 DOM 结构中查找匹配元素：

```html
<div id="main">
  <ul>
    <li class="item">A</li>
    <li>B</li>
    <li class="item">C</li>
  </ul>
  <ul>
    <li class="item">D</li>
  </ul>
</div>
<div id="sidebar">
  <ul>
    <li class="item">E</li>
  </ul>
</div>
```

**从右向左匹配过程**：

**第 1 步**：找到所有 `li.item`（种子）
- A, C, D, E

**第 2 步**：对每个种子，向上验证

**验证 A**：
- 父元素是 `ul`？✓
- `ul` 的父元素是 `div#main`？✓
- 关系符是 `>`，直接父元素匹配即可
- **A 匹配！**

**验证 C**：
- 父元素是 `ul`？✓
- `ul` 的父元素是 `div#main`？✓
- **C 匹配！**

**验证 D**：
- 父元素是 `ul`？✓
- `ul` 的父元素是 `div#main`？✓
- **D 匹配！**

**验证 E**：
- 父元素是 `ul`？✓
- `ul` 的父元素是 `div#sidebar`？✗（不是 `#main`）
- **E 不匹配**

最终结果：A, C, D

整个过程只检查了 4 个种子元素和它们的祖先链，效率很高。

---

## 关键选择器优化

Sizzle 特别优化了"关键选择器"（最右边的选择器）的处理。

如果关键选择器是 ID、TAG 或 CLASS，可以直接用浏览器原生 API 获取种子：

```javascript
// ID 选择器
document.getElementById("myId")

// TAG 选择器
context.getElementsByTagName("div")

// CLASS 选择器
context.getElementsByClassName("active")
```

这些原生 API 比 Sizzle 自己遍历 DOM 快得多。

---

## 后代选择器的挑战

从右向左匹配在处理后代选择器时有一个挑战：

```javascript
$("div li")  // li 是 div 的任意后代
```

从 `li` 开始向上找，什么时候停止？

答案是：**找到匹配的祖先就停止，或者一直到根节点**。

```javascript
function addCombinator(matcher, combinator) {
  var dir = combinator.dir;
  var first = combinator.first;
  
  if (first) {
    // > 或 +：只检查第一个
    return function(elem) {
      if ((elem = elem[dir]) && elem.nodeType === 1) {
        return matcher(elem);
      }
      return false;
    };
  } else {
    // 空格 或 ~：检查所有
    return function(elem) {
      while ((elem = elem[dir])) {
        if (elem.nodeType === 1 && matcher(elem)) {
          return true;  // 找到匹配的祖先/兄弟
        }
      }
      return false;  // 遍历完也没找到
    };
  }
}
```

对于后代选择器，即使没找到也不会无限循环——最终会到达 `document` 或 `null`。

---

## 性能对比

让我们用一个简单的基准测试感受差距：

```javascript
// 假设页面有 10000 个元素
// 其中 100 个是 li.active
// 其中只有 5 个的祖先链中有 div.container > ul

// 从左向右（假设的低效实现）
function selectLTR(selector) {
  // 找到所有 div.container（假设 200 个）
  // 对每个，找 ul 后代（假设每个下面 10 个 = 2000 个）
  // 对每个 ul，找 li.active 后代
  // 检查 2000 * 平均 50 = 100000 次
}

// 从右向左（Sizzle 的做法）
function selectRTL(selector) {
  // 找到所有 li.active（100 个）
  // 对每个向上验证，平均深度 5 层 = 500 次
}

// 性能差距：100000 / 500 = 200 倍
```

当然这是简化的估算，实际差距取决于 DOM 结构和选择器的具体情况。但从右向左通常会快很多。

---

## 浏览器的优化

现代浏览器的 `querySelectorAll` 也采用类似的从右向左策略。

这也是为什么 Sizzle 优先使用原生 `querySelectorAll`：既快又正确。只有当选择器包含 Sizzle 扩展语法（如 `:eq()`、`:visible` 等）时，才回退到自己的实现。

---

## 写选择器的建议

理解从右向左匹配后，我们可以写出更高效的选择器：

**1. 关键选择器要具体**

```javascript
// 好：关键选择器是 .active-item
$(".container .active-item")

// 差：关键选择器是 *
$(".container *")
```

**2. 避免过度限定**

```javascript
// 好：简洁明了
$(".active-item")

// 差：过度限定，增加匹配开销
$("html body div.container ul li.active-item")
```

**3. 优先使用 ID**

```javascript
// 好：ID 选择器最快
$("#myElement")

// 差：用类选择器找唯一元素
$(".my-unique-element")
```

---

## 本章小结

本章我们深入分析了 Sizzle 的从右向左匹配策略：

- **为什么从右向左**：关键选择器通常最具限制性，从它开始可以最早排除不匹配元素
- **种子元素**：从最右边找到候选元素集合
- **向上验证**：从种子元素向上遍历 DOM 树，检查是否满足所有条件
- **性能优势**：在大型 DOM 树上，从右向左通常比从左向右快几十甚至几百倍
- **选择器优化**：让关键选择器尽量具体

这个策略不仅是 Sizzle 的核心，也是现代浏览器 CSS 引擎的基础。理解它能帮助我们写出更高效的选择器和 CSS 规则。

下一章，我们将深入 Sizzle 的伪类选择器实现，看看 `:first-child`、`:nth-child()` 这些复杂选择器是如何工作的。
