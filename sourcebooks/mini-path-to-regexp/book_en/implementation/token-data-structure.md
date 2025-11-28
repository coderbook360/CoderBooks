# 5. Data Structure: The Design and Implementation of `Token`

In the previous chapter, we delved into the core regular expression that drives the `parse` function. We learned that the purpose of this regex is to identify "meaningful segments" within a path string. Now, we need to define a clear and standardized computer representation for these "segments"—this is the `Token` data structure.

`Token` is one of the most important concepts in `path-to-regexp`. It serves as the bridge connecting the "lexical analysis" and "code generation" stages. A well-designed `Token` structure will make our subsequent code exceptionally clear and simple.

## 5.1. Types of `Token`s

From the perspective of the `parse` function, a path string can be broken down into two fundamental types of `Token`s:

1.  **Path**: The immutable, plain text parts of the path, such as `/user/` or `/posts`.
2.  **Parameter**: The dynamic parts of the path used to capture variables, such as `:id`.

Therefore, our `Token` type needs to be able to distinguish between at least these two. In TypeScript, we can define `Token` as a union type, which can either be a `string` for static paths or a `Key` object for parameters.

```typescript
// A token is a string (for static parts) or a Key object (for dynamic parts).
export type Token = string | Key;
```

The elegance of this design lies in its simplicity. For the most common static paths, we directly use the `string` type, which is both intuitive and efficient. Only when we encounter more complex parameters do we need to use a dedicated object structure, `Key`, to describe them.

## 5.2. Designing the `Key` Interface

The `Key` interface is the core of the `Token` structure. It needs to be able to hold all the information about a dynamic parameter. Based on the path syntax we learned in Chapter 2, a parameter has the following properties:

- **name**: The name of the parameter, like `id`.
- **prefix**: The delimiter before the parameter, usually `/` or `.`.
- **suffix**: An optional character after the parameter, often used for closing brackets.
- **pattern**: The custom regular expression for the parameter, like `\d+`.
- **modifier**: The quantifier for the parameter, such as `?`, `*`, `+`.

Based on these requirements, we can define the complete structure of the `Key` interface:

```typescript
// Represents a single dynamic path segment.
export interface Key {
  name: string | number; // Parameter name, can be a number for unnamed parameters
  prefix: string | null;  // Prefix, like / or .
  suffix: string | null;  // Suffix, like )
  pattern: string;        // The matching pattern for the parameter (a regex string)
  modifier: "?" | "*" | "+" | ""; // Modifier
}
```

Let's analyze each field of this interface:

- **`name: string | number`**: The name of the parameter. For a named parameter `:id`, it is the string `"id"`. For an unnamed parameter `(\d+)`, `path-to-regexp` assigns a numerical index starting from 0, so the type is `number`.

- **`prefix: string | null`**: The prefix of the parameter. For the path `/user/:id`, the `prefix` of the `:id` `Key` is `/`. For a parameter `/:id` under the root path `/`, the `prefix` is also `/`. If the parameter has no prefix (e.g., at the beginning of a path), it is `null`.

- **`suffix: string | null`**: The suffix of the parameter. This field is typically used for handling more complex patterns, such as parenthesized groups. In most common cases, it is `null`.

- **`pattern: string`**: This is the regular expression fragment corresponding to the parameter. For `:id`, its default value is `[^\/]+?` (match one or more non-slash characters, non-greedy). For `:id(\d+)`, its value is `\d+`.

- **`modifier: "?" | "*" | "+" | ""`**: The modifier for the parameter. `""` indicates no modifier, meaning the parameter is required and appears exactly once.

## 5.3. `Token` Array Example

With the definitions of `string` and `Key`, we can now describe the output of the `parse` function more precisely. Let's revisit the example `/user/:id(\d+)?`:

- **Input**: `/user/:id(\d+)?`
- **Output (`Token[]`)**:

  ```json
  [
    "/user",
    {
      "name": "id",
      "prefix": "/",
      "suffix": null,
      "pattern": "\\d+",
      "modifier": "?"
    }
  ]
  ```

This `Token` array perfectly and structurally describes the original path:

1.  The first `Token` is a `string` `"/user"`, representing the static path part.
2.  The second `Token` is a `Key` object, which tells us:
    - This is a parameter named `id`.
    - Its prefix is `/`.
    - It is required to match one or more digits (`\d+`).
    - It is optional (`?`).

This `Token` array is our "Abstract Syntax Tree" (AST). It's very simple, just a flat array, but it already contains all the information needed for the subsequent "code generation" (whether generating a `RegExp` or a `toPath` function).

In the next chapter, we will put theory into practice. Using the `PATH_REGEXP` from the last chapter and the `Token` structure from this one, we will fully implement the `parse` function. We will see that the implementation of `parse` is a process of consuming the results of the regular expression match and carefully constructing `Key` objects.
