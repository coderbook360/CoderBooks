---
sidebar_position: 72
title: "Parser Hooks 体系"
---

# Parser Hooks 体系

Parser Hooks 是 Webpack 依赖分析的核心机制，允许插件在 AST 遍历过程中注入自定义逻辑。

## Hooks 分类

### 按功能分类

```
Parser Hooks
├── 程序级 Hooks
│   ├── program          程序开始
│   └── finish           程序结束
├── 语句 Hooks
│   ├── statement        所有语句
│   ├── statementIf      if 语句
│   └── label            标签语句
├── 导入导出 Hooks
│   ├── import           import 声明
│   ├── importSpecifier  import 说明符
│   ├── export           export 声明
│   └── exportSpecifier  export 说明符
├── 表达式 Hooks
│   ├── expression       标识符表达式
│   ├── call             函数调用
│   └── callMemberChain  成员调用链
└── 变量 Hooks
    ├── varDeclaration   变量声明
    └── varDeclarationLet let 声明
```

## Hooks 实现

### Hooks 定义

```typescript
import {
  SyncBailHook,
  SyncHook,
  HookMap,
  AsyncSeriesBailHook,
} from 'tapable';

class JavascriptParser {
  hooks = {
    // 程序级
    program: new SyncBailHook<[Program, Comment[]]>(['ast', 'comments']),
    finish: new SyncHook<[Program, Comment[]]>(['ast', 'comments']),
    
    // 语句
    statement: new SyncBailHook<[Statement]>(['statement']),
    statementIf: new SyncBailHook<[IfStatement]>(['statement']),
    label: new HookMap(() => new SyncBailHook<[LabeledStatement]>(['statement'])),
    
    // 导入
    import: new SyncBailHook<[ImportDeclaration, string]>(
      ['statement', 'source']
    ),
    importSpecifier: new SyncBailHook<
      [ImportDeclaration, string, string, string]
    >(['statement', 'source', 'exportName', 'identifierName']),
    
    // 导出
    export: new SyncBailHook<[ExportDeclaration]>(['statement']),
    exportImport: new SyncBailHook<[ExportDeclaration, string]>(
      ['statement', 'source']
    ),
    exportDeclaration: new SyncBailHook<[ExportDeclaration, Declaration]>(
      ['statement', 'declaration']
    ),
    exportExpression: new SyncBailHook<[ExportDefaultDeclaration, Expression]>(
      ['statement', 'expression']
    ),
    exportSpecifier: new SyncBailHook<
      [ExportDeclaration, string, string, number | undefined]
    >(['statement', 'identifierName', 'exportName', 'index']),
    
    // 表达式 - HookMap
    expression: new HookMap(
      () => new SyncBailHook<[Expression]>(['expression'])
    ),
    expressionMemberChain: new HookMap(
      () => new SyncBailHook<[Expression, string[]]>(['expression', 'members'])
    ),
    expressionConditionalOperator: new SyncBailHook<[ConditionalExpression]>(
      ['expression']
    ),
    expressionLogicalOperator: new SyncBailHook<[LogicalExpression]>(
      ['expression']
    ),
    
    // 函数调用 - HookMap
    call: new HookMap(
      () => new SyncBailHook<[CallExpression]>(['expression'])
    ),
    callMemberChain: new HookMap(
      () => new SyncBailHook<[CallExpression, string[]]>(
        ['expression', 'members']
      )
    ),
    callMemberChainWithBindingType: new HookMap(
      () => new SyncBailHook<[CallExpression, string[], number[]]>(
        ['expression', 'members', 'bindingTypes']
      )
    ),
    
    // new 表达式
    new: new HookMap(
      () => new SyncBailHook<[NewExpression]>(['expression'])
    ),
    
    // 变量
    varDeclaration: new HookMap(
      () => new SyncBailHook<[VariableDeclaration]>(['declaration'])
    ),
    varDeclarationLet: new HookMap(
      () => new SyncBailHook<[VariableDeclaration]>(['declaration'])
    ),
    varDeclarationConst: new HookMap(
      () => new SyncBailHook<[VariableDeclaration]>(['declaration'])
    ),
    varDeclarationVar: new HookMap(
      () => new SyncBailHook<[VariableDeclaration]>(['declaration'])
    ),
    
    // 赋值
    assign: new HookMap(
      () => new SyncBailHook<[AssignmentExpression]>(['expression'])
    ),
    assigned: new HookMap(
      () => new SyncBailHook<[AssignmentExpression, any]>(
        ['expression', 'value']
      )
    ),
    
    // typeof
    typeof: new HookMap(
      () => new SyncBailHook<[UnaryExpression]>(['expression'])
    ),
    
    // 求值
    evaluate: new HookMap(
      () => new SyncBailHook<[Expression]>(['expression'])
    ),
    evaluateIdentifier: new HookMap(
      () => new SyncBailHook<[Identifier]>(['expression'])
    ),
    evaluateCallExpression: new HookMap(
      () => new SyncBailHook<[CallExpression]>(['expression'])
    ),
    
    // 模式
    pattern: new HookMap(
      () => new SyncBailHook<[Pattern]>(['pattern'])
    ),
    
    // 预处理
    preStatement: new SyncBailHook<[Statement]>(['statement']),
    blockPreStatement: new SyncBailHook<[Statement]>(['statement']),
    
    // 顶层 this
    topLevelAwait: new SyncBailHook<[AwaitExpression]>(['expression']),
  };
}
```

## HookMap 使用

### 为什么使用 HookMap

```typescript
// 不用 HookMap - 需要在回调中判断
parser.hooks.call.tap('Plugin', (expression) => {
  if (expression.callee.name === 'require') {
    // 处理 require
  }
  if (expression.callee.name === '__webpack_require__') {
    // 处理 __webpack_require__
  }
});

// 使用 HookMap - 直接按名称注册
parser.hooks.call.for('require').tap('Plugin', (expression) => {
  // 只处理 require
});

parser.hooks.call.for('__webpack_require__').tap('Plugin', (expression) => {
  // 只处理 __webpack_require__
});
```

### HookMap 实现

```typescript
class HookMap<H extends Hook> {
  private _map = new Map<string, H>();
  private _factory: () => H;
  
  constructor(factory: () => H) {
    this._factory = factory;
  }
  
  for(key: string): H {
    let hook = this._map.get(key);
    if (!hook) {
      hook = this._factory();
      this._map.set(key, hook);
    }
    return hook;
  }
  
  get(key: string): H | undefined {
    return this._map.get(key);
  }
}
```

## Hooks 触发时机

### 程序级 Hooks

```typescript
class JavascriptParser {
  parse(source: string, state: ParserState): ParserState {
    const ast = this.parseToAst(source);
    
    // 触发 program hook
    if (this.hooks.program.call(ast, this.comments) === undefined) {
      this.preWalkStatements(ast.body);
      this.blockPreWalkStatements(ast.body);
      this.walkStatements(ast.body);
    }
    
    // 触发 finish hook
    this.hooks.finish.call(ast, this.comments);
    
    return this.state;
  }
}
```

### 导入 Hooks

```typescript
class JavascriptParser {
  blockPreWalkImportDeclaration(statement: ImportDeclaration): void {
    const source = statement.source.value as string;
    
    // 触发 import hook
    if (this.hooks.import.call(statement, source) !== undefined) {
      return;
    }
    
    // 处理每个说明符
    for (const specifier of statement.specifiers) {
      let exportName: string;
      let localName: string = specifier.local.name;
      
      switch (specifier.type) {
        case 'ImportDefaultSpecifier':
          exportName = 'default';
          break;
        case 'ImportNamespaceSpecifier':
          exportName = '*';
          break;
        case 'ImportSpecifier':
          exportName = specifier.imported.name;
          break;
      }
      
      // 触发 importSpecifier hook
      this.hooks.importSpecifier.call(
        statement,
        source,
        exportName,
        localName
      );
    }
  }
}
```

### 表达式 Hooks

```typescript
class JavascriptParser {
  walkIdentifier(expression: Identifier): void {
    const name = expression.name;
    
    // 检查是否是局部变量
    if (!this.scope.has(name)) {
      // 触发 expression hook
      const hook = this.hooks.expression.get(name);
      if (hook) {
        const result = hook.call(expression);
        if (result !== undefined) return;
      }
    }
  }
  
  walkCallExpression(expression: CallExpression): void {
    const callee = expression.callee;
    
    if (callee.type === 'Identifier') {
      // 触发 call hook
      const hook = this.hooks.call.get(callee.name);
      if (hook) {
        const result = hook.call(expression);
        if (result !== undefined) return;
      }
    }
    
    if (callee.type === 'MemberExpression') {
      const members = this.getMemberChain(callee);
      if (members) {
        // 触发 callMemberChain hook
        const hook = this.hooks.callMemberChain.get(members.root);
        if (hook) {
          const result = hook.call(expression, members.chain);
          if (result !== undefined) return;
        }
      }
    }
    
    // 默认处理
    this.walkExpression(callee);
    for (const arg of expression.arguments) {
      this.walkExpression(arg);
    }
  }
}
```

## 常用 Plugin 示例

### CommonJS 依赖解析

```typescript
class CommonJsImportsParserPlugin {
  apply(parser: JavascriptParser): void {
    // require('module')
    parser.hooks.call.for('require').tap(
      'CommonJsImportsParserPlugin',
      (expression) => {
        return this.processRequireCall(parser, expression);
      }
    );
    
    // require.resolve('module')
    parser.hooks.callMemberChain.for('require').tap(
      'CommonJsImportsParserPlugin',
      (expression, members) => {
        if (members.length === 1 && members[0] === 'resolve') {
          return this.processRequireResolve(parser, expression);
        }
      }
    );
    
    // module.exports = ...
    parser.hooks.expression.for('module').tap(
      'CommonJsImportsParserPlugin',
      (expression) => {
        // 标记使用了 CommonJS
        parser.state.module.buildInfo.commonjs = true;
      }
    );
  }
  
  processRequireCall(
    parser: JavascriptParser,
    expression: CallExpression
  ): boolean | void {
    if (expression.arguments.length !== 1) return;
    
    const arg = expression.arguments[0];
    if (arg.type !== 'Literal') return;
    
    const request = String(arg.value);
    const dep = new CommonJsRequireDependency(request, expression.range);
    
    parser.state.module.addDependency(dep);
    return true;
  }
}
```

### ESM 依赖解析

```typescript
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    // import ... from 'module'
    parser.hooks.import.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source) => {
        parser.state.lastHarmonyImportOrder =
          (parser.state.lastHarmonyImportOrder || 0) + 1;
        
        const dep = new HarmonyImportSideEffectDependency(
          source,
          parser.state.lastHarmonyImportOrder,
          statement.range
        );
        
        parser.state.module.addDependency(dep);
        return true;
      }
    );
    
    // import { foo } from 'module'
    parser.hooks.importSpecifier.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source, exportName, localName) => {
        // 在作用域中定义变量
        parser.scope.define(localName, {
          type: 'import',
          source,
          exportName,
        });
        return true;
      }
    );
    
    // 使用导入的变量
    parser.hooks.expression.for('*').tap(
      'HarmonyImportDependencyParserPlugin',
      (expression) => {
        // 为所有标识符设置通配监听
      }
    );
  }
}
```

### 动态导入解析

```typescript
class ImportParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.importCall = new SyncBailHook(['expression']);
    
    // import() 表达式
    parser.hooks.call.for('import').tap(
      'ImportParserPlugin',
      (expression) => {
        if (expression.arguments.length !== 1) return;
        
        const arg = expression.arguments[0];
        
        // 提取 magic comments
        const comments = parser.getCommentsBefore(expression);
        const options = extractMagicComments(comments);
        
        if (arg.type === 'Literal') {
          // 静态导入路径
          const dep = new ImportDependency(
            String(arg.value),
            expression.range,
            options
          );
          parser.state.module.addDependency(dep);
        } else {
          // 动态导入路径
          const dep = new ImportContextDependency(
            expression,
            options
          );
          parser.state.module.addDependency(dep);
        }
        
        return true;
      }
    );
  }
}
```

## 求值 Hooks

### evaluate Hook

```typescript
class JavascriptParser {
  evaluateExpression(expression: Expression): BasicEvaluatedExpression {
    // 尝试使用插件求值
    const hook = this.hooks.evaluate.get(expression.type);
    if (hook) {
      const result = hook.call(expression);
      if (result !== undefined) return result;
    }
    
    // 内置求值
    switch (expression.type) {
      case 'Literal':
        return new BasicEvaluatedExpression()
          .setLiteral(expression.value)
          .setRange(expression.range);
      
      case 'BinaryExpression':
        return this.evaluateBinaryExpression(expression);
      
      case 'TemplateLiteral':
        return this.evaluateTemplateLiteral(expression);
      
      // ...
    }
    
    return new BasicEvaluatedExpression().setRange(expression.range);
  }
}

// 使用示例
class ConstPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.evaluate.for('Identifier').tap(
      'ConstPlugin',
      (expression) => {
        if (expression.name === '__DEV__') {
          return new BasicEvaluatedExpression()
            .setBoolean(process.env.NODE_ENV === 'development')
            .setRange(expression.range);
        }
      }
    );
  }
}
```

## 总结

Parser Hooks 体系的核心概念：

**Hook 类型**：
- SyncBailHook：同步熔断
- HookMap：按名称分发

**主要 Hooks**：
- program/finish：程序生命周期
- import/export：模块语法
- call/expression：表达式处理
- evaluate：常量求值

**使用模式**：
- Plugin 注册 Hooks
- Parser 遍历时触发
- 返回非 undefined 中断默认处理

**最佳实践**：
- 使用 HookMap 精确匹配
- 及时返回终止默认处理
- 依赖添加在 Hook 回调中完成

**下一章**：我们将学习 import/export 语句解析。
