---
sidebar_position: 115
title: "TerserPlugin 与代码压缩集成"
---

# TerserPlugin 与代码压缩集成

TerserPlugin 是 Webpack 5 默认的 JavaScript 压缩工具，负责在构建最后阶段对代码进行压缩和混淆。

## 基础配置

### 默认行为

```javascript
// production 模式默认启用
module.exports = {
  mode: 'production',
  optimization: {
    minimize: true,  // 默认 true
    // minimizer: [...] 默认使用 TerserPlugin
  },
};
```

### 自定义配置

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimize: true,
    minimizer: [
      new TerserPlugin({
        parallel: true,           // 并行压缩
        extractComments: false,   // 不提取注释
        terserOptions: {
          compress: {
            drop_console: true,   // 移除 console
            drop_debugger: true,  // 移除 debugger
            pure_funcs: ['console.log'],  // 移除指定函数
          },
          mangle: {
            safari10: true,       // Safari 10 兼容
          },
          format: {
            comments: false,      // 移除注释
          },
        },
      }),
    ],
  },
};
```

## 插件实现

### TerserPlugin 核心结构

```typescript
class TerserPlugin {
  private options: TerserPluginOptions;
  
  constructor(options: TerserPluginOptions = {}) {
    this.options = {
      parallel: true,
      extractComments: true,
      terserOptions: {},
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('TerserPlugin', (compilation) => {
      // 在 processAssets 阶段处理
      compilation.hooks.processAssets.tapPromise(
        {
          name: 'TerserPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        async (assets) => {
          await this.optimize(compilation, assets);
        }
      );
    });
  }
  
  async optimize(
    compilation: Compilation,
    assets: Record<string, Source>
  ): Promise<void> {
    // 过滤需要压缩的资源
    const assetsToMinify = this.getAssetsToMinify(assets);
    
    if (this.options.parallel) {
      await this.parallelMinify(assetsToMinify, compilation);
    } else {
      await this.sequentialMinify(assetsToMinify, compilation);
    }
  }
  
  getAssetsToMinify(assets: Record<string, Source>): AssetInfo[] {
    const result: AssetInfo[] = [];
    
    for (const [name, source] of Object.entries(assets)) {
      // 只处理 JavaScript 文件
      if (!name.endsWith('.js')) continue;
      
      // 检查是否已压缩
      if (name.endsWith('.min.js')) continue;
      
      result.push({
        name,
        source,
        content: source.source(),
        map: source.map?.(),
      });
    }
    
    return result;
  }
}
```

### 并行压缩

```typescript
class TerserPlugin {
  async parallelMinify(
    assets: AssetInfo[],
    compilation: Compilation
  ): Promise<void> {
    const workerPool = this.getWorkerPool();
    
    const tasks = assets.map((asset) => {
      return workerPool.run({
        code: asset.content,
        map: asset.map,
        options: this.options.terserOptions,
      });
    });
    
    const results = await Promise.all(tasks);
    
    for (let i = 0; i < assets.length; i++) {
      const asset = assets[i];
      const result = results[i];
      
      if (result.error) {
        compilation.errors.push(
          new Error(`Error minifying ${asset.name}: ${result.error}`)
        );
        continue;
      }
      
      // 更新资源
      compilation.updateAsset(
        asset.name,
        new SourceMapSource(
          result.code,
          asset.name,
          result.map
        )
      );
    }
    
    workerPool.end();
  }
  
  getWorkerPool(): WorkerPool {
    const numWorkers = Math.max(
      1,
      require('os').cpus().length - 1
    );
    
    return new WorkerPool({
      numWorkers,
      workerPath: require.resolve('./minify-worker'),
    });
  }
}

// minify-worker.js
const { minify } = require('terser');

module.exports = async function(data) {
  try {
    const result = await minify(data.code, {
      ...data.options,
      sourceMap: data.map ? {
        content: data.map,
      } : false,
    });
    
    return {
      code: result.code,
      map: result.map,
    };
  } catch (error) {
    return { error: error.message };
  }
};
```

## Terser 配置详解

### compress 选项

```javascript
{
  terserOptions: {
    compress: {
      // 删除无法到达的代码
      dead_code: true,
      
      // 删除未使用的变量和函数
      unused: true,
      
      // 条件表达式优化
      conditionals: true,
      
      // 计算常量表达式
      evaluate: true,
      
      // 布尔值优化
      booleans: true,
      
      // 循环优化
      loops: true,
      
      // 删除 console 调用
      drop_console: true,
      
      // 删除 debugger 语句
      drop_debugger: true,
      
      // 将多次出现的字面量提取为变量
      hoist_vars: true,
      
      // 内联简单函数
      inline: 2,
      
      // 删除无副作用的函数调用
      pure_funcs: ['console.log', 'console.info'],
      
      // 优化 switch 语句
      switches: true,
      
      // 优化模板字符串
      template_string: true,
    },
  },
}
```

### mangle 选项

```javascript
{
  terserOptions: {
    mangle: {
      // 启用变量名混淆
      toplevel: true,
      
      // 保留特定名称
      reserved: ['$', 'jQuery'],
      
      // 混淆属性名
      properties: {
        regex: /^_/,  // 只混淆以 _ 开头的属性
      },
      
      // Safari 10 兼容
      safari10: true,
    },
  },
}
```

### format 选项

```javascript
{
  terserOptions: {
    format: {
      // 移除注释
      comments: false,
      
      // 保留特定注释
      comments: /^!/,  // 保留 /*! 开头的注释
      
      // 美化输出（调试用）
      beautify: false,
      
      // ASCII 输出
      ascii_only: true,
      
      // 缩进
      indent_level: 0,
      
      // 分号
      semicolons: true,
    },
  },
}
```

## 与 Webpack 优化配合

### Tree Shaking 标记

```javascript
// Webpack 生成的标记
/* unused harmony export foo */
function foo() { }

/* harmony export */ function bar() { }

// Terser 识别这些标记
// 结合 compress.unused 移除未使用代码
```

### 处理 unused 标记

```typescript
class TerserPlugin {
  processWebpackComments(code: string): ProcessResult {
    // 识别 Webpack 的 unused harmony export 注释
    const unusedPattern = /\/\* unused harmony export (\w+) \*\//g;
    
    const unusedExports: string[] = [];
    let match;
    
    while ((match = unusedPattern.exec(code)) !== null) {
      unusedExports.push(match[1]);
    }
    
    return {
      code,
      unusedExports,
    };
  }
}
```

## 缓存优化

### 持久化缓存

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        // 启用文件缓存
        cache: true,
        cacheKeys: (defaultCacheKeys, file) => {
          return {
            ...defaultCacheKeys,
            terser: require('terser/package.json').version,
          };
        },
      }),
    ],
  },
  // Webpack 5 原生缓存
  cache: {
    type: 'filesystem',
  },
};
```

### 缓存实现

```typescript
class TerserPlugin {
  async getFromCache(
    asset: AssetInfo,
    compilation: Compilation
  ): Promise<CacheResult | null> {
    const cache = compilation.getCache('TerserPlugin');
    const cacheKey = this.getCacheKey(asset);
    
    const cached = await cache.getPromise(cacheKey, null);
    
    if (cached) {
      return {
        code: cached.code,
        map: cached.map,
      };
    }
    
    return null;
  }
  
  async saveToCache(
    asset: AssetInfo,
    result: MinifyResult,
    compilation: Compilation
  ): Promise<void> {
    const cache = compilation.getCache('TerserPlugin');
    const cacheKey = this.getCacheKey(asset);
    
    await cache.storePromise(cacheKey, null, {
      code: result.code,
      map: result.map,
    });
  }
  
  getCacheKey(asset: AssetInfo): string {
    const crypto = require('crypto');
    const hash = crypto.createHash('sha256');
    
    hash.update(asset.content);
    hash.update(JSON.stringify(this.options.terserOptions));
    
    return hash.digest('hex');
  }
}
```

## Source Map 处理

### 保留 Source Map

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  devtool: 'source-map',
  optimization: {
    minimizer: [
      new TerserPlugin({
        terserOptions: {
          sourceMap: true,
        },
      }),
    ],
  },
};
```

### Source Map 合并

```typescript
class TerserPlugin {
  async minifyWithSourceMap(
    asset: AssetInfo,
    compilation: Compilation
  ): Promise<MinifyResult> {
    const { code, map } = asset;
    
    const result = await minify(code, {
      ...this.options.terserOptions,
      sourceMap: map ? {
        content: map,
        url: 'inline',
      } : false,
    });
    
    if (result.map && map) {
      // 合并 source map
      const mergedMap = this.mergeSourceMaps(map, result.map);
      return { code: result.code, map: mergedMap };
    }
    
    return { code: result.code, map: result.map };
  }
  
  mergeSourceMaps(original: RawSourceMap, generated: RawSourceMap): RawSourceMap {
    const { SourceMapConsumer, SourceMapGenerator } = require('source-map');
    
    const originalConsumer = new SourceMapConsumer(original);
    const generatedConsumer = new SourceMapConsumer(generated);
    const generator = new SourceMapGenerator();
    
    generatedConsumer.eachMapping((mapping) => {
      const original = originalConsumer.originalPositionFor({
        line: mapping.originalLine,
        column: mapping.originalColumn,
      });
      
      if (original.source) {
        generator.addMapping({
          generated: {
            line: mapping.generatedLine,
            column: mapping.generatedColumn,
          },
          original: {
            line: original.line,
            column: original.column,
          },
          source: original.source,
          name: original.name,
        });
      }
    });
    
    return generator.toJSON();
  }
}
```

## 注释提取

### extractComments 配置

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        extractComments: {
          condition: /^\**!|@license|@preserve/i,
          filename: (fileData) => {
            return `${fileData.filename}.LICENSE.txt`;
          },
          banner: (licenseFile) => {
            return `License information: ${licenseFile}`;
          },
        },
      }),
    ],
  },
};
```

## 自定义压缩器

### 使用 esbuild

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.esbuildMinify,
        terserOptions: {
          // esbuild 选项
          target: 'es2015',
          legalComments: 'none',
        },
      }),
    ],
  },
};
```

### 使用 swc

```javascript
const TerserPlugin = require('terser-webpack-plugin');

module.exports = {
  optimization: {
    minimizer: [
      new TerserPlugin({
        minify: TerserPlugin.swcMinify,
        terserOptions: {
          // swc 选项
          compress: true,
          mangle: true,
        },
      }),
    ],
  },
};
```

## 总结

TerserPlugin 与代码压缩集成的核心要点：

**基础配置**：
- production 模式默认启用
- 并行压缩提升性能

**Terser 选项**：
- compress：代码优化
- mangle：变量混淆
- format：输出格式

**与 Webpack 配合**：
- 识别 unused harmony export
- 配合 Tree Shaking

**性能优化**：
- 并行处理
- 文件缓存
- Source Map 合并

**自定义压缩器**：
- esbuild（更快）
- swc（更快）

**Part 14 完成**：我们已经学习了优化阶段的所有内容，包括 Tree Shaking、Scope Hoisting 和代码压缩。

**下一章**：我们将进入 Part 15，学习代码生成阶段。
