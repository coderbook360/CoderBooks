# Sizzle架构与设计理念

Sizzle是jQuery的选择器引擎——当你写 `$('div.active > p')` 时，背后就是Sizzle在工作。

这不是一个简单的字符串匹配。Sizzle实现了一个完整的CSS选择器解析器和匹配引擎，涉及词法分析、语法编译、优化策略等编译原理概念。

本章我们先建立对Sizzle的整体认知。

## 选择器引擎的职责

首先要问一个问题：选择器引擎需要做什么？

输入：一个CSS选择器字符串，如 `div.active > p:first-child`

输出：匹配的DOM元素数组

看起来简单，但实际处理非常复杂：

1. **解析选择器**：将字符串分解为有意义的部分
2. **理解语义**：识别标签、类、ID、属性、伪类等
3. **构建匹配逻辑**：将选择器转换为可执行的匹配函数
4. **高效查找**：在DOM树中快速找到匹配元素
5. **正确排序**：结果按文档顺序排列

## Sizzle的历史地位

在 `querySelectorAll` 出现之前，浏览器没有原生的CSS选择器API。Sizzle填补了这个空白。

Sizzle的设计影响深远：
- 定义了JavaScript选择器引擎的标准实现方式
- 其优化策略被后来的浏览器原生实现借鉴
- 至今仍是最完整的纯JavaScript选择器引擎

虽然现代浏览器都支持 `querySelectorAll`，但Sizzle仍然有价值：
- 支持jQuery特有的伪类选择器（`:visible`、`:contains` 等）
- 提供一致的跨浏览器行为
- 可作为 `querySelectorAll` 的降级方案

## Sizzle的核心流程

Sizzle处理选择器的流程如下：

```
选择器字符串
    ↓
┌──────────────┐
│   tokenize   │  词法分析：拆分为token
└──────────────┘
    ↓
┌──────────────┐
│   compile    │  编译：生成匹配函数
└──────────────┘
    ↓
┌──────────────┐
│   select     │  执行：查找匹配元素
└──────────────┘
    ↓
匹配的元素数组
```

**1. tokenize（词法分析）**

将选择器字符串拆分为token序列：

```javascript
"div.active > p"
    ↓
[
    { type: "TAG", value: "div" },
    { type: "CLASS", value: "active" },
    { type: ">", value: ">" },
    { type: "TAG", value: "p" }
]
```

**2. compile（编译）**

将token序列编译为高效的匹配函数：

```javascript
tokens → function(elem) { /* 返回是否匹配 */ }
```

这个匹配函数会被缓存，相同选择器重复使用时直接取缓存。

**3. select（执行）**

使用匹配函数在DOM中查找元素：

```javascript
// 找到候选元素
var candidates = context.getElementsByTagName('p');

// 用匹配函数过滤
var results = [];
for (var i = 0; i < candidates.length; i++) {
    if (matcher(candidates[i])) {
        results.push(candidates[i]);
    }
}
```

## 核心数据结构

**Token对象**

```javascript
{
    type: "CLASS",      // 类型：TAG、ID、CLASS、ATTR、PSEUDO等
    value: ".active",   // 原始字符串
    matches: ["active"] // 提取的值
}
```

**Token组**

复合选择器用逗号分隔多个选择器，每个选择器是一个token组：

```javascript
"div.a, span.b"
→ [
    [/* div.a 的tokens */],
    [/* span.b 的tokens */]
]
```

**Expr对象**

存储各种选择器的解析规则和匹配函数：

```javascript
Expr = {
    match: {
        ID: /^#([\w-]+)/,
        CLASS: /^\.([\w-]+)/,
        TAG: /^([\w*-]+)/,
        // ...
    },
    filter: {
        ID: function(id) {
            return function(elem) {
                return elem.id === id;
            };
        },
        CLASS: function(className) {
            return function(elem) {
                return elem.classList.contains(className);
            };
        },
        // ...
    },
    // ...
};
```

## 从右向左匹配

Sizzle的一个关键优化是**从右向左匹配**。

考虑选择器 `#container div.item p`：

**从左向右**（直觉方式）：
1. 找到 `#container`
2. 在其中找所有 `div.item`
3. 在每个 `div.item` 中找 `p`

**从右向左**（Sizzle方式）：
1. 找到所有 `p`
2. 检查每个 `p` 的祖先是否有 `div.item`
3. 检查该 `div.item` 的祖先是否有 `#container`

为什么从右向左更快？

- DOM中 `p` 元素数量有限
- 向上查找祖先是 O(depth) 操作
- 从左向右需要递归搜索所有后代，可能是 O(n) 操作

当然，这不是绝对的。Sizzle会根据选择器结构选择最优策略。

## 编译缓存

编译选择器有开销。Sizzle使用缓存避免重复编译：

```javascript
// 简化的缓存结构
var compilerCache = {};

function compile(selector) {
    if (compilerCache[selector]) {
        return compilerCache[selector];
    }
    
    var matcher = /* 编译过程 */;
    compilerCache[selector] = matcher;
    return matcher;
}
```

同一个选择器第一次编译，后续直接使用缓存的匹配函数。这对于重复查询的场景（如事件委托）非常重要。

## querySelectorAll优先

现代浏览器的 `querySelectorAll` 是原生实现，比JavaScript快得多。

Sizzle的策略是：**尽可能使用原生API**。

```javascript
// Sizzle入口简化逻辑
function Sizzle(selector, context) {
    // 尝试使用原生API
    try {
        return context.querySelectorAll(selector);
    } catch (e) {
        // 不支持的选择器，使用Sizzle引擎
        return sizzleSelect(selector, context);
    }
}
```

只有当选择器包含jQuery特有的伪类（如 `:visible`）时，才使用Sizzle自己的引擎。

## 源码结构

Sizzle的主要组成部分：

```
Sizzle
├── 正则表达式（选择器模式匹配）
├── Expr对象（选择器定义）
│   ├── match（匹配正则）
│   ├── filter（过滤函数）
│   ├── preFilter（预处理函数）
│   ├── relative（关系选择器）
│   └── pseudos（伪类选择器）
├── tokenize（词法分析）
├── compile（编译器）
├── select（执行器）
├── matcherFromTokens（从tokens生成matcher）
├── matcherFromGroupMatchers（组合多个matcher）
└── setDocument（设置文档上下文）
```

## 学习路线

接下来的章节将按以下顺序深入：

1. **tokenize**：词法分析如何将字符串拆分为tokens
2. **compile**：如何将tokens编译为匹配函数
3. **matching**：从右向左匹配的具体实现
4. **pseudo**：伪类选择器的实现
5. **native-fallback**：与原生API的配合策略
6. **caching**：缓存机制和性能优化
7. **custom-selectors**：如何扩展自定义选择器

## 小结

本章建立了Sizzle的整体认知：

**核心职责**
- 解析CSS选择器
- 在DOM中查找匹配元素

**处理流程**
- tokenize：词法分析
- compile：编译为匹配函数
- select：执行查找

**关键优化**
- 从右向左匹配
- 编译缓存
- 优先使用原生API

**设计价值**
- 完整的选择器引擎实现
- 编译原理的实际应用
- 性能优化的典型案例

下一章，我们将深入 tokenize，看看选择器字符串是如何被拆分的。
