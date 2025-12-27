# createAssets 资源创建

createAssets 方法为每个 Chunk 生成对应的资源文件。

## 核心实现

```typescript
class Compilation {
  createChunkAssets(callback) {
    const outputOptions = this.outputOptions
    const { hashFunction, hashDigest, hashDigestLength } = outputOptions
    
    try {
      for (const chunk of this.chunks) {
        const manifest = this.getRenderManifest({
          chunk,
          hash: this.fullHash,
          fullHash: this.fullHash,
          outputOptions,
          codeGenerationResults: this.codeGenerationResults,
          moduleTemplates: this.moduleTemplates,
          dependencyTemplates: this.dependencyTemplates,
          chunkGraph: this.chunkGraph,
          moduleGraph: this.moduleGraph,
          runtimeTemplate: this.runtimeTemplate
        })
        
        for (const entry of manifest) {
          let filename = entry.filename
          let assetInfo = entry.info || {}
          
          // 替换文件名中的 hash
          if (entry.hash) {
            filename = filename.replace('[contenthash]', entry.hash)
          }
          
          this.emitAsset(filename, entry.source, assetInfo)
          
          chunk.files.add(filename)
        }
      }
      
      callback()
    } catch (err) {
      callback(err)
    }
  }
}
```

## getRenderManifest

获取渲染清单：

```typescript
getRenderManifest(options) {
  const manifest = []
  
  // 触发 renderManifest 钩子
  this.hooks.renderManifest.call(manifest, options)
  
  return manifest
}
```

## JavascriptModulesPlugin

JavaScript 模块插件提供渲染逻辑：

```typescript
class JavascriptModulesPlugin {
  apply(compiler) {
    compiler.hooks.compilation.tap('JavascriptModulesPlugin', (compilation, { normalModuleFactory }) => {
      compilation.hooks.renderManifest.tap('JavascriptModulesPlugin', (result, options) => {
        const { chunk, codeGenerationResults } = options
        
        if (chunk.hasRuntime()) {
          // 入口 Chunk
          result.push({
            render: () => this.renderMain(options),
            filename: this.getFilename(chunk, outputOptions),
            info: {
              javascriptModule: true
            },
            hash: chunk.contentHash.javascript
          })
        } else {
          // 非入口 Chunk
          result.push({
            render: () => this.renderChunk(options),
            filename: this.getChunkFilename(chunk, outputOptions),
            info: {
              javascriptModule: true
            },
            hash: chunk.contentHash.javascript
          })
        }
        
        return result
      })
    })
  }
  
  renderMain(renderContext) {
    const { chunk, chunkGraph, moduleGraph, runtimeTemplate } = renderContext
    
    const source = new ConcatSource()
    
    // Bootstrap 代码
    source.add('/******/ (() => { // webpackBootstrap\n')
    
    // 模块对象
    source.add('/******/   var __webpack_modules__ = (')
    source.add(this.renderModules(renderContext))
    source.add(');\n')
    
    // Runtime 代码
    source.add(this.renderRuntimeModules(renderContext))
    
    // 入口代码
    source.add(this.renderStartup(renderContext))
    
    source.add('/******/ })()\n')
    
    return source
  }
  
  renderChunk(renderContext) {
    const { chunk } = renderContext
    
    const source = new ConcatSource()
    
    // Chunk 加载函数
    source.add(`(self["webpackChunk"] = self["webpackChunk"] || []).push([`)
    source.add(`["${chunk.id}"],`)
    
    // 模块对象
    source.add(this.renderModules(renderContext))
    
    source.add(']);\n')
    
    return source
  }
}
```

## 文件名生成

```typescript
class Compilation {
  getPath(filename, data) {
    // 替换占位符
    return filename
      .replace('[name]', data.chunk.name || data.chunk.id)
      .replace('[id]', data.chunk.id)
      .replace('[contenthash]', data.contenthash || '')
      .replace('[chunkhash]', data.chunkhash || '')
      .replace('[fullhash]', this.fullHash)
  }
}
```

## emitAsset

添加资源：

```typescript
emitAsset(filename, source, assetInfo = {}) {
  // 检查是否已存在
  if (this.assets[filename]) {
    if (!isSourceEqual(this.assets[filename], source)) {
      this.errors.push(
        new WebpackError(`Conflict: Multiple assets emit to the same filename ${filename}`)
      )
      return
    }
  }
  
  this.assets[filename] = source
  this.assetsInfo.set(filename, assetInfo)
}
```

## 实战示例

### 输出结果

```javascript
// dist/main.abc123.js
/******/ (() => { // webpackBootstrap
/******/   var __webpack_modules__ = ({
/******/     "./src/index.js": ((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {
/******/       // module code
/******/     })
/******/   });
/******/   
/******/   // Runtime code
/******/   // ...
/******/   
/******/   // Start execution
/******/   __webpack_require__("./src/index.js");
/******/ })();
```

### 自定义资源生成

```typescript
compilation.hooks.processAssets.tap(
  {
    name: 'MyPlugin',
    stage: Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
  },
  assets => {
    // 生成额外资源
    compilation.emitAsset(
      'custom.json',
      new RawSource(JSON.stringify(data))
    )
  }
)
```

## 总结

- createChunkAssets 为每个 Chunk 生成资源
- getRenderManifest 获取渲染清单
- JavascriptModulesPlugin 提供 JS 渲染
- 支持文件名模板和占位符
- emitAsset 将资源添加到 assets
- 插件可通过钩子自定义资源生成
