---
sidebar_position: 124
title: "Manifest 生成"
---

# Manifest 生成

Manifest 是 Webpack 生成的资源清单文件，记录了模块与输出文件之间的映射关系，对于实现长期缓存和动态加载至关重要。

## Manifest 概念

### 什么是 Manifest

```javascript
// Manifest 包含：
// 1. 模块 ID 到文件名的映射
// 2. Chunk ID 到文件名的映射
// 3. 入口点信息
// 4. 资源依赖关系

// 示例 manifest.json
{
  "main.js": "main.a1b2c3d4.js",
  "vendor.js": "vendor.e5f6g7h8.js",
  "styles.css": "styles.i9j0k1l2.css",
  "entrypoints": {
    "main": {
      "assets": ["vendor.e5f6g7h8.js", "main.a1b2c3d4.js"]
    }
  }
}
```

### Manifest 用途

```typescript
// 1. 服务端渲染：知道应该引入哪些文件
// 2. 长期缓存：内容变化时更新文件名
// 3. 动态加载：运行时查找 chunk 文件
// 4. 预加载：确定需要预加载的资源
```

## 内置运行时 Manifest

### Webpack 内部 Manifest

```typescript
class Compilation {
  // Webpack 内部维护的 manifest
  chunkGraph: ChunkGraph;
  
  getManifest(): InternalManifest {
    const manifest: InternalManifest = {
      chunks: {},
      modules: {},
      entrypoints: {},
    };
    
    // 收集 chunk 信息
    for (const chunk of this.chunks) {
      const id = this.chunkGraph.getChunkId(chunk);
      
      manifest.chunks[id] = {
        files: [...chunk.files],
        modules: [],
      };
      
      // 收集 chunk 中的模块
      for (const module of this.chunkGraph.getChunkModulesIterable(chunk)) {
        const moduleId = this.chunkGraph.getModuleId(module);
        manifest.chunks[id].modules.push(moduleId);
      }
    }
    
    // 收集入口点
    for (const [name, entrypoint] of this.entrypoints) {
      manifest.entrypoints[name] = {
        chunks: entrypoint.chunks.map(c => this.chunkGraph.getChunkId(c)),
        assets: this.getEntrypointAssets(entrypoint),
      };
    }
    
    return manifest;
  }
  
  getEntrypointAssets(entrypoint: Entrypoint): string[] {
    const assets: string[] = [];
    
    for (const chunk of entrypoint.chunks) {
      for (const file of chunk.files) {
        assets.push(file);
      }
    }
    
    return assets;
  }
}
```

## WebpackManifestPlugin

### 插件实现

```typescript
class WebpackManifestPlugin {
  private options: ManifestOptions;
  
  constructor(options: ManifestOptions = {}) {
    this.options = {
      filename: 'manifest.json',
      publicPath: '',
      basePath: '',
      filter: null,
      map: null,
      sort: null,
      generate: null,
      serialize: JSON.stringify,
      ...options,
    };
  }
  
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('WebpackManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'WebpackManifestPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets) => {
          this.generateManifest(compilation, assets);
        }
      );
    });
  }
  
  generateManifest(
    compilation: Compilation,
    assets: Record<string, Source>
  ): void {
    const { publicPath } = this.options;
    const manifest: Record<string, string> = {};
    
    // 遍历所有资源
    for (const [filename, source] of Object.entries(assets)) {
      // 过滤
      if (this.options.filter && !this.options.filter(filename)) {
        continue;
      }
      
      // 获取原始名称
      const originalName = this.getOriginalName(filename, compilation);
      
      // 添加到 manifest
      const outputPath = (publicPath || '') + filename;
      manifest[originalName] = outputPath;
    }
    
    // 排序
    if (this.options.sort) {
      const sorted = Object.entries(manifest).sort(this.options.sort);
      manifest = Object.fromEntries(sorted);
    }
    
    // 序列化
    const content = this.options.serialize(manifest, {
      space: 2,
    });
    
    // 发射资源
    compilation.emitAsset(
      this.options.filename,
      new RawSource(content)
    );
  }
  
  getOriginalName(filename: string, compilation: Compilation): string {
    // 从 chunk 信息中恢复原始名称
    for (const chunk of compilation.chunks) {
      if (chunk.files.has(filename)) {
        return chunk.name || filename;
      }
    }
    
    // 移除 hash
    return filename.replace(/\.[a-f0-9]{8,}\./, '.');
  }
}
```

## 自定义 Manifest 格式

### 扩展 Manifest 内容

```typescript
class CustomManifestPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.compilation.tap('CustomManifestPlugin', (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: 'CustomManifestPlugin',
          stage: Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE,
        },
        (assets) => {
          const manifest = this.buildManifest(compilation);
          
          compilation.emitAsset(
            'asset-manifest.json',
            new RawSource(JSON.stringify(manifest, null, 2))
          );
        }
      );
    });
  }
  
  buildManifest(compilation: Compilation): CustomManifest {
    return {
      // 基本信息
      version: '1.0.0',
      buildTime: new Date().toISOString(),
      
      // 文件映射
      files: this.buildFilesManifest(compilation),
      
      // 入口点
      entrypoints: this.buildEntrypointsManifest(compilation),
      
      // Chunk 依赖
      chunkDependencies: this.buildChunkDependencies(compilation),
      
      // 模块信息
      modules: this.buildModulesManifest(compilation),
    };
  }
  
  buildFilesManifest(compilation: Compilation): Record<string, FileInfo> {
    const files: Record<string, FileInfo> = {};
    
    for (const [filename, source] of Object.entries(compilation.assets)) {
      const info = compilation.assetsInfo.get(filename);
      
      files[filename] = {
        size: source.size(),
        contentHash: info?.contentHash,
        type: this.getFileType(filename),
      };
    }
    
    return files;
  }
  
  buildEntrypointsManifest(compilation: Compilation): Record<string, EntrypointInfo> {
    const entrypoints: Record<string, EntrypointInfo> = {};
    
    for (const [name, entrypoint] of compilation.entrypoints) {
      const assets = {
        js: [] as string[],
        css: [] as string[],
      };
      
      for (const chunk of entrypoint.chunks) {
        for (const file of chunk.files) {
          if (file.endsWith('.js')) {
            assets.js.push(file);
          } else if (file.endsWith('.css')) {
            assets.css.push(file);
          }
        }
      }
      
      entrypoints[name] = {
        assets,
        chunks: entrypoint.chunks.map(c => compilation.chunkGraph.getChunkId(c)),
      };
    }
    
    return entrypoints;
  }
  
  buildChunkDependencies(compilation: Compilation): Record<string, string[]> {
    const dependencies: Record<string, string[]> = {};
    
    for (const chunk of compilation.chunks) {
      const id = String(compilation.chunkGraph.getChunkId(chunk));
      const deps: string[] = [];
      
      // 收集依赖的 chunk
      for (const group of chunk.groupsIterable) {
        for (const parentGroup of group.parentsIterable) {
          for (const parentChunk of parentGroup.chunks) {
            const parentId = String(compilation.chunkGraph.getChunkId(parentChunk));
            if (!deps.includes(parentId)) {
              deps.push(parentId);
            }
          }
        }
      }
      
      dependencies[id] = deps;
    }
    
    return dependencies;
  }
}
```

## Stats 与 Manifest

### 从 Stats 生成 Manifest

```typescript
class StatsManifestPlugin {
  apply(compiler: Compiler): void {
    compiler.hooks.done.tap('StatsManifestPlugin', (stats) => {
      const manifest = this.buildFromStats(stats);
      
      const outputPath = compiler.outputPath;
      const filename = path.join(outputPath, 'stats-manifest.json');
      
      fs.writeFileSync(filename, JSON.stringify(manifest, null, 2));
    });
  }
  
  buildFromStats(stats: Stats): StatsManifest {
    const json = stats.toJson({
      assets: true,
      chunks: true,
      entrypoints: true,
      modules: false,  // 减少体积
    });
    
    return {
      hash: json.hash,
      publicPath: json.publicPath,
      
      assets: json.assets.reduce((acc, asset) => {
        acc[asset.name] = {
          size: asset.size,
          chunks: asset.chunks,
        };
        return acc;
      }, {}),
      
      entrypoints: Object.entries(json.entrypoints).reduce((acc, [name, entry]) => {
        acc[name] = {
          assets: entry.assets.map(a => a.name),
        };
        return acc;
      }, {}),
      
      chunks: json.chunks.reduce((acc, chunk) => {
        acc[chunk.id] = {
          files: chunk.files,
          siblings: chunk.siblings,
          parents: chunk.parents,
        };
        return acc;
      }, {}),
    };
  }
}
```

## 运行时 Manifest

### Chunk 加载映射

```typescript
class GetChunkFilenameRuntimeModule extends RuntimeModule {
  constructor() {
    super('get chunk filename');
  }
  
  generate(): string {
    const { compilation, chunk } = this;
    const { chunkGraph } = compilation;
    
    // 收集所有异步 chunk 的映射
    const chunkMap: Record<string, string> = {};
    
    for (const c of chunk.getAllAsyncChunks()) {
      const id = chunkGraph.getChunkId(c);
      const files = [...c.files].filter(f => f.endsWith('.js'));
      
      if (files.length > 0) {
        chunkMap[id] = files[0];
      }
    }
    
    // 生成运行时代码
    return `
// chunk 文件名映射
__webpack_require__.u = function(chunkId) {
  var map = ${JSON.stringify(chunkMap)};
  return map[chunkId] || (chunkId + ".js");
};
`;
  }
}
```

### 动态 publicPath

```typescript
class AutoPublicPathRuntimeModule extends RuntimeModule {
  constructor() {
    super('auto public path');
  }
  
  generate(): string {
    return `
// 自动检测 publicPath
var scriptUrl;
if (__webpack_require__.g.importScripts) {
  scriptUrl = __webpack_require__.g.location + "";
}
var document = __webpack_require__.g.document;
if (!scriptUrl && document) {
  if (document.currentScript) {
    scriptUrl = document.currentScript.src;
  }
  if (!scriptUrl) {
    var scripts = document.getElementsByTagName("script");
    if (scripts.length) {
      scriptUrl = scripts[scripts.length - 1].src;
    }
  }
}
if (scriptUrl) {
  scriptUrl = scriptUrl.replace(/#.*$/, "").replace(/\\?.*$/, "").replace(/\\/[^\\/]+$/, "/");
}
__webpack_require__.p = scriptUrl;
`;
  }
}
```

## Manifest 使用场景

### 服务端渲染

```javascript
// 服务端代码
const manifest = require('./dist/manifest.json');

function renderHTML(entrypoint) {
  const assets = manifest.entrypoints[entrypoint].assets;
  
  const scripts = assets.js
    .map(file => `<script src="${file}"></script>`)
    .join('\n');
  
  const styles = assets.css
    .map(file => `<link rel="stylesheet" href="${file}">`)
    .join('\n');
  
  return `
<!DOCTYPE html>
<html>
<head>
  ${styles}
</head>
<body>
  <div id="app"></div>
  ${scripts}
</body>
</html>
  `;
}
```

### 预加载

```javascript
// 根据 manifest 生成预加载链接
function generatePreloadLinks(manifest, chunkId) {
  const chunk = manifest.chunks[chunkId];
  const dependencies = manifest.chunkDependencies[chunkId] || [];
  
  const links = [];
  
  // 预加载当前 chunk
  for (const file of chunk.files) {
    links.push(`<link rel="preload" href="${file}" as="script">`);
  }
  
  // 预加载依赖
  for (const depId of dependencies) {
    const depChunk = manifest.chunks[depId];
    for (const file of depChunk.files) {
      links.push(`<link rel="prefetch" href="${file}" as="script">`);
    }
  }
  
  return links.join('\n');
}
```

## 总结

Manifest 生成的核心要点：

**Manifest 内容**：
- 文件名映射
- 入口点信息
- Chunk 依赖关系

**生成方式**：
- WebpackManifestPlugin
- 自定义插件
- Stats 导出

**运行时 Manifest**：
- Chunk 文件名映射
- 动态 publicPath

**使用场景**：
- 服务端渲染
- 长期缓存
- 预加载优化
- 动态导入

**Part 15 完成**：我们已经学习了代码生成的所有内容。

**下一章**：我们将进入 Part 16，学习资源输出阶段。
