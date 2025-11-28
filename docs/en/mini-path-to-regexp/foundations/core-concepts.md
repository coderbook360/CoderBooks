# 2. Core Concepts: Path Patterns, Parameters, and Modifiers

In the previous chapter, we got acquainted with the core workflow of `path-to-regexp`. Now, it's time to learn its "language." The power of `path-to-regexp` lies in the concise yet expressive syntax it defines, allowing us to precisely describe a wide variety of complex URL patterns. This chapter will detail every aspect of this syntax, which is the cornerstone of mastering `path-to-regexp`.

## 2.1. Basic Components of a Path

A path pattern is typically composed of two basic parts:

- **Static Segments**: The ordinary string parts of a path, such as `/users/` or `/posts`. During conversion, they are escaped and become part of the regular expression as-is for exact literal matching.
- **Dynamic Segments**: The "placeholders" in the path used to capture dynamic values. We call them "parameters." They are the core of the `path-to-regexp` syntax.

## 2.2. Named Parameters

The most common form of a parameter is a named parameter, which is prefixed with a colon `:`.

- **Syntax**: `:name`
- **Example**: `/user/:id`

This pattern will match paths like `/user/123` or `/user/abc`. `path-to-regexp` will generate a capturing group to get the actual value at the `:id` position and associate it with the parameter name `id`.

By default, a named parameter matches one or more characters that are not a forward slash (`/`). The generated regular expression fragment looks something like this:

```javascript
// Path: /user/:id
// RegExp fragment for :id: ([^\/]+?)
// Full RegExp: /^\/user\/([^\/]+?)\/?$/i
```

## 2.3. Modifiers

Adding a modifier after a parameter changes its matching behavior, making it optional or repeatable.

| Modifier | Syntax Example    | Meaning                  | Generated RegExp Fragment (Example)     |
| :------- | :---------------- | :----------------------- | :-------------------------------------- |
| **?**    | `/:id?`           | **Optional**             | `(?:\/([^\/]+?))?`                     |
| **\***  | `/:id*`           | **Zero or more**         | `(?:\/([^\/]+?))*`                     |
| **+**    | `/:id+`           | **One or more**          | `(?:\/([^\/]+?))+`                     |

Let's analyze these modifiers in detail:

- **`?` (Optional)**: It indicates that the preceding parameter is optional. Note that in the generated regex `(?:\/([^\/]+?))?`, not only is the parameter's capturing group optional, but the preceding slash `/` is also included in a non-capturing group `(?:...)` and made optional. This means `/user/:id?` can match both `/user/123` and `/user`.

- **`*` (Zero or more)**: It indicates that the parameter can appear zero or more times. For example, `/files/:path*` can match `/files`, `/files/a`, `/files/a/b`, etc. Each matched value is collected into an array.

- **`+` (One or more)**: Similar to `*`, but it requires the parameter to appear at least once. For example, `/tags/:tag+` can match `/tags/js` and `/tags/js/react`, but not `/tags`.

## 2.4. Custom Matching Parameters

By default, a parameter matches `[^/]+?`. But sometimes we need more precise control. For instance, we might want `:id` to be only numbers. In this case, we can provide a custom regular expression fragment in parentheses `()` after the parameter name.

- **Syntax**: `:name(pattern)`
- **Example**: `/user/:id(\d+)`

In this example, we specify the matching pattern `\d+` for the `:id` parameter, which means "one or more digits."

- **Generated RegExp**: `/^\/user\/(\d+)\/?$/i`

Now, this pattern will only match paths like `/user/123`, but not `/user/abc`.

Custom patterns can also be combined with modifiers to create powerful matching rules. A classic example is greedy matching:

- **Example**: `/files/:path(.*)`
- **Explanation**: Here, `.*` will match any character (including slashes `/`) zero or more times. This allows the `:path` parameter to capture a complete path with multiple directory levels. For example, in `/files/a/b/c.txt`, `:path` will match `a/b/c.txt`.

## 2.5. Unnamed Parameters

You can also use parameters without names by directly embedding a regular expression in parentheses.

- **Syntax**: `(.*)` or `(\d+)`
- **Example**: `/post/(\d{4}-\d{2}-\d{2})`

This pattern will match a path like `/post/2023-01-01`. Since the parameter is unnamed, the matched value will be stored in a numerically indexed array in order of appearance.

## 2.6. Wildcards

`path-to-regexp` provides a special unnamed parameter as a wildcard: `*`.

- **Syntax**: `*`
- **Example**: `/users/*`

It is essentially a shorthand for `(.*)`, used to match any suffix.

---

By mastering this syntax, you have the ability to build almost any complex routing rule. In the next chapter, we will explore from a design perspective how `path-to-regexp` systematically transforms these human-readable syntax rules into machine-executable regular expressions. We will find that this process embodies classic compiler principles.
