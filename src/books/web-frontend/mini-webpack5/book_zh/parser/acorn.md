---
sidebar_position: 71
title: "AST 解析与 Acorn 集成"
---

# AST 解析与 Acorn 集成

Webpack 使用 Acorn 作为 JavaScript 解析器，将源代码转换为抽象语法树（AST）。

## Acorn 简介

### 为什么选择 Acorn

```
性能比较：
- Acorn: ~100ms / 10000 行代码
- Esprima: ~150ms / 10000 行代码
- Babel Parser: ~200ms / 10000 行代码

特点：
- 轻量级（约 100KB）
- 快速
- 符合 ESTree 标准
- 可扩展的插件系统
```

### 基本用法

```typescript
import * as acorn from 'acorn';

const code = `
  import { foo } from './module';
  const bar = foo + 1;
  export default bar;
`;

const ast = acorn.parse(code, {
  ecmaVersion: 'latest',
  sourceType: 'module',
});

console.log(ast.type); // 'Program'
console.log(ast.body.length); // 3
```

## Webpack 中的 Acorn 配置

### Parser 配置选项

```typescript
class JavascriptParser {
  getAcornOptions(): acorn.Options {
    return {
      // ECMAScript 版本
      ecmaVersion: 'latest',
      
      // 模块类型
      sourceType: this.options.sourceType || 'module',
      
      // 收集注释
      onComment: this.comments,
      
      // 位置信息
      locations: true,
      ranges: true,
      
      // 允许顶层 await
      allowAwaitOutsideFunction:
        this.options.allowAwaitOutsideFunction ?? true,
      
      // 允许 hashbang
      allowHashBang: true,
      
      // 允许 import.meta
      allowImportExportEverywhere: false,
      
      // 保留括号信息
      preserveParens: false,
    };
  }
}
```

### 扩展 Acorn

```typescript
import * as acorn from 'acorn';
import acornClassFields from 'acorn-class-fields';
import acornStaticClassFeatures from 'acorn-static-class-features';
import acornPrivateMethods from 'acorn-private-methods';

// 组合插件
const Parser = acorn.Parser.extend(
  acornClassFields,
  acornStaticClassFeatures,
  acornPrivateMethods
);

const ast = Parser.parse(code, options);
```

## ESTree AST 结构

### Program 节点

```typescript
interface Program {
  type: 'Program';
  sourceType: 'script' | 'module';
  body: (Statement | ModuleDeclaration)[];
}
```

### 导入声明

```typescript
// import { foo, bar as baz } from 'module';
interface ImportDeclaration {
  type: 'ImportDeclaration';
  specifiers: ImportSpecifier[];
  source: Literal;
}

interface ImportSpecifier {
  type: 'ImportSpecifier';
  imported: Identifier;  // foo
  local: Identifier;     // foo 或 baz
}

interface ImportDefaultSpecifier {
  type: 'ImportDefaultSpecifier';
  local: Identifier;
}

interface ImportNamespaceSpecifier {
  type: 'ImportNamespaceSpecifier';
  local: Identifier;  // * as name
}
```

### 导出声明

```typescript
// export { foo, bar as baz };
interface ExportNamedDeclaration {
  type: 'ExportNamedDeclaration';
  declaration: Declaration | null;
  specifiers: ExportSpecifier[];
  source: Literal | null;
}

// export default expression;
interface ExportDefaultDeclaration {
  type: 'ExportDefaultDeclaration';
  declaration: Declaration | Expression;
}

// export * from 'module';
interface ExportAllDeclaration {
  type: 'ExportAllDeclaration';
  source: Literal;
  exported: Identifier | null;  // export * as name
}
```

### 表达式

```typescript
// require('module')
interface CallExpression {
  type: 'CallExpression';
  callee: Expression;
  arguments: Expression[];
  optional: boolean;  // 可选链 ?.()
}

// import('module')
interface ImportExpression {
  type: 'ImportExpression';
  source: Expression;
}

// obj.prop
interface MemberExpression {
  type: 'MemberExpression';
  object: Expression;
  property: Expression | Identifier;
  computed: boolean;  // obj[prop] vs obj.prop
  optional: boolean;  // 可选链 ?.
}
```

## AST 遍历实现

### 通用遍历器

```typescript
type VisitorCallback = (node: Node, parent: Node | null) => void;

function walk(
  node: Node,
  enter: VisitorCallback,
  leave?: VisitorCallback,
  parent: Node | null = null
): void {
  enter(node, parent);
  
  // 获取子节点键
  const keys = getVisitorKeys(node);
  
  for (const key of keys) {
    const child = (node as any)[key];
    
    if (Array.isArray(child)) {
      for (const item of child) {
        if (isNode(item)) {
          walk(item, enter, leave, node);
        }
      }
    } else if (isNode(child)) {
      walk(child, enter, leave, node);
    }
  }
  
  leave?.(node, parent);
}

function isNode(value: any): value is Node {
  return value && typeof value.type === 'string';
}

const VISITOR_KEYS: Record<string, string[]> = {
  Program: ['body'],
  ImportDeclaration: ['specifiers', 'source'],
  ExportNamedDeclaration: ['declaration', 'specifiers', 'source'],
  FunctionDeclaration: ['id', 'params', 'body'],
  BlockStatement: ['body'],
  IfStatement: ['test', 'consequent', 'alternate'],
  CallExpression: ['callee', 'arguments'],
  MemberExpression: ['object', 'property'],
  // ... 其他节点类型
};

function getVisitorKeys(node: Node): string[] {
  return VISITOR_KEYS[node.type] || [];
}
```

### Webpack 的遍历方式

```typescript
class JavascriptParser {
  // 不使用通用遍历器，而是显式处理每种节点
  // 这样可以精确控制处理顺序和触发 Hooks
  
  walkStatement(statement: Statement): void {
    switch (statement.type) {
      case 'BlockStatement':
        this.walkBlockStatement(statement);
        break;
      case 'ExpressionStatement':
        this.walkExpression(statement.expression);
        break;
      case 'IfStatement':
        this.walkIfStatement(statement);
        break;
      case 'ReturnStatement':
        if (statement.argument) {
          this.walkExpression(statement.argument);
        }
        break;
      case 'VariableDeclaration':
        this.walkVariableDeclaration(statement);
        break;
      case 'FunctionDeclaration':
        // 已在 preWalk 阶段处理
        break;
      // ... 其他语句类型
    }
  }
  
  walkBlockStatement(statement: BlockStatement): void {
    // 创建新作用域
    this.scope = new Scope(this.scope);
    
    // 预处理
    this.preWalkStatements(statement.body);
    this.blockPreWalkStatements(statement.body);
    
    // 主遍历
    this.walkStatements(statement.body);
    
    // 恢复作用域
    this.scope = this.scope.parent!;
  }
  
  walkIfStatement(statement: IfStatement): void {
    // 触发钩子
    const result = this.hooks.statementIf.call(statement);
    if (result !== undefined) return;
    
    // 遍历条件
    this.walkExpression(statement.test);
    
    // 遍历分支
    this.walkStatement(statement.consequent);
    if (statement.alternate) {
      this.walkStatement(statement.alternate);
    }
  }
}
```

## 位置信息处理

### 获取代码片段

```typescript
class JavascriptParser {
  source: string;
  
  getSource(node: Node): string {
    if (node.range) {
      return this.source.slice(node.range[0], node.range[1]);
    }
    if (node.start !== undefined && node.end !== undefined) {
      return this.source.slice(node.start, node.end);
    }
    throw new Error('Node has no position information');
  }
  
  getLocation(node: Node): SourceLocation | null {
    return node.loc || null;
  }
}
```

### 生成友好的错误信息

```typescript
function createError(
  message: string,
  source: string,
  node: Node
): Error {
  const loc = node.loc;
  if (!loc) {
    return new Error(message);
  }
  
  const lines = source.split('\n');
  const line = lines[loc.start.line - 1];
  const pointer = ' '.repeat(loc.start.column) + '^';
  
  return new Error(
    `${message}\n` +
    `  at line ${loc.start.line}, column ${loc.start.column}\n\n` +
    `  ${line}\n` +
    `  ${pointer}`
  );
}
```

## 注释处理

### 收集注释

```typescript
class JavascriptParser {
  comments: Comment[] = [];
  
  parseToAst(source: string): Program {
    const comments: Comment[] = [];
    
    const ast = acorn.parse(source, {
      ...this.getAcornOptions(),
      onComment: (
        block: boolean,
        text: string,
        start: number,
        end: number,
        startLoc?: Position,
        endLoc?: Position
      ) => {
        comments.push({
          type: block ? 'Block' : 'Line',
          value: text,
          start,
          end,
          loc: startLoc && endLoc ? { start: startLoc, end: endLoc } : undefined,
        });
      },
    });
    
    this.comments = comments;
    return ast;
  }
}
```

### Magic Comments 提取

```typescript
function extractMagicComments(comments: Comment[]): Map<string, string> {
  const result = new Map<string, string>();
  
  for (const comment of comments) {
    if (comment.type !== 'Block') continue;
    
    const text = comment.value.trim();
    
    // webpackChunkName: "name"
    const match = text.match(
      /webpack([A-Z][a-zA-Z]+):\s*(?:"([^"]+)"|'([^']+)'|(\S+))/
    );
    
    if (match) {
      const key = match[1].toLowerCase();
      const value = match[2] || match[3] || match[4];
      result.set(key, value);
    }
  }
  
  return result;
}

// 使用示例
// /* webpackChunkName: "my-chunk" */
// import('./module')
```

## 错误处理

### 语法错误处理

```typescript
class JavascriptParser {
  parse(source: string, state: ParserState): ParserState {
    try {
      const ast = this.parseToAst(source);
      // ... 遍历处理
    } catch (err) {
      if (err instanceof SyntaxError) {
        // 增强错误信息
        const enhanced = this.enhanceSyntaxError(err, source);
        throw enhanced;
      }
      throw err;
    }
  }
  
  enhanceSyntaxError(err: SyntaxError, source: string): Error {
    const match = err.message.match(/\((\d+):(\d+)\)/);
    if (!match) return err;
    
    const line = parseInt(match[1], 10);
    const column = parseInt(match[2], 10);
    
    const lines = source.split('\n');
    const codeLine = lines[line - 1] || '';
    const pointer = ' '.repeat(column) + '^';
    
    const enhanced = new Error(
      `JavaScript parsing error: ${err.message}\n\n` +
      `  ${line} | ${codeLine}\n` +
      `  ${' '.repeat(String(line).length)} | ${pointer}`
    );
    
    enhanced.name = 'SyntaxError';
    return enhanced;
  }
}
```

### 不支持的语法

```typescript
class JavascriptParser {
  walkExpression(expression: Expression): void {
    switch (expression.type) {
      // ... 已支持的类型
      
      default:
        // 警告但不中断
        this.state.module.addWarning(
          new UnsupportedFeatureWarning(
            `Unsupported expression type: ${expression.type}`,
            expression.loc
          )
        );
    }
  }
}
```

## 性能优化

### 懒解析

```typescript
class JavascriptParser {
  // 仅在需要时解析函数体
  walkFunctionDeclaration(declaration: FunctionDeclaration): void {
    // 函数声明已在 preWalk 处理
    // 函数体在实际调用时才分析
    
    if (this.options.analyzeAllFunctions) {
      this.walkFunctionBody(declaration);
    }
  }
  
  walkFunctionBody(fn: FunctionDeclaration | FunctionExpression): void {
    this.scope = new Scope(this.scope);
    
    // 添加参数到作用域
    for (const param of fn.params) {
      this.defineVariable(param);
    }
    
    // 遍历函数体
    this.walkStatement(fn.body);
    
    this.scope = this.scope.parent!;
  }
}
```

### 缓存 AST

```typescript
class JavascriptParser {
  private astCache = new Map<string, Program>();
  
  parseToAst(source: string): Program {
    const hash = createHash(source);
    
    if (this.astCache.has(hash)) {
      return this.astCache.get(hash)!;
    }
    
    const ast = acorn.parse(source, this.getAcornOptions());
    this.astCache.set(hash, ast);
    
    return ast;
  }
}
```

## 总结

Acorn 集成的核心要点：

**为什么用 Acorn**：
- 性能优秀
- 体积小
- ESTree 标准兼容
- 插件可扩展

**AST 结构**：
- Program：根节点
- Statement：语句
- Expression：表达式
- Declaration：声明

**遍历方式**：
- Webpack 使用显式遍历
- 精确控制处理顺序
- 支持 Hooks 触发

**位置信息**：
- locations：行列信息
- ranges：字符偏移
- 用于错误定位和代码提取

**下一章**：我们将深入 Parser Hooks 体系。
