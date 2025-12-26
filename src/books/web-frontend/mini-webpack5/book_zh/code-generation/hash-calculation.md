---
sidebar_position: 120
title: "Hash 计算与内容寻址"
---

# Hash 计算与内容寻址

Hash 计算是 Webpack 实现持久化缓存和内容寻址的核心机制，通过内容摘要确保文件变更时生成新的文件名。

## Hash 类型

### 三种 Hash

```javascript
module.exports = {
  output: {
    // fullhash：整个构建的 hash
    filename: '[name].[fullhash].js',
    
    // chunkhash：每个 chunk 的 hash
    filename: '[name].[chunkhash].js',
    
    // contenthash：每个文件内容的 hash
    filename: '[name].[contenthash].js',
  },
};
```

### Hash 区别

```
fullhash（构建 Hash）
├── 任何文件变化都会变
└── 适用于：开发环境

chunkhash（Chunk Hash）
├── Chunk 内容变化时改变
├── 入口 chunk 变化不影响异步 chunk
└── 适用于：JavaScript 文件

contenthash（内容 Hash）
├── 文件内容变化时改变
├── 最细粒度的缓存控制
└── 适用于：CSS、资源文件
```

## Hash 计算实现

### 基础 Hash 工具

```typescript
const crypto = require('crypto');

class HashFactory {
  create(algorithm: string): Hash {
    return crypto.createHash(algorithm);
  }
}

class Compilation {
  createHash(): void {
    const { hashFunction, hashDigest, hashDigestLength } = this.outputOptions;
    
    // 创建 hash 对象
    this.fullHash = this.createContentHash(hashFunction);
    
    // 计算模块 hash
    this.createModuleHashes();
    
    // 计算 chunk hash
    this.createChunkHashes();
    
    // 最终化 fullhash
    this.finalizeFullHash();
  }
  
  createContentHash(algorithm: string): Hash {
    return crypto.createHash(algorithm);
  }
}
```

### 模块 Hash

```typescript
class Compilation {
  createModuleHashes(): void {
    for (const module of this.modules) {
      this.createModuleHash(module);
    }
  }
  
  createModuleHash(module: Module): void {
    const { hashFunction, hashDigestLength } = this.outputOptions;
    const hash = this.createContentHash(hashFunction);
    
    // 模块标识
    hash.update(module.identifier());
    
    // 模块构建元数据
    if (module.buildMeta) {
      hash.update(JSON.stringify(module.buildMeta));
    }
    
    // 模块依赖
    for (const dep of module.dependencies) {
      hash.update(dep.constructor.name);
      if (dep.getHashInfo) {
        hash.update(dep.getHashInfo());
      }
    }
    
    // 触发 hook 允许插件添加内容
    this.hooks.moduleHash.call(module, hash);
    
    // 计算最终 hash
    module.buildHash = hash.digest(this.outputOptions.hashDigest);
    module.buildHashShort = module.buildHash.slice(0, hashDigestLength);
  }
}
```

### Chunk Hash

```typescript
class Compilation {
  createChunkHashes(): void {
    for (const chunk of this.chunks) {
      this.createChunkHash(chunk);
    }
  }
  
  createChunkHash(chunk: Chunk): void {
    const { hashFunction, hashDigest, hashDigestLength } = this.outputOptions;
    const hash = this.createContentHash(hashFunction);
    
    // Chunk 名称
    if (chunk.name) {
      hash.update(chunk.name);
    }
    
    // Chunk ID
    const chunkId = this.chunkGraph.getChunkId(chunk);
    hash.update(String(chunkId));
    
    // 包含的模块
    const modules = this.chunkGraph.getOrderedChunkModulesIterable(chunk);
    for (const module of modules) {
      hash.update(module.buildHashShort);
    }
    
    // 运行时模块
    for (const runtimeModule of this.chunkGraph.getChunkRuntimeModulesIterable(chunk)) {
      hash.update(runtimeModule.getGeneratedCode());
    }
    
    // 触发 hook
    this.hooks.chunkHash.call(chunk, hash);
    
    // 计算最终 hash
    const digestBuffer = hash.digest();
    chunk.hash = digestBuffer.toString(hashDigest);
    chunk.renderedHash = chunk.hash.slice(0, hashDigestLength);
  }
}
```

## Content Hash

### 内容寻址

```typescript
class Compilation {
  createChunkAssets(): void {
    for (const chunk of this.chunks) {
      const manifest = this.getRenderManifest(chunk);
      
      for (const entry of manifest) {
        // 生成内容
        const source = entry.render();
        
        // 计算 contenthash
        const contentHash = this.getContentHash(source);
        
        // 替换文件名中的 contenthash
        const filename = entry.filenameTemplate.replace(
          /\[contenthash(?::(\d+))?\]/g,
          (match, length) => {
            const hash = contentHash;
            return length ? hash.slice(0, parseInt(length, 10)) : hash;
          }
        );
        
        // 发射资源
        this.emitAsset(filename, source);
      }
    }
  }
  
  getContentHash(source: Source): string {
    const { hashFunction, hashDigest, hashDigestLength } = this.outputOptions;
    const hash = this.createContentHash(hashFunction);
    
    source.updateHash(hash);
    
    return hash.digest(hashDigest).slice(0, hashDigestLength);
  }
}
```

### 分类型 Content Hash

```typescript
class Compilation {
  createContentHashes(): void {
    for (const chunk of this.chunks) {
      // JavaScript contenthash
      const jsHash = this.createChunkContentHash(chunk, 'javascript');
      this.chunkGraph.setContentHash(chunk, 'javascript', jsHash);
      
      // CSS contenthash
      const cssHash = this.createChunkContentHash(chunk, 'css');
      if (cssHash) {
        this.chunkGraph.setContentHash(chunk, 'css', cssHash);
      }
    }
  }
  
  createChunkContentHash(chunk: Chunk, type: string): string | null {
    const { hashFunction, hashDigest, hashDigestLength } = this.outputOptions;
    
    // 获取该类型的模块
    const modules = this.chunkGraph.getChunkModulesIterableBySourceType(chunk, type);
    
    if (!modules) return null;
    
    const hash = this.createContentHash(hashFunction);
    
    for (const module of modules) {
      const codeGenResult = this.codeGenerationResults.get(module);
      const source = codeGenResult?.sources.get(type);
      
      if (source) {
        source.updateHash(hash);
      }
    }
    
    return hash.digest(hashDigest).slice(0, hashDigestLength);
  }
}
```

## 文件名模板

### 模板替换

```typescript
class TemplatedPathPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('TemplatedPathPlugin', (compilation) => {
      compilation.hooks.assetPath.tap(
        'TemplatedPathPlugin',
        (path, data) => {
          return this.replacePath(path, data);
        }
      );
    });
  }
  
  replacePath(template: string, data: AssetPathData): string {
    return template
      // [name]
      .replace(/\[name\]/g, data.chunk?.name || '')
      
      // [id]
      .replace(/\[id\]/g, String(data.chunk?.id || ''))
      
      // [fullhash] / [hash]
      .replace(/\[(full)?hash(?::(\d+))?\]/g, (match, full, length) => {
        const hash = data.fullHash || '';
        return length ? hash.slice(0, parseInt(length, 10)) : hash;
      })
      
      // [chunkhash]
      .replace(/\[chunkhash(?::(\d+))?\]/g, (match, length) => {
        const hash = data.chunk?.renderedHash || '';
        return length ? hash.slice(0, parseInt(length, 10)) : hash;
      })
      
      // [contenthash]
      .replace(/\[contenthash(?::(\d+))?\]/g, (match, length) => {
        const hash = data.contentHash || '';
        return length ? hash.slice(0, parseInt(length, 10)) : hash;
      })
      
      // [ext]
      .replace(/\[ext\]/g, data.ext || '.js');
  }
}
```

## Hash 配置

### 自定义 Hash

```javascript
module.exports = {
  output: {
    // Hash 算法
    hashFunction: 'xxhash64',  // 默认 md4，可选 sha256、xxhash64
    
    // Hash 编码
    hashDigest: 'hex',  // 默认 hex，可选 base64
    
    // Hash 长度
    hashDigestLength: 8,  // 默认 20
    
    // Hash 盐值
    hashSalt: 'my-salt',
  },
};
```

### xxHash 性能优化

```typescript
// Webpack 5 支持 xxhash64，性能更好
class Compilation {
  createContentHash(algorithm: string): Hash {
    if (algorithm === 'xxhash64') {
      // 使用原生实现
      return require('xxhash-addon').XXHash64();
    }
    
    return crypto.createHash(algorithm);
  }
}
```

## 缓存失效策略

### 模块变更追踪

```typescript
class Compilation {
  detectChanges(previousCompilation: Compilation): ChangeSet {
    const changes: ChangeSet = {
      added: [],
      removed: [],
      modified: [],
    };
    
    const previousModules = new Map(
      [...previousCompilation.modules].map(m => [m.identifier(), m])
    );
    
    for (const module of this.modules) {
      const id = module.identifier();
      const previous = previousModules.get(id);
      
      if (!previous) {
        changes.added.push(module);
      } else if (module.buildHash !== previous.buildHash) {
        changes.modified.push(module);
      }
      
      previousModules.delete(id);
    }
    
    changes.removed = [...previousModules.values()];
    
    return changes;
  }
}
```

### 级联更新

```typescript
class Compilation {
  propagateChanges(changes: ChangeSet): AffectedChunks {
    const affected = new Set<Chunk>();
    
    for (const module of [...changes.added, ...changes.modified]) {
      // 找到包含该模块的 chunk
      for (const chunk of this.chunkGraph.getModuleChunksIterable(module)) {
        affected.add(chunk);
      }
    }
    
    // 传播到运行时 chunk
    for (const chunk of affected) {
      if (chunk.hasRuntime()) continue;
      
      for (const runtime of chunk.runtime) {
        const runtimeChunk = this.namedChunks.get(runtime);
        if (runtimeChunk) {
          affected.add(runtimeChunk);
        }
      }
    }
    
    return affected;
  }
}
```

## 最佳实践

### 长期缓存配置

```javascript
module.exports = {
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js',
  },
  optimization: {
    // 分离运行时
    runtimeChunk: 'single',
    
    // 稳定的模块 ID
    moduleIds: 'deterministic',
    
    // 稳定的 chunk ID
    chunkIds: 'deterministic',
  },
};
```

### 避免不必要的 Hash 变化

```javascript
// 问题：异步 chunk 的 ID 变化影响主 chunk
// 解决：使用 deterministic ID

module.exports = {
  optimization: {
    moduleIds: 'deterministic',
    chunkIds: 'deterministic',
  },
};
```

## 总结

Hash 计算与内容寻址的核心要点：

**Hash 类型**：
- fullhash：构建级别
- chunkhash：Chunk 级别
- contenthash：内容级别

**计算流程**：
1. 模块 Hash
2. Chunk Hash
3. Content Hash

**文件名模板**：
- [name]、[id]
- [fullhash]、[chunkhash]
- [contenthash]

**配置选项**：
- hashFunction
- hashDigest
- hashDigestLength

**最佳实践**：
- 使用 contenthash
- 分离运行时
- 使用 deterministic ID

**下一章**：我们将学习 Source Map 生成。
