---
sidebar_position: 74
title: "require 语句解析"
---

# require 语句解析

CommonJS 的 require 是 Node.js 模块系统的核心，Webpack 对其有完整的解析支持。

## require 语法形式

### 基本形式

```javascript
// 标准 require
const module = require('module-name');

// 解构 require
const { foo, bar } = require('module-name');

// 动态 require
const module = require(variable);

// 条件 require
if (condition) {
  require('module-a');
} else {
  require('module-b');
}
```

### 扩展形式

```javascript
// require.resolve - 获取模块路径
const path = require.resolve('module-name');

// require.context - Webpack 特有
const context = require.context('./dir', true, /\.js$/);

// require.ensure - 旧版代码分割（已废弃）
require.ensure(['module'], function(require) {
  const module = require('module');
});
```

## require 调用解析

### AST 结构

```typescript
// require('module')
{
  type: 'CallExpression',
  callee: {
    type: 'Identifier',
    name: 'require'
  },
  arguments: [
    {
      type: 'Literal',
      value: 'module'
    }
  ]
}

// require.resolve('module')
{
  type: 'CallExpression',
  callee: {
    type: 'MemberExpression',
    object: { type: 'Identifier', name: 'require' },
    property: { type: 'Identifier', name: 'resolve' }
  },
  arguments: [
    { type: 'Literal', value: 'module' }
  ]
}
```

### 解析实现

```typescript
class CommonJsImportsParserPlugin {
  apply(parser: JavascriptParser): void {
    // 处理 require() 调用
    parser.hooks.call.for('require').tap(
      'CommonJsImportsParserPlugin',
      (expression) => this.processRequireCall(parser, expression)
    );
    
    // 处理 require.resolve()
    parser.hooks.callMemberChain.for('require').tap(
      'CommonJsImportsParserPlugin',
      (expression, members) => {
        if (members.length === 1 && members[0] === 'resolve') {
          return this.processRequireResolve(parser, expression);
        }
      }
    );
    
    // 处理 require 表达式（不是调用）
    parser.hooks.expression.for('require').tap(
      'CommonJsImportsParserPlugin',
      (expression) => {
        // require 本身被引用
        const dep = new CommonJsRequireContextDependency(
          'require',
          expression.range
        );
        parser.state.module.addDependency(dep);
        return true;
      }
    );
  }
  
  processRequireCall(
    parser: JavascriptParser,
    expression: CallExpression
  ): boolean | void {
    if (expression.arguments.length !== 1) return;
    
    const arg = expression.arguments[0];
    const result = parser.evaluateExpression(arg);
    
    if (result.isString()) {
      // 静态 require
      const request = result.string!;
      const dep = new CommonJsRequireDependency(
        request,
        expression.range
      );
      dep.loc = expression.loc;
      dep.optional = parser.scope.inTry;
      
      parser.state.module.addDependency(dep);
      return true;
    }
    
    if (result.isConditional()) {
      // 条件 require
      for (const option of result.options) {
        if (option.isString()) {
          const dep = new CommonJsRequireDependency(
            option.string!,
            expression.range
          );
          dep.optional = true;
          parser.state.module.addDependency(dep);
        }
      }
      return true;
    }
    
    // 动态 require - 创建上下文依赖
    const dep = new CommonJsRequireContextDependency(
      expression,
      expression.range
    );
    parser.state.module.addDependency(dep);
    return true;
  }
  
  processRequireResolve(
    parser: JavascriptParser,
    expression: CallExpression
  ): boolean | void {
    if (expression.arguments.length !== 1) return;
    
    const arg = expression.arguments[0];
    const result = parser.evaluateExpression(arg);
    
    if (result.isString()) {
      const dep = new RequireResolveDependency(
        result.string!,
        expression.range
      );
      parser.state.module.addDependency(dep);
      return true;
    }
    
    // 动态 require.resolve
    const dep = new RequireResolveContextDependency(
      expression,
      expression.range
    );
    parser.state.module.addDependency(dep);
    return true;
  }
}
```

## module.exports 解析

### 语法形式

```javascript
// 导出对象
module.exports = { foo, bar };

// 导出函数
module.exports = function() {};

// 导出类
module.exports = class MyClass {};

// 属性导出
exports.foo = 1;
exports.bar = 2;

// 混合使用（注意覆盖问题）
exports.foo = 1;
module.exports = { bar: 2 };  // 覆盖了 exports
```

### 解析实现

```typescript
class CommonJsExportsParserPlugin {
  apply(parser: JavascriptParser): void {
    // module.exports = ...
    parser.hooks.assign.for('module.exports').tap(
      'CommonJsExportsParserPlugin',
      (expression) => {
        const dep = new CommonJsExportsDependency(
          expression.right.range
        );
        parser.state.module.addDependency(dep);
        
        parser.state.module.buildMeta.exportsType = 'default';
        return true;
      }
    );
    
    // exports.xxx = ...
    parser.hooks.assignMemberChain.for('exports').tap(
      'CommonJsExportsParserPlugin',
      (expression, members) => {
        if (members.length === 1) {
          const name = members[0];
          const dep = new CommonJsExportSpecifierDependency(
            name,
            expression.right.range
          );
          parser.state.module.addDependency(dep);
          
          parser.state.module.buildMeta.exportsType = 'namespace';
          return true;
        }
      }
    );
    
    // module.exports.xxx = ...
    parser.hooks.assignMemberChain.for('module.exports').tap(
      'CommonJsExportsParserPlugin',
      (expression, members) => {
        if (members.length === 1) {
          const name = members[0];
          const dep = new CommonJsExportSpecifierDependency(
            name,
            expression.right.range
          );
          parser.state.module.addDependency(dep);
          return true;
        }
      }
    );
    
    // 检测 module 和 exports 的使用
    parser.hooks.expression.for('module').tap(
      'CommonJsExportsParserPlugin',
      () => {
        parser.state.module.buildInfo.commonjs = true;
        return true;
      }
    );
    
    parser.hooks.expression.for('exports').tap(
      'CommonJsExportsParserPlugin',
      () => {
        parser.state.module.buildInfo.commonjs = true;
        return true;
      }
    );
  }
}
```

## 动态 require 处理

### require.context

```javascript
// 创建上下文
const context = require.context('./modules', true, /\.js$/);

// 使用上下文
context.keys().forEach(key => {
  const module = context(key);
});
```

```typescript
class RequireContextDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.callMemberChain.for('require').tap(
      'RequireContextDependencyParserPlugin',
      (expression, members) => {
        if (members.length !== 1 || members[0] !== 'context') return;
        
        const args = expression.arguments;
        if (args.length < 1 || args.length > 4) return;
        
        // 解析参数
        const directoryArg = parser.evaluateExpression(args[0]);
        if (!directoryArg.isString()) return;
        
        const directory = directoryArg.string!;
        
        // 可选参数
        const recursive = args[1]
          ? parser.evaluateExpression(args[1]).asBool() ?? true
          : true;
        
        const regExp = args[2]
          ? this.evaluateRegExp(parser, args[2])
          : /^\.\/.*$/;
        
        const mode = args[3]
          ? parser.evaluateExpression(args[3]).string ?? 'sync'
          : 'sync';
        
        const dep = new RequireContextDependency({
          request: directory,
          recursive,
          regExp,
          mode,
          category: 'commonjs',
        });
        
        dep.loc = expression.loc;
        dep.range = expression.range;
        parser.state.module.addDependency(dep);
        
        return true;
      }
    );
  }
}
```

### 变量 require

```javascript
// 变量作为路径
const name = 'module';
require('./' + name);

// 模板字符串
require(`./modules/${name}`);
```

```typescript
class CommonJsImportsParserPlugin {
  processContextRequire(
    parser: JavascriptParser,
    expression: CallExpression
  ): boolean | void {
    const arg = expression.arguments[0];
    
    // 分析表达式结构
    const context = this.parseContextPattern(parser, arg);
    if (!context) return;
    
    const dep = new CommonJsRequireContextDependency({
      request: context.request,
      recursive: context.recursive,
      regExp: context.regExp,
      category: 'commonjs',
    });
    
    parser.state.module.addDependency(dep);
    return true;
  }
  
  parseContextPattern(
    parser: JavascriptParser,
    expression: Expression
  ): ContextPattern | null {
    if (expression.type === 'BinaryExpression' &&
        expression.operator === '+') {
      // './prefix' + variable
      return this.parseConcatPattern(parser, expression);
    }
    
    if (expression.type === 'TemplateLiteral') {
      // `./prefix${variable}`
      return this.parseTemplatePattern(parser, expression);
    }
    
    return null;
  }
  
  parseConcatPattern(
    parser: JavascriptParser,
    expression: BinaryExpression
  ): ContextPattern | null {
    const parts: (string | null)[] = [];
    let current: Expression = expression;
    
    while (current.type === 'BinaryExpression' &&
           current.operator === '+') {
      const right = parser.evaluateExpression(current.right);
      if (right.isString()) {
        parts.unshift(right.string!);
      } else {
        parts.unshift(null); // 变量部分
      }
      current = current.left;
    }
    
    const left = parser.evaluateExpression(current);
    if (left.isString()) {
      parts.unshift(left.string!);
    } else {
      parts.unshift(null);
    }
    
    // 构建上下文请求
    const prefix = parts
      .slice(0, parts.findIndex(p => p === null))
      .join('');
    
    return {
      request: prefix || './',
      recursive: true,
      regExp: this.buildRegExp(parts),
    };
  }
}
```

## try-catch 中的 require

```typescript
class CommonJsImportsParserPlugin {
  apply(parser: JavascriptParser): void {
    // 追踪是否在 try 块中
    parser.hooks.statement.tap(
      'CommonJsImportsParserPlugin',
      (statement) => {
        if (statement.type === 'TryStatement') {
          this.walkTryStatement(parser, statement);
          return true; // 阻止默认处理
        }
      }
    );
  }
  
  walkTryStatement(
    parser: JavascriptParser,
    statement: TryStatement
  ): void {
    // 标记在 try 块中
    const previousInTry = parser.scope.inTry;
    parser.scope.inTry = true;
    
    // 遍历 try 块
    parser.walkStatement(statement.block);
    
    // 恢复状态
    parser.scope.inTry = previousInTry;
    
    // 遍历 catch 和 finally
    if (statement.handler) {
      parser.walkCatchClause(statement.handler);
    }
    if (statement.finalizer) {
      parser.walkStatement(statement.finalizer);
    }
  }
}

// try 中的 require 标记为 optional
if (parser.scope.inTry) {
  dep.optional = true;
}
```

## CommonJS 与 ESM 互操作

### 混合使用检测

```typescript
class JavascriptParser {
  detectModuleType(): 'esm' | 'commonjs' | 'auto' {
    const hasImport = this.state.harmonyImports?.size > 0;
    const hasExport = this.state.harmonyExports?.size > 0;
    const hasRequire = this.state.commonjsRequires?.size > 0;
    const hasModuleExports = this.state.commonjsExports;
    
    if ((hasImport || hasExport) && (hasRequire || hasModuleExports)) {
      // 混合使用
      this.state.module.addWarning(
        new MixedModuleWarning(
          'Mixed ESM and CommonJS syntax'
        )
      );
    }
    
    if (hasImport || hasExport) return 'esm';
    if (hasRequire || hasModuleExports) return 'commonjs';
    return 'auto';
  }
}
```

### __esModule 标记

```javascript
// Babel 转换后的代码
Object.defineProperty(exports, '__esModule', { value: true });
exports.default = foo;

// Webpack 检测
parser.hooks.call.for('Object.defineProperty').tap(
  'CommonJsPlugin',
  (expression) => {
    // 检测 __esModule 定义
    if (this.isEsModuleDefinition(expression)) {
      parser.state.module.buildMeta.exportsType = 'namespace';
    }
  }
);
```

## 总结

require 语句解析的核心要点：

**静态 require**：
- 单参数字符串字面量
- 创建 CommonJsRequireDependency
- 支持 optional 标记

**动态 require**：
- 变量或表达式作为参数
- 创建 ContextDependency
- 运行时解析

**require.context**：
- Webpack 特有语法
- 批量导入目录模块
- 支持过滤和模式匹配

**module.exports**：
- 检测导出类型
- 支持属性导出
- 处理 __esModule 标记

**下一章**：我们将学习动态 import() 解析。
