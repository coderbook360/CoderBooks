---
sidebar_position: 138
title: "JavascriptParser Hooks"
---

# JavascriptParser Hooks

JavascriptParser 是 Webpack 解析 JavaScript 代码的核心组件，提供了丰富的钩子来处理 AST 节点。本章深入解析 Parser Hooks。

## Parser 基础

### 获取 Parser

```typescript
compiler.hooks.normalModuleFactory.tap('MyPlugin', (nmf) => {
  // JavaScript 模块
  nmf.hooks.parser
    .for('javascript/auto')
    .tap('MyPlugin', (parser, options) => {
      setupParserHooks(parser);
    });
  
  // ESM 模块
  nmf.hooks.parser
    .for('javascript/esm')
    .tap('MyPlugin', (parser, options) => {
      setupParserHooks(parser);
    });
  
  // CommonJS 模块
  nmf.hooks.parser
    .for('javascript/dynamic')
    .tap('MyPlugin', (parser, options) => {
      setupParserHooks(parser);
    });
});
```

### Parser 状态

```typescript
// parser.state 包含当前解析状态
interface ParserState {
  current: Module;           // 当前模块
  module: Module;            // 同 current
  compilation: Compilation;   // 当前编译
  options: object;           // 解析选项
}

// 在钩子中使用
parser.hooks.program.tap('MyPlugin', (ast) => {
  const module = parser.state.current;
  console.log('Parsing:', module.resource);
});
```

## 程序级钩子

### program

```typescript
// AST 解析完成
parser.hooks.program.tap('MyPlugin', (ast, comments) => {
  console.log('AST statements:', ast.body.length);
  console.log('Comments:', comments.length);
  
  // 遍历所有顶层节点
  for (const node of ast.body) {
    console.log('Node type:', node.type);
  }
});
```

### finish

```typescript
// 模块解析完成
parser.hooks.finish.tap('MyPlugin', (ast, comments) => {
  console.log('Parsing finished');
  
  // 可以添加最终的依赖
  parser.state.current.addDependency(
    new FinalizeDependency()
  );
});
```

## 语句钩子

### statement

```typescript
// 处理任意语句
parser.hooks.statement.tap('MyPlugin', (statement) => {
  switch (statement.type) {
    case 'ExpressionStatement':
      console.log('Expression statement');
      break;
    case 'VariableDeclaration':
      console.log('Variable declaration');
      break;
    case 'FunctionDeclaration':
      console.log('Function:', statement.id.name);
      break;
  }
});
```

### blockPreWalk / preWalk / walk

```typescript
// 块级预遍历
parser.hooks.blockPreWalkStatement.tap('MyPlugin', (statement) => {
  // 在进入块之前处理
  if (statement.type === 'ClassDeclaration') {
    console.log('Class:', statement.id.name);
  }
});

// 预遍历（收集声明）
parser.hooks.preWalkStatement.tap('MyPlugin', (statement) => {
  if (statement.type === 'FunctionDeclaration') {
    console.log('Pre-walk function:', statement.id.name);
  }
});

// 主遍历
parser.hooks.walkStatement.tap('MyPlugin', (statement) => {
  // 完整遍历语句
});
```

## Import/Export 钩子

### import

```typescript
// 处理 import 语句
parser.hooks.import.tap('MyPlugin', (statement, source) => {
  console.log(`import from "${source}"`);
  
  // 返回 true 阻止默认处理
  if (source.startsWith('ignored:')) {
    return true;
  }
});
```

### importSpecifier

```typescript
// 处理具名导入
parser.hooks.importSpecifier.tap(
  'MyPlugin',
  (statement, source, exportName, identifierName) => {
    console.log(`import { ${exportName} as ${identifierName} } from "${source}"`);
    
    // exportName: 导出名（原始名）
    // identifierName: 本地名（别名后）
  }
);
```

### export

```typescript
// 处理 export 语句
parser.hooks.export.tap('MyPlugin', (statement) => {
  console.log('Export statement:', statement.type);
});
```

### exportDeclaration

```typescript
// 处理 export 声明
parser.hooks.exportDeclaration.tap('MyPlugin', (statement, declaration) => {
  if (declaration.type === 'FunctionDeclaration') {
    console.log('Exporting function:', declaration.id.name);
  }
});
```

### exportImport

```typescript
// 处理 export ... from
parser.hooks.exportImport.tap('MyPlugin', (statement, source) => {
  console.log(`export { ... } from "${source}"`);
});
```

### exportExpression

```typescript
// 处理 export default 表达式
parser.hooks.exportExpression.tap('MyPlugin', (statement, declaration) => {
  console.log('Export default:', declaration.type);
});
```

## 表达式钩子

### expression

```typescript
// 处理标识符表达式
parser.hooks.expression.for('__webpack_public_path__').tap('MyPlugin', (expr) => {
  // 替换 __webpack_public_path__
  const dep = new ConstDependency(
    JSON.stringify('/assets/'),
    expr.range
  );
  parser.state.current.addDependency(dep);
  
  return true;
});

parser.hooks.expression.for('process.env.NODE_ENV').tap('MyPlugin', (expr) => {
  const value = process.env.NODE_ENV || 'development';
  const dep = new ConstDependency(
    JSON.stringify(value),
    expr.range
  );
  parser.state.current.addDependency(dep);
  
  return true;
});
```

### expressionMemberChain

```typescript
// 处理成员链表达式
parser.hooks.expressionMemberChain
  .for('process')
  .tap('MyPlugin', (expr, members) => {
    // expr: CallExpression 或 MemberExpression
    // members: ['env', 'NODE_ENV']
    
    if (members[0] === 'env') {
      const envVar = members.slice(1).join('.');
      const value = process.env[envVar] || '';
      
      const dep = new ConstDependency(
        JSON.stringify(value),
        expr.range
      );
      parser.state.current.addDependency(dep);
      
      return true;
    }
  });
```

## 调用钩子

### call

```typescript
// 处理函数调用
parser.hooks.call.for('require').tap('MyPlugin', (expr) => {
  console.log('require() called');
  
  if (expr.arguments.length > 0) {
    const arg = parser.evaluateExpression(expr.arguments[0]);
    
    if (arg.isString()) {
      console.log('Requiring:', arg.string);
    }
  }
});

parser.hooks.call.for('define').tap('MyPlugin', (expr) => {
  // 处理 AMD define
  console.log('AMD define() called');
});

parser.hooks.call.for('myApi.fetch').tap('MyPlugin', (expr) => {
  // 处理自定义 API 调用
  console.log('myApi.fetch() called at line:', expr.loc.start.line);
});
```

### callMemberChain

```typescript
// 处理成员方法调用链
parser.hooks.callMemberChain
  .for('console')
  .tap('MyPlugin', (expr, calleeMembers, callMembers) => {
    // console.log(), console.warn() 等
    const method = calleeMembers[0];
    
    if (method === 'log' || method === 'debug') {
      // 可以移除开发日志
      const dep = new ConstDependency('', expr.range);
      parser.state.current.addDependency(dep);
      
      return true;
    }
  });
```

### new

```typescript
// 处理 new 表达式
parser.hooks.new.for('Promise').tap('MyPlugin', (expr) => {
  console.log('new Promise() at line:', expr.loc.start.line);
});

parser.hooks.new.for('Worker').tap('MyPlugin', (expr) => {
  // 处理 Web Worker
  if (expr.arguments.length > 0) {
    const arg = parser.evaluateExpression(expr.arguments[0]);
    
    if (arg.isString()) {
      console.log('Creating Worker:', arg.string);
    }
  }
});
```

## 变量声明钩子

### varDeclaration

```typescript
// 处理 var 声明
parser.hooks.varDeclaration.for('myGlobal').tap('MyPlugin', (decl) => {
  console.log('myGlobal declared');
  return true;
});
```

### varDeclarationConst / varDeclarationLet

```typescript
// const 声明
parser.hooks.varDeclarationConst.for('CONFIG').tap('MyPlugin', (decl) => {
  console.log('CONFIG constant declared');
});

// let 声明
parser.hooks.varDeclarationLet.for('state').tap('MyPlugin', (decl) => {
  console.log('state variable declared');
});
```

## 类型操作钩子

### typeof

```typescript
// 处理 typeof 操作
parser.hooks.typeof.for('__webpack_require__').tap('MyPlugin', (expr) => {
  // typeof __webpack_require__ => "function"
  const dep = new ConstDependency('"function"', expr.range);
  parser.state.current.addDependency(dep);
  
  return true;
});

parser.hooks.typeof.for('module').tap('MyPlugin', (expr) => {
  // typeof module => "object"
  const dep = new ConstDependency('"object"', expr.range);
  parser.state.current.addDependency(dep);
  
  return true;
});
```

## 求值钩子

### evaluate

```typescript
// 表达式求值
parser.hooks.evaluate.for('Identifier').tap('MyPlugin', (expr) => {
  if (expr.name === 'PRODUCTION') {
    const result = new BasicEvaluatedExpression();
    result.setBoolean(process.env.NODE_ENV === 'production');
    result.setRange(expr.range);
    return result;
  }
});

parser.hooks.evaluate.for('MemberExpression').tap('MyPlugin', (expr) => {
  // 处理 process.env.XXX
  const evaluated = parser.evaluateExpression(expr);
  
  if (evaluated.identifier === 'process.env.NODE_ENV') {
    const result = new BasicEvaluatedExpression();
    result.setString(process.env.NODE_ENV || 'development');
    result.setRange(expr.range);
    return result;
  }
});
```

### evaluateIdentifier

```typescript
parser.hooks.evaluateIdentifier.for('__DEV__').tap('MyPlugin', (expr) => {
  const result = new BasicEvaluatedExpression();
  result.setBoolean(process.env.NODE_ENV !== 'production');
  result.setRange(expr.range);
  return result;
});
```

## 实用示例

### DefinePlugin 实现

```typescript
class SimpleDefinePlugin {
  private definitions: Record<string, any>;
  
  constructor(definitions: Record<string, any>) {
    this.definitions = definitions;
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.normalModuleFactory.tap('DefinePlugin', (nmf) => {
      nmf.hooks.parser
        .for('javascript/auto')
        .tap('DefinePlugin', (parser) => {
          for (const [key, value] of Object.entries(this.definitions)) {
            this.defineExpression(parser, key, value);
          }
        });
    });
  }
  
  private defineExpression(
    parser: JavascriptParser,
    key: string,
    value: any
  ): void {
    const code = typeof value === 'function' 
      ? value.toString() 
      : JSON.stringify(value);
    
    // 处理标识符
    parser.hooks.expression.for(key).tap('DefinePlugin', (expr) => {
      const dep = new ConstDependency(code, expr.range, [key]);
      parser.state.current.addDependency(dep);
      return true;
    });
    
    // 处理 typeof
    parser.hooks.typeof.for(key).tap('DefinePlugin', (expr) => {
      const typeofValue = JSON.stringify(typeof value);
      const dep = new ConstDependency(typeofValue, expr.range);
      parser.state.current.addDependency(dep);
      return true;
    });
  }
}
```

### 导入限制插件

```typescript
class ImportRestrictionPlugin {
  private forbidden: Set<string>;
  
  constructor(forbidden: string[]) {
    this.forbidden = new Set(forbidden);
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.normalModuleFactory.tap('ImportRestriction', (nmf) => {
      nmf.hooks.parser
        .for('javascript/auto')
        .tap('ImportRestriction', (parser) => {
          parser.hooks.import.tap('ImportRestriction', (statement, source) => {
            if (this.forbidden.has(source)) {
              parser.state.current.addError(
                new WebpackError(`Import "${source}" is forbidden`)
              );
            }
          });
          
          parser.hooks.call.for('require').tap('ImportRestriction', (expr) => {
            if (expr.arguments.length > 0) {
              const arg = parser.evaluateExpression(expr.arguments[0]);
              
              if (arg.isString() && this.forbidden.has(arg.string)) {
                parser.state.current.addError(
                  new WebpackError(`Require "${arg.string}" is forbidden`)
                );
              }
            }
          });
        });
    });
  }
}
```

## 总结

JavascriptParser Hooks 的核心要点：

**程序级**：
- program：AST 解析完成
- finish：模块解析结束

**导入导出**：
- import/importSpecifier
- export/exportDeclaration

**表达式**：
- expression：标识符
- expressionMemberChain：成员链
- call/new：函数调用

**求值**：
- evaluate：表达式求值
- typeof：类型操作

**实用场景**：
- 常量替换
- 导入限制
- 代码分析

**下一章**：我们将学习内置插件的实现。
