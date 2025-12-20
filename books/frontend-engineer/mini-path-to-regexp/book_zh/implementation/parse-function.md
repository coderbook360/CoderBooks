
# 6. 核心实现：`parse` 函数源码详解

在本章中，我们将把前面几章的所有理论知识——`PATH_REGEXP` 正则表达式和 `Token` 数据结构——结合起来，完整地实现 `path-to-regexp` 的第一个核心函数：`parse`。`parse` 函数是整个库的基石，它的实现质量直接决定了所有后续功能的成败。

## 6.1. `parse` 函数的签名与职责

首先，让我们明确 `parse` 函数的输入和输出：

- **输入**: `path: string`，即需要解析的路径字符串。
- **输出**: `Token[]`，即解析后得到的 `Token` 数组。

```typescript
import { Token, Key } from "./types"; // 假设类型定义在 types.ts

// 核心的正则表达式，我们在第四章已经详细分析过
const PATH_REGEXP = /.../g;

export function parse(path: string): Token[] {
  const tokens: Token[] = [];
  let key = 0;
  let index = 0;
  let pathOffset = 0;
  let res: RegExpExecArray | null = null;

  // ... 核心循环逻辑 ...

  return tokens;
}
```

在函数内部，我们初始化了几个关键变量：

- `tokens`: 用于存储最终结果的 `Token` 数组。
- `key`: 一个计数器，用于为未命名参数生成数字索引。
- `index`: 记录当前在 `path` 字符串中处理到的位置。
- `pathOffset`: 记录路径的偏移量，用于截取静态路径片段。
- `res`: 用于存储 `PATH_REGEXP.exec(path)` 的匹配结果。

## 6.2. 核心循环：`while` 与 `exec`

`parse` 函数的核心是一个 `while` 循环。在循环中，我们反复执行 `PATH_REGEXP.exec(path)`。由于 `PATH_REGEXP` 带有 `g` 标志，每次调用 `exec` 都会从上一次匹配结束的位置继续向后查找，直到找不到更多匹配项为止。

```typescript
// ... in parse function ...
while ((res = PATH_REGEXP.exec(path)) !== null) {
  const [match, escaped, prefix, name, customPattern, modifier] = res;
  const offset = res.index;

  // 1. 捕获在参数之前的静态路径部分
  if (offset > pathOffset) {
    tokens.push(path.substring(pathOffset, offset));
  }

  // 2. 处理转义字符
  if (escaped) {
    tokens.push(escaped[1]);
    pathOffset = offset + match.length;
    continue;
  }

  // 3. 创建并存储 Key 对象
  const token: Key = {
    name: name || key++,
    prefix: prefix || "",
    suffix: "", // 简化处理，暂不考虑后缀
    pattern: customPattern || "[^\\/]+?",
    modifier: modifier || ""
  };
  tokens.push(token);

  // 4. 更新下一次循环的起始位置
  pathOffset = offset + match.length;
}
// ...
```

让我们一步步解析这个循环内部的逻辑。

### 步骤 1: 捕获静态路径

`res.index` 存储了当前匹配（例如，一个参数 `:id`）在原字符串中的起始位置。`pathOffset` 存储了上一个 `Token` 结束的位置。如果 `res.index > pathOffset`，这说明在两个动态参数之间，或者在字符串开头与第一个参数之间，存在一段静态路径。我们使用 `path.substring(pathOffset, offset)` 来截取这段静态路径，并将其作为一个 `string` 类型的 `Token` 推入 `tokens` 数组。

### 步骤 2: 处理转义字符

`PATH_REGEXP` 的第一个捕获组是 `(\\.)`，它对应 `res` 数组中的 `escaped` 变量。如果 `escaped` 存在，说明我们匹配到了一个转义序列（如 `\(`）。在这种情况下，我们只取被转义的那个字符（`escaped[1]`，即 `(`），将其作为静态文本 `Token` 推入数组。然后，我们更新 `pathOffset` 并使用 `continue` 跳过后续的参数处理逻辑，直接进入下一次循环。

### 步骤 3: 创建 `Key` 对象

如果不是转义字符，那么我们就匹配到了一个参数。`res` 数组的后续元素 `prefix`, `name`, `customPattern`, `modifier` 分别对应了 `PATH_REGEXP` 中用于捕获参数各个部分的捕获组。

我们利用这些捕获到的值来构建一个 `Key` 对象：

- **`name`**: 如果 `name` 捕获组有值，就用它；否则，这是一个未命名参数，我们使用 `key++` 分配一个数字索引作为其名称。
- **`prefix`**: 如果 `prefix` 捕获组有值，就用它；否则，默认为空字符串。
- **`pattern`**: 如果 `customPattern` 捕获组有值（例如 `(\d+)` 中的 `\d+`），就用它；否则，使用默认的匹配模式 `[^\\/]+?`。
- **`modifier`**: 如果 `modifier` 捕获组有值（`?`, `*`, `+`），就用它；否则，默认为空字符串。

构建完成后，我们将这个 `Key` 对象推入 `tokens` 数组。

### 步骤 4: 更新偏移量

最后，我们将 `pathOffset` 更新为当前匹配结束的位置 (`offset + match.length`)，为下一次循环的静态路径捕获做好准备。

## 6.3. 处理尾部的静态路径

当 `while` 循环结束时，意味着路径字符串中再也找不到更多的参数了。但是，从最后一个参数到字符串末尾，可能还有一段静态路径。我们需要处理这种情况。

```typescript
// ... after while loop ...
if (pathOffset < path.length) {
  tokens.push(path.substr(pathOffset));
}

return tokens;
```

这行代码检查 `pathOffset` 是否到达了字符串的末尾。如果没有，它就将从 `pathOffset` 到末尾的所有内容作为最后一个静态路径 `Token` 推入数组。

至此，`parse` 函数的实现就完整了。它通过一个 `while` 循环和一次 `exec` 调用，巧妙地将一个复杂的字符串解析任务分解为一系列简单的、重复的“查找-截取-构造”操作，最终生成了结构清晰、信息完备的 `Token` 数组。这个函数是 `path-to-regexp` 优雅设计的核心体现。
