---
sidebar_position: 67
title: "Loader 缓存策略"
---

# Loader 缓存策略

缓存是提升构建性能的关键。本章探讨 Loader 的各种缓存策略。

## Webpack 内置缓存

### 文件系统缓存

```typescript
// webpack.config.js
module.exports = {
  cache: {
    type: 'filesystem',
    cacheDirectory: path.resolve(__dirname, '.cache'),
    buildDependencies: {
      config: [__filename],
    },
  },
};
```

Webpack 5 的文件系统缓存会缓存 Loader 的输出：

```
.cache/
├── pack-0.pack      # 打包的缓存数据
├── pack-0.idx       # 索引文件
└── ...
```

### 缓存工作原理

```typescript
export class ModuleCachePlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('ModuleCachePlugin', (compilation) => {
      compilation.hooks.buildModule.tap('ModuleCachePlugin', (module) => {
        // 计算缓存键
        const cacheKey = this.getCacheKey(module);
        
        // 查找缓存
        const cached = this.cache.get(cacheKey);
        if (cached && this.isValid(cached, module)) {
          // 使用缓存结果
          module.buildInfo = cached.buildInfo;
          module.buildMeta = cached.buildMeta;
          return;
        }
        
        // 无缓存，需要重新构建
      });
      
      compilation.hooks.succeedModule.tap('ModuleCachePlugin', (module) => {
        // 构建成功后存入缓存
        const cacheKey = this.getCacheKey(module);
        this.cache.set(cacheKey, {
          buildInfo: module.buildInfo,
          buildMeta: module.buildMeta,
          hash: module.hash,
        });
      });
    });
  }
  
  getCacheKey(module: NormalModule): string {
    return [
      module.identifier(),
      module.resourceResolveData?.hash,
      // Loader 相关
      JSON.stringify(module.loaders),
    ].join('|');
  }
}
```

## Loader 级缓存

### cacheable 方法

```typescript
module.exports = function(source) {
  // 默认启用缓存
  this.cacheable(true);
  
  // 如果依赖外部状态，禁用缓存
  if (usesExternalState()) {
    this.cacheable(false);
  }
  
  return transform(source);
};
```

### cache-loader（已废弃）

在 Webpack 4 中常用，Webpack 5 建议使用内置缓存：

```typescript
// cache-loader 核心逻辑
export function pitch(remainingRequest, precedingRequest, data) {
  const callback = this.async();
  const cacheKey = getCacheKey(this);
  
  // 检查缓存
  readCache(cacheKey, (err, cached) => {
    if (err || !cached) {
      // 无缓存，继续执行
      data.cacheKey = cacheKey;
      return callback();
    }
    
    // 验证依赖
    if (isValid(cached.dependencies)) {
      // 返回缓存结果，跳过后续 Loader
      cached.dependencies.forEach(dep => {
        this.addDependency(dep);
      });
      return callback(null, cached.result, cached.sourceMap);
    }
    
    // 缓存失效
    data.cacheKey = cacheKey;
    callback();
  });
}

export default function(source, sourceMap) {
  const callback = this.async();
  const cacheKey = this.data.cacheKey;
  
  // 存入缓存
  writeCache(cacheKey, {
    result: source,
    sourceMap,
    dependencies: this.getDependencies(),
  }, (err) => {
    callback(err, source, sourceMap);
  });
}
```

## 自定义缓存实现

### 内存缓存

```typescript
const cache = new Map();

module.exports = function(source) {
  // 生成缓存键
  const cacheKey = getCacheKey(this.resourcePath, source, this.getOptions());
  
  // 检查缓存
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }
  
  // 执行转换
  const result = expensiveTransform(source);
  
  // 存入缓存
  cache.set(cacheKey, result);
  
  return result;
};

function getCacheKey(path, content, options) {
  const hash = crypto
    .createHash('md5')
    .update(path)
    .update(content)
    .update(JSON.stringify(options))
    .digest('hex');
  return hash;
}
```

### 文件系统缓存

```typescript
const fs = require('fs');
const path = require('path');
const os = require('os');

const cacheDir = path.join(os.tmpdir(), 'my-loader-cache');

module.exports = async function(source) {
  const callback = this.async();
  
  // 生成缓存键
  const cacheKey = getCacheKey(source, this.getOptions());
  const cachePath = path.join(cacheDir, cacheKey);
  
  try {
    // 检查缓存
    const stats = await fs.promises.stat(cachePath);
    const sourceStats = await fs.promises.stat(this.resourcePath);
    
    // 验证缓存是否过期
    if (stats.mtime > sourceStats.mtime) {
      const cached = await fs.promises.readFile(cachePath, 'utf-8');
      return callback(null, cached);
    }
  } catch {
    // 缓存不存在
  }
  
  // 执行转换
  const result = await transform(source);
  
  // 写入缓存
  await fs.promises.mkdir(cacheDir, { recursive: true });
  await fs.promises.writeFile(cachePath, result);
  
  callback(null, result);
};
```

### LRU 缓存

```typescript
import LRU from 'lru-cache';

const cache = new LRU({
  max: 500,           // 最多 500 个条目
  maxAge: 1000 * 60 * 60,  // 1 小时过期
  length: (value, key) => value.length,  // 按内容大小计算
});

module.exports = function(source) {
  const cacheKey = getCacheKey(this.resourcePath, source);
  
  const cached = cache.get(cacheKey);
  if (cached) {
    return cached;
  }
  
  const result = transform(source);
  cache.set(cacheKey, result);
  
  return result;
};
```

## babel-loader 缓存

### 配置方式

```typescript
module.exports = {
  module: {
    rules: [
      {
        test: /\.js$/,
        use: {
          loader: 'babel-loader',
          options: {
            cacheDirectory: true,  // 启用缓存
            cacheCompression: false,  // 不压缩缓存
            cacheIdentifier: 'v1',  // 缓存标识符
          },
        },
      },
    ],
  },
};
```

### 实现原理

```typescript
import { getCacheKey, getCachePath, readCache, writeCache } from './cache-utils';

export default async function babelLoader(source, inputSourceMap) {
  const callback = this.async();
  const options = this.getOptions();
  
  if (!options.cacheDirectory) {
    // 不使用缓存
    return transformAndReturn(source, inputSourceMap, options, callback);
  }
  
  // 生成缓存键
  const cacheKey = getCacheKey({
    source,
    options,
    babelVersion: require('@babel/core/package.json').version,
    loaderVersion: require('../package.json').version,
    identifier: options.cacheIdentifier,
  });
  
  const cachePath = getCachePath(options.cacheDirectory, cacheKey);
  
  // 尝试读取缓存
  try {
    const cached = await readCache(cachePath, options.cacheCompression);
    if (cached) {
      return callback(null, cached.code, cached.map);
    }
  } catch {
    // 缓存读取失败
  }
  
  // 执行转换
  const result = await babel.transformAsync(source, {
    ...options,
    filename: this.resourcePath,
  });
  
  // 写入缓存
  try {
    await writeCache(cachePath, {
      code: result.code,
      map: result.map,
    }, options.cacheCompression);
  } catch {
    // 缓存写入失败，忽略
  }
  
  callback(null, result.code, result.map);
}
```

## 缓存失效策略

### 基于内容哈希

```typescript
function getCacheKey(source, options) {
  return crypto
    .createHash('sha256')
    .update(source)
    .update(JSON.stringify(options))
    .update(getLoaderVersion())
    .digest('hex');
}
```

### 基于依赖追踪

```typescript
module.exports = function(source) {
  const callback = this.async();
  const cacheKey = getCacheKey(source);
  
  const cached = cache.get(cacheKey);
  if (cached) {
    // 验证依赖是否变化
    const depsValid = await validateDependencies(cached.dependencies);
    if (depsValid) {
      // 恢复依赖
      cached.dependencies.forEach(dep => this.addDependency(dep));
      return callback(null, cached.result);
    }
  }
  
  // 重新处理
  const result = process(source);
  
  // 收集依赖
  const dependencies = this.getDependencies();
  
  // 缓存结果和依赖
  cache.set(cacheKey, {
    result,
    dependencies,
    timestamps: await getTimestamps(dependencies),
  });
  
  callback(null, result);
};

async function validateDependencies(deps) {
  for (const dep of deps) {
    const stats = await fs.promises.stat(dep.path);
    if (stats.mtimeMs !== dep.mtime) {
      return false;
    }
  }
  return true;
}
```

### 版本化缓存

```typescript
const CACHE_VERSION = 2;  // 缓存版本，更新时递增

function getCacheKey(source, options) {
  return crypto
    .createHash('md5')
    .update(String(CACHE_VERSION))
    .update(source)
    .update(JSON.stringify(options))
    .digest('hex');
}
```

## 性能对比

```
无缓存：
- 首次构建：10s
- 重复构建：10s

内存缓存：
- 首次构建：10s
- 重复构建：2s（同进程）

文件系统缓存：
- 首次构建：10s
- 重复构建：3s（跨进程）
```

## 最佳实践

### 选择合适的缓存策略

```typescript
// 开发环境：内存缓存（快）
if (process.env.NODE_ENV === 'development') {
  cacheOptions = { type: 'memory' };
}

// 生产环境：文件缓存（持久）
if (process.env.NODE_ENV === 'production') {
  cacheOptions = { type: 'filesystem' };
}
```

### 缓存键包含所有影响因素

```typescript
function getCacheKey(context) {
  return crypto.createHash('sha256')
    .update(context.source)
    .update(JSON.stringify(context.options))
    .update(context.loaderVersion)
    .update(context.nodeVersion)
    .update(context.env)
    .digest('hex');
}
```

### 处理缓存失败

```typescript
async function withCache(key, compute) {
  try {
    const cached = await readCache(key);
    if (cached) return cached;
  } catch (err) {
    console.warn('Cache read failed:', err.message);
  }
  
  const result = await compute();
  
  try {
    await writeCache(key, result);
  } catch (err) {
    console.warn('Cache write failed:', err.message);
  }
  
  return result;
}
```

## 总结

Loader 缓存的核心策略：

**Webpack 内置缓存**：
- 文件系统缓存最有效
- 自动处理失效
- 推荐使用

**Loader 级缓存**：
- cacheable() 控制是否可缓存
- babel-loader 的 cacheDirectory

**自定义缓存**：
- 内存缓存适合开发
- 文件缓存适合 CI
- 缓存键需包含所有影响因素

**下一章**：我们将探讨 Loader 与 Rule 配置。
