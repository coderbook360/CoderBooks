# 编译缓存与性能优化

前面的章节我们多次提到"缓存"。本章我们系统地分析 Sizzle 的缓存机制，以及它背后的性能优化思想。

缓存是 Sizzle 性能优化的核心策略之一。通过缓存词法分析和编译结果，Sizzle 避免了重复的解析和编译开销。

---

## 为什么需要缓存？

思考一个常见场景：

```javascript
// 事件处理函数，可能被调用很多次
function handleClick() {
  $(".item.active").addClass("clicked");
}
```

每次调用 `$(".item.active")`，都需要：
1. 解析选择器字符串（tokenize）
2. 编译成匹配函数（compile）
3. 执行查询

前两步的输出只取决于选择器字符串，与 DOM 状态无关。如果同一个选择器被反复使用，重复解析和编译就是浪费。

**缓存的思想**：相同的输入产生相同的输出，记住结果，下次直接用。

---

## createCache：LRU 缓存工厂

Sizzle 的缓存实现非常精巧。核心是 `createCache` 函数：

```javascript
function createCache() {
  var keys = [];
  
  function cache(key, value) {
    // 检查缓存大小，超限则淘汰最旧的
    if (keys.push(key) > 50) {  // 默认最大 50 条
      delete cache[keys.shift()];
    }
    
    // 存入缓存
    return (cache[key] = value);
  }
  
  return cache;
}
```

这是一个简化的 **LRU（Least Recently Used）** 缓存：

- 用数组 `keys` 记录插入顺序
- 新条目追加到数组末尾
- 超过容量时，删除数组开头的条目（最早插入的）

返回的 `cache` 既是函数（用于存入），又是对象（用于读取）。

```javascript
var tokenCache = createCache();

// 存入缓存
tokenCache("div.active", tokens);

// 读取缓存
var cached = tokenCache["div.active"];
```

---

## 词法缓存：tokenCache

tokenize 的结果被缓存：

```javascript
var tokenCache = createCache();

function tokenize(selector) {
  // 先查缓存
  var cached = tokenCache[selector];
  if (cached) {
    return cached;
  }
  
  // 缓存未命中，执行词法分析
  var tokens = [];
  // ... 词法分析逻辑 ...
  
  // 存入缓存并返回
  return tokenCache(selector, tokens);
}
```

缓存键是选择器字符串，值是 Token 数组。

**为什么可以缓存？**

tokenize 是纯函数：相同的输入（选择器字符串）总是产生相同的输出（Token 数组）。没有副作用，没有外部依赖。

---

## 编译缓存：compilerCache

compile 的结果也被缓存：

```javascript
var compilerCache = createCache();

function compile(selector) {
  var cached = compilerCache[selector];
  if (cached) {
    return cached;
  }
  
  // 缓存未命中，执行编译
  var tokens = tokenize(selector);
  var superMatcher = matcherFromTokens(tokens);
  
  // 存入缓存并返回
  return compilerCache(selector, superMatcher);
}
```

编译后的匹配函数是闭包，它"记住"了选择器的所有条件。缓存这个闭包，后续使用时直接调用，跳过所有解析和编译步骤。

---

## 缓存效果分析

让我们量化一下缓存的效果：

```javascript
// 无缓存场景
function selectWithoutCache(selector) {
  var tokens = tokenize(selector);     // 每次都执行
  var matcher = compile(tokens);       // 每次都执行
  return matcher(context);
}

// 有缓存场景
function selectWithCache(selector) {
  var matcher = compilerCache[selector];
  if (!matcher) {
    var tokens = tokenCache[selector] || tokenize(selector);
    matcher = compile(tokens);
  }
  return matcher(context);
}
```

假设选择器 `.item.active` 被调用 1000 次：

| 场景 | tokenize 次数 | compile 次数 |
|------|--------------|-------------|
| 无缓存 | 1000 | 1000 |
| 有缓存 | 1 | 1 |

性能差距可能是几十甚至上百倍。

---

## 缓存容量的权衡

createCache 默认容量是 50 条。为什么是这个数字？

**太小**：缓存命中率低，频繁淘汰
**太大**：占用更多内存，查找可能变慢

50 是一个经验值。大多数页面不会同时使用超过 50 个不同的选择器。如果超过了，说明可能存在动态生成选择器的情况：

```javascript
// 糟糕的做法：动态生成选择器
for (var i = 0; i < 1000; i++) {
  $(".item-" + i).addClass("processed");
}
// 这会生成 1000 个不同的选择器，缓存不断被淘汰
```

**更好的做法**：

```javascript
$(".item").each(function(i) {
  if ($(this).hasClass("item-" + i)) {
    $(this).addClass("processed");
  }
});
```

---

## 运行时缓存 vs 编译时缓存

Sizzle 的缓存是"运行时缓存"：首次使用时解析和编译，结果存入缓存，后续复用。

另一种方式是"编译时缓存"：在构建阶段预处理所有选择器。

```javascript
// 构建时生成
var selectors = {
  ".item.active": precompiledMatcher1,
  "div > ul li": precompiledMatcher2,
  // ...
};
```

这种方式更激进，但实现复杂，且失去了动态选择器的灵活性。Sizzle 选择运行时缓存是务实的权衡。

---

## 缓存失效的情况

Sizzle 的缓存什么时候会失效？

**1. 容量淘汰**：超过 50 条时，最早的条目被删除

**2. 页面刷新**：缓存存在内存中，刷新后丢失

**3. 不同的 Sizzle 实例**：如果页面加载了多个 jQuery 版本，每个有自己的缓存

注意：**DOM 变化不会导致缓存失效**。

```javascript
// 首次调用，缓存编译结果
$("li.active");

// 动态添加一个 li.active
$("<li class='active'>").appendTo("ul");

// 再次调用，使用缓存的编译结果
$("li.active");  // 会正确找到新添加的元素
```

编译结果是匹配函数，不是查询结果。DOM 变化后再执行匹配函数，会匹配到新的元素。

---

## 其他性能优化技术

除了缓存，Sizzle 还使用了多种性能优化技术：

### 1. 快速路径

对简单选择器使用专用 API：

```javascript
// ID 选择器
if (/^#[\w-]+$/.test(selector)) {
  return [document.getElementById(selector.slice(1))];
}

// 标签选择器
if (/^\w+$/.test(selector)) {
  return context.getElementsByTagName(selector);
}

// 类选择器
if (/^\.[\w-]+$/.test(selector)) {
  return context.getElementsByClassName(selector.slice(1));
}
```

这些路径跳过所有解析和编译，直接调用原生 API。

### 2. 延迟编译

只有在真正需要匹配时才编译：

```javascript
function Sizzle(selector, context) {
  // 先尝试原生 API
  if (canUseQuerySelectorAll(selector)) {
    return context.querySelectorAll(selector);
  }
  
  // 原生 API 不可用，才编译
  return compile(selector)(context);
}
```

如果原生 API 能处理，就不编译。

### 3. 种子优化

从最具限制性的部分开始查找：

```javascript
// "div.container > ul li.active"
// 从 li.active 开始找种子，而不是 div.container
```

这减少了初始候选集的大小。

### 4. 短路求值

一旦确定不匹配，立即返回：

```javascript
function elementMatcher(matchers) {
  return function(elem) {
    for (var i = 0; i < matchers.length; i++) {
      if (!matchers[i](elem)) {
        return false;  // 短路，不再检查后续匹配器
      }
    }
    return true;
  };
}
```

---

## 缓存调试

如何观察 Sizzle 的缓存状态？

```javascript
// 访问内部缓存（非公开 API，仅用于调试）
console.log(Object.keys(jQuery.expr.cacheLength));

// 或者通过 Sizzle 暴露的接口
console.log(Sizzle.selectors.cacheLength);
```

也可以添加一些日志：

```javascript
// 在开发环境中监控缓存
var originalCompile = Sizzle.compile;
Sizzle.compile = function(selector) {
  console.log("Compiling:", selector);
  return originalCompile.apply(this, arguments);
};
```

如果看到同一个选择器被多次编译，说明缓存可能已满或有问题。

---

## 设计启示

从 Sizzle 的缓存机制中，我们可以学到：

### 1. 识别纯函数

纯函数的结果可以安全缓存。识别代码中的纯函数是应用缓存优化的第一步。

### 2. LRU 是好的默认策略

LRU 简单且在大多数场景下表现良好。除非有特殊需求，否则可以作为缓存淘汰的首选策略。

### 3. 固定容量避免内存泄漏

无限增长的缓存是潜在的内存泄漏。固定容量 + 淘汰策略是安全的选择。

### 4. 缓存粒度的选择

Sizzle 选择缓存整个编译结果，而不是中间步骤。粒度太细会增加管理开销，粒度太粗会降低复用率。

### 5. 对用户透明

缓存是内部优化，用户无需关心。API 保持简洁，性能提升自动生效。

---

## 实践建议

基于对 Sizzle 缓存的理解，我们可以：

### 1. 复用选择器字符串

```javascript
// 差：每次构造新字符串
function getItems(type) {
  return $(".item-" + type);
}

// 好：缓存选择器字符串
var selectors = {
  typeA: ".item-a",
  typeB: ".item-b"
};
function getItems(type) {
  return $(selectors[type]);
}
```

### 2. 避免动态选择器

```javascript
// 差：无法利用缓存
for (var i = 0; i < 100; i++) {
  $("[data-id='" + i + "']").show();
}

// 好：用其他方式过滤
$("[data-id]").each(function() {
  if (parseInt(this.dataset.id) < 100) {
    $(this).show();
  }
});
```

### 3. 关注选择器多样性

如果页面使用了大量不同的选择器（超过 50 个），考虑：
- 简化选择器
- 使用 ID 和类选择器
- 缓存 jQuery 对象而不是重复查询

---

## 本章小结

本章我们深入分析了 Sizzle 的缓存机制：

- **createCache**：LRU 缓存工厂，容量 50，FIFO 淘汰
- **tokenCache**：缓存词法分析结果
- **compilerCache**：缓存编译后的匹配函数
- **缓存效果**：避免重复解析和编译，性能提升可达数十倍
- **其他优化**：快速路径、延迟编译、种子优化、短路求值

缓存是一种通用的优化策略。理解 Sizzle 的缓存设计，可以帮助我们在自己的代码中更好地应用类似技术。

下一章，我们将探讨如何扩展 Sizzle，添加自定义选择器。
