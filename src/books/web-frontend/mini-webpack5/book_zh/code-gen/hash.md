# Hash 计算与内容哈希

Webpack 使用 Hash 为文件命名，实现缓存策略和内容指纹。

## Hash 类型

### fullhash (原 hash)

整个构建的 hash：

```javascript
output: {
  filename: '[name].[fullhash].js'
}

// 输出：main.abc123def.js
```

特点：
- 任何文件变化都会改变 hash
- 所有文件共享同一 hash
- 不适合长期缓存

### chunkhash

基于 Chunk 内容的 hash：

```javascript
output: {
  filename: '[name].[chunkhash].js'
}

// 输出：
// main.abc123.js
// vendor.def456.js
```

特点：
- 每个 Chunk 有独立 hash
- Chunk 内容变化才更新 hash
- 适合代码分割场景

### contenthash

基于文件内容的 hash：

```javascript
output: {
  filename: '[name].[contenthash].js'
}

// 输出：main.a1b2c3.js
```

特点：
- 最精确的 hash
- 只有文件内容变化才更新
- 最适合长期缓存

## Hash 计算实现

### Compilation Hash

```typescript
class Compilation {
  createHash() {
    const hash = crypto.createHash('md5')
    
    // 添加所有模块
    for (const module of this.modules) {
      module.updateHash(hash)
    }
    
    // 添加 Chunk
    for (const chunk of this.chunks) {
      chunk.updateHash(hash)
    }
    
    this.fullHash = hash.digest('hex').slice(0, 20)
  }
}
```

### Chunk Hash

```typescript
class Chunk {
  updateHash(hash) {
    hash.update(this.id)
    
    // 添加所有模块
    const modules = this.getModules()
    for (const module of modules) {
      module.updateHash(hash)
    }
    
    // 添加依赖 Chunk
    for (const chunk of this.getAllReferencedChunks()) {
      hash.update(chunk.id)
    }
  }
  
  getChunkHash() {
    const hash = crypto.createHash('md5')
    this.updateHash(hash)
    return hash.digest('hex').slice(0, 20)
  }
}
```

### Content Hash

```typescript
class Compilation {
  createAssets() {
    for (const chunk of this.chunks) {
      const manifest = this.getRenderManifest({ chunk })
      
      for (const entry of manifest) {
        const source = entry.source
        
        // 计算内容 hash
        const contentHash = this.getContentHash(source)
        
        // 替换文件名中的占位符
        const filename = entry.filename.replace('[contenthash]', contentHash)
        
        this.emitAsset(filename, source)
      }
    }
  }
  
  getContentHash(source) {
    const hash = crypto.createHash('md5')
    hash.update(source.source())
    return hash.digest('hex').slice(0, 20)
  }
}
```

## Module Hash

```typescript
class Module {
  updateHash(hash) {
    // 模块标识符
    hash.update(this.identifier())
    
    // 模块类型
    hash.update(this.type)
    
    // 模块源码
    if (this.originalSource) {
      hash.update(this.originalSource().source())
    }
    
    // 模块依赖
    for (const dependency of this.dependencies) {
      dependency.updateHash(hash)
    }
  }
}
```

## Hash 长度配置

```javascript
output: {
  filename: '[name].[contenthash:8].js',  // 8 位 hash
  chunkFilename: '[name].[chunkhash:16].js'  // 16 位 hash
}
```

## Hash 算法选择

```javascript
output: {
  hashFunction: 'md5',        // 默认
  hashDigest: 'hex',          // hex | base64
  hashDigestLength: 20        // hash 长度
}
```

支持的算法：
- `md4`（默认，最快）
- `md5`
- `sha256`
- `sha512`

## 实现自定义 Hash

```typescript
class CustomHashPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('CustomHashPlugin', compilation => {
      compilation.hooks.contentHash.tap('CustomHashPlugin', chunk => {
        const hash = crypto.createHash('sha256')
        
        // 自定义 hash 逻辑
        for (const module of chunk.modulesIterable) {
          hash.update(module.identifier())
        }
        
        chunk.contentHash.javascript = hash.digest('hex').slice(0, 16)
      })
    })
  }
}
```

## 模块 ID Hash

```javascript
optimization: {
  moduleIds: 'deterministic',  // 确定性 ID
  chunkIds: 'deterministic'
}
```

实现：

```typescript
class DeterministicModuleIdsPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('DeterministicModuleIdsPlugin', compilation => {
      compilation.hooks.moduleIds.tap('DeterministicModuleIdsPlugin', modules => {
        const usedIds = new Set()
        
        for (const module of modules) {
          if (module.id !== null) continue
          
          // 基于模块路径生成 ID
          const identifier = module.identifier()
          const hash = crypto.createHash('md4')
          hash.update(identifier)
          
          const hashId = hash.digest('hex').slice(0, 4)
          
          // 避免冲突
          let id = hashId
          let i = 0
          while (usedIds.has(id)) {
            id = hashId + i++
          }
          
          module.id = id
          usedIds.add(id)
        }
      })
    })
  }
}
```

## Hash 占位符

```javascript
output: {
  filename: '[name].[contenthash:8].js',
  chunkFilename: '[id].[chunkhash:8].js',
  assetModuleFilename: 'assets/[hash][ext]'
}
```

可用占位符：
- `[fullhash]`：构建 hash
- `[chunkhash]`：Chunk hash
- `[contenthash]`：内容 hash
- `[modulehash]`：模块 hash
- `[name]`：Chunk 名称
- `[id]`：Chunk ID
- `[query]`：查询字符串
- `[ext]`：文件扩展名

## 缓存优化

### 提取 Runtime

```javascript
optimization: {
  runtimeChunk: 'single'
}
```

避免 Runtime 变化导致所有文件 hash 改变。

### 模块 ID 稳定

```javascript
optimization: {
  moduleIds: 'deterministic'
}
```

确保模块 ID 稳定，避免不必要的 hash 变化。

## 实战示例

### 长期缓存配置

```javascript
module.exports = {
  output: {
    filename: '[name].[contenthash:8].js',
    chunkFilename: '[name].[contenthash:8].chunk.js'
  },
  optimization: {
    moduleIds: 'deterministic',
    runtimeChunk: 'single',
    splitChunks: {
      cacheGroups: {
        vendor: {
          test: /[\\/]node_modules[\\/]/,
          name: 'vendors',
          chunks: 'all'
        }
      }
    }
  }
}
```

输出：
```
main.a1b2c3d4.js
vendors.e5f6g7h8.js
runtime.i9j0k1l2.js
```

## 总结

- `fullhash` 基于整个构建
- `chunkhash` 基于 Chunk 内容
- `contenthash` 基于文件内容（最佳）
- 使用 MD4/MD5 算法计算 hash
- 支持自定义 hash 长度
- 配合代码分割实现长期缓存
- Runtime 分离避免 hash 污染
