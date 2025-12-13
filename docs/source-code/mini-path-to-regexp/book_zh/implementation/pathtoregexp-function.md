
# 7. 代码生成：`pathToRegexp` 函数实现

在上一章中，我们成功地将路径字符串转换为了一个结构化的 `Token` 数组。现在，我们进入了 `path-to-regexp` 核心流程的第二阶段：代码生成。本章的目标是实现 `pathToRegexp` 函数，它将消费 `Token` 数组，并将其“编译”成一个最终的、可执行的 JavaScript `RegExp` 对象。

`pathToRegexp` 函数实际上是一个包装函数，其核心逻辑位于一个我们称之为 `tokensToRegexp` 的内部函数中。`pathToRegexp` 的工作就是调用 `parse`，然后将其结果传递给 `tokensToRegexp`。

```typescript
// 伪代码
function pathToRegexp(path, keys?, options?) {
  const tokens = parse(path);
  return tokensToRegexp(tokens, keys, options);
}
```

因此，本章的重点是 `tokensToRegexp` 函数的实现。

## 7.1. `tokensToRegexp` 函数的职责

- **输入**: `tokens: Token[]`，`keys?: Key[]` (可选的输出参数)，`options?: Options` (配置对象)。
- **输出**: `RegExp` 对象。

它的核心任务是遍历 `tokens` 数组，根据每个 `Token` 的类型和属性，将其翻译成一小段正则表达式字符串，最后将所有片段拼接起来，并根据 `options` 创建一个 `RegExp` 实例。

```typescript
import { Token, Key } from "./types";

interface Options {
  sensitive?: boolean; // 是否区分大小写
  strict?: boolean;    // 是否严格匹配结尾
  end?: boolean;       // 是否匹配结尾（默认 true）
  delimiter?: string;  // 默认的参数分隔符
}

function tokensToRegexp(tokens: Token[], keys?: Key[], options: Options = {}): RegExp {
  const { sensitive = false, strict = false, end = true, delimiter = "/" } = options;
  let route = "";

  for (const token of tokens) {
    if (typeof token === "string") {
      // 处理静态路径 Token
      route += escapeString(token);
    } else {
      // 处理动态参数 Key Token
      const prefix = escapeString(token.prefix);
      const suffix = escapeString(token.suffix || "");

      if (keys) {
        keys.push(token);
      }

      if (token.pattern) {
        route += `${prefix}(${token.pattern})${suffix}${token.modifier}`;
      } else {
        route += `${prefix}([^${escapeString(delimiter)}]+?)${suffix}${token.modifier}`;
      }
    }
  }

  // ... 处理结尾和创建 RegExp 对象 ...

  return new RegExp(route, sensitive ? "" : "i");
}
```

## 7.2. 遍历与翻译

`tokensToRegexp` 的核心是一个 `for...of` 循环，它遍历 `parse` 函数生成的 `tokens` 数组。

### 处理静态路径 `Token` (`string`)

当 `token` 是一个字符串时，它代表一个静态路径片段。我们需要将其安全地拼接到最终的 `route` 正则表达式字符串中。这里必须要注意，静态路径中可能包含在正则表达式里有特殊意义的字符，如 `.`、`+`、`*` 等。因此，我们必须使用一个辅助函数 `escapeString` 来对这些字符进行转义。

```typescript
function escapeString(str: string): string {
  return str.replace(/[\^$.*+?()[\]{}|]/g, "\\$&");
}

// ... in tokensToRegexp ...
if (typeof token === "string") {
  route += escapeString(token);
}
```

### 处理动态参数 `Token` (`Key`)

当 `token` 是一个 `Key` 对象时，处理过程会稍微复杂一些。我们需要根据 `Key` 对象的属性来构建正则表达式片段。

1.  **填充 `keys` 数组**: 如果调用者传入了 `keys` 数组，我们需要将当前这个 `Key` 对象推入其中。这使得 `pathToRegexp` 的调用者能够获取到所有参数的详细信息。

2.  **处理前缀和后缀**: 与静态路径一样，`prefix` 和 `suffix` 也需要被转义。

3.  **构建捕获组**: 这是最关键的一步。我们需要为参数创建一个捕获组 `(...)`。
    - 如果 `token.pattern` 存在（即用户提供了自定义模式，如 `\d+`），我们直接使用这个 `pattern` 作为捕获组的内容。
    - 如果 `token.pattern` 不存在，我们使用默认的模式。默认模式是 `[^<delimiter>]+?`，其中 `<delimiter>` 是从 `options` 中获取的分隔符（默认为 `/`）。`[^/]+?` 的含义是“匹配一个或多个非斜杠的字符，且使用非贪婪模式”。

4.  **拼接修饰符**: 最后，我们将 `token.modifier` (`?`, `*`, `+`, 或 `""`) 直接拼接到捕获组的后面。

完整的 `else` 分支如下：

```typescript
// ... in tokensToRegexp ...
else {
  const prefix = escapeString(token.prefix || "");
  const suffix = escapeString(token.suffix || "");

  if (keys) {
    keys.push(token);
  }

  if (token.pattern) {
    route += `${prefix}(${token.pattern})${suffix}${token.modifier}`;
  } else {
    // 使用默认 pattern
    route += `${prefix}([^${escapeString(delimiter)}]+?)${suffix}${token.modifier}`;
  }
}
```

## 7.3. 处理路径结尾

当循环结束后，`route` 字符串已经基本构建完毕。但我们还需要根据 `options` 来处理路径的结尾部分，这决定了路由匹配的严格程度。

```typescript
// ... after for loop ...
if (end) {
  if (!strict) route += `(?:${escapeString(delimiter)})?`; // 可选的结尾斜杠
  route = `^${route}$`; // 匹配从头到尾
} else {
  // 如果不要求匹配结尾，则需要处理可选的斜杠，以匹配后续路径
  const endToken = tokens[tokens.length - 1];
  const isEndDelimited = typeof endToken === "string" ? endToken.endsWith(delimiter) : endToken === undefined;
  if (!strict) {
    route += `(?:${escapeString(delimiter)}(?=${route}))?`;
  }
  if (!isEndDelimited) {
    route += `(?=${escapeString(delimiter)}|$)`;
  }
  route = `^${route}`;
}
```

- **`end: true` (默认)**: 这是最常见的情况，我们希望路径能完整匹配。
    - `strict: false` (默认): 我们允许路径末尾有一个可选的斜杠。例如 `/user` 和 `/user/` 都能匹配 `/user` 模式。这是通过添加 `(?:/)?` 实现的。
    - `strict: true`: 我们不允许末尾有可选的斜杠，要求精确匹配。
    - 最终，我们用 `^` 和 `$` 将整个 `route` 包裹起来，强制它从头到尾完整匹配。

- **`end: false`**: 这种情况允许我们匹配一个路径的前缀。例如，用 `/user` 模式去匹配 `/user/123`。这部分的逻辑相对复杂，它使用正向预查 `(?=...)` 来确保路径后面要么是分隔符，要么是字符串结尾，但又不会消耗这些字符。在我们的 `mini-path-to-regexp` 中，可以暂时简化或忽略这部分逻辑，优先实现核心功能。

## 7.4. 创建 `RegExp` 对象

最后一步，我们使用 `new RegExp()` 来创建最终的正则表达式对象。`flags` 参数根据 `options.sensitive` 来决定是否添加 `i`（忽略大小写）标志。

```typescript
return new RegExp(route, sensitive ? "" : "i");
```

至此，`tokensToRegexp` 函数就完成了它的使命。它像一个翻译官，将结构化的 `Token` 数组，精确地翻译成了一个功能强大的 `RegExp` 对象，为后续的路径匹配做好了所有准备。
