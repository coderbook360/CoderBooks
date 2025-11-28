# 41. Putting It All Together: Building a Complete Parser

We have come a long and fulfilling journey. Starting from a basic lexer, we gradually added expression parsing, statement parsing, functions, classes, modules, and finally implemented advanced features like plugin architecture, Source Map generation, and error recovery. In previous chapters, to focus on specific knowledge points, we often split or simplified the code.

Now, it's time to put all the pieces together and see the complete form of the `mini-acorn` parser we built with our own hands.

This chapter serves as the summary and code appendix for the entire book. We will review the final project structure and provide complete code listings for the core files. This will not only help you consolidate all the knowledge you've learned but also provide you with a complete, runnable `mini-acorn` implementation that can serve as a starting point for future projects.

## Final Project Structure

A typical, well-organized parser project structure looks like this:

```
mini-acorn/
├── src/
│   ├── tokentype.js      # Define all Token types
│   ├── token.js          # Token class implementation
│   ├── lexer.js          # Lexical analyzer
│   ├── parser.js         # Syntax parser (core)
│   ├── scope.js          # Scope and symbol table management
│   └── index.js          # Main entry point, exports public API
├── plugins/              # Plugin directory
│   └── ...
├── test/                 # Test files
│   └── ...
├── package.json
└── ...
```

- **`tokentype.js`**: The "dictionary" of all tokens, defining their types, keyword information, etc.
- **`token.js`**: Implementation of the Token object, used to carry the results of lexical analysis.
- **`lexer.js`**: Responsible for converting source code strings into token streams.
- **`parser.js`**: Core file, implementing the `Parser` class for syntax analysis, responsible for building AST from token streams.
- **`scope.js`**: Provides scope stack and symbol table management functionality.
- **`index.js`**: The project's public API entry point, typically exporting a `parse` function for external calls.

## Core Code Listings

Here are the final integrated code listings for several core files of `mini-acorn`. This code incorporates all the knowledge points from our previous chapters.

### `src/tokentype.js`

```javascript
export class TokenType {
  constructor(label, conf = {}) {
    this.label = label;
    this.keyword = conf.keyword;
    this.beforeExpr = !!conf.beforeExpr;
    this.startsExpr = !!conf.startsExpr;
    this.isLoop = !!conf.isLoop;
    this.isAssign = !!conf.isAssign;
    this.prefix = !!conf.prefix;
    this.postfix = !!conf.postfix;
    this.binop = conf.binop || null;
  }
}

const keywords = new Map();

function createKeyword(name, options = {}) {
  options.keyword = name;
  const token = new TokenType(name, options);
  keywords.set(name, token);
  return token;
}

export const types = {
  num: new TokenType("num", { startsExpr: true }),
  string: new TokenType("string", { startsExpr: true }),
  name: new TokenType("name", { startsExpr: true }),
  eof: new TokenType("eof"),

  // Punctuation
  bracketL: new TokenType("[", { beforeExpr: true, startsExpr: true }),
  bracketR: new TokenType("]"),
  braceL: new TokenType("{", { beforeExpr: true, startsExpr: true }),
  braceR: new TokenType("}"),
  parenL: new TokenType("(", { beforeExpr: true, startsExpr: true }),
  parenR: new TokenType(")"),
  comma: new TokenType(",", { beforeExpr: true }),
  semi: new TokenType(";", { beforeExpr: true }),
  colon: new TokenType(":", { beforeExpr: true }),
  dot: new TokenType("."),
  question: new TokenType("?", { beforeExpr: true }),
  arrow: new TokenType("=>", { beforeExpr: true }),
  ellipsis: new TokenType("..."),
  backQuote: new TokenType("`"),
  dollarBraceL: new TokenType("${", { beforeExpr: true, startsExpr: true }),

  // Operators
  eq: new TokenType("=", { isAssign: true }),
  assign: new TokenType("_=", { isAssign: true }),
  incDec: new TokenType("++/--", { prefix: true, postfix: true, startsExpr: true }),
  prefix: new TokenType("!/~", { beforeExpr: true, prefix: true, startsExpr: true }),
  logicalOR: new TokenType("||", { beforeExpr: true, binop: 1 }),
  logicalAND: new TokenType("&&", { beforeExpr: true, binop: 2 }),
  bitwiseOR: new TokenType("|", { beforeExpr: true, binop: 3 }),
  bitwiseXOR: new TokenType("^", { beforeExpr: true, binop: 4 }),
  bitwiseAND: new TokenType("&", { beforeExpr: true, binop: 5 }),
  equality: new TokenType("==/!=", { beforeExpr: true, binop: 6 }),
  relational: new TokenType("</>", { beforeExpr: true, binop: 7 }),
  bitShift: new TokenType("<<</>>", { beforeExpr: true, binop: 8 }),
  plusMin: new TokenType("+/-", { beforeExpr: true, binop: 9, prefix: true, startsExpr: true }),
  modulo: new TokenType("%", { beforeExpr: true, binop: 10 }),
  star: new TokenType("*", { beforeExpr: true, binop: 10 }),
  slash: new TokenType("/", { beforeExpr: true, binop: 10 }),
  starstar: new TokenType("**", { beforeExpr: true }),

  // Keywords
  _break: createKeyword("break"),
  _case: createKeyword("case", { beforeExpr: true }),
  _catch: createKeyword("catch"),
  _continue: createKeyword("continue"),
  _debugger: createKeyword("debugger"),
  _default: createKeyword("default", { beforeExpr: true }),
  _do: createKeyword("do", { isLoop: true, beforeExpr: true }),
  _else: createKeyword("else", { beforeExpr: true }),
  _finally: createKeyword("finally"),
  _for: createKeyword("for", { isLoop: true }),
  _function: createKeyword("function", { startsExpr: true }),
  _if: createKeyword("if"),
  _return: createKeyword("return", { beforeExpr: true }),
  _switch: createKeyword("switch"),
  _throw: createKeyword("throw", { beforeExpr: true }),
  _try: createKeyword("try"),
  _var: createKeyword("var"),
  _const: createKeyword("const"),
  _let: createKeyword("let"),
  _while: createKeyword("while", { isLoop: true }),
  _with: createKeyword("with"),
  _new: createKeyword("new", { beforeExpr: true, startsExpr: true }),
  _this: createKeyword("this", { startsExpr: true }),
  _super: createKeyword("super", { startsExpr: true }),
  _class: createKeyword("class", { startsExpr: true }),
  _extends: createKeyword("extends", { beforeExpr: true }),
  _export: createKeyword("export"),
  _import: createKeyword("import", { startsExpr: true }),
  _null: createKeyword("null", { startsExpr: true }),
  _true: createKeyword("true", { startsExpr: true }),
  _false: createKeyword("false", { startsExpr: true }),
  _in: createKeyword("in", { beforeExpr: true, binop: 7 }),
  _instanceof: createKeyword("instanceof", { beforeExpr: true, binop: 7 }),
  _typeof: createKeyword("typeof", { beforeExpr: true, prefix: true, startsExpr: true }),
  _void: createKeyword("void", { beforeExpr: true, prefix: true, startsExpr: true }),
  _delete: createKeyword("delete", { beforeExpr: true, prefix: true, startsExpr: true }),
};
```

### `src/index.js`

```javascript
import { Parser } from './parser';

export function parse(input, options) {
  return new Parser(input, options).parse();
}

export { Parser };
```

### `src/parser.js` (Skeleton)

Since the `parser.js` file becomes very large after integrating all features, we only show its overall structure and skeleton here. You can fill in all the methods we implemented on `pp.` (i.e., `Parser.prototype`) in previous chapters into this class to form the final complete version.

```javascript
import { Lexer } from './lexer';
import { types as tt } from './tokentype';

export class Parser extends Lexer {
  constructor(input, options) {
    super(input, options);
  }

  parse() {
    const node = this.startNode();
    this.nextToken();
    return this.parseTopLevel(node);
  }

  // --- Core Methods ---
  parseTopLevel(node) { /* ... */ }
  parseStatement(declaration, topLevel) { /* ... */ }
  parseExpression() { /* ... */ }
  parseExprAtom() { /* ... */ }
  parseExprOps() { /* ... */ }
  parseMaybeUnary() { /* ... */ }
  parseBlock() { /* ... */ }
  parseVarStatement(node, kind) { /* ... */ }
  parseFunction(node, isStatement) { /* ... */ }
  // ... Omitted dozens of parsing methods we implemented throughout the book

  // --- Helper Methods ---
  next() { /* ... */ }
  eat(type) { /* ... */ }
  expect(type) { /* ... */ }
  startNode() { /* ... */ }
  finishNode(node, type) { /* ... */ }
  raise(pos, message) { /* ... */ }
  unexpected(pos) { /* ... */ }
}
```

## Final Thoughts: Where to Go from Here?

With a complete parser you built yourself, you now hold the key to opening the door to the world of compilers. This is not just a piece of code, but a way of thinking and a set of problem-solving tools.

- **Dive into Source Code**: You are now fully capable of reading the source code of Acorn, Babel Parser (Babylon), and even V8's parser. You'll find that although their implementations are more complex and optimized, their core ideas are consistent with our `mini-acorn`.

- **Build Your Own Tools**: Have you thought about creating your own JSX dialect? Or a domain-specific language (DSL)? Now you can extend `mini-acorn` to implement your ideas.

- **Contribute to Open Source**: When you discover a parsing bug in Babel or ESLint, you're no longer helpless. You can try to locate the problem and even submit a Pull Request, because you now understand how they work.

## Conclusion

The journey of "mini-acorn.js Parser in Practice" officially ends here. We started from the most basic tokens and ultimately built a powerful, well-structured modern JavaScript parser. I hope this journey not only gave you knowledge but also ignited your passion for exploring the underlying principles of technology.

The door to the programming world is always open to those who are curious and brave enough to explore. May you use the knowledge you've gained here to create more valuable and interesting things in your future learning and work.

Thank you for your persistence and companionship. Farewell!