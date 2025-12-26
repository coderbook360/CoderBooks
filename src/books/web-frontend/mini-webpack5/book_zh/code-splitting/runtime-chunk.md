---
sidebar_position: 105
title: "Runtime Chunk 运行时分离"
---

# Runtime Chunk 运行时分离

Runtime Chunk 包含 Webpack 的运行时代码，负责模块加载、Chunk 管理等核心功能。分离运行时代码可以优化长期缓存。

## 运行时代码概述

### 运行时包含什么

```javascript
// Webpack 运行时代码主要包含：

// 1. 模块缓存
var __webpack_module_cache__ = {};

// 2. 模块加载函数
function __webpack_require__(moduleId) {
  // 检查缓存
  if (__webpack_module_cache__[moduleId]) {
    return __webpack_module_cache__[moduleId].exports;
  }
  // 创建新模块
  var module = __webpack_module_cache__[moduleId] = { exports: {} };
  // 执行模块函数
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}

// 3. 异步 Chunk 加载
__webpack_require__.e = function(chunkId) { /* ... */ };

// 4. 公共路径
__webpack_require__.p = "/dist/";

// 5. 其他辅助函数...
```

### 为什么分离运行时

```
不分离运行时：
entry1.js = 运行时代码(10KB) + 业务代码(100KB)
entry2.js = 运行时代码(10KB) + 业务代码(80KB)

问题：
1. 运行时代码重复
2. 业务代码改动导致整个文件哈希变化

分离运行时：
runtime.js  = 运行时代码(10KB)     ← 长期稳定
entry1.js   = 业务代码(100KB)       ← 按需更新
entry2.js   = 业务代码(80KB)        ← 按需更新

优势：
1. 消除重复代码
2. 运行时变化少，利于缓存
3. 业务代码更新不影响运行时缓存
```

## 配置方式

### 基本配置

```javascript
module.exports = {
  optimization: {
    // 方式1：每个入口单独的运行时
    runtimeChunk: true,
    // 等价于
    runtimeChunk: 'multiple',
    
    // 方式2：所有入口共享一个运行时
    runtimeChunk: 'single',
    
    // 方式3：自定义名称
    runtimeChunk: {
      name: 'runtime',
    },
    
    // 方式4：动态名称
    runtimeChunk: {
      name: (entrypoint) => `runtime~${entrypoint.name}`,
    },
  },
};
```

### 与 splitChunks 配合

```javascript
module.exports = {
  optimization: {
    runtimeChunk: 'single',
    splitChunks: {
      chunks: 'all',
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all',
        },
      },
    },
  },
};

// 输出结构：
// runtime.js   - 运行时
// vendors.js   - 第三方库
// main.js      - 入口业务代码
```

## 实现原理

### RuntimeChunkPlugin

```typescript
class RuntimeChunkPlugin {
  private options: RuntimeChunkOptions;
  
  constructor(options: RuntimeChunkOptions = {}) {
    this.options = {
      name: options.name || ((entrypoint) => `runtime~${entrypoint.name}`),
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.thisCompilation.tap(
      'RuntimeChunkPlugin',
      (compilation) => {
        compilation.hooks.addEntry.tap(
          'RuntimeChunkPlugin',
          (entry, { name }) => {
            if (!name) return;
            
            const entrypoint = compilation.entrypoints.get(name);
            if (!entrypoint) return;
            
            // 创建运行时 Chunk
            this.setupRuntimeChunk(compilation, entrypoint, name);
          }
        );
      }
    );
  }
  
  setupRuntimeChunk(
    compilation: Compilation,
    entrypoint: Entrypoint,
    entryName: string
  ): void {
    // 计算运行时 Chunk 名称
    const name = typeof this.options.name === 'function'
      ? this.options.name(entrypoint)
      : this.options.name;
    
    // 获取或创建运行时 Chunk
    let runtimeChunk = compilation.namedChunks.get(name);
    
    if (!runtimeChunk) {
      runtimeChunk = new Chunk(name);
      compilation.namedChunks.set(name, runtimeChunk);
      compilation.chunks.add(runtimeChunk);
    }
    
    // 设置入口点的运行时 Chunk
    entrypoint.setRuntimeChunk(runtimeChunk);
  }
}
```

### 运行时 Chunk 处理

```typescript
class Compilation {
  processRuntimeChunks(): void {
    for (const [name, entrypoint] of this.entrypoints) {
      const runtimeChunk = entrypoint.getRuntimeChunk();
      const entryChunk = entrypoint.getEntrypointChunk();
      
      if (runtimeChunk !== entryChunk) {
        // 运行时被分离
        // 确保运行时 Chunk 在加载顺序中优先
        this.ensureRuntimeLoadOrder(entrypoint, runtimeChunk);
      }
    }
  }
  
  ensureRuntimeLoadOrder(
    entrypoint: Entrypoint,
    runtimeChunk: Chunk
  ): void {
    // 运行时 Chunk 必须先于入口 Chunk 加载
    // 在生成 HTML 时，确保 runtime.js 在 main.js 之前
  }
}
```

## RuntimeModule 系统

### 运行时模块类型

```typescript
abstract class RuntimeModule extends Module {
  // 生成阶段
  stage: number = 0;
  
  // 所属 Chunk
  chunk: Chunk | null = null;
  
  // 生成运行时代码
  abstract generate(): string;
  
  // 模块标识
  identifier(): string {
    return `webpack/runtime/${this.name}`;
  }
}

// 核心运行时模块
class GetFullHashRuntimeModule extends RuntimeModule {
  generate(): string {
    return `__webpack_require__.h = function() { return "${this.hash}"; };`;
  }
}

class PublicPathRuntimeModule extends RuntimeModule {
  generate(): string {
    return `__webpack_require__.p = ${JSON.stringify(this.publicPath)};`;
  }
}

class LoadScriptRuntimeModule extends RuntimeModule {
  generate(): string {
    return Template.asString([
      '__webpack_require__.l = function(url, done, key) {',
      Template.indent([
        'var script = document.createElement("script");',
        'script.src = url;',
        'script.onload = done;',
        'document.head.appendChild(script);',
      ]),
      '};',
    ]);
  }
}
```

### 运行时模块注册

```typescript
class Compilation {
  addRuntimeModule(chunk: Chunk, module: RuntimeModule): void {
    // 连接到 Chunk
    this.chunkGraph.addChunkRuntimeModule(chunk, module);
    
    // 设置模块属性
    module.chunk = chunk;
    module.compilation = this;
    
    // 添加到模块集合
    this.modules.add(module);
  }
  
  processRuntimeRequirements(): void {
    // 收集所有运行时需求
    const requirements = new Set<string>();
    
    for (const chunk of this.chunks) {
      if (chunk.hasRuntime()) {
        // 收集 Chunk 的运行时需求
        const chunkRequirements = this.getChunkRuntimeRequirements(chunk);
        for (const req of chunkRequirements) {
          requirements.add(req);
        }
      }
    }
    
    // 根据需求添加运行时模块
    for (const chunk of this.chunks) {
      if (chunk.hasRuntime()) {
        this.addRequiredRuntimeModules(chunk, requirements);
      }
    }
  }
  
  addRequiredRuntimeModules(chunk: Chunk, requirements: Set<string>): void {
    if (requirements.has('require')) {
      this.addRuntimeModule(chunk, new RequireRuntimeModule());
    }
    
    if (requirements.has('ensure')) {
      this.addRuntimeModule(chunk, new EnsureChunkRuntimeModule());
    }
    
    if (requirements.has('publicPath')) {
      this.addRuntimeModule(chunk, new PublicPathRuntimeModule(this.outputOptions.publicPath));
    }
    
    // ... 其他运行时模块
  }
}
```

## 共享运行时

### 单一运行时配置

```typescript
class RuntimeChunkPlugin {
  setupSingleRuntime(compilation: Compilation): void {
    const runtimeName = 'runtime';
    let runtimeChunk: Chunk | null = null;
    
    for (const [name, entrypoint] of compilation.entrypoints) {
      if (!runtimeChunk) {
        // 创建共享的运行时 Chunk
        runtimeChunk = new Chunk(runtimeName);
        compilation.namedChunks.set(runtimeName, runtimeChunk);
        compilation.chunks.add(runtimeChunk);
      }
      
      // 所有入口共享同一个运行时 Chunk
      entrypoint.setRuntimeChunk(runtimeChunk);
    }
  }
}
```

### 运行时合并

```typescript
class Compilation {
  mergeRuntimeChunks(): void {
    const runtimeChunks = new Map<string, Set<Chunk>>();
    
    // 收集相同运行时需求的 Chunk
    for (const chunk of this.chunks) {
      if (chunk.hasRuntime()) {
        const key = this.getRuntimeRequirementsKey(chunk);
        
        let chunks = runtimeChunks.get(key);
        if (!chunks) {
          chunks = new Set();
          runtimeChunks.set(key, chunks);
        }
        chunks.add(chunk);
      }
    }
    
    // 合并相同需求的运行时 Chunk
    for (const chunks of runtimeChunks.values()) {
      if (chunks.size > 1) {
        const primary = chunks.values().next().value;
        
        for (const chunk of chunks) {
          if (chunk !== primary) {
            this.mergeChunks(primary, chunk);
          }
        }
      }
    }
  }
  
  getRuntimeRequirementsKey(chunk: Chunk): string {
    const requirements = this.getChunkRuntimeRequirements(chunk);
    return Array.from(requirements).sort().join(',');
  }
}
```

## 运行时代码优化

### 条件生成

```typescript
class Compilation {
  // 只生成需要的运行时代码
  generateRuntimeCode(chunk: Chunk): string {
    const requirements = this.getChunkRuntimeRequirements(chunk);
    const parts: string[] = [];
    
    // 基础模块系统（总是需要）
    parts.push(this.generateBaseRuntime());
    
    // 条件性添加
    if (requirements.has('ensure')) {
      parts.push(this.generateEnsureRuntime());
    }
    
    if (requirements.has('exports')) {
      parts.push(this.generateExportsRuntime());
    }
    
    if (requirements.has('module')) {
      parts.push(this.generateModuleRuntime());
    }
    
    return parts.join('\n');
  }
}
```

### 运行时压缩

```typescript
class RuntimeOptimizer {
  optimize(runtimeCode: string): string {
    // 移除未使用的辅助函数
    runtimeCode = this.removeUnusedHelpers(runtimeCode);
    
    // 内联小函数
    runtimeCode = this.inlineSmallFunctions(runtimeCode);
    
    // 压缩变量名
    runtimeCode = this.minifyVariables(runtimeCode);
    
    return runtimeCode;
  }
}
```

## 总结

Runtime Chunk 运行时分离的核心要点：

**运行时内容**：
- 模块缓存机制
- 模块加载函数
- 异步 Chunk 加载
- 公共路径配置

**分离优势**：
- 消除重复代码
- 优化长期缓存
- 减小打包体积

**配置方式**：
- single：共享运行时
- multiple：独立运行时
- 自定义名称函数

**实现机制**：
- RuntimeChunkPlugin
- RuntimeModule 系统
- 运行时需求收集

**优化策略**：
- 条件性生成
- 运行时合并
- 代码压缩

**下一章**：我们将学习 minSize/maxSize 限制策略。
