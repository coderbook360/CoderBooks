# 39. 性能优化：解析器内存与速度考量

到目前为止，我们一直专注于“功能实现”——让 `mini-acorn` 能够正确地解析 JavaScript 语法。然而，对于一个像解析器这样的基础工具库，仅仅功能正确是远远不够的。在处理成千上万行代码的大型项目时，性能——包括**解析速度**和**内存占用**——成为了衡量其是否能在生产环境中立足的关键指标。

在本章，我们将把目光从“能用”转向“好用”，探讨影响解析器性能的关键因素，并学习一些行之有效的优化技巧。这不仅能让我们的 `mini-acorn` 脱胎换骨，更能培养我们在开发底层库时应具备的工程素养。

## 性能的两个维度：速度与内存

1.  **速度 (Speed)**: 指解析器处理代码的速率，通常以“兆字节/秒”（MB/s）来衡量。速度越快，整个编译/构建流程的等待时间就越短。
2.  **内存 (Memory)**: 指解析过程中，特别是最终生成的 AST 所占用的内存空间。如果 AST 过于庞大，会导致后续处理（遍历、代码生成）变慢，并给垃圾回收（GC）带来巨大压力，甚至可能导致内存溢出。

## 如何衡量性能？基准测试 (Benchmark)

在进行任何优化之前，我们必须先学会如何**量化**性能。没有测量，就无从谈优化。最简单的性能测量方法是使用 `console.time` 和 `console.timeEnd`。

为了得到更可靠的数据，我们应该在一个大型的、真实的 JavaScript 文件上（例如 React 或 Vue 的源码）重复运行解析任务多次。

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

通过在优化前后运行这样的基准测试脚本，我们就能用数据来证明我们的优化是否有效。

## 速度优化技巧

解析器的性能热点（Hot Spot）通常集中在词法分析阶段，因为 `readToken` 等函数会被调用成千上万次。优化这些热点函数能带来最显著的性能提升。

### 技巧 1：使用 `charCodeAt` 代替字符串比较

在词法分析器中，我们无时无刻不在检查当前的字符。相比于 `this.input[this.pos] === 'x'` 或 `this.input.slice(this.pos, 1) === 'x'`，使用 `this.input.charCodeAt(this.pos) === 120` (`'x'` 的 ASCII 码) 通常会更快。

-   **原因**: `charCodeAt` 直接返回字符的 UTF-16 编码（一个数字），后续的比较是数字与数字的比较。而 `input[pos]` 或 `slice` 会创建一个新的长度为 1 的临时字符串，带来了额外的内存分配和垃圾回收开销。

```javascript
// 优化前
if (this.input[this.pos] === '/' && this.input[this.pos + 1] === '*') {
  // ...
}

// 优化后
const char = this.input.charCodeAt(this.pos);
const nextChar = this.input.charCodeAt(this.pos + 1);
if (char === 47 /* / */ && nextChar === 42 /* * */) {
  // ...
}
```

Acorn 和 Babel 的解析器内部就大量使用了这种技巧。

### 技巧 2：减少垃圾回收（GC）压力

在解析循环中频繁创建短生命周期的对象，是性能的一大杀手。例如，我们的 `startNode` 方法每次都创建一个新的 `loc` 对象。对于一个有数万个节点的 AST，这就意味着数万个 `loc` 对象被创建。

我们可以通过**对象重用**来优化这一点。在 `Parser` 实例中只维护一个 `startLoc` 对象，每次调用 `startNode` 时，不去 `new` 一个新的，而是重置这个共享对象的属性。

```javascript
// 优化前
pp.startNode = function() {
  return {
    start: this.pos,
    loc: { start: this.curPosition() }
  };
};

// 优化后
class Parser {
  constructor() {
    this._ reusableStartLoc = { line: 0, column: 0 };
  }
}

pp.startNode = function() {
  this._reusableStartLoc.line = this.line;
  this._reusableStartLoc.column = this.pos - this.lineStart;
  return {
    start: this.pos,
    loc: { start: this._reusableStartLoc } // 注意：这里有副作用，loc 对象会被后续调用修改
  };
};
```

> **警告**: 这种优化需要非常小心。如果 AST 的其他部分或后续的消费者期望 `loc` 对象是持久不变的，这种共享和重用就会引发难以追踪的 Bug。这是一种空间换时间（或反之）的权衡。

## 内存优化技巧

AST 的内存占用主要取决于节点的数量和每个节点的大小。

### 技巧 1：优化节点结构

审视我们的 AST 节点，看看是否有可以精简的地方。例如，`loc` 对象（包含 `start` 和 `end` 位置）和 `range` 数组（`[start, end]`）在 AST 中占用了相当大的空间。虽然它们对于工具链非常有用，但在某些纯运行时的场景下可能是不必要的。

一个好的实践是提供一个配置项，允许用户选择是否生成这些位置信息。

```javascript
// parse(code, { locations: false, ranges: false })
```

### 技巧 2：字符串去重（String Interning）

在一个大项目中，像 `require`、`prototype`、`__esModule` 这样的标识符会出现成百上千次。如果每个 `Identifier` 节点都存储一份独立的字符串副本，将是巨大的内存浪费。

**字符串去重**（或称“字符串驻留”）是一种有效的优化方法。其思想是维护一个全局的字符串池（例如一个 `Set`），在解析时，如果遇到一个已经见过的字符串，就让 AST 节点引用池中的唯一实例，而不是创建新的字符串。

幸运的是，现代 JavaScript 引擎在底层已经为我们做了一定程度的字符串去重，但我们可以在应用层面做得更彻底，特别是对于那些我们明确知道会大量重复的标识符。

## JIT 编译器与代码风格

现代 JavaScript 引擎（如 V8）使用 JIT（Just-In-Time）编译器来优化热点代码。为了让 JIT 更好地工作，我们可以遵循一些编码风格：

-   **保持对象结构稳定**: 尽量不要在运行时动态地为一个对象的“形状”（Shape/Hidden Class）添加或删除属性。JIT 喜欢“单态”（monomorphic）的函数，即函数处理的对象的形状总是相同的。解析器中的 `Node` 对象和 `Parser` 实例都应该在创建后保持其结构稳定。
-   **函数尽量“纯”**: 避免在热点函数中产生过多的副作用，这有助于 JIT 进行更激进的优化，如函数内联。

## 总结

性能优化是一个系统工程，它要求我们不仅理解业务逻辑，还要对底层语言引擎的工作原理有基本的认识。在本章中，我们学习了：

-   速度和内存是衡量解析器性能的关键指标，而基准测试是优化的前提。
-   通过使用 `charCodeAt` 和减少临时对象创建等技巧，可以显著提升解析速度。
-   通过精简节点结构和字符串去重，可以有效降低 AST 的内存占用。
-   编写对 JIT 编译器友好的代码，是提升 JavaScript 程序性能的通用准则。

经过性能优化的 `mini-acorn`，才算真正具备了在真实世界中被应用的潜力。在本书的最后一章，我们将探讨最后一个高级话题：**错误处理与容错**，学习如何让我们的解析器在面对语法错误时，表现得更“智能”、更“健壮”。
