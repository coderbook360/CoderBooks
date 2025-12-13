
# 10. 高级封装：`match` 函数实现详解

我们已经分别实现了 `pathToRegexp`（用于匹配）和 `compile`（用于生成路径）。然而，在日常使用中，直接操作 `pathToRegexp` 返回的正则表达式并从中提取参数，还是稍显繁琐。开发者需要手动调用 `regexp.exec()`，然后根据 `keys` 数组去匹配结果数组中的值，才能得到一个结构化的参数对象。

为了提供更友好的开发体验，`path-to-regexp` 提供了一个更高级的封装——`match` 函数。它将匹配和参数提取的过程打包成一个简单的函数调用，极大地简化了使用。

## 10.1. `match` 函数的签名与职责

- **输入**: `path: string`，即需要匹配的路径模式。
- **输出**: `(pathname: string) => MatchResult | false`，一个“匹配函数”。我们称之为 `matchFn`。

`match` 函数本身也返回一个函数。这个 `matchFn` 接收一个具体的 URL `pathname`，如果匹配成功，则返回一个包含详细匹配信息的 `MatchResult` 对象；如果匹配失败，则返回 `false`。

一个 `MatchResult` 对象通常包含：

- `path`: 匹配到的完整路径。
- `index`: 匹配开始的位置。
- `params`: 一个键值对对象，包含了所有提取出的动态参数。

```typescript
// 伪代码
function match(path, options) {
  const tokens = parse(path);
  const regexp = tokensToRegexp(tokens, undefined, options);

  // matchFn 的实现
  return function matchFn(pathname) {
    const m = regexp.exec(pathname);

    if (!m) {
      return false;
    }

    // ... 构造 params 对象 ...

    return { path: m[0], index: m.index, params };
  };
}
```

## 10.2. `matchFn` 的实现

`matchFn` 的核心是调用我们已经实现的 `tokensToRegexp` 生成的正则表达式，并对 `exec` 的结果进行处理，将其转换为一个友好的 `params` 对象。

为了构造 `params` 对象，`matchFn` 需要知道每个捕获组对应的参数名是什么。这意味着，`matchFn` 需要访问 `parse` 函数生成的 `tokens` 数组（或者更准确地说，是 `tokens` 数组中的 `Key` 对象）。因此，`match` 函数需要先调用 `parse`，并将 `tokens` 传递给 `matchFn` 闭包。

```typescript
import { parse, tokensToRegexp, Key } from "./internal";

interface MatchResult {
  path: string;
  index: number;
  params: Record<string, any>;
}

function match(path: string, options = {}) {
  const keys: Key[] = [];
  const regexp = tokensToRegexp(parse(path), keys, options);

  return function matchFn(pathname: string): MatchResult | false {
    const m = regexp.exec(pathname);

    if (!m) {
      return false;
    }

    const { 0: path, index } = m;
    const params: Record<string, any> = {};

    for (let i = 1; i < m.length; i++) {
      const key = keys[i - 1];
      const value = m[i];

      if (value !== undefined) {
        if (key.modifier === "*" || key.modifier === "+") {
          params[key.name] = value.split(key.prefix).map(decodeURIComponent);
        } else {
          params[key.name] = decodeURIComponent(value);
        }
      }
    }

    return { path, index, params };
  };
}
```

让我们来分解 `matchFn` 的实现：

1.  **获取 `keys` 数组**: 在 `match` 函数的顶层，我们定义一个 `keys` 数组，并将其作为“输出参数”传递给 `tokensToRegexp`。这样，当 `tokensToRegexp` 执行完毕后，`keys` 数组中就包含了路径模式中所有动态参数的 `Key` 对象，并且其顺序与正则表达式中的捕获组顺序完全一致。

2.  **执行匹配**: `matchFn` 内部首先执行 `regexp.exec(pathname)`。如果返回 `null`（`!m`），说明不匹配，直接返回 `false`。

3.  **初始化 `params` 对象**: 如果匹配成功，我们从匹配结果 `m` 中解构出第一个元素（即匹配到的完整路径 `path`）和 `index`。然后初始化一个空的 `params` 对象。

4.  **遍历与填充 `params`**: 这是最核心的一步。我们从 `i = 1` 开始遍历匹配结果数组 `m`（因为 `m[0]` 是完整匹配，捕获组从 `m[1]` 开始）。
    - 对于每一个匹配到的值 `m[i]`，我们从 `keys` 数组中取出其对应的 `Key` 对象 `keys[i - 1]`。
    - 我们检查 `value` 是否为 `undefined`。如果一个可选参数没有出现，其捕获组的值会是 `undefined`，我们直接忽略它。
    - **处理重复参数**: 如果 `key.modifier` 是 `*` 或 `+`，说明这个参数可以有多个值。`path-to-regexp` 的正则是通过重复捕获组来捕获这些值的，但 `exec` 的结果只会保留最后一个捕获。一个更完整的实现会处理这种情况，但一个简化的 `path-to-regexp` 版本可能会将多个值拼接成一个由分隔符（`key.prefix`）连接的字符串。然后我们用 `split` 将其还原成数组，并对每个元素进行 `decodeURIComponent`。
    - **处理单值参数**: 对于普通参数，我们直接对 `value` 进行 `decodeURIComponent` 解码，然后以 `key.name` 为键，存入 `params` 对象。

5.  **返回结果**: 最后，返回包含 `path`, `index`, `params` 的 `MatchResult` 对象。

## 10.3. `match` 函数的“双重身份”

`path-to-regexp` 的 `match` 函数还有一个非常巧妙的设计。它返回的 `matchFn` 函数，自身还附带了一个 `path` 属性，这个属性就是 `compile` 函数生成的 `toPath` 函数！

```typescript
// ... in match function ...
const toPath = tokensToFunction(tokens);
const matchFn = function(...) { ... };
matchFn.path = toPath;
return matchFn;
```

这意味着，当你调用 `const matcher = match("/user/:id")` 时，你得到的 `matcher` 不仅可以用来匹配路径 (`matcher("/user/123")`)，还可以用来生成路径 (`matcher.path({ id: 123 })`)！

这个设计将“匹配”和“生成”这两个高度相关的操作，优雅地聚合在同一个返回值上，为开发者提供了极大的便利。它完美地体现了 `path-to-regexp` 作为一个工具库，在功能性和易用性之间所做的极致追求。

通过实现 `match` 函数，我们为 `path-to-regexp` 的核心功能实现之旅画上了一个圆满的句号。我们从最底层的 `parse` 和 `tokensToRegexp` 开始，一步步构建，最终封装出了一个强大、易用且设计优雅的高级 API。
