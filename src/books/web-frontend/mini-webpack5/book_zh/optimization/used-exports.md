---
sidebar_position: 111
title: "usedExports 分析"
---

# usedExports 分析

usedExports 是 Webpack 实现 Tree Shaking 的核心机制，通过分析导出的实际使用情况来决定哪些代码应该被保留。

## 配置选项

### 启用 usedExports

```javascript
module.exports = {
  optimization: {
    usedExports: true,  // development 默认 false，production 默认 true
  },
};

// usedExports 的值：
// - true: 分析并标记未使用的导出
// - false: 禁用分析
// - 'global': 跨模块边界追踪（更激进）
```

## 数据结构

### ExportInfo 详解

```typescript
class ExportInfo {
  // 导出名称
  name: string;
  
  // 是否被提供（模块是否导出了它）
  provided: boolean | null = null;
  
  // 使用状态
  used: UsedState = UsedState.NoInfo;
  
  // 使用名称（可能被重命名）
  usedName: string | null = null;
  
  // 目标导出（用于重导出）
  target: ExportTarget | null = null;
  
  // 是否可以被 mangled（混淆）
  canMangleUse: boolean = true;
  canMangleProvide: boolean = true;
}

// 使用状态枚举
enum UsedState {
  NoInfo = 0,      // 无信息
  Unused = 1,      // 未使用
  OnlyPropertiesUsed = 2,  // 仅属性被使用
  Used = 3,        // 已使用
}
```

### ExportsInfo 管理

```typescript
class ExportsInfo {
  private exports: Map<string, ExportInfo> = new Map();
  private otherExportsInfo: ExportInfo;  // 处理 export *
  
  getExportInfo(name: string): ExportInfo {
    let info = this.exports.get(name);
    
    if (!info) {
      info = new ExportInfo(name);
      this.exports.set(name, info);
    }
    
    return info;
  }
  
  setUsedInUnknownWay(): void {
    // 标记所有导出为已使用
    for (const info of this.exports.values()) {
      info.used = UsedState.Used;
    }
    this.otherExportsInfo.used = UsedState.Used;
  }
  
  getProvidedExports(): string[] | true {
    const provided: string[] = [];
    
    for (const [name, info] of this.exports) {
      if (info.provided) {
        provided.push(name);
      }
    }
    
    // 如果有 export *，返回 true 表示未知
    if (this.otherExportsInfo.provided) {
      return true;
    }
    
    return provided;
  }
  
  getUsedExports(): string[] | true | false {
    const used: string[] = [];
    let hasUnused = false;
    
    for (const [name, info] of this.exports) {
      if (info.provided) {
        if (info.used === UsedState.Used) {
          used.push(name);
        } else if (info.used === UsedState.Unused) {
          hasUnused = true;
        }
      }
    }
    
    // true 表示全部使用，false 表示全部未使用
    if (used.length === 0 && hasUnused) return false;
    if (!hasUnused && this.otherExportsInfo.used === UsedState.Used) return true;
    
    return used;
  }
}
```

## 分析流程

### 第一阶段：收集导出

```typescript
class ExportsInfoCollector {
  collect(module: Module, moduleGraph: ModuleGraph): void {
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    for (const dependency of module.dependencies) {
      // 处理导出声明
      if (this.isExportDependency(dependency)) {
        this.collectExport(dependency, exportsInfo);
      }
    }
  }
  
  collectExport(dep: Dependency, exportsInfo: ExportsInfo): void {
    if (dep instanceof HarmonyExportSpecifierDependency) {
      // export { foo }
      // export { foo as bar }
      const info = exportsInfo.getExportInfo(dep.name);
      info.provided = true;
    }
    
    if (dep instanceof HarmonyExportExpressionDependency) {
      // export default expression
      const info = exportsInfo.getExportInfo('default');
      info.provided = true;
    }
    
    if (dep instanceof HarmonyExportImportedSpecifierDependency) {
      // export { foo } from './module'
      // export * from './module'
      this.collectReexport(dep, exportsInfo);
    }
  }
  
  collectReexport(
    dep: HarmonyExportImportedSpecifierDependency,
    exportsInfo: ExportsInfo
  ): void {
    if (dep.name) {
      // 具名重导出
      const info = exportsInfo.getExportInfo(dep.name);
      info.provided = true;
    } else {
      // export * from './module'
      // 标记可能有其他导出
      exportsInfo.otherExportsInfo.provided = true;
    }
  }
}
```

### 第二阶段：追踪使用

```typescript
class ExportsUsageTracker {
  track(compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    const queue: TrackItem[] = [];
    
    // 入口模块导出全部使用
    this.initializeEntrypoints(compilation, queue);
    
    // 传播使用信息
    while (queue.length > 0) {
      const item = queue.shift()!;
      this.processItem(item, queue, compilation);
    }
  }
  
  initializeEntrypoints(compilation: Compilation, queue: TrackItem[]): void {
    for (const [name, entrypoint] of compilation.entrypoints) {
      const chunk = entrypoint.getEntrypointChunk();
      
      for (const module of compilation.chunkGraph.getChunkEntryModulesIterable(chunk)) {
        const exportsInfo = compilation.moduleGraph.getExportsInfo(module);
        
        // 入口模块的所有导出都被外部使用
        exportsInfo.setUsedInUnknownWay();
        
        queue.push({
          module,
          runtime: chunk.runtime,
          usedExports: true,
        });
      }
    }
  }
  
  processItem(
    item: TrackItem,
    queue: TrackItem[],
    compilation: Compilation
  ): void {
    const { module, usedExports, runtime } = item;
    const moduleGraph = compilation.moduleGraph;
    
    for (const connection of moduleGraph.getOutgoingConnections(module)) {
      const dep = connection.dependency;
      const targetModule = connection.module;
      
      if (!targetModule) continue;
      
      // 获取依赖使用的导出
      const referencedExports = this.getReferencedExports(dep, moduleGraph);
      
      // 标记目标模块的导出使用情况
      this.markUsed(targetModule, referencedExports, runtime, queue, compilation);
    }
  }
  
  getReferencedExports(dep: Dependency, moduleGraph: ModuleGraph): string[] | true {
    if (dep instanceof HarmonyImportSpecifierDependency) {
      // import { foo } from './module'
      return [dep.name];
    }
    
    if (dep instanceof HarmonyImportSideEffectDependency) {
      // import './module' (副作用导入)
      return [];  // 不引用任何导出，但模块需要执行
    }
    
    // import * as ns from './module'
    // 可能使用所有导出
    return true;
  }
  
  markUsed(
    module: Module,
    referencedExports: string[] | true,
    runtime: string,
    queue: TrackItem[],
    compilation: Compilation
  ): void {
    const exportsInfo = compilation.moduleGraph.getExportsInfo(module);
    let changed = false;
    
    if (referencedExports === true) {
      // 所有导出都可能被使用
      if (exportsInfo.setUsedInUnknownWay()) {
        changed = true;
      }
    } else {
      // 只有特定导出被使用
      for (const name of referencedExports) {
        const info = exportsInfo.getExportInfo(name);
        
        if (info.used !== UsedState.Used) {
          info.used = UsedState.Used;
          changed = true;
        }
      }
    }
    
    if (changed) {
      queue.push({
        module,
        runtime,
        usedExports: referencedExports,
      });
    }
  }
}
```

## 全局模式

### usedExports: 'global'

```typescript
class GlobalUsedExportsPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('GlobalUsedExportsPlugin', (compilation) => {
      // 在所有 chunk 生成后分析
      compilation.hooks.afterChunks.tap('GlobalUsedExportsPlugin', () => {
        this.analyzeGlobalUsage(compilation);
      });
    });
  }
  
  analyzeGlobalUsage(compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    
    // 收集所有模块的使用信息
    const globalUsage = new Map<Module, Set<string>>();
    
    for (const chunk of compilation.chunks) {
      for (const module of compilation.chunkGraph.getChunkModulesIterable(chunk)) {
        const usedExports = this.collectUsedExports(module, compilation);
        
        const existing = globalUsage.get(module) || new Set();
        for (const name of usedExports) {
          existing.add(name);
        }
        globalUsage.set(module, existing);
      }
    }
    
    // 应用全局使用信息
    for (const [module, usedExports] of globalUsage) {
      const exportsInfo = moduleGraph.getExportsInfo(module);
      
      for (const [name, info] of exportsInfo.exports) {
        if (info.provided && !usedExports.has(name)) {
          info.used = UsedState.Unused;
        }
      }
    }
  }
}
```

## 代码生成影响

### 条件导出

```typescript
class HarmonyExportDependencyTemplate {
  apply(
    dep: HarmonyExportSpecifierDependency,
    source: ReplaceSource,
    context: TemplateContext
  ): void {
    const { module, moduleGraph, runtime } = context;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    const exportInfo = exportsInfo.getExportInfo(dep.name);
    
    // 检查在当前 runtime 中是否使用
    const used = exportInfo.getUsedName(dep.name, runtime);
    
    if (used === false) {
      // 未使用，不生成导出
      // 添加注释供压缩器识别
      source.insert(
        dep.range[1],
        `\n/* unused harmony export ${dep.name} */`
      );
      return;
    }
    
    // 生成导出
    const exportName = typeof used === 'string' ? used : dep.name;
    source.insert(
      source.size(),
      `\n__webpack_require__.d(__webpack_exports__, ${JSON.stringify(exportName)}, function() { return ${dep.id}; });`
    );
  }
}
```

### 函数内联

```typescript
// 未使用导出的函数可以被移除
// 输入
export function unused() {
  return 'unused';
}
export function used() {
  return 'used';
}

// 输出（development）
/* unused harmony export unused */
function unused() {
  return 'unused';
}
/* harmony export */ __webpack_require__.d(__webpack_exports__, "used", function() { return used; });
function used() {
  return 'used';
}

// 输出（production，经过 Terser）
function n(){return"used"}__webpack_require__.d(__webpack_exports__,"used",function(){return n})
```

## 调试与验证

### 查看分析结果

```javascript
// webpack.config.js
module.exports = {
  stats: {
    usedExports: true,
    providedExports: true,
    optimizationBailout: true,  // 显示优化失败原因
  },
};
```

### 输出示例

```
./src/utils.js 1.5 KiB [built]
  [exports: add, subtract, multiply, divide]
  [only some exports used: add, multiply]
```

### 编程方式访问

```typescript
class UsedExportsReporter {
  report(compilation: Compilation): void {
    for (const module of compilation.modules) {
      const exportsInfo = compilation.moduleGraph.getExportsInfo(module);
      
      console.log(`Module: ${module.identifier()}`);
      console.log(`  Provided: ${exportsInfo.getProvidedExports()}`);
      console.log(`  Used: ${exportsInfo.getUsedExports()}`);
      
      for (const [name, info] of exportsInfo.exports) {
        console.log(`  - ${name}: provided=${info.provided}, used=${info.used}`);
      }
    }
  }
}
```

## 优化效果

### 对比示例

```javascript
// 源代码
// utils.js
export function add(a, b) { return a + b; }
export function subtract(a, b) { return a - b; }
export function multiply(a, b) { return a * b; }
export function divide(a, b) { return a / b; }

// index.js
import { add } from './utils';
console.log(add(1, 2));
```

```javascript
// 无 usedExports
// 所有函数都被包含
(function(module, exports, __webpack_require__) {
  function add(a, b) { return a + b; }
  function subtract(a, b) { return a - b; }
  function multiply(a, b) { return a * b; }
  function divide(a, b) { return a / b; }
  // ...
})

// 有 usedExports + Terser
// 只保留 add
(function(n,t,r){function o(n,t){return n+t}console.log(o(1,2))})
```

## 总结

usedExports 分析的核心要点：

**数据结构**：
- ExportInfo 记录单个导出
- ExportsInfo 管理模块所有导出

**分析流程**：
1. 收集所有导出（provided）
2. 从入口追踪使用（used）
3. 传播到依赖模块

**配置选项**：
- true：标准分析
- 'global'：跨 chunk 分析

**代码生成**：
- 添加 unused 注释
- 配合压缩器移除

**调试方法**：
- stats.usedExports
- stats.providedExports

**下一章**：我们将学习 sideEffects 副作用处理。
