---
sidebar_position: 84
title: "HarmonyExportDependency ESM 导出依赖"
---

# HarmonyExportDependency ESM 导出依赖

HarmonyExportDependency 系列处理 ES Module 的各种导出语法，是 Tree Shaking 的关键基础。

## ESM 导出语法

### 导出形式

```javascript
// 1. 命名导出
export const foo = 1;
export function bar() {}
export class Baz {}

// 2. 默认导出
export default function() {}
export default class {}
export default expression;

// 3. 导出列表
export { foo, bar as myBar };

// 4. 重导出
export { foo } from './other';
export * from './other';
export * as ns from './other';

// 5. 默认重导出
export { default } from './other';
export { default as foo } from './other';
```

### 对应的依赖类型

```
导出语句
├── HarmonyExportHeaderDependency (export 关键字)
├── HarmonyExportExpressionDependency (export default expr)
├── HarmonyExportSpecifierDependency (export { foo })
└── HarmonyExportImportedSpecifierDependency (export from)
```

## HarmonyExportHeaderDependency

### 类实现

```typescript
class HarmonyExportHeaderDependency extends NullDependency {
  range: [number, number];
  rangeStatement: [number, number];
  
  constructor(range: [number, number], rangeStatement: [number, number]) {
    super();
    this.range = range;
    this.rangeStatement = rangeStatement;
  }
  
  get type(): string {
    return 'harmony export header';
  }
}
```

### 代码生成

```typescript
class HarmonyExportHeaderDependencyTemplate {
  apply(
    dep: HarmonyExportHeaderDependency,
    source: ReplaceSource
  ): void {
    // 移除 export 关键字
    // export const foo = 1; => const foo = 1;
    source.replace(
      dep.range[0],
      dep.range[1] - 1,
      ''
    );
  }
}
```

## HarmonyExportExpressionDependency

### 默认导出处理

```typescript
class HarmonyExportExpressionDependency extends NullDependency {
  range: [number, number];
  rangeStatement: [number, number];
  
  // 导出的标识符（如果是具名的）
  declaration?: {
    name: string;
    range: [number, number];
  };
  
  constructor(
    range: [number, number],
    rangeStatement: [number, number],
    declaration?: { name: string; range: [number, number] }
  ) {
    super();
    this.range = range;
    this.rangeStatement = rangeStatement;
    this.declaration = declaration;
  }
  
  get type(): string {
    return 'harmony export expression';
  }
}
```

### 代码生成

```typescript
class HarmonyExportExpressionDependencyTemplate {
  apply(
    dep: HarmonyExportExpressionDependency,
    source: ReplaceSource,
    runtime: RuntimeState
  ): void {
    const { module, initFragments } = runtime;
    
    if (dep.declaration) {
      // export default function foo() {}
      // 移除 export default，保留声明
      source.replace(
        dep.range[0],
        dep.range[1] - 1,
        ''
      );
      
      // 添加导出初始化
      initFragments.push(
        new HarmonyExportInitFragment(
          module.exportsArgument,
          new Map([['default', dep.declaration.name]])
        )
      );
    } else {
      // export default expression
      // 转换为 __webpack_exports__.default = expression
      source.replace(
        dep.range[0],
        dep.range[1] - 1,
        `${module.exportsArgument}["default"] = `
      );
    }
  }
}
```

## HarmonyExportSpecifierDependency

### 命名导出处理

```typescript
class HarmonyExportSpecifierDependency extends NullDependency {
  // 本地变量名
  id: string;
  
  // 导出名
  name: string;
  
  constructor(id: string, name: string) {
    super();
    this.id = id;
    this.name = name;
  }
  
  get type(): string {
    return 'harmony export specifier';
  }
  
  // 返回提供的导出
  getExports(moduleGraph: ModuleGraph): ExportsSpec {
    return {
      exports: [
        {
          name: this.name,
          canMangle: true,
        },
      ],
      dependencies: undefined,
    };
  }
}
```

### 使用信息

```typescript
class HarmonyExportSpecifierDependency extends NullDependency {
  // 获取导出使用信息
  getModuleEvaluationSideEffectsState(moduleGraph: ModuleGraph): boolean {
    // 如果导出被使用，则模块有副作用
    return true;
  }
  
  // 获取条件
  getCondition(moduleGraph: ModuleGraph): ConnectionCondition | null {
    return (connection, runtime) => {
      const module = moduleGraph.getParentModule(this);
      if (!module) return ConnectionState.ACTIVE;
      
      const exportsInfo = moduleGraph.getExportsInfo(module);
      const exportInfo = exportsInfo.getExportInfo(this.name);
      
      // 检查导出是否被使用
      if (exportInfo.getUsed(runtime) === UsageState.Unused) {
        return ConnectionState.INACTIVE;
      }
      
      return ConnectionState.ACTIVE;
    };
  }
}
```

### 代码生成

```typescript
class HarmonyExportSpecifierDependencyTemplate {
  apply(
    dep: HarmonyExportSpecifierDependency,
    source: ReplaceSource,
    runtime: RuntimeState
  ): void {
    const { module, moduleGraph, initFragments } = runtime;
    
    const exportsInfo = moduleGraph.getExportsInfo(module);
    const used = exportsInfo.getUsedName(dep.name, runtime.runtime);
    
    if (!used) {
      // 导出未使用，不生成
      return;
    }
    
    // 添加导出定义
    initFragments.push(
      new HarmonyExportInitFragment(
        module.exportsArgument,
        new Map([[used, dep.id]])
      )
    );
  }
}
```

## HarmonyExportImportedSpecifierDependency

### 重导出处理

```typescript
class HarmonyExportImportedSpecifierDependency extends ModuleDependency {
  // 源模块请求
  request: string;
  
  // 导入的 ID 路径
  ids: string[];
  
  // 导出的名称
  name: string | null;  // null 表示星号导出
  
  // 值依赖（引用的模块）
  valueDependency?: ModuleDependency;
  
  constructor(
    request: string,
    sourceOrder: number,
    ids: string[],
    name: string | null
  ) {
    super(request);
    this.ids = ids;
    this.name = name;
  }
  
  get type(): string {
    return 'harmony export imported specifier';
  }
}
```

### 星号导出

```typescript
// export * from './other'
class HarmonyExportImportedSpecifierDependency extends ModuleDependency {
  getExports(moduleGraph: ModuleGraph): ExportsSpec | null {
    const connection = moduleGraph.getConnection(this);
    if (!connection) return null;
    
    const module = connection.module;
    if (!module) return null;
    
    if (this.name === null) {
      // export * from
      // 返回被导入模块的所有导出
      const exportsInfo = moduleGraph.getExportsInfo(module);
      
      return {
        exports: Array.from(exportsInfo.orderedExports)
          .filter(info => info.name !== 'default')  // 排除 default
          .map(info => ({
            name: info.name,
            canMangle: info.canMangleProvide,
          })),
        dependencies: [module],
      };
    }
    
    // export { foo } from 或 export * as ns from
    return {
      exports: [
        {
          name: this.name,
          canMangle: true,
        },
      ],
      dependencies: [module],
    };
  }
}
```

### 引用追踪

```typescript
class HarmonyExportImportedSpecifierDependency extends ModuleDependency {
  getReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): (string[] | ReferencedExport)[] {
    // 获取使用信息
    const module = moduleGraph.getParentModule(this);
    if (!module) return [this.ids];
    
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    if (this.name === null) {
      // export * from
      // 返回所有被使用的导出
      const result: string[][] = [];
      
      for (const exportInfo of exportsInfo.orderedExports) {
        if (exportInfo.name === 'default') continue;
        if (exportInfo.getUsed(runtime) !== UsageState.Unused) {
          result.push([exportInfo.name]);
        }
      }
      
      return result;
    }
    
    // 检查具体导出的使用
    const exportInfo = exportsInfo.getExportInfo(this.name);
    if (exportInfo.getUsed(runtime) === UsageState.Unused) {
      return Dependency.NO_EXPORTS_REFERENCED;
    }
    
    return [this.ids];
  }
}
```

## ExportsInfo 管理

### 导出信息收集

```typescript
class Compilation {
  processExports(modules: Module[]): void {
    for (const module of modules) {
      const exportsInfo = this.moduleGraph.getExportsInfo(module);
      
      // 收集导出定义
      for (const dep of module.dependencies) {
        if (typeof dep.getExports === 'function') {
          const exports = dep.getExports(this.moduleGraph);
          if (exports) {
            this.processExportsSpec(exportsInfo, exports);
          }
        }
      }
    }
  }
  
  processExportsSpec(exportsInfo: ExportsInfo, spec: ExportsSpec): void {
    for (const exp of spec.exports) {
      const exportInfo = exportsInfo.getExportInfo(exp.name);
      exportInfo.provided = true;
      exportInfo.canMangleProvide = exp.canMangle;
    }
    
    if (spec.dependencies) {
      for (const dep of spec.dependencies) {
        exportsInfo.addDependency(dep);
      }
    }
  }
}
```

### 使用信息传播

```typescript
class FlagDependencyUsagePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'FlagDependencyUsagePlugin',
      (compilation) => {
        compilation.hooks.optimizeDependencies.tap(
          'FlagDependencyUsagePlugin',
          (modules) => {
            this.propagateUsage(compilation, modules);
          }
        );
      }
    );
  }
  
  propagateUsage(compilation: Compilation, modules: Module[]): void {
    const { moduleGraph } = compilation;
    const queue: Module[] = [];
    
    // 从入口开始
    for (const entrypoint of compilation.entrypoints.values()) {
      for (const chunk of entrypoint.chunks) {
        for (const module of compilation.chunkGraph.getChunkModules(chunk)) {
          queue.push(module);
        }
      }
    }
    
    while (queue.length > 0) {
      const module = queue.pop()!;
      
      for (const dep of module.dependencies) {
        if (dep instanceof ModuleDependency) {
          const refModule = moduleGraph.getModule(dep);
          if (!refModule) continue;
          
          // 标记使用的导出
          const refs = dep.getReferencedExports(moduleGraph, undefined);
          this.markUsedExports(refModule, refs, moduleGraph);
          
          queue.push(refModule);
        }
      }
    }
  }
}
```

## 代码生成

### 初始化片段

```typescript
class HarmonyExportInitFragment extends InitFragment {
  exportsArgument: string;
  exportMap: Map<string, string>;  // 导出名 -> 本地名
  
  constructor(
    exportsArgument: string,
    exportMap: Map<string, string>
  ) {
    super(
      undefined,
      InitFragment.STAGE_HARMONY_EXPORTS,
      0,
      'harmony export init'
    );
    this.exportsArgument = exportsArgument;
    this.exportMap = exportMap;
  }
  
  getContent(): string {
    const entries = Array.from(this.exportMap.entries());
    const definitions = entries
      .map(([name, local]) => `${JSON.stringify(name)}: () => ${local}`)
      .join(',\n  ');
    
    return `__webpack_require__.d(${this.exportsArgument}, {\n  ${definitions}\n});\n`;
  }
}
```

### 完整示例

```javascript
// 源代码
export const foo = 1;
export function bar() {}
export default class Baz {}

// 生成代码
__webpack_require__.d(__webpack_exports__, {
  "foo": () => foo,
  "bar": () => bar,
  "default": () => Baz
});

const foo = 1;
function bar() {}
class Baz {}
```

## 总结

HarmonyExportDependency 系列的核心要点：

**导出类型**：
- HeaderDependency：处理 export 关键字
- ExpressionDependency：处理 export default
- SpecifierDependency：处理命名导出
- ImportedSpecifierDependency：处理重导出

**导出信息**：
- getExports 返回提供的导出
- ExportsInfo 管理导出状态
- 使用信息传播

**Tree Shaking**：
- 追踪导出使用
- 条件连接
- 未使用导出剔除

**代码生成**：
- 移除 export 关键字
- 添加 __webpack_require__.d 定义
- 保持执行顺序

**下一章**：我们将学习 CommonJsRequireDependency CJS 依赖。
