# 35. AST Traversal and Visitor Pattern: Applying the Visitor Pattern

So far, we have invested significant effort in building a parser that can accurately convert JavaScript code into an Abstract Syntax Tree (AST). Now we have a structured representation of the code, but this is only the first step. A static AST itself has limited meaning—its true power lies in being "consumed"—being read, analyzed, transformed, and ultimately serving various powerful tools.

Welcome to Part Six of this book—**AST Applications**. In this part, we will shift our focus from "how to build an AST" to "how to use an AST". And the starting point for all AST applications is **Traversal**.

In this chapter, we will learn how to scientifically and efficiently "visit" the AST we have painstakingly parsed, and introduce a powerful design pattern—the **Visitor Pattern**—which will become the foundation for all our subsequent AST operations.

## Why Do We Need to Traverse AST?

Imagine you want to implement the following features:

-   **Code Minification**: Need to find all variable declarations and replace variable names (like `longVariableName`) with shorter names (like `a`).
-   **Code Transpilation**: For example, converting ES6 arrow functions to ES5 regular functions. You need to find all `ArrowFunctionExpression` nodes and replace them with `FunctionExpression` nodes.
-   **Static Analysis and Linting**: For example, checking for unused variables. You need to collect all variable declarations and variable references, then compare them.

The commonality of all these tasks is: they all require systematically examining every node in the AST, finding targets of interest, and then performing certain operations. This "systematic examination" process is AST traversal.

## Traversal Strategy: Depth-First Search (DFS)

AST is a tree, and the most natural and commonly used algorithm for traversing trees is **Depth-First Search (DFS)**. Its working method naturally aligns with the nested structure of code: starting from the root node, going deep into the deepest child nodes, and then backtracking.

For example, for the code `const a = 1;`, its simplified AST is as follows:

```json
{
  "type": "VariableDeclaration",
  "declarations": [
    {
      "type": "VariableDeclarator",
      "id": { "type": "Identifier", "name": "a" },
      "init": { "type": "Literal", "value": 1 }
    }
  ]
}
```

The depth-first traversal path would be:

1.  `VariableDeclaration`
2.  `VariableDeclarator` (entering the `declarations` array)
3.  `Identifier` (entering the `id` property)
4.  `Literal` (entering the `init` property)

## Visitor Pattern

Hardcoding processing logic directly in the traversal algorithm (like `if (node.type === 'Identifier') { ... }`) is poor design. It tightly couples "traversal logic" and "node processing logic" together, making it difficult to maintain and extend.

A better approach is to use the **Visitor Pattern**. The core idea of this pattern is **decoupling**:

-   **Traverser/Walker**: It is only responsible for one thing—how to efficiently traverse the entire tree. It doesn't care what to do with each specific node.
-   **Visitor**: It is also only responsible for one thing—defining what operations should be performed when encountering specific types of nodes. It doesn't care how the nodes are found.

We will implement a generic `traverse` function that accepts an AST and a `visitor` object, then let them work together.

```javascript
// traverse(ast, visitor);

const visitor = {
  // When encountering an Identifier node, call this function
  Identifier(node, parent) {
    console.log("Found an Identifier:", node.name);
  },
  // When encountering a FunctionDeclaration node, call this function
  FunctionDeclaration(node, parent) {
    // ...
  }
};
```

### `enter` and `exit`: Two Key Timings

In depth-first traversal, each node is actually visited twice:

1.  **Enter**: The first time the node is visited, when its child nodes have **not** been visited yet.
2.  **Exit**: When all child nodes of this node have been visited, and it's about to backtrack to the parent node.

These two timings are crucial for different tasks.

-   `enter`: Suitable for top-down information passing. For example, when entering a function scope, scope information can be passed to all internal nodes.
-   `exit`: Suitable for bottom-up operations. For example, when you want to replace a node, it's best to do it after all its child nodes have been processed to avoid affecting the traversal of child nodes.

Our `visitor` object can support this fine-grained control:

```javascript
const visitor = {
  Identifier: {
    enter(node, parent) {
      console.log('Entering Identifier:', node.name);
    },
    exit(node, parent) {
      console.log('Exiting Identifier:', node.name);
    }
  }
};
```

## Implementing the `traverse` Function

Now, let's build this core `traverse` function. It typically consists of an external entry function and an internal recursive `walk` function.

```javascript
// ast-manipulation/traverse.js (a new file)

function traverse(ast, visitor) {
  function walk(node, parent) {
    // 1. Call the visitor's enter method
    const visitorMethods = visitor[node.type];
    if (visitorMethods && visitorMethods.enter) {
      visitorMethods.enter(node, parent);
    }

    // 2. Recursively traverse child nodes
    switch (node.type) {
      case 'Program':
      case 'BlockStatement':
        node.body.forEach(child => walk(child, node));
        break;

      case 'VariableDeclaration':
        node.declarations.forEach(child => walk(child, node));
        break;

      case 'VariableDeclarator':
        walk(node.id, node);
        if (node.init) walk(node.init, node);
        break;

      case 'FunctionDeclaration':
        if (node.id) walk(node.id, node);
        node.params.forEach(param => walk(param, node));
        walk(node.body, node);
        break;

      // ... Need to add cases for all AST types that may contain child nodes

      // For leaf nodes without children, like Identifier, Literal, do nothing
      case 'Identifier':
      case 'Literal':
        break;
    }

    // 3. Call the visitor's exit method
    if (visitorMethods && visitorMethods.exit) {
      visitorMethods.exit(node, parent);
    }
  }

  walk(ast, null); // Start traversal from the root node
}
```

> **Note**: The above `switch` statement is just an example. A complete `traverse` function needs to cover all node types that contain child nodes according to the ESTree specification. Libraries like Babel and Acorn's `walk` have already done all this for us.

## Practice: Collecting All Variable Names

Suppose we want to use our newly created `traverse` function to collect all variable names declared in the code.

```javascript
import { parse } from '../src/parser';
import { traverse } from './traverse';

const code = `
  const a = 1;
  let b = 2;
  function greet() {
    var c = 3;
  }
`;

const ast = parse(code);
const declaredNames = [];

traverse(ast, {
  // We only care about VariableDeclarator nodes, as they directly hold variable names
  VariableDeclarator: {
    enter(node, parent) {
      // node.id is an Identifier node
      declaredNames.push(node.id.name);
    }
  }
});

console.log(declaredNames); // Output: ['a', 'b', 'c']
```

Look! We don't need to write any recursive code, just provide a simple `visitor` object, and we easily extract the information we want from the complex AST. This is the elegance of the Visitor Pattern.

## Summary

In this chapter, we paved the way for AST applications. We learned:

-   AST traversal is the foundation of almost all code analysis and transformation tools.
-   Depth-First Search (DFS) is the standard algorithm for traversing ASTs.
-   The Visitor Pattern is an elegant solution for implementing AST traversal, perfectly decoupling "traversal logic" from "node processing logic".
-   The `enter` and `exit` two access timings provide us with fine-grained control over the traversal process.

We implemented a simplified version of the `traverse` function by hand and used it to solve a practical problem. Now we have mastered the core technology for accessing and manipulating ASTs. In the next chapter, we will build on the achievements of this chapter to tackle a more exciting task—**code generation**, that is, how to turn AST back into executable JavaScript code.