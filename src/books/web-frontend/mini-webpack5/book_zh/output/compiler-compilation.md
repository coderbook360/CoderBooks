---
sidebar_position: 126
title: "Compiler 与 Compilation 输出协作"
---

# Compiler 与 Compilation 输出协作

Compiler 和 Compilation 在输出阶段有着明确的职责分工，理解它们的协作机制对于理解 Webpack 输出流程至关重要。

## 职责划分

### Compiler 职责

```typescript
class Compiler {
  // 配置管理
  options: WebpackOptions;
  outputPath: string;
  
  // 文件系统
  outputFileSystem: OutputFileSystem;
  
  // 生命周期管理
  hooks: CompilerHooks;
  
  // 核心职责：
  // 1. 管理输出文件系统
  // 2. 协调输出流程
  // 3. 触发输出相关钩子
  // 4. 实际写入文件
}
```

### Compilation 职责

```typescript
class Compilation {
  // 资源管理
  assets: Record<string, Source>;
  assetsInfo: Map<string, AssetInfo>;
  
  // 模块和 chunk 图
  moduleGraph: ModuleGraph;
  chunkGraph: ChunkGraph;
  
  // 核心职责：
  // 1. 管理所有生成的资源
  // 2. 提供资源信息查询
  // 3. 资源处理和优化
  // 4. 路径模板解析
}
```

## 协作流程

### 完整输出流程

```typescript
class Compiler {
  emitAssets(compilation: Compilation, callback: Callback): void {
    // 1. 从 Compilation 获取输出路径配置
    const outputPath = compilation.getPath(
      this.outputPath,
      { hash: compilation.hash }
    );
    
    // 2. Compiler 创建输出目录
    this.outputFileSystem.mkdirp(outputPath, (err) => {
      if (err) return callback(err);
      
      // 3. 触发 emit 钩子，允许插件最后修改
      this.hooks.emit.callAsync(compilation, (err) => {
        if (err) return callback(err);
        
        // 4. 从 Compilation 获取所有资源
        const assets = compilation.getAssets();
        
        // 5. Compiler 负责写入文件系统
        this.writeAssets(assets, outputPath, compilation, (err) => {
          if (err) return callback(err);
          
          // 6. 触发 afterEmit 钩子
          this.hooks.afterEmit.callAsync(compilation, callback);
        });
      });
    });
  }
}
```

### 信息流向

```
Compilation                    Compiler
    │                             │
    │   getPath(template)         │
    │◄────────────────────────────┤
    │                             │
    │   getAssets()               │
    │◄────────────────────────────┤
    │                             │
    ├────────────────────────────►│
    │   writeFile()               │
    │                             │
    │   assetEmitted hook         │
    │◄────────────────────────────┤
```

## 路径解析

### Compilation.getPath

```typescript
class Compilation {
  getPath(template: string, data: PathData): string {
    return this.hooks.assetPath.call(
      template,
      data,
      undefined
    );
  }
  
  getPathWithInfo(
    template: string,
    data: PathData
  ): { path: string; info: AssetInfo } {
    const info: AssetInfo = {};
    
    const path = this.hooks.assetPath.call(
      template,
      data,
      info
    );
    
    return { path, info };
  }
}

interface PathData {
  hash?: string;
  chunk?: Chunk;
  module?: Module;
  filename?: string;
  contentHash?: string;
  runtime?: string;
}
```

### 模板解析插件

```typescript
class TemplatedPathPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'TemplatedPathPlugin',
      (compilation) => {
        compilation.hooks.assetPath.tap(
          'TemplatedPathPlugin',
          (path, data, assetInfo) => {
            return this.replacePathVariables(path, data, assetInfo);
          }
        );
      }
    );
  }
  
  replacePathVariables(
    template: string,
    data: PathData,
    assetInfo?: AssetInfo
  ): string {
    const { chunk, module, hash, contentHash } = data;
    
    return template
      .replace(/\[name\]/g, () => {
        return chunk?.name || module?.readableIdentifier() || '';
      })
      .replace(/\[id\]/g, () => {
        return String(chunk?.id || module?.id || '');
      })
      .replace(/\[hash(?::(\d+))?\]/g, (match, length) => {
        const h = hash || '';
        if (assetInfo) assetInfo.immutable = true;
        return length ? h.slice(0, parseInt(length, 10)) : h;
      })
      .replace(/\[contenthash(?::(\d+))?\]/g, (match, length) => {
        const h = contentHash || '';
        if (assetInfo) assetInfo.immutable = true;
        return length ? h.slice(0, parseInt(length, 10)) : h;
      });
  }
}
```

## 资源信息传递

### AssetInfo 传递

```typescript
class Compilation {
  emitAsset(filename: string, source: Source, info?: AssetInfo): void {
    // 存储资源
    this.assets[filename] = source;
    
    // 存储资源信息
    if (info) {
      const existingInfo = this.assetsInfo.get(filename) || {};
      this.assetsInfo.set(filename, { ...existingInfo, ...info });
    }
  }
}

class Compiler {
  writeAsset(asset: Asset, outputPath: string, compilation: Compilation, callback: Callback): void {
    const { name, source, info } = asset;
    
    // 使用 Compilation 提供的资源信息
    if (info.immutable) {
      // 可以设置更长的缓存时间
    }
    
    if (info.development) {
      // 开发资源，可能需要不同处理
    }
    
    // 写入文件
    this.outputFileSystem.writeFile(
      path.join(outputPath, name),
      source.buffer(),
      callback
    );
  }
}
```

### Chunk 文件关联

```typescript
class Compilation {
  // 关联资源和 chunk
  createChunkAssets(callback: Callback): void {
    for (const chunk of this.chunks) {
      const manifest = this.getRenderManifest({ chunk });
      
      for (const entry of manifest) {
        const source = entry.render();
        const filename = this.getPath(entry.filenameTemplate, entry.pathOptions);
        
        // 发射资源并关联 chunk
        this.emitAsset(filename, source, {
          chunk,
        });
        
        // 记录 chunk 的文件
        chunk.files.add(filename);
      }
    }
    
    callback();
  }
}

class Compiler {
  emitAssets(compilation: Compilation, callback: Callback): void {
    // 可以通过 AssetInfo 知道资源属于哪个 chunk
    for (const asset of compilation.getAssets()) {
      const chunk = asset.info.chunk;
      
      if (chunk) {
        console.log(`${asset.name} belongs to chunk ${chunk.name}`);
      }
    }
    
    // ... 继续输出
  }
}
```

## 钩子协作

### emit 钩子

```typescript
// Compiler 触发，Compilation 提供上下文
class Compiler {
  emitAssets(compilation: Compilation, callback: Callback): void {
    // Compilation 作为参数传递
    this.hooks.emit.callAsync(compilation, (err) => {
      // 插件可以在此修改 compilation.assets
    });
  }
}

// 插件使用示例
class ModifyAssetsPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tapAsync('ModifyAssetsPlugin', (compilation, callback) => {
      // 通过 compilation 访问和修改资源
      for (const [name, source] of Object.entries(compilation.assets)) {
        if (name.endsWith('.js')) {
          // 添加 banner
          const banner = '/* Built with Webpack */\n';
          compilation.updateAsset(
            name,
            new ConcatSource(banner, source)
          );
        }
      }
      callback();
    });
  }
}
```

### assetEmitted 钩子

```typescript
class Compiler {
  writeAsset(asset: Asset, outputPath: string, compilation: Compilation, callback: Callback): void {
    const targetPath = path.join(outputPath, asset.name);
    const content = asset.source.buffer();
    
    this.outputFileSystem.writeFile(targetPath, content, (err) => {
      if (err) return callback(err);
      
      // 触发 assetEmitted，同时传递 Compiler 和 Compilation 信息
      this.hooks.assetEmitted.callAsync(
        asset.name,
        {
          content,
          source: asset.source,
          outputPath,
          targetPath,
          compilation,  // 提供 Compilation 上下文
        },
        callback
      );
    });
  }
}
```

## 错误处理协作

### 错误传播

```typescript
class Compiler {
  emitAssets(compilation: Compilation, callback: Callback): void {
    const errors: Error[] = [];
    
    asyncLib.forEach(
      compilation.getAssets(),
      (asset, cb) => {
        this.writeAsset(asset, outputPath, compilation, (err) => {
          if (err) {
            // 收集错误
            errors.push(err);
            
            // 记录到 Compilation
            compilation.errors.push(new WebpackError(err.message));
          }
          cb();  // 继续处理其他资源
        });
      },
      () => {
        if (errors.length > 0) {
          callback(new Error(`Failed to emit ${errors.length} assets`));
        } else {
          callback();
        }
      }
    );
  }
}
```

### 警告处理

```typescript
class Compilation {
  emitAsset(filename: string, source: Source, info?: AssetInfo): void {
    if (this.assets[filename]) {
      // 资源已存在，添加警告
      this.warnings.push(
        new WebpackError(`Asset ${filename} already exists, will be replaced`)
      );
    }
    
    this.assets[filename] = source;
  }
}
```

## 缓存协作

### 持久化缓存

```typescript
class Compiler {
  cache: Cache;
  
  emitAssets(compilation: Compilation, callback: Callback): void {
    // 输出后更新缓存
    this.hooks.afterEmit.tapAsync(
      'Compiler',
      (compilation, callback) => {
        // 缓存输出信息
        this.cache.store(
          'outputAssets',
          null,
          Array.from(compilation.assets.keys()),
          callback
        );
      }
    );
  }
}

class Compilation {
  // 从缓存恢复时跳过重新生成
  restoreFromCache(cache: Cache, callback: Callback): void {
    cache.get('outputAssets', null, (err, assets) => {
      if (assets) {
        // 标记哪些资源可以复用
        this.cachedAssets = new Set(assets);
      }
      callback();
    });
  }
}
```

## 总结

Compiler 与 Compilation 输出协作的核心要点：

**职责分工**：
- Compiler：文件系统操作、输出流程协调
- Compilation：资源管理、路径解析

**信息流向**：
- Compilation 提供资源和配置
- Compiler 执行实际输出

**路径解析**：
- Compilation.getPath
- 模板变量替换

**钩子协作**：
- emit：输出前处理
- assetEmitted：单资源输出后
- afterEmit：全部输出后

**错误处理**：
- 错误收集和传播
- 记录到 Compilation

**下一章**：我们将学习文件系统抽象层。
