# 6. Core Implementation: A Detailed Look at the `parse` Function Source Code

In this chapter, we will combine all the theoretical knowledge from the previous chapters—the `PATH_REGEXP` regular expression and the `Token` data structure—to fully implement the first core function of `path-to-regexp`: `parse`. The `parse` function is the cornerstone of the entire library, and the quality of its implementation directly determines the success of all subsequent features.

## 6.1. The Signature and Responsibilities of the `parse` Function

First, let's clarify the input and output of the `parse` function:

- **Input**: `path: string`, the path string to be parsed.
- **Output**: `Token[]`, the array of `Token`s obtained after parsing.

```typescript
import { Token, Key } from "./types"; // Assuming type definitions are in types.ts

// The core regular expression, which we analyzed in detail in Chapter 4
const PATH_REGEXP = /.../g;

export function parse(path: string): Token[] {
  const tokens: Token[] = [];
  let key = 0;
  let index = 0;
  let pathOffset = 0;
  let res: RegExpExecArray | null = null;

  // ... core loop logic ...

  return tokens;
}
```

Inside the function, we initialize several key variables:

- `tokens`: The `Token` array used to store the final result.
- `key`: A counter used to generate numerical indices for unnamed parameters.
- `index`: Records the current processing position in the `path` string.
- `pathOffset`: Records the offset of the path, used for slicing static path segments.
- `res`: Used to store the match result of `PATH_REGEXP.exec(path)`.

## 6.2. The Core Loop: `while` and `exec`

The core of the `parse` function is a `while` loop. Inside the loop, we repeatedly execute `PATH_REGEXP.exec(path)`. Since `PATH_REGEXP` has the `g` flag, each call to `exec` will continue searching from where the last match ended until no more matches can be found.

```typescript
// ... in parse function ...
while ((res = PATH_REGEXP.exec(path)) !== null) {
  const [match, escaped, prefix, name, customPattern, modifier] = res;
  const offset = res.index;

  // 1. Capture the static path part before the parameter
  if (offset > pathOffset) {
    tokens.push(path.substring(pathOffset, offset));
  }

  // 2. Handle escaped characters
  if (escaped) {
    tokens.push(escaped[1]);
    pathOffset = offset + match.length;
    continue;
  }

  // 3. Create and store the Key object
  const token: Key = {
    name: name || key++,
    prefix: prefix || "",
    suffix: "", // Simplified, not considering suffix for now
    pattern: customPattern || "[^\\/]+?",
    modifier: modifier || ""
  };
  tokens.push(token);

  // 4. Update the starting position for the next loop
  pathOffset = offset + match.length;
}
// ...
```

Let's break down the logic inside this loop step by step.

### Step 1: Capture the Static Path

`res.index` stores the starting position of the current match (e.g., a parameter `:id`) in the original string. `pathOffset` stores the ending position of the previous `Token`. If `res.index > pathOffset`, it means there is a static path segment between two dynamic parameters, or between the beginning of the string and the first parameter. We use `path.substring(pathOffset, offset)` to slice this static path and push it as a `string` type `Token` into the `tokens` array.

### Step 2: Handle Escaped Characters

The first capturing group of `PATH_REGEXP` is `(\\.)`, which corresponds to the `escaped` variable in the `res` array. If `escaped` exists, it means we have matched an escape sequence (like `\(`). In this case, we only take the escaped character itself (`escaped[1]`, i.e., `(`) and push it as a static text `Token` into the array. Then, we update `pathOffset` and use `continue` to skip the subsequent parameter handling logic and proceed directly to the next iteration of the loop.

### Step 3: Create the `Key` Object

If it's not an escaped character, then we have matched a parameter. The subsequent elements of the `res` array—`prefix`, `name`, `customPattern`, `modifier`—correspond to the capturing groups in `PATH_REGEXP` used to capture the various parts of a parameter.

We use these captured values to construct a `Key` object:

- **`name`**: If the `name` capturing group has a value, use it; otherwise, it's an unnamed parameter, and we assign a numerical index as its name using `key++`.
- **`prefix`**: If the `prefix` capturing group has a value, use it; otherwise, default to an empty string.
- **`pattern`**: If the `customPattern` capturing group has a value (e.g., `\d+` in `(\d+)`), use it; otherwise, use the default matching pattern `[^\\/]+?`.
- **`modifier`**: If the `modifier` capturing group has a value (`?`, `*`, `+`), use it; otherwise, default to an empty string.

After construction, we push this `Key` object into the `tokens` array.

### Step 4: Update the Offset

Finally, we update `pathOffset` to the position where the current match ends (`offset + match.length`) to prepare for capturing the static path in the next loop iteration.

## 6.3. Handling the Trailing Static Path

When the `while` loop finishes, it means that no more parameters can be found in the path string. However, there might still be a static path segment from the last parameter to the end of the string. We need to handle this case.

```typescript
// ... after while loop ...
if (pathOffset < path.length) {
  tokens.push(path.substr(pathOffset));
}

return tokens;
```

This line of code checks if `pathOffset` has reached the end of the string. If not, it takes all the content from `pathOffset` to the end as the last static path `Token` and pushes it into the array.

With this, the implementation of the `parse` function is complete. Through a `while` loop and a single `exec` call, it cleverly breaks down a complex string parsing task into a series of simple, repetitive "find-slice-construct" operations, ultimately generating a structurally clear and information-rich `Token` array. This function is a core manifestation of the elegant design of `path-to-regexp`.
