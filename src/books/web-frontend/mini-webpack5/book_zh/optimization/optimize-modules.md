---
sidebar_position: 108
title: "optimizeModules 模块优化"
---

# optimizeModules 模块优化

optimizeModules 钩子是模块级优化的入口，在这里可以对模块进行分析、标记和转换，为后续的 Tree Shaking 和代码生成做准备。

## 钩子机制

### 钩子定义

```typescript
class Compilation {
  hooks = {
    // 模块优化钩子
    optimizeModules: new SyncBailHook<[Iterable<Module>]>(['modules']),
    afterOptimizeModules: new SyncHook<[Iterable<Module>]>(['modules']),
  };
  
  optimizeModules(): void {
    // 循环调用直到没有更多优化
    while (this.hooks.optimizeModules.call(this.modules)) {
      // 返回 true 表示有优化发生，继续循环
    }
    
    this.hooks.afterOptimizeModules.call(this.modules);
  }
}
```

### 插件注册

```typescript
class ModuleOptimizationPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'ModuleOptimizationPlugin',
      (compilation) => {
        // 注册到 optimizeModules 钩子
        compilation.hooks.optimizeModules.tap(
          'ModuleOptimizationPlugin',
          (modules) => {
            let hasChanges = false;
            
            for (const module of modules) {
              if (this.optimizeModule(module, compilation)) {
                hasChanges = true;
              }
            }
            
            // 返回 true 继续优化，false 停止
            return hasChanges;
          }
        );
      }
    );
  }
}
```

## 导出标记优化

### FlagDependencyExportsPlugin

```typescript
class FlagDependencyExportsPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'FlagDependencyExportsPlugin',
      (compilation) => {
        compilation.hooks.optimizeDependencies.tap(
          'FlagDependencyExportsPlugin',
          (modules) => {
            // 分析并标记每个模块的导出
            for (const module of modules) {
              this.analyzeExports(module, compilation);
            }
          }
        );
      }
    );
  }
  
  analyzeExports(module: Module, compilation: Compilation): void {
    const moduleGraph = compilation.moduleGraph;
    const exportsInfo = moduleGraph.getExportsInfo(module);
    
    // 遍历模块的导出依赖
    for (const dependency of module.dependencies) {
      if (dependency instanceof HarmonyExportSpecifierDependency) {
        // ESM 具名导出
        const name = dependency.name;
        exportsInfo.getExportInfo(name).provided = true;
      } else if (dependency instanceof HarmonyExportExpressionDependency) {
        // export default
        exportsInfo.getExportInfo('default').provided = true;
      }
    }
    
    // 处理 export *
    for (const dependency of module.dependencies) {
      if (dependency instanceof HarmonyExportImportedSpecifierDependency) {
        this.processReexport(dependency, exportsInfo, compilation);
      }
    }
  }
}
```

### ExportsInfo 结构

```typescript
class ExportsInfo {
  // 导出信息映射
  private _exports: Map<string, ExportInfo>;
  
  // 其他导出信息（用于 export *）
  private _otherExportsInfo: ExportInfo;
  
  getExportInfo(name: string): ExportInfo {
    let info = this._exports.get(name);
    if (!info) {
      info = new ExportInfo(name);
      this._exports.set(name, info);
    }
    return info;
  }
  
  // 检查导出是否被提供
  isExportProvided(name: string): boolean {
    const info = this._exports.get(name);
    return info ? info.provided : false;
  }
  
  // 获取所有提供的导出
  getProvidedExports(): string[] | true {
    const result: string[] = [];
    for (const [name, info] of this._exports) {
      if (info.provided) {
        result.push(name);
      }
    }
    return result.length > 0 ? result : true;
  }
}

class ExportInfo {
  name: string;
  provided: boolean = false;
  used: boolean = false;
  usedName: string | false = false;
  
  constructor(name: string) {
    this.name = name;
  }
}
```

## 使用标记优化

### FlagDependencyUsagePlugin

```typescript
class FlagDependencyUsagePlugin {
  constructor(private isGlobal: boolean) {}
  
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
    
    // 从入口开始遍历
    for (const [name, entrypoint] of compilation.entrypoints) {
      const chunk = entrypoint.getEntrypointChunk();
      const entryModules = compilation.chunkGraph.getChunkEntryModulesIterable(chunk);
      
      for (const module of entryModules) {
        // 入口模块的所有导出都被使用
        const exportsInfo = moduleGraph.getExportsInfo(module);
        exportsInfo.setUsedInUnknownWay();
        
        // 遍历依赖图标记使用
        this.processModule(module, compilation, new Set());
      }
    }
  }
  
  processModule(
    module: Module,
    compilation: Compilation,
    visited: Set<Module>
  ): void {
    if (visited.has(module)) return;
    visited.add(module);
    
    const moduleGraph = compilation.moduleGraph;
    
    for (const dependency of module.dependencies) {
      const depModule = moduleGraph.getModule(dependency);
      if (!depModule) continue;
      
      // 获取引用的导出
      if (dependency instanceof HarmonyImportSpecifierDependency) {
        const exportName = dependency.name;
        const exportsInfo = moduleGraph.getExportsInfo(depModule);
        
        // 标记导出被使用
        exportsInfo.getExportInfo(exportName).used = true;
      }
      
      // 递归处理依赖模块
      this.processModule(depModule, compilation, visited);
    }
  }
}
```

### 使用状态传播

```typescript
class UsagePropagator {
  propagate(compilation: Compilation): void {
    const queue: Module[] = [];
    const moduleGraph = compilation.moduleGraph;
    
    // 收集入口模块
    for (const entrypoint of compilation.entrypoints.values()) {
      const chunk = entrypoint.getEntrypointChunk();
      for (const module of compilation.chunkGraph.getChunkEntryModulesIterable(chunk)) {
        queue.push(module);
      }
    }
    
    // 广度优先传播
    while (queue.length > 0) {
      const module = queue.shift()!;
      
      for (const connection of moduleGraph.getOutgoingConnections(module)) {
        const depModule = connection.module;
        if (!depModule) continue;
        
        // 根据连接类型传播使用状态
        const dependency = connection.dependency;
        if (dependency) {
          const usedExports = this.getUsedExports(dependency);
          const exportsInfo = moduleGraph.getExportsInfo(depModule);
          
          let hasNewUsage = false;
          for (const name of usedExports) {
            const exportInfo = exportsInfo.getExportInfo(name);
            if (!exportInfo.used) {
              exportInfo.used = true;
              hasNewUsage = true;
            }
          }
          
          if (hasNewUsage) {
            queue.push(depModule);
          }
        }
      }
    }
  }
}
```

## 模块清理

### 移除未使用模块

```typescript
class UnusedModuleRemovalPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'UnusedModuleRemovalPlugin',
      (compilation) => {
        compilation.hooks.optimizeModules.tap(
          'UnusedModuleRemovalPlugin',
          (modules) => {
            const unusedModules = this.findUnusedModules(compilation);
            
            for (const module of unusedModules) {
              // 从所有 Chunk 中移除
              for (const chunk of compilation.chunkGraph.getModuleChunks(module)) {
                compilation.chunkGraph.disconnectChunkAndModule(chunk, module);
              }
              
              // 从模块集合中移除
              compilation.modules.delete(module);
            }
            
            return unusedModules.size > 0;
          }
        );
      }
    );
  }
  
  findUnusedModules(compilation: Compilation): Set<Module> {
    const usedModules = new Set<Module>();
    const moduleGraph = compilation.moduleGraph;
    
    // 从入口开始遍历
    const queue: Module[] = [];
    for (const entrypoint of compilation.entrypoints.values()) {
      const chunk = entrypoint.getEntrypointChunk();
      for (const module of compilation.chunkGraph.getChunkEntryModulesIterable(chunk)) {
        queue.push(module);
      }
    }
    
    while (queue.length > 0) {
      const module = queue.shift()!;
      if (usedModules.has(module)) continue;
      usedModules.add(module);
      
      // 添加依赖的模块
      for (const connection of moduleGraph.getOutgoingConnections(module)) {
        if (connection.module) {
          queue.push(connection.module);
        }
      }
    }
    
    // 返回未使用的模块
    const unused = new Set<Module>();
    for (const module of compilation.modules) {
      if (!usedModules.has(module)) {
        unused.add(module);
      }
    }
    
    return unused;
  }
}
```

### 移除未使用导出

```typescript
class UnusedExportRemovalPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'UnusedExportRemovalPlugin',
      (compilation) => {
        compilation.hooks.afterOptimizeModules.tap(
          'UnusedExportRemovalPlugin',
          (modules) => {
            const moduleGraph = compilation.moduleGraph;
            
            for (const module of modules) {
              const exportsInfo = moduleGraph.getExportsInfo(module);
              
              // 收集未使用的导出
              const unusedExports: string[] = [];
              for (const [name, info] of exportsInfo.exports) {
                if (info.provided && !info.used) {
                  unusedExports.push(name);
                }
              }
              
              // 标记供后续处理
              if (unusedExports.length > 0) {
                moduleGraph.setUnusedExports(module, unusedExports);
              }
            }
          }
        );
      }
    );
  }
}
```

## 模块转换

### 模块压缩标记

```typescript
class ModuleMinimizePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'ModuleMinimizePlugin',
      (compilation) => {
        compilation.hooks.optimizeModules.tap(
          'ModuleMinimizePlugin',
          (modules) => {
            for (const module of modules) {
              // 检查模块是否应该被压缩
              if (this.shouldMinimize(module, compilation)) {
                module._minimize = true;
              }
            }
            
            return false; // 不需要重复执行
          }
        );
      }
    );
  }
  
  shouldMinimize(module: Module, compilation: Compilation): boolean {
    // 检查模块类型
    if (!(module instanceof NormalModule)) {
      return false;
    }
    
    // 检查资源路径
    const resource = module.resource;
    if (!resource) {
      return false;
    }
    
    // 检查是否在 node_modules 中（通常已压缩）
    if (resource.includes('node_modules') && resource.endsWith('.min.js')) {
      return false;
    }
    
    return true;
  }
}
```

## 总结

optimizeModules 模块优化的核心要点：

**钩子机制**：
- 循环调用直到无优化
- 支持多插件协作

**导出标记**：
- FlagDependencyExportsPlugin
- 分析模块导出
- 构建 ExportsInfo

**使用标记**：
- FlagDependencyUsagePlugin
- 从入口传播
- 标记使用的导出

**模块清理**：
- 移除未使用模块
- 移除未使用导出

**模块转换**：
- 压缩标记
- 类型检查

**下一章**：我们将学习 optimizeChunks 代码块优化。
