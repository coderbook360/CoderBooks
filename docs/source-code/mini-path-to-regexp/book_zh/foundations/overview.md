
# 1. 概览：API 与核心流程

欢迎来到 `path-to-regexp` 的世界。在本章中，我们将从最高层次鸟瞰这个强大的工具，理解它的核心价值、关键 API 以及内部的主要工作流程。本章的目标不是深入细节，而是为你建立一个清晰的宏观认知，为后续的源码探索之旅打下坚实的基础。

## 1.1. 问题引入：为什么需要路径匹配？

想象一下你正在使用 Express.js 构建一个后端服务，或者使用 Vue Router 构建一个单页应用。你的核心任务之一就是定义路由规则。例如：

- 当用户访问 `/users` 时，显示用户列表。
- 当用户访问 `/users/123` 时，显示 ID 为 `123` 的用户详情。
- 当用户访问 `/posts/tech/my-first-post` 时，显示技术分类下名为 `my-first-post` 的文章。

这些路径中，有些是静态的（如 `/users`），有些是动态的（如 `/users/123`）。对于动态路径，我们通常会定义一个包含“占位符”的路径模式，如 `/users/:id`。当一个新的 URL 请求到达时，路由系统需要做两件事：

1.  **判断** 该 URL 是否符合我们定义的某个模式。
2.  如果符合，**提取** 出路径中的动态参数（如 `123`）。

如果只用原生的 JavaScript 字符串方法（如 `split` 或 `indexOf`）来处理这些需求，代码会变得异常复杂和脆弱，尤其是在处理可选参数、重复参数或更复杂的匹配规则时。我们需要一个标准化的、健壮的、经过充分测试的工具来专门解决这个问题。这，就是 `path-to-regexp` 存在的意义。

## 1.2. `path-to-regexp` 登场：核心 API 概览

`path-to-regexp` 提供了几个核心函数，它们共同构成了其强大的功能。让我们来快速认识一下它们。

### `pathToRegexp(path, keys?, options?)`

这是最核心、最底层的函数。它的作用非常纯粹：将一个路径字符串，转换成一个标准的 JavaScript 正则表达式（`RegExp`）对象。

- **`path`**: 你想要转换的路径模式，例如 `/user/:id`。
- **`keys`**: 一个可选的数组，它是一个“输出参数”。在转换过程中，函数会把从路径中解析出的参数信息（比如 `id`）填充到这个数组里。
- **`options`**: 一个可选的配置对象，可以微调生成的正则表达式的行为，例如是否区分大小写、是否严格匹配结尾等。我们将在后续章节深入探讨。

**示例：**

```javascript
import { pathToRegexp } from "path-to-regexp";

const keys = [];
const regexp = pathToRegexp("/user/:id", keys);
// regexp: /^\/user\/([^\/]+?)\/?$/i
// keys: [{ name: 'id', ... }]

console.log(regexp.exec("/user/123"));
// ["/user/123", "123", index: 0, ...]
```

### `compile(path, options?)`

`compile` 函数执行的是与 `pathToRegexp` 相反的操作。它接收一个路径模式，并返回一个“路径生成函数”。这个生成函数可以接收一个参数对象，并返回一个填充好参数的 URL 字符串。

**示例：**

```javascript
import { compile } from "path-to-regexp";

const toPath = compile("/user/:id");
const url = toPath({ id: 123 });

console.log(url); // -> "/user/123"
```

### `match(path, options?)`

`match` 是一个更高级、更便捷的封装。它接收一个路径模式，并返回一个“匹配函数”。这个匹配函数可以直接接收一个 URL 字符串，并返回一个结构化的匹配结果对象，或者在不匹配时返回 `false`。

**示例：**

```javascript
import { match } from "path-to-regexp";

const matcher = match("/user/:id");
const result = matcher("/user/123");

console.log(result);
// -> { path: "/user/123", index: 0, params: { id: "123" } }

console.log(matcher("/about")); // -> false
```

如你所见，`match` 函数的结果对象直接包含了格式化好的 `params`，比手动调用 `regexp.exec()` 要方便得多。

## 1.3. 核心工作流程串讲

现在，让我们将这些 API 串联起来，看看 `path-to-regexp` 内部的完整工作流程是怎样的。这个流程是典型的“微型编译器”思想的体现，它将一个高级语言（路径字符串）编译成一个低级语言（正则表达式）。

我们可以用下面这张流程图来清晰地展示这个过程：

```mermaid
graph TD
    A[路径字符串 /user/:id(\d+)] --> B{词法分析 Parse};
    B --> C[Token 列表];
    C --> D{pathToRegexp};
    D --> E[正则表达式 /\/user\/(\d+)/i];
    C --> F{compile};
    F --> G[路径生成函数 toPath(params)];
    E --> H{match};
    H --> I[匹配结果对象];
```

1.  **输入**: 这一切都始于一个我们定义的路径字符串，例如 `/user/:id(\d+)`。
2.  **解析 (Parse)**: `path-to-regexp` 内部的第一个关键步骤是“词法分析”。一个名为 `parse` 的函数会扫描输入的字符串，并将其分解成一个结构化的、计算机更容易理解的中间表示——我们称之为 `Token` 的列表。例如，`/user/:id(\d+)` 会被解析成类似 `["/user", { name: "id", pattern: "\\d+" }]` 这样的 `Token` 数组。
3.  **正则生成 (RegExp Generation)**: `pathToRegexp` 函数的核心部分会遍历这个 `Token` 列表，根据每个 `Token` 的类型和属性，将它们“翻译”并拼接成最终的正则表达式字符串，然后创建一个 `RegExp` 对象。
4.  **编译 (Compile)**: `compile` 函数同样消费 `Token` 列表，但它的目标不同。它生成的是一个 JavaScript 函数，这个函数知道如何根据 `Token` 的信息，将用户传入的参数填充到正确的位置。
5.  **匹配 (Match)**: `match` 函数则是一个集大成者。它内部调用 `pathToRegexp` 生成正则，然后用该正则去匹配给定的 URL，并利用 `Token` 列表中的信息来格式化最终的 `params` 对象，返回一个友好的结果。

在本章中，你只需要对这个流程有一个宏观的印象。在后续的章节中，我们将亲手实现 `parse`、`pathToRegexp`、`compile` 和 `match` 的每一个细节。现在，让我们准备好，深入探索 `path-to-regexp` 的语法世界吧！
