---
sidebar_position: 87
title: "DependencyReference 引用追踪"
---

# DependencyReference 引用追踪

DependencyReference 系统追踪模块间的引用关系，是 Tree Shaking 和模块优化的基础。

## 引用追踪概述

### 为什么需要引用追踪

```javascript
// utils.js
export const foo = 1;
export const bar = 2;
export const baz = 3;

// app.js
import { foo } from './utils';
console.log(foo);

// 问题：bar 和 baz 能否被删除？
// 答案：需要追踪 app.js 引用了 utils.js 的哪些导出
```

### 追踪维度

```
引用追踪
├── 引用的模块
├── 引用的导出（具体名称或全部）
├── 引用的强弱（weak/optional）
└── 引用的条件（runtime-specific）
```

## ReferencedExport 结构

### 基础表示

```typescript
// 引用的导出路径
type ExportPath = string[];

// 引用结果
type ReferencedExport = ExportPath | {
  name: ExportPath;
  canMangle?: boolean;
};

// 依赖返回的引用
type ReferencedExports = ReferencedExport[];
```

### 常用常量

```typescript
class Dependency {
  // 引用整个导出对象
  static EXPORTS_OBJECT_REFERENCED: ExportPath[] = [[]];
  
  // 不引用任何导出
  static NO_EXPORTS_REFERENCED: ExportPath[] = [];
}

// 使用示例
class HarmonyImportSideEffectDependency extends Dependency {
  getReferencedExports(): ExportPath[] {
    // 副作用导入不引用具体导出
    return Dependency.NO_EXPORTS_REFERENCED;
  }
}

class CommonJsRequireDependency extends Dependency {
  getReferencedExports(): ExportPath[] {
    // CJS require 引用整个模块
    return Dependency.EXPORTS_OBJECT_REFERENCED;
  }
}
```

## getReferencedExports 方法

### 接口定义

```typescript
abstract class Dependency {
  getReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): (ExportPath | ReferencedExport)[];
}
```

### 实现示例

```typescript
class HarmonyImportSpecifierDependency extends Dependency {
  ids: string[];  // 导入的 ID 路径
  
  getReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): ExportPath[] {
    // 返回具体引用的导出路径
    // import { foo } from './mod' => [['foo']]
    // import { a: { b } } from './mod' => [['a', 'b']]
    return [this.ids.slice()];
  }
}

class HarmonyExportImportedSpecifierDependency extends Dependency {
  name: string | null;  // null 表示 export *
  ids: string[];
  
  getReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): ExportPath[] {
    if (this.name === null) {
      // export * from
      // 需要根据使用情况返回
      return this.getStarReferencedExports(moduleGraph, runtime);
    }
    
    return [this.ids.slice()];
  }
  
  getStarReferencedExports(
    moduleGraph: ModuleGraph,
    runtime: RuntimeSpec
  ): ExportPath[] {
    const module = moduleGraph.getParentModule(this);
    if (!module) return Dependency.EXPORTS_OBJECT_REFERENCED;
    
    const exportsInfo = moduleGraph.getExportsInfo(module);
    const result: ExportPath[] = [];
    
    for (const exportInfo of exportsInfo.orderedExports) {
      if (exportInfo.name === 'default') continue;
      
      // 只包含被使用的导出
      if (exportInfo.getUsed(runtime) !== UsageState.Unused) {
        result.push([exportInfo.name]);
      }
    }
    
    return result;
  }
}
```

## ExportsInfo 导出信息

### 类结构

```typescript
class ExportsInfo {
  // 所有导出信息
  private _exports: Map<string, ExportInfo>;
  
  // 其他导出（未知导出）
  private _otherExportsInfo: ExportInfo;
  
  // 副作用
  private _sideEffectsOnlyInfo: ExportInfo;
  
  constructor() {
    this._exports = new Map();
    this._otherExportsInfo = new ExportInfo(null);
    this._sideEffectsOnlyInfo = new ExportInfo('*side effects only*');
  }
  
  // 获取导出信息
  getExportInfo(name: string): ExportInfo {
    let info = this._exports.get(name);
    if (!info) {
      info = new ExportInfo(name);
      this._exports.set(name, info);
    }
    return info;
  }
  
  // 获取已读取的导出信息（不创建）
  getReadOnlyExportInfo(name: string): ExportInfo | null {
    return this._exports.get(name) || null;
  }
  
  // 迭代所有导出
  get orderedExports(): Iterable<ExportInfo> {
    return this._exports.values();
  }
}
```

### ExportInfo 详情

```typescript
class ExportInfo {
  // 导出名
  name: string | null;
  
  // 是否被提供（模块是否导出了它）
  provided: boolean | null = null;
  
  // 是否可以混淆名称
  canMangleProvide: boolean | null = null;
  
  // 使用状态映射（runtime -> usage）
  private _usedInRuntime: Map<string, UsageState> | null = null;
  
  // 目标模块（重导出时）
  private _target: Map<Dependency, TargetInfo> | null = null;
  
  constructor(name: string | null) {
    this.name = name;
  }
  
  // 获取使用状态
  getUsed(runtime: RuntimeSpec): UsageState {
    if (!this._usedInRuntime) return UsageState.NoInfo;
    
    if (runtime === undefined) {
      // 所有运行时
      let result = UsageState.Unused;
      for (const usage of this._usedInRuntime.values()) {
        if (usage > result) result = usage;
      }
      return result;
    }
    
    return this._usedInRuntime.get(runtime) || UsageState.Unused;
  }
  
  // 设置使用状态
  setUsed(runtime: RuntimeSpec, used: UsageState): boolean {
    if (!this._usedInRuntime) {
      this._usedInRuntime = new Map();
    }
    
    const old = this._usedInRuntime.get(runtime) || UsageState.Unused;
    if (old >= used) return false;
    
    this._usedInRuntime.set(runtime, used);
    return true;
  }
}

enum UsageState {
  Unused = 0,
  OnlyPropertiesUsed = 1,
  NoInfo = 2,
  Unknown = 3,
  Used = 4,
}
```

## 使用信息传播

### FlagDependencyUsagePlugin

```typescript
class FlagDependencyUsagePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'FlagDependencyUsagePlugin',
      (compilation) => {
        compilation.hooks.optimizeDependencies.tap(
          'FlagDependencyUsagePlugin',
          (modules) => {
            this.flagUsage(compilation);
          }
        );
      }
    );
  }
  
  flagUsage(compilation: Compilation): void {
    const { moduleGraph } = compilation;
    const queue = new Set<Module>();
    
    // 从入口开始
    for (const [, entrypoint] of compilation.entrypoints) {
      for (const chunk of entrypoint.chunks) {
        for (const module of compilation.chunkGraph.getChunkModules(chunk)) {
          // 标记入口模块的所有导出为已使用
          const exportsInfo = moduleGraph.getExportsInfo(module);
          exportsInfo.setUsedForSideEffectsOnly(undefined);
          queue.add(module);
        }
      }
    }
    
    // 传播使用信息
    while (queue.size > 0) {
      for (const module of queue) {
        queue.delete(module);
        this.processModule(module, queue, compilation);
      }
    }
  }
  
  processModule(
    module: Module,
    queue: Set<Module>,
    compilation: Compilation
  ): void {
    const { moduleGraph } = compilation;
    
    for (const dep of module.dependencies) {
      const connection = moduleGraph.getConnection(dep);
      if (!connection || !connection.module) continue;
      
      const refModule = connection.module;
      const referencedExports = dep.getReferencedExports(
        moduleGraph,
        undefined  // 所有运行时
      );
      
      // 标记引用的导出
      let changed = false;
      
      if (referencedExports.length === 0) {
        // 副作用导入
        const exportsInfo = moduleGraph.getExportsInfo(refModule);
        if (exportsInfo.setUsedForSideEffectsOnly(undefined)) {
          changed = true;
        }
      } else if (referencedExports === Dependency.EXPORTS_OBJECT_REFERENCED) {
        // 引用整个模块
        const exportsInfo = moduleGraph.getExportsInfo(refModule);
        if (exportsInfo.setUsedInUnknownWay(undefined)) {
          changed = true;
        }
      } else {
        // 引用具体导出
        const exportsInfo = moduleGraph.getExportsInfo(refModule);
        for (const ref of referencedExports) {
          const path = Array.isArray(ref) ? ref : ref.name;
          if (exportsInfo.setUsedByExportPath(path, undefined)) {
            changed = true;
          }
        }
      }
      
      if (changed) {
        queue.add(refModule);
      }
    }
  }
}
```

## 嵌套导出追踪

### 深层属性访问

```javascript
// module.js
export const config = {
  settings: {
    theme: 'dark',
    language: 'en',
  },
};

// app.js
import { config } from './module';
console.log(config.settings.theme);

// 引用路径：['config', 'settings', 'theme']
```

### 实现追踪

```typescript
class HarmonyImportSpecifierDependency extends Dependency {
  // 基础导入 ID
  ids: string[];
  
  // 成员访问扩展
  memberRanges?: [number, number][];
  
  getReferencedExports(moduleGraph: ModuleGraph): ExportPath[] {
    // 返回完整路径
    // import { config } 然后访问 config.settings.theme
    // => [['config', 'settings', 'theme']]
    return [this.ids.slice()];
  }
}

// Parser 中收集成员访问
class HarmonyImportDependencyParserPlugin {
  apply(parser: JavascriptParser): void {
    parser.hooks.memberChain
      .for('harmony import')
      .tap('HarmonyImportDependencyParserPlugin', (expr, members, info) => {
        // 合并成员访问
        const ids = [...info.ids, ...members];
        
        const dep = new HarmonyImportSpecifierDependency(
          info.source,
          info.sourceOrder,
          ids,
          members[members.length - 1],
          expr.range
        );
        
        parser.state.module.addDependency(dep);
        
        return true;
      });
  }
}
```

## 运行时条件引用

### 多运行时场景

```javascript
// 配置多入口
module.exports = {
  entry: {
    web: './src/web.js',
    node: './src/node.js',
  },
};

// shared.js
export const webOnly = 'web';
export const nodeOnly = 'node';
export const shared = 'both';

// web.js
import { webOnly, shared } from './shared';

// node.js
import { nodeOnly, shared } from './shared';

// 结果：webOnly 只在 'web' 运行时使用
//       nodeOnly 只在 'node' 运行时使用
//       shared 在两个运行时都使用
```

### 运行时特定使用

```typescript
class ExportInfo {
  getUsed(runtime: RuntimeSpec): UsageState {
    if (!this._usedInRuntime) return UsageState.NoInfo;
    
    if (typeof runtime === 'string') {
      // 单一运行时
      return this._usedInRuntime.get(runtime) || UsageState.Unused;
    }
    
    if (runtime === undefined) {
      // 所有运行时的聚合
      let result = UsageState.Unused;
      for (const usage of this._usedInRuntime.values()) {
        if (usage > result) result = usage;
      }
      return result;
    }
    
    // 运行时集合
    let result = UsageState.Unused;
    for (const r of runtime) {
      const usage = this._usedInRuntime.get(r) || UsageState.Unused;
      if (usage > result) result = usage;
    }
    return result;
  }
  
  // 获取使用名称（可能被混淆）
  getUsedName(
    fallbackName: string,
    runtime: RuntimeSpec
  ): string | false {
    const used = this.getUsed(runtime);
    
    if (used === UsageState.Unused) {
      return false;  // 未使用
    }
    
    if (this.canMangleProvide && this._usedName) {
      return this._usedName;
    }
    
    return fallbackName;
  }
}
```

## 条件连接

### ConnectionCondition

```typescript
type ConnectionCondition = (
  connection: ModuleGraphConnection,
  runtime: RuntimeSpec
) => ConnectionState;

class ModuleGraphConnection {
  condition: ConnectionCondition | null;
  
  getActiveState(runtime: RuntimeSpec): ConnectionState {
    if (!this.condition) {
      return ConnectionState.ACTIVE;
    }
    return this.condition(this, runtime);
  }
  
  isActive(runtime: RuntimeSpec): boolean {
    return this.getActiveState(runtime) !== ConnectionState.INACTIVE;
  }
}
```

### 使用条件

```typescript
class HarmonyImportSpecifierDependency extends Dependency {
  getCondition(moduleGraph: ModuleGraph): ConnectionCondition | null {
    return (connection, runtime) => {
      // 检查这个导入是否被使用
      const module = moduleGraph.getParentModule(this);
      if (!module) return ConnectionState.ACTIVE;
      
      const exportsInfo = moduleGraph.getExportsInfo(module);
      
      // 如果引用的变量从未被使用
      // 连接可以是条件性的
      return ConnectionState.CONDITIONAL;
    };
  }
}
```

## 优化应用

### Tree Shaking 决策

```typescript
class SideEffectsFlagPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'SideEffectsFlagPlugin',
      (compilation) => {
        compilation.hooks.optimizeDependencies.tap(
          'SideEffectsFlagPlugin',
          () => {
            this.optimizeConnections(compilation);
          }
        );
      }
    );
  }
  
  optimizeConnections(compilation: Compilation): void {
    const { moduleGraph } = compilation;
    
    for (const module of compilation.modules) {
      // 检查模块是否有副作用
      if (module.buildMeta?.sideEffectFree !== true) continue;
      
      const exportsInfo = moduleGraph.getExportsInfo(module);
      
      // 如果没有导出被使用
      if (this.isUnused(exportsInfo)) {
        // 可以跳过整个模块
        moduleGraph.skipModule(module);
      }
    }
  }
  
  isUnused(exportsInfo: ExportsInfo): boolean {
    for (const info of exportsInfo.orderedExports) {
      if (info.getUsed(undefined) !== UsageState.Unused) {
        return false;
      }
    }
    return true;
  }
}
```

## 总结

DependencyReference 引用追踪的核心要点：

**引用表示**：
- ExportPath 表示导出路径
- 常量表示全部/无引用
- 支持嵌套属性

**ExportsInfo**：
- 管理导出状态
- 追踪使用情况
- 支持运行时条件

**使用传播**：
- 从入口开始
- 递归处理依赖
- 标记使用状态

**条件连接**：
- 运行时特定
- 动态激活状态
- 优化决策

本章完成了 Dependency 依赖系统部分的学习，接下来将进入 Externals 外部化系统部分。
