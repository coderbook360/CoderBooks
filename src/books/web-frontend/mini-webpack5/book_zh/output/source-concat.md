# Source 合并与优化

Source 合并用于组装最终的输出文件，是代码生成的重要环节。

## ConcatSource 基础

```typescript
import { ConcatSource, RawSource } from 'webpack-sources'

const source = new ConcatSource()

// 添加内容
source.add(new RawSource('"use strict";\n'))
source.add(new RawSource('var a = 1;\n'))
source.add(new RawSource('console.log(a);'))

console.log(source.source())
// "use strict";
// var a = 1;
// console.log(a);
```

## Chunk 代码组装

```typescript
class JavascriptModulesPlugin {
  renderMain(renderContext) {
    const { chunk, chunkGraph, runtimeTemplate } = renderContext
    
    const source = new ConcatSource()
    
    // 1. Bootstrap
    source.add('/******/ (() => { // webpackBootstrap\n')
    source.add('/******/   "use strict";\n')
    
    // 2. 模块对象
    source.add('/******/   var __webpack_modules__ = (')
    source.add(this.renderModules(renderContext))
    source.add(');\n')
    source.add('/******/\n')
    
    // 3. 模块缓存
    source.add('/******/   var __webpack_module_cache__ = {};\n')
    source.add('/******/\n')
    
    // 4. require 函数
    source.add('/******/   function __webpack_require__(moduleId) {\n')
    source.add(this.renderRequire())
    source.add('/******/   }\n')
    source.add('/******/\n')
    
    // 5. Runtime 模块
    source.add(this.renderRuntimeModules(renderContext))
    
    // 6. Startup
    source.add('/******/\n')
    source.add('/******/   // startup\n')
    source.add(this.renderStartup(renderContext))
    
    source.add('/******/ })()\n')
    
    return source
  }
}
```

## 模块列表合并

```typescript
renderModules(renderContext) {
  const { chunk, chunkGraph, moduleGraph, codeGenerationResults } = renderContext
  
  const modules = chunkGraph.getOrderedChunkModulesIterable(
    chunk,
    compareModules(chunkGraph)
  )
  
  const sources = []
  
  for (const module of modules) {
    const moduleId = chunkGraph.getModuleId(module)
    const codeGenResult = codeGenerationResults.get(module, chunk.runtime)
    const moduleSource = codeGenResult.sources.get('javascript')
    
    // 包装模块
    const wrapped = new ConcatSource()
    wrapped.add(`"${moduleId}": `)
    wrapped.add('((__unused_webpack_module, __webpack_exports__, __webpack_require__) => {\n')
    wrapped.add(moduleSource)
    wrapped.add('\n})')
    
    sources.push(wrapped)
  }
  
  // 合并所有模块
  const modulesSource = new ConcatSource()
  modulesSource.add('{\n')
  
  for (let i = 0; i < sources.length; i++) {
    if (i > 0) modulesSource.add(',\n')
    modulesSource.add(sources[i])
  }
  
  modulesSource.add('\n}')
  
  return modulesSource
}
```

## Runtime 合并

```typescript
renderRuntimeModules(renderContext) {
  const { chunk, chunkGraph } = renderContext
  
  const runtimeModules = chunkGraph.getChunkRuntimeModulesInOrder(chunk)
  
  const source = new ConcatSource()
  
  source.add('/******/   // Runtime\n')
  
  for (const runtimeModule of runtimeModules) {
    source.add(`/******/   // ${runtimeModule.name}\n`)
    source.add(runtimeModule.generate())
    source.add('\n')
  }
  
  return source
}
```

## InitFragment 合并

```typescript
function renderWithInitFragments(source, initFragments, context) {
  // 排序 fragments
  initFragments.sort((a, b) => {
    if (a.stage !== b.stage) return a.stage - b.stage
    return a.position - b.position
  })
  
  // 合并去重
  const uniqueFragments = []
  const keys = new Set()
  
  for (const fragment of initFragments) {
    if (fragment.key) {
      if (keys.has(fragment.key)) {
        continue
      }
      keys.add(fragment.key)
    }
    uniqueFragments.push(fragment)
  }
  
  // 组装
  const result = new ConcatSource()
  
  // 前置片段
  for (const fragment of uniqueFragments) {
    if (fragment.endContent) continue
    result.add(fragment.getContent(context))
  }
  
  // 主要内容
  result.add(source)
  
  // 后置片段
  for (const fragment of uniqueFragments.reverse()) {
    if (fragment.endContent) {
      result.add(fragment.endContent)
    }
  }
  
  return result
}
```

## SourceMap 合并

```typescript
function concatWithSourceMap(sources) {
  const concat = new ConcatSource()
  
  for (const [source, originalFile, sourceMap] of sources) {
    if (sourceMap) {
      concat.add(new SourceMapSource(
        source,
        originalFile,
        sourceMap
      ))
    } else {
      concat.add(new RawSource(source))
    }
  }
  
  // 生成合并后的 SourceMap
  const finalMap = concat.map()
  
  return { source: concat.source(), map: finalMap }
}
```

## 性能优化

### 延迟合并

```typescript
class LazyConcat {
  constructor() {
    this.parts = []
    this._cached = null
  }
  
  add(source) {
    this.parts.push(source)
    this._cached = null
  }
  
  source() {
    if (!this._cached) {
      const concat = new ConcatSource()
      for (const part of this.parts) {
        concat.add(part)
      }
      this._cached = concat.source()
    }
    return this._cached
  }
}
```

### 缓存合并结果

```typescript
class Module {
  codeGeneration(context) {
    const cacheKey = this.getCacheKey(context)
    
    if (this._cachedGeneration?.[cacheKey]) {
      return this._cachedGeneration[cacheKey]
    }
    
    const source = this.generateSource(context)
    const initFragments = this.generateInitFragments(context)
    
    const result = renderWithInitFragments(source, initFragments, context)
    
    this._cachedGeneration = this._cachedGeneration || {}
    this._cachedGeneration[cacheKey] = new CachedSource(result)
    
    return this._cachedGeneration[cacheKey]
  }
}
```

## 实战示例

### 添加 Banner

```typescript
compilation.hooks.processAssets.tap('BannerPlugin', assets => {
  for (const filename in assets) {
    if (!filename.endsWith('.js')) continue
    
    const banner = `/*!\n * ${this.options.banner}\n */\n`
    
    assets[filename] = new ConcatSource(
      new RawSource(banner),
      assets[filename]
    )
  }
})
```

### 代码包装

```typescript
function wrapIIFE(source) {
  return new ConcatSource(
    new RawSource('(function() {\n'),
    source,
    new RawSource('\n})();')
  )
}
```

### 添加 Shebang

```typescript
function addShebang(source) {
  return new ConcatSource(
    new RawSource('#!/usr/bin/env node\n'),
    source
  )
}
```

## 总结

- ConcatSource 用于合并多个 Source
- 按顺序组装模块、Runtime、Startup 代码
- InitFragment 提供分阶段合并能力
- 支持 SourceMap 合并
- 使用缓存优化性能
- 适合复杂的代码组装场景
