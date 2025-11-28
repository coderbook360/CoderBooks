# 36. Code Generation: Converting AST Back to JavaScript Code

In the previous chapter, we learned how to use the Visitor Pattern to traverse ASTs. Now, we will use this skill to complete a classic finishing task in the compilation process—**Code Generation**. The task of code generation is simple: receive an AST, then output a string, which is the code that conforms to the target language's syntax.

This process is like "describing a picture," where the AST is the structural diagram, and the generated code is what we say. It is the final step for all code transformers (Babel), formatting tools (Prettier), and bundling tools (Webpack). After completing this chapter, our `mini-acorn` project will form a complete cycle: `Code -> AST -> Code`.

## Core Principles of Code Generation

The code generation process is essentially another **depth-first traversal** of the AST. Its logic is very intuitive:

1.  Define a `generate` function that receives an AST node.
2.  Inside the function, based on the node's `type`, dispatch to different "generator" functions specialized for handling that node type (such as `generateIdentifier`, `generateVariableDeclaration`).
3.  Each generator function is responsible for "printing" the current node into a string. If this node has child nodes, it will **recursively** call the `generate` function to print the child nodes, and finally concatenate all parts into the final string.

This process can be seen as the "reverse operation" of the parsing process.

## Implementing a Simple Code Generator

We will create a `generate` function that will be the entry point for all generation logic. We will place the generation logic for different node types in an object or `switch` statement.

```javascript
// ast-manipulation/generator.js (a new file)

function generate(node) {
  switch (node.type) {
    case 'Program':
      return node.body.map(generate).join('\n');

    case 'ExpressionStatement':
      return generate(node.expression) + ';';

    case 'Identifier':
      return node.name;

    case 'Literal':
      return node.raw;

    case 'VariableDeclaration':
      return `${node.kind} ${node.declarations.map(generate).join(', ')};`;

    case 'VariableDeclarator':
      return `${generate(node.id)}${node.init ? ' = ' + generate(node.init) : ''}`;

    case 'BinaryExpression':
      // Simplified version, does not handle operator precedence
      return `${generate(node.left)} ${node.operator} ${generate(node.right)}`;

    case 'FunctionDeclaration':
      return `function ${generate(node.id)}(${node.params.map(generate).join(', ')}) {\n${generate(node.body)}\n}`;

    case 'BlockStatement':
      return node.body.map(generate).join('\n');

    default:
      throw new TypeError("Unsupported node type: " + node.type);
  }
}
```

### Let's Practice

Let's use this simple generator to "translate" the AST of a piece of code.

```javascript
import { parse } from '../src/parser';
import { generate } from './generator';

const code = 'const a = 1 + 2;';
const ast = parse(code);

const generatedCode = generate(ast);

console.log(generatedCode);
// Output: const a = 1 + 2;
```

Success! We turned the AST back into code. Although this simple generator works, it ignores many complexities of the real world.

## Challenges of Code Generation

A production-grade code generator is far more complex than the example above, as it needs to handle two core challenges:

### 1. Operator Precedence and Parentheses

Our previous `generateBinaryExpression` implementation has a serious problem. Consider `2 * (3 + 4)`, whose AST is roughly:

```
BinaryExpression('*')
  left: Literal(2)
  right: BinaryExpression('+')
    left: Literal(3)
    right: Literal(4)
```

If we use the previous simple generator, we get `2 * 3 + 4`, which is mathematically incorrect! Because `+` has lower precedence than `*`, when it is a child node of `*`, it must be enclosed in parentheses `()`.

A robust generator needs to maintain an operator precedence table. When generating a `BinaryExpression`, compare the operator precedence of the parent node and the child node. If the child node has lower precedence, automatically add parentheses to the code generated for the child node.

### 2. Code Formatting

Our generator produces compact code without any indentation. This is fine for machine execution but is a disaster for human reading. A good code generator, like Prettier, has its core complexity in deciding where to break lines, how much indentation and spaces to add according to a set of rules, to produce the most beautiful and readable code.

Implementing this usually requires passing a "state" object during recursive generation, which contains the current indentation level. When entering a `BlockStatement`, the indentation level increases by one; when exiting, it decreases by one.

```javascript
// Pseudocode
function generateBlockStatement(node, state) {
  let code = '{\n';
  state.indent++;
  code += node.body.map(child => '  '.repeat(state.indent) + generate(child, state)).join('\n');
  state.indent--;
  code += '\n' + '  '.repeat(state.indent) + '}';
  return code;
}
```

## "Round-trip Testing"

How to verify if our code generator is correct? A common and effective method is to perform "round-trip testing":

1.  **Parse**: `const ast = parse(originalCode);`
2.  **Generate**: `const generatedCode = generate(ast);`
3.  **Parse Again**: `const newAst = parse(generatedCode);`
4.  **Compare**: `assert.deepEqual(ast, newAst);`

If the original AST and the AST parsed again from the generated code are completely identical, then we can be quite confident that our code generator is correct at the syntax level (even if the formatting may differ).

## Summary

In this chapter, we completed the reverse engineering from AST to code, putting a perfect finishing touch on our `mini-acorn` project. We learned:

-   Code generation is achieved through depth-first traversal, recursively "printing" each AST node into a string.
-   By writing specialized generator functions for each node type, we can convert structured ASTs back into text code.
-   Production-grade code generators need to meticulously handle operator precedence (by adding parentheses) and code formatting (by managing indentation and line breaks).
-   "Round-trip testing" is a powerful strategy for verifying the correctness of code generators.

With this, Part Six "AST Applications" concludes. We have not only learned how to traverse ASTs but also how to convert them back into code. We now possess a complete miniature compilation toolchain!

In the upcoming Part Seven "Advanced Features," we will explore how to make our parser more powerful, flexible, and robust, such as adding a plugin system, generating Source Maps, etc. Get ready for more advanced challenges!