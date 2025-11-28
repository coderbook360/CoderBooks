# 9. Reverse Generation: Implementing the `compile` Function

So far, all our efforts have been focused on converting a path string into a regular expression to perform "matching." However, `path-to-regexp` is capable of more than that. It also provides a powerful "reverse generation" capability, which is the ability to generate a concrete URL string from a path pattern and given parameters. This functionality is provided by the `compile` function.

The `compile` function is very useful in many scenarios, such as generating `<a>` tags with links that conform to your routing rules in your application, or generating test cases for your routes in testing.

## 9.1. The Signature and Responsibilities of the `compile` Function

- **Input**: `path: string`, the path pattern to be compiled.
- **Output**: `(data?: object) => string`, a "path generation function." We usually call this the `toPath` function.

The `compile` function itself does not directly generate the path. Instead, it returns a function. This higher-order function design allows the compilation of the path (a one-time operation) to be separated from the generation of the path (a multiple-time operation), which improves efficiency.

```typescript
// Pseudocode
function compile(path) {
  const tokens = parse(path);
  const toPath = tokensToFunction(tokens);
  return toPath;
}
```

Similar to `pathToRegexp`, the core logic of `compile` is also delegated to an internal function, which we'll call `tokensToFunction`.

## 9.2. Implementation of `tokensToFunction`

The responsibility of `tokensToFunction` is to accept a `Token` array and return a `toPath` function. This returned `toPath` function is a closure that holds a reference to the `tokens` array.

```typescript
import { Token, Key } from "./types";

function tokensToFunction(tokens: Token[]): (data?: object) => string {
  // Implementation of the toPath function
  return function toPath(data: object = {}): string {
    let path = "";

    for (const token of tokens) {
      if (typeof token === "string") {
        path += token;
      } else {
        // Handle dynamic parameter Keys
        const value = data[token.name];

        if (value == null) {
          // If the parameter is optional, ignore it
          if (token.modifier === "?" || token.modifier === "*") {
            continue;
          }
          // Otherwise, throw an error
          throw new TypeError(`Expected "${token.name}" to be defined`);
        }

        // ... Encoding and concatenation of parameter values ...
        path += token.prefix + encodeURIComponent(value);
      }
    }

    return path;
  };
}
```

The implementation of `tokensToFunction` is surprisingly simple. It once again demonstrates the power of `Token` as an intermediate representation. The returned `toPath` function iterates through the `tokens` array every time it is called.

### Iteration and Concatenation

- **Handling Static Path `Token`s (`string`)**: When a `token` is a string, it is directly appended to the `path` variable.

- **Handling Dynamic Parameter `Token`s (`Key`)**:
    1.  **Get the Parameter Value**: Retrieve the corresponding value from the `data` object passed by the user, based on `token.name`.
    2.  **Handle Missing Values**:
        - If the parameter value `value` is `null` or `undefined`, we need to check if the parameter is optional.
        - If `token.modifier` is `?` or `*`, it means the parameter is optional, and we can safely `continue` to skip the processing of this `Token`.
        - Otherwise, it is a required parameter, but the user has not provided a value. In this case, we should throw a `TypeError` to clearly inform the user of the problem.
    3.  **Encode and Concatenate**: After obtaining the parameter value, we need to encode it to ensure that the generated URL is valid. `encodeURIComponent` is a standard choice that can encode characters with special meaning in a URI. Then, we concatenate the `token.prefix` and the encoded value to the `path`.

## 9.3. Handling Repeated Parameters

The implementation above does not yet handle the cases where the modifier is `*` or `+`, both of which allow a parameter to appear multiple times. Therefore, the corresponding value should be an array.

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
  // ... original logic ...
  path += token.prefix + encodeURIComponent(value);
}
```

We need to check the type of `value`:

- **If `value` is an array**:
    - First, check if the `modifier` is `*` or `+`. If not, but the user provided an array, it is a type error, and an exception should be thrown.
    - If the array is empty, it is an error for `+` (which requires at least one), but it is valid for `*` (simply skip it).
    - If the array is not empty, we use `map` to encode each element in the array and then use the parameter's `prefix` as a separator to `join` them. For example, for the path `/tags/:tag+` and the data `{ tag: ["js", "react"] }`, the result of `join` would be `js/react`, and the final generated path would be `/tags/js/react`.

- **If `value` is not an array**: Execute our previous logic for single values.

The implementation of the `compile` function once again reflects the elegant design of `path-to-regexp`. The `Token` array produced by the `parse` function can not only be used to generate regular expressions but can also be used by `tokensToFunction` to generate a path constructor function. The same intermediate representation is consumed by two different "code generators" to produce two completely different outputs. This is a perfect illustration of the "separation of concerns" principle.
