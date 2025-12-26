---
sidebar_position: 70
title: "JavascriptParser 设计"
---

# JavascriptParser 设计

JavascriptParser 是 Webpack 的核心组件，负责解析 JavaScript 代码并提取模块依赖。

## Parser 的职责

### 核心功能

```
源代码 → AST → 依赖分析 → Dependency 对象
                ↓
        作用域分析
                ↓
        变量追踪
```

Parser 需要完成：
1. **语法解析**：将源代码转换为 AST
2. **依赖提取**：识别 import/require 语句
3. **作用域分析**：追踪变量定义和使用
4. **表达式求值**：评估常量表达式

### 在构建流程中的位置

```
NormalModule.build()
      ↓
  Loader 处理
      ↓
  Parser.parse()  ← 当前位置
      ↓
  依赖收集
      ↓
  递归处理依赖
```

## JavascriptParser 架构

### 类结构

```typescript
import { SyncBailHook, HookMap } from 'tapable';
import * as acorn from 'acorn';

class JavascriptParser {
  // Hooks 系统
  hooks: {
    // 表达式类型钩子
    expression: HookMap<SyncBailHook<[Expression], boolean | void>>;
    expressionMemberChain: HookMap<SyncBailHook<[Expression, string[]], boolean | void>>;
    
    // 语句类型钩子
    statement: SyncBailHook<[Statement], boolean | void>;
    statementIf: SyncBailHook<[IfStatement], boolean | void>;
    
    // 模块语法钩子
    import: SyncBailHook<[ImportDeclaration, string], boolean | void>;
    importSpecifier: SyncBailHook<[ImportDeclaration, string, string, string], boolean | void>;
    export: SyncBailHook<[ExportDeclaration], boolean | void>;
    
    // 函数调用钩子
    call: HookMap<SyncBailHook<[CallExpression], boolean | void>>;
    callMemberChain: HookMap<SyncBailHook<[CallExpression, string[]], boolean | void>>;
    
    // 程序钩子
    program: SyncBailHook<[Program, Comment[]], boolean | void>;
    finish: SyncBailHook<[Program, Comment[]], boolean | void>;
  };
  
  // 作用域
  scope: Scope;
  
  // 当前状态
  state: ParserState;
  
  // 源代码
  source: string;
  
  // 注释
  comments: Comment[];
  
  constructor(options: JavascriptParserOptions) {
    this.hooks = this.createHooks();
    this.initializeScope();
  }
}
```

### 解析选项

```typescript
interface JavascriptParserOptions {
  // ECMAScript 版本
  ecmaVersion?: 2015 | 2016 | 2017 | 2018 | 2019 | 2020 | 2021 | 2022 | 'latest';
  
  // 源代码类型
  sourceType?: 'script' | 'module' | 'auto';
  
  // 是否允许 await 在顶层
  allowAwaitOutsideFunction?: boolean;
  
  // 自定义表达式求值
  exprContextCritical?: boolean;
  exprContextRequest?: string;
  
  // import() 处理
  dynamicImportMode?: 'eager' | 'lazy' | 'weak' | 'lazy-once';
  dynamicImportPrefetch?: boolean | number;
  dynamicImportPreload?: boolean | number;
}
```

## parse 方法实现

### 主入口

```typescript
class JavascriptParser {
  parse(source: string, state: ParserState): ParserState {
    this.source = source;
    this.state = state;
    this.comments = [];
    
    // 1. 解析为 AST
    const ast = this.parseToAst(source);
    
    // 2. 初始化作用域
    this.scope = new Scope();
    
    // 3. 触发 program 钩子
    if (this.hooks.program.call(ast, this.comments) === undefined) {
      // 4. 预处理语句（收集声明）
      this.preWalkStatements(ast.body);
      
      // 5. 块级预处理
      this.blockPreWalkStatements(ast.body);
      
      // 6. 主遍历
      this.walkStatements(ast.body);
    }
    
    // 7. 触发 finish 钩子
    this.hooks.finish.call(ast, this.comments);
    
    return this.state;
  }
  
  parseToAst(source: string): Program {
    const comments: Comment[] = [];
    
    const ast = acorn.parse(source, {
      ecmaVersion: 'latest',
      sourceType: 'module',
      allowAwaitOutsideFunction: true,
      onComment: comments,
      locations: true,
      ranges: true,
    });
    
    this.comments = comments;
    return ast;
  }
}
```

### 三阶段遍历

```typescript
class JavascriptParser {
  // 阶段 1：预遍历 - 收集变量声明
  preWalkStatements(statements: Statement[]): void {
    for (const statement of statements) {
      this.preWalkStatement(statement);
    }
  }
  
  preWalkStatement(statement: Statement): void {
    switch (statement.type) {
      case 'VariableDeclaration':
        this.preWalkVariableDeclaration(statement);
        break;
      case 'FunctionDeclaration':
        this.preWalkFunctionDeclaration(statement);
        break;
      case 'ClassDeclaration':
        this.preWalkClassDeclaration(statement);
        break;
    }
  }
  
  // 阶段 2：块级预遍历 - 处理块级声明
  blockPreWalkStatements(statements: Statement[]): void {
    for (const statement of statements) {
      this.blockPreWalkStatement(statement);
    }
  }
  
  blockPreWalkStatement(statement: Statement): void {
    switch (statement.type) {
      case 'ImportDeclaration':
        this.blockPreWalkImportDeclaration(statement);
        break;
      case 'ExportDefaultDeclaration':
        this.blockPreWalkExportDefaultDeclaration(statement);
        break;
      case 'ExportNamedDeclaration':
        this.blockPreWalkExportNamedDeclaration(statement);
        break;
    }
  }
  
  // 阶段 3：主遍历 - 分析表达式和依赖
  walkStatements(statements: Statement[]): void {
    for (const statement of statements) {
      this.walkStatement(statement);
    }
  }
  
  walkStatement(statement: Statement): void {
    // 触发 statement 钩子
    if (this.hooks.statement.call(statement) !== undefined) {
      return;
    }
    
    switch (statement.type) {
      case 'ExpressionStatement':
        this.walkExpressionStatement(statement);
        break;
      case 'IfStatement':
        this.walkIfStatement(statement);
        break;
      case 'ForStatement':
        this.walkForStatement(statement);
        break;
      // ... 其他语句类型
    }
  }
}
```

## 表达式遍历

### 表达式处理

```typescript
class JavascriptParser {
  walkExpression(expression: Expression): void {
    switch (expression.type) {
      case 'Identifier':
        this.walkIdentifier(expression);
        break;
      case 'CallExpression':
        this.walkCallExpression(expression);
        break;
      case 'MemberExpression':
        this.walkMemberExpression(expression);
        break;
      case 'ImportExpression':
        this.walkImportExpression(expression);
        break;
      // ... 其他表达式类型
    }
  }
  
  walkCallExpression(expression: CallExpression): void {
    const callee = expression.callee;
    
    if (callee.type === 'Identifier') {
      // require('module')
      const hookResult = this.hooks.call.for(callee.name).call(expression);
      if (hookResult !== undefined) return;
    }
    
    if (callee.type === 'MemberExpression') {
      // obj.method()
      const members = this.getMemberChain(callee);
      if (members) {
        const hookResult = this.hooks.callMemberChain
          .for(members.root)
          .call(expression, members.chain);
        if (hookResult !== undefined) return;
      }
    }
    
    // 默认处理
    this.walkExpression(callee);
    for (const arg of expression.arguments) {
      this.walkExpression(arg);
    }
  }
  
  walkIdentifier(identifier: Identifier): void {
    // 检查是否是已知变量
    if (!this.scope.has(identifier.name)) {
      // 触发表达式钩子
      this.hooks.expression.for(identifier.name).call(identifier);
    }
  }
}
```

### 成员链解析

```typescript
class JavascriptParser {
  getMemberChain(expression: MemberExpression): {
    root: string;
    chain: string[];
  } | null {
    const chain: string[] = [];
    let current: Expression = expression;
    
    while (current.type === 'MemberExpression') {
      if (current.computed) {
        // obj[key] - 动态访问，无法静态分析
        return null;
      }
      
      if (current.property.type !== 'Identifier') {
        return null;
      }
      
      chain.unshift(current.property.name);
      current = current.object;
    }
    
    if (current.type !== 'Identifier') {
      return null;
    }
    
    return {
      root: current.name,
      chain,
    };
  }
}
```

## 与 Plugin 的集成

### 依赖收集 Plugin

```typescript
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    // 处理 import 声明
    parser.hooks.import.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source) => {
        parser.state.lastHarmonyImportOrder =
          (parser.state.lastHarmonyImportOrder || 0) + 1;
        
        const dep = new HarmonyImportSideEffectDependency(
          source,
          parser.state.lastHarmonyImportOrder
        );
        
        parser.state.module.addDependency(dep);
        return true;
      }
    );
    
    // 处理 import 说明符
    parser.hooks.importSpecifier.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source, exportName, localName) => {
        const dep = new HarmonyImportSpecifierDependency(
          source,
          exportName,
          localName
        );
        
        parser.state.module.addDependency(dep);
        return true;
      }
    );
  }
}
```

### require 调用 Plugin

```typescript
class CommonJsImportsParserPlugin {
  apply(parser: JavascriptParser): void {
    // 处理 require() 调用
    parser.hooks.call.for('require').tap(
      'CommonJsImportsParserPlugin',
      (expression) => {
        const arg = expression.arguments[0];
        
        if (arg.type !== 'Literal' || typeof arg.value !== 'string') {
          return;
        }
        
        const dep = new CommonJsRequireDependency(arg.value);
        parser.state.module.addDependency(dep);
        
        return true;
      }
    );
  }
}
```

## 状态管理

### ParserState

```typescript
interface ParserState {
  // 当前模块
  module: NormalModule;
  
  // 编译上下文
  compilation: Compilation;
  
  // 当前选项
  options: ParserOptions;
  
  // ESM 导入顺序
  lastHarmonyImportOrder?: number;
  
  // 当前解析的语句
  current: Statement | null;
  
  // 标记
  sideEffects?: boolean;
}
```

### 作用域管理

```typescript
class Scope {
  definitions: Map<string, VariableInfo>;
  parent: Scope | null;
  
  constructor(parent?: Scope) {
    this.definitions = new Map();
    this.parent = parent || null;
  }
  
  define(name: string, info: VariableInfo): void {
    this.definitions.set(name, info);
  }
  
  has(name: string): boolean {
    if (this.definitions.has(name)) return true;
    if (this.parent) return this.parent.has(name);
    return false;
  }
  
  get(name: string): VariableInfo | undefined {
    if (this.definitions.has(name)) {
      return this.definitions.get(name);
    }
    if (this.parent) {
      return this.parent.get(name);
    }
    return undefined;
  }
}
```

## 总结

JavascriptParser 的核心设计：

**职责分工**：
- 语法解析：使用 Acorn
- 依赖提取：通过 Hooks
- 作用域分析：内置 Scope

**三阶段遍历**：
- preWalk：收集变量声明
- blockPreWalk：处理 import/export
- walk：分析表达式和依赖

**Hooks 驱动**：
- 表达式钩子：expression, call
- 语句钩子：statement, import
- 生命周期：program, finish

**Plugin 集成**：
- 通过注册 Hooks 添加依赖
- 每种模块语法有专门的 Plugin

**下一章**：我们将深入 AST 解析与 Acorn 集成。
