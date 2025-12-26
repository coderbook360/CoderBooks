---
sidebar_position: 123
title: "Asset 资源管理"
---

# Asset 资源管理

Asset 资源管理是 Webpack 处理所有输出文件的统一机制，包括 JavaScript、CSS、图片等各类资源。

## 资源类型

### 资源分类

```typescript
// 资源来源分类
type AssetSource =
  | 'javascript'      // JavaScript 代码
  | 'css'             // CSS 样式
  | 'asset'           // 静态资源（图片、字体等）
  | 'asset/resource'  // 独立文件资源
  | 'asset/inline'    // 内联资源（base64）
  | 'asset/source'    // 源文件内容
  | 'runtime'         // 运行时代码
  | 'html';           // HTML 文件
```

### Asset Modules

```javascript
module.exports = {
  module: {
    rules: [
      // asset/resource：输出为独立文件
      {
        test: /\.(png|jpg|gif)$/,
        type: 'asset/resource',
        generator: {
          filename: 'images/[name].[hash:8][ext]',
        },
      },
      
      // asset/inline：内联为 base64
      {
        test: /\.svg$/,
        type: 'asset/inline',
      },
      
      // asset/source：输出原始内容
      {
        test: /\.txt$/,
        type: 'asset/source',
      },
      
      // asset：自动选择
      {
        test: /\.(woff|woff2)$/,
        type: 'asset',
        parser: {
          dataUrlCondition: {
            maxSize: 8 * 1024,  // 8KB 以下内联
          },
        },
      },
    ],
  },
};
```

## 资源存储

### Compilation.assets

```typescript
class Compilation {
  // 资源存储
  assets: Record<string, Source> = {};
  
  // 资源元信息
  assetsInfo: Map<string, AssetInfo> = new Map();
  
  // 发射资源
  emitAsset(
    filename: string,
    source: Source,
    info?: AssetInfo
  ): void {
    if (this.assets[filename]) {
      // 资源已存在，检查是否允许覆盖
      const existingInfo = this.assetsInfo.get(filename);
      
      if (existingInfo?.immutable) {
        // 不可变资源，报错
        throw new Error(`Asset ${filename} is immutable`);
      }
    }
    
    this.assets[filename] = source;
    
    if (info) {
      this.assetsInfo.set(filename, {
        ...this.assetsInfo.get(filename),
        ...info,
      });
    }
  }
  
  // 更新资源
  updateAsset(
    filename: string,
    newSource: Source | ((source: Source) => Source),
    info?: AssetInfo | ((info: AssetInfo) => AssetInfo)
  ): void {
    const existingSource = this.assets[filename];
    
    if (!existingSource) {
      throw new Error(`Asset ${filename} does not exist`);
    }
    
    // 更新源
    if (typeof newSource === 'function') {
      this.assets[filename] = newSource(existingSource);
    } else {
      this.assets[filename] = newSource;
    }
    
    // 更新元信息
    if (info) {
      const existingInfo = this.assetsInfo.get(filename) || {};
      
      if (typeof info === 'function') {
        this.assetsInfo.set(filename, info(existingInfo));
      } else {
        this.assetsInfo.set(filename, { ...existingInfo, ...info });
      }
    }
  }
  
  // 删除资源
  deleteAsset(filename: string): void {
    delete this.assets[filename];
    this.assetsInfo.delete(filename);
  }
  
  // 重命名资源
  renameAsset(oldFilename: string, newFilename: string): void {
    const source = this.assets[oldFilename];
    const info = this.assetsInfo.get(oldFilename);
    
    if (!source) {
      throw new Error(`Asset ${oldFilename} does not exist`);
    }
    
    this.assets[newFilename] = source;
    if (info) {
      this.assetsInfo.set(newFilename, info);
    }
    
    delete this.assets[oldFilename];
    this.assetsInfo.delete(oldFilename);
  }
}
```

### AssetInfo 结构

```typescript
interface AssetInfo {
  // 来源 chunk
  chunk?: Chunk;
  
  // 内容哈希
  contentHash?: string;
  
  // 是否不可变（用于缓存）
  immutable?: boolean;
  
  // 是否为开发资源
  development?: boolean;
  
  // 是否需要热更新
  hotModuleReplacement?: boolean;
  
  // 相关资源（如 source map）
  related?: {
    sourceMap?: string;
  };
  
  // 自定义信息
  [key: string]: any;
}
```

## 资源处理钩子

### processAssets 阶段

```typescript
class Compilation {
  hooks: {
    processAssets: AsyncSeriesHook<[Record<string, Source>]>;
    afterProcessAssets: SyncHook<[Record<string, Source>]>;
  };
}

// 处理阶段常量
Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL = -2000;
Compilation.PROCESS_ASSETS_STAGE_PRE_PROCESS = -1000;
Compilation.PROCESS_ASSETS_STAGE_DERIVED = -200;
Compilation.PROCESS_ASSETS_STAGE_ADDITIONS = -100;
Compilation.PROCESS_ASSETS_STAGE_NONE = 0;
Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE = 100;
Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_COUNT = 200;
Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_COMPATIBILITY = 300;
Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE = 400;
Compilation.PROCESS_ASSETS_STAGE_DEV_TOOLING = 500;
Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_INLINE = 700;
Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE = 1000;
Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_HASH = 2500;
Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_TRANSFER = 3000;
Compilation.PROCESS_ASSETS_STAGE_ANALYSE = 4000;
Compilation.PROCESS_ASSETS_STAGE_REPORT = 5000;
```

### 使用示例

```typescript
class MyAssetPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('MyAssetPlugin', (compilation) => {
      // 添加资源
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'MyAssetPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONS,
        },
        (assets, callback) => {
          // 添加额外资源
          compilation.emitAsset(
            'manifest.json',
            new RawSource(JSON.stringify({ version: '1.0.0' }))
          );
          callback();
        }
      );
      
      // 优化资源
      compilation.hooks.processAssets.tapAsync(
        {
          name: 'MyAssetPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_OPTIMIZE_SIZE,
        },
        (assets, callback) => {
          // 压缩处理
          for (const [name, source] of Object.entries(assets)) {
            if (name.endsWith('.js')) {
              const minified = this.minify(source);
              compilation.updateAsset(name, minified);
            }
          }
          callback();
        }
      );
    });
  }
}
```

## 资源模块处理

### AssetModulesPlugin

```typescript
class AssetModulesPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap(
      'AssetModulesPlugin',
      (compilation, { normalModuleFactory }) => {
        // 注册 asset 生成器
        normalModuleFactory.hooks.createGenerator
          .for('asset')
          .tap('AssetModulesPlugin', () => {
            return new AssetGenerator();
          });
        
        normalModuleFactory.hooks.createGenerator
          .for('asset/resource')
          .tap('AssetModulesPlugin', () => {
            return new AssetResourceGenerator();
          });
        
        normalModuleFactory.hooks.createGenerator
          .for('asset/inline')
          .tap('AssetModulesPlugin', () => {
            return new AssetInlineGenerator();
          });
        
        normalModuleFactory.hooks.createGenerator
          .for('asset/source')
          .tap('AssetModulesPlugin', () => {
            return new AssetSourceGenerator();
          });
      }
    );
  }
}
```

### AssetGenerator

```typescript
class AssetGenerator extends Generator {
  generate(module: NormalModule, context: GenerateContext): Source {
    const { compilation, runtime } = context;
    const content = module.originalSource().buffer();
    
    // 判断是否内联
    if (this.shouldInline(content, module)) {
      return this.generateInline(content, module);
    }
    
    return this.generateResource(content, module, context);
  }
  
  shouldInline(content: Buffer, module: NormalModule): boolean {
    const maxSize = module.parser?.dataUrlCondition?.maxSize ?? 8 * 1024;
    return content.length < maxSize;
  }
  
  generateInline(content: Buffer, module: NormalModule): Source {
    const mimetype = this.getMimetype(module);
    const encoding = 'base64';
    const data = content.toString(encoding);
    
    const dataUrl = `data:${mimetype};${encoding},${data}`;
    
    return new RawSource(
      `module.exports = ${JSON.stringify(dataUrl)};`
    );
  }
  
  generateResource(
    content: Buffer,
    module: NormalModule,
    context: GenerateContext
  ): Source {
    const { compilation, runtime } = context;
    
    // 生成文件名
    const filename = this.getFilename(module, context);
    
    // 发射资源
    compilation.emitAsset(filename, new RawSource(content));
    
    // 返回引用代码
    return new RawSource(
      `module.exports = __webpack_require__.p + ${JSON.stringify(filename)};`
    );
  }
  
  getFilename(module: NormalModule, context: GenerateContext): string {
    const template = module.generator?.filename || '[hash][ext]';
    
    return template
      .replace('[name]', path.basename(module.resource, path.extname(module.resource)))
      .replace('[ext]', path.extname(module.resource))
      .replace('[hash]', this.getContentHash(module, context));
  }
}
```

## 资源输出

### 写入文件系统

```typescript
class Compiler {
  emitAssets(compilation: Compilation, callback: Callback): void {
    const outputPath = this.outputPath;
    const assets = compilation.assets;
    
    // 确保输出目录存在
    this.outputFileSystem.mkdirp(outputPath, (err) => {
      if (err) return callback(err);
      
      // 写入所有资源
      asyncLib.forEach(
        Object.entries(assets),
        ([filename, source], callback) => {
          this.emitAsset(outputPath, filename, source, callback);
        },
        callback
      );
    });
  }
  
  emitAsset(
    outputPath: string,
    filename: string,
    source: Source,
    callback: Callback
  ): void {
    const filePath = path.join(outputPath, filename);
    const directory = path.dirname(filePath);
    
    // 确保目录存在
    this.outputFileSystem.mkdirp(directory, (err) => {
      if (err) return callback(err);
      
      // 获取内容
      const content = source.buffer();
      
      // 写入文件
      this.outputFileSystem.writeFile(filePath, content, callback);
    });
  }
}
```

### 增量输出

```typescript
class Compiler {
  emitAssetsIncremental(
    compilation: Compilation,
    callback: Callback
  ): void {
    const assets = compilation.assets;
    const previousAssets = this.previousAssets || {};
    
    const toWrite: string[] = [];
    const toDelete: string[] = [];
    
    // 找出需要写入的资源
    for (const [filename, source] of Object.entries(assets)) {
      const previous = previousAssets[filename];
      
      if (!previous || !this.isEqual(source, previous)) {
        toWrite.push(filename);
      }
    }
    
    // 找出需要删除的资源
    for (const filename of Object.keys(previousAssets)) {
      if (!(filename in assets)) {
        toDelete.push(filename);
      }
    }
    
    // 执行操作
    asyncLib.parallel([
      (cb) => asyncLib.forEach(toWrite, (f, cb) => this.emitAsset(..., cb), cb),
      (cb) => asyncLib.forEach(toDelete, (f, cb) => this.deleteAsset(..., cb), cb),
    ], callback);
    
    // 记录当前资源
    this.previousAssets = assets;
  }
}
```

## 资源清理

### CleanPlugin

```typescript
class CleanPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.emit.tapAsync('CleanPlugin', (compilation, callback) => {
      const outputPath = compiler.outputPath;
      const assets = Object.keys(compilation.assets);
      
      // 读取输出目录
      compiler.outputFileSystem.readdir(outputPath, (err, files) => {
        if (err) return callback();  // 目录不存在，跳过
        
        // 找出需要删除的文件
        const toDelete = files.filter(file => !assets.includes(file));
        
        // 删除文件
        asyncLib.forEach(
          toDelete,
          (file, cb) => {
            const filePath = path.join(outputPath, file);
            compiler.outputFileSystem.unlink(filePath, cb);
          },
          callback
        );
      });
    });
  }
}
```

## 总结

Asset 资源管理的核心要点：

**资源类型**：
- JavaScript、CSS
- 图片、字体
- 静态文件

**Asset Modules**：
- asset/resource
- asset/inline
- asset/source
- asset（自动选择）

**资源存储**：
- Compilation.assets
- Compilation.assetsInfo

**处理钩子**：
- processAssets
- 多个处理阶段

**输出机制**：
- 文件系统写入
- 增量输出
- 清理旧文件

**下一章**：我们将学习 Manifest 生成。
