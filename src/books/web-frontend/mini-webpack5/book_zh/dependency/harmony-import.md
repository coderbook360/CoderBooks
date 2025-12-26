---
sidebar_position: 83
title: "HarmonyImportDependency ESM 导入依赖"
---

# HarmonyImportDependency ESM 导入依赖

HarmonyImportDependency 系列是处理 ES Module 导入语法的核心依赖类型。

## ESM 导入语法

### 导入形式

```javascript
// 1. 命名导入
import { foo, bar } from './module';

// 2. 默认导入
import defaultExport from './module';

// 3. 命名空间导入
import * as ns from './module';

// 4. 副作用导入
import './module';

// 5. 混合导入
import defaultExport, { foo } from './module';

// 6. 别名导入
import { foo as myFoo } from './module';
```

### 对应的依赖类型

```
import 语句
    ↓
HarmonyImportSideEffectDependency (每个 import 语句一个)
    +
HarmonyImportSpecifierDependency (每个导入标识符一个)
```

## HarmonyImportSideEffectDependency

### 类实现

```typescript
class HarmonyImportSideEffectDependency extends ModuleDependency {
  // 导入顺序（用于保持副作用执行顺序）
  sourceOrder: number;
  
  constructor(request: string, sourceOrder: number) {
    super(request);
    this.sourceOrder = sourceOrder;
  }
  
  get type(): string {
    return 'harmony side effect evaluation';
  }
  
  get category(): string {
    return 'esm';
  }
  
  // 副作用导入不引用任何导出
  getReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): string[][] {
    return Dependency.NO_EXPORTS_REFERENCED;
  }
}
```

### 创建时机

```typescript
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    let sourceOrder = 0;
    
    // 清理源顺序计数器
    parser.hooks.program.tap('HarmonyImportDependencyParserPlugin', () => {
      sourceOrder = 0;
    });
    
    parser.hooks.import.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source) => {
        const dep = new HarmonyImportSideEffectDependency(
          source,
          sourceOrder++
        );
        dep.loc = statement.loc;
        parser.state.module.addDependency(dep);
        
        // 阻止默认处理
        return true;
      }
    );
  }
}
```

## HarmonyImportSpecifierDependency

### 类实现

```typescript
class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
  // 导入的 ID 路径（如 ['default'] 或 ['foo', 'bar']）
  ids: string[];
  
  // 本地变量名
  name: string;
  
  // 是否在 call 表达式中使用（影响 this 绑定）
  call: boolean;
  
  // 是否直接 call（不需要检查是否是函数）
  directImport: boolean;
  
  // 短路条件
  shorthand: boolean;
  
  constructor(
    request: string,
    sourceOrder: number,
    ids: string[],
    name: string,
    range: [number, number],
    call: boolean = false,
    directImport: boolean = true
  ) {
    super(request, sourceOrder);
    this.ids = ids;
    this.name = name;
    this.range = range;
    this.call = call;
    this.directImport = directImport;
    this.shorthand = false;
  }
  
  get type(): string {
    return 'harmony import specifier';
  }
  
  // 返回引用的导出路径
  getReferencedExports(moduleGraph: ModuleGraph): string[][] {
    return [this.ids];
  }
}
```

### 导入说明符处理

```typescript
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    // 处理导入说明符
    parser.hooks.importSpecifier.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source, id, name) => {
        // id: 导入的标识符（'default', 'foo' 等）
        // name: 本地变量名
        
        // 创建变量标签
        parser.tagVariable(name, 'harmony import', {
          source,
          ids: id === 'default' ? ['default'] : [id],
          sourceOrder: this.getSourceOrder(source),
        });
        
        return true;
      }
    );
    
    // 变量使用时创建依赖
    parser.hooks.expression
      .for('harmony import')
      .tap('HarmonyImportDependencyParserPlugin', (expression, info) => {
        const dep = new HarmonyImportSpecifierDependency(
          info.source,
          info.sourceOrder,
          info.ids,
          info.name,
          expression.range,
          false,  // 不是 call
          true    // 直接导入
        );
        dep.loc = expression.loc;
        
        parser.state.module.addDependency(dep);
        
        return true;
      });
  }
}
```

## 命名空间导入

### 实现方式

```typescript
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.importSpecifier.tap(
      'HarmonyImportDependencyParserPlugin',
      (statement, source, id, name) => {
        // 命名空间导入：import * as ns from './mod'
        if (id === null) {
          parser.tagVariable(name, 'harmony import', {
            source,
            ids: [],  // 空数组表示命名空间
            sourceOrder: this.getSourceOrder(source),
          });
        }
        
        return true;
      }
    );
  }
}

// 命名空间访问
// ns.foo => ids = ['foo']
parser.hooks.memberChain
  .for('harmony import')
  .tap('HarmonyImportDependencyParserPlugin', (expression, members, info) => {
    // 合并访问路径
    const ids = info.ids.concat(members);
    
    const dep = new HarmonyImportSpecifierDependency(
      info.source,
      info.sourceOrder,
      ids,
      expression.property.name,
      expression.range
    );
    
    parser.state.module.addDependency(dep);
    
    return true;
  });
```

## Call 表达式处理

### this 绑定问题

```javascript
// 问题：直接调用导入的函数可能丢失 this
import { method } from './obj';
method();  // this 是 undefined

// 对比：方法调用保持 this
import * as obj from './obj';
obj.method();  // this 是 obj
```

### 实现处理

```typescript
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.call
      .for('harmony import')
      .tap('HarmonyImportDependencyParserPlugin', (expression, info) => {
        const dep = new HarmonyImportSpecifierDependency(
          info.source,
          info.sourceOrder,
          info.ids,
          info.name,
          expression.callee.range,
          true,  // 是 call 表达式
          true
        );
        
        parser.state.module.addDependency(dep);
        
        // 继续处理参数
        return undefined;
      });
  }
}

// 代码生成时处理
class HarmonyImportSpecifierDependencyTemplate {
  apply(dep: HarmonyImportSpecifierDependency, source: ReplaceSource): void {
    const exportExpr = this.getExportExpression(dep);
    
    if (dep.call && dep.ids.length > 0) {
      // 包装以保持 this
      // foo() => (0, foo)()
      source.replace(
        dep.range[0],
        dep.range[1] - 1,
        `(0, ${exportExpr})`
      );
    } else {
      source.replace(dep.range[0], dep.range[1] - 1, exportExpr);
    }
  }
}
```

## 引用追踪

### getReferencedExports

```typescript
class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
  getReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): (string[] | ReferencedExport)[] {
    let ids = this.ids;
    
    // 检查是否重导出
    const connection = moduleGraph.getConnection(this);
    if (!connection) return [ids];
    
    const module = connection.module;
    if (!module) return [ids];
    
    // 解析导出信息
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    // 如果是星号重导出，需要追踪到原始模块
    if (ids.length === 0) {
      // import * as ns
      return Dependency.EXPORTS_OBJECT_REFERENCED;
    }
    
    // 返回实际引用的导出路径
    return [ids];
  }
}
```

### 使用状态影响

```typescript
class HarmonyImportSpecifierDependency extends HarmonyImportDependency {
  // 获取条件函数
  getCondition(moduleGraph: ModuleGraph): ConnectionCondition | null {
    return (connection, runtime) => {
      // 检查这个导入是否被使用
      const module = moduleGraph.getParentModule(this);
      if (!module) return ConnectionState.ACTIVE;
      
      // 如果导入的变量从未被使用，连接可以是非活跃的
      if (this.weak) return ConnectionState.CONDITIONAL;
      
      return ConnectionState.ACTIVE;
    };
  }
}
```

## 代码生成

### Template 实现

```typescript
class HarmonyImportSpecifierDependencyTemplate extends DependencyTemplate {
  apply(
    dep: HarmonyImportSpecifierDependency,
    source: ReplaceSource,
    runtime: RuntimeState
  ): void {
    const { moduleGraph, module } = runtime;
    const connection = moduleGraph.getConnection(dep);
    
    if (!connection) {
      // 未解析，替换为 undefined
      source.replace(dep.range[0], dep.range[1] - 1, 'undefined');
      return;
    }
    
    const importedModule = connection.module;
    
    // 生成访问表达式
    const exportExpr = this.getExportExpression(
      dep,
      importedModule,
      runtime
    );
    
    // 处理 call 和 shorthand
    let code = exportExpr;
    
    if (dep.call) {
      code = `(0, ${exportExpr})`;
    }
    
    if (dep.shorthand) {
      code = `${dep.name}: ${code}`;
    }
    
    source.replace(dep.range[0], dep.range[1] - 1, code);
  }
  
  getExportExpression(
    dep: HarmonyImportSpecifierDependency,
    module: Module,
    runtime: RuntimeState
  ): string {
    const { moduleGraph, chunkGraph } = runtime;
    const ids = dep.ids;
    
    // 获取模块引用
    const moduleExpr = this.getModuleExpr(module, runtime);
    
    if (ids.length === 0) {
      // 命名空间导入
      return moduleExpr;
    }
    
    // 获取导出信息
    const exportsInfo = moduleGraph.getExportsInfo(module);
    const exportInfo = exportsInfo.getExportInfo(ids[0]);
    
    // 检查是否可以直接访问
    if (exportInfo.provided === false) {
      // 导出不存在
      return 'undefined';
    }
    
    // 生成属性访问
    return `${moduleExpr}${this.propertyAccess(ids)}`;
  }
  
  propertyAccess(ids: string[]): string {
    return ids.map(id => `[${JSON.stringify(id)}]`).join('');
  }
}
```

## 实际示例

### 完整转换流程

```javascript
// 源代码
import { foo, bar as myBar } from './utils';
console.log(foo, myBar);

// 解析产生的依赖
// 1. HarmonyImportSideEffectDependency
//    request: './utils', sourceOrder: 0
//
// 2. HarmonyImportSpecifierDependency
//    request: './utils', ids: ['foo'], name: 'foo'
//
// 3. HarmonyImportSpecifierDependency
//    request: './utils', ids: ['bar'], name: 'myBar'

// 生成代码
var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./utils.js");

console.log(
  _utils__WEBPACK_IMPORTED_MODULE_0__["foo"],
  _utils__WEBPACK_IMPORTED_MODULE_0__["bar"]
);
```

### 命名空间导入转换

```javascript
// 源代码
import * as utils from './utils';
console.log(utils.foo);
utils.bar();

// 生成代码
var _utils__WEBPACK_IMPORTED_MODULE_0__ = __webpack_require__("./utils.js");

console.log(_utils__WEBPACK_IMPORTED_MODULE_0__["foo"]);
(0, _utils__WEBPACK_IMPORTED_MODULE_0__["bar"])();  // 注意 call 包装
```

## 总结

HarmonyImportDependency 系列的核心要点：

**SideEffectDependency**：
- 每个 import 语句一个
- 维护导入顺序
- 不引用具体导出

**SpecifierDependency**：
- 每个导入标识符一个
- 追踪具体引用的导出
- 处理 call 表达式 this 绑定

**引用追踪**：
- getReferencedExports 返回引用路径
- 支持 Tree Shaking
- 条件连接优化

**代码生成**：
- 替换导入引用
- 处理命名空间访问
- call 表达式包装

**下一章**：我们将学习 HarmonyExportDependency ESM 导出依赖。
