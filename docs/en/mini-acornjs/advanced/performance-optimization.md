# 39. Performance Optimization: Parser Memory and Speed Considerations

So far, we have been focusing on "functional implementation"—making `mini-acorn` capable of correctly parsing JavaScript syntax. However, for a foundational tool library like a parser, functional correctness alone is far from sufficient. When dealing with large projects containing thousands of lines of code, performance—including **parsing speed** and **memory usage**—becomes a key metric determining whether it can stand firm in a production environment.

In this chapter, we will shift our focus from "usable" to "well-performing," exploring the key factors affecting parser performance and learning some proven optimization techniques. This will not only transform our `mini-acorn` but also cultivate the engineering literacy we should possess when developing underlying libraries.

## Two Dimensions of Performance: Speed and Memory

1.  **Speed**: Refers to the rate at which the parser processes code, typically measured in "megabytes per second" (MB/s). The faster the speed, the shorter the waiting time for the entire compilation/build process.
2.  **Memory**: Refers to the memory space occupied during the parsing process, particularly the final generated AST. If the AST is too large, it will slow down subsequent processing (traversal, code generation) and put enormous pressure on garbage collection (GC), potentially leading to memory overflow.

## How to Measure Performance? Benchmarking

Before undertaking any optimization, we must first learn how to **quantify** performance. Without measurement, there can be no optimization. The simplest performance measurement method is using `console.time` and `console.timeEnd`.

To obtain more reliable data, we should repeatedly run parsing tasks on a large, real-world JavaScript file (such as React or Vue source code).

```javascript
// benchmark.js
import fs from 'fs';
import { Parser } from './src/parser';

const code = fs.readFileSync('./large-code-file.js', 'utf8');
const parser = new Parser();
const ITERATIONS = 100;

console.time('Parsing Benchmark');
for (let i = 0; i < ITERATIONS; i++) {
  parser.parse(code);
}
console.timeEnd('Parsing Benchmark');
```

By running such benchmark scripts before and after optimization, we can use data to prove whether our optimizations are effective.

## Speed Optimization Techniques

Parser performance hotspots are typically concentrated in the lexical analysis stage, because functions like `readToken` are called tens of thousands of times. Optimizing these hotspot functions can yield the most significant performance improvements.

### Technique 1: Use `charCodeAt` Instead of String Comparison

In the lexical analyzer, we are constantly checking the current character. Using `this.input.charCodeAt(this.pos) === 120` (ASCII code for `'x'`) is usually faster than `this.input[this.pos] === 'x'` or `this.input.slice(this.pos, 1) === 'x'`.

-   **Reason**: `charCodeAt` directly returns the UTF-16 encoding of the character (a number), and subsequent comparisons are number-to-number comparisons. Whereas `input[pos]` or `slice` creates a new temporary string of length 1, introducing additional memory allocation and garbage collection overhead.

```javascript
// Before optimization
if (this.input[this.pos] === '/' && this.input[this.pos + 1] === '*') {
  // ...
}

// After optimization
const char = this.input.charCodeAt(this.pos);
const nextChar = this.input.charCodeAt(this.pos + 1);
if (char === 47 /* / */ && nextChar === 42 /* * */) {
  // ...
}
```

Parsers like Acorn and Babel internally use this technique extensively.

### Technique 2: Reduce Garbage Collection (GC) Pressure

Frequently creating short-lived objects within parsing loops is a major performance killer. For example, our `startNode` method creates a new `loc` object every time. For an AST with tens of thousands of nodes, this means tens of thousands of `loc` objects are created.

We can optimize this through **object reuse**. Maintain only one `startLoc` object in the `Parser` instance, and when calling `startNode`, instead of `new`-ing a new one, reset the properties of this shared object.

```javascript
// Before optimization
pp.startNode = function() {
  return {
    start: this.pos,
    loc: { start: this.curPosition() }
  };
};

// After optimization
class Parser {
  constructor() {
    this._reusableStartLoc = { line: 0, column: 0 };
  }
}

pp.startNode = function() {
  this._reusableStartLoc.line = this.line;
  this._reusableStartLoc.column = this.pos - this.lineStart;
  return {
    start: this.pos,
    loc: { start: this._reusableStartLoc } // Note: Side effect here, loc object will be modified by subsequent calls
  };
};
```

> **Warning**: This optimization requires extreme caution. If other parts of the AST or subsequent consumers expect the `loc` object to be persistent and immutable, this sharing and reuse will cause hard-to-trace bugs. This is a trade-off between space and time (or vice versa).

## Memory Optimization Techniques

AST memory usage primarily depends on the number of nodes and the size of each node.

### Technique 1: Optimize Node Structure

Review our AST nodes to see if there are areas that can be streamlined. For example, `loc` objects (containing `start` and `end` positions) and `range` arrays (`[start, end]`) occupy considerable space in the AST. While they are very useful for toolchains, they might be unnecessary in certain pure runtime scenarios.

A good practice is to provide a configuration option allowing users to choose whether to generate these location information.

```javascript
// parse(code, { locations: false, ranges: false })
```

### Technique 2: String Deduplication (String Interning)

In a large project, identifiers like `require`, `prototype`, `__esModule` will appear hundreds or thousands of times. If each `Identifier` node stores an independent string copy, it would be a huge memory waste.

**String deduplication** (or "string interning") is an effective optimization method. The idea is to maintain a global string pool (such as a `Set`), and during parsing, if a previously seen string is encountered, have the AST node reference the unique instance in the pool instead of creating a new string.

Fortunately, modern JavaScript engines perform a certain degree of string deduplication at the underlying level for us, but we can do it more thoroughly at the application level, especially for those identifiers we explicitly know will be heavily repeated.

## JIT Compiler and Coding Style

Modern JavaScript engines (like V8) use JIT (Just-In-Time) compilers to optimize hotspot code. To help JIT work better, we can follow some coding styles:

-   **Maintain Stable Object Structure**: Try to avoid dynamically adding or deleting properties from an object's "shape" (Shape/Hidden Class) at runtime. JIT prefers "monomorphic" functions, meaning the shape of objects processed by the function is always the same. Both `Node` objects in the parser and `Parser` instances should maintain their structure after creation.
-   **Keep Functions as "Pure" as Possible**: Avoid producing excessive side effects in hotspot functions, which helps JIT perform more aggressive optimizations, such as function inlining.

## Summary

Performance optimization is a systematic engineering task that requires us not only to understand business logic but also to have a basic understanding of how underlying language engines work. In this chapter, we learned:

-   Speed and memory are key metrics for measuring parser performance, and benchmarking is the prerequisite for optimization.
-   Techniques like using `charCodeAt` and reducing temporary object creation can significantly improve parsing speed.
-   Streamlining node structures and string deduplication can effectively reduce AST memory usage.
-   Writing code that is friendly to JIT compilers is a universal guideline for improving JavaScript program performance.

Only after performance optimization does `mini-acorn` truly possess the potential to be applied in the real world. In the final chapter of this book, we will explore the last advanced topic: **Error Handling and Fault Tolerance**, learning how to make our parser behave more "intelligently" and "robustly" when facing syntax errors.