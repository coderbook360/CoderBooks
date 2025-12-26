---
sidebar_position: 122
title: "Chunk 文件生成"
---

# Chunk 文件生成

Chunk 文件生成是将 Chunk 对象转换为实际 JavaScript 文件的过程，是代码生成的最后关键步骤。

## 生成流程

### 整体架构

```
Chunk ──→ RenderManifest ──→ Render ──→ Asset
  │            │               │          │
  ▼            ▼               ▼          ▼
收集模块    确定输出格式    生成代码    写入文件
```

### 触发时机

```typescript
class Compilation {
  seal(callback: Callback): void {
    // ... 优化和代码生成阶段
    
    // 创建 chunk 资源
    this.createChunkAssets((err) => {
      if (err) return callback(err);
      
      // 处理资源
      this.hooks.processAssets.callAsync(this.assets, callback);
    });
  }
}
```

## RenderManifest

### 生成渲染清单

```typescript
class Compilation {
  createChunkAssets(callback: Callback): void {
    asyncLib.forEach(
      this.chunks,
      (chunk, callback) => {
        this.createChunkAsset(chunk, callback);
      },
      callback
    );
  }
  
  createChunkAsset(chunk: Chunk, callback: Callback): void {
    // 生成渲染清单
    const manifest = this.getRenderManifest({
      chunk,
      hash: this.hash,
      fullHash: this.fullHash,
      outputOptions: this.outputOptions,
      codeGenerationResults: this.codeGenerationResults,
      moduleTemplates: this.moduleTemplates,
      dependencyTemplates: this.dependencyTemplates,
      runtimeTemplate: this.runtimeTemplate,
      moduleGraph: this.moduleGraph,
      chunkGraph: this.chunkGraph,
    });
    
    // 渲染每个清单项
    asyncLib.forEach(
      manifest,
      (entry, callback) => {
        this.renderManifestEntry(entry, chunk, callback);
      },
      callback
    );
  }
  
  getRenderManifest(options: RenderManifestOptions): RenderManifestEntry[] {
    const manifest: RenderManifestEntry[] = [];
    
    // 触发 hook 收集清单项
    this.hooks.renderManifest.call(manifest, options);
    
    return manifest;
  }
}
```

### RenderManifestEntry 结构

```typescript
interface RenderManifestEntry {
  // 渲染函数
  render: () => Source;
  
  // 文件名模板
  filenameTemplate: string;
  
  // 路径选项
  pathOptions: {
    chunk: Chunk;
    hash: string;
    contentHash: string;
  };
  
  // 标识符（用于缓存）
  identifier: string;
  
  // 内容哈希类型
  contentHashType: string;
}
```

## JavascriptModulesPlugin

### 注册渲染清单

```typescript
class JavascriptModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'JavascriptModulesPlugin',
      (compilation) => {
        compilation.hooks.renderManifest.tap(
          'JavascriptModulesPlugin',
          (result, options) => {
            const { chunk, chunkGraph, outputOptions } = options;
            
            // 检查是否有 JavaScript 内容
            if (!this.hasJavaScript(chunk, chunkGraph)) {
              return result;
            }
            
            // 添加 JavaScript 渲染项
            result.push({
              render: () => this.renderChunk(options),
              filenameTemplate: this.getFilenameTemplate(chunk, outputOptions),
              pathOptions: {
                chunk,
                contentHashType: 'javascript',
              },
              identifier: `chunk${chunk.id}`,
              contentHashType: 'javascript',
            });
            
            return result;
          }
        );
      }
    );
  }
  
  hasJavaScript(chunk: Chunk, chunkGraph: ChunkGraph): boolean {
    const modules = chunkGraph.getChunkModulesIterableBySourceType(
      chunk,
      'javascript'
    );
    return modules && [...modules].length > 0;
  }
  
  getFilenameTemplate(chunk: Chunk, outputOptions: OutputOptions): string {
    if (chunk.isOnlyInitial()) {
      return outputOptions.filename;
    }
    return outputOptions.chunkFilename;
  }
}
```

### 渲染 Chunk

```typescript
class JavascriptModulesPlugin {
  renderChunk(options: RenderManifestOptions): Source {
    const { chunk, chunkGraph, runtimeTemplate } = options;
    
    if (chunk.hasRuntime()) {
      // 入口 chunk，包含运行时
      return this.renderMain(options);
    } else {
      // 普通 chunk，使用 JSONP
      return this.renderAsyncChunk(options);
    }
  }
  
  renderMain(options: RenderManifestOptions): Source {
    const { chunk, chunkGraph, compilation } = options;
    
    const source = new ConcatSource();
    
    // IIFE 包装
    source.add('(() => {\n');
    
    // 模块字典
    source.add('var __webpack_modules__ = {\n');
    source.add(this.renderChunkModules(options));
    source.add('\n};\n');
    
    // 运行时
    source.add(this.renderRuntime(options));
    
    // 启动代码
    source.add(this.renderStartup(options));
    
    // IIFE 结束
    source.add('\n})();\n');
    
    return source;
  }
  
  renderAsyncChunk(options: RenderManifestOptions): Source {
    const { chunk, chunkGraph, outputOptions } = options;
    
    const chunkId = chunkGraph.getChunkId(chunk);
    const source = new ConcatSource();
    
    // JSONP 回调
    source.add(
      `(self["webpackChunk"] = self["webpackChunk"] || []).push([\n`
    );
    
    // Chunk ID
    source.add(`  [${JSON.stringify(chunkId)}],\n`);
    
    // 模块字典
    source.add('  {\n');
    source.add(this.renderChunkModules(options));
    source.add('\n  }\n');
    
    // 关闭回调
    source.add(']);\n');
    
    return source;
  }
}
```

## 模块渲染

### 渲染模块字典

```typescript
class JavascriptModulesPlugin {
  renderChunkModules(options: RenderManifestOptions): Source {
    const { chunk, chunkGraph, compilation } = options;
    
    const source = new ConcatSource();
    const modules = this.getChunkModules(chunk, chunkGraph);
    
    let first = true;
    
    for (const module of modules) {
      if (!first) {
        source.add(',\n');
      }
      first = false;
      
      source.add(this.renderModule(module, options));
    }
    
    return source;
  }
  
  renderModule(module: Module, options: RenderManifestOptions): Source {
    const { chunkGraph, compilation, runtimeTemplate } = options;
    
    const moduleId = chunkGraph.getModuleId(module);
    const source = new ConcatSource();
    
    // 模块 ID 作为键
    source.add(`${JSON.stringify(moduleId)}: `);
    
    // 模块函数
    source.add('(function(module, __webpack_exports__, __webpack_require__) {\n');
    
    // 严格模式
    if (module.buildMeta?.strictHarmonyModule) {
      source.add('"use strict";\n');
    }
    
    // ESM 标记
    if (module.buildMeta?.exportsType === 'namespace') {
      source.add('__webpack_require__.r(__webpack_exports__);\n');
    }
    
    // 模块代码
    const codeGenResult = compilation.codeGenerationResults.get(module);
    const moduleSource = codeGenResult?.sources.get('javascript');
    
    if (moduleSource) {
      source.add(moduleSource);
    }
    
    // 关闭函数
    source.add('\n})');
    
    return source;
  }
  
  getChunkModules(chunk: Chunk, chunkGraph: ChunkGraph): Module[] {
    const modules = chunkGraph.getChunkModulesIterableBySourceType(
      chunk,
      'javascript'
    );
    
    if (!modules) return [];
    
    // 按 ID 排序保持稳定性
    return [...modules].sort((a, b) => {
      const idA = chunkGraph.getModuleId(a);
      const idB = chunkGraph.getModuleId(b);
      
      if (typeof idA === 'number' && typeof idB === 'number') {
        return idA - idB;
      }
      
      return String(idA).localeCompare(String(idB));
    });
  }
}
```

## 运行时渲染

### 渲染运行时代码

```typescript
class JavascriptModulesPlugin {
  renderRuntime(options: RenderManifestOptions): Source {
    const { chunk, chunkGraph, compilation } = options;
    
    const source = new ConcatSource();
    
    // 模块缓存
    source.add(`
// 模块缓存
var __webpack_module_cache__ = {};

// require 函数
function __webpack_require__(moduleId) {
  var cachedModule = __webpack_module_cache__[moduleId];
  if (cachedModule !== undefined) {
    return cachedModule.exports;
  }
  var module = __webpack_module_cache__[moduleId] = {
    exports: {}
  };
  __webpack_modules__[moduleId](module, module.exports, __webpack_require__);
  return module.exports;
}

`);
    
    // 添加运行时模块
    const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(chunk);
    
    for (const runtimeModule of runtimeModules) {
      source.add(`// ${runtimeModule.name}\n`);
      source.add(runtimeModule.getGeneratedCode());
      source.add('\n');
    }
    
    return source;
  }
  
  renderStartup(options: RenderManifestOptions): Source {
    const { chunk, chunkGraph, compilation } = options;
    
    const source = new ConcatSource();
    
    // 获取入口模块
    const entryModules = chunkGraph.getChunkEntryModulesIterable(chunk);
    
    for (const [entryModule, entrypoint] of entryModules) {
      const moduleId = chunkGraph.getModuleId(entryModule);
      
      // 执行入口模块
      source.add(`\n// 启动\n`);
      source.add(`var __webpack_exports__ = __webpack_require__(${JSON.stringify(moduleId)});\n`);
    }
    
    return source;
  }
}
```

## 资源发射

### 写入资源

```typescript
class Compilation {
  renderManifestEntry(
    entry: RenderManifestEntry,
    chunk: Chunk,
    callback: Callback
  ): void {
    // 渲染内容
    let source: Source;
    try {
      source = entry.render();
    } catch (err) {
      return callback(err);
    }
    
    // 计算内容哈希
    const contentHash = this.getContentHash(source, entry.contentHashType);
    
    // 生成文件名
    const filename = this.getPath(entry.filenameTemplate, {
      ...entry.pathOptions,
      contentHash,
    });
    
    // 发射资源
    this.emitAsset(filename, source, {
      chunk,
      contentHash,
    });
    
    // 记录 chunk 文件
    chunk.files.add(filename);
    
    callback();
  }
  
  emitAsset(filename: string, source: Source, info?: AssetInfo): void {
    this.assets[filename] = source;
    
    if (info) {
      this.assetsInfo.set(filename, info);
    }
  }
}
```

## 多格式输出

### ESM 输出

```typescript
class JavascriptModulesPlugin {
  renderEsmChunk(options: RenderManifestOptions): Source {
    const source = new ConcatSource();
    
    // ESM 模块
    source.add('// ESM 格式\n');
    
    // 导入语句
    const imports = this.collectImports(options);
    for (const imp of imports) {
      source.add(`import ${imp.local} from ${JSON.stringify(imp.source)};\n`);
    }
    
    // 模块代码
    source.add(this.renderChunkModules(options));
    
    // 导出语句
    const exports = this.collectExports(options);
    for (const exp of exports) {
      source.add(`export { ${exp.local} as ${exp.exported} };\n`);
    }
    
    return source;
  }
}
```

### CommonJS 输出

```typescript
class JavascriptModulesPlugin {
  renderCommonJsChunk(options: RenderManifestOptions): Source {
    const source = new ConcatSource();
    
    // CommonJS 模块
    source.add('// CommonJS 格式\n');
    
    // 模块代码
    source.add(this.renderChunkModules(options));
    
    // 导出
    source.add('module.exports = __webpack_exports__;\n');
    
    return source;
  }
}
```

## 输出优化

### 压缩处理

```typescript
class Compilation {
  createChunkAssets(callback: Callback): void {
    // 生成资源
    this.createChunkAssetsInternal((err) => {
      if (err) return callback(err);
      
      // 处理资源（压缩等）
      this.hooks.processAssets.callAsync(
        this.assets,
        (err) => {
          if (err) return callback(err);
          
          // 完成
          this.hooks.afterProcessAssets.call(this.assets);
          callback();
        }
      );
    });
  }
}
```

## 总结

Chunk 文件生成的核心要点：

**生成流程**：
1. RenderManifest 收集
2. 模块渲染
3. 运行时注入
4. 资源发射

**渲染类型**：
- 入口 chunk（包含运行时）
- 异步 chunk（JSONP 格式）

**模块渲染**：
- 模块函数包装
- ESM 标记
- 严格模式

**输出格式**：
- IIFE（默认）
- ESM
- CommonJS

**资源处理**：
- 内容哈希
- 文件名生成
- 压缩优化

**下一章**：我们将学习 Asset 资源管理。
