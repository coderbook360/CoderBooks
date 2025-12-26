---
sidebar_position: 113
title: "Scope Hoisting 作用域提升"
---

# Scope Hoisting 作用域提升

Scope Hoisting（作用域提升）是一种将多个模块合并到同一个作用域中的优化技术，可以减少函数调用开销和代码体积。

## 核心原理

### 传统模块包装

```javascript
// 传统方式：每个模块一个函数作用域
var __webpack_modules__ = {
  './src/a.js': function(module, exports) {
    const a = 1;
    module.exports = a;
  },
  './src/b.js': function(module, exports, __webpack_require__) {
    const a = __webpack_require__('./src/a.js');
    console.log(a);
  },
};
```

### Scope Hoisting 效果

```javascript
// Scope Hoisting：合并到同一作用域
(function() {
  // a.js 内容
  const a = 1;
  
  // b.js 内容（直接使用 a，无需 require）
  console.log(a);
})();
```

## 优势分析

### 性能提升

```javascript
// 传统方式的开销：
// 1. 函数创建和调用开销
// 2. __webpack_require__ 查找开销
// 3. 额外的作用域链查找

// Scope Hoisting 的优势：
// 1. 减少函数数量
// 2. 消除模块查找
// 3. 更短的作用域链
// 4. 更小的代码体积
```

### 体积对比

```javascript
// 10个简单模块的对比
// 传统方式：约 1.5KB
// Scope Hoisting：约 0.8KB
// 减少约 47%
```

## 实现分析

### ModuleConcatenationPlugin

```typescript
class ModuleConcatenationPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'ModuleConcatenationPlugin',
      (compilation) => {
        compilation.hooks.optimizeChunkModules.tapAsync(
          'ModuleConcatenationPlugin',
          (chunks, modules, callback) => {
            this.optimizeChunkModules(compilation, chunks, modules, callback);
          }
        );
      }
    );
  }
  
  optimizeChunkModules(
    compilation: Compilation,
    chunks: Chunk[],
    modules: Module[],
    callback: () => void
  ): void {
    // 1. 找出可以合并的模块
    const candidates = this.findCandidates(modules, compilation);
    
    // 2. 构建合并组
    const groups = this.buildConcatenationGroups(candidates, compilation);
    
    // 3. 创建合并模块
    for (const group of groups) {
      this.createConcatenatedModule(group, compilation);
    }
    
    callback();
  }
}
```

### 候选模块筛选

```typescript
class ModuleConcatenationPlugin {
  findCandidates(modules: Module[], compilation: Compilation): Module[] {
    const candidates: Module[] = [];
    
    for (const module of modules) {
      const result = this.canConcatenate(module, compilation);
      
      if (result.isEligible) {
        candidates.push(module);
      } else {
        // 记录不能合并的原因
        module.buildMeta.concatenationBailout = result.reason;
      }
    }
    
    return candidates;
  }
  
  canConcatenate(
    module: Module,
    compilation: Compilation
  ): { isEligible: boolean; reason?: string } {
    // 必须是 ES 模块
    if (!module.buildMeta?.exportsType === 'namespace') {
      return { isEligible: false, reason: 'Module is not an ECMAScript module' };
    }
    
    // 检查是否有不兼容的导出
    if (module.buildMeta.moduleConcatenationBailout) {
      return { 
        isEligible: false, 
        reason: module.buildMeta.moduleConcatenationBailout 
      };
    }
    
    // 检查是否使用了 eval
    if (module.buildInfo?.containsEval) {
      return { isEligible: false, reason: 'Module uses eval()' };
    }
    
    // 检查是否有顶层 this
    if (module.buildInfo?.topLevelThis) {
      return { isEligible: false, reason: 'Module uses top-level this' };
    }
    
    // 检查是否被多个 chunk 使用
    const chunkGraph = compilation.chunkGraph;
    if (chunkGraph.getNumberOfModuleChunks(module) > 1) {
      // 可以合并，但需要特殊处理
    }
    
    return { isEligible: true };
  }
}
```

### 构建合并组

```typescript
class ModuleConcatenationPlugin {
  buildConcatenationGroups(
    candidates: Module[],
    compilation: Compilation
  ): ConcatenationGroup[] {
    const groups: ConcatenationGroup[] = [];
    const moduleGraph = compilation.moduleGraph;
    const processed = new Set<Module>();
    
    for (const rootModule of candidates) {
      if (processed.has(rootModule)) continue;
      
      // 构建以该模块为根的合并组
      const group = this.buildGroup(rootModule, candidates, compilation);
      
      if (group.modules.size > 1) {
        groups.push(group);
        
        for (const module of group.modules) {
          processed.add(module);
        }
      }
    }
    
    return groups;
  }
  
  buildGroup(
    rootModule: Module,
    candidates: Module[],
    compilation: Compilation
  ): ConcatenationGroup {
    const group: ConcatenationGroup = {
      rootModule,
      modules: new Set([rootModule]),
    };
    
    const candidateSet = new Set(candidates);
    const queue = [rootModule];
    
    while (queue.length > 0) {
      const module = queue.shift()!;
      
      // 查找可合并的依赖
      for (const dep of module.dependencies) {
        const depModule = compilation.moduleGraph.getModule(dep);
        
        if (!depModule) continue;
        if (group.modules.has(depModule)) continue;
        if (!candidateSet.has(depModule)) continue;
        
        // 检查是否可以合并
        if (this.canMergeModules(module, depModule, compilation)) {
          group.modules.add(depModule);
          queue.push(depModule);
        }
      }
    }
    
    return group;
  }
  
  canMergeModules(
    parent: Module,
    child: Module,
    compilation: Compilation
  ): boolean {
    const moduleGraph = compilation.moduleGraph;
    
    // 子模块只能被父模块使用
    const incomingConnections = moduleGraph.getIncomingConnections(child);
    
    for (const connection of incomingConnections) {
      if (connection.originModule !== parent) {
        // 被其他模块引用，不能合并
        return false;
      }
    }
    
    return true;
  }
}
```

## 代码生成

### ConcatenatedModule

```typescript
class ConcatenatedModule extends Module {
  private rootModule: Module;
  private modules: Module[];
  
  constructor(rootModule: Module, modules: Module[]) {
    super('javascript/esm', null);
    this.rootModule = rootModule;
    this.modules = modules;
  }
  
  codeGeneration(context: CodeGenerationContext): CodeGenerationResult {
    const { chunkGraph, moduleGraph, runtime } = context;
    
    // 生成合并后的代码
    const source = new ConcatSource();
    
    // 添加模块作用域包装
    source.add('(function() {\n');
    
    // 按依赖顺序添加模块代码
    const orderedModules = this.getOrderedModules(moduleGraph);
    
    for (const module of orderedModules) {
      source.add(`// MODULE: ${module.identifier()}\n`);
      source.add(this.generateModuleCode(module, context));
      source.add('\n');
    }
    
    source.add('})();\n');
    
    return {
      sources: new Map([['javascript', source]]),
    };
  }
  
  getOrderedModules(moduleGraph: ModuleGraph): Module[] {
    // 拓扑排序，确保依赖在前
    const visited = new Set<Module>();
    const result: Module[] = [];
    
    const visit = (module: Module) => {
      if (visited.has(module)) return;
      visited.add(module);
      
      // 先访问依赖
      for (const dep of module.dependencies) {
        const depModule = moduleGraph.getModule(dep);
        if (depModule && this.modules.includes(depModule)) {
          visit(depModule);
        }
      }
      
      result.push(module);
    };
    
    visit(this.rootModule);
    
    return result;
  }
  
  generateModuleCode(module: Module, context: CodeGenerationContext): string {
    // 生成模块代码，处理变量重命名
    const source = module.originalSource();
    
    // 重命名导出以避免冲突
    const renames = this.getRenames(module, context);
    
    return this.applyRenames(source, renames);
  }
}
```

### 变量重命名

```typescript
class ConcatenatedModule {
  getRenames(module: Module, context: CodeGenerationContext): Map<string, string> {
    const renames = new Map<string, string>();
    const usedNames = this.getUsedNames();
    
    // 处理导出变量
    const exportsInfo = context.moduleGraph.getExportsInfo(module);
    
    for (const [name, info] of exportsInfo.exports) {
      if (!info.provided) continue;
      
      const originalName = info.name;
      
      // 如果名称冲突，生成唯一名称
      if (usedNames.has(originalName)) {
        const uniqueName = this.generateUniqueName(originalName, usedNames);
        renames.set(originalName, uniqueName);
        usedNames.add(uniqueName);
      } else {
        usedNames.add(originalName);
      }
    }
    
    return renames;
  }
  
  generateUniqueName(base: string, usedNames: Set<string>): string {
    let counter = 1;
    let name = `${base}_${counter}`;
    
    while (usedNames.has(name)) {
      counter++;
      name = `${base}_${counter}`;
    }
    
    return name;
  }
}
```

## 配置选项

### 启用 Scope Hoisting

```javascript
module.exports = {
  optimization: {
    concatenateModules: true,  // production 默认开启
  },
};

// 或使用插件
const webpack = require('webpack');

module.exports = {
  plugins: [
    new webpack.optimize.ModuleConcatenationPlugin(),
  ],
};
```

### 调试配置

```javascript
module.exports = {
  stats: {
    optimizationBailout: true,  // 显示不能合并的原因
  },
};
```

## 限制条件

### 不能合并的情况

```javascript
// ❌ 使用 CommonJS
const a = require('./a');  // 阻止合并

// ❌ 使用 eval
eval('console.log(1)');  // 阻止合并

// ❌ 使用顶层 this
console.log(this);  // 阻止合并

// ❌ 非 ESM 模块
module.exports = {};  // 阻止合并

// ❌ 被多个模块引用
// a.js 被 b.js 和 c.js 同时引用
// 不能合并到任一模块

// ❌ 动态导入
const a = import('./a');  // 动态导入的模块不合并
```

### 查看 bailout 原因

```
[built] ./src/utils.js + 2 modules
  ModuleConcatenation bailout: Cannot concat with ./node_modules/lodash/lodash.js: Module is not an ECMAScript module
```

## 与其他优化配合

### 完整优化配置

```javascript
module.exports = {
  mode: 'production',
  optimization: {
    // Tree Shaking
    usedExports: true,
    sideEffects: true,
    
    // Scope Hoisting
    concatenateModules: true,
    
    // 代码压缩
    minimize: true,
  },
};
```

## 总结

Scope Hoisting 作用域提升的核心要点：

**核心原理**：
- 合并模块到同一作用域
- 消除函数包装开销

**优势**：
- 减少代码体积
- 提升运行性能
- 简化作用域链

**限制条件**：
- 必须是 ESM 模块
- 不能使用 eval
- 不能使用顶层 this
- 不能被多模块引用

**配置方式**：
- concatenateModules: true
- ModuleConcatenationPlugin

**调试方法**：
- optimizationBailout 查看原因

**下一章**：我们将学习 Module Concatenation 模块合并的更多细节。
