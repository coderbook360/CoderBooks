
# 11. 错误处理：构建健壮的解析与匹配机制

在我们的 `mini-path-to-regexp` 实现之旅即将结束之际，我们来讨论一个至关重要、但在功能开发中常常被置于次要位置的话题：错误处理。一个健壮的库，不仅能在“阳光大道”上正常工作，更能在面对各种非法输入和异常情况时，提供清晰、可预测的行为，并给出有意义的错误提示。本章将为我们的库构建一套优雅的错误处理机制。

## 11.1. 错误分类：何时会出错？

在 `path-to-regexp` 的整个生命周期中，错误主要发生在两个阶段：

1.  **解析时错误 (Parse-time Errors)**: 当用户提供了一个语法不正确的路径字符串时，`parse` 函数应该立即失败并抛出错误。这是最常见的错误类型。
2.  **运行时错误 (Run-time Errors)**: 当 `compile` 生成的 `toPath` 函数被调用时，如果传入的 `data` 对象不符合路径模式的要求（例如缺少必填参数），此时应该抛出错误。

值得注意的是，`match` 函数在匹配失败时，并不会抛出错误，而是返回 `false`。这是一个重要的设计决策，因为它将“不匹配”视为一种正常的、预期的程序分支，而不是一个需要中断程序的“错误”。

## 11.2. 解析时错误处理

解析时错误主要由 `parse` 函数负责捕获。我们需要在 `parse` 的实现中加入校验逻辑。

### 11.2.1. 未闭合的括号

一个常见的路径语法错误是括号没有正确闭合，例如 `/user/:id(\d+`。在 `path-to-regexp` 的官方实现中，`parse` 函数会维护一个计数器来追踪括号的嵌套层级。在我们的简化版中，可以在 `parse` 函数的末尾添加一个简单的检查来捕获最常见的未闭合情况。

一个更健壮的方法是在 `PATH_REGEXP` 中处理。我们之前使用的 `PATH_REGEXP` 已经很强大，但为了更精确地捕获错误，官方实现实际上使用了更复杂的正则表达式，并配合循环进行解析。在我们的 `mini-path-to-regexp` 中，我们可以通过在 `parse` 函数的最后，检查路径字符串中是否还有未处理的 `(` 来模拟这个检查。

```typescript
// Simplified check in parse function
// ... after while loop
if (pathOffset < path.length) {
  // Check for unclosed parentheses in the remaining path
  if (path.substr(pathOffset).includes("(")) {
    throw new TypeError(`Unclosed group in path "${path}"`);
  }
  tokens.push(path.substr(pathOffset));
}
```

### 11.2.2. 非法转义

`parse` 函数也应该处理非法的转义序列。例如，如果路径是 `/a\`，反斜杠在字符串末尾，没有转义任何字符。这同样应该被视为一个语法错误。

## 11.3. 运行时错误处理

运行时错误主要发生在 `compile` 生成的 `toPath` 函数中。

```typescript
// In tokensToFunction's returned toPath function
function toPath(data: object = {}): string {
  let path = "";
  for (const token of tokens) {
    if (typeof token === "string") {
      path += token;
      continue;
    }

    const value = data[token.name];

    if (value == null) {
      if (token.modifier === "?" || token.modifier === "*") {
        continue;
      }
      // 关键：为必填参数抛出错误
      throw new TypeError(`Expected "${token.name}" to be defined for path "${originalPath}"`);
    }
    
    // ... (Array handling)

    path += token.prefix + encodeURIComponent(value);
  }
  return path;
}
```

我们在第九章的实现中已经包含了这部分逻辑。这里的核心是：

- 当一个参数的值为 `null` 或 `undefined` 时，检查其 `modifier`。
- 如果是可选的 (`?` 或 `*`)，则安全跳过。
- 如果是必填的（`modifier` 为 `""` 或 `+`），则必须抛出一个 `TypeError`。

抛出的错误信息应该尽可能地友好和具体，例如 `Expected "id" to be defined`，而不是一个模糊的“参数错误”。这能极大地帮助开发者快速定位问题。

### 11.3.1. 对重复参数的校验

我们还需要对期望数组的参数 (`*`, `+`) 和不期望数组的参数进行校验。

```typescript
// ... in toPath function ...
if (Array.isArray(value)) {
  if (token.modifier !== "*" && token.modifier !== "+") {
    throw new TypeError(`Expected "${token.name}" not to be an array`);
  }
  // ...
} else if (token.modifier === "*" || token.modifier === "+") {
  // 如果期望数组但提供了非数组，为了健壮性，可以将其视为单个元素的数组
  // 或者根据严格模式抛出错误
  const arrayValue = [value];
  // ... (process as array)
}
```

## 11.4. 实践：使用 `try...catch`

作为库的使用者，我们应该始终将对 `path-to-regexp` 的调用（尤其是 `compile` 和 `toPath`）包裹在 `try...catch` 块中，以优雅地处理可能发生的错误，避免程序崩溃。

```javascript
import { compile } from "./mini-path-to-regexp";

// 捕获解析时错误
try {
  compile("/user/:id("); // Unclosed group
} catch (e) {
  console.error(`[Parse Error]: ${e.message}`);
}

// 捕获运行时错误
const toUserPath = compile("/user/:id");
try {
  toUserPath({}); // Missing required parameter 'id'
} catch (e) {
  console.error(`[Runtime Error]: ${e.message}`);
}
```

---

通过为 `parse` 和 `compile` 添加健壮的错误处理逻辑，我们的 `mini-path-to-regexp` 库才算真正地从一个“玩具”项目，成长为了一个具备基本生产级质量的工具。它不仅知道如何做对事情，更知道如何在事情出错时优雅地失败。

至此，我们已经完整地走过了 `path-to-regexp` 的核心实现之旅。希望你享受这个过程，并从中获得了深入理解一个基础库的乐趣与洞见。
