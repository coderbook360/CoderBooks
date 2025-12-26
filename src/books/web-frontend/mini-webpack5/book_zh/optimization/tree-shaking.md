---
sidebar_position: 110
title: "Tree Shaking 原理与实现"
---

# Tree Shaking 原理与实现

Tree Shaking 是一种通过静态分析移除未使用代码的优化技术，得名于"摇树"——把树上的枯叶（无用代码）摇落。

## 核心原理

### 为什么 Tree Shaking 有效

```javascript
// ESM 的静态结构是 Tree Shaking 的基础

// ESM 导入导出在编译时确定
import { used } from './module';  // 静态分析可知使用了 used

// CommonJS 在运行时确定
const { used } = require('./module');  // 无法静态分析

// ESM 特性：
// 1. 导入导出必须在顶层
// 2. 导入的模块名必须是字符串常量
// 3. 导入绑定是不可变的
```

### Tree Shaking 流程

```
源代码 ──→ 解析依赖 ──→ 标记导出 ──→ 标记使用 ──→ 生成代码
                          │            │            │
                          ▼            ▼            ▼
                      ExportsInfo   UsedInfo    移除未使用
```

## 导出分析

### FlagDependencyExportsPlugin

```typescript
class FlagDependencyExportsPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'FlagDependencyExportsPlugin',
      (compilation) => {
        compilation.hooks.finishModules.tapAsync(
          'FlagDependencyExportsPlugin',
          (modules, callback) => {
            // 分析所有模块的导出
            for (const module of modules) {
              this.processModule(module, compilation);
            }
            callback();
          }
        );
      }
    );
  }
  
  processModule(module: Module, compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    // 分析模块的导出依赖
    for (const dependency of module.dependencies) {
      this.processDependency(dependency, exportsInfo, compilation);
    }
  }
  
  processDependency(
    dependency: Dependency,
    exportsInfo: ExportsInfo,
    compilation: Compilation
  ): void {
    // 处理 export { foo }
    if (dependency instanceof HarmonyExportSpecifierDependency) {
      const name = dependency.name;
      const id = dependency.id;
      
      const exportInfo = exportsInfo.getExportInfo(name);
      exportInfo.provided = true;
      
      // 如果是重命名导出，记录原始名称
      if (name !== id) {
        exportInfo.provideInfo = {
          name,
          id,
        };
      }
    }
    
    // 处理 export default
    if (dependency instanceof HarmonyExportExpressionDependency) {
      const exportInfo = exportsInfo.getExportInfo('default');
      exportInfo.provided = true;
    }
    
    // 处理 export * from './module'
    if (dependency instanceof HarmonyExportImportedSpecifierDependency) {
      this.processReexport(dependency, exportsInfo, compilation);
    }
  }
  
  processReexport(
    dependency: HarmonyExportImportedSpecifierDependency,
    exportsInfo: ExportsInfo,
    compilation: Compilation
  ): void {
    const moduleGraph = compilation.moduleGraph;
    const importedModule = moduleGraph.getModule(dependency);
    
    if (!importedModule) return;
    
    const importedExportsInfo = moduleGraph.getExportsInfo(importedModule);
    
    // 获取导入模块的所有导出
    for (const name of importedExportsInfo.getProvidedExports()) {
      if (name !== 'default') {  // export * 不包括 default
        const exportInfo = exportsInfo.getExportInfo(name);
        exportInfo.provided = true;
        exportInfo.exportsInfoOwned = false;
        exportInfo.redirect = importedExportsInfo.getExportInfo(name);
      }
    }
  }
}
```

## 使用分析

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
    const moduleGraph = compilation.moduleGraph;
    const queue: QueueItem[] = [];
    
    // 从入口开始
    for (const [name, entrypoint] of compilation.entrypoints) {
      const chunk = entrypoint.getEntrypointChunk();
      
      for (const module of compilation.chunkGraph.getChunkEntryModulesIterable(chunk)) {
        // 入口模块的所有导出都被使用
        const exportsInfo = moduleGraph.getExportsInfo(module);
        exportsInfo.setUsedInUnknownWay();
        
        queue.push({
          module,
          usedExports: true,  // 使用所有导出
        });
      }
    }
    
    // 广度优先传播
    const processed = new Set<Module>();
    
    while (queue.length > 0) {
      const item = queue.shift()!;
      
      if (processed.has(item.module)) continue;
      processed.add(item.module);
      
      // 处理模块的依赖
      this.processModule(item.module, item.usedExports, queue, compilation);
    }
  }
  
  processModule(
    module: Module,
    usedExports: boolean | string[],
    queue: QueueItem[],
    compilation: Compilation
  ): void {
    const moduleGraph = compilation.moduleGraph;
    
    for (const dependency of module.dependencies) {
      const depModule = moduleGraph.getModule(dependency);
      if (!depModule) continue;
      
      // 获取依赖引用的导出
      if (dependency instanceof HarmonyImportSpecifierDependency) {
        const name = dependency.name;
        const exportsInfo = moduleGraph.getExportsInfo(depModule);
        
        // 标记导出被使用
        const exportInfo = exportsInfo.getExportInfo(name);
        
        if (!exportInfo.used) {
          exportInfo.used = true;
          
          // 将依赖模块加入队列
          queue.push({
            module: depModule,
            usedExports: [name],
          });
        }
      }
      
      // 处理 import * as ns from './module'
      if (dependency instanceof HarmonyImportSideEffectDependency) {
        // 命名空间导入，所有导出都可能被使用
        const exportsInfo = moduleGraph.getExportsInfo(depModule);
        exportsInfo.setUsedInUnknownWay();
        
        queue.push({
          module: depModule,
          usedExports: true,
        });
      }
    }
  }
}
```

## 代码生成

### 移除未使用导出

```typescript
class HarmonyExportSpecifierDependencyTemplate {
  apply(
    dependency: HarmonyExportSpecifierDependency,
    source: ReplaceSource,
    templateContext: TemplateContext
  ): void {
    const { moduleGraph, module } = templateContext;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    const exportInfo = exportsInfo.getExportInfo(dependency.name);
    
    // 检查导出是否被使用
    if (!exportInfo.used) {
      // 未使用的导出，不生成导出代码
      return;
    }
    
    // 生成导出代码
    const usedName = exportInfo.usedName || dependency.name;
    source.insert(
      source.size(),
      `__webpack_exports__[${JSON.stringify(usedName)}] = ${dependency.id};\n`
    );
  }
}
```

### 内联未使用检查

```typescript
class JavascriptGenerator {
  generate(module: Module, context: GenerateContext): Source {
    const { moduleGraph, chunkGraph } = context;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    // 添加未使用导出注释（供压缩器使用）
    const unusedExports = this.getUnusedExports(exportsInfo);
    
    if (unusedExports.length > 0) {
      const comment = `/* unused harmony exports ${unusedExports.join(', ')} */`;
      // 在模块开头添加注释
      source.insert(0, comment + '\n');
    }
    
    return source;
  }
  
  getUnusedExports(exportsInfo: ExportsInfo): string[] {
    const unused: string[] = [];
    
    for (const [name, info] of exportsInfo.exports) {
      if (info.provided && !info.used) {
        unused.push(name);
      }
    }
    
    return unused;
  }
}
```

## 压缩器配合

### Terser 配置

```javascript
module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          compress: {
            // 移除无副作用的未使用代码
            unused: true,
            // 移除死代码
            dead_code: true,
            // 移除仅赋值但未使用的变量
            side_effects: true,
          },
        },
      }),
    ],
  },
};
```

### 注释标记

```javascript
// Webpack 生成的代码带有标记
/* unused harmony export unusedFunc */
function unusedFunc() { }
/* harmony export */ function usedFunc() { }

// Terser 识别这些注释并移除 unusedFunc
```

## 注意事项

### 副作用处理

```javascript
// package.json
{
  "sideEffects": false  // 标记整个包无副作用
}

// 或指定有副作用的文件
{
  "sideEffects": [
    "*.css",
    "*.scss",
    "./src/polyfills.js"
  ]
}
```

### 常见陷阱

```javascript
// ❌ 动态属性访问阻止 Tree Shaking
import * as utils from './utils';
const funcName = 'foo';
utils[funcName]();  // 无法静态分析

// ❌ 重导出整个模块
export * from './module';  // 保守地保留所有导出

// ❌ 条件导入
if (condition) {
  import('./module');  // 动态导入不影响 Tree Shaking
}

// ✅ 具名导入
import { foo } from './utils';  // 明确使用 foo
foo();

// ✅ 纯函数标记
export const add = /*#__PURE__*/ createAdd();
```

## 调试 Tree Shaking

### 统计信息

```javascript
module.exports = {
  stats: {
    usedExports: true,
    providedExports: true,
  },
};

// 输出示例：
// [used exports] foo, bar
// [provided exports] foo, bar, unused
```

### 可视化工具

```typescript
class TreeShakingAnalyzer {
  analyze(compilation: Compilation): AnalysisResult {
    const result: AnalysisResult = {
      modules: [],
    };
    
    for (const module of compilation.modules) {
      const exportsInfo = compilation.moduleGraph.getExportsInfo(module);
      
      const exports: ExportAnalysis[] = [];
      for (const [name, info] of exportsInfo.exports) {
        exports.push({
          name,
          provided: info.provided,
          used: info.used,
        });
      }
      
      result.modules.push({
        id: module.identifier(),
        exports,
        usedExportsCount: exports.filter(e => e.used).length,
        totalExportsCount: exports.filter(e => e.provided).length,
      });
    }
    
    return result;
  }
}
```

## 总结

Tree Shaking 原理与实现的核心要点：

**基础条件**：
- ESM 静态结构
- 编译时确定依赖

**实现步骤**：
1. 导出分析（provided）
2. 使用分析（used）
3. 代码生成（移除）

**关键插件**：
- FlagDependencyExportsPlugin
- FlagDependencyUsagePlugin

**压缩配合**：
- Terser 识别注释
- 移除死代码

**注意事项**：
- sideEffects 配置
- 避免动态访问
- 使用具名导入

**下一章**：我们将学习 usedExports 分析。
