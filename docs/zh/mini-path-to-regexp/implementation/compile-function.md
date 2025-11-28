
# 9. 反向生成：`compile` 函数实现

到目前为止，我们所有的努力都集中在如何将一个路径字符串转换成一个正则表达式，以实现“匹配”的功能。然而，`path-to-regexp` 的能力不止于此。它还提供了强大的“反向生成”能力，即根据一个路径模式和给定的参数，生成一个具体的 URL 字符串。这个功能由 `compile` 函数提供。

`compile` 函数在很多场景下都非常有用，例如，在你的应用中生成符合路由规则的链接 `<a>` 标签，或者在测试中为你的路由生成测试用例。

## 9.1. `compile` 函数的签名与职责

- **输入**: `path: string`，即需要编译的路径模式。
- **输出**: `(data?: object) => string`，一个“路径生成函数”。我们通常称之为 `toPath` 函数。

`compile` 函数本身并不直接生成路径，而是返回一个函数。这种高阶函数的设计使得路径的编译（一次性）和路径的生成（多次）得以分离，提高了效率。

```typescript
// 伪代码
function compile(path) {
  const tokens = parse(path);
  const toPath = tokensToFunction(tokens);
  return toPath;
}
```

与 `pathToRegexp` 类似，`compile` 的核心逻辑也委托给了一个内部函数，我们称之为 `tokensToFunction`。

## 9.2. `tokensToFunction` 的实现

`tokensToFunction` 的职责是接收一个 `Token` 数组，并返回一个 `toPath` 函数。这个返回的 `toPath` 函数是一个闭包，它持有着对 `tokens` 数组的引用。

```typescript
import { Token, Key } from "./types";

function tokensToFunction(tokens: Token[]): (data?: object) => string {
  // toPath 函数的实现
  return function toPath(data: object = {}): string {
    let path = "";

    for (const token of tokens) {
      if (typeof token === "string") {
        path += token;
      } else {
        // 处理动态参数 Key
        const value = data[token.name];

        if (value == null) {
          // 如果参数是可选的，则忽略
          if (token.modifier === "?" || token.modifier === "*") {
            continue;
          }
          // 否则，抛出错误
          throw new TypeError(`Expected "${token.name}" to be defined`);
        }

        // ... 参数值的编码与拼接 ...
        path += token.prefix + encodeURIComponent(value);
      }
    }

    return path;
  };
}
```

`tokensToFunction` 的实现惊人地简单。它再次证明了 `Token` 这个中间表示的强大威力。返回的 `toPath` 函数在每次被调用时，都会遍历一遍 `tokens` 数组。

### 遍历与拼接

- **处理静态路径 `Token` (`string`)**: 当 `token` 是一个字符串时，直接将其拼接到 `path` 变量上。

- **处理动态参数 `Token` (`Key`)**: 当 `token` 是一个 `Key` 对象时：
    1.  **获取参数值**: 从用户传入的 `data` 对象中，根据 `token.name` 取出对应的值。
    2.  **处理缺失值**: 
        - 如果参数值 `value` 是 `null` 或 `undefined`，我们需要检查该参数是否是可选的。
        - 如果 `token.modifier` 是 `?` 或 `*`，说明该参数是可选的，我们可以安全地 `continue`，跳过这个 `Token` 的处理。
        - 否则，这是一个必填参数，但用户没有提供值。在这种情况下，我们应该抛出一个 `TypeError`，清晰地告知用户问题所在。
    3.  **编码与拼接**: 获取到参数值后，我们需要对其进行编码，以确保生成的 URL 是合法的。`encodeURIComponent` 是一个标准的选择，它可以对 URI 中具有特殊含义的字符进行编码。然后，我们将 `token.prefix` 和编码后的值拼接到 `path` 上。

## 9.3. 处理重复参数

上面的实现还没有处理修饰符为 `*` 和 `+` 的情况，这两种情况都允许参数重复出现，因此对应的值应该是一个数组。

```typescript
// ... in toPath function, inside the else block ...
const value = data[token.name];

if (Array.isArray(value)) {
  if (token.modifier !== "*" && token.modifier !== "+") {
    throw new TypeError(`Expected "${token.name}" not to be an array`);
  }

  if (value.length === 0) {
    if (token.modifier === "+") {
      throw new TypeError(`Expected "${token.name}" to not be empty`);
    }
    continue;
  }

  const result = value.map(encodeURIComponent).join(token.prefix);
  path += token.prefix + result;
} else {
  // ... 原有的逻辑 ...
  path += token.prefix + encodeURIComponent(value);
}
```

我们需要对 `value` 的类型进行判断：

- **如果 `value` 是一个数组**: 
    - 首先检查 `modifier` 是否为 `*` 或 `+`。如果不是，但用户却提供了数组，这是一个类型错误，应该抛出异常。
    - 如果数组为空，对于 `+`（要求至少一个）是错误的，对于 `*` 则是合法的（直接跳过）。
    - 如果数组不为空，我们使用 `map` 对数组中的每一个元素进行编码，然后使用参数的 `prefix` 作为分隔符，将它们 `join` 起来。例如，对于路径 `/tags/:tag+` 和数据 `{ tag: ["js", "react"] }`，`join` 的结果是 `js/react`，最终生成的路径是 `/tags/js/react`。

- **如果 `value` 不是数组**: 则执行我们之前的单值处理逻辑。

`compile` 函数的实现，再次体现了 `path-to-regexp` 设计的优雅。`parse` 函数产生的 `Token` 数组，不仅可以用于生成正则表达式，还可以被 `tokensToFunction` 用于生成路径构造函数。同一个中间表示，被两个不同的“代码生成器”消费，产生了两种完全不同的输出。这是对“关注点分离”原则的一次完美诠释。
