---
sidebar_position: 77
title: "作用域分析与变量追踪"
---

# 作用域分析与变量追踪

作用域分析是 Parser 的核心能力，用于追踪变量的定义和使用，支撑依赖分析和 Tree Shaking。

## 作用域基础

### JavaScript 作用域类型

```javascript
// 1. 全局作用域
var globalVar = 1;

// 2. 函数作用域
function foo() {
  var functionVar = 2;
}

// 3. 块级作用域
{
  let blockVar = 3;
  const blockConst = 4;
}

// 4. 模块作用域
import { something } from './module';
export const moduleExport = 5;
```

### Scope 类实现

```typescript
interface VariableInfo {
  // 变量类型
  type: 'var' | 'let' | 'const' | 'function' | 'class' | 'parameter' | 'import';
  
  // 声明节点
  declaration?: Node;
  
  // 标签（用于依赖追踪）
  tag?: string;
  tagData?: any;
  
  // 是否被使用
  used?: boolean;
  
  // 使用位置
  usedBy?: Set<Node>;
}

class Scope {
  // 变量定义
  definitions: Map<string, VariableInfo>;
  
  // 父作用域
  parent: Scope | null;
  
  // 作用域类型
  type: 'function' | 'block' | 'module';
  
  // 是否在 try 块中
  inTry: boolean;
  
  constructor(parent?: Scope, type: Scope['type'] = 'block') {
    this.definitions = new Map();
    this.parent = parent || null;
    this.type = type;
    this.inTry = parent?.inTry || false;
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
  
  isLocal(name: string): boolean {
    return this.definitions.has(name);
  }
}
```

## 变量声明收集

### PreWalk 阶段

```typescript
class JavascriptParser {
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
  
  preWalkVariableDeclaration(statement: VariableDeclaration): void {
    const kind = statement.kind; // 'var' | 'let' | 'const'
    
    for (const declarator of statement.declarations) {
      this.defineVariable(declarator.id, {
        type: kind as 'var' | 'let' | 'const',
        declaration: declarator,
      });
    }
  }
  
  preWalkFunctionDeclaration(statement: FunctionDeclaration): void {
    if (statement.id) {
      this.scope.define(statement.id.name, {
        type: 'function',
        declaration: statement,
      });
    }
  }
  
  preWalkClassDeclaration(statement: ClassDeclaration): void {
    if (statement.id) {
      this.scope.define(statement.id.name, {
        type: 'class',
        declaration: statement,
      });
    }
  }
  
  defineVariable(pattern: Pattern, info: Partial<VariableInfo>): void {
    switch (pattern.type) {
      case 'Identifier':
        this.scope.define(pattern.name, info as VariableInfo);
        break;
      
      case 'ObjectPattern':
        for (const property of pattern.properties) {
          if (property.type === 'RestElement') {
            this.defineVariable(property.argument, info);
          } else {
            this.defineVariable(property.value, info);
          }
        }
        break;
      
      case 'ArrayPattern':
        for (const element of pattern.elements) {
          if (element) {
            if (element.type === 'RestElement') {
              this.defineVariable(element.argument, info);
            } else {
              this.defineVariable(element, info);
            }
          }
        }
        break;
      
      case 'AssignmentPattern':
        this.defineVariable(pattern.left, info);
        break;
    }
  }
}
```

### var 提升处理

```typescript
class JavascriptParser {
  // var 声明会提升到函数作用域
  preWalkVariableDeclaration(statement: VariableDeclaration): void {
    if (statement.kind === 'var') {
      // 找到最近的函数作用域
      let scope = this.scope;
      while (scope.type === 'block' && scope.parent) {
        scope = scope.parent;
      }
      
      for (const declarator of statement.declarations) {
        this.defineVariableInScope(scope, declarator.id, {
          type: 'var',
          declaration: declarator,
        });
      }
    } else {
      // let/const 在当前块作用域
      for (const declarator of statement.declarations) {
        this.defineVariable(declarator.id, {
          type: statement.kind as 'let' | 'const',
          declaration: declarator,
        });
      }
    }
  }
  
  defineVariableInScope(
    scope: Scope,
    pattern: Pattern,
    info: VariableInfo
  ): void {
    const names = this.getPatternNames(pattern);
    for (const name of names) {
      scope.define(name, info);
    }
  }
}
```

## 作用域进入与退出

### 函数作用域

```typescript
class JavascriptParser {
  walkFunctionDeclaration(declaration: FunctionDeclaration): void {
    // 函数名已在 preWalk 定义
    this.walkFunction(declaration);
  }
  
  walkFunction(
    fn: FunctionDeclaration | FunctionExpression | ArrowFunctionExpression
  ): void {
    // 创建函数作用域
    const previousScope = this.scope;
    this.scope = new Scope(previousScope, 'function');
    
    // 添加参数到作用域
    for (const param of fn.params) {
      this.defineVariable(param, {
        type: 'parameter',
      });
    }
    
    // 处理函数体
    if (fn.body.type === 'BlockStatement') {
      // 正常函数体
      this.preWalkStatements(fn.body.body);
      this.blockPreWalkStatements(fn.body.body);
      this.walkStatements(fn.body.body);
    } else {
      // 箭头函数表达式体
      this.walkExpression(fn.body);
    }
    
    // 恢复作用域
    this.scope = previousScope;
  }
}
```

### 块级作用域

```typescript
class JavascriptParser {
  walkBlockStatement(statement: BlockStatement): void {
    // 创建块作用域
    const previousScope = this.scope;
    this.scope = new Scope(previousScope, 'block');
    
    // 处理语句
    this.preWalkStatements(statement.body);
    this.blockPreWalkStatements(statement.body);
    this.walkStatements(statement.body);
    
    // 恢复作用域
    this.scope = previousScope;
  }
  
  walkForStatement(statement: ForStatement): void {
    const previousScope = this.scope;
    this.scope = new Scope(previousScope, 'block');
    
    if (statement.init) {
      if (statement.init.type === 'VariableDeclaration') {
        this.preWalkVariableDeclaration(statement.init);
        this.walkVariableDeclaration(statement.init);
      } else {
        this.walkExpression(statement.init);
      }
    }
    
    if (statement.test) {
      this.walkExpression(statement.test);
    }
    
    if (statement.update) {
      this.walkExpression(statement.update);
    }
    
    this.walkStatement(statement.body);
    
    this.scope = previousScope;
  }
}
```

## 变量使用追踪

### 标识符解析

```typescript
class JavascriptParser {
  walkIdentifier(expression: Identifier): void {
    const name = expression.name;
    
    // 检查是否是已定义的变量
    const info = this.scope.get(name);
    
    if (info) {
      // 标记为已使用
      info.used = true;
      info.usedBy = info.usedBy || new Set();
      info.usedBy.add(expression);
      
      // 检查是否有特殊标签
      if (info.tag) {
        const hook = this.hooks.expression.get(info.tag);
        if (hook) {
          const result = hook.call(expression);
          if (result !== undefined) return;
        }
      }
    } else {
      // 自由变量（未在当前模块定义）
      this.walkFreeVariable(name, expression);
    }
  }
  
  walkFreeVariable(name: string, expression: Identifier): void {
    // 触发表达式 hook
    const hook = this.hooks.expression.get(name);
    if (hook) {
      const result = hook.call(expression);
      if (result !== undefined) return;
    }
    
    // 记录自由变量
    this.state.freeVariables = this.state.freeVariables || new Set();
    this.state.freeVariables.add(name);
  }
}
```

### Tag 机制

```typescript
class JavascriptParser {
  // 给变量打标签
  tagVariable(name: string, tag: string, data?: any): void {
    const info = this.scope.get(name);
    if (info) {
      info.tag = tag;
      info.tagData = data;
    }
  }
  
  // 获取标签数据
  getTagData(name: string, tag: string): any {
    const info = this.scope.get(name);
    if (info && info.tag === tag) {
      return info.tagData;
    }
    return null;
  }
  
  // 取消标签
  untagVariable(name: string): void {
    const info = this.scope.get(name);
    if (info) {
      delete info.tag;
      delete info.tagData;
    }
  }
}

// 使用示例
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.importSpecifier.tap('Plugin', (statement, source, exportName, localName) => {
      // 给导入的变量打标签
      parser.tagVariable(localName, 'harmony import', {
        source,
        exportName,
      });
    });
    
    // 当使用导入变量时
    parser.hooks.expression.for('harmony import').tap('Plugin', (expression) => {
      const data = parser.getTagData(expression.name, 'harmony import');
      // 创建依赖
      const dep = new HarmonyImportSpecifierDependency(
        data.source,
        data.exportName,
        expression.range
      );
      parser.state.module.addDependency(dep);
    });
  }
}
```

## 闭包分析

### 捕获的变量

```typescript
class JavascriptParser {
  walkFunction(fn: FunctionExpression | ArrowFunctionExpression): void {
    const capturedVariables = new Set<string>();
    const previousScope = this.scope;
    
    this.scope = new Scope(previousScope, 'function');
    
    // 记录进入函数时的作用域链
    const outerScope = previousScope;
    
    // 自定义标识符处理器
    const originalWalkIdentifier = this.walkIdentifier.bind(this);
    this.walkIdentifier = (expression: Identifier) => {
      const name = expression.name;
      
      // 检查是否是从外部作用域捕获
      if (!this.scope.isLocal(name) && outerScope.has(name)) {
        capturedVariables.add(name);
      }
      
      originalWalkIdentifier(expression);
    };
    
    // 遍历函数体
    this.walkFunctionBody(fn);
    
    // 恢复
    this.walkIdentifier = originalWalkIdentifier;
    this.scope = previousScope;
    
    // 记录捕获的变量
    if (capturedVariables.size > 0) {
      this.state.module.buildInfo.capturedVariables =
        this.state.module.buildInfo.capturedVariables || new Map();
      this.state.module.buildInfo.capturedVariables.set(fn, capturedVariables);
    }
  }
}
```

## 导出变量追踪

### 追踪导出使用

```typescript
class JavascriptParser {
  trackExportUsage(): void {
    // 收集所有导出
    const exports = this.state.harmonyExports || new Set();
    
    // 遍历代码时追踪导出变量的使用
    for (const exportName of exports) {
      const info = this.scope.get(exportName);
      if (info) {
        // 检查导出是否被使用
        if (info.used) {
          this.state.usedExports.add(exportName);
        }
      }
    }
  }
}

// Tree Shaking 使用
class Compilation {
  analyzeUsedExports(module: Module): Set<string> {
    const usedExports = new Set<string>();
    
    // 收集被其他模块引用的导出
    for (const connection of this.moduleGraph.getIncomingConnections(module)) {
      const dep = connection.dependency;
      
      if (dep instanceof HarmonyImportSpecifierDependency) {
        // 该模块的某个导出被使用
        usedExports.add(dep.ids[0]);
      }
    }
    
    return usedExports;
  }
}
```

## 内置变量处理

### 识别全局变量

```typescript
const WEBPACK_BUILTINS = new Set([
  '__webpack_require__',
  '__webpack_exports__',
  '__webpack_module__',
  '__dirname',
  '__filename',
  '__resourceQuery',
  '__webpack_public_path__',
  '__webpack_base_uri__',
  '__webpack_nonce__',
  '__webpack_hash__',
  '__webpack_get_script_filename__',
]);

const BROWSER_BUILTINS = new Set([
  'window',
  'document',
  'navigator',
  'location',
  'console',
  'fetch',
  'XMLHttpRequest',
  // ...
]);

const NODE_BUILTINS = new Set([
  'process',
  'Buffer',
  'global',
  '__dirname',
  '__filename',
  'module',
  'exports',
  'require',
  // ...
]);

class JavascriptParser {
  isBuiltinVariable(name: string): boolean {
    if (WEBPACK_BUILTINS.has(name)) return true;
    
    if (this.options.target === 'web') {
      return BROWSER_BUILTINS.has(name);
    }
    
    if (this.options.target === 'node') {
      return NODE_BUILTINS.has(name);
    }
    
    return false;
  }
}
```

## 总结

作用域分析与变量追踪的核心要点：

**作用域层次**：
- 模块作用域（顶层）
- 函数作用域
- 块级作用域

**变量收集**：
- PreWalk 阶段收集声明
- var 提升到函数作用域
- let/const 在块作用域

**变量追踪**：
- 使用标记
- Tag 机制
- 闭包捕获分析

**自由变量**：
- 未在当前模块定义
- 触发 expression hook
- 可能是全局变量或导入变量

**应用场景**：
- 依赖分析
- Tree Shaking
- 代码转换

**下一章**：我们将学习 Magic Comments 解析。
