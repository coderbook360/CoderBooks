---
sidebar_position: 73
title: "import/export 语句解析"
---

# import/export 语句解析

ES Module 的 import/export 语句是现代 JavaScript 模块化的核心，Webpack 对其有完整的解析支持。

## import 语句解析

### 语法形式

```javascript
// 默认导入
import defaultExport from 'module';

// 命名导入
import { export1, export2 } from 'module';

// 重命名导入
import { export1 as alias1 } from 'module';

// 命名空间导入
import * as name from 'module';

// 副作用导入
import 'module';

// 混合导入
import defaultExport, { export1 } from 'module';
import defaultExport, * as name from 'module';
```

### AST 结构

```typescript
// import { foo as bar } from 'module';
{
  type: 'ImportDeclaration',
  specifiers: [
    {
      type: 'ImportSpecifier',
      imported: { type: 'Identifier', name: 'foo' },
      local: { type: 'Identifier', name: 'bar' },
    }
  ],
  source: { type: 'Literal', value: 'module' },
}

// import defaultExport from 'module';
{
  type: 'ImportDeclaration',
  specifiers: [
    {
      type: 'ImportDefaultSpecifier',
      local: { type: 'Identifier', name: 'defaultExport' },
    }
  ],
  source: { type: 'Literal', value: 'module' },
}

// import * as name from 'module';
{
  type: 'ImportDeclaration',
  specifiers: [
    {
      type: 'ImportNamespaceSpecifier',
      local: { type: 'Identifier', name: 'name' },
    }
  ],
  source: { type: 'Literal', value: 'module' },
}
```

### 解析实现

```typescript
class JavascriptParser {
  blockPreWalkImportDeclaration(statement: ImportDeclaration): void {
    const source = statement.source.value as string;
    
    // 触发 import hook
    const importResult = this.hooks.import.call(statement, source);
    if (importResult !== undefined) return;
    
    // 处理每个 specifier
    for (const specifier of statement.specifiers) {
      this.blockPreWalkImportSpecifier(statement, source, specifier);
    }
  }
  
  blockPreWalkImportSpecifier(
    statement: ImportDeclaration,
    source: string,
    specifier: ImportSpecifier | ImportDefaultSpecifier | ImportNamespaceSpecifier
  ): void {
    let exportName: string;
    const localName = specifier.local.name;
    
    switch (specifier.type) {
      case 'ImportDefaultSpecifier':
        exportName = 'default';
        break;
      case 'ImportNamespaceSpecifier':
        exportName = null; // 表示整个模块
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
    
    // 在作用域中定义变量
    this.scope.define(localName, {
      type: 'import',
      source,
      exportName,
    });
  }
}
```

## export 语句解析

### 语法形式

```javascript
// 命名导出
export const foo = 1;
export function bar() {}
export class Baz {}

// 导出列表
export { foo, bar };
export { foo as alias };

// 默认导出
export default expression;
export default function() {}
export default class {}

// 重新导出
export { foo } from 'module';
export { foo as bar } from 'module';
export * from 'module';
export * as name from 'module';
```

### AST 结构

```typescript
// export const foo = 1;
{
  type: 'ExportNamedDeclaration',
  declaration: {
    type: 'VariableDeclaration',
    declarations: [
      {
        type: 'VariableDeclarator',
        id: { type: 'Identifier', name: 'foo' },
        init: { type: 'Literal', value: 1 },
      }
    ],
    kind: 'const',
  },
  specifiers: [],
  source: null,
}

// export { foo, bar as baz };
{
  type: 'ExportNamedDeclaration',
  declaration: null,
  specifiers: [
    {
      type: 'ExportSpecifier',
      local: { type: 'Identifier', name: 'foo' },
      exported: { type: 'Identifier', name: 'foo' },
    },
    {
      type: 'ExportSpecifier',
      local: { type: 'Identifier', name: 'bar' },
      exported: { type: 'Identifier', name: 'baz' },
    }
  ],
  source: null,
}

// export default 42;
{
  type: 'ExportDefaultDeclaration',
  declaration: { type: 'Literal', value: 42 },
}

// export * from 'module';
{
  type: 'ExportAllDeclaration',
  source: { type: 'Literal', value: 'module' },
  exported: null,
}

// export * as name from 'module';
{
  type: 'ExportAllDeclaration',
  source: { type: 'Literal', value: 'module' },
  exported: { type: 'Identifier', name: 'name' },
}
```

### 解析实现

```typescript
class JavascriptParser {
  blockPreWalkExportNamedDeclaration(
    statement: ExportNamedDeclaration
  ): void {
    if (statement.source) {
      // export { ... } from 'module'
      const source = statement.source.value as string;
      
      // 触发 exportImport hook
      this.hooks.exportImport.call(statement, source);
      
      // 处理每个 specifier
      for (const specifier of statement.specifiers) {
        const exportName = specifier.exported.name;
        const importName = specifier.local.name;
        
        this.hooks.exportImportSpecifier.call(
          statement,
          source,
          importName,
          exportName
        );
      }
    } else if (statement.declaration) {
      // export const/function/class ...
      this.hooks.export.call(statement);
      
      // 提取声明的名称
      const names = this.getDeclarationNames(statement.declaration);
      for (const name of names) {
        this.hooks.exportSpecifier.call(statement, name, name);
      }
      
      // 预处理声明
      this.preWalkStatement(statement.declaration);
    } else {
      // export { foo, bar }
      this.hooks.export.call(statement);
      
      for (const specifier of statement.specifiers) {
        const localName = specifier.local.name;
        const exportName = specifier.exported.name;
        
        this.hooks.exportSpecifier.call(statement, localName, exportName);
      }
    }
  }
  
  blockPreWalkExportDefaultDeclaration(
    statement: ExportDefaultDeclaration
  ): void {
    // 触发 export hook
    this.hooks.export.call(statement);
    
    const declaration = statement.declaration;
    
    if (declaration.type === 'FunctionDeclaration' ||
        declaration.type === 'ClassDeclaration') {
      // export default function foo() {} / class Foo {}
      if (declaration.id) {
        this.hooks.exportDeclaration.call(statement, declaration);
      } else {
        this.hooks.exportExpression.call(statement, declaration);
      }
    } else {
      // export default expression
      this.hooks.exportExpression.call(statement, declaration);
    }
  }
  
  blockPreWalkExportAllDeclaration(
    statement: ExportAllDeclaration
  ): void {
    const source = statement.source.value as string;
    
    if (statement.exported) {
      // export * as name from 'module'
      this.hooks.exportImport.call(statement, source);
      this.hooks.exportImportSpecifier.call(
        statement,
        source,
        null, // 导入整个模块
        statement.exported.name
      );
    } else {
      // export * from 'module'
      this.hooks.exportImport.call(statement, source);
      this.hooks.exportImportSpecifier.call(statement, source, null, null);
    }
  }
  
  getDeclarationNames(declaration: Declaration): string[] {
    switch (declaration.type) {
      case 'FunctionDeclaration':
      case 'ClassDeclaration':
        return declaration.id ? [declaration.id.name] : [];
      
      case 'VariableDeclaration':
        return declaration.declarations
          .map(d => this.getPatternNames(d.id))
          .flat();
      
      default:
        return [];
    }
  }
  
  getPatternNames(pattern: Pattern): string[] {
    switch (pattern.type) {
      case 'Identifier':
        return [pattern.name];
      
      case 'ObjectPattern':
        return pattern.properties
          .map(p => this.getPatternNames(p.value))
          .flat();
      
      case 'ArrayPattern':
        return pattern.elements
          .filter(Boolean)
          .map(e => this.getPatternNames(e))
          .flat();
      
      default:
        return [];
    }
  }
}
```

## 依赖创建

### HarmonyImportDependencyParserPlugin

```typescript
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    // 处理 import 声明
    parser.hooks.import.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source) => {
        parser.state.lastHarmonyImportOrder =
          (parser.state.lastHarmonyImportOrder || 0) + 1;
        
        // 创建副作用依赖
        const sideEffectDep = new HarmonyImportSideEffectDependency(
          source,
          parser.state.lastHarmonyImportOrder
        );
        sideEffectDep.loc = statement.loc;
        parser.state.module.addDependency(sideEffectDep);
        
        return true;
      }
    );
    
    // 处理 import specifier
    parser.hooks.importSpecifier.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source, exportName, localName) => {
        // 注册标识符信息
        parser.tagVariable(localName, 'harmony import', {
          source,
          exportName,
          order: parser.state.lastHarmonyImportOrder,
        });
        
        return true;
      }
    );
    
    // 当使用导入的变量时
    parser.hooks.expression.for('tagged').tap(
      'HarmonyImportDependencyParserPlugin',
      (expression) => {
        const tag = parser.getTagData(expression.name, 'harmony import');
        if (!tag) return;
        
        // 创建说明符依赖
        const dep = new HarmonyImportSpecifierDependency(
          tag.source,
          tag.order,
          [tag.exportName],
          expression.name,
          expression.range
        );
        
        parser.state.module.addDependency(dep);
        return true;
      }
    );
  }
}
```

### HarmonyExportDependencyParserPlugin

```typescript
class HarmonyExportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    // export { ... }
    parser.hooks.export.tap(
      'HarmonyExportDependencyParserPlugin',
      (statement) => {
        const dep = new HarmonyExportHeaderDependency(
          statement.range
        );
        parser.state.module.addDependency(dep);
      }
    );
    
    // export specifier
    parser.hooks.exportSpecifier.tap(
      'HarmonyExportDependencyParserPlugin',
      (statement, localName, exportName) => {
        const dep = new HarmonyExportSpecifierDependency(
          exportName,
          localName
        );
        dep.loc = statement.loc;
        parser.state.module.addDependency(dep);
        
        // 标记模块有这个导出
        parser.state.harmonyExports = 
          parser.state.harmonyExports || new Set();
        parser.state.harmonyExports.add(exportName);
      }
    );
    
    // export default
    parser.hooks.exportExpression.tap(
      'HarmonyExportDependencyParserPlugin',
      (statement, expression) => {
        const dep = new HarmonyExportExpressionDependency(
          expression.range,
          statement.range
        );
        parser.state.module.addDependency(dep);
        
        parser.state.harmonyExports =
          parser.state.harmonyExports || new Set();
        parser.state.harmonyExports.add('default');
      }
    );
    
    // export { ... } from 'module'
    parser.hooks.exportImportSpecifier.tap(
      'HarmonyExportDependencyParserPlugin',
      (statement, source, importName, exportName) => {
        if (importName === null && exportName === null) {
          // export * from 'module'
          const dep = new HarmonyExportImportedSpecifierDependency(
            source,
            null,
            null,
            true // export all
          );
          parser.state.module.addDependency(dep);
        } else {
          // export { name } from 'module'
          const dep = new HarmonyExportImportedSpecifierDependency(
            source,
            importName,
            exportName,
            false
          );
          parser.state.module.addDependency(dep);
        }
      }
    );
  }
}
```

## 变量追踪

### 标识符解析

```typescript
class JavascriptParser {
  tagVariable(
    name: string,
    tag: string,
    data: any
  ): void {
    const info = this.scope.get(name);
    if (info) {
      info.tag = tag;
      info.tagData = data;
    }
  }
  
  getTagData(name: string, tag: string): any {
    const info = this.scope.get(name);
    if (info && info.tag === tag) {
      return info.tagData;
    }
    return null;
  }
  
  walkIdentifier(expression: Identifier): void {
    const name = expression.name;
    const info = this.scope.get(name);
    
    if (info && info.tag === 'harmony import') {
      // 这是一个导入的变量
      const hook = this.hooks.expression.get('tagged');
      if (hook) {
        const result = hook.call(expression);
        if (result !== undefined) return;
      }
    }
    
    // 检查自由变量
    if (!info) {
      const hook = this.hooks.expression.get(name);
      if (hook) {
        hook.call(expression);
      }
    }
  }
}
```

## Live Binding 支持

```typescript
// 源代码
import { count, increment } from './counter';
console.log(count);
increment();
console.log(count);

// 转换后
var _counter = __webpack_require__('./counter');
console.log(_counter.count);
(0, _counter.increment)();
console.log(_counter.count);

// Live binding：每次访问都读取最新值
```

```typescript
class HarmonyImportSpecifierDependency extends Dependency {
  getExports(): string[] {
    return this.ids;
  }
  
  // 生成代码时保持为属性访问
  getReference(): DependencyReference {
    return new DependencyReference(
      () => this.getModule(),
      this.ids,
      false // not weak
    );
  }
}
```

## 总结

import/export 语句解析的核心要点：

**import 处理**：
- 在 blockPreWalk 阶段处理
- 创建 HarmonyImportSideEffectDependency
- 说明符定义在作用域中

**export 处理**：
- 区分命名导出、默认导出、重新导出
- 创建相应的 HarmonyExportDependency
- 记录模块的导出列表

**变量追踪**：
- 使用 tag 机制标记导入变量
- 使用时创建 HarmonyImportSpecifierDependency
- 支持 Live Binding

**依赖类型**：
- HarmonyImportSideEffectDependency
- HarmonyImportSpecifierDependency
- HarmonyExportSpecifierDependency
- HarmonyExportImportedSpecifierDependency

**下一章**：我们将学习 require 语句解析。
