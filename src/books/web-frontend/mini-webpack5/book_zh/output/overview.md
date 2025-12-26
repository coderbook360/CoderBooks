---
sidebar_position: 125
title: "资源输出概述"
---

# 资源输出概述

资源输出是 Webpack 构建流程的最后阶段，负责将生成的代码和资源写入文件系统。

## 输出流程

### 整体架构

```
Compilation.assets ──→ emit ──→ FileSystem ──→ 输出文件
       │                │            │             │
       ▼                ▼            ▼             ▼
    资源集合       输出前处理     写入文件      构建完成
```

### 生命周期

```typescript
class Compiler {
  run(callback: Callback<Stats>): void {
    // ... 构建过程
    
    this.hooks.shouldEmit.call(compilation);
    
    // 发射资源
    this.emitAssets(compilation, (err) => {
      if (err) return callback(err);
      
      // 发射记录
      this.emitRecords((err) => {
        if (err) return callback(err);
        
        // 完成
        this.hooks.done.callAsync(stats, callback);
      });
    });
  }
}
```

## 核心钩子

### 输出相关钩子

```typescript
class Compiler {
  hooks: {
    // 是否应该输出
    shouldEmit: SyncBailHook<[Compilation], boolean>;
    
    // 输出前
    emit: AsyncSeriesHook<[Compilation]>;
    
    // 资源输出后
    assetEmitted: AsyncSeriesHook<[string, EmitAssetInfo]>;
    
    // 输出完成后
    afterEmit: AsyncSeriesHook<[Compilation]>;
    
    // 需要额外输出
    needAdditionalPass: SyncBailHook<[], boolean>;
  };
}

interface EmitAssetInfo {
  content: Buffer;
  source: Source;
  compilation: Compilation;
  outputPath: string;
  targetPath: string;
}
```

### 使用示例

```typescript
class EmitHooksPlugin {
  apply(compiler: Compiler): void {
    // 控制是否输出
    compiler.hooks.shouldEmit.tap('EmitHooksPlugin', (compilation) => {
      if (compilation.errors.length > 0) {
        console.log('Has errors, skip emit');
        return false;
      }
      return true;
    });
    
    // 输出前处理
    compiler.hooks.emit.tapAsync('EmitHooksPlugin', (compilation, callback) => {
      console.log('About to emit assets:', Object.keys(compilation.assets));
      callback();
    });
    
    // 单个资源输出后
    compiler.hooks.assetEmitted.tapAsync(
      'EmitHooksPlugin',
      (filename, info, callback) => {
        console.log(`Emitted: ${filename} (${info.content.length} bytes)`);
        callback();
      }
    );
    
    // 全部输出后
    compiler.hooks.afterEmit.tapAsync('EmitHooksPlugin', (compilation, callback) => {
      console.log('All assets emitted');
      callback();
    });
  }
}
```

## 输出配置

### output 选项

```javascript
module.exports = {
  output: {
    // 输出目录（绝对路径）
    path: path.resolve(__dirname, 'dist'),
    
    // 入口文件名
    filename: '[name].[contenthash:8].js',
    
    // 非入口 chunk 文件名
    chunkFilename: '[name].[contenthash:8].chunk.js',
    
    // 资源文件名
    assetModuleFilename: 'assets/[name].[hash:8][ext]',
    
    // 公共路径
    publicPath: '/',
    
    // 清理输出目录
    clean: true,
    
    // 全局对象
    globalObject: 'self',
    
    // chunk 加载全局变量
    chunkLoadingGlobal: 'webpackChunk',
    
    // 库配置
    library: {
      name: 'MyLibrary',
      type: 'umd',
    },
  },
};
```

### 路径模板

```javascript
// 可用的模板变量
{
  filename: '[name].[contenthash:8].js',
  // [name]: chunk 名称
  // [id]: chunk ID
  // [contenthash]: 内容哈希
  // [chunkhash]: chunk 哈希
  // [fullhash]: 构建哈希
  // [ext]: 扩展名
  // [query]: 查询字符串
}
```

## 输出目标

### 多环境支持

```typescript
class Compiler {
  // 输出文件系统
  outputFileSystem: OutputFileSystem;
  
  // 输入文件系统
  inputFileSystem: InputFileSystem;
  
  // 中间文件系统
  intermediateFileSystem: IntermediateFileSystem;
}

// 浏览器环境
class MemoryOutputFileSystem implements OutputFileSystem {
  private files: Map<string, Buffer> = new Map();
  
  writeFile(path: string, content: Buffer, callback: Callback): void {
    this.files.set(path, content);
    callback();
  }
  
  mkdir(path: string, callback: Callback): void {
    callback();
  }
}

// Node.js 环境
class NodeOutputFileSystem implements OutputFileSystem {
  writeFile(path: string, content: Buffer, callback: Callback): void {
    fs.writeFile(path, content, callback);
  }
  
  mkdir(path: string, options: MkdirOptions, callback: Callback): void {
    fs.mkdir(path, options, callback);
  }
}
```

## 资源发射实现

### emitAssets 核心

```typescript
class Compiler {
  emitAssets(compilation: Compilation, callback: Callback): void {
    let outputPath: string;
    
    // 获取输出路径
    outputPath = compilation.getPath(this.outputPath, {});
    
    // 创建输出目录
    this.outputFileSystem.mkdirp(outputPath, (err) => {
      if (err) return callback(err);
      
      // 触发 emit 钩子
      this.hooks.emit.callAsync(compilation, (err) => {
        if (err) return callback(err);
        
        // 写入资源
        this.writeAssets(compilation, outputPath, (err) => {
          if (err) return callback(err);
          
          // 触发 afterEmit 钩子
          this.hooks.afterEmit.callAsync(compilation, callback);
        });
      });
    });
  }
  
  writeAssets(
    compilation: Compilation,
    outputPath: string,
    callback: Callback
  ): void {
    const assets = compilation.getAssets();
    
    asyncLib.forEachLimit(
      assets,
      15,  // 并发限制
      (asset, callback) => {
        this.writeAsset(asset, outputPath, compilation, callback);
      },
      callback
    );
  }
  
  writeAsset(
    asset: Asset,
    outputPath: string,
    compilation: Compilation,
    callback: Callback
  ): void {
    const { name, source, info } = asset;
    
    // 计算目标路径
    let targetPath = path.join(outputPath, name);
    
    // 获取内容
    const content = source.buffer();
    
    // 确保目录存在
    const dir = path.dirname(targetPath);
    
    this.outputFileSystem.mkdirp(dir, (err) => {
      if (err) return callback(err);
      
      // 写入文件
      this.outputFileSystem.writeFile(targetPath, content, (err) => {
        if (err) return callback(err);
        
        // 触发 assetEmitted 钩子
        this.hooks.assetEmitted.callAsync(
          name,
          {
            content,
            source,
            compilation,
            outputPath,
            targetPath,
          },
          callback
        );
      });
    });
  }
}
```

## 资源获取

### getAssets 方法

```typescript
class Compilation {
  getAssets(): Asset[] {
    const assets: Asset[] = [];
    
    for (const [name, source] of Object.entries(this.assets)) {
      assets.push({
        name,
        source,
        info: this.assetsInfo.get(name) || {},
      });
    }
    
    return assets;
  }
  
  getAsset(name: string): Asset | undefined {
    const source = this.assets[name];
    if (!source) return undefined;
    
    return {
      name,
      source,
      info: this.assetsInfo.get(name) || {},
    };
  }
}

interface Asset {
  name: string;
  source: Source;
  info: AssetInfo;
}
```

## 输出优化

### 增量输出

```typescript
class IncrementalEmitPlugin {
  private emittedAssets: Map<string, string> = new Map();
  
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tapAsync(
      'IncrementalEmitPlugin',
      (compilation, callback) => {
        const toEmit: Asset[] = [];
        
        for (const asset of compilation.getAssets()) {
          const contentHash = this.getContentHash(asset.source);
          const previousHash = this.emittedAssets.get(asset.name);
          
          if (contentHash !== previousHash) {
            toEmit.push(asset);
            this.emittedAssets.set(asset.name, contentHash);
          }
        }
        
        console.log(`Incremental emit: ${toEmit.length} of ${compilation.getAssets().length}`);
        callback();
      }
    );
  }
  
  getContentHash(source: Source): string {
    const hash = crypto.createHash('md5');
    source.updateHash(hash);
    return hash.digest('hex');
  }
}
```

### 并行写入

```typescript
class Compiler {
  writeAssets(
    compilation: Compilation,
    outputPath: string,
    callback: Callback
  ): void {
    const assets = compilation.getAssets();
    
    // 使用并发限制
    const concurrency = this.options.parallelism || 100;
    
    asyncLib.forEachLimit(
      assets,
      concurrency,
      (asset, cb) => this.writeAsset(asset, outputPath, compilation, cb),
      callback
    );
  }
}
```

## 总结

资源输出概述的核心要点：

**输出流程**：
1. shouldEmit 检查
2. emit 钩子
3. 写入文件系统
4. afterEmit 钩子

**核心配置**：
- path：输出目录
- filename：文件名模板
- publicPath：公共路径
- clean：清理旧文件

**文件系统**：
- OutputFileSystem
- 支持多环境
- 内存/磁盘文件系统

**优化策略**：
- 增量输出
- 并行写入
- 内容哈希检查

**下一章**：我们将学习 Compiler 与 Compilation 输出协作。
